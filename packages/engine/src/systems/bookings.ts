import type { OfficeStage } from '@founder-mode/content'
import type { BookingsConfig, Scenario, WeatherState } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  BookingTotal,
  Booking,
  BookingsPlan,
  BookingsState,
  AbroadView,
  BookingsView,
  ConditionsWeek,
  LadderYear,
  FeatureId,
  GameState,
  HiddenBookings,
  Invoice,
  ReportEntry,
  SegmentId,
  WeekPlan,
} from '../types'
import {
  CONTRACT_KINDS,
  applyContracts,
  contractConfig,
  contractWorks,
  contractsValid,
} from './contracts'
import { energyFactor } from './founder'
import { moveOffice } from './office'
import { priceCurve } from './market'
import { openVouchers, trialOpen, trialsUsed, trialsValid, voucherBatchesUsed } from './trials'
import {
  addLadder,
  applyCostSteps,
  capacityIn,
  costFactor,
  countMonth,
  drawConditionsWeek,
  expectedShare,
  followsConditions,
  forecastConditions,
  hotelShare,
  initAbroad,
  runYear,
  spotDays,
  spotReach,
  suitableSlots,
} from './abroad'

// Tourism (step 4, docs/tourism-proposal.md): bookings of capacity that expires. Every function
// here runs only for a scenario with a `bookings` block, so the subscription model never draws a
// random number in this file and plays exactly as before.

const WEATHER: WeatherState[] = ['good', 'mixed', 'bad', 'dangerous']
const WEEKS_PER_YEAR = 52
const TURNED_AWAY_WEEKS = 12

export const bookingsConfig = (s: Pick<GameState, 'scenario'>): BookingsConfig | null =>
  s.scenario.bookings ?? null

/** Week of the year (1 to 52) of a run's week. */

/** The review left by each group a partner sent that found no room (step 5). */
const SENT_LOST_RATING = 2
export function weekOfYear(scenario: Scenario, week: number): number {
  const start = scenario.bookings?.startWeekOfYear ?? 1
  return ((start - 1 + week - 1) % WEEKS_PER_YEAR) + 1
}

/** Month (1 to 12) of a week of the year. */
export const monthOfWeek = (woy: number): number =>
  Math.min(12, Math.floor(((woy - 1) * 12) / WEEKS_PER_YEAR) + 1)

export const monthOf = (scenario: Scenario, week: number) => monthOfWeek(weekOfYear(scenario, week))

/** A season curve at a week of the year: the monthly values, interpolated between month middles. */
export function seasonAt(curve: readonly number[], woy: number): number {
  const pos = ((woy - 0.5) * 12) / WEEKS_PER_YEAR - 0.5
  const i = Math.floor(pos)
  const t = pos - i
  const a = curve[((i % 12) + 12) % 12] ?? 0
  const b = curve[(((i + 1) % 12) + 12) % 12] ?? 0
  return a + (b - a) * t
}

function drawWeather(cfg: BookingsConfig, month: number, rng: Rng): WeatherState {
  const p = cfg.weather!.monthly[month - 1]!
  const total = p.good + p.mixed + p.bad + p.dangerous
  let r = rng.next() * total
  for (const w of WEATHER) {
    r -= p[w]
    if (r < 0) return w
  }
  return 'mixed'
}

/** The forecast for a true weather: right with the scenario's accuracy, else a neighbour. */
function forecastOf(cfg: BookingsConfig, truth: WeatherState, rng: Rng): WeatherState {
  if (rng.chance(cfg.weather!.forecastAccuracy)) return truth
  const i = WEATHER.indexOf(truth)
  const j = i === 0 ? 1 : i === WEATHER.length - 1 ? i - 1 : rng.chance(0.5) ? i - 1 : i + 1
  return WEATHER[j]!
}

/** The hidden and visible start of a bookings run. Draws only for a bookings scenario. */
export function initBookings(
  scenario: Scenario,
  rng: Rng,
): { state: BookingsState; hidden: HiddenBookings } | null {
  const cfg = scenario.bookings
  if (!cfg) return null
  const base: Record<SegmentId, number> = {}
  const season: Record<SegmentId, number[]> = {}
  const prices: BookingsState['prices'] = {}
  const repeatGuests: Record<SegmentId, number> = {}
  for (const seg of scenario.segments) {
    const b = cfg.segments[seg.id]
    if (!b) continue
    base[seg.id] = rng.range(b.base.min, b.base.max)
    season[seg.id] = b.season.map((m) => m * rng.range(1 - cfg.seasonNoise, 1 + cfg.seasonNoise))
    prices[seg.id] = { ...b.price }
    repeatGuests[seg.id] = 0
  }
  // Plan 4: day conditions instead of the weather; the weather fields stay at a fixed value.
  const c = cfg.conditions
  if (c) {
    const truth = drawConditionsWeek(c, monthOf(scenario, 1), null, rng)
    const forecast = forecastConditions(c, truth, rng)
    return {
      hidden: { base, season, nextWeather: 'good', nextConditions: truth, returns: [] },
      state: {
        bookings: [],
        prices,
        policy: 'flexible',
        policySinceWeek: 1 - cfg.policyWeeks,
        platformListed: false,
        partnerships: [],
        repeatGuests,
        rating: null,
        reviews: 0,
        weather: null,
        forecast: 'good',
        turnedAway: [],
        abroad: initAbroad(scenario, forecast),
      },
    }
  }
  const nextWeather = drawWeather(cfg, monthOf(scenario, 1), rng)
  return {
    hidden: { base, season, nextWeather },
    state: {
      bookings: [],
      prices,
      policy: 'flexible',
      // Free to choose from the first week.
      policySinceWeek: 1 - cfg.policyWeeks,
      platformListed: false,
      partnerships: [],
      repeatGuests,
      rating: null,
      reviews: 0,
      weather: null,
      forecast: forecastOf(cfg, nextWeather, rng),
      turnedAway: [],
    },
  }
}

const NO_PLAN: BookingsPlan = {
  shifts: {},
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
}

export const bookingsPlanOf = (plan: WeekPlan): BookingsPlan => plan.bookings ?? NO_PLAN

export const cloneBookingsPlan = (p: BookingsPlan): BookingsPlan => ({
  shifts: { ...p.shifts },
  founderShifts: { ...p.founderShifts },
  prices: Object.fromEntries(Object.entries(p.prices).map(([k, v]) => [k, { ...v }])),
  policy: p.policy,
  platform: p.platform,
  partnerships: [...p.partnerships],
  outreach: { ...p.outreach },
  ...(p.trials ? { trials: p.trials.map((t) => ({ ...t })) } : {}),
  ...(p.vouchers ? { vouchers: { ...p.vouchers } } : {}),
  ...(p.hire ? { hire: p.hire.map((h) => ({ ...h })) } : {}),
  ...(p.endContracts ? { endContracts: [...p.endContracts] } : {}),
  ...(p.prep ? { prep: { ...p.prep } } : {}),
  ...(p.renovate !== undefined ? { renovate: p.renovate } : {}),
  ...(p.minStay !== undefined ? { minStay: p.minStay } : {}),
  ...(p.trips ? { trips: { ...p.trips } } : {}),
})

/**
 * Plan 3: the office stage whose tourism effects apply this week. A stage that needs someone
 * stationed there (`needsContract`) closes in a week without such a contract: the stage before it
 * applies instead.
 */
export function stageInEffect(
  state: Pick<GameState, 'scenario' | 'company' | 'bookings' | 'week'>,
): OfficeStage {
  const stages = state.scenario.officeStages
  let i = Math.max(
    0,
    stages.findIndex((o) => o.id === state.company.officeStage),
  )
  while (i > 0) {
    const stage = stages[i]!
    const role = stage.needsContract
    if (
      !role ||
      (state.bookings?.contracts ?? []).some(
        (c) => c.roleId === role && contractWorks(state, c, state.week),
      )
    ) {
      return stage
    }
    i--
  }
  return stages[0]!
}

/**
 * Founder hours guests take this week (plan 2 step 3): per unit served last week, capped. Known
 * before the week is planned, like hours already given to messages. A reception (plan 3) takes
 * some of them.
 */
export function hostingHours(
  state: Pick<GameState, 'scenario' | 'bookings' | 'week' | 'company'>,
): number {
  const h = state.scenario.bookings?.hosting
  if (!h || !state.bookings) return 0
  const units = state.bookings.bookings
    .filter((x) => x.week === state.week - 1 && x.status === 'served')
    .reduce((t, x) => t + x.units, 0)
  const less = stageInEffect(state).hostingHoursLess ?? 0
  return Math.max(0, Math.min(h.maxHours, Math.round(units * h.hoursPerUnit)) - less)
}

/** Founder hours the bookings part of a plan takes: own shifts, outreach, new partnerships. */
export function bookingsHours(state: Pick<GameState, 'scenario'>, plan: WeekPlan): number {
  const cfg = bookingsConfig(state)
  const p = plan.bookings
  if (!cfg || !p) return 0
  let hours = p.partnerships.length * cfg.partnershipHours
  for (const [role, n] of Object.entries(p.founderShifts)) {
    hours += n * (cfg.roles[role]?.founderHours ?? 0)
  }
  for (const h of Object.values(p.outreach)) hours += h
  return hours
}

const isShipped = (state: GameState, id: FeatureId) =>
  state.product.features.some((f) => f.id === id && f.shippedWeek !== null)

/**
 * A must have is met: shipped, and for the renovation feature, enough rooms renovated (plan 2
 * step 1d).
 */
export function mustHaveMet(state: GameState, id: FeatureId): boolean {
  if (!isShipped(state, id)) return false
  const r = state.scenario.bookings?.renovation
  if (r && r.feature === id) return (state.bookings?.renovated ?? 0) >= r.mustHaveRooms
  return true
}

