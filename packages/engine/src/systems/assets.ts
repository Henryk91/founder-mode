import type { AssetConfig, BookingsConfig, Scenario } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  AssetEconomics,
  AssetOption,
  AssetState,
  AssetView,
  FeatureId,
  GameState,
  ReportEntry,
} from '../types'

// Plan 4 (docs/abroad-mechanics.md section 4): assets with three options. Everything here runs
// only for a scenario whose bookings block has `assets`.

const WEEKS_PER_YEAR = 52
const WEEKS_PER_MONTH = 4

/** A run week's month (1 to 12), as the bookings calendar counts it. */
function monthAt(scenario: Scenario, week: number): number {
  const start = scenario.bookings?.startWeekOfYear ?? 1
  const woy = ((start - 1 + week - 1) % WEEKS_PER_YEAR) + 1
  return Math.min(12, Math.floor(((woy - 1) * 12) / WEEKS_PER_YEAR) + 1)
}

/** The calendar year of a run week, counted from 0 (the year the run starts in). */
export function calendarYear(scenario: Scenario, week: number): number {
  const start = scenario.bookings?.startWeekOfYear ?? 1
  return Math.floor((start - 1 + week - 1) / WEEKS_PER_YEAR)
}

/** Weeks of the same month before this one: 0 in a month's first week. */
function weekInMonth(scenario: Scenario, week: number): number {
  const m = monthAt(scenario, week)
  let k = 0
  while (week - k - 1 >= 1 - WEEKS_PER_YEAR && monthAt(scenario, week - k - 1) === m && k < 6) k++
  return k
}

export function initAssets(cfg: BookingsConfig): Record<string, AssetState> | undefined {
  if (!cfg.assets) return undefined
  return Object.fromEntries(
    Object.keys(cfg.assets).map((id) => [
      id,
      {
        option: 'none' as AssetOption,
        sinceWeek: 1,
        leaseFromWeek: null,
        boughtWeek: null,
        brokenUntil: 0,
        breakdowns: 0,
        takenBack: false,
        peakReleased: [],
        weeksUsed: 0,
        costCents: 0,
      },
    ]),
  )
}

/** The asset a product runs on, if any. */
export function assetOf(cfg: BookingsConfig, product: FeatureId): [string, AssetConfig] | null {
  for (const [id, a] of Object.entries(cfg.assets ?? {})) {
    if (a.products.includes(product)) return [id, a]
  }
  return null
}

/** An owned asset is out of the water for its haul-out in this week. */
export function hauledOut(scenario: Scenario, a: AssetConfig, week: number): boolean {
  const h = a.buy?.haulOut
  return !!h && monthAt(scenario, week) === h.month && weekInMonth(scenario, week) < h.weeks
}

/**
 * The share of a product's capacity its asset gives in a week: 0 without the asset, or while it
 * is broken, hauled out, outside a lease's months or in peak months the owner keeps; a share's
 * part of it, less what the owner takes back this week.
 */
export function assetFactor(state: GameState, product: FeatureId, week: number): number {
  const cfg = state.scenario.bookings
  if (!cfg?.assets) return 1
  const found = assetOf(cfg, product)
  if (!found) return 1
  const [id, a] = found
  const s = state.bookings?.assets?.[id]
  if (!s) return 0
  const month = monthAt(state.scenario, week)
  switch (s.option) {
    case 'none':
      return 0
    case 'buy':
      if (week <= s.brokenUntil || hauledOut(state.scenario, a, week)) return 0
      return 1
    case 'lease':
      return a.lease?.months.includes(month) ? 1 : 0
    case 'share': {
      const sh = a.share!
      const rule = sh.peakRule
      if (
        rule &&
        rule.months.includes(month) &&
        !s.peakReleased.includes(calendarYear(state.scenario, week))
      ) {
        return 0
      }
      const back = week === state.week && s.takenBack && sh.takeBack ? sh.takeBack.share : 0
      return sh.capacity * (1 - back)
    }
  }
}

