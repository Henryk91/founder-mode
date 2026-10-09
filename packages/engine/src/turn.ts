import { clonePlan, validatePlan } from './plan'
import { Rng } from './rng'
import { resolveExperiments, runInterviews, startExperiments } from './systems/experiments'
import { applyFinanceWeek, closeLedger, noExtras } from './systems/finance'
import { applyFounderWeek, plannedHours } from './systems/founder'
import { drawMessages, resolveMessages } from './systems/inbox'
import { applyProduct } from './systems/product'
import { applyChurn, applySales } from './systems/sales'
import { applyTeam, teamOutput } from './systems/team'
import { checkEnding } from './systems/endings'
import type { GameState, ReportEntry, WeekPlan, WeekReport } from './types'
import { interviewView } from './view'

/**
 * Resolves one week (plan section 4.11). Throws if the plan is invalid; call `validatePlan`
 * first. The milestone step (11) arrives in Phase 7; there are no scheduled effects (10) yet,
 * because inbox effects land in step 2.
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
  const hours = plannedHours(state, plan)
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

  // 3. Founder: hours and energy
  const energyBefore = input.founder.energy
  state = {
    ...state,
    founder: applyFounderWeek(state.founder, state.scenario, hours, plan.restHours),
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

  // 5. Product: bug fixing, build progress, shipping. A working developer adds build hours.
  const team = teamOutput(state, plan)
  if (team && team.hours > 0)
    entries.push({ kind: 'team_output', role: team.role, hours: team.hours })
  const product = applyProduct(state, plan, rng, team)
  state = product.state
  entries.push(...product.entries)

  // 6. Sales: demos, trials, new leads, ghosting. A working salesperson helps.
  const sales = applySales(state, plan, rng, team)
  state = sales.state
  entries.push(...sales.entries)
  extras.otherCostsCents += sales.refundsCents

  // 7. Team: letting go, offers, searches, starts
  const staff = applyTeam(state, plan, rng)
  state = staff.state
  entries.push(...staff.entries)
  extras.otherCostsCents += staff.severanceCents

  // 8. Finance: transfers, costs, chasing, payments, invoices at month end
  const finance = applyFinanceWeek(state, plan, extras, rng)
  state = finance.state
  entries.push(...finance.movements)
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
    })
  }

  // 9. Churn on month ends
  const churn = applyChurn(state, rng)
  state = churn.state
  entries.push(...churn.entries)
  state = closeLedger(state)

  // 10. Scheduled effects: none, inbox effects land in step 2
  // 11. Milestones: later (Phase 7)

  // 12. Endings
  const ending = checkEnding(state)
  if (ending) state = { ...state, status: 'ended', ending }

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
