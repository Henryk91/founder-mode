import type { Scenario } from '@founder-mode/content'
import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
import { type PlanBuilder } from '../strategy'
import { budgetHints } from '../pricing'
import type { TourismRule } from './tourism'

export function climbingFirst(view: PlayerView, rule: TourismRule, segment: string): string[] {
  const chosen = view.bookings!.leisure!.buildChoice.filter((id) =>
    ['boulder_area', 'rope_walls'].includes(id),
  )
  if (chosen.length) return chosen
  const mode = rule.leisure?.climbingFirst
  if (mode === 'both' || rule.buildAll) return ['boulder_area', 'rope_walls']
  if (mode === 'rope' || (!mode && segment === 'committed')) return ['rope_walls']
  return ['boulder_area']
}

/** First-build variants preserve every subsequent policy and use no seed or role lookup. */
export function climbingWanted(
  scenario: Scenario,
  view: PlayerView,
  rule: TourismRule,
  requested: string[],
  segment: string,
): string[] {
  const l = view.bookings!.leisure!,
    first = climbingFirst(view, rule, segment)
  const started = scenario.bookings!.leisure!.opening!.areas.filter((id) =>
    view.product.features.some(
      (f) => f.id === id && (f.shipped || f.progressHours > 0 || f.readyWeek !== null),
    ),
  )
  const rope = [...first, ...started].includes('rope_walls')
  const firstReady = first.every((id) =>
    view.product.features.some((f) => f.id === id && f.shipped),
  )
  const names = Object.entries(scenario.bookings!.leisure!.memberships!)
    .filter(([id, offer]) => offer.serves.includes(segment) && (id !== 'kids_club' || firstReady))
    .map(([id]) => id)
  const out = ['basic_fit_out', ...first, ...started, 'online_booking', 'rental_stock', ...names]
  if (segment === 'students') {
    out.push('student_prices')
    if ([...first, ...started].includes('boulder_area')) out.push('intro_course')
  }
  if (segment === 'committed') out.push('training_area')
  if (segment === 'families' && firstReady) out.push('kids_area', 'kids_club', 'birthday_parties')
  if (rope && rule.leisure?.climbingCourses !== false) out.push('belay_course', 'lead_course')
  for (const id of requested) {
    if (
      [
        'basic_fit_out',
        'online_booking',
        'student_prices',
        'training_area',
        'rental_stock',
      ].includes(id)
    )
      out.push(id)
  }
  const repeatedPressure =
    l.history.slice(-8).filter((w) => w.slots.some((s) => s.load === 'packed' && s.turnedAway > 0))
      .length >= 3
  if (
    l.openingWeek !== null &&
    view.week > l.openingWeek + 12 &&
    repeatedPressure &&
    view.company.cashCents > 6 * view.company.monthlyFixedCostsCents
  ) {
    const next = first.includes('rope_walls') ? 'boulder_area' : 'rope_walls'
    out.push(next)
    if (next === 'rope_walls' && rule.leisure?.climbingCourses !== false)
      out.push('belay_course', 'lead_course')
  }
  if (l.openingWeek !== null && view.company.cashCents > 6 * view.company.monthlyFixedCostsCents)
    out.push('cafe_counter')
  if (rule.temptationEarly === 'speed_wall' && view.week <= 52) out.push('speed_wall')
  return [...new Set(out)].filter(
    (id) =>
      rule.leisure?.climbingCourses !== false || !['belay_course', 'lead_course'].includes(id),
  )
}

