import { stageInEffect } from './bookings'
import type { Scenario } from '@founder-mode/content'
import type { Rng } from '../rng'
import { priceCurve } from './market'
import type {
  Booking,
  GameState,
  Invoice,
  HiddenLeisure,
  LeisurePlan,
  LeisureState,
  LeisureView,
  LeisureWeek,
  WeekPlan,
} from '../types'

const cfgOf = (s: Pick<GameState, 'scenario'>) => s.scenario.bookings?.leisure
const shipped = (s: GameState, id: string) =>
  s.product.features.some((f) => f.id === id && f.shippedWeek !== null)
const readyAt = (s: GameState, id: string, week: number) =>
  s.product.features.some(
    (f) =>
      f.id === id && (f.shippedWeek !== null || (f.readyWeek !== undefined && f.readyWeek <= week)),
  )
const monthOf = (s: Pick<GameState, 'scenario'>, week: number) =>
  Math.min(
    12,
    Math.floor((((s.scenario.bookings!.startWeekOfYear - 1 + week - 1) % 52) * 12) / 52) + 1,
  )
const round = (n: number, rng: Rng) => Math.floor(n) + Number(rng.chance(n - Math.floor(n)))
const count = (n: number) => Number.isInteger(n) && n >= 0
const entries = <T>(value: Record<string, T>): [string, T][] =>
  Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

type SlotPrices = NonNullable<LeisurePlan['slotPrices']>
const mergeSlotPrices = (base: SlotPrices = {}, updates: SlotPrices = {}): SlotPrices =>
  Object.fromEntries(
    [...new Set([...Object.keys(base), ...Object.keys(updates)])].map((id) => [
      id,
      Object.fromEntries(
        Object.entries({ ...base[id], ...updates[id] }).map(([slot, p]) => [slot, { ...p }]),
      ),
    ]),
  )

export function leisureSpaceUsed(s: GameState, plan?: WeekPlan): number {
  return Object.entries(cfgOf(s)?.space?.uses ?? {}).reduce((sum, [id, places]) => {
    const f = s.product.features.find((x) => x.id === id)
    return (
      sum +
      (f &&
      (f.shippedWeek !== null ||
        f.readyWeek !== undefined ||
        f.progressHours > 0 ||
        (plan?.build[id] ?? 0) > 0)
        ? places
        : 0)
    )
  }, 0)
}

/** Restrictions apply to new enquiries; already sold games keep their reservations. */
export function leisureSellsSlot(s: GameState, segment: string, slot: string | undefined): boolean {
  const slots = s.bookings?.leisure?.salesSlots?.[segment]
  return !slots || (slot !== undefined && slots.includes(slot))
}

export function initLeisure(
  scenario: Scenario,
  rng: Rng,
): { state: LeisureState; hidden: HiddenLeisure } | null {
  const c = scenario.bookings?.leisure
  if (!c) return null
  const localPools = Object.fromEntries(
    entries(c.freshness ?? {}).flatMap(([id, f]) =>
      f.localPool ? [[id, rng.int(f.localPool.min, f.localPool.max)]] : [],
    ),
  )
  const payoutCents = c.aggregator
    ? rng.int(c.aggregator.payoutCents.min, c.aggregator.payoutCents.max)
    : null
  return {
    hidden: {
      localPools,
      payoutCents,
      instructorFollowing: Object.fromEntries(
        entries(c.instructors ?? {}).map(([id, f]) => [id, rng.range(f.min, f.max)]),
      ),
    },
    state: {
      ...(c.slotPrices
        ? {
            slotPrices: mergeSlotPrices(c.slotPrices),
            salesSlots: Object.fromEntries(
              Object.keys(c.segments).map((id) => [id, c.slots.map((slot) => slot.id)]),
            ),
          }
        : {}),
      openingWeek: c.opening ? null : 1,
      buildChoice: [],
      instructorDepartures: [],
      members: [],
      offers: Object.fromEntries(
        entries(c.memberships ?? {}).map(([id, m]) => [
          id,
          { enabled: false, priceCents: m.priceCents },
        ]),
      ),
      timetable: {},
      settingHours: {},
      freshness: Object.fromEntries(
        Object.keys(c.freshness ?? {}).map((id) => [
          id,
          {
            value: 100,
            settingProgress: 0,
            localGroups: 0,
            refreshUntil: null,
            served: 0,
            refreshes: 0,
            lastRefreshWeek: null,
            openedWeek: null,
            weeksTired: 0,
            closedWeeks: 0,
          },
        ]),
      ),
      buildPaid: [],
      holdPolicy: 'free',
      holds: [],
      aggregator: c.aggregator
        ? {
            slots: [],
            joined: false,
            leavingWeek: null,
            checkins: 0,
            payoutCents: 0,
            cancellations: 0,
            users: entries(c.aggregator.users).flatMap(([segmentId, n]) =>
              Array.from({ length: rng.int(n.min, n.max) }, () => ({
                segmentId,
                month: 0,
                visits: 0,
              })),
            ),
          }
        : null,
      weeks: [],
    },
  }
}

export function cloneLeisurePlan(p: LeisurePlan): LeisurePlan {
  return {
    ...(p.slotPrices ? { slotPrices: mergeSlotPrices(p.slotPrices) } : {}),
    ...(p.salesSlots
      ? {
          salesSlots: Object.fromEntries(
            Object.entries(p.salesSlots).map(([id, slots]) => [id, [...slots]]),
          ),
        }
      : {}),
    ...(p.offers
      ? { offers: Object.fromEntries(Object.entries(p.offers).map(([id, o]) => [id, { ...o }])) }
      : {}),
    ...(p.timetable
      ? {
          timetable: Object.fromEntries(
            Object.entries(p.timetable).map(([id, slots]) => [id, { ...slots }]),
          ),
        }
      : {}),
    ...(p.settingHours ? { settingHours: { ...p.settingHours } } : {}),
    ...(p.refresh ? { refresh: [...p.refresh] } : {}),
    ...(p.aggregator
      ? { aggregator: { slots: [...p.aggregator.slots], leave: p.aggregator.leave } }
      : {}),
    ...(p.holdPolicy ? { holdPolicy: p.holdPolicy } : {}),
  }
}

export function leisureHours(s: Pick<GameState, 'scenario' | 'bookings'>, plan: WeekPlan): number {
  if (!cfgOf(s)) return 0
  const hours = { ...s.bookings?.leisure?.settingHours, ...plan.bookings?.leisure?.settingHours }
  const refresh = plan.bookings?.leisure?.refresh ?? []
  return (
    Object.values(hours).reduce((t, n) => t + n, 0) +
    refresh.reduce((t, id) => t + (cfgOf(s)?.freshness?.[id]?.refresh.hours ?? 0), 0)
  )
}