/** Rooms under works in a week (plan 2 step 1d). */
export function roomsUnderWorks(state: Pick<GameState, 'bookings'>, week: number): number {
  return (state.bookings?.works ?? []).filter((x) => x.startWeek <= week && week <= x.endWeek)
    .length
}

/** A capacity pool's units in a week: its capacity, less the rooms under works. */
export function capacityAt(state: GameState, pool: FeatureId, week: number): number {
  const cfg = bookingsConfig(state)!
  const r = cfg.renovation
  // Plan 3: an office stage adds seats, rooms or gear.
  const base = (cfg.products[pool]?.capacity ?? 0) + (stageInEffect(state).capacity?.[pool] ?? 0)
  if (!r || r.product !== pool) return base
  return Math.max(0, base - r.unitsPerRoom * roomsUnderWorks(state, week))
}

/** A product can be sold in a week: shipped and in season. */
function sells(state: GameState, id: FeatureId, week: number): boolean {
  const p = state.scenario.bookings?.products[id]
  if (!p || !isShipped(state, id)) return false
  if (p.requires !== undefined && !isShipped(state, p.requires)) return false
  // Plan 4: a day trip sells while the trip policy runs trips and its asset is there.
  if (p.dayTrip) {
    if ((state.bookings?.abroad?.trips?.min ?? null) === null) return false
    if (p.dayTrip.asset && !isShipped(state, p.dayTrip.asset)) return false
  }
  return p.months.length === 0 || p.months.includes(monthOf(state.scenario, week))
}

/** Units booked for a product in a week (still booked). */
export function bookedUnits(state: GameState, id: FeatureId, week: number): number {
  return (state.bookings?.bookings ?? [])
    .filter((b) => b.productId === id && b.week === week && b.status === 'booked')
    .reduce((t, b) => t + b.units, 0)
}

/** The price per unit a segment pays for a week, by its season. */
export function priceFor(state: GameState, segmentId: SegmentId, week: number): number {
  const cfg = bookingsConfig(state)!
  const p = state.bookings!.prices[segmentId]!
  return cfg.peakMonths.includes(monthOf(state.scenario, week)) ? p.peak : p.off
}

/** Whether a plan's bookings part can be carried out. */
export function bookingsValid(state: GameState, plan: WeekPlan): boolean {
  const p = plan.bookings
  const cfg = bookingsConfig(state)
  // Trials and vouchers replace landing tests and pre-sales where a scenario has them (plan 2).
  if (cfg?.trials || cfg?.vouchers) {
    if (Object.values(plan.landing).some((x) => x > 0)) return false
    if (Object.values(plan.presales).some((x) => x > 0)) return false
  }
  if (!p) return true
  if (!cfg || !state.bookings) return false
  const month = monthOf(state.scenario, state.week)
  const count = (n: number) => Number.isInteger(n) && n >= 0
  for (const [role, n] of Object.entries(p.shifts)) {
    const r = cfg.roles[role]
    if (!r || !count(n) || n > (r.available[month - 1] ?? 0)) return false
  }
  for (const [role, n] of Object.entries(p.founderShifts)) {
    if (!cfg.roles[role]?.founderHours || !count(n)) return false
  }
  for (const [seg, price] of Object.entries(p.prices)) {
    if (!state.bookings.prices[seg] || !count(price.peak) || !count(price.off)) return false
    if (price.peak === 0 || price.off === 0) return false
  }
  if (p.policy !== null && p.policy !== state.bookings.policy) {
    if (state.week - state.bookings.policySinceWeek < cfg.policyWeeks) return false
  }
  for (const seg of p.partnerships) {
    if (!cfg.segments[seg] || state.bookings.partnerships.includes(seg)) return false
  }
  if (new Set(p.partnerships).size !== p.partnerships.length) return false
  for (const [seg, h] of Object.entries(p.outreach)) {
    if (!cfg.segments[seg] || !count(h)) return false
  }
  for (const [id, n] of Object.entries(p.prep ?? {})) {
    if (!cfg.products[id]?.prepared || !count(n)) return false
  }
  if (p.renovate !== undefined && p.renovate !== 0) {
    const r = cfg.renovation
    if (!r || !count(p.renovate) || !isShipped(state, r.feature)) return false
    const busy = roomsUnderWorks(state, state.week)
    const done = state.bookings.renovated ?? 0
    const planned = (state.bookings.works ?? []).filter((x) => x.endWeek >= state.week).length
    if (busy + p.renovate > r.atOnce || done + planned + p.renovate > r.rooms) return false
  }
  if (p.minStay !== undefined && p.minStay !== null && !cfg.minStay) return false
  // Plan 4: a trip policy from one to the largest group a trip takes, or never.
  if (p.trips) {
    const t = state.bookings.abroad?.trips
    const most = Math.max(0, ...Object.values(cfg.products).map((x) => x.dayTrip?.perTrip ?? 0))
    const min = p.trips.min
    if (!t || !cfg.trips) return false
    if (min !== null && (!Number.isInteger(min) || min < 1 || min > most)) return false
    if (min !== t.min && state.week - t.sinceWeek < cfg.trips.policyWeeks) return false
  }
  return trialsValid(state, plan) && contractsValid(state, plan)
}

/** How well a segment is reached this week, from the channels in use (section 5). */
function reachOf(
  state: GameState,
  segmentId: SegmentId,
  plan: BookingsPlan,
): { total: number; platform: number } {
  const cfg = bookingsConfig(state)!
  const b = state.bookings!
  const r = cfg.segments[segmentId]!.response
  const platform = b.platformListed ? r.platform : 0
  const websiteOn = isShipped(state, cfg.website.product)
  const repeats = b.repeatGuests[segmentId] ?? 0
  const website = websiteOn
    ? r.website * (0.3 + 0.7 * Math.min(1, repeats / cfg.website.repeatsFull))
    : 0
  // Plan 4: a spot lost in the tender, or a hotel's beach, reaches fewer people.
  const spot = cfg.tender ? spotReach(state) : { walkIn: 1, partnership: 1 }
  const partnership = b.partnerships.includes(segmentId) ? r.partnership * spot.partnership : 0
  // Calls and visits work better for a founder who sells better (step 5).
  const outreach =
    ((1 + state.founder.skills.selling) *
      r.outreach *
      Math.min(plan.outreach[segmentId] ?? 0, cfg.outreachHoursFull)) /
    cfg.outreachHoursFull
  // An office stage with walk-ins from this segment (a base in town) adds its rate to the reach,
  // beyond the cap.
  const office = state.modifiers.reduce(
    (t, m) => t + (m.walkIns?.segmentId === segmentId ? m.walkIns.leadsPerWeek : 0),
    0,
  )
  // Word of mouth: guests who booked directly tell others, website or not.
  const mouth = 0.2 * Math.min(1, repeats / cfg.website.repeatsFull)
  // The cap limits the channels; people walking past a shop window come on top of it.
  const total =
    Math.min(
      cfg.reachCap,
      platform + website + partnership + outreach + r.walkIn * spot.walkIn + mouth,
    ) + office
  return { total, platform: Math.min(platform, total) }
}

/** Demand's factor from the reviews (section 5): 1 without reviews. */
function reviewFactor(state: GameState, segmentId: SegmentId): number {
  const cfg = bookingsConfig(state)!
  const b = state.bookings!
  if (b.rating === null) return 1
  const weight = cfg.segments[segmentId]!.reviewWeight
  return Math.max(
    0.2,
    1 + (weight * (b.rating - 3) * Math.min(1, b.reviews / cfg.reviews.reviewsFull)) / 2,
  )
}

/** Fit of the product to a segment: 0 until something serving it ships (section 5). */
function fitOf(state: GameState, segmentId: SegmentId): number {
  const cfg = bookingsConfig(state)!
  const serving = Object.entries(cfg.products).some(
    ([id, p]) => p.serves.includes(segmentId) && isShipped(state, id),
  )
  if (!serving) return 0
  const must = state.hidden.segments[segmentId]?.mustHave ?? []
  const covered = must.length ? must.filter((f) => mustHaveMet(state, f)).length / must.length : 1
  const quality = state.product.quality / 100
  return (cfg.fitBase + (1 - cfg.fitBase) * covered) * quality
}

export type BookingsOutcome = {
  state: GameState
  entries: ReportEntry[]
  /** Paid on the day by guests, net of platform commission. */
  revenueCents: number
  /** Shifts, unit costs and products' one-off costs this week: company costs. */
  costsCents: number
  /** Plan 2: what the vouchers redeemed this week were sold for (earned now, paid before). */
  voucherRedeemedCents: number
}

/**
 * Bookings step (section 5 to 8), after the product step and in place of sales:
 * 1. the plan's prices, policy, platform listing and partnerships take effect,
 * 2. this week's weather happens; next week's is drawn and forecast,
 * 3. products shipped this week cost their one-off price and add their monthly cost,
 * 4. new requests per segment become bookings where a week has room, or are turned away,
 * 5. this week's bookings: guest cancellations, weather closures, then the roster serves as many
 *    as its shifts cover; the rest the company cancels,
 * 6. shifts are paid; invoiced segments get invoices for what was served,
 * 7. reviews from the week's service.
 */
