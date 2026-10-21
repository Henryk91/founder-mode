import type { LeisureConfig } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { Booking, GameState, LeisureExtraTotals, LeisureState, LeisureView } from '../types'

const entries = <T>(value: Record<string, T>) =>
  Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
const shipped = (s: GameState, id: string) =>
  s.product.features.some((f) => f.id === id && f.shippedWeek !== null)
const emptyExtra = (): LeisureExtraTotals => ({ units: 0, receiptsCents: 0, costsCents: 0 })

export function initVenue(c: LeisureConfig): Pick<LeisureState, 'noise' | 'extras'> {
  return {
    ...(c.noise
      ? {
          noise: {
            complaintWeeks: [],
            restrictions: [],
            lateEvents: 0,
            cancelledBookings: 0,
            releasedHolds: 0,
            refundsCents: 0,
            receiptsCents: 0,
            variableCents: 0,
            staffCents: 0,
            assetCents: 0,
            turnaroundCents: 0,
            setupCents: 0,
            setupPaid: [],
          },
        }
      : {}),
    ...(c.extras
      ? { extras: Object.fromEntries(entries(c.extras).map(([id]) => [id, emptyExtra()])) }
      : {}),
  }
}

export function venueOpen(s: GameState, product: string, week: number): boolean {
  const c = s.scenario.bookings?.leisure?.noise
  if (!c?.products.includes(product)) return true
  return !(s.bookings?.leisure?.noise?.restrictions ?? []).some(
    (r) => r.fromWeek <= week && week < r.untilWeek,
  )
}

/** Release illegal future dates as soon as their restriction is known, refunding once. */
export function beginVenue(input: GameState): { state: GameState; refundCents: number } {
  const c = input.scenario.bookings?.leisure?.noise
  const l = input.bookings?.leisure
  const noise = l?.noise
  if (!c || !l || !noise) return { state: input, refundCents: 0 }
  let refundCents = 0
  let cancelled = 0
  let released = 0
  const bookings = input.bookings!.bookings.map((b) => {
    if (b.status !== 'booked' || b.week < input.week || venueOpen(input, b.productId, b.week))
      return b
    const refund = Math.max(0, (b.depositCents ?? 0) - (b.refundedCents ?? 0))
    refundCents += refund
    cancelled += b.units
    return {
      ...b,
      status: 'company_cancelled' as const,
      refundedCents: (b.refundedCents ?? 0) + refund,
    }
  })
  const holds = l.holds.map((h) => {
    if (h.status !== 'held' || venueOpen(input, h.booking.productId, h.booking.week)) return h
    const refund = Math.max(0, h.feeCents - (h.refundedCents ?? 0))
    refundCents += refund
    released++
    return { ...h, status: 'released' as const, refundedCents: (h.refundedCents ?? 0) + refund }
  })
  if (!cancelled && !released) return { state: input, refundCents: 0 }
  return {
    state: {
      ...input,
      bookings: {
        ...input.bookings!,
        bookings,
        leisure: {
          ...l,
          holds,
          noise: {
            ...noise,
            cancelledBookings: noise.cancelledBookings + cancelled,
            releasedHolds: noise.releasedHolds + released,
            refundsCents: noise.refundsCents + refundCents,
          },
        },
      },
    },
    refundCents,
  }
}

export function venueComplaints(s: GameState): number {
  const window = s.scenario.bookings?.leisure?.noise?.windowWeeks
  return window
    ? (s.bookings?.leisure?.noise?.complaintWeeks ?? []).filter((week) => week > s.week - window)
        .length
    : 0
}

/** Values come from the actual booking and payroll ledgers, not projected demand. */
export type VenueMoney = {
  receiptsCents: number
  variableCents: number
  assetCents: number
  payrollCents: number
}