export function leisureValid(s: GameState, plan: WeekPlan): boolean {
  const c = cfgOf(s)
  const l = s.bookings?.leisure
  const change = plan.bookings?.leisure
  if (!c || !l) return !change
  if (c.space && leisureSpaceUsed(s, plan) > c.space.max) return false
  const p = change ?? {}
  const slots = new Set(c.slots.map((x) => x.id))
  for (const [segment, prices] of Object.entries(p.slotPrices ?? {})) {
    if (!c.slotPrices?.[segment]) return false
    for (const [slot, price] of Object.entries(prices))
      if (
        !slots.has(slot) ||
        !count(price.peak) ||
        !count(price.off) ||
        price.peak === 0 ||
        price.off === 0
      )
        return false
  }
  for (const [segment, selected] of Object.entries(p.salesSlots ?? {}))
    if (
      !c.slotPrices ||
      !c.segments[segment] ||
      new Set(selected).size !== selected.length ||
      selected.some((id) => !slots.has(id))
    )
      return false
  for (const [id, o] of Object.entries(p.offers ?? {}))
    if (
      !c.memberships?.[id] ||
      !count(o.priceCents) ||
      o.priceCents === 0 ||
      typeof o.enabled !== 'boolean'
    )
      return false
  for (const [id, table] of Object.entries(p.timetable ?? {})) {
    if (!c.products[id]?.classPlaces) return false
    for (const [slot, n] of Object.entries(table)) if (!slots.has(slot) || !count(n)) return false
  }
  const table = { ...l.timetable, ...p.timetable }
  for (const slot of c.slots) {
    const rooms: Record<string, number> = {}
    for (const [id, classes] of Object.entries(table)) {
      const product = c.products[id]
      if (!product?.classPlaces) continue
      const room = product.room ?? id
      rooms[room] = (rooms[room] ?? 0) + (classes[slot.id] ?? 0) * (product.classHours ?? 0)
    }
    if (Object.values(rooms).some((hours) => hours > slot.hours)) return false
  }
  for (const [id, n] of Object.entries(p.settingHours ?? {}))
    if (!c.freshness?.[id] || !count(n) || !shipped(s, id)) return false
  const refresh = p.refresh ?? []
  if (new Set(refresh).size !== refresh.length) return false
  for (const id of refresh)
    if (!c.freshness?.[id] || !shipped(s, id) || l.freshness[id]?.refreshUntil !== null)
      return false
  if (p.aggregator) {
    if (
      !c.aggregator ||
      !l.aggregator ||
      p.aggregator.slots.some((id) => !slots.has(id)) ||
      new Set(p.aggregator.slots).size !== p.aggregator.slots.length
    )
      return false
    if (l.aggregator.leavingWeek !== null && !p.aggregator.leave) return false
    if (!p.aggregator.leave && !l.aggregator.joined && p.aggregator.slots.length === 0) return false
  }
  if (p.holdPolicy && (!c.holds || !['free', 'fee', 'none'].includes(p.holdPolicy))) return false
  return true
}

/** A preferred slot, with no new draw at all in a protected game. */
export function leisureSlot(s: GameState, segment: string, rng: Rng): string | undefined {
  const shares = cfgOf(s)?.segments[segment]?.slotShare
  if (!shares) return undefined
  let r = rng.next()
  for (const [id, share] of entries(shares)) {
    r -= share
    if (r < 0) return id
  }
  return Object.keys(shares).at(-1)
}

export function leisureOpen(s: GameState, id: string, week: number): boolean {
  const c = cfgOf(s)
  const l = s.bookings?.leisure
  if (!c || !l) return true
  if (c.opening && l.openingWeek === null) {
    if (
      !c.opening.areas.some((p) => readyAt(s, p, week)) ||
      !c.opening.requires.every((p) => readyAt(s, p, week))
    )
      return false
  }
  for (const [buildId, build] of entries(c.buildOut ?? {})) {
    if (!build.closes?.includes(id)) continue
    const f = s.product.features.find((p) => p.id === buildId)
    if (f?.shippedWeek === null && f.readyWeek !== undefined && week < f.readyWeek) return false
  }
  const until = l.freshness[id]?.refreshUntil
  return until === undefined || until === null || week >= until
}

/** The slot's safety limit; its comfortable capacity never reaches the player view. */
export function leisureCapacity(s: GameState, id: string, slot: string, week: number): number {
  const p = cfgOf(s)?.products[id]
  if (!p || !readyAt(s, id, week) || !leisureOpen(s, id, week)) return 0
  const required = s.scenario.bookings?.products[id]?.requires
  if (required && !readyAt(s, required, week)) return 0
  const classes = p.classPlaces ? (s.bookings?.leisure?.timetable[id]?.[slot] ?? 0) : 1
  const base = p.classPlaces ? classes * p.classPlaces : (p.capacity[slot] ?? 0)
  const total = p.classPlaces
    ? Object.values(s.bookings?.leisure?.timetable[id] ?? {}).reduce(
        (n, x) => n + x * p.classPlaces!,
        0,
      )
    : Object.values(p.capacity).reduce((n, x) => n + x, 0)
  const bonus = stageInEffect(s).capacity?.[id] ?? 0
  const f = s.bookings?.leisure?.freshness[id]
  const loss =
    f?.lastRefreshWeek === week ? (cfgOf(s)?.freshness?.[id]?.refresh.lostCapacity?.[slot] ?? 0) : 0
  const extra = entries(cfgOf(s)?.slotUpgrades ?? {}).reduce(
    (sum, [feature, upgrade]) =>
      sum +
      (upgrade.product === id && upgrade.slot === slot && readyAt(s, feature, week)
        ? upgrade.additional
        : 0),
    0,
  )
  return Math.max(0, base + (total > 0 ? Math.floor((bonus * base) / total) : 0) + extra - loss)
}

export function leisureRoom(
  s: GameState,
  bookings: readonly Booking[],
  product: string,
  slot: string,
  week: number,
  segment?: string,
  reservations?: { occupied: number; local: number },
): number {
  const cfg = s.scenario.bookings!
  const minimum = segment ? cfg.leisure?.segments[segment]?.minimumAreas : undefined
  if (
    minimum &&
    (cfg.leisure?.opening?.areas.filter((id) => readyAt(s, id, week) && leisureOpen(s, id, week))
      .length ?? 0) < minimum
  )
    return 0
  const pool = cfg.products[product]?.capacityOf ?? product
  const booked =
    reservations?.occupied ??
    bookings
      .filter(
        (b) =>
          b.week === week &&
          b.status === 'booked' &&
          b.slotId === slot &&
          (cfg.products[b.productId]?.capacityOf ?? b.productId) === pool,
      )
      .reduce((t, b) => t + b.units, 0)
  const held = reservations
    ? 0
    : (s.bookings?.leisure?.holds ?? [])
        .filter(
          (h) =>
            h.status === 'held' &&
            h.booking.week === week &&
            h.booking.slotId === slot &&
            (cfg.products[h.booking.productId]?.capacityOf ?? h.booking.productId) === pool,
        )
        .reduce((t, h) => t + h.booking.units, 0)
  const free = Math.max(0, leisureCapacity(s, pool, slot, week) - booked - held)
  const f = cfg.leisure?.freshness?.[pool]
  const live = s.bookings?.leisure?.freshness[pool]
  const groups = s.hidden.bookings?.leisure?.localPools[pool]
  if (!segment || !f?.localSegments.includes(segment) || !live || groups === undefined) return free
  const reset = live.refreshUntil !== null && live.refreshUntil <= week
  const from = reset ? live.refreshUntil! : 0
  const reserved =
    reservations?.local ??
    bookings
      .filter(
        (b) =>
          b.productId === pool &&
          b.status === 'booked' &&
          b.week >= from &&
          f.localSegments.includes(b.segmentId),
      )
      .reduce((n, b) => n + b.units, 0)
  const heldGroups = reservations
    ? 0
    : (s.bookings?.leisure?.holds ?? [])
        .filter(
          (h) =>
            h.status === 'held' &&
            h.booking.productId === pool &&
            h.booking.week >= from &&
            f.localSegments.includes(h.booking.segmentId),
        )
        .reduce((n, h) => n + h.booking.units, 0)
  return Math.min(
    free,
    Math.max(0, groups - (reset ? 0 : live.localGroups) - reserved - heldGroups),
  )
}