/** Service choices are budgeted before remaining hours go into building or outreach. */
export function planClimbing(
  view: PlayerView,
  b: PlanBuilder,
  plan: BookingsPlan,
  rule: TourismRule,
): Record<string, number> {
  const bv = view.bookings!,
    l = bv.leisure!,
    h = l.hall!,
    draft = plan.leisure ?? {},
    used: Record<string, number> = {}
  const contracts = (id: string) =>
    bv.contracts.filter((c) => c.roleId === id && c.working).reduce((n, c) => n + c.shifts, 0)
  const available = (id: string) =>
    Math.max(0, (bv.roles.find((r) => r.id === id)?.available ?? 0) - (plan.shifts[id] ?? 0))
  const opened = l.openingWeek !== null
  const recent = l.history
    .filter((w) => l.openingWeek !== null && w.week >= l.openingWeek)
    .slice(-4)
  const openHours = Object.fromEntries(
    l.slots.map((slot) => {
      const visits = recent.reduce(
        (n, w) => n + w.slots.filter((s) => s.slotId === slot.id).reduce((n, s) => n + s.visits, 0),
        0,
      )
      const quiet = slot.id === 'early' && recent.length === 4 && visits < 8
      return [slot.id, opened && !quiet ? slot.hours : 0]
    }),
  )
  let hours = Object.values(openHours).reduce((n, h) => n + h, 0)
  if (rule.roster === 'under') hours *= 0.6
  const desk = bv.roles.find((r) => r.id === h.deskRoleId)!
  const required = Math.ceil(hours / h.deskHoursPerShift)
  const own = desk.founderHours
    ? Math.min(
        2,
        Math.max(0, required - contracts(desk.id)),
        Math.floor(Math.max(0, b.free - 20) / desk.founderHours),
      )
    : 0
  if (own) {
    plan.founderShifts[desk.id] = own
    b.free -= own * desk.founderHours!
  }
  const paid = Math.min(available(desk.id), Math.max(0, required - own - contracts(desk.id)))
  plan.shifts[desk.id] = paid
  used[desk.id] = required - own
  const factor = rule.leisure?.climbingSetting ?? 1
  const settingHours: Record<string, number> = {},
    paidSettingHours: Record<string, number> = {}
  let paidNeeded = 0
  if (opened)
    for (const f of l.freshness.filter((f) =>
      view.product.features.some((p) => p.id === f.productId && p.shipped),
    )) {
      const total = Math.ceil((f.resetHours / 4) * factor)
      const founder = Math.min(total, Math.max(0, Math.min(6, b.free - 20)))
      settingHours[f.productId] = founder
      b.free -= founder
      paidSettingHours[f.productId] = total - founder
      paidNeeded += total - founder
    }
  if (h.settingRoleId) {
    const id = h.settingRoleId,
      per = h.settingHoursPerShift!
    const need = Math.ceil(paidNeeded / per)
    plan.shifts[id] = Math.min(available(id), Math.max(0, need - contracts(id)))
    used[id] = need
    let remaining = ((plan.shifts[id] ?? 0) + contracts(id)) * per
    for (const id of Object.keys(paidSettingHours)) {
      paidSettingHours[id] = Math.min(remaining, paidSettingHours[id]!)
      remaining -= paidSettingHours[id]!
    }
  }
  for (const extra of l.extras ?? [])
    if (extra.active && extra.staffing) {
      const { roleId, unitsPerShift } = extra.staffing
      const visits =
        recent.reduce((n, w) => n + w.slots.reduce((n, s) => n + s.visits, 0), 0) /
        Math.max(1, recent.length)
      const need = opened ? Math.ceil(visits / unitsPerShift) : 0
      plan.shifts[roleId] = Math.min(available(roleId), Math.max(0, need - contracts(roleId)))
      used[roleId] = need
    }
  const slots = l.slots
    .filter((slot) => {
      if (!(openHours[slot.id]! > 0) || rule.leisure?.aggregator === 'none') return false
      if (rule.channels === 'platform' || rule.leisure?.aggregator === 'all') return true
      const rows = recent.flatMap((w) => w.slots.filter((s) => s.slotId === slot.id))
      return (
        !rows.some((r) => r.load === 'packed' || r.turnedAway > 0) &&
        (rows.length > 0 || slot.id !== 'evening')
      )
    })
    .map((s) => s.id)
  plan.leisure = {
    ...draft,
    openHours,
    settingHours,
    paidSettingHours,
    ...(opened && (slots.length > 0 || l.aggregator?.joined || rule.leisure?.aggregator === 'none')
      ? {
          aggregator: {
            slots,
            leave: rule.leisure?.aggregator === 'none' || l.aggregator?.leavingWeek != null,
          },
        }
      : {}),
  }
  plan.platform = false
  if (rule.channels === 'platform') {
    plan.outreach = {}
    plan.partnerships = []
  }
  return used
}

export function priceClimbing(
  scenario: Scenario,
  view: PlayerView,
  plan: BookingsPlan,
  rule: TourismRule,
): void {
  const l = view.bookings!.leisure!,
    cfg = scenario.bookings!,
    lc = cfg.leisure!
  plan.leisure ??= {}
  plan.leisure.offers = {}
  for (const offer of l.members) {
    const initial = lc.memberships![offer.offerId]!,
      hints = initial.serves.flatMap((id) => budgetHints(view, id)).sort((a, b) => a - b)
    const base =
      lc.memberships![
        offer.offerId.startsWith('student_') ? 'student_monthly_membership' : 'monthly_membership'
      ]!.priceCents
    const hint = hints[Math.floor(hints.length / 2)]
    const factor =
      rule.pricing === 'hints' && hints.length >= 4 && hint
        ? Math.max(0.8, Math.min(1.2, hint / base))
        : 1
    plan.leisure.offers[offer.offerId] = {
      enabled:
        l.openingWeek !== null &&
        view.product.features.some((f) => f.id === offer.offerId && f.shipped),
      priceCents: Math.round((initial.priceCents * factor) / 100) * 100,
    }
  }
  for (const [id, seg] of Object.entries(cfg.segments)) {
    const hints = budgetHints(view, id).sort((a, b) => a - b),
      hint = hints[Math.floor(hints.length / 2)]
    const basis =
      lc.memberships![id === 'students' ? 'student_monthly_membership' : 'monthly_membership']!
        .priceCents
    const factor =
      rule.pricing === 'hints' && hints.length >= 4 && hint
        ? Math.max(0.8, Math.min(1.2, hint / basis))
        : 1
    plan.prices[id] = {
      peak: Math.round((seg.price.peak * factor) / 100) * 100,
      off: Math.round((seg.price.off * factor) / 100) * 100,
    }
  }
}
