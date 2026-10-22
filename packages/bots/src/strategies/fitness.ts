import type { Scenario } from '@founder-mode/content'
import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
import { budgetHints } from '../pricing'
import { segmentNotes, type PlanBuilder } from '../strategy'
import type { TourismRule } from './tourism'

/** A class studio starts with its stated fit-out and paid offers, not an escape-room portfolio. */
export function fitnessWanted(
  scenario: Scenario,
  view: PlayerView,
  rule: TourismRule,
  requested: string[],
): string[] {
  const cfg = scenario.bookings!.leisure!
  const l = view.bookings!.leisure!
  const prepared = (id: string) => view.product.features.some((f) => f.id === id && f.shipped)
  const mentions = scenario.segments.flatMap((s) => segmentNotes(scenario, view, s.id).mentions)
  const premiumFeature = view.product.features.find((f) => f.id === 'reformer_pilates')
  const committed =
    !!premiumFeature &&
    (premiumFeature.shipped ||
      premiumFeature.progressHours > 0 ||
      premiumFeature.readyWeek !== null)
  const interviewCount = scenario.segments.reduce(
    (n, s) => n + segmentNotes(scenario, view, s.id).interviews,
    0,
  )
  const interest = mentions
    .filter(([id]) => id === 'reformer_pilates')
    .reduce((n, [, count]) => n + count, 0)
  const cost = view.bookings!.products.find((p) => p.id === 'reformer_pilates')!.oneOffCents
  const affordable = view.company.cashCents >= cost + 3 * view.company.monthlyFixedCostsCents
  const premium =
    rule.leisure?.reformer === 'always' ||
    committed ||
    (rule.leisure?.reformer !== 'never' &&
      l.openingWeek !== null &&
      view.week >= l.openingWeek + 8 &&
      interviewCount >= 8 &&
      interest >= Math.max(2, interviewCount / 3) &&
      affordable)
  const readyRooms = l.timetable.filter((p) => p.available !== false)
  const ids = requested.filter((id) => {
    if (id === 'reformer_pilates' || id === 'premium_pack') return premium
    if (id === 'recovery_room') return rule.temptationEarly === id
    if (id === 'spin_bikes') return false // lease first, once the second room is useful
    return !cfg.products[id]?.classPlaces || readyRooms.some((p) => p.productId === id)
  })
  // The first regular mat class needs no bike purchase and can serve the founding following.
  const offers = Object.keys(cfg.memberships ?? {}).filter((id) => id !== 'premium_pack')
  if (prepared('fit_out')) {
    for (const s of scenario.segments) {
      const notes = segmentNotes(scenario, view, s.id)
      if (notes.interviews < 4 || (rule.segment && s.id !== rule.segment)) continue
      ids.push(
        ...notes.mentions
          .map(([id]) => id)
          .filter(
            (id) =>
              id !== 'recovery_room' &&
              id !== 'spin_bikes' &&
              (id !== 'reformer_pilates' || premium),
          ),
      )
    }
    ids.push(...readyRooms.filter((p) => p.room === 'annex').map((p) => p.productId))
  }
  return [
    ...new Set([
      ...cfg.opening!.areas,
      'strength_classes',
      'booking_app',
      ...offers,
      ...ids,
      ...(premium ? ['reformer_pilates', 'premium_pack'] : []),
      ...(rule.temptationEarly ? [rule.temptationEarly] : []),
    ]),
  ]
}