/** What an owned asset would sell for in a week: its price, less its yearly loss of value. */
export function assetValue(state: GameState, id: string, week: number): number | null {
  const cfg = state.scenario.bookings
  const a = cfg?.assets?.[id]
  const s = state.bookings?.assets?.[id]
  if (!a?.buy || !s || s.option !== 'buy' || s.boughtWeek === null) return null
  const price = cfg!.products[a.buy.product]?.oneOffCents ?? 0
  const years = (week - s.boughtWeek) / WEEKS_PER_YEAR
  return Math.round(price * Math.max(0, 1 - a.buy.valueLossPerYear * years))
}

/** The asset whose purchase product shipped this week is owned from now on. */
export function assetsBought(
  state: GameState,
  shipped: FeatureId[],
): { state: GameState; entries: ReportEntry[] } {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.assets || !b?.assets) return { state, entries: [] }
  let assets = b.assets
  const entries: ReportEntry[] = []
  for (const [id, a] of Object.entries(cfg.assets)) {
    if (!a.buy || !shipped.includes(a.buy.product)) continue
    assets = {
      ...assets,
      [id]: {
        ...assets[id]!,
        option: 'buy',
        sinceWeek: state.week,
        boughtWeek: state.week,
        leaseFromWeek: null,
      },
    }
    entries.push({ kind: 'asset_option', assetId: id, option: 'buy', costCents: 0 })
  }
  return { state: { ...state, bookings: { ...b, assets } }, entries }
}

/**
 * An inbox answer: lease, share or give up an asset. An owned asset stays owned (one boat at a
 * time). Leaving a lease before its minimum pays the rest of the minimum; a new lease pays its
 * share up front.
 */
export function chooseAsset(
  state: GameState,
  id: string,
  option: 'lease' | 'share' | 'none',
): { state: GameState; costCents: number; entries: ReportEntry[] } {
  const a = state.scenario.bookings?.assets?.[id]
  const b = state.bookings
  const s = b?.assets?.[id]
  if (!a || !b || !s || s.option === 'buy' || s.option === option) {
    return { state, costCents: 0, entries: [] }
  }
  if (option !== 'none' && !a[option]) return { state, costCents: 0, entries: [] }
  let cost = 0
  if (s.option === 'lease' && a.lease && s.leaseFromWeek !== null) {
    const left = s.leaseFromWeek + a.lease.minMonths * WEEKS_PER_MONTH - state.week
    if (left > 0) cost += Math.round((leaseMonthly(a) * left) / WEEKS_PER_MONTH)
  }
  if (option === 'lease') cost += Math.round(a.lease!.seasonCents * a.lease!.upfrontShare)
  const next: AssetState = {
    ...s,
    option,
    sinceWeek: state.week,
    leaseFromWeek: option === 'lease' ? state.week : null,
    costCents: s.costCents + cost,
  }
  return {
    state: { ...state, bookings: { ...b, assets: { ...b.assets!, [id]: next } } },
    costCents: cost,
    entries: [{ kind: 'asset_option', assetId: id, option, costCents: cost }],
  }
}

/** A lease's monthly part: the season's fee less the part paid up front, over its months. */
const leaseMonthly = (a: AssetConfig) =>
  a.lease ? (a.lease.seasonCents * (1 - a.lease.upfrontShare)) / a.lease.months.length : 0

/** An inbox answer: a broken asset repaired at its cost, open again from next week. */
export function repairAsset(
  state: GameState,
  id: string,
): { state: GameState; costCents: number; entries: ReportEntry[] } {
  const a = state.scenario.bookings?.assets?.[id]
  const b = state.bookings
  const s = b?.assets?.[id]
  if (!a?.buy || !b || !s || s.option !== 'buy' || s.brokenUntil <= state.week) {
    return { state, costCents: 0, entries: [] }
  }
  const cost = a.buy.breakdown.repairCents
  const next = { ...s, brokenUntil: state.week, costCents: s.costCents + cost }
  return {
    state: { ...state, bookings: { ...b, assets: { ...b.assets!, [id]: next } } },
    costCents: cost,
    entries: [{ kind: 'asset_repaired', assetId: id, costCents: cost }],
  }
}

