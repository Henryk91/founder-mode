import type { Condition, ConditionPath } from '@founder-mode/content'
import type { GameState } from '../types'
import { activeCustomers } from './customers'
import { openLeadCount } from './experiments'
import { isUnpaid, maxOverdueDays } from './invoices'
import { canBookDemo } from './sales'

/** Whether someone is on the team now or has been hired and is about to start. */
export function hasHire(state: Pick<GameState, 'team'>): boolean {
  return state.team.members.some((m) => m.letGoWeek === null)
}

const METRICS: Record<ConditionPath, (state: GameState) => number> = {
  week: (s) => s.week,
  'customers.count': (s) => activeCustomers(s).length,
  'customers.churned': (s) => s.customers.filter((c) => c.churnedWeek !== null).length,
  'leads.open': (s) => s.scenario.segments.reduce((sum, seg) => sum + openLeadCount(s, seg.id), 0),
  'leads.waitingForDemo': (s) => s.leads.filter(canBookDemo).length,
  'invoices.open': (s) => s.invoices.filter(isUnpaid).length,
  'invoices.overdueDays': maxOverdueDays,
  cashEur: (s) => Math.floor(s.company.cashCents / 100),
  savingsEur: (s) => Math.floor(s.founder.savingsCents / 100),
  energy: (s) => s.founder.energy,
  bugs: (s) => s.product.bugs,
  quality: (s) => s.product.quality,
  'features.shipped': (s) => s.product.features.filter((f) => f.shippedWeek !== null).length,
  hasHire: (s) => (hasHire(s) ? 1 : 0),
  monthlyRevenueEur: (s) =>
    Math.floor(activeCustomers(s).reduce((sum, c) => sum + c.priceCentsPerMonth, 0) / 100),
  bookkeepingBacklog: (s) => s.company.bookkeepingBacklogHours,
}

function holds(value: number, c: Condition): boolean {
  switch (c.op) {
    case '>=':
      return value >= c.value
    case '<=':
      return value <= c.value
    case '>':
      return value > c.value
    case '<':
      return value < c.value
    case '==':
      return value === c.value
    case '!=':
      return value !== c.value
  }
}

/** True when every condition holds. An empty list always holds. */
export function conditionsHold(state: GameState, conditions: readonly Condition[]): boolean {
  return conditions.every((c) => holds(METRICS[c.path](state), c))
}