/** Qualified shifts cover scheduled classes, even when nobody has booked ahead. */
export function planFitness(
  scenario: Scenario,
  view: PlayerView,
  b: PlanBuilder,
  plan: BookingsPlan,
  rule: TourismRule,
  januaryPeak: Record<string, number>,
): Record<string, number> {
  const bv = view.bookings!
  const l = bv.leisure!
  const cfg = scenario.bookings!
  const ready = (id: string) => view.product.features.some((f) => f.id === id && f.shipped)
  const rooms = new Map<string, Record<string, number>>()
  const timetable: Record<string, Record<string, number>> = {}
  const used: Record<string, number> = {}
  const contractLeft: Record<string, number> = {}
  for (const c of bv.contracts)
    if (c.working) contractLeft[c.roleId] = (contractLeft[c.roleId] ?? 0) + c.shifts
  const pool = Object.fromEntries(bv.roles.map((r) => [r.id, r.available]))
  let own = 0
  const recent = l.history.slice(-3)
  for (const row of [...l.timetable].sort((a, z) => a.productId.localeCompare(z.productId))) {
    const id = row.productId
    const bike = bv.assets.find((a) => a.products.includes(id))
    const product = bv.products.find((p) => p.id === id)!
    const enabled =
      ready('fit_out') &&
      ready(id) &&
      row.available !== false &&
      (!bike || (bike.option !== 'none' && !bike.broken)) &&
      (!rule.segment || product.serves.includes(rule.segment))
    const room = row.room ?? id
    const roomHours = rooms.get(room) ?? Object.fromEntries(l.slots.map((s) => [s.id, s.hours]))
    rooms.set(room, roomHours)
    timetable[id] = {}
    let total = 0
    for (const slot of l.slots) {
      const observations = recent.map((w) =>
        w.slots.find((s) => s.productId === id && s.slotId === slot.id),
      )
      const visits =
        observations.reduce((sum, s) => sum + (s?.visits ?? 0), 0) / Math.max(1, recent.length)
      const refused = recent.some((w) => (w.turnedAway[slot.id] ?? 0) > 0)
      const previous = row.classes[slot.id] ?? 0
      let classes = enabled ? Math.max(1, previous || 2) : 0
      if (enabled && recent.length === 3) {
        const demand = Math.ceil(visits / Math.max(1, row.places * 0.8))
        classes = Math.max(1, Math.min(previous + 1, demand + (refused ? 1 : 0)))
        // A quiet slot is tested once a month instead of paying for an empty daily class.
        if (visits === 0 && !refused && view.week % 4 !== 0) classes = 0
      }
      const key = `${id}/${slot.id}`
      if (rule.leisure?.januaryPeak && bv.month === 1 && refused)
        januaryPeak[key] = Math.max(januaryPeak[key] ?? 0, previous + 2)
      if (enabled && rule.leisure?.januaryPeak) classes = Math.max(classes, januaryPeak[key] ?? 0)
      classes = Math.min(classes, Math.floor((roomHours[slot.id] ?? 0) / (row.classHours ?? 1)))
      timetable[id]![slot.id] = classes
      roomHours[slot.id]! -= classes * (row.classHours ?? 1)
      total += classes
    }
    let need = rule.roster === 'under' ? Math.floor(total * 0.6) : total
    const roles = bv.roles
      .filter((r) => (r.units[id] ?? 0) > 0)
      .sort((a, z) => a.centsPerShift - z.centsPerShift)
    for (const r of roles) {
      const take = Math.min(need, contractLeft[r.id] ?? 0)
      contractLeft[r.id] = (contractLeft[r.id] ?? 0) - take
      used[r.id] = (used[r.id] ?? 0) + take
      need -= take
    }
    for (const r of roles) {
      if (r.founderHours === null) continue
      const take = Math.max(
        0,
        Math.min(
          need,
          (l.instructorWork?.maxClasses ?? 12) - own,
          Math.floor(Math.max(0, b.free - 18) / Math.max(1, r.founderHours)),
        ),
      )
      plan.founderShifts[r.id] = (plan.founderShifts[r.id] ?? 0) + take
      b.free -= take * r.founderHours
      own += take
      need -= take
    }
    for (const r of roles) {
      const take = Math.min(need, pool[r.id] ?? 0)
      plan.shifts[r.id] = (plan.shifts[r.id] ?? 0) + take
      used[r.id] = (used[r.id] ?? 0) + take
      pool[r.id] = (pool[r.id] ?? 0) - take
      need -= take
    }
    // Excess cover changes staffing alone, preserving the careful timetable policy.
    if (rule.roster === 'over' && total > 0 && roles[0]) {
      const r = roles[0]
      const extra = pool[r.id] ?? 0
      plan.shifts[r.id] = (plan.shifts[r.id] ?? 0) + extra
      used[r.id] = (used[r.id] ?? 0) + extra
      pool[r.id] = 0
    }
  }
  const relief = cfg.hosting?.relief
  if (
    relief &&
    bv.hostingHours > 0 &&
    view.company.cashCents > 3 * view.company.monthlyFixedCostsCents
  ) {
    const role = bv.roles.find((r) => r.id === relief.role)
    if (role) {
      const shifts = Math.ceil(bv.hostingHours / relief.hoursPerShift)
      const contracted = Math.min(shifts, contractLeft[role.id] ?? 0)
      const extra = Math.min(shifts - contracted, pool[role.id] ?? 0)
      used[role.id] = contracted + extra
      plan.shifts[role.id] = extra
    }
  }
  const slots = l.slots
    .filter((s) => {
      if (rule.channels === 'platform' || rule.leisure?.aggregator === 'all') return true
      if (rule.leisure?.aggregator === 'none') return false
      const rows = recent.flatMap((w) => w.slots.filter((r) => r.slotId === s.id))
      return !rows.some((r) => r.load === 'packed' || r.turnedAway > 0)
    })
    .map((s) => s.id)
  plan.leisure = { timetable, aggregator: { slots, leave: rule.leisure?.aggregator === 'none' } }
  // The aggregator pays actual check-ins; the separate commission listing is not that contract.
  plan.platform = false
  if (rule.channels === 'platform') {
    plan.outreach = {}
    plan.partnerships = []
  }
  return used
}

/** Interview budgets are monthly. Preserve stated ticket/offer ratios instead of charging a monthly fee per visit. */
export function priceFitness(
  scenario: Scenario,
  view: PlayerView,
  plan: BookingsPlan,
  rule: TourismRule,
): void {
  const l = view.bookings!.leisure!
  const cfg = scenario.bookings!
  plan.leisure ??= {}
  plan.leisure.offers = {}
  const baseMonthly = cfg.leisure!.memberships!.monthly_membership!.priceCents
  const hints = view.segments.flatMap((s) => budgetHints(view, s.id))
  const median = [...hints].sort((a, z) => a - z)[Math.floor(hints.length / 2)]
  const factor =
    rule.pricing === 'hints' && hints.length >= 4 && median
      ? Math.max(0.7, Math.min(1.2, median / baseMonthly))
      : 1
  for (const offer of l.members) {
    const initial = cfg.leisure!.memberships![offer.offerId]!
    plan.leisure.offers[offer.offerId] = {
      enabled: view.product.features.some((f) => f.id === offer.offerId && f.shipped),
      priceCents: Math.round((initial.priceCents * factor) / 100) * 100,
    }
  }
  for (const [id, segment] of Object.entries(cfg.segments)) {
    plan.prices[id] = {
      peak: Math.round((segment.price.peak * factor) / 100) * 100,
      off: Math.round((segment.price.off * factor) / 100) * 100,
    }
  }
  plan.platform = false
}