/** A phase-local index. Append new reservations freely; recreate after changing old statuses. */
export function leisureRoomReader(bookings: readonly Booking[]) {
  const occupied = new Map<string, number>()
  const local = new Map<string, number>()
  const afterReset = new Map<string, number>()
  let seen = 0
  let holdsSeen = 0
  return (s: GameState, product: string, slot: string, week: number, segment?: string) => {
    const cfg = s.scenario.bookings!
    const l = s.bookings!.leisure!
    const key = (product: string, slot: string | undefined, week: number) =>
      `${product}|${slot}|${week}`
    const add = (b: Booking) => {
      const pool = cfg.products[b.productId]?.capacityOf ?? b.productId
      const k = key(pool, b.slotId, b.week)
      occupied.set(k, (occupied.get(k) ?? 0) + b.units)
      const f = cfg.leisure?.freshness?.[b.productId]
      if (!f?.localSegments.includes(b.segmentId)) return
      local.set(b.productId, (local.get(b.productId) ?? 0) + b.units)
      const reset = l.freshness[b.productId]?.refreshUntil
      if (reset !== null && reset !== undefined && b.week >= reset)
        afterReset.set(b.productId, (afterReset.get(b.productId) ?? 0) + b.units)
    }
    for (; seen < bookings.length; seen++) {
      const b = bookings[seen]!
      if (b.status === 'booked') add(b)
    }
    for (; holdsSeen < l.holds.length; holdsSeen++) {
      const h = l.holds[holdsSeen]!
      if (h.status === 'held') add(h.booking)
    }
    const pool = cfg.products[product]?.capacityOf ?? product
    const reset = l.freshness[pool]?.refreshUntil
    return leisureRoom(s, bookings, product, slot, week, segment, {
      occupied: occupied.get(key(pool, slot, week)) ?? 0,
      local:
        (reset !== null && reset !== undefined && reset <= week ? afterReset : local).get(pool) ??
        0,
    })
  }
}

export function leisureAppeal(s: GameState, segment: string, id: string, week = s.week): number {
  const f = cfgOf(s)?.freshness?.[id]
  const l = s.bookings?.leisure?.freshness[id]
  if (!f || !l) return 1
  const pool = s.hidden.bookings?.leisure?.localPools[id]
  const reset = l.refreshUntil !== null && l.refreshUntil <= week
  const remaining =
    pool && f.localSegments.includes(segment)
      ? Math.max(0, 1 - (reset ? 0 : l.localGroups) / pool)
      : 1
  return (1 - (f.sensitivity[segment] ?? 0) * (1 - (reset ? 100 : l.value) / 100)) * remaining
}

/** All state updates are copies; the caller adds the returned money to the week's ledger. */
export function beginLeisure(
  input: GameState,
  plan: WeekPlan,
  rng: Rng,
): { state: GameState; costsCents: number; revenueCents: number } {
  const c = cfgOf(input)
  const original = input.bookings?.leisure
  if (!c || !original) return { state: input, costsCents: 0, revenueCents: 0 }
  const p = plan.bookings?.leisure
  const week = input.week
  let costsCents = 0
  let revenueCents = 0
  const l: LeisureState = {
    ...original,
    ...(original.slotPrices
      ? { slotPrices: mergeSlotPrices(original.slotPrices, p?.slotPrices) }
      : {}),
    ...(original.salesSlots
      ? {
          salesSlots: Object.fromEntries(
            Object.entries({ ...original.salesSlots, ...p?.salesSlots }).map(([id, slots]) => [
              id,
              [...slots],
            ]),
          ),
        }
      : {}),
    offers: { ...original.offers, ...p?.offers },
    timetable: { ...original.timetable, ...p?.timetable },
    settingHours: { ...original.settingHours, ...p?.settingHours },
    freshness: Object.fromEntries(
      Object.entries(original.freshness).map(([id, f]) => [id, { ...f }]),
    ),
    buildPaid: [...original.buildPaid],
    holdPolicy: p?.holdPolicy ?? original.holdPolicy,
    holds: original.holds.map((h) => ({ ...h, booking: { ...h.booking } })),
    members: original.members.map((m) => ({
      ...m,
      waitlist: m.waitlist.filter((w) => w > week - 4),
    })),
    aggregator: original.aggregator
      ? { ...original.aggregator, users: original.aggregator.users.map((u) => ({ ...u })) }
      : null,
    weeks: [...original.weeks],
  }
  if (l.aggregator && c.aggregator) {
    if (p?.aggregator?.leave && l.aggregator.joined && l.aggregator.leavingWeek === null)
      l.aggregator.leavingWeek = week + c.aggregator.noticeWeeks
    if (p?.aggregator && !p.aggregator.leave && l.aggregator.leavingWeek === null) {
      l.aggregator.slots = [...p.aggregator.slots]
      l.aggregator.joined = true
    }
    if (l.aggregator.leavingWeek !== null && l.aggregator.leavingWeek <= week)
      l.aggregator = { ...l.aggregator, slots: [], joined: false, leavingWeek: null }
  }
  for (const [id, f] of entries(c.freshness ?? {})) {
    const now = l.freshness[id]!
    if (now.refreshUntil !== null && now.refreshUntil <= week) {
      now.value = 100
      now.settingProgress = 0
      now.localGroups = 0
      now.refreshUntil = null
    }
    if (!shipped(input, id)) continue
    if (now.openedWeek === null) now.openedWeek = week
    now.value = Math.max(0, now.value - f.weeklyLoss)
    now.settingProgress += l.settingHours[id] ?? 0
    if (now.settingProgress >= f.refresh.hours) {
      now.value = 100
      now.refreshes += Math.floor(now.settingProgress / f.refresh.hours)
      now.lastRefreshWeek = week
      now.settingProgress %= f.refresh.hours
    }
    if (p?.refresh?.includes(id)) {
      costsCents += f.refresh.cents
      now.refreshes++
      now.lastRefreshWeek = week
      if (f.refresh.weeks > 0) now.refreshUntil = week + f.refresh.weeks
      else {
        now.value = 100
        now.localGroups = 0
      }
    }
    if (now.refreshUntil !== null && now.refreshUntil > week) now.closedWeeks++
    if (now.value <= f.knownAbove) now.weeksTired++
  }
  const bookings = input.bookings!.bookings.map((b) => ({ ...b }))
  const row: LeisureWeek = {
    turnedAway: {},
    week,
    joined: 0,
    cancelled: 0,
    active: 0,
    signed: 0,
    held: 0,
    converted: 0,
    released: 0,
    lateReleased: 0,
    aggregatorCancellations: 0,
    aggregatorPayoutCents: 0,
    slots: [],
  }
  for (const h of l.holds) {
    if (h.status !== 'held' || h.releaseWeek > week) continue
    const segment = c.holds?.segments[h.booking.segmentId]
    if (segment && rng.chance(segment.convert)) {
      h.status = 'converted'
      const deposit = Math.max(
        h.feeCents,
        Math.round(
          h.booking.units *
            h.booking.priceCents *
            (input.scenario.bookings!.segments[h.booking.segmentId]?.depositShare ?? 0),
        ),
      )
      revenueCents += deposit - h.feeCents
      bookings.push({ ...h.booking, depositCents: deposit })
      row.converted++
    } else {
      h.status = 'released'
      row.released++
      if (h.booking.week <= week + 1) row.lateReleased++
    }
  }
  // A build's charge falls at the start, not when its licence-style wait ends.
  let loan = input.loan
  for (const [id] of Object.entries(c.buildOut ?? {})) {
    const f = input.product.features.find((x) => x.id === id)
    if (!f?.readyWeek || l.buildPaid.includes(id)) continue
    if (loan?.bought?.includes(id)) loan = { ...loan, bought: loan.bought.filter((x) => x !== id) }
    else costsCents += input.scenario.bookings!.products[id]?.oneOffCents ?? 0
    l.buildPaid.push(id)
  }
  if (
    l.openingWeek === null &&
    c.opening &&
    c.opening.areas.some((id) => shipped(input, id)) &&
    c.opening.requires.every((id) => shipped(input, id))
  )
    l.openingWeek = week
  l.weeks.push(row)
  const state = { ...input, loan, bookings: { ...input.bookings!, bookings, leisure: l } }
  return { state, costsCents, revenueCents }
}

