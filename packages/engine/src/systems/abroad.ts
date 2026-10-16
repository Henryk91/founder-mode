import type { BookingsConfig, ConditionsConfig, Scenario } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  AbroadState,
  ConditionsWeek,
  FeatureId,
  GameState,
  LadderYear,
  ReportEntry,
} from '../types'

// Plan 4 (docs/abroad-mechanics.md): day conditions, courses, day trips, licences, the tender
// and local cost steps. Everything here runs only for a scenario whose bookings block has
// `conditions` (or the field named), so the scenarios before plan 4 draw nothing new.

const DAYS = 7

export const conditionsOf = (s: Pick<GameState, 'scenario'>): ConditionsConfig | null =>
  s.scenario.bookings?.conditions ?? null

const stateIndex = (c: ConditionsConfig, id: string) => c.states.findIndex((x) => x.id === id)

function drawState(c: ConditionsConfig, month: number, slot: string, rng: Rng): string {
  const p = c.monthly[month - 1]?.[slot] ?? []
  const total = p.reduce((t, x) => t + x, 0)
  let r = rng.next() * total
  for (let i = 0; i < c.states.length; i++) {
    r -= p[i] ?? 0
    if (r < 0) return c.states[i]!.id
  }
  return c.states[0]!.id
}

/** A week's true conditions: each slot a chain of days, spells kept with `persistence`. */
export function drawConditionsWeek(
  c: ConditionsConfig,
  month: number,
  prev: ConditionsWeek | null,
  rng: Rng,
): ConditionsWeek {
  const out: ConditionsWeek = {}
  for (const { id: slot } of c.slots) {
    let last = prev?.[slot]?.at(-1) ?? null
    const days: string[] = []
    for (let d = 0; d < DAYS; d++) {
      const st = last !== null && rng.chance(c.persistence) ? last : drawState(c, month, slot, rng)
      days.push(st)
      last = st
    }
    out[slot] = days
  }
  return out
}

/** The forecast of a week: each slot right with the accuracy, else one state off. */
export function forecastConditions(
  c: ConditionsConfig,
  truth: ConditionsWeek,
  rng: Rng,
): ConditionsWeek {
  const out: ConditionsWeek = {}
  const n = c.states.length
  for (const { id: slot } of c.slots) {
    out[slot] = (truth[slot] ?? []).map((st) => {
      if (rng.chance(c.forecastAccuracy)) return st
      const i = stateIndex(c, st)
      const j = i <= 0 ? 1 : i >= n - 1 ? n - 2 : rng.chance(0.5) ? i - 1 : i + 1
      return c.states[j]!.id
    })
  }
  return out
}

/** The trip spot's days: the spot slot's states at home moved `shift` states up, capped. */
export function spotDays(c: ConditionsConfig, week: ConditionsWeek): string[] {
  const spot = c.spot
  if (!spot) return []
  const n = c.states.length
  return (week[spot.slot] ?? []).map((st) => {
    const i = Math.max(0, Math.min(n - 1, stateIndex(c, st) + spot.shift))
    return c.states[i]!.id
  })
}

/** The slots of the day a product uses: its own, else all of the scenario's. */
export function productSlots(cfg: BookingsConfig, id: FeatureId): string[] {
  const c = cfg.conditions
  if (!c) return []
  return cfg.products[id]?.slots ?? c.slots.map((s) => s.id)
}

/** A product whose capacity follows the conditions: it names `runsIn` and is not whole-week. */
export function followsConditions(cfg: BookingsConfig, id: FeatureId): boolean {
  const p = cfg.products[id]
  return !!cfg.conditions && !!p?.runsIn && !p.wholeWeek
}

