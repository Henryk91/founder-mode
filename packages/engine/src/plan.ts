import { maxBookkeepingHours } from './systems/bookkeeping'
import { openLeadCount } from './systems/experiments'
import { isOverdue } from './systems/invoices'
import { maxBugFixHours } from './systems/product'
import { canBookDemo } from './systems/sales'
import { plannedHours } from './systems/founder'
import type { GameState, PlanIssue, WeekPlan } from './types'

export function emptyPlan(): WeekPlan {
  return {
    interviews: {},
    build: {},
    bugFixHours: 0,
    outreach: {},
    demos: [],
    restHours: 0,
    transferToCompanyCents: 0,
    priceCentsPerMonth: null,
    landing: {},
    presales: {},
    bookkeepingHours: 0,
    chase: [],
    searchRole: null,
    hire: null,
    letGo: false,
    teamBuild: null,
    teamOutreach: null,
  }
}

export function clonePlan(plan: WeekPlan): WeekPlan {
  return {
    ...plan,
    interviews: { ...plan.interviews },
    build: { ...plan.build },
    outreach: Object.fromEntries(Object.entries(plan.outreach).map(([k, v]) => [k, { ...v }])),
    demos: [...plan.demos],
    landing: { ...plan.landing },
    presales: { ...plan.presales },
    chase: [...plan.chase],
    teamOutreach: plan.teamOutreach ? { ...plan.teamOutreach } : null,
  }
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0

export type PlanCheck = { plannedHours: number; issues: PlanIssue[] }

/** Hours and problems of a draft plan, for showing live feedback while the player edits it. */
export function checkPlan(state: GameState, plan: WeekPlan): PlanCheck {
  return { plannedHours: plannedHours(state, plan), issues: validatePlan(state, plan) }
}

/** Returns every problem with a plan. An empty list means `endWeek` will accept it. */
export function validatePlan(state: GameState, plan: WeekPlan): PlanIssue[] {
  const issues: PlanIssue[] = []
  if (state.status !== 'running') issues.push({ code: 'game_over' })

  for (const [segmentId, count] of Object.entries(plan.interviews)) {
    if (!(segmentId in state.hidden.segments)) issues.push({ code: 'unknown_segment', segmentId })
    if (!isCount(count)) issues.push({ code: 'invalid_number', field: `interviews.${segmentId}` })
  }

  for (const [featureId, hours] of Object.entries(plan.build)) {
    const feature = state.product.features.find((f) => f.id === featureId)
    const def = state.scenario.features.find((f) => f.id === featureId)
    if (!feature || !def) {
      issues.push({ code: 'unknown_feature', featureId })
    } else if (!isCount(hours)) {
      issues.push({ code: 'invalid_number', field: `build.${featureId}` })
    } else if (hours > 0 && feature.shippedWeek !== null) {
      issues.push({ code: 'feature_shipped', featureId })
    } else if (hours > def.buildHours - feature.progressHours) {
      issues.push({
        code: 'build_exceeds_remaining',
        featureId,
        remainingHours: def.buildHours - feature.progressHours,
      })
    }
  }

  if (!isCount(plan.bugFixHours)) {
    issues.push({ code: 'invalid_number', field: 'bugFixHours' })
  } else if (plan.bugFixHours > maxBugFixHours(state)) {
    issues.push({ code: 'bug_fix_exceeds_bugs', maxHours: maxBugFixHours(state) })
  }

  for (const [segmentId, out] of Object.entries(plan.outreach)) {
    const hidden = state.hidden.segments[segmentId]
    if (!hidden) {
      issues.push({ code: 'unknown_segment', segmentId })
      continue
    }
    if (!Object.hasOwn(hidden.channelResponse, out.channel)) {
      issues.push({ code: 'invalid_channel', segmentId })
    }
    if (!isCount(out.hours)) issues.push({ code: 'invalid_number', field: `outreach.${segmentId}` })
  }

  const seenDemos = new Set<string>()
  for (const leadId of plan.demos) {
    const lead = state.leads.find((l) => l.id === leadId)
    if (!lead || !canBookDemo(lead) || seenDemos.has(leadId)) {
      issues.push({ code: 'invalid_demo', leadId })
    }
    seenDemos.add(leadId)
  }

  if (!isCount(plan.restHours)) issues.push({ code: 'invalid_number', field: 'restHours' })
  if (!isCount(plan.transferToCompanyCents)) {
    issues.push({ code: 'invalid_number', field: 'transferToCompanyCents' })
  } else if (plan.transferToCompanyCents > Math.max(0, state.founder.savingsCents)) {
    issues.push({ code: 'transfer_exceeds_savings', savingsCents: state.founder.savingsCents })
  }

  if (
    plan.priceCentsPerMonth !== null &&
    (!Number.isInteger(plan.priceCentsPerMonth) || plan.priceCentsPerMonth <= 0)
  ) {
    issues.push({ code: 'invalid_price' })
  }

  const { landing, presale } = state.scenario.experiments
  for (const [segmentId, budget] of Object.entries(plan.landing)) {
    if (!(segmentId in state.hidden.segments)) {
      issues.push({ code: 'unknown_segment', segmentId })
    } else if (!isCount(budget)) {
      issues.push({ code: 'invalid_number', field: `landing.${segmentId}` })
    } else if (budget > 0 && !landing.budgetsCents.includes(budget)) {
      issues.push({ code: 'invalid_budget', segmentId })
    }
  }
  for (const [segmentId, batches] of Object.entries(plan.presales)) {
    if (!(segmentId in state.hidden.segments)) {
      issues.push({ code: 'unknown_segment', segmentId })
    } else if (!isCount(batches)) {
      issues.push({ code: 'invalid_number', field: `presales.${segmentId}` })
    } else if (batches * presale.batchSize > openLeadCount(state, segmentId)) {
      issues.push({
        code: 'presale_needs_leads',
        segmentId,
        leads: batches * presale.batchSize,
      })
    }
  }

  if (!isCount(plan.bookkeepingHours)) {
    issues.push({ code: 'invalid_number', field: 'bookkeepingHours' })
  } else if (plan.bookkeepingHours > maxBookkeepingHours(state)) {
    issues.push({ code: 'bookkeeping_exceeds_backlog', maxHours: maxBookkeepingHours(state) })
  }

  const chased = new Set<string>()
  for (const invoiceId of plan.chase) {
    const invoice = state.invoices.find((i) => i.id === invoiceId)
    if (!invoice || !isOverdue(invoice, state.week) || chased.has(invoiceId)) {
      issues.push({ code: 'invalid_chase', invoiceId })
    }
    chased.add(invoiceId)
  }

  const { team } = state
  const hired = team.members.length > 0
  if (plan.searchRole !== null && (hired || team.search !== null)) {
    issues.push({ code: 'search_not_allowed' })
  }
  if (plan.hire !== null) {
    const candidate = team.candidates.find((c) => c.id === plan.hire)
    if (!candidate || hired || plan.letGo)
      issues.push({ code: 'invalid_hire', candidateId: plan.hire })
  }
  if (plan.letGo && !team.members.some((m) => m.letGoWeek === null)) {
    issues.push({ code: 'let_go_not_allowed' })
  }
  if (plan.teamBuild !== null && !state.product.features.some((f) => f.id === plan.teamBuild)) {
    issues.push({ code: 'invalid_team_work' })
  }
  if (plan.teamOutreach) {
    const hidden = state.hidden.segments[plan.teamOutreach.segmentId]
    if (!hidden || !Object.hasOwn(hidden.channelResponse, plan.teamOutreach.channel)) {
      issues.push({ code: 'invalid_team_work' })
    }
  }

  // Hours only make sense once every number is valid.
  if (!issues.some((i) => i.code === 'invalid_number')) {
    const hours = plannedHours(state, plan)
    if (hours > state.founder.maxHoursPerWeek) {
      issues.push({
        code: 'too_many_hours',
        plannedHours: hours,
        maxHours: state.founder.maxHoursPerWeek,
      })
    }
  }
  return issues
}
