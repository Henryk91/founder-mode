import type { Rng } from '../rng'
import type {
  Candidate,
  FeatureId,
  FreelanceBooking,
  GameState,
  ReportEntry,
  TeamMember,
  TeamRoleId,
  WeekPlan,
} from '../types'
import { canBookDemo } from './sales'

/** Members who work this week: started and not let go, in hiring order. */
export function workingMembers(state: Pick<GameState, 'team' | 'week'>): TeamMember[] {
  return state.team.members.filter((m) => m.letGoWeek === null && state.week >= m.startWeek)
}

/** Members hired and not let go, working or still starting. */
export function activeMembers(state: Pick<GameState, 'team'>): TeamMember[] {
  return state.team.members.filter((m) => m.letGoWeek === null)
}

/** People who may work at once, and hires over the run: 1 and 1 in the 60 week game. */
export const maxMembers = (s: Pick<GameState, 'scenario'>) => s.scenario.team.maxMembers ?? 1
export const maxHires = (s: Pick<GameState, 'scenario'>) => s.scenario.team.maxHires ?? 1

/** Room for one more person: the team is not full and hires are left. */
export function canHire(state: Pick<GameState, 'team' | 'scenario'>): boolean {
  return (
    activeMembers(state).length < maxMembers(state) && state.team.members.length < maxHires(state)
  )
}

/** Founder hours the working team takes this week (long mode: 2 h each). */
export function managementHours(state: Pick<GameState, 'team' | 'week' | 'scenario'>): number {
  return (state.scenario.team.managementHoursPerMember ?? 0) * workingMembers(state).length
}

export type OutreachItem = { segmentId: string; channel: string; hours: number }

export type TeamOutput = {
  memberId: string
  role: TeamRoleId
  /** Hours of work the member puts in this week. */
  hours: number
  /** Build hours added to a feature. */
  build: Record<FeatureId, number>
  /** Leads the member holds a demo with. */
  demos: string[]
  outreach: OutreachItem | null
  /** Selling skill used for the member's outreach. */
  selling: number
}

/** Build hours of every output on one feature. */
export const teamBuildOn = (team: readonly TeamOutput[], featureId: FeatureId): number =>
  team.reduce((t, o) => t + (o.build[featureId] ?? 0), 0)

/**
 * What the working team produces this week (scenario spec section 8), member by member in
 * hiring order. A developer builds `weeklyHours x skill` on the feature their task names, never
 * more than the founder and earlier members leave of it. A salesperson holds demos first, as many
 * as the hours allow and no demo someone else holds, then does outreach where their task says.
 * Hours with nothing to do are lost.
 */
export function teamOutput(state: GameState, plan: WeekPlan): TeamOutput[] {
  const outputs: TeamOutput[] = []
  const booked = new Set(plan.demos)
  for (const member of workingMembers(state)) {
    const cfg = state.scenario.team.roles[member.role]
    const skill = state.hidden.teamSkills[member.id] ?? 0
    const hours = Math.floor(cfg.weeklyHours * skill)
    const task = plan.teamTasks[member.id]
    const out: TeamOutput = {
      memberId: member.id,
      role: member.role,
      hours,
      build: {},
      demos: [],
      outreach: null,
      selling: cfg.selling ?? state.founder.skills.selling,
    }
    outputs.push(out)

    if (member.role === 'developer') {
      const target = task?.kind === 'build' ? task.featureId : null
      const def = target ? state.scenario.features.find((f) => f.id === target) : undefined
      const progress = target ? state.product.features.find((f) => f.id === target) : undefined
      if (target && def && progress && progress.shippedWeek === null) {
        const left =
          def.buildHours -
          progress.progressHours -
          (plan.build[target] ?? 0) -
          teamBuildOn(outputs, target)
        const built = Math.max(0, Math.min(hours, left))
        if (built > 0) out.build[target] = built
      }
      continue
    }

    let free = hours
    const demoHours = state.scenario.sales.demoHours
    for (const lead of state.leads) {
      if (free < demoHours) break
      if (!canBookDemo(lead) || booked.has(lead.id)) continue
      out.demos.push(lead.id)
      booked.add(lead.id)
      free -= demoHours
    }
    if (task?.kind === 'outreach' && free > 0) {
      out.outreach = { segmentId: task.segmentId, channel: task.channel, hours: free }
    }
  }
  return outputs
}

