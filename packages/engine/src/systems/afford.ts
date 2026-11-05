import type { GameState, PlayerView, WeekPlan } from '../types'
import { bookingsPlanOf } from './bookings'

/**
 * Plan 8, P-01: an expense chosen in the plan can be added only if the money available now covers
 * it, together with the expenses chosen before it in the same week. Money not yet received (an
 * accepted loan that has not paid out, an invoice, a deposit to come) does not count. Savings do:
 * the game moves them into the company by itself when cash runs short.
 */
export type SpendInfo = {
  /** Company cash plus savings, now. */
  availableCents: number
  /** What starting a product costs now: its one-off price, 0 where a loan or a build paid already. */
  startCents: Record<string, number>
  /** Renovating one room, after rooms a loan bought are used. */
  roomCents: number
  roomsPaid: number
}

export type Expense = {
  /** `build:<feature>`, `rooms`, `landing:<segment>`. */
  key: string
  cents: number
}

export type Unaffordable = { key: string; needsCents: number; haveCents: number }

export function spendInfo(state: GameState): SpendInfo {
  const cfg = state.scenario.bookings
  const startCents: Record<string, number> = {}
  for (const [id, p] of Object.entries(cfg?.products ?? {})) {
    if (p.oneOffCents <= 0) continue
    const feature = state.product.features.find((f) => f.id === id)
    if (!feature || feature.shippedWeek !== null) continue
    const paid =
      (state.loan?.bought ?? []).includes(id) ||
      (state.bookings?.leisure?.buildPaid ?? []).includes(id)
    startCents[id] = paid ? 0 : p.oneOffCents
  }
  return {
    availableCents: state.company.cashCents + Math.max(0, state.founder.savingsCents),
    startCents,
    roomCents: cfg?.renovation?.centsPerRoom ?? 0,
    roomsPaid: state.loan?.roomsBought ?? 0,
  }
}

/** The plan's expenses in a fixed order: products, rooms, then ad budgets. */
export function plannedExpenses(
  info: SpendInfo,
  plan: WeekPlan,
  adBudgets: Record<string, number> = plan.landing,
): Expense[] {
  const out: Expense[] = []
  for (const [id, hours] of Object.entries(plan.build).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    const cents = info.startCents[id] ?? 0
    if (hours > 0 && cents > 0) out.push({ key: `build:${id}`, cents })
  }
  const rooms = Math.max(0, (bookingsPlanOf(plan).renovate ?? 0) - info.roomsPaid)
  if (rooms > 0 && info.roomCents > 0) out.push({ key: 'rooms', cents: rooms * info.roomCents })
  for (const [segment, cents] of Object.entries(adBudgets).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (cents > 0) out.push({ key: `landing:${segment}`, cents })
  }
  return out
}

/** The first expense, in order, that no longer fits once the ones before it are paid. */
export function firstUnaffordable(info: SpendInfo, plan: WeekPlan): Unaffordable | null {
  let left = info.availableCents
  for (const e of plannedExpenses(info, plan)) {
    if (e.cents > left) return { key: e.key, needsCents: e.cents, haveCents: Math.max(0, left) }
    left -= e.cents
  }
  return null
}

/** Money left for a new expense of one key, after the plan's other expenses. */
export function leftForCents(info: SpendInfo, plan: WeekPlan, key: string): number {
  const others = plannedExpenses(info, plan)
    .filter((e) => e.key !== key)
    .reduce((t, e) => t + e.cents, 0)
  return Math.max(0, info.availableCents - others)
}

/**
 * The plan without the expenses that do not fit: bots use it so they follow the same rule. A
 * product that does not fit gets no build hours, rooms are cut back, an ad budget is dropped.
 */
export function dropUnaffordable(info: SpendInfo, plan: WeekPlan): WeekPlan {
  let next = plan
  for (let guard = 0; guard < 50; guard++) {
    const bad = firstUnaffordable(info, next)
    if (!bad) return next
    if (bad.key.startsWith('build:')) {
      const build = { ...next.build }
      delete build[bad.key.slice(6)]
      next = { ...next, build }
    } else if (bad.key === 'rooms') {
      const b = bookingsPlanOf(next)
      const fit = info.roomCents > 0 ? Math.floor(bad.haveCents / info.roomCents) : 0
      next = { ...next, bookings: { ...b, renovate: Math.max(0, fit + info.roomsPaid) } }
    } else {
      const landing = { ...next.landing }
      delete landing[bad.key.slice(8)]
      next = { ...next, landing }
    }
  }
  return next
}

/** What the view says about money for choosing expenses. */
export function spendView(state: GameState): PlayerView['spend'] {
  const info = spendInfo(state)
  return {
    availableCents: info.availableCents,
    startCents: info.startCents,
    roomCents: info.roomCents,
    roomsPaid: info.roomsPaid,
  }
}