export function applyBookings(input: GameState, plan: WeekPlan, rng: Rng): BookingsOutcome {
  const cfg = bookingsConfig(input)
  const out: BookingsOutcome = {
    state: input,
    entries: [],
    revenueCents: 0,
    costsCents: 0,
    voucherRedeemedCents: 0,
  }
  if (!cfg || !input.bookings || !input.hidden.bookings) return out
  const p = bookingsPlanOf(plan)
  const week = input.week
  let state = input
  let b: BookingsState = { ...input.bookings }

  // 1. Settings.
  b.prices = { ...b.prices }
  for (const [seg, price] of Object.entries(p.prices)) b.prices[seg] = { ...price }
  if (p.policy !== null && p.policy !== b.policy)
    b = { ...b, policy: p.policy, policySinceWeek: week }
  if (p.platform !== null) b.platformListed = p.platform
  if (p.partnerships.length) b.partnerships = [...b.partnerships, ...p.partnerships]
  if (p.prep && Object.keys(p.prep).length) b.prep = { ...b.prep, ...p.prep }
  if (p.minStay !== undefined && p.minStay !== null) b.minStay = p.minStay
  // Plan 4: a new trip policy.
  if (p.trips && b.abroad?.trips && p.trips.min !== b.abroad.trips.min) {
    b.abroad = { ...b.abroad, trips: { ...b.abroad.trips, min: p.trips.min, sinceWeek: week } }
  }
  // Rooms whose works are over are renovated; new works close their rooms from this week.
  const reno = cfg.renovation
  if (reno && b.works?.length) {
    const finished = b.works.filter((x) => x.endWeek < week).length
    if (finished > 0) {
      b.works = b.works.filter((x) => x.endWeek >= week)
      b.renovated = (b.renovated ?? 0) + finished
      out.entries.push({ kind: 'works_done', rooms: finished, renovated: b.renovated })
    }
  }
  // Rooms a loan bought are paid for already (plan 2 step 2).
  let roomsPaid = 0
  if (reno && (p.renovate ?? 0) > 0) {
    const n = p.renovate!
    b.works = [
      ...(b.works ?? []),
      ...Array.from({ length: n }, () => ({ startWeek: week, endWeek: week + reno.weeks - 1 })),
    ]
    roomsPaid = Math.min(n, input.loan?.roomsBought ?? 0)
    out.costsCents += (n - roomsPaid) * reno.centsPerRoom
    out.entries.push({
      kind: 'works_started',
      rooms: n,
      amountCents: (n - roomsPaid) * reno.centsPerRoom,
    })
  }

  // 2. Weather, or (plan 4) this week's day conditions and next week's forecast.
  const weather = input.hidden.bookings.nextWeather
  let nextWeather = weather
  const cond = cfg.conditions
  let actual: ConditionsWeek = {}
  let nextConditions: ConditionsWeek | undefined
  // The forecast the player planned this week with (trips are decided on it).
  const shown = b.abroad?.forecast ?? {}
  if (cond && b.abroad) {
    actual = input.hidden.bookings.nextConditions ?? {}
    nextConditions = drawConditionsWeek(cond, monthOf(state.scenario, week + 1), actual, rng)
    b.abroad = {
      ...b.abroad,
      lastWeek: actual,
      forecast: forecastConditions(cond, nextConditions, rng),
      byMonth: countMonth(b.abroad.byMonth, monthOf(state.scenario, week), actual),
    }
    out.entries.push({ kind: 'conditions', days: actual })
  } else {
    nextWeather = drawWeather(cfg, monthOf(state.scenario, week + 1), rng)
    b.weather = weather
    b.forecast = forecastOf(cfg, nextWeather, rng)
    out.entries.push({ kind: 'weather', weather })
  }
  if (cfg.costSteps) {
    const steps = applyCostSteps(state)
    state = steps.state
    out.entries.push(...steps.entries)
  }

  // 3. Products shipped this week. One a loan bought is paid for already (plan 2 step 2).
  let fixedCosts = state.company.fixedCosts
  let loan = state.loan
  if (loan && roomsPaid > 0) loan = { ...loan, roomsBought: (loan.roomsBought ?? 0) - roomsPaid }
  const stages: string[] = []
  for (const f of state.product.features) {
    const prod = cfg.products[f.id]
    if (!prod || f.shippedWeek !== week) continue
    if (loan?.bought?.includes(f.id)) {
      loan = { ...loan, bought: loan.bought.filter((x) => x !== f.id) }
    } else out.costsCents += prod.oneOffCents
    if (prod.stage) stages.push(prod.stage)
    if (prod.monthlyCents > 0 && !fixedCosts.some((c) => c.id === `product_${f.id}`)) {
      const name = state.scenario.features.find((x) => x.id === f.id)?.name ?? f.id
      fixedCosts = [...fixedCosts, { id: `product_${f.id}`, name, monthlyCents: prod.monthlyCents }]
    }
  }
  state = {
    ...state,
    company: { ...state.company, fixedCosts },
    ...(loan !== state.loan ? { loan } : {}),
    bookings: b,
    hidden: {
      ...state.hidden,
      bookings: {
        ...input.hidden.bookings,
        nextWeather,
        ...(nextConditions ? { nextConditions } : {}),
      },
    },
  }
  for (const stage of stages) state = moveOffice(state, stage)

  // 4. New requests.
  const bookings = [...b.bookings]
  const repeatGuests = { ...b.repeatGuests }
  const turnedAway = b.turnedAway.filter((t) => t.week > week - TURNED_AWAY_WEEKS)
  const woy = weekOfYear(state.scenario, week)
  const hiddenB = state.hidden.bookings!
  const roleFactor = (seg: SegmentId) => {
    const role = state.hidden.segments[seg]?.roleId as keyof BookingsConfig['roleFactor']
    return cfg.roleFactor[role] ?? 0
  }
  // Units still booked per capacity pool and week, counted once and kept up to date as requests
  // book. A product's pool is its own unless it uses another's capacity (step 7).
  const heldKey = (id: FeatureId, w: number) => `${poolOf(cfg, id)}|${w}`
  const held = new Map<string, number>()
  for (const x of bookings) {
    if (x.status === 'booked' && x.week >= week) {
      held.set(
        heldKey(x.productId, x.week),
        (held.get(heldKey(x.productId, x.week)) ?? 0) + x.units,
      )
    }
  }
  // Plan 4: a product that follows the conditions sells this week's suitable slots, and for
  // later weeks the share of slots its month usually suits.
  const sellable = (id: FeatureId, w: number) => {
    const pool = poolOf(cfg, id)
    const base = capacityAt(state, pool, w)
    if (!followsConditions(cfg, pool)) return base
    if (w === week) return capacityIn(base, suitableSlots(cfg, pool, actual))
    return Math.floor(base * expectedShare(cfg, pool, monthOf(state.scenario, w)))
  }
  const room = (id: FeatureId, w: number) =>
    (cond ? sellable(id, w) : capacityAt(state, poolOf(cfg, id), w)) -
    (held.get(heldKey(id, w)) ?? 0)
  // Units a segment holds per pool and week, for segments that can use only a share (step 7).
  const segKey = (seg: SegmentId, id: FeatureId, w: number) => `${seg}|${poolOf(cfg, id)}|${w}`
  const heldBySeg = new Map<string, number>()
  if (Object.values(cfg.segments).some((x) => x.capacityShare)) {
    for (const x of bookings) {
      if (x.status === 'booked' && x.week >= week) {
        const k = segKey(x.segmentId, x.productId, x.week)
        heldBySeg.set(k, (heldBySeg.get(k) ?? 0) + x.units)
      }
    }
  }
  const roomFor = (seg: SegmentId, id: FeatureId, w: number) => {
    const share = cfg.segments[seg]?.capacityShare
    if (!share) return room(id, w)
    const peak = cfg.peakMonths.includes(monthOf(state.scenario, w))
    const cap = capacityAt(state, poolOf(cfg, id), w) * (peak ? share.peak : share.off)
    return Math.min(room(id, w), Math.floor(cap) - (heldBySeg.get(segKey(seg, id, w)) ?? 0))
  }
  let sentLost = 0
  for (const seg of state.scenario.segments) {
    const s = cfg.segments[seg.id]
    if (!s) continue
    const reach = reachOf(state, seg.id, p)
    const wtp = state.hidden.segments[seg.id]?.wtpCents ?? 1
    const price = b.prices[seg.id]?.peak ?? 1
    const weatherF = s.weatherSensitive && cfg.weather ? cfg.weather.demand[weather] : 1
    const units =
      (hiddenB.base[seg.id] ?? 0) *
      seasonAt(hiddenB.season[seg.id] ?? [], woy) *
      reach.total *
      fitOf(state, seg.id) *
      priceCurve(state.scenario, price / wtp) *
      reviewFactor(state, seg.id) *
      weatherF *
      roleFactor(seg.id) *
      (stageInEffect(state).segmentFactors?.[seg.id] ?? 1)
    const meanSize = (s.size.min + s.size.max) / 2
    // Guests sent by an inbox answer ask like anyone else, in groups of the usual size.
    const sent = b.eventGuests?.[seg.id] ?? 0
    const sentRequests = sent > 0 ? Math.max(1, Math.round(sent / meanSize)) : 0
    const ownRequests = randomRound(units / meanSize, rng)
    const requests = ownRequests + sentRequests
    let made = 0
    let madeUnits = 0
    let lost = 0
    for (let i = 0; i < requests; i++) {
      let size = rng.int(s.size.min, s.size.max)
      const lead = rng.int(s.leadWeeks.min, s.leadWeeks.max)
      const target = week + lead
      const platform = reach.total > 0 && rng.chance(reach.platform / reach.total)
      if (target > state.scenario.maxWeeks) continue
      // Guests a partner sent have agreed to your terms already.
      if (i < ownRequests && b.policy === 'strict' && !rng.chance(s.strictConversion)) continue
      // A minimum stay (plan 2 step 1d): fewer book, those who do stay longer.
      const ms = cfg.minStay
      if (
        ms &&
        b.minStay &&
        ms.segments.includes(seg.id) &&
        ms.months.includes(monthOf(state.scenario, target))
      ) {
        if (i < ownRequests && !rng.chance(ms.conversion)) continue
        size += ms.extraUnits
      }
      const options = Object.entries(cfg.products)
        .filter(
          ([id, prod]) =>
            prod.serves.includes(seg.id) &&
            sells(state, id, target) &&
            // Plan 4: a product for a level only sells to guests who hold it.
            (!prod.needsLevel || (s.levels ?? []).includes(prod.needsLevel)),
        )
        .map(([id]) => ({ id, free: roomFor(seg.id, id, target) }))
        .filter((o) => o.free >= size)
        .sort((x, y) => y.free - x.free)
      const pick = options[0]
      // A deposit on booking, where the segment pays one (step 7).
      const deposit = pick
        ? Math.round(size * priceFor(state, seg.id, target) * (s.depositShare ?? 0))
        : 0
      if (!pick) {
        lost += size
        // Guests a partner sent and you could not take complain about it.
        if (i >= ownRequests) sentLost++
        continue
      }
      bookings.push({
        id: `booking_${bookings.length + 1}`,
        segmentId: seg.id,
        productId: pick.id,
        week: target,
        units: size,
        priceCents: priceFor(state, seg.id, target),
        channel: platform ? 'platform' : 'direct',
        bookedWeek: week,
        status: 'booked',
        ...(deposit > 0 ? { depositCents: deposit } : {}),
      })
      out.revenueCents += deposit
      held.set(heldKey(pick.id, target), (held.get(heldKey(pick.id, target)) ?? 0) + size)
      if (s.capacityShare) {
        const k = segKey(seg.id, pick.id, target)
        heldBySeg.set(k, (heldBySeg.get(k) ?? 0) + size)
      }
      if (!platform) repeatGuests[seg.id] = (repeatGuests[seg.id] ?? 0) + size
      made++
      madeUnits += size
    }
    if (made > 0)
      out.entries.push({
        kind: 'bookings_new',
        segmentId: seg.id,
        bookings: made,
        units: madeUnits,
      })
    if (lost > 0) {
      turnedAway.push({ week, segmentId: seg.id, units: lost })
      out.entries.push({ kind: 'turned_away', segmentId: seg.id, units: lost })
    }
  }

  // Plan 4: graduates coming back a year later ask for their next step like anyone else.
  let returns = hiddenB.returns
  if (returns?.some((r) => r.askWeek <= week)) {
    let units = 0
    let direct = 0
    for (const r of returns.filter((x) => x.askWeek <= week)) {
      const pick = r.products
        .filter((id) => sells(state, id, r.targetWeek))
        .map((id) => ({ id, free: roomFor(r.segmentId, id, r.targetWeek) }))
        .filter((o) => o.free >= r.units)
        .sort((x, y) => y.free - x.free)[0]
      if (!pick) {
        turnedAway.push({ week, segmentId: r.segmentId, units: r.units })
        continue
      }
      bookings.push({
        id: `booking_${bookings.length + 1}`,
        segmentId: r.segmentId,
        productId: pick.id,
        week: r.targetWeek,
        units: r.units,
        priceCents: priceFor(state, r.segmentId, r.targetWeek),
        channel: r.channel,
        bookedWeek: week,
        status: 'booked',
      })
      held.set(
        heldKey(pick.id, r.targetWeek),
        (held.get(heldKey(pick.id, r.targetWeek)) ?? 0) + r.units,
      )
      if (r.channel === 'direct') {
        repeatGuests[r.segmentId] = (repeatGuests[r.segmentId] ?? 0) + r.units
        direct += r.units
      }
      units += r.units
    }
    returns = returns.filter((x) => x.askWeek > week)
    if (units > 0 && b.abroad) {
      b.abroad = {
        ...b.abroad,
        ladder: addLadder(b.abroad.ladder, week, {
          returnedDirect: direct,
          returnedPlatform: units - direct,
        }),
      }
      out.entries.push({ kind: 'graduates_returned', units, direct })
    }
  }

  // Vouchers whose guests ask for a date now book like anyone else; with no room they try again
  // next week (plan 2 step 1a).
  const voucherWeeks = { ...(hiddenB.voucherWeeks ?? {}) }
  const vouchers = (b.vouchers ?? []).map((v) => ({ ...v }))
  const voucherBooked = new Set(
    bookings.filter((x) => x.voucherId && x.status === 'booked').map((x) => x.voucherId!),
  )
  for (const v of vouchers) {
    const when = voucherWeeks[v.id]
    if (v.redeemedWeek !== null || when == null || when > week || voucherBooked.has(v.id)) continue
    const s = cfg.segments[v.segmentId]!
    const target = week + rng.int(s.leadWeeks.min, s.leadWeeks.max)
    if (target > state.scenario.maxWeeks) {
      voucherWeeks[v.id] = null
      continue
    }
    const pick = Object.entries(cfg.products)
      .filter(([id, prod]) => prod.serves.includes(v.segmentId) && sells(state, id, target))
      .map(([id]) => ({ id, free: roomFor(v.segmentId, id, target) }))
      .filter((o) => o.free >= v.units)
      .sort((x, y) => y.free - x.free)[0]
    if (!pick) {
      voucherWeeks[v.id] = week + 1
      continue
    }
    bookings.push({
      id: `booking_${bookings.length + 1}`,
      segmentId: v.segmentId,
      productId: pick.id,
      week: target,
      units: v.units,
      priceCents: Math.round(v.valueCents / v.units),
      channel: 'direct',
      bookedWeek: week,
      status: 'booked',
      voucherId: v.id,
    })
    held.set(heldKey(pick.id, target), (held.get(heldKey(pick.id, target)) ?? 0) + v.units)
    if (s.capacityShare) {
      const k = segKey(v.segmentId, pick.id, target)
      heldBySeg.set(k, (heldBySeg.get(k) ?? 0) + v.units)
    }
  }

  // 5. This week's bookings.
  const alternativeShipped = (id: FeatureId) => {
    const alt = cfg.products[id]?.alternative
    // Plan 3: a stage with changing rooms is the bad weather plan itself.
    if (stageInEffect(state).weatherPlanFor?.includes(id)) return true
    return alt !== undefined && isShipped(state, alt)
  }
  let cancelledUnits = 0
  let keptUnits = 0
  let weatherClosed = 0
  // This week's open bookings change in place, as since step 4 (copying them made the restaurant
  // 40% slower; plan 4 step 1).
  let due = bookings.filter((x) => x.week === week && x.status === 'booked')
  for (const x of due) {
    const s = cfg.segments[x.segmentId]!
    const prod = cfg.products[x.productId]!
    if (weather === 'dangerous' && prod.weatherClosed && !alternativeShipped(x.productId)) {
      x.status = 'company_cancelled'
      weatherClosed += x.units
      continue
    }
    const factor = s.weatherSensitive && cfg.weather ? cfg.weather.cancel[weather] : 1
    if (rng.chance(Math.min(1, s.cancel * factor))) {
      if (b.policy === 'strict') {
        x.status = 'cancelled_paid'
        keptUnits += x.units
      } else {
        x.status = 'cancelled'
        cancelledUnits += x.units
      }
    }
  }
  // Plan 4: day conditions. A product sells only its suitable slots: guests beyond them move to
  // the alternative, under a strict policy to next week, or are refunded.
  let conditionsCancelled = 0
  if (cond && b.abroad) {
    const lost = { ...b.abroad.lost }
    let moved = 0
    const isOpen = (x: Booking) => x.status === 'booked'
    const left = new Map<FeatureId, number>()
    const leftIn = (pool: FeatureId) => {
      if (!left.has(pool)) {
        const base = capacityAt(state, pool, week)
        left.set(
          pool,
          followsConditions(cfg, pool) ? capacityIn(base, suitableSlots(cfg, pool, actual)) : base,
        )
      }
      return left.get(pool)!
    }
    const pools = [...new Set(due.filter(isOpen).map((x) => poolOf(cfg, x.productId)))].filter(
      (pool) => followsConditions(cfg, pool) && !cfg.products[pool]?.dayTrip,
    )
    for (const pool of pools) {
      const mine = due
        .filter((x) => isOpen(x) && poolOf(cfg, x.productId) === pool)
        .sort((a, z) => a.bookedWeek - z.bookedWeek)
      const sl = suitableSlots(cfg, pool, actual)
      let kept = 0
      for (const x of mine) {
        const free = leftIn(pool)
        if (x.units <= free) {
          left.set(pool, free - x.units)
          kept += x.units
          continue
        }
        const alt = cfg.products[x.productId]?.alternative
        const altPool = alt ? poolOf(cfg, alt) : null
        if (alt && altPool && sells(state, alt, week) && leftIn(altPool) >= x.units) {
          left.set(altPool, leftIn(altPool) - x.units)
          x.productId = alt
          moved += x.units
          out.entries.push({
            kind: 'conditions_moved',
            productId: pool,
            units: x.units,
            to: 'alternative',
          })
          continue
        }
        if (
          b.policy === 'strict' &&
          week + 1 <= state.scenario.maxWeeks &&
          room(x.productId, week + 1) >= x.units
        ) {
          held.set(
            heldKey(x.productId, week + 1),
            (held.get(heldKey(x.productId, week + 1)) ?? 0) + x.units,
          )
          x.week = week + 1
          moved += x.units
          out.entries.push({
            kind: 'conditions_moved',
            productId: pool,
            units: x.units,
            to: 'next_week',
          })
          continue
        }
        x.status = 'company_cancelled'
        conditionsCancelled += x.units
        lost[pool] = (lost[pool] ?? 0) + x.units
        out.entries.push({ kind: 'conditions_cancelled', productId: pool, units: x.units })
      }
      // Guests kept whose own slot did not suit moved to one that did, in the same week.
      const slotMoved = sl.total > 0 ? Math.round((kept * (sl.total - sl.suitable)) / sl.total) : 0
      if (slotMoved > 0) {
        moved += slotMoved
        out.entries.push({
          kind: 'conditions_moved',
          productId: pool,
          units: slotMoved,
          to: 'slot',
        })
      }
    }
    b = { ...b, abroad: { ...b.abroad, lost, moved: b.abroad.moved + moved } }
    // Guests moved to next week are no longer this week's.
    due = due.filter((x) => x.week === week)
  }
  state = { ...state, bookings: b }

  // The roster: shifts go to products in order of what is booked, each role to what it staffs.
  // Contract staff (plan 2 step 1b) add their shifts to their role's.
  const contracts = applyContracts(state, plan)
  state = contracts.state
  b = state.bookings!
  out.entries.push(...contracts.entries)
  const pool: Record<string, number> = {}
  for (const role of Object.keys(cfg.roles)) {
    pool[role] =
      (p.shifts[role] ?? 0) + (p.founderShifts[role] ?? 0) + (contracts.shifts[role] ?? 0)
  }
  const allShifts = Object.values(pool).reduce((t, n) => t + n, 0)
  const booked = new Map<FeatureId, number>()
  for (const x of due) {
    if (x.status === 'booked') booked.set(x.productId, (booked.get(x.productId) ?? 0) + x.units)
  }
  // Kitchen and floor apart (plan 2 step 1c): floor roles add no covers, only service.
  const kindOf = (role: string) => cfg.roles[role]?.kind ?? 'serve'
  const hasFloor = Object.values(cfg.roles).some((r) => r.kind === 'floor')
  // A product needs floor staff when some floor role serves it (catering needs none).
  const needsFloor = (id: FeatureId) =>
    Object.values(cfg.roles).some((r) => r.kind === 'floor' && (r.units[id] ?? 0) > 0)
  const staffed = new Map<FeatureId, number>()
  const kitchenCovers = new Map<FeatureId, number>()
  const floorUnits = new Map<FeatureId, number>()
  const why = new Map<FeatureId, 'staff' | 'sold_out' | 'works' | 'conditions'>()
  // Plan 3: a bigger kitchen sends out more per shift.
  const staffFactor = (role: string) => stageInEffect(state).staffFactors?.[role] ?? 1
  // Plan 4: day trips go first. Decided on the forecast: a trip a forecast-suitable day, for as
  // many groups as are booked, each staff shift a whole day. A wrong forecast wastes the trip.
  let tripCosts = 0
  if (cond && b.abroad?.trips) {
    let trips = { ...b.abroad.trips }
    const lost = { ...b.abroad.lost }
    const forecastSpot = spotDays(cond, shown)
    const actualSpot = spotDays(cond, actual)
    for (const [id, units] of [...booked.entries()]) {
      const prod = cfg.products[id]
      const trip = prod?.dayTrip
      if (!prod || !trip) continue
      booked.delete(id)
      const min = trips.min
      if (min === null || units < min) {
        staffed.set(id, 0)
        why.set(id, 'conditions')
        out.entries.push({ kind: 'trips_cancelled', productId: id, units })
        continue
      }
      const runs = new Set(prod.runsIn ?? [])
      const groups = Math.ceil(units / trip.perTrip)
      const days = forecastSpot.map((d, i) => (runs.has(d) ? i : -1)).filter((i) => i >= 0)
      let run = 0
      let good = 0
      for (const day of days) {
        if (run >= groups * trip.days) break
        const role = Object.keys(cfg.roles).find(
          (r) => (cfg.roles[r]!.units[id] ?? 0) > 0 && (pool[r] ?? 0) > 0,
        )
        if (!role) break
        pool[role]!--
        run++
        if (runs.has(actualSpot[day]!)) good++
      }
      const served = Math.min(units, Math.floor(good / trip.days) * trip.perTrip)
      const cost = run * trip.costCents
      tripCosts += cost
      trips = {
        ...trips,
        run: trips.run + run,
        wasted: trips.wasted + run - good,
        guests: trips.guests + served,
        costCents: trips.costCents + cost,
      }
      staffed.set(id, served)
      why.set(id, 'conditions')
      if (served < units) lost[id] = (lost[id] ?? 0) + units - served
      out.entries.push({
        kind: 'trips',
        productId: id,
        run,
        wasted: run - good,
        guests: served,
        costCents: cost,
      })
    }
    b = { ...b, abroad: { ...b.abroad, trips, lost } }
  }
  for (const [id, units] of [...booked.entries()].sort((a, z) => z[1] - a[1])) {
    let covered = 0
    for (const [role, r] of Object.entries(cfg.roles)) {
      if (kindOf(role) === 'floor') continue
      const per = (r.units[id] ?? 0) * staffFactor(role)
      while (per > 0 && covered < units && (pool[role] ?? 0) > 0) {
        pool[role]!--
        covered += per
      }
    }
    let limit = covered
    let reason: 'staff' | 'sold_out' | 'works' = 'staff'
    const cap = capacityAt(state, poolOf(cfg, id), week)
    if (cap < limit) {
      limit = cap
      if (cap < (cfg.products[poolOf(cfg, id)]?.capacity ?? 0)) reason = 'works'
    }
    kitchenCovers.set(id, limit)
    if (cfg.products[id]?.prepared) {
      const prep = b.prep?.[id] ?? limit
      if (prep < limit) {
        limit = prep
        reason = 'sold_out'
      }
    }
    if (needsFloor(id)) {
      let floor = 0
      for (const [role, r] of Object.entries(cfg.roles)) {
        if (kindOf(role) !== 'floor') continue
        const per = r.units[id] ?? 0
        while (per > 0 && floor < Math.min(units, limit) && (pool[role] ?? 0) > 0) {
          pool[role]!--
          floor += per
        }
      }
      floorUnits.set(id, floor)
      const stretch = Math.floor(floor * (cfg.floor?.stretch ?? 1))
      if (stretch < limit) {
        limit = stretch
        reason = 'staff'
      }
    }
    staffed.set(id, limit)
    why.set(id, reason)
  }
  let servedUnits = 0
  let staffCancelled = 0
  let soldOut = 0
  let closedForWorks = 0
  let commission = 0
  let unitCosts = 0
  const served: Booking[] = []
  const left = new Map(staffed)
  for (const x of due
    .filter((y) => y.status === 'booked')
    .sort((a, z) => a.bookedWeek - z.bookedWeek)) {
    const room2 = left.get(x.productId) ?? 0
    if (room2 >= x.units) {
      left.set(x.productId, room2 - x.units)
      x.status = 'served'
      servedUnits += x.units
      served.push(x)
    } else {
      x.status = 'company_cancelled'
      const reason = why.get(x.productId) ?? 'staff'
      if (reason === 'sold_out') soldOut += x.units
      else if (reason === 'works') closedForWorks += x.units
      else if (reason === 'conditions') conditionsCancelled += x.units
      else staffCancelled += x.units
    }
  }
  // Food prepared and not served is lost (plan 2 step 1c): its food cost is paid all the same.
  // Plan 3: a stage with a cold room keeps some of it.
  const wasteFactor = stageInEffect(state).wasteFactor ?? 1
  let wasteUnits = 0
  let wasteCents = 0
  for (const [id, prod] of Object.entries(cfg.products)) {
    if (!prod.prepared || !booked.has(id) || !staffed.has(id)) continue
    // Not set: the kitchen prepares for every cover its cooks could send out.
    const prep = b.prep?.[id] ?? kitchenCovers.get(id) ?? 0
    const mine = served.filter((x) => x.productId === id)
    const used = mine.reduce((t, x) => t + x.units, 0)
    const waste = Math.round(Math.max(0, prep - used) * wasteFactor)
    if (waste === 0) continue
    const meanPrice = used > 0 ? mine.reduce((t, x) => t + x.units * x.priceCents, 0) / used : 0
    wasteUnits += waste
    wasteCents += Math.round(waste * (prod.unitCostCents + meanPrice * (prod.unitCostShare ?? 0)))
  }
  // A kitchen that prepared food for a service nobody booked throws all of it away.
  for (const [id, prod] of Object.entries(cfg.products)) {
    const prep = b.prep?.[id] ?? 0
    if (!prod.prepared || booked.has(id) || prep === 0 || !sells(state, id, week)) continue
    const seg = prod.serves[0]
    const price = seg ? priceFor(state, seg, week) : 0
    const lost = Math.round(prep * wasteFactor)
    wasteUnits += lost
    wasteCents += Math.round(lost * (prod.unitCostCents + price * (prod.unitCostShare ?? 0)))
  }
  if (wasteUnits > 0) {
    b = { ...b, wasteCents: (b.wasteCents ?? 0) + wasteCents }
    unitCosts += wasteCents
    out.entries.push({ kind: 'food_waste', units: wasteUnits, amountCents: wasteCents })
  }
  // Vouchers: a served or kept booking redeems its voucher; one cancelled asks again later.
  let redeemedVouchers = 0
  let redeemedUnits = 0
  for (const x of due) {
    if (!x.voucherId) continue
    const v = vouchers.find((y) => y.id === x.voucherId)
    if (!v) continue
    if (x.status === 'served' || x.status === 'cancelled_paid') {
      v.redeemedWeek = week
      redeemedVouchers++
      redeemedUnits += x.units
      out.voucherRedeemedCents += v.valueCents
    } else if (x.status === 'cancelled' || x.status === 'company_cancelled') {
      voucherWeeks[v.id] = week + 2
    }
  }
  if (redeemedVouchers > 0) {
    out.entries.push({
      kind: 'vouchers_redeemed',
      vouchers: redeemedVouchers,
      units: redeemedUnits,
      valueCents: out.voucherRedeemedCents,
    })
  }
  // Money: paid on the day (net of commission), or invoiced.
  const invoices: Invoice[] = []
  const earned = { ...(b.earned ?? {}) }
  const payWeeks = { ...state.hidden.payWeeks }
  const waitsForChase = [...state.hidden.waitsForChase]
  const dueDays = state.scenario.finance.invoiceDueDays
  // Plan 4: local costs that have risen, and a hotel's share of what its beach brings in.
  const unitF = cfg.costSteps ? costFactor(state.scenario, week, 'unitCosts') : 1
  const share = cfg.tender ? hotelShare(state) : 0
  for (const x of [...served, ...due.filter((y) => y.status === 'cancelled_paid')]) {
    const s = cfg.segments[x.segmentId]!
    const gross = x.units * x.priceCents
    if (x.voucherId) {
      // Paid when the voucher was sold: only the food and laundry cost now.
      const prod = cfg.products[x.productId]
      if (x.status === 'served')
        unitCosts +=
          Math.round(x.units * (prod?.unitCostCents ?? 0) * unitF) +
          Math.round(gross * (prod?.unitCostShare ?? 0))
      continue
    }
    const cut = x.channel === 'platform' ? Math.round(gross * cfg.platform.commission) : 0
    commission += cut
    // What a deposit already paid comes off what is due now.
    const owed = gross - cut - (x.depositCents ?? 0)
    let cost = 0
    if (x.status === 'served') {
      const prod = cfg.products[x.productId]
      cost =
        Math.round(x.units * (prod?.unitCostCents ?? 0) * unitF) +
        Math.round(gross * (prod?.unitCostShare ?? 0)) +
        (share > 0 ? Math.round(gross * share) : 0)
      unitCosts += cost
    }
    // What each product earns, for the post-mortem's loan lines (plan 2 step 2).
    earned[x.productId] = (earned[x.productId] ?? 0) + gross - cut - cost
    if (!s.invoiced) {
      out.revenueCents += owed
      continue
    }
    const hidden = state.hidden.segments[x.segmentId]!
    const id = `invoice_${state.invoices.length + invoices.length + 1}`
    const never = rng.chance(hidden.neverPaysShare)
    const lateDays = Math.round(rng.range(0, 2 * hidden.paymentDelayDaysMean))
    const waits = rng.chance(hidden.waitsForChaseShare)
    invoices.push({
      id,
      customerId: x.id,
      customerName: state.scenario.segments.find((g) => g.id === x.segmentId)?.name ?? x.segmentId,
      segmentId: x.segmentId,
      amountCents: owed,
      issuedWeek: week,
      dueWeek: week + Math.ceil(dueDays / 7),
      paidWeek: null,
      writtenOffWeek: null,
    })
    payWeeks[id] = never || waits ? null : week + Math.ceil((dueDays + lateDays) / 7)
    if (!never && waits) waitsForChase.push(id)
  }
  // Plan 4: courses. Graduates may book their next step next week, or come back a year later
  // (only those who booked directly come back directly; the platform keeps its guests).
  if (cond && b.abroad) {
    let graduates = 0
    let sameStay = 0
    for (const x of served) {
      const course = cfg.products[x.productId]?.course
      if (!course) continue
      graduates += x.units
      const next = course.sameStay
      if (next) {
        const n = Math.min(x.units, randomRound(x.units * next.share, rng))
        const w = week + 1
        const pick =
          n > 0 && w <= state.scenario.maxWeeks
            ? next.products.filter((id) => sells(state, id, w)).find((id) => room(id, w) >= n)
            : undefined
        if (pick) {
          bookings.push({
            id: `booking_${bookings.length + 1}`,
            segmentId: x.segmentId,
            productId: pick,
            week: w,
            units: n,
            priceCents: priceFor(state, x.segmentId, w),
            channel: x.channel,
            bookedWeek: week,
            status: 'booked',
          })
          held.set(heldKey(pick, w), (held.get(heldKey(pick, w)) ?? 0) + n)
          sameStay += n
        }
      }
      const later = course.nextSeason
      if (later) {
        const n = Math.min(
          x.units,
          randomRound(x.units * (x.channel === 'platform' ? later.platform : later.direct), rng),
        )
        const target = week + 52
        if (n > 0 && target <= state.scenario.maxWeeks) {
          const lead = cfg.segments[x.segmentId]!.leadWeeks
          const ask = Math.max(week + 1, target - rng.int(lead.min, lead.max))
          returns = [
            ...(returns ?? []),
            {
              askWeek: ask,
              targetWeek: target,
              segmentId: x.segmentId,
              channel: x.channel,
              units: n,
              products: [...later.products],
            },
          ]
        }
      }
    }
    if (graduates > 0) {
      b = {
        ...b,
        abroad: {
          ...b.abroad!,
          ladder: addLadder(b.abroad!.ladder, week, { students: graduates, sameStay }),
        },
      }
      out.entries.push({ kind: 'graduates', units: graduates, sameStay })
    }
  }
  if (servedUnits > 0 || keptUnits > 0) {
    out.entries.push({
      kind: 'guests_served',
      units: servedUnits,
      revenueCents: out.revenueCents,
      commissionCents: commission,
    })
  }
  if (cancelledUnits > 0 || keptUnits > 0) {
    out.entries.push({
      kind: 'bookings_cancelled',
      units: cancelledUnits + keptUnits,
      kept: keptUnits > 0,
    })
  }
  if (staffCancelled > 0)
    out.entries.push({ kind: 'company_cancelled', units: staffCancelled, reason: 'staff' })
  if (soldOut > 0)
    out.entries.push({ kind: 'company_cancelled', units: soldOut, reason: 'sold_out' })
  if (closedForWorks > 0)
    out.entries.push({ kind: 'company_cancelled', units: closedForWorks, reason: 'works' })
  if (weatherClosed > 0)
    out.entries.push({ kind: 'company_cancelled', units: weatherClosed, reason: 'weather' })
  if (conditionsCancelled > 0)
    out.entries.push({
      kind: 'company_cancelled',
      units: conditionsCancelled,
      reason: 'conditions',
    })

  // 6. Shifts.
  let shifts = 0
  let wages = 0
  const roleF = cfg.costSteps ? costFactor(state.scenario, week, 'roles') : 1
  for (const [role, n] of Object.entries(p.shifts)) {
    shifts += n
    wages += Math.round(n * (cfg.roles[role]?.centsPerShift ?? 0) * roleF)
  }
  if (shifts > 0) out.entries.push({ kind: 'shifts_paid', shifts, amountCents: wages })
  out.costsCents += wages + unitCosts + Math.round(contracts.wagesCents * roleF) + tripCosts

  // 7. Reviews.
  let rating = b.rating
  let reviews = b.reviews
  // Guests turned away because the food ran out never sat down: they leave no review.
  const guests = servedUnits + staffCancelled + weatherClosed + closedForWorks + conditionsCancelled
  if (servedUnits > 0) {
    const r = cfg.reviews
    const shortfall =
      guests > 0
        ? (staffCancelled + weatherClosed + closedForWorks + conditionsCancelled) / guests
        : 0
    // Plan 2: contract staff who know the place, renovated rooms, and a floor stretched thin.
    const contractBonus = allShifts > 0 ? contracts.qualityShifts / allShifts : 0
    const roomsBonus = (cfg.renovation?.qualityPerRoom ?? 0) * (b.renovated ?? 0)
    let overFloor = 0
    for (const x of served) {
      if (floorUnits.has(x.productId))
        floorUnits.set(x.productId, floorUnits.get(x.productId)! - x.units)
    }
    for (const v of floorUnits.values()) overFloor += Math.max(0, -v)
    const floorPenalty = hasFloor ? (cfg.floor?.penalty ?? 0) * (overFloor / servedUnits) : 0
    const tired =
      energyFactor(state.founder, state.scenario) < 1 &&
      Object.values(p.founderShifts).some((n) => n > 0)
    // Plan 4: a week sold whole (a cruise) never cancels for the sea; its bad slots cost reviews.
    let seaDays = 0
    const cr = cond?.review
    if (cr) {
      const whole = served.filter((x) => cfg.products[x.productId]?.wholeWeek)
      const share = whole.reduce((t, x) => t + x.units, 0) / servedUnits
      if (share > 0) {
        const all = Object.values(actual).flat()
        const bad = all.filter((d) => cr.bad.includes(d)).length
        const good = all.filter((d) => (cr.good ?? []).includes(d)).length
        const sheltered = cr.shelter !== undefined && isShipped(state, cr.shelter)
        seaDays =
          share *
          (good * (cr.perGoodSlot ?? 0) -
            bad * cr.perBadSlot * (sheltered ? (cr.shelterFactor ?? 1) : 1))
      }
    }
    const value =
      served.reduce(
        (t, x) => t + x.priceCents / (state.hidden.segments[x.segmentId]?.wtpCents ?? x.priceCents),
        0,
      ) / served.length
    const q = Math.min(
      5,
      Math.max(
        1,
        r.qualityBase +
          (state.scenario.officeStages.find((o) => o.id === state.company.officeStage)
            ?.qualityBonus ?? 0) -
          r.understaffPenalty * shortfall -
          (tired ? r.tiredPenalty : 0) -
          r.snagPenalty * state.product.bugs -
          r.valueWeight * Math.max(0, value - 1) +
          contractBonus +
          roomsBonus +
          seaDays -
          floorPenalty +
          rng.normal(r.noiseSd),
      ),
    )
    const added = randomRound(servedUnits * r.reviewsPerUnit, rng)
    if (added > 0) {
      rating = ((rating ?? 0) * reviews + q * added) / (reviews + added)
      reviews += added
      out.entries.push({ kind: 'review', rating, reviews, added })
    }
  }

  if (sentLost > 0) {
    rating = ((rating ?? 0) * reviews + SENT_LOST_RATING * sentLost) / (reviews + sentLost)
    reviews += sentLost
    out.entries.push({ kind: 'review', rating, reviews, added: sentLost })
  }

  state = {
    ...state,
    invoices: invoices.length ? [...state.invoices, ...invoices] : state.invoices,
    hidden: {
      ...state.hidden,
      payWeeks,
      waitsForChase,
      ...(hiddenB.voucherWeeks || returns
        ? {
            bookings: {
              ...state.hidden.bookings!,
              ...(hiddenB.voucherWeeks ? { voucherWeeks } : {}),
              ...(returns ? { returns } : {}),
            },
          }
        : {}),
    },
    bookings: {
      ...b,
      ...(b.vouchers ? { vouchers } : {}),
      ...(Object.keys(earned).length ? { earned } : {}),
      ...archiveOld(bookings, b.archived, week),
      repeatGuests,
      turnedAway,
      rating,
      reviews,
      eventGuests: {},
    },
  }
  out.state = state
  return out
}