/**
 * Team step (plan section 4.9), in this order:
 * 1. letting a member go: their salary for the scenario's severance weeks,
 * 2. an offer to a candidate: they start `startWeeks` later,
 * 3. a new search: replaces candidates not hired,
 * 4. a hire whose start has come: their salary becomes a fixed cost,
 * 5. a search that is done: candidates with a noisy impression of their true skill.
 */
export function applyTeam(
  input: GameState,
  plan: WeekPlan,
  rng: Rng,
): { state: GameState; entries: ReportEntry[]; severanceCents: number } {
  const cfg = input.scenario.team
  const week = input.week
  const entries: ReportEntry[] = []
  let severanceCents = 0
  let state = input
  let { search, candidates } = state.team
  let members = state.team.members
  let fixedCosts = state.company.fixedCosts

  if (plan.letGo !== null) {
    const member = members.find((m) => m.id === plan.letGo && m.letGoWeek === null)
    if (member) {
      const monthly = cfg.roles[member.role].monthlyCents
      const cost = Math.round((monthly * cfg.severanceWeeks) / state.scenario.finance.weeksPerMonth)
      severanceCents += cost
      members = members.map((m) => (m === member ? { ...m, letGoWeek: week } : m))
      fixedCosts = fixedCosts.filter((c) => c.id !== salaryId(member))
      entries.push({ kind: 'member_let_go', name: member.name, costCents: cost })
    }
  }

  if (plan.hire) {
    const candidate = candidates.find((c) => c.id === plan.hire)
    if (candidate) {
      members = [
        ...members,
        {
          id: candidate.id,
          name: candidate.name,
          role: candidate.role,
          offerWeek: week,
          startWeek: week + cfg.startWeeks,
          letGoWeek: null,
        },
      ]
      candidates = []
      search = null
    }
  }

  if (plan.searchRole) {
    search = { role: plan.searchRole, readyWeek: week + cfg.searchWeeks }
    candidates = []
  }

  for (const m of members) {
    if (m.letGoWeek !== null || week < m.startWeek) continue
    if (fixedCosts.some((c) => c.id === salaryId(m))) continue
    fixedCosts = [
      ...fixedCosts,
      {
        id: salaryId(m),
        name: `${cfg.roles[m.role].name}: ${m.name}`,
        monthlyCents: cfg.roles[m.role].monthlyCents,
      },
    ]
    entries.push({ kind: 'hire_started', name: m.name, role: m.role })
  }

  const teamSkills = { ...state.hidden.teamSkills }
  if (search && week >= search.readyWeek) {
    const role = cfg.roles[search.role]
    const names = rng.shuffle(cfg.candidateNames)
    candidates = []
    for (let i = 0; i < cfg.candidates; i++) {
      const skill = rng.range(role.skill.min, role.skill.max)
      const impression = skill + rng.normal(cfg.impressionSd)
      const label = cfg.impressions.find((b) => b.below === undefined || impression < b.below)
      const id = `candidate_${week}_${i + 1}`
      teamSkills[id] = skill
      candidates.push({
        id,
        name: names[i % names.length] ?? `Candidate ${i + 1}`,
        role: search.role,
        impressionId: label?.id ?? cfg.impressions[0]?.id ?? '',
      } satisfies Candidate)
    }
    entries.push({ kind: 'candidates_ready', role: search.role, count: candidates.length })
    search = null
  }

  state = {
    ...state,
    company: { ...state.company, fixedCosts },
    team: { ...state.team, search, candidates, members },
    hidden: { ...state.hidden, teamSkills },
  }
  return { state, entries, severanceCents }
}

