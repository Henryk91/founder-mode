import { clonePlan, validatePlan } from './plan'
import { Rng } from './rng'
import { runInterviews } from './systems/experiments'
import { applyFinanceWeek } from './systems/finance'
import { applyFounderWeek, plannedHours } from './systems/founder'
import { applyProduct } from './systems/product'
import { applyChurn, applySales } from './systems/sales'
import { checkEnding } from './systems/endings'
import type { GameState, ReportEntry, WeekPlan, WeekReport } from './types'
import { interviewView } from './view'

/**
 * Resolves one week (plan section 4.11). Throws if the plan is invalid; call `validatePlan`
 * first. Steps marked "later" arrive with their systems in later phases.
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

  // 2. Inbox responses: later (Phase 4)

  // 3. Founder: hours, energy
  const hours = plannedHours(state.scenario, plan)
  const energyBefore = state.founder.energy
  state = {
    ...state,
    founder: applyFounderWeek(state.founder, state.scenario, hours, plan.restHours),
  }

  // 4. Experiments: interviews now, landing page and pre-sale later (Phase 4)
  const interviews = runInterviews(state, plan, rng)
  state = interviews.state

  // 5. Product: bug fixing, build progress, shipping
  const product = applyProduct(state, plan, rng)
  state = product.state
  entries.push(...product.entries)

  // 6. Sales: demos, trials, new leads, ghosting
  const sales = applySales(state, plan, rng)
  state = sales.state
  entries.push(...sales.entries)

  // 7. Team: later (Phase 4)

  // 8. Finance: transfers, living costs, fixed costs and revenue at month end
  const finance = applyFinanceWeek(state, plan)
  state = finance.state
  entries.push(...finance.movements)
  if (finance.ledger.revenueCents > 0) {
    entries.push({
      kind: 'revenue',
      amountCents: finance.ledger.revenueCents,
      customers: finance.payingCount,
    })
  }

  // 9. Churn on month ends
  const churn = applyChurn(state, rng)
  state = churn.state
  entries.push(...churn.entries)

  // 10. Scheduled effects: later
  // 11. Milestones: later (Phase 7)

  // 12. Endings
  const ending = checkEnding(state)
  if (ending) state = { ...state, status: 'ended', ending }

  // 13. Inbox events for next week: later (Phase 4)

  // 14. Advance week, append to logs
  const report: WeekReport = {
    week: state.week,
    plannedHours: hours,
    energyBefore,
    energyAfter: state.founder.energy,
    interviews: interviews.outcomes.map((o) => interviewView(state, o.evidence)),
    entries,
    ledger: finance.ledger,
    ending,
  }
  state = {
    ...state,
    rng: rng.state(),
    week: state.status === 'running' ? state.week + 1 : state.week,
    actionLog: [...state.actionLog, { type: 'endWeek', week: input.week, plan: clonePlan(plan) }],
  }
  return { state, report }
}