export function leisureView(s: GameState): LeisureView | null {
  const c = cfgOf(s)
  const l = s.bookings?.leisure
  if (!c || !l) return null
  const name = (id: string) => s.scenario.features.find((f) => f.id === id)?.name ?? id
  const recent = l.weeks.filter((w) => w.week > s.week - 5)
  const active = l.members.filter((m) => m.endedWeek === null)
  const a = l.aggregator
  const cfg = s.scenario.bookings!
  const key = (product: string, slot: string, week: number) =>
    `${cfg.products[product]?.capacityOf ?? product}|${slot}|${week}`
  const booked = new Map<string, number>()
  const held = new Map<string, number>()
  for (const b of s.bookings!.bookings) {
    if (b.status !== 'booked' || !b.slotId || b.week < s.week || b.week >= s.week + 12) continue
    const k = key(b.productId, b.slotId, b.week)
    booked.set(k, (booked.get(k) ?? 0) + b.units)
  }
  for (const h of l.holds) {
    const b = h.booking
    if (h.status !== 'held' || !b.slotId || b.week < s.week || b.week >= s.week + 12) continue
    const k = key(b.productId, b.slotId, b.week)
    held.set(k, (held.get(k) ?? 0) + b.units)
  }
  // Capacity changes only at readiness/reopening dates and the end of a reset's lost slot.
  // Reuse it within those intervals rather than evaluating twelve identical future weeks.
  const changes = new Set([s.week])
  const boundary = (week: number | null | undefined) => {
    if (week !== null && week !== undefined && week > s.week && week < s.week + 12)
      changes.add(week)
  }
  for (const f of s.product.features) boundary(f.readyWeek)
  for (const f of Object.values(l.freshness)) {
    boundary(f.refreshUntil)
    boundary(f.lastRefreshWeek)
    if (f.lastRefreshWeek !== null) boundary(f.lastRefreshWeek + 1)
  }
  const dates = [...changes].sort((a, b) => a - b)
  const capacities = new Map<string, number>()
  const calendarCapacity = (product: string, slot: string, week: number) => {
    let at = s.week
    for (const date of dates) {
      if (date > week) break
      at = date
    }
    const k = key(product, slot, at)
    if (!capacities.has(k)) capacities.set(k, leisureCapacity(s, product, slot, at))
    return capacities.get(k)!
  }
  const ladder = s.bookings?.abroad?.ladder ?? []
  const totals = ladder.reduce(
    (sum, y) => ({
      students: sum.students + y.students,
      sameStay: sum.sameStay + y.sameStay,
      returnedDirect: sum.returnedDirect + y.returnedDirect,
      returnedPlatform: sum.returnedPlatform + y.returnedPlatform,
    }),
    { students: 0, sameStay: 0, returnedDirect: 0, returnedPlatform: 0 },
  )
  return {
    ...(c.slotUpgrades
      ? {
          upgrades: entries(c.slotUpgrades).map(([id, upgrade]) => ({
            productId: id,
            name: name(id),
            poolId: upgrade.product,
            slotId: upgrade.slot,
            additional: upgrade.additional,
            unitCostCents: upgrade.unitCostCents,
            active: readyAt(s, id, s.week),
            paidCents: l.weeks.reduce((sum, w) => sum + (w.turnaroundCents?.[id] ?? 0), 0),
          })),
        }
      : {}),
    minimumAreas: Object.fromEntries(
      entries(c.segments).flatMap(([id, seg]) =>
        seg.minimumAreas ? [[id, seg.minimumAreas]] : [],
      ),
    ),
    ...(l.slotPrices ? { slotPrices: mergeSlotPrices(l.slotPrices) } : {}),
    ...(l.salesSlots
      ? {
          salesSlots: Object.fromEntries(
            Object.entries(l.salesSlots).map(([id, slots]) => [id, [...slots]]),
          ),
        }
      : {}),
    ...(c.space
      ? { space: { max: c.space.max, used: leisureSpaceUsed(s), uses: { ...c.space.uses } } }
      : {}),
    slotCalendar: Object.keys(c.products)
      .sort()
      .filter((id) =>
        s.product.features.some(
          (f) => f.id === id && (f.shippedWeek !== null || f.readyWeek !== undefined),
        ),
      )
      .flatMap((productId) =>
        c.slots.flatMap((slot) =>
          Array.from({ length: 12 }, (_, n) => {
            const week = s.week + n
            const k = key(productId, slot.id, week)
            return {
              productId,
              slotId: slot.id,
              week,
              capacity: calendarCapacity(
                cfg.products[productId]?.capacityOf ?? productId,
                slot.id,
                week,
              ),
              booked: booked.get(k) ?? 0,
              held: held.get(k) ?? 0,
            }
          }),
        ),
      ),
    courses: Object.values(cfg.products).some((p) => p.course)
      ? { ...totals, byYear: ladder.map((y) => ({ ...y })) }
      : null,
    instructorDepartures: l.instructorDepartures.map((d) => ({
      week: d.week,
      name: s.scenario.bookings!.roles[d.roleId]?.name ?? d.roleId,
      stopped: d.stopped,
      pending: d.pending,
    })),
    openingWeek: l.openingWeek,
    buildChoice: [...l.buildChoice],
    slots: c.slots.map((x) => ({ ...x })),
    load: (l.weeks.at(-1)?.slots ?? []).map((x) => ({ ...x })),
    turnedAwayBySlot: { ...l.weeks.at(-1)?.turnedAway },
    members: entries(c.memberships ?? {}).map(([id, offer]) => {
      const members = active.filter((m) => m.offerId === id)
      return {
        offerId: id,
        name: name(id),
        active: members.filter((m) => !m.inactive).length,
        inactive: members.filter((m) => m.inactive).length,
        owedVisits: members.reduce((t, m) => t + (m.owedVisits ?? 0), 0),
        agreedMonthlyCents:
          offer.kind === 'pack' || offer.kind === 'intro'
            ? 0
            : members.reduce((t, m) => t + m.priceCents, 0),
        enabled: l.offers[id]?.enabled ?? false,
        priceCents: l.offers[id]?.priceCents ?? offer.priceCents,
        kind: offer.kind,
        termWeeks: offer.termWeeks,
        noticeWeeks: offer.noticeWeeks,
        slots: [...offer.slots],
        validWeeks: offer.validWeeks ?? null,
      }
    }),
    joinsLast4: recent.reduce((t, w) => t + w.joined, 0),
    cancellationsLast4: recent.reduce((t, w) => t + w.cancelled, 0),
    signed: l.members.length,
    retained: active.length,
    aggregator:
      a && c.aggregator
        ? {
            name: c.aggregator.name,
            slots: [...a.slots],
            joined: a.joined,
            leavingWeek: a.leavingWeek,
            capPerMonth: c.aggregator.capPerMonth,
            noticeWeeks: c.aggregator.noticeWeeks,
            checkinsLast4: recent.reduce(
              (t, w) => t + w.slots.reduce((n, x) => n + x.aggregator, 0),
              0,
            ),
            payoutLast4Cents: recent.reduce((t, w) => t + w.aggregatorPayoutCents, 0),
            cancellationsLast4: recent.reduce((t, w) => t + w.aggregatorCancellations, 0),
            checkins: a.checkins,
            payoutCents: a.payoutCents,
            cancellations: a.cancellations,
          }
        : null,
    freshness: entries(c.freshness ?? {}).map(([id, f]) => ({
      productId: id,
      name: name(id),
      word:
        (l.freshness[id]?.value ?? 100) > f.newAbove
          ? 'new'
          : (l.freshness[id]?.value ?? 100) > f.knownAbove
            ? 'known'
            : 'tired',
      localGroups: l.freshness[id]?.localGroups ?? 0,
      settingHours: l.settingHours[id] ?? 0,
      settingProgressHours: l.freshness[id]?.settingProgress ?? 0,
      served: l.freshness[id]?.served ?? 0,
      refreshes: l.freshness[id]?.refreshes ?? 0,
      lastRefreshWeek: l.freshness[id]?.lastRefreshWeek ?? null,
      openedWeek: l.freshness[id]?.openedWeek ?? null,
      weeksTired: l.freshness[id]?.weeksTired ?? 0,
      closedWeeks: l.freshness[id]?.closedWeeks ?? 0,
      resetHours: f.refresh.hours,
      refreshCents: f.refresh.cents,
      refreshWeeks: f.refresh.weeks,
      lostCapacity: { ...f.refresh.lostCapacity },
      refreshingUntil: l.freshness[id]?.refreshUntil ?? null,
    })),
    builds: Object.entries(c.buildOut ?? {}).map(([id, build]) => {
      const f = s.product.features.find((x) => x.id === id)
      return {
        productId: id,
        name: name(id),
        ...(build.closes ? { closes: [...build.closes] } : {}),
        readyWeek: f?.readyWeek ?? null,
        weeks: build.weeks,
        started: l.buildPaid.includes(id),
        complete: shipped(s, id),
        costCents: s.scenario.bookings!.products[id]?.oneOffCents ?? 0,
      }
    }),
    holds: c.holds
      ? {
          policy: l.holdPolicy,
          feeCents: c.holds.feeCents,
          calendar: l.holds.map((h) => ({
            id: h.id,
            week: h.booking.week,
            slotId: h.booking.slotId ?? null,
            segmentId: h.booking.segmentId,
            releaseWeek: h.releaseWeek,
            status: h.status,
          })),
          granted: l.holds.length,
          converted: l.holds.filter((h) => h.status === 'converted').length,
          released: l.holds.filter((h) => h.status === 'released').length,
          lateReleased: l.weeks.reduce((t, w) => t + w.lateReleased, 0),
        }
      : null,
    timetable: entries(c.products)
      .filter(([, p]) => p.classPlaces !== undefined)
      .map(([id, p]) => ({
        productId: id,
        name: name(id),
        room: p.room ?? null,
        places: p.classPlaces!,
        classes: { ...l.timetable[id] },
      })),
    history: l.weeks.map((w) => ({
      ...w,
      ...(w.turnaroundCents ? { turnaroundCents: { ...w.turnaroundCents } } : {}),
      turnedAway: { ...w.turnedAway },
      slots: w.slots.map((x) => ({ ...x })),
    })),
  }
}

