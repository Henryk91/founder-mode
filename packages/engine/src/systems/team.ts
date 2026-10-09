import type { Rng } from '../rng'
import type {
  Candidate,
  FeatureId,
  GameState,
  ReportEntry,
  TeamMember,
  TeamRoleId,
  WeekPlan,
} from '../types'
import { canBookDemo } from './sales'

/** The team member who works this week: started, and not let go. */
export function workingMember(state: GameState): TeamMember | null {
  return state.team.members.find((m) => m.letGoWeek === null && state.week >= m.startWeek) ?? null
}

export type OutreachItem = { segmentId: string; channel: string; hours: number }

export type TeamOutput = {
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

/**
 * What the working team member produces this week (docs/scenario-kantino.md section 8).
 * A developer builds `weeklyHours x skill` on the feature the plan names, never more than what
 * is left of it. A salesperson holds demos first, as many as the hours allow, then does outreach
 * where the plan says. Hours with nothing to do are lost.
 */
export function teamOutput(state: GameState, plan: WeekPlan): TeamOutput | null {
  const member = workingMember(state)
  if (!member) return null
  const cfg = state.scenario.team.roles[member.role]
  const skill = state.hidden.teamSkills[member.id] ?? 0
  const hours = Math.floor(cfg.weeklyHours * skill)
  const out: TeamOutput = {
    role: member.role,
    hours,
    build: {},
    demos: [],
    outreach: null,
    selling: cfg.selling ?? state.founder.skills.selling,
  }

  if (member.role === 'developer') {
    const target = plan.teamBuild
    const def = target ? state.scenario.features.find((f) => f.id === target) : undefined
    const progress = target ? state.product.features.find((f) => f.id === target) : undefined
    if (target && def && progress && progress.shippedWeek === null) {
      const left = def.buildHours - progress.progressHours - (plan.build[target] ?? 0)
      const built = Math.max(0, Math.min(hours, left))
      if (built > 0) out.build[target] = built
    }
    return out
  }

  let free = hours
  const demoHours = state.scenario.sales.demoHours
  for (const lead of state.leads) {
    if (free < demoHours) break
    if (!canBookDemo(lead) || plan.demos.includes(lead.id)) continue
    out.demos.push(lead.id)
    free -= demoHours
  }
  const target = plan.teamOutreach
  if (target && free > 0) {
    out.outreach = { segmentId: target.segmentId, channel: target.channel, hours: free }
  }
  return out
}

/**
 * Team step (plan section 4.9), in this order:
 * 1. letting the member go: one month of salary at the scenario's severance weeks,
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

  if (plan.letGo) {
    const member = members.find((m) => m.letGoWeek === null)
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
    team: { search, candidates, members },
    hidden: { ...state.hidden, teamSkills },
  }
  return { state, entries, severanceCents }
}

export const salaryId = (m: Pick<TeamMember, 'id'>) => `salary_${m.id}`

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
 * For the post-mortem of a run with a hire: what each customer the hire brought in cost, next to
 * what a customer was worth. Null without a hire. Built from observable state only.
 */
export function hireEconomics(state: GameState): HireEconomics | null {
  const member = state.team.members[0]
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
  const customersGained = state.customers.filter(
    (c) => sourceOf(c.leadId)?.source === 'team',
  ).length
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