export const salaryId = (m: Pick<TeamMember, 'id'>) => `salary_${m.id}`

// ---------------------------------------------------------------------------
// The freelancer (Phase 9). Fixed, visible output and no random draws, so a run that never books
// one plays exactly as before.

/** The booking that covers `week`: started, and not past its notice. Null when nobody works. */
export function freelancerIn(state: GameState, week: number): FreelanceBooking | null {
  return (
    state.team.freelancers.find(
      (f) => week >= f.startWeek && (f.endWeek === null || week <= f.endWeek),
    ) ?? null
  )
}

/** The booking that is still running or about to start: not ended before `week`. */
export function openBooking(state: GameState, week = state.week): FreelanceBooking | null {
  return state.team.freelancers.find((f) => f.endWeek === null || f.endWeek >= week) ?? null
}

/** Hours a week booked in `week`, after any change of hours that applies by then. */
export function bookedHours(f: FreelanceBooking, week: number): number {
  return f.nextHours && week >= f.nextHours.week ? f.nextHours.hours : f.hoursPerWeek
}

/** Hours of work in `week`: the output share of the booked hours, less in the first week. */
export function freelanceWorkHours(state: GameState, f: FreelanceBooking, week: number): number {
  const cfg = state.scenario.team.freelance
  const onboarding = week === f.startWeek ? cfg.onboardingFactor : 1
  return Math.floor(bookedHours(f, week) * cfg.outputShare * onboarding)
}

export type FreelanceOutput = {
  bookingId: string
  role: TeamRoleId
  hours: number
  onboarding: boolean
  build: Record<FeatureId, number>
  outreach: OutreachItem | null
  selling: number
}

/**
 * What the freelancer produces this week. A developer builds the feature the plan names, never
 * more than what the founder and the hire leave of it. A salesperson does outreach where the plan
 * says and holds no demos. Hours with nothing to do are lost, and still billed.
 */
export function freelanceOutput(
  state: GameState,
  plan: WeekPlan,
  team: readonly TeamOutput[],
): FreelanceOutput | null {
  const f = freelancerIn(state, state.week)
  if (!f) return null
  const cfg = state.scenario.team.freelance
  const hours = freelanceWorkHours(state, f, state.week)
  const out: FreelanceOutput = {
    bookingId: f.id,
    role: f.role,
    hours,
    onboarding: state.week === f.startWeek,
    build: {},
    outreach: null,
    selling: cfg.roles[f.role].selling ?? state.founder.skills.selling,
  }
  if (f.role === 'developer') {
    const target = plan.freelance.build
    const def = target ? state.scenario.features.find((x) => x.id === target) : undefined
    const progress = target ? state.product.features.find((x) => x.id === target) : undefined
    if (target && def && progress && progress.shippedWeek === null) {
      const left =
        def.buildHours -
        progress.progressHours -
        (plan.build[target] ?? 0) -
        teamBuildOn(team, target)
      const built = Math.max(0, Math.min(hours, left))
      if (built > 0) out.build[target] = built
    }
  } else if (plan.freelance.outreach && hours > 0) {
    out.outreach = { ...plan.freelance.outreach, hours }
  }
  return out
}

/** The bill for `week`: every booked hour of the booking that covers it. */
export function freelanceBillCents(state: GameState, week: number): number {
  const f = freelancerIn(state, week)
  if (!f) return 0
  return bookedHours(f, week) * state.scenario.team.freelance.roles[f.role].centsPerHour
}

/** What the open booking costs per 4 week month at its current hours, for the costs shown. */
export function freelanceMonthlyCents(state: GameState): number {
  const f = openBooking(state)
  if (!f) return 0
  const week = Math.max(state.week, f.startWeek)
  return (
    bookedHours(f, week) *
    state.scenario.team.freelance.roles[f.role].centsPerHour *
    state.scenario.finance.weeksPerMonth
  )
}

/**
 * Freelance step, after this week's work: hours delivered are recorded, a booking past its last
 * week is closed, and the plan's booking, change of hours or notice take effect from next week.
 */