export function finishVenue(
  input: GameState,
  bookings: readonly Booking[],
  rng: Rng | undefined,
  money: VenueMoney | undefined,
  turnaround: Record<string, number>,
): { state: GameState; receiptsCents: number; costsCents: number } {
  const c = input.scenario.bookings?.leisure
  const l = input.bookings?.leisure
  if (!c || !l || (!c.noise && !c.extras)) return { state: input, receiptsCents: 0, costsCents: 0 }
  if (c.noise && !rng) throw Error('Noise accounting requires the game PRNG')
  const week = input.week
  const served = bookings.filter((b) => b.week === week && b.status === 'served')
  const late = (b: Booking) => c.noise?.products.includes(b.productId) ?? false
  const noise = l.noise
    ? {
        ...l.noise,
        complaintWeeks: [...l.noise.complaintWeeks],
        restrictions: l.noise.restrictions.map((r) => ({ ...r })),
        setupPaid: [...l.noise.setupPaid],
      }
    : undefined
  const extras = Object.fromEntries(
    entries(l.extras ?? {}).map(([id, total]) => [id, { ...total }]),
  )
  const current: Record<string, LeisureExtraTotals> = {}
  let receiptsCents = 0
  let costsCents = 0
  for (const [id, extra] of entries(c.extras ?? {})) {
    const total = emptyExtra()
    if (shipped(input, id))
      for (const b of served) {
        const term = extra.segments[b.segmentId]
        if (!term) continue
        const receipt = b.units * Math.round(term.grossCents * term.revenueShare)
        const cost = b.units * term.unitCostCents
        total.units += b.units
        total.receiptsCents += receipt
        total.costsCents += cost
        if (noise && late(b)) {
          noise.receiptsCents += receipt
          noise.variableCents += cost
        }
      }
    current[id] = total
    const previous = extras[id] ?? emptyExtra()
    extras[id] = {
      units: previous.units + total.units,
      receiptsCents: previous.receiptsCents + total.receiptsCents,
      costsCents: previous.costsCents + total.costsCents,
    }
    receiptsCents += total.receiptsCents
    costsCents += total.costsCents
  }
  if (noise && c.noise) {
    const due = bookings.filter((b) => b.week === week && b.refundedCents === undefined)
    const allUnits = due.reduce((sum, b) => sum + b.units, 0)
    const lateUnits = due.filter(late).reduce((sum, b) => sum + b.units, 0)
    noise.receiptsCents += money?.receiptsCents ?? 0
    noise.variableCents += money?.variableCents ?? 0
    noise.assetCents += money?.assetCents ?? 0
    noise.staffCents += allUnits
      ? Math.round(((money?.payrollCents ?? 0) * lateUnits) / allUnits)
      : 0
    for (const [id, cost] of entries(turnaround)) {
      const upgrade = c.slotUpgrades?.[id]
      if (!upgrade) continue
      const here = served.filter(
        (b) =>
          b.slotId === upgrade.slot &&
          (input.scenario.bookings!.products[b.productId]?.capacityOf ?? b.productId) ===
            upgrade.product,
      )
      const units = here.reduce((sum, b) => sum + b.units, 0)
      const lateUnits = here.filter(late).reduce((sum, b) => sum + b.units, 0)
      if (units) noise.turnaroundCents += Math.round((cost * lateUnits) / units)
    }
    for (const id of c.noise.setupProducts) {
      const paid =
        l.buildPaid.includes(id) || shipped(input, id) || input.loan?.bought?.includes(id)
      if (!paid || noise.setupPaid.includes(id)) continue
      noise.setupPaid.push(id)
      noise.setupCents += input.scenario.bookings!.products[id]?.oneOffCents ?? 0
    }
    const chance = shipped(input, c.noise.insulation)
      ? c.noise.insulatedComplaint
      : c.noise.complaint
    for (const b of served.filter(late))
      for (let n = 0; n < b.units; n++) {
        noise.lateEvents++
        if (!rng!.chance(chance)) continue
        noise.complaintWeeks.push(week)
        const count = noise.complaintWeeks.filter((w) => w > week - c.noise!.windowWeeks).length
        if (
          count >= c.noise.restrictAt &&
          !noise.restrictions.some((r) => r.fromWeek <= week + 1 && week + 1 < r.untilWeek)
        ) {
          const fromWeek = week + 1
          noise.restrictions.push({ fromWeek, untilWeek: fromWeek + c.noise.restrictionWeeks })
        }
      }
  }
  const weeks = c.extras
    ? l.weeks.map((w) => (w.week === week ? { ...w, extras: current } : w))
    : l.weeks
  const completed: GameState = {
    ...input,
    bookings: {
      ...input.bookings!,
      leisure: { ...l, ...(noise ? { noise } : {}), ...(c.extras ? { extras } : {}), weeks },
    },
  }
  const released = beginVenue(completed)
  return { state: released.state, receiptsCents: receiptsCents - released.refundCents, costsCents }
}

export function venueView(s: GameState): Pick<LeisureView, 'noise' | 'extras'> {
  const c = s.scenario.bookings?.leisure
  const l = s.bookings?.leisure
  if (!c || !l) return {}
  const noise = l.noise
  const restriction = noise?.restrictions.filter((r) => r.untilWeek > s.week).at(-1)
  const costs = noise
    ? noise.variableCents +
      noise.staffCents +
      noise.assetCents +
      noise.turnaroundCents +
      noise.setupCents
    : 0
  return {
    ...(c.noise && noise
      ? {
          noise: {
            complaints: venueComplaints(s),
            totalComplaints: noise.complaintWeeks.length,
            warning: venueComplaints(s) >= c.noise.warningAt,
            restricted: !!restriction && restriction.fromWeek <= s.week,
            restrictedFrom: restriction?.fromWeek ?? null,
            restrictedUntil: restriction?.untilWeek ?? null,
            restrictions: noise.restrictions.length,
            lateEvents: noise.lateEvents,
            cancelledBookings: noise.cancelledBookings,
            releasedHolds: noise.releasedHolds,
            refundsCents: noise.refundsCents,
            receiptsCents: noise.receiptsCents,
            variableCents: noise.variableCents,
            staffCents: noise.staffCents,
            assetCents: noise.assetCents,
            turnaroundCents: noise.turnaroundCents,
            setupCents: noise.setupCents,
            costsCents: costs,
            netCents: noise.receiptsCents - costs,
          },
        }
      : {}),
    ...(c.extras
      ? {
          extras: entries(c.extras).map(([id, extra]) => {
            const total = l.extras?.[id] ?? emptyExtra()
            const recent = l.weeks.filter((w) => w.week > s.week - 5)
            return {
              productId: id,
              name: s.scenario.features.find((f) => f.id === id)?.name ?? id,
              active: shipped(s, id),
              terms: entries(extra.segments).map(([segmentId, term]) => ({ segmentId, ...term })),
              ...total,
              receiptsLast4Cents: recent.reduce(
                (sum, w) => sum + (w.extras?.[id]?.receiptsCents ?? 0),
                0,
              ),
              costsLast4Cents: recent.reduce(
                (sum, w) => sum + (w.extras?.[id]?.costsCents ?? 0),
                0,
              ),
            }
          }),
        }
      : {}),
  }
}
