import type { Condition, ConditionPath } from '@founder-mode/content'
import type { MessageView, PlayerView } from '../types'
import { conditionHolds } from './conditions'

/**
 * Condition paths read from the player's view (situational events, step 3). Every path reads the
 * same number as the engine's own evaluation (`conditions.ts`), which a test checks, so an event's
 * outcome can only depend on what the player can see. Bots read events the same way.
 */
const MOODS = { worried: 0, patient: 1, pleased: 2 } as const
const FORECASTS = ['good', 'mixed', 'bad', 'dangerous']

const VIEW_METRICS: Record<ConditionPath, (v: PlayerView, m: MessageView | null) => number> = {
  week: (v) => v.week,
  'customers.count': (v) => v.customers.length,
  'customers.won': (v) => v.customersWon,
  'customers.churned': (v) => v.customersLost,
  'leads.open': (v) => v.leads.filter((l) => l.stage !== 'lost' && l.stage !== 'paying').length,
  'leads.waitingForDemo': (v) => v.leads.filter((l) => l.canBookDemo).length,
  'invoices.open': (v) =>
    v.invoices.filter((i) => i.status === 'open' || i.status === 'overdue').length,
  'invoices.overdueDays': (v) =>
    Math.max(0, ...v.invoices.filter((i) => i.status === 'overdue').map((i) => i.overdueWeeks * 7)),
  cashEur: (v) => Math.floor(v.company.cashCents / 100),
  savingsEur: (v) => Math.floor(v.founder.savingsCents / 100),
  energy: (v) => v.founder.energy,
  bugs: (v) => v.product.bugs,
  quality: (v) => v.product.quality,
  'features.shipped': (v) => v.product.features.filter((f) => f.shipped).length,
  hasHire: (v) => (v.team.members.length > 0 ? 1 : 0),
  monthlyRevenueEur: (v) => Math.floor(v.monthlyRevenueCents / 100),
  'funding.raised': (v) => (v.funding ? v.funding.capTable.length - 1 : 0),
  'funding.mood': (v) => (v.funding?.mood ? MOODS[v.funding.mood] : -1),
  'funding.milestoneMissed': (v) => (v.funding?.milestone?.status === 'missed' ? 1 : 0),
  'team.size': (v) => v.team.members.length,
  runwayWeeks: (v) => v.company.runwayWeeks ?? v.maxWeeks - v.week + 1,
  'tour.forecast': (v) => (v.bookings ? FORECASTS.indexOf(v.bookings.forecast) : 0),
  'tour.peak': (v) => (v.bookings?.peak ? 1 : 0),
  'tour.month': (v) => v.bookings?.month ?? 0,
  'tour.rating': (v) => Math.round((v.bookings?.rating ?? 0) * 10),
  'tour.reviews': (v) => v.bookings?.reviews ?? 0,
  'tour.bookedWeek': (v) => (v.bookings?.thisWeek ?? []).reduce((t, x) => t + x.booked, 0),
  'tour.bookedAhead': (v) => v.bookings?.bookedAhead ?? 0,
  'tour.listed': (v) => (v.bookings?.platform.listed ? 1 : 0),
  'sender.overdue': (v, m) =>
    m && v.invoices.some((i) => i.customerName === m.fromName && i.status === 'overdue') ? 1 : 0,
  'sender.silent': (v, m) =>
    m &&
    v.leads.some(
      (l) => l.name === m.fromName && l.silent && l.stage !== 'lost' && l.stage !== 'paying',
    )
      ? 1
      : 0,
}

/** The value a condition path reads in the view, for a message's sender where it asks about one. */
export function viewConditionValue(
  view: PlayerView,
  path: ConditionPath,
  message: MessageView | null = null,
): number {
  return VIEW_METRICS[path](view, message)
}

/** True when every condition holds in the view. An empty list always holds. */
export function viewConditionsHold(
  view: PlayerView,
  conditions: readonly Condition[],
  message: MessageView | null = null,
): boolean {
  return conditions.every((c) => conditionHolds(VIEW_METRICS[c.path](view, message), c))
}