/**
 * The week's draws and fixed costs of the assets, before guests book: the owner takes seats
 * back, an owned asset breaks down or is hauled out, a peak rule releases the peak months; and
 * upkeep and lease fees. `bookedAt` counts units booked for a product in a week.
 */
export function assetsWeek(
  state: GameState,
  rng: Rng,
  bookedAt: (product: FeatureId, week: number) => number,
): { state: GameState; costsCents: number; entries: ReportEntry[] } {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.assets || !b?.assets) return { state, costsCents: 0, entries: [] }
  const week = state.week
  const month = monthAt(state.scenario, week)
  const entries: ReportEntry[] = []
  let costs = 0
  const assets = { ...b.assets }
  for (const [id, a] of Object.entries(cfg.assets)) {
    let s = { ...assets[id]! }
    let cost = 0
    s.takenBack = false
    if (s.option === 'share' && a.share?.takeBack?.months.includes(month)) {
      s.takenBack = rng.chance(a.share.takeBack.chance)
      if (s.takenBack) entries.push({ kind: 'asset_taken_back', assetId: id })
    }
    const rule = a.share?.peakRule
    const woy = ((cfg.startWeekOfYear - 1 + week - 1) % WEEKS_PER_YEAR) + 1
    if (rule && woy === rule.byWeek) {
      // Weeks of this calendar year's shoulder months that have something booked.
      const year = calendarYear(state.scenario, week)
      let sold = 0
      for (let w = week; w < week + WEEKS_PER_YEAR && w <= state.scenario.maxWeeks; w++) {
        if (calendarYear(state.scenario, w) !== year) break
        if (!rule.shoulderMonths.includes(monthAt(state.scenario, w))) continue
        if (a.products.some((p) => bookedAt(p, w) > 0)) sold++
      }
      if (sold >= rule.needWeeks) s.peakReleased = [...s.peakReleased, year]
    }
    if (s.option === 'buy' && a.buy) {
      cost += Math.round(a.buy.upkeepMonthlyCents / WEEKS_PER_MONTH)
      const h = a.buy.haulOut
      if (h && hauledOut(state.scenario, a, week) && weekInMonth(state.scenario, week) === 0) {
        cost += h.cents
        entries.push({ kind: 'asset_haul_out', assetId: id, weeks: h.weeks, costCents: h.cents })
      }
      if (week > s.brokenUntil && !hauledOut(state.scenario, a, week)) {
        const age = a.buy.ageYears + (week - (s.boughtWeek ?? week)) / WEEKS_PER_YEAR
        if (rng.chance(Math.min(1, a.buy.breakdown.weekly + a.buy.breakdown.perYear * age))) {
          const weeks = rng.int(a.buy.breakdown.weeks.min, a.buy.breakdown.weeks.max)
          s = { ...s, brokenUntil: week + weeks - 1, breakdowns: s.breakdowns + 1 }
          let booked = 0
          for (let w = week; w < week + weeks; w++)
            for (const p of a.products) booked += bookedAt(p, w)
          entries.push({
            kind: 'asset_broke',
            assetId: id,
            untilWeek: s.brokenUntil,
            repairCents: a.buy.breakdown.repairCents,
            booked,
          })
        }
      }
    }
    if (s.option === 'lease' && a.lease?.months.includes(month)) {
      cost += Math.round(leaseMonthly(a) / WEEKS_PER_MONTH)
    }
    s.costCents += cost
    costs += cost
    assets[id] = s
  }
  return { state: { ...state, bookings: { ...b, assets } }, costsCents: costs, entries }
}

/**
 * After the week's guests: crew for an owned or leased asset that was used, and a share's fee per
 * unit and the owner's share of the revenue. `served` gives the units and gross revenue of the
 * week's served bookings per product.
 */
