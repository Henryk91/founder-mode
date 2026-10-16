import { officePlanValid } from './systems/office'
import { waitsForCompany } from './systems/assets'
import { landingTestsUsed, presaleBatchesUsed } from './systems/experiments'
import { isOverdue } from './systems/invoices'
import { maxBugFixHours } from './systems/product'
import { canBookDemo, canFollowUp } from './systems/sales'
import { plannedHours } from './systems/founder'
import { bookingsValid, cloneBookingsPlan } from './systems/bookings'
import { cloneFundingPlan, fundingValid } from './systems/funding'
import { loanValid } from './systems/loan'
import { activeMembers, canHire, openBooking } from './systems/team'
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
    followUps: [],
    chase: [],
    searchRole: null,
    hire: null,
    letGo: null,
    teamTasks: {},
    freelance: { book: null, hoursPerWeek: null, end: false, build: null, outreach: null },
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
    followUps: [...plan.followUps],
    teamTasks: Object.fromEntries(Object.entries(plan.teamTasks).map(([k, v]) => [k, { ...v }])),
    freelance: {
      ...plan.freelance,
      book: plan.freelance.book ? { ...plan.freelance.book } : null,
      outreach: plan.freelance.outreach ? { ...plan.freelance.outreach } : null,
    },
    ...(plan.funding ? { funding: cloneFundingPlan(plan.funding) } : {}),
    ...(plan.bookings ? { bookings: cloneBookingsPlan(plan.bookings) } : {}),
    ...(plan.loan
      ? { loan: { ...plan.loan, apply: plan.loan.apply ? { ...plan.loan.apply } : null } }
      : {}),
    ...(plan.office ? { office: { ...plan.office } } : {}),
  }
}

const isCount = (n: number) => Number.isInteger(n) && n >= 0

/**
 * The freelancer part of a plan: a booking only while nobody is booked from next week on, a
 * change of hours or notice only for a booking without notice, hours from the scenario's options,
 * and work on a real feature or market and channel.
 */
function freelanceValid(state: GameState, plan: WeekPlan): boolean {
  const fp = plan.freelance
  const cfg = state.scenario.team.freelance
  const open = openBooking(state)
  const running = open !== null && open.endWeek === null
  if (fp.book) {
    if (open !== null && (open.endWeek === null || open.endWeek > state.week)) return false
    if (!(fp.book.role in cfg.roles) || !cfg.hoursOptions.includes(fp.book.hoursPerWeek)) {
      return false
    }
    if (fp.end || fp.hoursPerWeek !== null) return false
  }
  if (fp.hoursPerWeek !== null && (!running || !cfg.hoursOptions.includes(fp.hoursPerWeek))) {
    return false
  }
  if (fp.end && !running) return false
  if (fp.build !== null && !state.product.features.some((f) => f.id === fp.build)) return false
  if (fp.outreach) {
    const hidden = state.hidden.segments[fp.outreach.segmentId]
    if (!hidden || !Object.hasOwn(hidden.channelResponse, fp.outreach.channel)) return false
  }
  return true
}

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
    } else if (hours > 0 && waitsForCompany(state, featureId)) {
      // Plan 4: buying an asset where a local company is needed first.
      issues.push({ code: 'invalid_bookings' })
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
    } else if (
      budget > 0 &&
      landing.maxTestsPerSegment !== undefined &&
      landingTestsUsed(state, segmentId, plan) > landing.maxTestsPerSegment
    ) {
      issues.push({ code: 'landing_limit', segmentId })
    }
  }
  for (const [segmentId, batches] of Object.entries(plan.presales)) {
    if (!(segmentId in state.hidden.segments)) {
      issues.push({ code: 'unknown_segment', segmentId })
    } else if (!isCount(batches)) {
      issues.push({ code: 'invalid_number', field: `presales.${segmentId}` })
    } else if (presaleBatchesUsed(state, segmentId, plan) > presale.maxBatchesPerSegment) {
      issues.push({
        code: 'presale_cap',
        segmentId,
        left: Math.max(0, presale.maxBatchesPerSegment - presaleBatchesUsed(state, segmentId)),
      })
    }
  }

  const followed = new Set<string>()
  for (const leadId of plan.followUps) {
    const lead = state.leads.find((l) => l.id === leadId)
    if (!lead || !canFollowUp(lead) || followed.has(leadId)) {
      issues.push({ code: 'invalid_follow_up', leadId })
    }
    followed.add(leadId)
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
  if (plan.searchRole !== null && (team.search !== null || !canHire(state))) {
    issues.push({ code: 'search_not_allowed' })
  }
  if (
    plan.searchPartTime &&
    (plan.searchRole === null || !state.scenario.team.roles[plan.searchRole].partTime)
  ) {
    issues.push({ code: 'part_time_not_offered' })
  }
  if (plan.hire !== null) {
    const candidate = team.candidates.find((c) => c.id === plan.hire)
    if (!candidate || !canHire(state) || plan.letGo !== null)
      issues.push({ code: 'invalid_hire', candidateId: plan.hire })
  }
  if (plan.letGo !== null && !activeMembers(state).some((m) => m.id === plan.letGo)) {
    issues.push({ code: 'let_go_not_allowed' })
  }
  for (const [memberId, task] of Object.entries(plan.teamTasks)) {
    const member = activeMembers(state).find((m) => m.id === memberId)
    const valid =
      member !== undefined &&
      (task.kind === 'admin' ||
        (task.kind === 'build'
          ? state.product.features.some((f) => f.id === task.featureId)
          : Object.hasOwn(
              state.hidden.segments[task.segmentId]?.channelResponse ?? {},
              task.channel,
            )))
    if (!valid) issues.push({ code: 'invalid_team_work' })
  }

  if (!freelanceValid(state, plan)) issues.push({ code: 'invalid_freelance' })
  if (!fundingValid(state, plan)) issues.push({ code: 'invalid_funding' })
  if (!bookingsValid(state, plan)) issues.push({ code: 'invalid_bookings' })
  if (!loanValid(state, plan)) issues.push({ code: 'invalid_loan' })
  if (!officePlanValid(state, plan)) issues.push({ code: 'invalid_office' })

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
