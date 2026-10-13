import type { BookingsConfig, Scenario, WeatherState } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  BookingTotal,
  Booking,
  BookingsPlan,
  BookingsState,
  BookingsView,
  FeatureId,
  GameState,
  HiddenBookings,
  Invoice,
  ReportEntry,
  SegmentId,
  WeekPlan,
} from '../types'
import { energyFactor } from './founder'
import { priceCurve } from './market'

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
  const p = cfg.weather.monthly[month - 1]!
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
  if (rng.chance(cfg.weather.forecastAccuracy)) return truth
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
})

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

/** A product can be sold in a week: shipped and in season. */
function sells(state: GameState, id: FeatureId, week: number): boolean {
  const p = state.scenario.bookings?.products[id]
  if (!p || !isShipped(state, id)) return false
  if (p.requires !== undefined && !isShipped(state, p.requires)) return false
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
  if (!p) return true
  const cfg = bookingsConfig(state)
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
  return true
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
  const partnership = b.partnerships.includes(segmentId) ? r.partnership : 0
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
    Math.min(cfg.reachCap, platform + website + partnership + outreach + r.walkIn + mouth) + office
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
  const covered = must.length ? must.filter((f) => isShipped(state, f)).length / must.length : 1
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
  const out: BookingsOutcome = { state: input, entries: [], revenueCents: 0, costsCents: 0 }
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

  // 2. Weather.
  const weather = input.hidden.bookings.nextWeather
  const nextWeather = drawWeather(cfg, monthOf(state.scenario, week + 1), rng)
  b.weather = weather
  b.forecast = forecastOf(cfg, nextWeather, rng)
  out.entries.push({ kind: 'weather', weather })

  // 3. Products shipped this week.
  let fixedCosts = state.company.fixedCosts
  for (const f of state.product.features) {
    const prod = cfg.products[f.id]
    if (!prod || f.shippedWeek !== week) continue
    out.costsCents += prod.oneOffCents
    if (prod.monthlyCents > 0 && !fixedCosts.some((c) => c.id === `product_${f.id}`)) {
      const name = state.scenario.features.find((x) => x.id === f.id)?.name ?? f.id
      fixedCosts = [...fixedCosts, { id: `product_${f.id}`, name, monthlyCents: prod.monthlyCents }]
    }
  }
  state = {
    ...state,
    company: { ...state.company, fixedCosts },
    bookings: b,
    hidden: { ...state.hidden, bookings: { ...input.hidden.bookings, nextWeather } },
  }

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
  // Units still booked per product and week, counted once and kept up to date as requests book.
  const heldKey = (id: FeatureId, w: number) => `${id}|${w}`
  const held = new Map<string, number>()
  for (const x of bookings) {
    if (x.status === 'booked' && x.week >= week) {
      held.set(
        heldKey(x.productId, x.week),
        (held.get(heldKey(x.productId, x.week)) ?? 0) + x.units,
      )
    }
  }
  const room = (id: FeatureId, w: number) =>
    (cfg.products[id]?.capacity ?? 0) - (held.get(heldKey(id, w)) ?? 0)
  let sentLost = 0
  for (const seg of state.scenario.segments) {
    const s = cfg.segments[seg.id]
    if (!s) continue
    const reach = reachOf(state, seg.id, p)
    const wtp = state.hidden.segments[seg.id]?.wtpCents ?? 1
    const price = b.prices[seg.id]?.peak ?? 1
    const weatherF = s.weatherSensitive ? cfg.weather.demand[weather] : 1
    const units =
      (hiddenB.base[seg.id] ?? 0) *
      seasonAt(hiddenB.season[seg.id] ?? [], woy) *
      reach.total *
      fitOf(state, seg.id) *
      priceCurve(state.scenario, price / wtp) *
      reviewFactor(state, seg.id) *
      weatherF *
      roleFactor(seg.id)
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
      const size = rng.int(s.size.min, s.size.max)
      const lead = rng.int(s.leadWeeks.min, s.leadWeeks.max)
      const target = week + lead
      const platform = reach.total > 0 && rng.chance(reach.platform / reach.total)
      if (target > state.scenario.maxWeeks) continue
      // Guests a partner sent have agreed to your terms already.
      if (i < ownRequests && b.policy === 'strict' && !rng.chance(s.strictConversion)) continue
      const options = Object.entries(cfg.products)
        .filter(([id, prod]) => prod.serves.includes(seg.id) && sells(state, id, target))
        .map(([id]) => ({ id, free: room(id, target) }))
        .filter((o) => o.free >= size)
        .sort((x, y) => y.free - x.free)
      const pick = options[0]
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
      })
      held.set(heldKey(pick.id, target), (held.get(heldKey(pick.id, target)) ?? 0) + size)
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

  // 5. This week's bookings.
  const alternativeShipped = (id: FeatureId) => {
    const alt = cfg.products[id]?.alternative
    return alt !== undefined && isShipped(state, alt)
  }
  let cancelledUnits = 0
  let keptUnits = 0
  let weatherClosed = 0
  const due = bookings.filter((x) => x.week === week && x.status === 'booked')
  for (const x of due) {
    const s = cfg.segments[x.segmentId]!
    const prod = cfg.products[x.productId]!
    if (weather === 'dangerous' && prod.weatherClosed && !alternativeShipped(x.productId)) {
      x.status = 'company_cancelled'
      weatherClosed += x.units
      continue
    }
    const factor = s.weatherSensitive ? cfg.weather.cancel[weather] : 1
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
  // The roster: shifts go to products in order of what is booked, each role to what it staffs.
  const pool: Record<string, number> = {}
  for (const role of Object.keys(cfg.roles)) {
    pool[role] = (p.shifts[role] ?? 0) + (p.founderShifts[role] ?? 0)
  }
  const booked = new Map<FeatureId, number>()
  for (const x of due) {
    if (x.status === 'booked') booked.set(x.productId, (booked.get(x.productId) ?? 0) + x.units)
  }
  const staffed = new Map<FeatureId, number>()
  for (const [id, units] of [...booked.entries()].sort((a, z) => z[1] - a[1])) {
    let covered = 0
    for (const [role, r] of Object.entries(cfg.roles)) {
      const per = r.units[id] ?? 0
      while (per > 0 && covered < units && (pool[role] ?? 0) > 0) {
        pool[role]!--
        covered += per
      }
    }
    staffed.set(id, Math.min(covered, cfg.products[id]?.capacity ?? 0))
  }
  let servedUnits = 0
  let staffCancelled = 0
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
      staffCancelled += x.units
    }
  }
  // Money: paid on the day (net of commission), or invoiced.
  const invoices: Invoice[] = []
  const payWeeks = { ...state.hidden.payWeeks }
  const waitsForChase = [...state.hidden.waitsForChase]
  const dueDays = state.scenario.finance.invoiceDueDays
  for (const x of [...served, ...due.filter((y) => y.status === 'cancelled_paid')]) {
    const s = cfg.segments[x.segmentId]!
    const gross = x.units * x.priceCents
    const cut = x.channel === 'platform' ? Math.round(gross * cfg.platform.commission) : 0
    commission += cut
    if (x.status === 'served') {
      const prod = cfg.products[x.productId]
      unitCosts +=
        x.units * (prod?.unitCostCents ?? 0) + Math.round(gross * (prod?.unitCostShare ?? 0))
    }
    if (!s.invoiced) {
      out.revenueCents += gross - cut
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
      amountCents: gross - cut,
      issuedWeek: week,
      dueWeek: week + Math.ceil(dueDays / 7),
      paidWeek: null,
      writtenOffWeek: null,
    })
    payWeeks[id] = never || waits ? null : week + Math.ceil((dueDays + lateDays) / 7)
    if (!never && waits) waitsForChase.push(id)
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
  if (weatherClosed > 0)
    out.entries.push({ kind: 'company_cancelled', units: weatherClosed, reason: 'weather' })

  // 6. Shifts.
  let shifts = 0
  let wages = 0
  for (const [role, n] of Object.entries(p.shifts)) {
    shifts += n
    wages += n * (cfg.roles[role]?.centsPerShift ?? 0)
  }
  if (shifts > 0) out.entries.push({ kind: 'shifts_paid', shifts, amountCents: wages })
  out.costsCents += wages + unitCosts

  // 7. Reviews.
  let rating = b.rating
  let reviews = b.reviews
  const guests = servedUnits + staffCancelled + weatherClosed
  if (servedUnits > 0) {
    const r = cfg.reviews
    const shortfall = guests > 0 ? (staffCancelled + weatherClosed) / guests : 0
    const tired =
      energyFactor(state.founder, state.scenario) < 1 &&
      Object.values(p.founderShifts).some((n) => n > 0)
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
    hidden: { ...state.hidden, payWeeks, waitsForChase },
    bookings: {
      ...b,
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
  const lastYear = (id: FeatureId, w: number) =>
    w - WEEKS_PER_YEAR >= 1 ? (past.get(key(id, w)) ?? 0) : null
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
    })),
    roles: Object.entries(cfg.roles).map(([id, r]) => ({
      id,
      name: r.name,
      centsPerShift: r.centsPerShift,
      units: { ...r.units },
      available: r.available[month - 1] ?? 0,
      founderHours: r.founderHours ?? null,
    })),
    calendar: Object.keys(cfg.products)
      .filter((id) => isShipped(state, id))
      .map((id) => ({
        productId: id,
        cells: Array.from({ length: 12 }, (_, k) => {
          const w = state.week + k
          return {
            week: w,
            booked: bookedAt(id, w),
            capacity: sells(state, id, w) ? (cfg.products[id]?.capacity ?? 0) : 0,
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
  }
}