export function assetsUsed(
  state: GameState,
  served: Map<FeatureId, { units: number; grossCents: number }>,
): { state: GameState; costsCents: number } {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.assets || !b?.assets) return { state, costsCents: 0 }
  let costs = 0
  const assets = { ...b.assets }
  for (const [id, a] of Object.entries(cfg.assets)) {
    const s = assets[id]!
    let units = 0
    let gross = 0
    for (const p of a.products) {
      units += served.get(p)?.units ?? 0
      gross += served.get(p)?.grossCents ?? 0
    }
    if (units === 0) continue
    let cost = 0
    if (s.option === 'buy') cost += a.buy?.crewWeekCents ?? 0
    if (s.option === 'lease') cost += a.lease?.crewWeekCents ?? 0
    if (s.option === 'share' && a.share) {
      cost += units * a.share.unitCents + Math.round(gross * a.share.revenueShare)
    }
    assets[id] = { ...s, weeksUsed: s.weeksUsed + 1, costCents: s.costCents + cost }
    costs += cost
  }
  return { state: { ...state, bookings: { ...b, assets } }, costsCents: costs }
}

/** The assets for the view. */
export function assetsView(state: GameState): AssetView[] {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.assets || !b?.assets) return []
  return Object.entries(cfg.assets).map(([id, a]) => {
    const s = b.assets![id]!
    let nextHaulOut: number | null = null
    if (s.option === 'buy' && a.buy?.haulOut) {
      for (let w = state.week; w < state.week + WEEKS_PER_YEAR; w++) {
        if (hauledOut(state.scenario, a, w) && weekInMonth(state.scenario, w) === 0) {
          nextHaulOut = w
          break
        }
      }
    }
    const rule = a.share?.peakRule
    return {
      id,
      name: a.name,
      option: s.option,
      products: [...a.products],
      buyProduct: a.buy?.product ?? null,
      broken: s.option === 'buy' && s.brokenUntil >= state.week,
      brokenUntil: s.option === 'buy' && s.brokenUntil >= state.week ? s.brokenUntil : null,
      nextHaulOut,
      valueCents: assetValue(state, id, state.week),
      breakdowns: s.breakdowns,
      weeksUsed: s.weeksUsed,
      costCents: s.costCents,
      leaseMinUntil:
        s.option === 'lease' && a.lease && s.leaseFromWeek !== null
          ? s.leaseFromWeek + a.lease.minMonths * WEEKS_PER_MONTH - 1
          : null,
      peakReleased:
        s.option === 'share' && rule
          ? s.peakReleased.includes(calendarYear(state.scenario, state.week))
          : null,
      terms: {
        buy: a.buy
          ? {
              priceCents: cfg.products[a.buy.product]?.oneOffCents ?? 0,
              upkeepMonthlyCents: a.buy.upkeepMonthlyCents,
              crewWeekCents: a.buy.crewWeekCents,
              haulOut: a.buy.haulOut ? { ...a.buy.haulOut } : null,
              repairCents: a.buy.breakdown.repairCents,
            }
          : null,
        lease: a.lease
          ? {
              seasonCents: a.lease.seasonCents,
              upfrontShare: a.lease.upfrontShare,
              months: [...a.lease.months],
              minMonths: a.lease.minMonths,
              crewWeekCents: a.lease.crewWeekCents,
            }
          : null,
        share: a.share
          ? {
              capacity: a.share.capacity,
              unitCents: a.share.unitCents,
              revenueShare: a.share.revenueShare,
              takeBack: a.share.takeBack
                ? { share: a.share.takeBack.share, months: [...a.share.takeBack.months] }
                : null,
              peakRule: rule
                ? {
                    months: [...rule.months],
                    shoulderMonths: [...rule.shoulderMonths],
                    needWeeks: rule.needWeeks,
                    byWeek: rule.byWeek,
                  }
                : null,
            }
          : null,
      },
    }
  })
}

/** The post-mortem's asset lines. */
export function assetsEconomics(state: GameState): AssetEconomics[] | undefined {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg?.assets || !b?.assets) return undefined
  return Object.entries(cfg.assets).map(([id, a]) => {
    const s = b.assets![id]!
    const owned = s.option === 'buy' && a.buy
    return {
      id,
      name: a.name,
      option: s.option,
      boughtWeek: s.boughtWeek,
      priceCents: owned ? (cfg.products[a.buy!.product]?.oneOffCents ?? 0) : null,
      valueEndCents: assetValue(state, id, state.week),
      costCents: s.costCents,
      weeksUsed: s.weeksUsed,
      breakdowns: s.breakdowns,
    }
  })
}