/** Joins are distinct from visits: unused annual contracts still pay, unused packs are owed. */
export function joinLeisure(
  input: GameState,
  segmentId: string,
  demand: number,
  rng: Rng,
): GameState {
  const c = cfgOf(input)
  const original = input.bookings?.leisure
  const segment = c?.segments[segmentId]
  if (!c?.memberships || !original || !segment) return input
  const offers = entries(c.memberships).filter(
    ([id, o]) =>
      original.offers[id]?.enabled &&
      o.serves.includes(segmentId) &&
      shipped(input, id) &&
      (leisureOpen(input, '', input.week) || o.kind === 'pack'),
  )
  if (!offers.length) return input
  const migration = original.aggregator?.joined
    ? (c.aggregator?.cannibalisation[segmentId] ?? 0)
    : 0
  const n = round(demand * segment.memberShare * (1 - migration), rng)
  const members = [...original.members]
  for (let i = 0; i < n; i++) {
    const [offerId, offer] = rng.pick(offers)
    const priceCents = original.offers[offerId]!.priceCents
    const monthlyCost =
      offer.kind === 'pack'
        ? (priceCents / offer.visits!) *
          segment.visitsPerWeek *
          input.scenario.finance.weeksPerMonth
        : offer.kind === 'intro'
          ? (priceCents / offer.validWeeks!) * input.scenario.finance.weeksPerMonth
          : priceCents
    const wtp = input.hidden.segments[segmentId]?.wtpCents ?? monthlyCost
    if (!rng.chance(priceCurve(input.scenario, monthlyCost / wtp))) continue
    members.push({
      id: `member_${members.length + 1}`,
      segmentId,
      offerId,
      joinedWeek: input.week,
      termUntil: input.week + offer.termWeeks,
      noticeUntil: null,
      endedWeek: null,
      inactive: false,
      priceCents,
      owedVisits: offer.kind === 'pack' ? offer.visits! : null,
      expiresWeek: offer.validWeeks ? input.week + offer.validWeeks : null,
      waitlist: [],
      reason: null,
      ...(offer.kind === 'pack' ? { owedCents: priceCents } : {}),
    })
  }
  const weeks = original.weeks.map((w) =>
    w.week === input.week
      ? {
          ...w,
          joined: w.joined + members.length - original.members.length,
          signed: members.length,
        }
      : w,
  )
  return { ...input, bookings: { ...input.bookings!, leisure: { ...original, members, weeks } } }
}

