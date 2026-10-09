import { emptyPlan, type PlayerView, type WeekPlan } from '@founder-mode/engine'

/**
 * Last week's plan for this week. Keeps the regular work (interviews, tests, building, outreach,
 * rest, the hire's task) and drops one-off decisions (demos, follow ups, chasing, transfers, a
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
    if (budget > 0) plan.landing[seg.id] = budget
    const batches = Math.min(last.presales[seg.id] ?? 0, seg.presaleBatchesLeft)
    if (batches > 0) plan.presales[seg.id] = batches
  }
  plan.restHours = last.restHours
  const member = view.team.member
  if (member?.working) {
    const target = view.product.features.find((f) => f.id === last.teamBuild)
    if (member.role === 'developer' && target && !target.shipped) plan.teamBuild = target.id
    if (member.role === 'salesperson' && last.teamOutreach) {
      plan.teamOutreach = { ...last.teamOutreach }
    }
  }
  return plan
}