function randomRound(x: number, rng: Rng): number {
  const whole = Math.floor(x)
  return whole + (rng.chance(x - whole) ? 1 : 0)
}

/** Revenue earned from bookings over the last four weeks played, for the headline and milestones. */
export function bookingRevenueLast4(state: GameState): number {
  return state.ledger.slice(-4).reduce((t, l) => t + l.bookingRevenueCents, 0)
}

/**
 * Monthly revenue as the headline shows it: guests' payments over the last four weeks for a
 * bookings scenario, the active customers' monthly prices otherwise.
 */
export function bookingsRevenueOrSubscriptions(state: GameState): number {
  if (state.bookings) return bookingRevenueLast4(state)
  return state.customers
    .filter((c) => c.churnedWeek === null)
    .reduce((t, c) => t + c.priceCentsPerMonth, 0)
}

/** The product whose capacity a product sells from: its own, or the one it shares (step 7). */
export const poolOf = (cfg: BookingsConfig, id: FeatureId): FeatureId =>
  cfg.products[id]?.capacityOf ?? id

/** Finished bookings are kept for this many weeks (the calendar's last year), then archived. */
const KEEP_WEEKS = WEEKS_PER_YEAR + 1

/** Moves finished bookings older than a year into the archive's totals. */
function archiveOld(
  bookings: Booking[],
  archived: BookingTotal[] | undefined,
  week: number,
): { bookings: Booking[]; archived?: BookingTotal[] } {
  const old = bookings.filter((x) => x.status !== 'booked' && x.week < week - KEEP_WEEKS)
  if (old.length === 0) return archived ? { bookings, archived } : { bookings }
  const totals = (archived ?? []).map((t) => ({ ...t }))
  for (const x of old) {
    let row = totals.find(
      (t) => t.status === x.status && t.segmentId === x.segmentId && t.channel === x.channel,
    )
    if (!row) {
      row = {
        status: x.status,
        segmentId: x.segmentId,
        channel: x.channel,
        units: 0,
        grossCents: 0,
        firstWeek: x.week,
      }
      totals.push(row)
    }
    row.units += x.units
    row.grossCents += x.units * x.priceCents
    row.firstWeek = Math.min(row.firstWeek, x.week)
  }
  return {
    bookings: bookings.filter((x) => !(x.status !== 'booked' && x.week < week - KEEP_WEEKS)),
    archived: totals,
  }
}

