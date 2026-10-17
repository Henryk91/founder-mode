import type { BookingsConfig } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  Booking,
  CancelledWeek,
  CruiseView,
  FeatureId,
  GameState,
  ReportEntry,
} from '../types'
import { costFactor } from './abroad'
import { assetFactor, assetOf } from './assets'

// Plan 4 (docs/scenario-gulet.md section 6): selling a cruise week. Weeks held for whole-boat
// bookings, the minimum to sail (cancelled three weeks out), friction among strangers on one
// boat, and the refit that closes the boat. Everything here runs only for a scenario whose
// bookings block names `hold`, `minSail`, `friction` or a product with `closesAsset`.

/** Whether a held week stops this product selling in it. */
export const heldFor = (
  cfg: BookingsConfig,
  held: readonly number[] | undefined,
  product: FeatureId,
  week: number,
): boolean => !!cfg.hold && cfg.hold.products.includes(product) && !!held?.includes(week)

/** Cabins a number of places makes, rounded up. */
const cabinsOf = (units: number, perUnit: number) => Math.ceil(units / perUnit)

/**
 * The minimum to sail: the week `weeksBefore` ahead, if it has guests but fewer cabins than the
 * minimum, is cancelled now. Its guests are moved to a partner's boat (at a cost a cabin) or
 * refunded (their deposits back, and they say so in reviews). The week is held from then on, so
 * nobody else books it. Changes `bookings` in place, like the bookings step.
 */
export function applyMinSail(
  state: GameState,
  bookings: Booking[],
): {
  held: number[]
  costsCents: number
  badReviews: number
  entries: ReportEntry[]
  cancelled: CancelledWeek | null
} {
  const cfg = state.scenario.bookings!
  const m = cfg.minSail
  const b = state.bookings!
  const held = [...(b.held ?? [])]
  const setting = b.minSail
  const none = { held, costsCents: 0, badReviews: 0, entries: [], cancelled: null }
  if (!m || !setting || setting.min === 0) return none
  const t = state.week + m.weeksBefore
  const mine = bookings.filter(
    (x) => x.productId === m.product && x.week === t && x.status === 'booked',
  )
  const units = mine.reduce((s, x) => s + x.units, 0)
  if (units === 0) return none
  const cabins = cabinsOf(units, m.perUnit)
  if (cabins >= setting.min) return none
  let cost = 0
  for (const x of mine) {
    x.status = 'company_cancelled'
    cost += x.depositCents ?? 0
  }
  if (setting.move) cost += cabins * m.moveCents
  if (!held.includes(t)) held.push(t)
  const lost = mine.reduce((s, x) => s + x.units * x.priceCents, 0)
  return {
    held,
    costsCents: cost,
    badReviews: setting.move ? 0 : mine.length,
    entries: [{ kind: 'cruise_cancelled', week: t, cabins, moved: setting.move, costCents: cost }],
    cancelled: {
      week: t,
      cabins,
      lostCents: lost,
      savedCents: sailingCost(state, units, lost),
      costCents: cost,
    },
  }
}

/**
 * Tuning 1: what sailing a week of the minimum's product with these guests would have cost: the
 * boat's crew, food and fuel for a week (owned or leased) or the owner's share (managed), and
 * the costs per guest. Only the deposits were refunded, so the rest is what the week gave up.
 */
function sailingCost(state: GameState, units: number, grossCents: number): number {
  const cfg = state.scenario.bookings!
  const product = cfg.minSail!.product
  const local = (kind: 'roles' | 'unitCosts') =>
    cfg.costSteps ? costFactor(state.scenario, state.week, kind) : 1
  let cost = Math.round(units * (cfg.products[product]?.unitCostCents ?? 0) * local('unitCosts'))
  const found = assetOf(cfg, product)
  if (!found) return cost
  const [id, a] = found
  const option = state.bookings!.assets?.[id]?.option
  if (option === 'buy') cost += Math.round((a.buy?.crewWeekCents ?? 0) * local('roles'))
  if (option === 'lease') cost += Math.round((a.lease?.crewWeekCents ?? 0) * local('roles'))
  if (option === 'share' && a.share)
    cost += units * a.share.unitCents + Math.round(grossCents * a.share.revenueShare)
  return cost
}

