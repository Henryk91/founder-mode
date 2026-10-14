import { clonePlan, validatePlan } from './plan'
import { Rng } from './rng'
import { resolveExperiments, runInterviews, startExperiments } from './systems/experiments'
import { applyFinanceWeek, closeLedger, noExtras } from './systems/finance'
import { applyFounderWeek, hoursByActivity, livingCostsFor } from './systems/founder'
import { applyBookings } from './systems/bookings'
import { resolveTrials, startTrials, trialsCostCents } from './systems/trials'
import { applyFunding } from './systems/funding'
import { applyLoan } from './systems/loan'
import { drawMessages, resolveMessages } from './systems/inbox'
import { applyProduct } from './systems/product'
import { applyChurn, applyReferrals, applySales } from './systems/sales'
import {
  applyFreelance,
  applyTeam,
  freelanceBillCents,
  freelanceOutput,
  freelancerIn,
  teamChases,
  teamOutput,
} from './systems/team'
import { checkEnding } from './systems/endings'
import { checkMilestones } from './systems/milestones'
import { applyWalkIns, energyPerWeek } from './systems/office'
import type { GameState, ReportEntry, WeekPlan, WeekReport } from './types'
import { interviewView } from './view'

/**
 * Resolves one week (plan section 4.11). Throws if the plan is invalid; call `validatePlan`
 * first. Milestones (11) are checked after the ending (12), since surviving a week depends on
 * it. There are no scheduled effects (10), because inbox effects land in step 2.
 */