/** The slots (days, for a trip) in a week that suit a product, and how many there are. */
export function suitableSlots(
  cfg: BookingsConfig,
  id: FeatureId,
  week: ConditionsWeek,
): { suitable: number; total: number } {
  const c = cfg.conditions
  const p = cfg.products[id]
  if (!c || !p?.runsIn) return { suitable: 0, total: 0 }
  const runs = new Set(p.runsIn)
  if (p.dayTrip) {
    const days = spotDays(c, week)
    return { suitable: days.filter((d) => runs.has(d)).length, total: DAYS }
  }
  const slots = productSlots(cfg, id)
  let suitable = 0
  for (const slot of slots) suitable += (week[slot] ?? []).filter((d) => runs.has(d)).length
  return { suitable, total: DAYS * slots.length }
}

/** Expected shares per scenario's bookings block: they depend on content only. */
const shares = new WeakMap<BookingsConfig, Map<string, number>>()

/** The share of a month's slots that suit a product, from the monthly chances. */
export function expectedShare(cfg: BookingsConfig, id: FeatureId, month: number): number {
  let known = shares.get(cfg)
  if (!known) {
    known = new Map()
    shares.set(cfg, known)
  }
  const key = `${id}|${month}`
  const hit = known.get(key)
  if (hit !== undefined) return hit
  const share = computeShare(cfg, id, month)
  known.set(key, share)
  return share
}

function computeShare(cfg: BookingsConfig, id: FeatureId, month: number): number {
  const c = cfg.conditions
  const p = cfg.products[id]
  if (!c || !p?.runsIn) return 1
  const runs = new Set(p.runsIn)
  const shareIn = (slot: string, shift: number) => {
    const probs = c.monthly[month - 1]?.[slot] ?? []
    const total = probs.reduce((t, x) => t + x, 0)
    if (total <= 0) return 0
    let hit = 0
    probs.forEach((q, i) => {
      const j = Math.max(0, Math.min(c.states.length - 1, i + shift))
      if (runs.has(c.states[j]!.id)) hit += q
    })
    return hit / total
  }
  if (p.dayTrip) return c.spot ? shareIn(c.spot.slot, c.spot.shift) : 0
  const slots = productSlots(cfg, id)
  return slots.reduce((t, s) => t + shareIn(s, 0), 0) / Math.max(1, slots.length)
}

/** A product's capacity in a week of known conditions: its slots that suit it, rounded down. */
export const capacityIn = (cap: number, s: { suitable: number; total: number }) =>
  s.total > 0 ? Math.floor((cap * s.suitable) / s.total) : cap

/** A new abroad state for a run with conditions. */
export function initAbroad(scenario: Scenario, forecast: ConditionsWeek): AbroadState {
  const trips = Object.values(scenario.bookings?.products ?? {}).some((p) => p.dayTrip)
  return {
    forecast,
    lastWeek: null,
    byMonth: {},
    lost: {},
    moved: 0,
    ladder: [],
    ...(trips
      ? {
          trips: {
            min: scenario.bookings?.trips?.start ?? null,
            sinceWeek: 1 - (scenario.bookings?.trips?.policyWeeks ?? 0),
            run: 0,
            wasted: 0,
            guests: 0,
            costCents: 0,
          },
        }
      : {}),
  }
}

/** The year of the run a week falls in, from 0. */
export const runYear = (week: number) => Math.floor((week - 1) / 52)

/** The ladder's year, added to (a fresh copy of the list). */
export function addLadder(
  ladder: LadderYear[],
  week: number,
  add: Partial<LadderYear>,
): LadderYear[] {
  const out = ladder.map((y) => ({ ...y }))
  const i = runYear(week)
  while (out.length <= i) {
    out.push({ students: 0, sameStay: 0, returnedDirect: 0, returnedPlatform: 0 })
  }
  const y = out[i]!
  y.students += add.students ?? 0
  y.sameStay += add.sameStay ?? 0
  y.returnedDirect += add.returnedDirect ?? 0
  y.returnedPlatform += add.returnedPlatform ?? 0
  return out
}