/** Churn and billing before service; returns money separately for the existing ledger. */
export function billLeisure(
  input: GameState,
  rng: Rng,
): { state: GameState; revenueCents: number; voucherCents: number; voucherRedeemedCents: number } {
  const c = cfgOf(input)
  const original = input.bookings?.leisure
  if (!c?.memberships || !original)
    return { state: input, revenueCents: 0, voucherCents: 0, voucherRedeemedCents: 0 }
  let revenueCents = 0
  let voucherCents = 0
  let voucherRedeemedCents = 0
  let cancelled = 0
  let aggregatorCancellations = 0
  const fees: Record<string, number> = {}
  const week = input.week
  const members = original.members.map((m) => ({ ...m, waitlist: [...m.waitlist] }))
  for (const m of members) {
    if (m.endedWeek !== null) continue
    let offer = c.memberships[m.offerId]!
    const segment = c.segments[m.segmentId]!
    const end = (reason: typeof m.reason) => {
      m.endedWeek = week
      m.reason = reason
      cancelled++
    }
    if (m.noticeUntil !== null && m.noticeUntil <= week) {
      end(m.reason)
      continue
    }
    if (offer.kind === 'pack') {
      if (m.joinedWeek === week) voucherCents += m.priceCents
      if ((m.owedVisits ?? 0) === 0 || (m.expiresWeek ?? Infinity) <= week) {
        voucherRedeemedCents += m.owedCents ?? 0
        m.owedCents = 0
        m.owedVisits = 0
        end('expired')
      }
      continue
    }
    if (offer.kind === 'intro' && (m.expiresWeek ?? Infinity) <= week) {
      const next = entries(c.memberships).filter(
        ([id, o]) =>
          o.kind !== 'intro' &&
          o.kind !== 'pack' &&
          o.serves.includes(m.segmentId) &&
          original.offers[id]?.enabled &&
          shipped(input, id),
      )
      if (!next.length || !rng.chance(offer.convert ?? 0)) {
        end('expired')
        continue
      }
      const [id, o] = rng.pick(next)
      m.offerId = id
      m.priceCents = original.offers[id]!.priceCents
      m.termUntil = week + o.termWeeks
      m.expiresWeek = null
      m.billingWeek = week
      offer = o
    }
    if (m.inactive && week >= m.termUntil && m.noticeUntil === null) {
      end(m.reason)
      continue
    }
    if (m.joinedWeek < week && m.noticeUntil === null && !m.inactive && offer.kind !== 'intro') {
      const previous = original.weeks.at(-2)
      const crowded = previous?.slots.some(
        (x) => x.load === 'packed' && (segment.slotShare[x.slotId] ?? 0) > 0,
      )
      const fresh = entries(c.freshness ?? {})
        .filter(
          ([id]) =>
            shipped(input, id) &&
            input.scenario.bookings!.products[id]?.serves.includes(m.segmentId),
        )
        .map(
          ([id, f]) =>
            (1 - (original.freshness[id]?.value ?? 100) / 100) * (f.sensitivity[m.segmentId] ?? 0),
        )
      const stale = fresh.length ? fresh.reduce((t, x) => t + x, 0) / fresh.length : 0
      const wtp = input.hidden.segments[m.segmentId]?.wtpCents ?? m.priceCents
      const drivers = [
        {
          reason: 'price' as const,
          chance: segment.churn + segment.priceChurn * Math.max(0, m.priceCents / wtp - 1),
        },
        {
          reason: 'crowding' as const,
          chance: crowded || m.waitlist.length >= segment.waitlistAt ? segment.crowdingChurn : 0,
        },
        { reason: 'freshness' as const, chance: segment.freshnessChurn * stale },
        {
          reason: 'january' as const,
          chance:
            monthOf(input, m.joinedWeek) === 1 && [2, 3].includes(monthOf(input, week))
              ? segment.januaryFade
              : 0,
        },
        {
          reason: 'aggregator' as const,
          chance: original.aggregator?.joined
            ? (c.aggregator?.cannibalisation[m.segmentId] ?? 0) / 52
            : 0,
        },
      ]
      const total = drivers.reduce((t, d) => t + d.chance, 0)
      if (rng.chance(total)) {
        let r = rng.next() * total
        m.reason =
          drivers.find((d) => {
            r -= d.chance
            return r < 0
          })?.reason ?? 'price'
        if (m.reason === 'aggregator') aggregatorCancellations++
        if (week < m.termUntil) m.inactive = true
        else if (offer.noticeWeeks === 0) end(m.reason)
        else m.noticeUntil = week + offer.noticeWeeks
      }
    }
    if (
      m.endedWeek === null &&
      (week - (m.billingWeek ?? m.joinedWeek)) % input.scenario.finance.weeksPerMonth === 0
    ) {
      if (input.scenario.bookings!.segments[m.segmentId]?.invoiced)
        fees[m.segmentId] = (fees[m.segmentId] ?? 0) + m.priceCents
      else revenueCents += m.priceCents
    }
  }
  const weeks = original.weeks.map((w) =>
    w.week === week
      ? {
          ...w,
          cancelled: w.cancelled + cancelled,
          active: members.filter((m) => m.endedWeek === null && !m.inactive).length,
          signed: members.length,
          aggregatorCancellations,
        }
      : w,
  )
  const aggregator = original.aggregator
    ? {
        ...original.aggregator,
        cancellations: original.aggregator.cancellations + aggregatorCancellations,
      }
    : null
  const invoices: Invoice[] = [...input.invoices]
  const payWeeks = { ...input.hidden.payWeeks }
  const waitsForChase = [...input.hidden.waitsForChase]
  for (const [segmentId, amountCents] of Object.entries(fees)) {
    const id = `invoice_${invoices.length + 1}`
    const hidden = input.hidden.segments[segmentId]!
    const dueDays = input.scenario.finance.invoiceDueDays
    const never = rng.chance(hidden.neverPaysShare)
    const lateDays = Math.round(rng.range(0, 2 * hidden.paymentDelayDaysMean))
    const waits = rng.chance(hidden.waitsForChaseShare)
    invoices.push({
      id,
      customerId: `membership_${segmentId}_${week}`,
      customerName: input.scenario.segments.find((seg) => seg.id === segmentId)?.name ?? segmentId,
      segmentId,
      amountCents,
      issuedWeek: week,
      dueWeek: week + Math.ceil(dueDays / 7),
      paidWeek: null,
      writtenOffWeek: null,
    })
    payWeeks[id] = never || waits ? null : week + Math.ceil((dueDays + lateDays) / 7)
    if (!never && waits) waitsForChase.push(id)
  }
  return {
    state: {
      ...input,
      invoices,
      hidden: { ...input.hidden, payWeeks, waitsForChase },
      bookings: { ...input.bookings!, leisure: { ...original, members, weeks, aggregator } },
    },
    revenueCents,
    voucherCents,
    voucherRedeemedCents,
  }
}