/** Every booking of the run as totals: the archive and the bookings still kept, one row each. */
export function bookingTotals(b: BookingsState): BookingTotal[] {
  return [
    ...(b.archived ?? []),
    ...b.bookings.map((x) => ({
      status: x.status,
      segmentId: x.segmentId,
      channel: x.channel,
      units: x.units,
      grossCents: x.units * x.priceCents,
      firstWeek: x.week,
    })),
  ]
}

/** Tourism as the player sees it, or null in the subscription model. */
export function bookingsView(state: GameState): BookingsView | null {
  const cfg = bookingsConfig(state)
  const b = state.bookings
  if (!cfg || !b) return null
  const woy = weekOfYear(state.scenario, state.week)
  const month = monthOfWeek(woy)
  const featureName = (id: FeatureId) =>
    state.scenario.features.find((f) => f.id === id)?.name ?? id
  // One pass over the bookings for the 12 week calendar and last year's weeks (a restaurant has
  // thousands of bookings; scanning them per cell was the slowest part of a run).
  const key = (id: FeatureId, w: number) => `${id}|${w}`
  const booked = new Map<string, number>()
  const past = new Map<string, number>()
  for (const x of b.bookings) {
    if (x.status === 'booked' && x.week >= state.week && x.week < state.week + 12) {
      booked.set(key(x.productId, x.week), (booked.get(key(x.productId, x.week)) ?? 0) + x.units)
    }
    const ago = x.week + WEEKS_PER_YEAR
    if (x.status !== 'cancelled' && ago >= state.week && ago < state.week + 12) {
      past.set(key(x.productId, ago), (past.get(key(x.productId, ago)) ?? 0) + x.units)
    }
  }
  const bookedAt = (id: FeatureId, w: number) => booked.get(key(id, w)) ?? 0
  /** Booked in a product's capacity pool: itself and every product sharing it (step 7). */
  const sharing = (id: FeatureId) =>
    Object.keys(cfg.products).filter((p) => poolOf(cfg, p) === poolOf(cfg, id))
  const pooled = (id: FeatureId, w: number) => sharing(id).reduce((t, p) => t + bookedAt(p, w), 0)
  const lastYear = (id: FeatureId, w: number) =>
    w - WEEKS_PER_YEAR >= 1 ? (past.get(key(id, w)) ?? 0) : null
  const running = (b.contracts ?? []).filter((x) => x.endWeek === null || x.endWeek >= state.week)
  return {
    weekOfYear: woy,
    month,
    peak: cfg.peakMonths.includes(month),
    weather: b.weather,
    forecast: b.forecast,
    policy: b.policy,
    policyLocked: state.week - b.policySinceWeek < cfg.policyWeeks,
    platform: {
      name: cfg.platform.name,
      commission: cfg.platform.commission,
      listed: b.platformListed,
    },
    partnerships: [...b.partnerships],
    partnershipHours: cfg.partnershipHours,
    outreachHoursFull: cfg.outreachHoursFull,
    rating: b.rating,
    reviews: b.reviews,
    prices: Object.fromEntries(Object.entries(b.prices).map(([k, v]) => [k, { ...v }])),
    segments: state.scenario.segments
      .filter((s) => cfg.segments[s.id])
      .map((s) => ({
        id: s.id,
        unit: cfg.segments[s.id]!.unit,
        invoiced: cfg.segments[s.id]!.invoiced,
        repeatGuests: b.repeatGuests[s.id] ?? 0,
        turnedAwayLast4: b.turnedAway
          .filter((t) => t.segmentId === s.id && t.week > state.week - 5)
          .reduce((t, x) => t + x.units, 0),
      })),
    products: Object.entries(cfg.products).map(([id, prod]) => ({
      id,
      name: featureName(id),
      shipped: isShipped(state, id),
      capacity: prod.capacity,
      serves: [...prod.serves],
      inSeason: prod.months.length === 0 || prod.months.includes(month),
      unitCostCents: prod.unitCostCents,
      unitCostShare: prod.unitCostShare ?? 0,
      oneOffCents: prod.oneOffCents,
      monthlyCents: prod.monthlyCents,
      course: prod.course?.level ?? null,
      needsLevel: prod.needsLevel ?? null,
      dayTrip: prod.dayTrip
        ? {
            perTrip: prod.dayTrip.perTrip,
            days: prod.dayTrip.days,
            costCents: prod.dayTrip.costCents,
          }
        : null,
      wholeWeek: prod.wholeWeek ?? false,
    })),
    abroad: abroadView(state),
    roles: Object.entries(cfg.roles).map(([id, r]) => ({
      id,
      name: r.name,
      centsPerShift: r.centsPerShift,
      units: { ...r.units },
      available: r.available[month - 1] ?? 0,
      founderHours: r.founderHours ?? null,
      kind: r.kind ?? 'serve',
      contracts: CONTRACT_KINDS.flatMap((kind) => {
        const c = r.contracts?.[kind]
        if (!c) return []
        return [
          {
            kind,
            centsPerWeek: c.centsPerWeek,
            shifts: c.shifts,
            noticeWeeks: c.noticeWeeks ?? null,
            months: c.months ? [...c.months] : null,
            max: c.max,
            running: running.filter((x) => x.roleId === id && x.kind === kind).length,
          },
        ]
      }),
    })),
    contracts: running.map((x) => {
      const c = contractConfig(state, x.roleId, x.kind)!
      return {
        id: x.id,
        roleId: x.roleId,
        kind: x.kind,
        name: x.name,
        startWeek: x.startWeek,
        endWeek: x.endWeek,
        working: contractWorks(state, x, state.week),
        centsPerWeek: c.centsPerWeek,
        shifts: c.shifts,
        canEnd: x.endWeek === null && c.noticeWeeks !== undefined,
      }
    }),
    trials: Object.entries(cfg.trials ?? {}).map(([id, t]) => {
      const segments = state.scenario.segments
        .filter((s) => (t.reach[s.id] ?? 0) > 0)
        .map((s) => s.id)
        .sort((x, y) => (t.reach[y] ?? 0) - (t.reach[x] ?? 0))
      const left: Record<string, number> = t.choose
        ? Object.fromEntries(
            segments.map((s) => [s, Math.max(0, t.max - trialsUsed(state, id, s))]),
          )
        : { '': Math.max(0, t.max - trialsUsed(state, id, null)) }
      return {
        id,
        name: t.name,
        hours: t.hours,
        cents: t.cents,
        weeks: t.weeks,
        people: t.people,
        choose: t.choose,
        segments,
        paid: t.paid,
        left,
        open: trialOpen(state, t),
      }
    }),
    vouchers: cfg.vouchers
      ? (() => {
          const v = cfg.vouchers
          const open = openVouchers(state)
          return {
            hoursPerBatch: v.hoursPerBatch,
            batchSize: v.batchSize,
            units: v.units,
            segments: v.segments.map((id) => ({
              id,
              batchesLeft: Math.max(0, v.maxBatches - voucherBatchesUsed(state, id)),
              priceCents: v.units * priceFor(state, id, state.week),
            })),
            sold: b.vouchers?.length ?? 0,
            redeemed: (b.vouchers?.length ?? 0) - open.length,
            openCount: open.length,
            openUnits: open.reduce((t, x) => t + x.units, 0),
            openValueCents: open.reduce((t, x) => t + x.valueCents, 0),
          }
        })()
      : null,
    hostingHours: hostingHours(state),
    lastWeek: Object.keys(cfg.products).flatMap((id) => {
      const mine = b.bookings.filter((x) => x.productId === id && x.week === state.week - 1)
      const served = mine.filter((x) => x.status === 'served').reduce((t, x) => t + x.units, 0)
      const came = mine
        .filter((x) => x.status === 'served' || x.status === 'company_cancelled')
        .reduce((t, x) => t + x.units, 0)
      return came > 0 ? [{ productId: id, came, served }] : []
    }),
    prep: Object.entries(cfg.products)
      .filter(([, p]) => p.prepared)
      .map(([id]) => ({ productId: id, units: b.prep?.[id] ?? null })),
    renovation: cfg.renovation
      ? (() => {
          const r = cfg.renovation
          const inProgress = (b.works ?? []).filter((x) => x.endWeek >= state.week)
          const underWorks = inProgress.filter((x) => x.startWeek <= state.week).length
          const done = b.renovated ?? 0
          return {
            rooms: r.rooms,
            renovated: done,
            underWorks,
            inProgress: inProgress.map((x) => ({ ...x })),
            centsPerRoom: r.centsPerRoom,
            weeks: r.weeks,
            atOnce: r.atOnce,
            mustHaveRooms: r.mustHaveRooms,
            unitsPerRoom: r.unitsPerRoom,
            canStart: isShipped(state, r.feature)
              ? Math.max(0, Math.min(r.atOnce - underWorks, r.rooms - done - inProgress.length))
              : 0,
          }
        })()
      : null,
    minStay: cfg.minStay
      ? {
          on: b.minStay ?? false,
          months: [...cfg.minStay.months],
          segments: [...cfg.minStay.segments],
          nights: 1 + cfg.minStay.extraUnits,
        }
      : null,
    calendar: Object.keys(cfg.products)
      .filter((id) => isShipped(state, id))
      .map((id) => ({
        productId: id,
        cells: Array.from({ length: 12 }, (_, k) => {
          const w = state.week + k
          return {
            week: w,
            booked: pooled(id, w),
            capacity: sells(state, id, w) ? sellableCapacity(state, poolOf(cfg, id), w) : 0,
            lastYear: lastYear(id, w),
          }
        }),
      })),
    thisWeek: Object.keys(cfg.products).map((id) => ({
      productId: id,
      booked: bookedAt(id, state.week),
    })),
    revenueLast4Cents: bookingRevenueLast4(state),
    bookedAhead: b.bookings
      .filter((x) => x.status === 'booked' && x.week > state.week && x.week <= state.week + 4)
      .reduce((t, x) => t + x.units, 0),
    servedByWeek: Array.from({ length: 5 }, (_, k) => state.week - 5 + k)
      .filter((w) => w >= 1)
      .map((w) =>
        b.bookings
          .filter((x) => x.week === w && x.status === 'served')
          .reduce((t, x) => t + x.units, 0),
      ),
  }
}

