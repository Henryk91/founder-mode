import type { Condition, ConditionPath } from '@founder-mode/content'
import { bookingsRevenueOrSubscriptions } from './bookings'
import type { GameState } from '../types'
import { activeCustomers } from './customers'
import { moodLevel } from './funding'
import { openLeadCount } from './experiments'
import { isOverdue, isUnpaid, maxOverdueDays } from './invoices'
import { monthOf } from './bookings'
import { runwayWeeks } from './finance'
import { canBookDemo } from './sales'

/** Whether someone is on the team now or has been hired and is about to start. */
export function hasHire(state: Pick<GameState, 'team'>): boolean {
  return state.team.members.some((m) => m.letGoWeek === null)
}

/** The message a condition is read for, if any: its sender's customer or lead. */
export type ConditionSender = { targetId: string | null } | null

const METRICS: Record<ConditionPath, (state: GameState, sender: ConditionSender) => number> = {
  week: (s) => s.week,
  'customers.count': (s) => activeCustomers(s).length,
  'customers.won': (s) => s.customers.length,
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
  monthlyRevenueEur: (s) => Math.floor(bookingsRevenueOrSubscriptions(s) / 100),
  'funding.raised': (s) => s.funding.stakes.length,
  'funding.mood': moodLevel,
  'funding.milestoneMissed': (s) => (s.funding.milestone?.status === 'missed' ? 1 : 0),
  'team.size': (s) => s.team.members.filter((m) => m.letGoWeek === null).length,
  runwayWeeks: (s) => runwayWeeks(s) ?? s.scenario.maxWeeks - s.week + 1,
  'tour.forecast': (s) => (s.bookings ? FORECASTS.indexOf(s.bookings.forecast) : 0),
  'tour.peak': (s) =>
    s.scenario.bookings?.peakMonths.includes(monthOf(s.scenario, s.week)) ? 1 : 0,
  'tour.month': (s) => (s.bookings ? monthOf(s.scenario, s.week) : 0),
  'tour.rating': (s) => Math.round((s.bookings?.rating ?? 0) * 10),
  'tour.reviews': (s) => s.bookings?.reviews ?? 0,
  'tour.bookedWeek': (s) => bookedBetween(s, s.week, s.week),
  'tour.bookedAhead': (s) => bookedBetween(s, s.week + 1, s.week + 4),
  'tour.listed': (s) => (s.bookings?.platformListed ? 1 : 0),
  'sender.overdue': (s, m) =>
    m?.targetId && s.invoices.some((i) => i.customerId === m.targetId && isOverdue(i, s.week))
      ? 1
      : 0,
  'sender.silent': (s, m) =>
    m?.targetId &&
    s.leads.some(
      (l) =>
        l.id === m.targetId &&
        l.silentSinceWeek !== null &&
        l.stage !== 'lost' &&
        l.stage !== 'paying',
    )
      ? 1
      : 0,
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

const FORECASTS = ['good', 'mixed', 'bad', 'dangerous']

/** Units booked (still booked) for weeks `from` to `to`, a bookings run's calendar. */
function bookedBetween(state: GameState, from: number, to: number): number {
  return (state.bookings?.bookings ?? [])
    .filter((b) => b.status === 'booked' && b.week >= from && b.week <= to)
    .reduce((t, b) => t + b.units, 0)
}

/** The value a condition path reads now, for a message's sender where it asks about one. */
export function conditionValue(
  state: GameState,
  path: ConditionPath,
  sender: ConditionSender = null,
): number {
  return METRICS[path](state, sender)
}

/** True when every condition holds. An empty list always holds. */
export function conditionsHold(
  state: GameState,
  conditions: readonly Condition[],
  sender: ConditionSender = null,
): boolean {
  return conditions.every((c) => holds(METRICS[c.path](state, sender), c))
}

export { holds as conditionHolds }