/** Plans visits against the remaining hard capacity; payments for memberships are separate. */
export function leisureVisits(
  input: GameState,
  existing: readonly Booking[],
  rng: Rng,
): { state: GameState; added: Booking[] } {
  const c = cfgOf(input)
  const original = input.bookings?.leisure
  if (!c || !original || !leisureOpen(input, '', input.week)) return { state: input, added: [] }
  const members = original.members.map((m) => ({ ...m, waitlist: [...m.waitlist] }))
  const all = [...existing]
  const room = leisureRoomReader(all)
  const added: Booking[] = []
  const denied: { productId: string; slotId: string; units: number }[] = []
  const week = input.week
  const pickProduct = (segmentId: string, slot: string) =>
    Object.keys(c.products)
      .sort()
      .filter(
        (id) =>
          input.scenario.bookings!.products[id]?.serves.includes(segmentId) &&
          room(input, id, slot, week, segmentId) > 0 &&
          leisureOpen(input, id, week),
      )
      .sort(
        (a, b) => room(input, b, slot, week, segmentId) - room(input, a, slot, week, segmentId),
      )[0]
  const add = (segmentId: string, slotId: string, memberId?: string, aggregatorUser?: number) => {
    const productId = pickProduct(segmentId, slotId)
    if (!productId) {
      const productId = Object.keys(c.products).find(
        (id) =>
          input.scenario.bookings!.products[id]?.serves.includes(segmentId) && shipped(input, id),
      )
      if (productId) denied.push({ productId, slotId, units: 1 })
      return false
    }
    const booking: Booking = {
      id: `leisure_${week}_${added.length + 1}`,
      segmentId,
      productId,
      week,
      units: 1,
      priceCents:
        aggregatorUser !== undefined ? (input.hidden.bookings?.leisure?.payoutCents ?? 0) : 0,
      channel: 'direct',
      bookedWeek: week,
      status: 'booked',
      slotId,
      ...(memberId !== undefined ? { memberId } : {}),
      ...(aggregatorUser !== undefined ? { aggregatorUser } : {}),
    }
    all.push(booking)
    added.push(booking)
    return true
  }
  for (const m of members) {
    if (m.endedWeek !== null || m.inactive) continue
    const offer = c.memberships?.[m.offerId]
    const segment = c.segments[m.segmentId]
    if (!offer || !segment) continue
    const n = Math.min(round(segment.visitsPerWeek, rng), m.owedVisits ?? Infinity)
    const slots = entries(segment.slotShare).filter(([id]) => offer.slots.includes(id))
    const sum = slots.reduce((t, [, share]) => t + share, 0)
    if (sum <= 0) continue
    for (let i = 0; i < n; i++) {
      let r = rng.next() * sum
      const slot =
        slots.find(([, share]) => {
          r -= share
          return r < 0
        })?.[0] ?? slots.at(-1)![0]
      if (!add(m.segmentId, slot, m.id)) m.waitlist.push(week)
    }
  }
  const a = original.aggregator
  if (a && c.aggregator) {
    const month = Math.floor((week - 1) / 52) * 12 + monthOf(input, week)
    for (const [index, user] of a.users.entries()) {
      const used = user.month === month ? user.visits : 0
      if (used >= c.aggregator.capPerMonth || !rng.chance(c.aggregator.visitsPerWeek)) continue
      const slot = leisureSlot(input, user.segmentId, rng)
      if (slot && a.slots.includes(slot)) add(user.segmentId, slot, undefined, index)
    }
  }
  return {
    state: {
      ...input,
      bookings: {
        ...input.bookings!,
        leisure: {
          ...original,
          members,
          weeks: original.weeks.map((w) => {
            if (w.week !== week) return w
            const slots = w.slots.map((x) => ({ ...x }))
            const turnedAway = { ...w.turnedAway }
            for (const d of denied) {
              turnedAway[d.slotId] = (turnedAway[d.slotId] ?? 0) + d.units
              const row = slots.find((x) => x.productId === d.productId && x.slotId === d.slotId)
              if (row) row.turnedAway += d.units
              else
                slots.push({
                  productId: d.productId,
                  slotId: d.slotId,
                  visits: 0,
                  turnedAway: d.units,
                  aggregator: 0,
                  load: 'quiet',
                })
            }
            return { ...w, slots, turnedAway }
          }),
        },
      },
    },
    added,
  }
}

/** Observed service, local-group use, class-pack redemption and platform payouts. */
export function finishLeisure(
  input: GameState,
  bookings: readonly Booking[],
): {
  state: GameState
  voucherRedeemedCents: number
  reviewPenalty: number
  extraCostsCents?: number
} {
  const c = cfgOf(input)
  const original = input.bookings?.leisure
  if (!c || !original) return { state: input, voucherRedeemedCents: 0, reviewPenalty: 0 }
  const week = input.week
  let voucherRedeemedCents = 0
  let reviewPenalty = 0
  const contracts = original.members.filter((m) => m.endedWeek === null)
  reviewPenalty +=
    (input.scenario.bookings!.reviews.cancelPenalty * contracts.filter((m) => m.inactive).length) /
    Math.max(1, contracts.length)
  const members = original.members.map((m) => ({ ...m, waitlist: [...m.waitlist] }))
  const freshness = Object.fromEntries(
    Object.entries(original.freshness).map(([id, f]) => [id, { ...f }]),
  )
  const aggregator = original.aggregator
    ? { ...original.aggregator, users: original.aggregator.users.map((u) => ({ ...u })) }
    : null
  const row = original.weeks.at(-1)!
  const slots = row.slots.map((x) => ({ ...x }))
  const month = Math.floor((week - 1) / 52) * 12 + monthOf(input, week)
  const served = bookings.filter((b) => b.week === week && b.status === 'served')
  const totalServed = served.reduce((n, b) => n + b.units, 0)
  const turnaroundCents = Object.fromEntries(
    entries(c.slotUpgrades ?? {}).map(([id, upgrade]) => {
      const active = readyAt(input, id, week)
      const units = served
        .filter(
          (b) =>
            b.slotId === upgrade.slot &&
            (input.scenario.bookings!.products[b.productId]?.capacityOf ?? b.productId) ===
              upgrade.product,
        )
        .reduce((sum, b) => sum + b.units, 0)
      const baseline = Math.max(
        0,
        leisureCapacity(input, upgrade.product, upgrade.slot, week) -
          (active ? upgrade.additional : 0),
      )
      return [id, active ? Math.max(0, units - baseline) * upgrade.unitCostCents : 0]
    }),
  )
  const extraCostsCents = Object.values(turnaroundCents).reduce((sum, cost) => sum + cost, 0)
  for (const b of served) {
    const slotId = b.slotId
    if (!slotId) continue
    let slot = slots.find((x) => x.productId === b.productId && x.slotId === slotId)
    if (!slot) {
      slot = {
        productId: b.productId,
        slotId,
        visits: 0,
        turnedAway: 0,
        aggregator: 0,
        load: 'quiet',
      }
      slots.push(slot)
    }
    slot.visits += b.units
    const f = c.freshness?.[b.productId]
    const now = freshness[b.productId]
    if (f && now) {
      now.value = Math.max(0, now.value - b.units * f.useLoss)
      now.served += b.units
      if (f.localSegments.includes(b.segmentId)) now.localGroups += b.units
      const pool = input.hidden.bookings?.leisure?.localPools[b.productId]
      if (pool !== undefined)
        now.value = Math.min(now.value, 100 * Math.max(0, 1 - now.localGroups / pool))
      reviewPenalty +=
        ((f.reviewPenalty ?? 0) *
          (f.sensitivity[b.segmentId] ?? 0) *
          (1 - now.value / 100) *
          b.units) /
        Math.max(1, totalServed)
    }
    if (b.memberId) {
      const m = members.find((x) => x.id === b.memberId)
      if (m?.owedVisits !== null && m?.owedVisits !== undefined && m.owedVisits > 0) {
        const value =
          m.owedVisits === 1 ? (m.owedCents ?? 0) : Math.floor((m.owedCents ?? 0) / m.owedVisits)
        m.owedCents = (m.owedCents ?? 0) - value
        m.owedVisits--
        voucherRedeemedCents += value
      }
    }
    if (b.aggregatorUser !== undefined && aggregator) {
      const user = aggregator.users[b.aggregatorUser]!
      if (user.month !== month) {
        user.month = month
        user.visits = 0
      }
      user.visits += b.units
      aggregator.checkins += b.units
      aggregator.payoutCents += b.priceCents * b.units
      slot.aggregator += b.units
    }
  }
  for (const [productId, p] of entries(c.products))
    for (const { id: slotId } of c.slots) {
      let slot = slots.find((x) => x.productId === productId && x.slotId === slotId)
      if (!slot) {
        slot = { productId, slotId, visits: 0, turnedAway: 0, aggregator: 0, load: 'quiet' }
        slots.push(slot)
      }
      const capacity = leisureCapacity(input, productId, slotId, week)
      const comfort = p.comfort?.[slotId] ?? capacity
      const ratio = comfort > 0 ? slot.visits / comfort : 0
      slot.load = ratio >= c.packedFrom ? 'packed' : ratio < c.quietBelow ? 'quiet' : 'busy'
      reviewPenalty += c.crowdingPenalty * Math.max(0, ratio - 1)
    }
  for (const b of bookings.filter(
    (b) => b.week === week && b.status === 'company_cancelled' && b.slotId,
  )) {
    const slot = slots.find((x) => x.productId === b.productId && x.slotId === b.slotId)
    if (slot) slot.turnedAway += b.units
  }
  const cancelled = bookings.filter(
    (b) => b.week === week && b.status === 'company_cancelled' && b.memberId,
  )
  for (const b of cancelled) {
    const m = members.find((x) => x.id === b.memberId)
    if (m) m.waitlist.push(week)
  }
  const payout = served
    .filter((b) => b.aggregatorUser !== undefined)
    .reduce((t, b) => t + b.units * b.priceCents, 0)
  const weeks = original.weeks.map((w) =>
    w.week === week
      ? {
          ...w,
          slots,
          aggregatorPayoutCents: payout,
          ...(c.slotUpgrades ? { turnaroundCents } : {}),
          active: members.filter((m) => m.endedWeek === null && !m.inactive).length,
        }
      : w,
  )
  return {
    state: {
      ...input,
      bookings: {
        ...input.bookings!,
        leisure: { ...original, members, freshness, aggregator, weeks },
      },
    },
    voucherRedeemedCents,
    reviewPenalty,
    ...(c.slotUpgrades ? { extraCostsCents } : {}),
  }
}