/** Plan 3: weeks of the last 8 (peak months only, if asked) in which guests were turned away. */
export function turnedAwayWeeks(
  state: Pick<GameState, 'scenario' | 'bookings' | 'week'>,
  peakOnly = false,
): number {
  const b = state.bookings
  const cfg = state.scenario.bookings
  if (!b || !cfg) return 0
  const weeks = new Set(
    b.turnedAway
      .filter((t) => t.units > 0 && t.week > state.week - 8 && t.week < state.week)
      .filter((t) => !peakOnly || cfg.peakMonths.includes(monthOf(state.scenario, t.week)))
      .map((t) => t.week),
  )
  return weeks.size
}

/** Plan 3: units served against the capacity open over the last 4 weeks, in percent (0 to 100). */
export function occupancyPct(state: GameState): number {
  const cfg = bookingsConfig(state)
  const b = state.bookings
  if (!cfg || !b) return 0
  let used = 0
  let open = 0
  for (let w = Math.max(1, state.week - 4); w < state.week; w++) {
    const pools = new Set(
      Object.keys(cfg.products)
        .filter((id) => sells(state, id, w))
        .map((id) => poolOf(cfg, id)),
    )
    for (const pool of pools) open += sellableCapacity(state, pool, w)
    used += b.bookings
      .filter((x) => x.week === w && x.status === 'served' && pools.has(poolOf(cfg, x.productId)))
      .reduce((t, x) => t + x.units, 0)
  }
  return open > 0 ? Math.min(100, Math.round((100 * used) / open)) : 0
}