export function endWeek(
  input: GameState,
  plan: WeekPlan,
): { state: GameState; report: WeekReport } {
  // 1. Validate plan against available hours
  const issues = validatePlan(input, plan)
  if (issues.length > 0) {
    throw new Error(`Invalid week plan: ${issues.map((i) => i.code).join(', ')}`)
  }

  const rng = new Rng(input.rng)
  let state = input
  const entries: ReportEntry[] = []
  const extras = noExtras()
  // Hours of this week, with the answers already given, before they take effect.
  const activity = hoursByActivity(state, plan)
  const hours =
    activity.learning + activity.building + activity.selling + activity.admin + activity.rest
  let forcedNextWeek = 0

  // 2. Inbox: answered and expired messages take effect. A price change applies right after.
  const messages = resolveMessages(state, rng)
  state = messages.state
  entries.push(...messages.entries)
  extras.otherCostsCents += messages.costsCents
  extras.otherIncomeCents += messages.incomeCents
  forcedNextWeek += messages.lostHours
  if (plan.priceCentsPerMonth !== null) {
    state = { ...state, company: { ...state.company, priceCentsPerMonth: plan.priceCentsPerMonth } }
  }

  // 3. Founder: living costs that change this week (long mode), hours and energy
  const living = livingCostsFor(state.scenario, state.week, state.founder.livingCostCentsPerWeek)
  if (living !== state.founder.livingCostCentsPerWeek) {
    entries.push({
      kind: 'living_costs_changed',
      fromCents: state.founder.livingCostCentsPerWeek,
      toCents: living,
    })
    state = { ...state, founder: { ...state.founder, livingCostCentsPerWeek: living } }
  }
  const energyBefore = input.founder.energy
  state = {
    ...state,
    founder: applyFounderWeek(
      state.founder,
      state.scenario,
      hours,
      plan.restHours,
      energyPerWeek(state),
    ),
  }

  // 4. Experiments: interviews now, landing page tests and pre-sales start and report when due
  const interviews = runInterviews(state, plan, rng)
  state = interviews.state
  state = startExperiments(state, plan)
  for (const budget of Object.values(plan.landing)) extras.adSpendCents += budget
  if (extras.adSpendCents > 0) entries.push({ kind: 'ad_spend', amountCents: extras.adSpendCents })
  const results = resolveExperiments(state, rng)
  state = results.state
  entries.push(...results.entries)
  extras.depositsCents += results.depositsCents
  // Tourism trials and vouchers (plan 2 step 1a): costs now, results when due.
  if (state.bookings) {
    state = startTrials(state, plan)
    extras.bookingCostsCents += trialsCostCents(state, plan)
    const trials = resolveTrials(state, rng)
    state = trials.state
    entries.push(...trials.entries)
    extras.depositsCents += trials.revenueCents
    extras.voucherCents = (extras.voucherCents ?? 0) + trials.voucherCents
  }

  // 5. Product: bug fixing, build progress, shipping. A working developer or freelance developer
  // adds build hours.
  const team = teamOutput(state, plan)
  for (const t of team) {
    if (t.hours > 0) entries.push({ kind: 'team_output', role: t.role, hours: t.hours })
  }
  const freelance = freelanceOutput(state, plan, team)
  const delegatedChases = [...teamChases(team), ...(freelance?.chases ?? [])]
  if (delegatedChases.length > 0)
    entries.push({ kind: 'team_chased', count: delegatedChases.length })
  const product = applyProduct(state, plan, rng, team, freelance)
  state = product.state
  entries.push(...product.entries)

  if (state.bookings) {
    // 6. Tourism: requests, bookings, this week's guests, the roster and reviews (step 4).
    const tourism = applyBookings(state, plan, rng)
    state = tourism.state
    entries.push(...tourism.entries)
    extras.bookingRevenueCents += tourism.revenueCents
    extras.bookingCostsCents += tourism.costsCents
    extras.voucherRedeemedCents = (extras.voucherRedeemedCents ?? 0) + tourism.voucherRedeemedCents
  } else {
    // 6. Sales: demos, trials, new leads, ghosting. A working salesperson helps.
    const sales = applySales(state, plan, rng, team, freelance)
    state = sales.state
    entries.push(...sales.entries)
    extras.otherCostsCents += sales.refundsCents
    const walkIns = applyWalkIns(state, rng)
    state = walkIns.state
    entries.push(...walkIns.entries)
    const referrals = applyReferrals(state, rng)
    state = referrals.state
    entries.push(...referrals.entries)
  }

  // 7. Team: letting go, offers, searches, starts
  const staff = applyTeam(state, plan, rng)
  state = staff.state
  entries.push(...staff.entries)
  extras.otherCostsCents += staff.severanceCents
  // The freelancer's bill for this week, then bookings, notice and hours from next week.
  const booked = freelancerIn(state, state.week)
  extras.freelanceCents = freelanceBillCents(state, state.week)
  if (booked && extras.freelanceCents > 0) {
    entries.push({
      kind: 'freelance_bill',
      name: booked.name,
      amountCents: extras.freelanceCents,
      hours: extras.freelanceCents / state.scenario.team.freelance.roles[booked.role].centsPerHour,
    })
  }
  const freelancing = applyFreelance(state, plan, freelance)
  state = freelancing.state
  entries.push(...freelancing.entries)
  // Raising money (long mode): meetings, terms, closing. The money arrives in finance.
  const funding = applyFunding(state, plan, rng)
  state = funding.state
  entries.push(...funding.entries)
  extras.investmentCents = funding.investmentCents
  forcedNextWeek += funding.forcedHours

  // The bank loan (step 6): plan hours, applications, the bank's answer, offers.
  const loanWeek = applyLoan(state, plan)
  state = loanWeek.state
  entries.push(...loanWeek.entries)

  // 8. Finance: transfers, costs, chasing, payments, invoices at month end
  const finance = applyFinanceWeek(state, plan, extras, rng, delegatedChases)
  state = finance.state
  entries.push(...finance.movements)
  entries.push(...finance.loanEntries)
  if (finance.issued.length > 0) {
    entries.push({
      kind: 'invoices_issued',
      count: finance.issued.length,
      amountCents: finance.issued.reduce((sum, i) => sum + i.amountCents, 0),
    })
  }
  if (finance.paid.length > 0) {
    entries.push({
      kind: 'revenue',
      amountCents: finance.ledger.revenueCents,
      customers: finance.paid.length,
    })
  }
  for (const inv of finance.writtenOff) {
    entries.push({
      kind: 'invoice_written_off',
      amountCents: inv.amountCents,
      name: inv.customerName,
      serviceStopped: finance.stopped.includes(inv.customerId),
    })
  }

  // 9. Churn on month ends (subscribers only)
  if (!state.bookings) {
    const churn = applyChurn(state, rng)
    state = churn.state
    entries.push(...churn.entries)
  }
  state = closeLedger(state, activity)

  // 10. Scheduled effects: none, inbox effects land in step 2

  // 12. Endings, then 11. milestones, which need to know whether this week ended the run
  const ending = checkEnding(state)
  if (ending) state = { ...state, status: 'ended', ending }
  const milestones = checkMilestones(state)
  state = milestones.state
  // The one UI upgrade (plan section 4.12): organised at the first of the scenario's milestones.
  const organise =
    state.company.uiStage === 'scrappy' &&
    state.milestones.some((m) => state.scenario.organisedAt.includes(m.id))
  if (organise) state = { ...state, company: { ...state.company, uiStage: 'organised' } }

  // 13. Inbox events for next week
  if (state.status === 'running') state = drawMessages(state, rng)

  // 14. Advance week, append to logs
  const report: WeekReport = {
    week: state.week,
    plannedHours: hours,
    energyBefore,
    energyAfter: state.founder.energy,
    interviews: interviews.outcomes.map((o) => interviewView(state, o.evidence)),
    entries,
    ledger: state.ledger.at(-1) ?? finance.ledger,
    ending,
    milestones: milestones.reached,
    uiStageChanged: organise,
  }
  state = {
    ...state,
    founder: { ...state.founder, forcedHours: forcedNextWeek },
    rng: rng.state(),
    week: state.status === 'running' ? state.week + 1 : state.week,
    actionLog: [...state.actionLog, { type: 'endWeek', week: input.week, plan: clonePlan(plan) }],
  }
  return { state, report }
}

/** The player closes the company on purpose (plan section 4.13). Ends the run in this week. */
export function shutDown(state: GameState): GameState {
  if (state.status !== 'running') throw new Error('The run is over')
  return {
    ...state,
    status: 'ended',
    ending: 'shut_down',
    actionLog: [...state.actionLog, { type: 'shutDown', week: state.week }],
  }
}