export function applyFreelance(
  input: GameState,
  plan: WeekPlan,
  output: FreelanceOutput | null,
): { state: GameState; entries: ReportEntry[] } {
  const cfg = input.scenario.team.freelance
  const week = input.week
  const entries: ReportEntry[] = []
  let freelancers = input.team.freelancers
  let features = input.team.freelanceFeatures

  if (output) {
    const worked =
      Object.values(output.build).reduce((t, h) => t + h, 0) + (output.outreach?.hours ?? 0)
    freelancers = freelancers.map((f) =>
      f.id === output.bookingId ? { ...f, workedHours: f.workedHours + worked } : f,
    )
    for (const id of Object.keys(output.build)) {
      if (!features.includes(id)) features = [...features, id]
    }
    entries.push({
      kind: 'freelance_output',
      role: output.role,
      hours: worked,
      onboarding: output.onboarding,
    })
  }
  for (const f of freelancers) {
    if (f.endWeek === week) entries.push({ kind: 'freelance_ended', name: f.name })
  }

  const open = freelancers.find((f) => f.endWeek === null || f.endWeek > week) ?? null
  const fp = plan.freelance
  if (open && fp.hoursPerWeek !== null && fp.hoursPerWeek !== bookedHours(open, week + 1)) {
    const from = Math.max(week + 1, open.startWeek)
    // The hours in force this week stay as they are; the change applies from next week.
    freelancers = freelancers.map((f) =>
      f === open
        ? {
            ...f,
            hoursPerWeek: bookedHours(f, week),
            nextHours: { week: from, hours: fp.hoursPerWeek! },
          }
        : f,
    )
    entries.push({
      kind: 'freelance_hours',
      name: open.name,
      hoursPerWeek: fp.hoursPerWeek,
      fromWeek: from,
    })
  }
  if (open && fp.end) {
    // Notice runs from next week; a booking that has not started yet ends before it does.
    const lastWeek = Math.max(week + cfg.noticeWeeks, open.startWeek - 1)
    freelancers = freelancers.map((f) => (f.id === open.id ? { ...f, endWeek: lastWeek } : f))
    entries.push({ kind: 'freelance_notice', name: open.name, lastWeek })
  }
  if (fp.book) {
    const name = cfg.names[freelancers.length % cfg.names.length] ?? `Freelancer`
    const booking: FreelanceBooking = {
      id: `freelancer_${freelancers.length + 1}`,
      name,
      role: fp.book.role,
      hoursPerWeek: fp.book.hoursPerWeek,
      bookedWeek: week,
      startWeek: week + 1,
      endWeek: null,
      nextHours: null,
      workedHours: 0,
    }
    freelancers = [...freelancers, booking]
    entries.push({
      kind: 'freelance_booked',
      name,
      role: booking.role,
      hoursPerWeek: booking.hoursPerWeek,
      startWeek: booking.startWeek,
    })
  }
  if (freelancers === input.team.freelancers && features === input.team.freelanceFeatures) {
    return { state: input, entries }
  }
  return {
    state: { ...input, team: { ...input.team, freelancers, freelanceFeatures: features } },
    entries,
  }
}

/** `hireEconomics` for every hire of the run, in hiring order. */
export function hiresEconomics(state: GameState): HireEconomics[] {
  return state.team.members.flatMap((m) => {
    const e = hireEconomics(state, m)
    return e ? [e] : []
  })
}

export type FreelanceEconomics = {
  roles: TeamRoleId[]
  costCents: number
  weeks: number
  /** Hours booked and billed over the run; `buildHours + outreachHours` of them found work. */
  bookedHours: number
  /**
   * What the hours that found work would have cost as the founder's own: living costs per base
   * hour (weekly living costs over base hours a week), which the founder pays anyway.
   */
  ownHoursCents: number
  /** False when the run did not end sustainable: the freelancer did not pay for themselves. */
  paid: boolean
  buildHours: number
  outreachHours: number
  leadsFound: number
  customersGained: number
  extraBugs: number
}