/**
 * Plan 4: units a pool can sell in a week as the player can know it: a product that follows the
 * conditions has this week's forecast slots, and later weeks the share its month usually suits.
 * Everything else, its capacity.
 */
export function sellableCapacity(state: GameState, pool: FeatureId, w: number): number {
  const cfg = bookingsConfig(state)!
  const base = capacityAt(state, pool, w)
  if (!followsConditions(cfg, pool)) return base
  if (w === state.week && state.bookings?.abroad) {
    return capacityIn(base, suitableSlots(cfg, pool, state.bookings.abroad.forecast))
  }
  return Math.floor(base * expectedShare(cfg, pool, monthOf(state.scenario, w)))
}

const zeroYear = (): LadderYear => ({
  students: 0,
  sameStay: 0,
  returnedDirect: 0,
  returnedPlatform: 0,
})

/** Plan 4: the abroad part of the bookings view, or null without day conditions. */
function abroadView(state: GameState): AbroadView | null {
  const cfg = bookingsConfig(state)!
  const c = cfg.conditions
  const a = state.bookings?.abroad
  if (!c || !a) return null
  const counts: Record<string, Record<string, number>> = {}
  for (const [slot, days] of Object.entries(a.forecast)) {
    counts[slot] = Object.fromEntries(c.states.map((s) => [s.id, 0]))
    for (const d of days) counts[slot]![d] = (counts[slot]![d] ?? 0) + 1
  }
  const total = a.ladder.reduce(
    (t, y) => ({
      students: t.students + y.students,
      sameStay: t.sameStay + y.sameStay,
      returnedDirect: t.returnedDirect + y.returnedDirect,
      returnedPlatform: t.returnedPlatform + y.returnedPlatform,
    }),
    zeroYear(),
  )
  const t = a.trips
  return {
    states: c.states.map((s) => ({ ...s })),
    slots: c.slots.map((s) => ({ ...s })),
    forecast: Object.fromEntries(Object.entries(a.forecast).map(([k, v]) => [k, [...v]])),
    forecastCounts: counts,
    lastWeek: a.lastWeek
      ? Object.fromEntries(Object.entries(a.lastWeek).map(([k, v]) => [k, [...v]]))
      : null,
    spot: c.spot
      ? {
          name: c.spot.name,
          forecast: spotDays(c, a.forecast),
          lastWeek: a.lastWeek ? spotDays(c, a.lastWeek) : null,
        }
      : null,
    runsOn: Object.entries(cfg.products)
      .filter(([id]) => followsConditions(cfg, id))
      .map(([id, p]) => {
        const sl = suitableSlots(cfg, id, a.forecast)
        const slots = p.dayTrip ? [] : (p.slots ?? c.slots.map((x) => x.id))
        return {
          productId: id,
          suitable: sl.suitable,
          total: sl.total,
          slot: p.dayTrip ? 'spot' : slots.length === 1 ? slots[0]! : null,
        }
      }),
    ladderThisYear: { ...zeroYear(), ...(a.ladder[runYear(state.week)] ?? {}) },
    ladderTotal: total,
    moved: a.moved,
    lost: Object.values(a.lost).reduce((x, y) => x + y, 0),
    trips: t
      ? {
          min: t.min,
          locked: state.week - t.sinceWeek < (cfg.trips?.policyWeeks ?? 0),
          most: Math.max(0, ...Object.values(cfg.products).map((p) => p.dayTrip?.perTrip ?? 0)),
          run: t.run,
          wasted: t.wasted,
          guests: t.guests,
          costCents: t.costCents,
        }
      : null,
    tender: a.tender ? { bid: a.tender.bid, kept: a.tender.kept } : null,
    costSteps: (cfg.costSteps ?? []).map((x) => ({ week: x.week, factor: x.factor })),
  }
}
