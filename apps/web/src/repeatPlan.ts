import { emptyPlan, type FreelancePlan, type PlayerView, type WeekPlan } from '@founder-mode/engine'

/**
 * Last week's plan for this week. Keeps the regular work (interviews, tests, building, outreach,
 * rest, the hire's and the freelancer's task) and drops one-off decisions (demos, follow ups, chasing, transfers, a
 * new price, hiring steps). Anything no longer possible is cut back: shipped features, batches
 * already used, more bug fixing than there are bugs.
 */
export function repeatPlan(last: WeekPlan, view: PlayerView): WeekPlan {
  const plan = emptyPlan()
  for (const [id, n] of Object.entries(last.interviews)) {
    if (n > 0) plan.interviews[id] = n
  }
  for (const f of view.product.features) {
    const hours = Math.min(last.build[f.id] ?? 0, f.remainingHours)
    if (!f.shipped && hours > 0) plan.build[f.id] = hours
  }
  plan.bugFixHours = Math.min(last.bugFixHours, view.product.fixableHours)
  for (const [id, out] of Object.entries(last.outreach)) {
    if (out.hours > 0) plan.outreach[id] = { ...out }
  }
  for (const seg of view.segments) {
    const budget = last.landing[seg.id] ?? 0
    // Long mode allows a few tests per market; a market with none left drops its test.
    if (budget > 0 && (seg.landingTestsLeft ?? 1) > 0) plan.landing[seg.id] = budget
    const batches = Math.min(last.presales[seg.id] ?? 0, seg.presaleBatchesLeft)
    if (batches > 0) plan.presales[seg.id] = batches
  }
  plan.restHours = last.restHours
  for (const member of view.team.members) {
    const task = last.teamTasks[member.id]
    if (!member.working || !task) continue
    if (task.kind === 'admin') {
      plan.teamTasks[member.id] = { kind: 'admin' }
    } else if (task.kind === 'build') {
      const target = view.product.features.find((f) => f.id === task.featureId)
      if (member.role === 'developer' && target && !target.shipped) plan.teamTasks[member.id] = task
      // A finished feature leaves the chasing, if it was asked for.
      else if (task.admin) plan.teamTasks[member.id] = { kind: 'admin' }
    } else if (member.role === 'salesperson') {
      plan.teamTasks[member.id] = { ...task }
    }
  }
  plan.freelance = carryFreelance(last, view)
  // Pitching is regular work while the round is open; every other raising step is a one-off.
  const f = view.funding
  if (f?.round && f.round.investorsLeft > 0 && (last.funding?.pitchHours ?? 0) > 0) {
    plan.funding = {
      start: null,
      pitchHours: last.funding!.pitchHours,
      secondLooks: [],
      accept: null,
      decline: [],
      stop: false,
      update: null,
    }
  }
  return plan
}

/**
 * The freelancer's task from last week's plan, while they still work and the task is still
 * possible. Booking, hours and notice are one-off decisions and never carry over. A new week's
 * draft starts with it too, since a freelancer is billed whether or not they have work.
 */
export function carryFreelance(last: WeekPlan, view: PlayerView): FreelancePlan {
  const out = emptyPlan().freelance
  const current = view.team.freelance.current
  if (!current || (current.endWeek !== null && current.endWeek < view.week)) return out
  const target = view.product.features.find((f) => f.id === last.freelance.build)
  if (current.role === 'developer' && target && !target.shipped) out.build = target.id
  if (current.role === 'salesperson' && last.freelance.outreach) {
    out.outreach = { ...last.freelance.outreach }
  }
  if (last.freelance.admin) out.admin = true
  return out
}
