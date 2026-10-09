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
  }
}

export function clonePlan(plan: WeekPlan): WeekPlan {
  return {
    ...plan,
    interviews: { ...plan.interviews },
    build: { ...plan.build },
    outreach: Object.fromEntries(Object.entries(plan.outreach).map(([k, v]) => [k, { ...v }])),
    demos: [...plan.demos],
  }
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0

export type PlanCheck = { plannedHours: number; issues: PlanIssue[] }

/** Hours and problems of a draft plan, for showing live feedback while the player edits it. */
export function checkPlan(state: GameState, plan: WeekPlan): PlanCheck {
  return { plannedHours: plannedHours(state.scenario, plan), issues: validatePlan(state, plan) }
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

  // Hours only make sense once every number is valid.
  if (!issues.some((i) => i.code === 'invalid_number')) {
    const hours = plannedHours(state.scenario, plan)
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