/** A held date is separate stock until the client confirms, with its fee credited once. */
export function holdLeisure(
  input: GameState,
  booking: Booking,
  rng: Rng,
): { state: GameState; accepted: boolean; held: boolean; revenueCents: number } {
  const c = cfgOf(input)
  const l = input.bookings?.leisure
  const s = c?.holds?.segments[booking.segmentId]
  if (!c?.holds || !l || !s || !rng.chance(s.ask))
    return { state: input, accepted: true, held: false, revenueCents: 0 }
  if (l.holdPolicy === 'none')
    return { state: input, accepted: rng.chance(s.noHoldConversion), held: false, revenueCents: 0 }
  if (l.holdPolicy === 'fee' && !rng.chance(s.feeConversion))
    return { state: input, accepted: false, held: false, revenueCents: 0 }
  const feeCents = l.holdPolicy === 'fee' ? c.holds.feeCents : 0
  const releaseWeek = rng.chance(c.holds.lateReleaseShare)
    ? booking.week
    : Math.min(booking.week, input.week + rng.int(c.holds.weeks.min, c.holds.weeks.max))
  // A same-week enquiry gets a decision now, not a hold that survives the event date.
  if (releaseWeek <= input.week)
    return { state: input, accepted: rng.chance(s.convert), held: false, revenueCents: 0 }
  const holds = [
    ...l.holds,
    {
      id: `hold_${l.holds.length + 1}`,
      booking: { ...booking },
      releaseWeek,
      status: 'held' as const,
      feeCents,
    },
  ]
  const weeks = l.weeks.map((w) => (w.week === input.week ? { ...w, held: w.held + 1 } : w))
  return {
    state: { ...input, bookings: { ...input.bookings!, leisure: { ...l, holds, weeks } } },
    accepted: true,
    held: true,
    revenueCents: feeCents,
  }
}

/** A teacher's following is drawn once; the departure counts, unlike its share, are observed. */
export function loseLeisureInstructor(input: GameState, chosen: string, rng: Rng): GameState {
  const c = cfgOf(input)
  const l = input.bookings?.leisure
  const following = input.hidden.bookings?.leisure?.instructorFollowing
  if (!c?.instructors || !l || !following) return input
  const eligible = (m: (typeof l.members)[number], role: string) =>
    m.endedWeek === null &&
    !m.inactive &&
    m.noticeUntil === null &&
    Object.keys(input.scenario.bookings!.roles[role]?.units ?? {}).some(
      (id) =>
        input.scenario.bookings!.products[id]?.serves.includes(m.segmentId) && shipped(input, id),
    )
  const roles = Object.keys(c.instructors).sort()
  const role =
    chosen === 'most_followed'
      ? roles.sort(
          (a, b) =>
            l.members.filter((m) => eligible(m, b)).length * (following[b] ?? 0) -
            l.members.filter((m) => eligible(m, a)).length * (following[a] ?? 0),
        )[0]
      : chosen
  if (!role) return input
  let stopped = 0
  let pending = 0
  const members = l.members.map((m) => {
    if (!eligible(m, role) || !rng.chance(following[role] ?? 0)) return m
    const offer = c.memberships?.[m.offerId]
    if (!offer) return m
    stopped++
    if (m.termUntil > input.week || offer.kind === 'pack')
      return { ...m, inactive: true, reason: 'instructor' as const }
    pending++
    return {
      ...m,
      inactive: true,
      noticeUntil: input.week + offer.noticeWeeks,
      reason: 'instructor' as const,
    }
  })
  return {
    ...input,
    bookings: {
      ...input.bookings!,
      leisure: {
        ...l,
        members,
        instructorDepartures: [
          ...l.instructorDepartures,
          { week: input.week, roleId: role, stopped, pending },
        ],
      },
    },
  }
}

/** A rejected enquiry has a known slot, not a sold product or an inferred theme. */
export function recordLeisureTurnAway(input: GameState, slotId: string, units: number): GameState {
  const l = input.bookings?.leisure
  if (!l) return input
  const weeks = l.weeks.map((w) =>
    w.week === input.week
      ? { ...w, turnedAway: { ...w.turnedAway, [slotId]: (w.turnedAway[slotId] ?? 0) + units } }
      : w,
  )
  return { ...input, bookings: { ...input.bookings!, leisure: { ...l, weeks } } }
}