/** For the post-mortem: what freelancers cost and delivered. Null when none was booked. */
export function freelanceEconomics(state: GameState): FreelanceEconomics | null {
  const all = state.team.freelancers
  if (all.length === 0) return null
  const roles = [...new Set(all.map((f) => f.role))]
  const costCents = state.ledger.reduce((t, l) => t + l.freelanceCents, 0)
  const weeks = state.ledger.filter((l) => l.freelanceCents > 0).length
  const worked = (role: TeamRoleId) =>
    all.filter((f) => f.role === role).reduce((t, f) => t + f.workedHours, 0)
  const lastWeek = state.ledger.length
  let bookedTotal = 0
  for (const f of all) {
    const end = Math.min(f.endWeek ?? lastWeek, lastWeek)
    for (let w = f.startWeek; w <= end; w++) bookedTotal += bookedHours(f, w)
  }
  const workedTotal = all.reduce((t, f) => t + f.workedHours, 0)
  const perHour = state.founder.livingCostCentsPerWeek / state.founder.baseHoursPerWeek
  const found = state.leads.filter((l) => l.source === 'freelancer')
  const ids = new Set(found.map((l) => l.id))
  return {
    roles,
    costCents,
    weeks,
    bookedHours: bookedTotal,
    ownHoursCents: Math.round(workedTotal * perHour),
    paid: state.ending === 'sustainable',
    buildHours: worked('developer'),
    outreachHours: worked('salesperson'),
    leadsFound: found.length,
    customersGained: state.customers.filter((c) => ids.has(c.leadId)).length,
    extraBugs: state.team.freelanceBugs,
  }
}

export type HireEconomics = {
  role: TeamRoleId
  /** Salary charged so far, plus severance if the member was let go. */
  costCents: number
  /** Customers whose lead the member found. */
  customersGained: number
  /** Cost divided by customers gained, or null when the hire found nobody. */
  costPerCustomerCents: number | null
  /** Money received per customer over the run, across all customers: what a customer was worth. */
  lifetimeValueCents: number | null
}

/**
 * For the post-mortem of a run with a hire: what each customer that hire (the first, unless
 * another is given) brought in cost, next to what a customer was worth. Null without a hire.
 * Built from observable state only.
 */
export function hireEconomics(
  state: GameState,
  member: TeamMember | undefined = state.team.members[0],
): HireEconomics | null {
  if (!member) return null
  const cfg = state.scenario.team
  const monthly = cfg.roles[member.role].monthlyCents
  const lastWeek = member.letGoWeek !== null ? member.letGoWeek - 1 : state.ledger.length
  const perMonth = state.scenario.finance.weeksPerMonth
  let months = 0
  for (let w = member.startWeek; w <= lastWeek; w++) if (w % perMonth === 0) months++
  const severance =
    member.letGoWeek !== null
      ? Math.round((monthly * cfg.severanceWeeks) / state.scenario.finance.weeksPerMonth)
      : 0
  const costCents = months * monthly + severance
  const sourceOf = (leadId: string) => state.leads.find((l) => l.id === leadId)
  // A lead found by the team carries the member who found it; older leads only say "team".
  const foundHere = (leadId: string) => {
    const lead = sourceOf(leadId)
    return lead?.source === 'team' && (lead.foundBy ?? state.team.members[0]?.id) === member.id
  }
  const customersGained = state.customers.filter((c) => foundHere(c.leadId)).length
  const received =
    state.invoices.filter((i) => i.paidWeek !== null).reduce((t, i) => t + i.amountCents, 0) +
    state.customers.reduce((t, c) => t + (sourceOf(c.leadId)?.depositCents ?? 0), 0)
  return {
    role: member.role,
    costCents,
    customersGained,
    costPerCustomerCents: customersGained > 0 ? Math.round(costCents / customersGained) : null,
    lifetimeValueCents:
      state.customers.length > 0 ? Math.round(received / state.customers.length) : null,
  }
}