/**
 * Friction among strangers: a week of the friction product sold to more than one group may go
 * badly. Returns the review quality lost this week (by its share of the guests served).
 */
export function frictionPenalty(
  state: GameState,
  served: readonly Booking[],
  rng: Rng,
): { penalty: number; entries: ReportEntry[] } {
  const f = state.scenario.bookings?.friction
  if (!f) return { penalty: 0, entries: [] }
  const mine = served.filter((x) => x.productId === f.product)
  if (mine.length < 2) return { penalty: 0, entries: [] }
  const themed =
    f.themed !== undefined &&
    state.product.features.some((x) => x.id === f.themed && x.shippedWeek !== null)
  const chance = f.chance * (themed ? (f.themedFactor ?? 1) : 1)
  // A week of mixed groups goes wrong with the chance, however many groups share it.
  if (!rng.chance(chance)) return { penalty: 0, entries: [] }
  const all = served.reduce((t, x) => t + x.units, 0)
  const share = mine.reduce((t, x) => t + x.units, 0) / Math.max(1, all)
  return { penalty: f.penalty * share, entries: [{ kind: 'friction', groups: mine.length }] }
}

/** Themed weeks lower the friction product's requests: false when this request does not book. */
export function themedTurnsAway(state: GameState, segment: string, rng: Rng): boolean {
  const cfg = state.scenario.bookings!
  const f = cfg.friction
  if (!f?.themed || f.themedConversion === undefined) return false
  if (!cfg.products[f.product]?.serves.includes(segment)) return false
  if (!state.product.features.some((x) => x.id === f.themed && x.shippedWeek !== null)) return false
  return !rng.chance(f.themedConversion)
}

/** A segment's willingness to pay, raised by shipped products that raise it (a refit). */
export function wtpWithFactors(state: GameState, segment: string, wtp: number): number {
  let out = wtp
  for (const [id, p] of Object.entries(state.scenario.bookings?.products ?? {})) {
    const f = p.wtpFactor?.[segment]
    if (f && state.product.features.some((x) => x.id === id && x.shippedWeek !== null)) out *= f
  }
  return out
}

/** The cruise season ahead for the view. */
export function cruiseView(state: GameState): CruiseView | null {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.hold || !b) return null
  const m = cfg.minSail
  const main = m?.product ?? cfg.hold.products[0]!
  const whole = Object.entries(cfg.products)
    .filter(([id, p]) => p.capacityOf === main && id !== main)
    .map(([id]) => id)
  const per = m?.perUnit ?? 1
  const cap = cfg.products[main]?.capacity ?? 0
  const months = cfg.products[main]?.months ?? []
  const weeks: CruiseView['weeks'] = []
  for (
    let w = state.week;
    w < state.week + 52 && w <= state.scenario.maxWeeks && weeks.length < 26;
    w++
  ) {
    const start = cfg.startWeekOfYear
    const woy = ((start - 1 + w - 1) % 52) + 1
    const month = Math.min(12, Math.floor(((woy - 1) * 12) / 52) + 1)
    if (months.length && !months.includes(month)) continue
    let cabins = 0
    let chartered = false
    for (const x of b.bookings) {
      if (x.week !== w || x.status !== 'booked') continue
      if (x.productId === main) cabins += x.units
      if (whole.includes(x.productId)) chartered = true
    }
    weeks.push({
      week: w,
      held: !!b.held?.includes(w),
      chartered,
      sold: cabinsOf(cabins, per),
      cabins: Math.floor(cap / per),
      closed: assetFactor(state, main, w) === 0,
    })
  }
  const setting = b.minSail
  const themedId = cfg.friction?.themed
  return {
    weeks,
    minSail:
      m && setting
        ? {
            min: setting.min,
            move: setting.move,
            options: [...m.options],
            locked: state.week - setting.sinceWeek < m.policyWeeks,
            weeksBefore: m.weeksBefore,
            moveCents: m.moveCents,
          }
        : null,
    themed:
      themedId !== undefined &&
      state.product.features.some((x) => x.id === themedId && x.shippedWeek !== null),
  }
}