/** Counts a week's slots per state into the month's totals (a fresh copy). */
export function countMonth(
  byMonth: AbroadState['byMonth'],
  month: number,
  week: ConditionsWeek,
): AbroadState['byMonth'] {
  const key = String(month)
  const row = { ...(byMonth[key] ?? {}) }
  for (const days of Object.values(week)) for (const d of days) row[d] = (row[d] ?? 0) + 1
  return { ...byMonth, [key]: row }
}

/** The product of every cost step reached by a week, for one kind of cost. */
export function costFactor(scenario: Scenario, week: number, kind: 'roles' | 'unitCosts'): number {
  let f = 1
  for (const step of scenario.bookings?.costSteps ?? []) {
    if (step[kind] && week >= step.week) f *= step.factor
  }
  return f
}

/** Fixed costs that rise this week (plan 4 section 7): the company's costs, raised. */
export function applyCostSteps(state: GameState): { state: GameState; entries: ReportEntry[] } {
  const steps = (state.scenario.bookings?.costSteps ?? []).filter((x) => x.week === state.week)
  if (steps.length === 0) return { state, entries: [] }
  let fixedCosts = state.company.fixedCosts
  const entries: ReportEntry[] = []
  for (const step of steps) {
    fixedCosts = fixedCosts.map((c) =>
      step.fixedCosts.includes(c.id)
        ? { ...c, monthlyCents: Math.round(c.monthlyCents * step.factor) }
        : c,
    )
    entries.push({ kind: 'costs_rose', factor: step.factor })
  }
  return { state: { ...state, company: { ...state.company, fixedCosts } }, entries }
}

/** The reach factors of the beach spot after the tender: 1 while kept. */
export function spotReach(state: Pick<GameState, 'scenario' | 'bookings'>): {
  walkIn: number
  partnership: number
} {
  const t = state.scenario.bookings?.tender
  const done = state.bookings?.abroad?.tender
  if (!t || !done || done.kept) {
    if (t && done?.bid === 'hotel')
      return { walkIn: t.hotel.walkIn, partnership: t.hotel.partnership }
    return { walkIn: 1, partnership: 1 }
  }
  return { walkIn: t.lost.walkIn, partnership: t.lost.partnership }
}

/** The tender's answer (plan 4 section 6): the fee, the spot, and a hidden chance for "as before". */
export function applyTender(
  state: GameState,
  bid: 'higher' | 'same' | 'hotel',
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const t = state.scenario.bookings?.tender
  const b = state.bookings
  if (!t || !b?.abroad || b.abroad.tender) return { state, entries: [] }
  let kept = true
  let factor = 1
  if (bid === 'higher') factor = t.higherFactor
  else if (bid === 'hotel') factor = t.hotel.factor
  else {
    const rating = b.rating ?? 3
    const contracts = (b.contracts ?? []).filter(
      (c) => c.endWeek === null || c.endWeek >= state.week,
    ).length
    const chance = Math.min(
      t.keep.max,
      t.keep.min +
        (t.keep.max - t.keep.min) * Math.max(0, Math.min(1, (rating - 3) / 2)) +
        t.keep.perContract * contracts,
    )
    kept = rng.chance(chance)
  }
  const fixedCosts = state.company.fixedCosts.map((c) =>
    c.id === t.costId && factor !== 1
      ? { ...c, monthlyCents: Math.round(c.monthlyCents * factor) }
      : c,
  )
  return {
    state: {
      ...state,
      company: { ...state.company, fixedCosts },
      bookings: { ...b, abroad: { ...b.abroad, tender: { bid, kept, week: state.week } } },
    },
    entries: [{ kind: 'tender', bid, kept }],
  }
}

/** Revenue share owed to a hotel whose beach the company moved to (0 elsewhere). */
export function hotelShare(state: Pick<GameState, 'scenario' | 'bookings'>): number {
  const t = state.scenario.bookings?.tender
  return t && state.bookings?.abroad?.tender?.bid === 'hotel' ? t.hotel.revenueShare : 0
}
