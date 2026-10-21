import type { Scenario } from '@founder-mode/content'
import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
import type { PlanBuilder } from '../strategy'
import type { TourismRule } from './tourism'
import { venueWanted } from './venue'

export type LeisureRule = {
  rooms?: 'careful' | 'one' | 'quarterly'
  themeBlind?: boolean
  noDaytime?: boolean
  vrEarly?: boolean
  laterLoans?: boolean
  venueInsulation?: boolean
  holdPolicy?: 'free' | 'none'
}

const shuffled = (ids: string[], seed: string) => {
  const value = (id: string) =>
    [...`${seed}/${id}`].reduce(
      (n, c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0,
      2166136261,
    )
  return [...ids].sort((a, b) => value(a) - value(b))
}

export function leisureFirstTheme(view: PlayerView, rule: TourismRule, seed: string) {
  const message = view.inbox.find((m) => m.eventId === 'first_theme' && m.answeredChoiceId === null)
  if (!message) return null
  const choices = message.choices.map((c) => c.id)
  const choice = rule.leisure?.themeBlind
    ? shuffled(choices, seed)[0]
    : (choices.find((id) => id === 'heist') ?? choices[0])
  return choice ? { messageId: message.id, choiceId: choice } : null
}

/** Rooms come from stated products and observed opening, load and freshness, never hidden roles. */
export function leisureWanted(
  scenario: Scenario,
  view: PlayerView,
  rule: TourismRule,
  requested: string[],
  segment: string,
  seed: string,
): string[] {
  const l = view.bookings?.leisure
  const c = scenario.bookings?.leisure
  if (!l || !c?.opening) return requested
  if (c.noise) return venueWanted(scenario, view, rule, requested)
  const areas = c.opening.areas
  const first = l.buildChoice.length ? l.buildChoice : [areas[0]!]
  const started = areas.filter((id) =>
    view.product.features.some(
      (f) => f.id === id && (f.shipped || f.progressHours > 0 || f.readyWeek !== null),
    ),
  )
  const support = requested.filter((id) => !areas.includes(id))
  const compatible = areas.filter(
    (id) => scenario.bookings!.products[id]?.serves.includes(segment) && id !== 'vr_room',
  )
  const preferred = rule.leisure?.themeBlind
    ? shuffled(
        areas.filter((id) => id !== 'vr_room'),
        seed,
      )
    : compatible
  const opened = l.openingWeek
  const quarterly = rule.leisure?.rooms === 'quarterly'
  const newest = l.freshness
    .filter((f) => started.includes(f.productId) && f.openedWeek !== null)
    .sort((a, b) => b.openedWeek! - a.openedWeek!)[0]
  const known = newest !== undefined && newest.word !== 'new'
  const crowded =
    l.history
      .slice(-8)
      .filter(
        (week) =>
          week.slots.some((slot) => slot.load === 'packed') &&
          Object.values(week.turnedAway).some((n) => n > 0),
      ).length >= 3
  const need =
    rule.leisure?.rooms !== 'one' &&
    opened !== null &&
    (quarterly
      ? started.length < 1 + Math.floor((view.week - opened) / 13)
      : ((known || crowded) &&
          started.every((id) => view.product.features.find((f) => f.id === id)?.shipped)) ||
        (l.minimumAreas[segment] ?? 1) > started.length)
  const next = need
    ? preferred.find((id) => !started.includes(id) && !first.includes(id))
    : undefined
  const space = l.space
  const canFit = (id: string) => !space || space.used + (space.uses[id] ?? 0) <= space.max
  const more = next && canFit(next) ? [next] : []
  const vr =
    rule.leisure?.vrEarly &&
    view.week >= 13 &&
    view.week <= 52 &&
    areas.includes('vr_room') &&
    canFit('vr_room')
      ? ['vr_room']
      : []
  return [...new Set([...first, ...started, ...support, ...more, ...vr])]
}

/** Drop impossible starts before the bank prices a plan; already reserved builds still fit. */
export function leisureBuildOrder(
  view: PlayerView,
  ids: string[],
  expensiveFirst = false,
): string[] {
  const leisure = view.bookings?.leisure
  if (!leisure) return ids
  const space = leisure.space
  let free = space ? space.max - space.used : Infinity
  const ordered = expensiveFirst
    ? [...ids].sort(
        (a, b) =>
          (view.bookings!.products.find((p) => p.id === b)?.oneOffCents ?? 0) -
          (view.bookings!.products.find((p) => p.id === a)?.oneOffCents ?? 0),
      )
    : ids
  return ordered.filter((id) => {
    const f = view.product.features.find((f) => f.id === id)
    const build = leisure.builds.find((b) => b.productId === id)
    if (build && !build.started && !f?.shipped && view.week + build.weeks > view.maxWeeks)
      return false
    if (f && (f.shipped || f.progressHours > 0 || f.readyWeek !== null)) return true
    const uses = space?.uses[id] ?? 0
    if (uses > free) return false
    free -= uses
    return true
  })
}

export function planLeisure(
  view: PlayerView,
  b: PlanBuilder,
  plan: BookingsPlan,
  rule: TourismRule,
): void {
  const l = view.bookings?.leisure
  if (!l) return
  const leisure: NonNullable<BookingsPlan['leisure']> = {}
  if (l.holds) {
    const decided = l.holds.granted - l.holds.calendar.filter((h) => h.status === 'held').length
    const conversion = decided > 0 ? l.holds.converted / decided : 0
    leisure.holdPolicy =
      rule.leisure?.holdPolicy ??
      (decided < 8 ? 'fee' : conversion > 0.7 ? 'free' : conversion < 0.2 ? 'none' : 'fee')
  }
  if (l.slotPrices) {
    leisure.slotPrices = {}
    leisure.salesSlots = {}
    for (const [segment, prices] of Object.entries(l.slotPrices)) {
      const base = plan.prices[segment] ?? view.bookings!.prices[segment]!
      // Preserve the stated slot discount/premium while moving from the same interview hints.
      const currentBase = view.bookings!.prices[segment]!
      leisure.slotPrices[segment] = Object.fromEntries(
        Object.entries(prices).map(([slot, p]) => [
          slot,
          {
            peak: Math.max(100, Math.round((p.peak * base.peak) / currentBase.peak / 100) * 100),
            off: Math.max(100, Math.round((p.off * base.off) / currentBase.off / 100) * 100),
          },
        ]),
      )
      leisure.salesSlots[segment] = l.slots
        .filter((slot) => !rule.leisure?.noDaytime || slot.id !== 'daytime')
        .map((slot) => slot.id)
    }
  }
  const bought = view.loan?.plan?.bought ?? []
  const starts = Object.entries(b.plan.build).reduce((sum, [id, hours]) => {
    const feature = view.product.features.find((f) => f.id === id)
    if (
      !feature ||
      feature.shipped ||
      hours < feature.remainingHours ||
      bought.includes(id) ||
      l.builds.some((build) => build.productId === id && build.started)
    )
      return sum
    return sum + (view.bookings!.products.find((p) => p.id === id)?.oneOffCents ?? 0)
  }, 0)
  let spare = view.company.cashCents - 3 * view.company.monthlyFixedCostsCents - starts
  for (const f of l.freshness) {
    if (
      f.word !== 'tired' ||
      f.refreshingUntil !== null ||
      !view.product.features.some((p) => p.id === f.productId && p.shipped)
    )
      continue
    const reopens = view.week + f.refreshWeeks
    if (reopens > view.maxWeeks) continue
    const lastVisibleWeek = Math.max(view.week, ...l.slotCalendar.map((cell) => cell.week))
    if (view.maxWeeks <= lastVisibleWeek) {
      const product = view.bookings!.products.find((p) => p.id === f.productId)!
      // Even selling every remaining place at the highest stated price must cover the rebuild.
      // This is an optimistic bound, using the public calendar and prices, not hidden demand.
      const most = l.slotCalendar
        .filter(
          (cell) =>
            cell.productId === f.productId && cell.week >= reopens && cell.week <= view.maxWeeks,
        )
        .reduce((sum, cell) => {
          const price = Math.max(
            0,
            ...product.serves.map((id) => {
              const prices =
                leisure.slotPrices?.[id]?.[cell.slotId] ??
                l.slotPrices?.[id]?.[cell.slotId] ??
                plan.prices[id] ??
                view.bookings!.prices[id]!
              return Math.round(Math.max(prices.peak, prices.off) * product.priceFactor)
            }),
          )
          return sum + cell.capacity * price
        }, 0)
      if (most < f.refreshCents) continue
    }
    if (f.refreshWeeks > 0 && spare >= f.refreshCents && b.free >= f.resetHours) {
      leisure.refresh = [...(leisure.refresh ?? []), f.productId]
      b.free -= f.resetHours
      spare -= f.refreshCents
    }
  }
  plan.leisure = leisure
}
