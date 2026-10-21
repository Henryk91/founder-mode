import { describe, expect, it } from 'vitest'
import { createGame } from '../src/index'
import { applyBookings } from '../src/systems/bookings'
import { Rng, seedRng } from '../src/rng'
import type { Booking } from '../src/types'
import { leisureScenario } from './leisure'
import { plan } from './helpers'

function settle(
  options: {
    flag?: true
    invoiced?: boolean
    platform?: boolean
    mode?: 'strict' | 'flexible' | 'company' | 'served'
    deposit?: number
  } = {},
) {
  const mode = options.mode ?? 'strict'
  const spec = leisureScenario({ memberships: undefined, strictKeepsDeposit: options.flag })
  spec.events = []
  for (const segment of Object.values(spec.bookings.segments)) {
    segment.base = { min: 0, max: 0 }
    segment.cancel = mode === 'strict' || mode === 'flexible' ? 1 : 0
    segment.invoiced = options.invoiced ?? false
  }
  const s = createGame(spec, 'venue-deposit')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.policy = mode === 'flexible' ? 'flexible' : 'strict'
  const reservation: Booking = {
    id: 'paid_advance',
    productId: 'basic_ordering',
    segmentId: 'small_offices',
    week: 1,
    units: 1,
    priceCents: 10000,
    channel: options.platform ? 'platform' : 'direct',
    bookedWeek: 0,
    status: 'booked',
    slotId: 'evening',
    depositCents: options.deposit ?? 5000,
  }
  s.bookings!.bookings = [reservation]
  const before = structuredClone(s)
  const result = applyBookings(
    s,
    plan({
      bookings: {
        shifts: mode === 'company' ? {} : { guide: 1 },
        founderShifts: {},
        prices: {},
        policy: null,
        platform: null,
        partnerships: [],
        outreach: {},
      },
    }),
    new Rng(seedRng('venue-deposit')),
  )
  expect(s).toEqual(before)
  return result
}

describe('venue deposit-only strict terms', () => {
  it.each([false, true])('keeps only the advance without an invoice, invoiced=%s', (invoiced) => {
    const r = settle({ flag: true, invoiced })
    expect(r.state.bookings!.bookings[0]!.status).toBe('cancelled_paid')
    expect(r.revenueCents).toBe(0)
    expect(r.state.invoices).toEqual([])
    expect(r.state.bookings!.earned!.basic_ordering).toBe(5000)
  })
  it.each([false, true])('pays commission on the retained deposit, invoiced=%s', (invoiced) => {
    const r = settle({ flag: true, invoiced, platform: true })
    expect(r.revenueCents).toBe(-1250)
    expect(r.state.invoices).toEqual([])
    expect(r.state.bookings!.earned!.basic_ordering).toBe(3750)
  })
  it('collects nothing when no deposit was paid', () => {
    const r = settle({ flag: true, invoiced: true, platform: true, deposit: 0 })
    expect(r.revenueCents).toBe(0)
    expect(r.state.invoices).toEqual([])
    expect(r.state.bookings!.earned!.basic_ordering).toBe(0)
  })
  it.each(['flexible', 'company'] as const)('still refunds %s cancellations in full', (mode) => {
    const r = settle({ flag: true, mode })
    expect(r.revenueCents).toBe(-5000)
    expect(r.state.invoices).toEqual([])
  })
  it('still collects the remaining full price when the event takes place', () => {
    expect(settle({ flag: true, mode: 'served' }).revenueCents).toBe(5000)
  })
  it('preserves full-price strict settlement without the venue flag', () => {
    const r = settle()
    expect(r.revenueCents).toBe(5000)
    expect(r.state.bookings!.earned!.basic_ordering).toBe(10000)
  })
})
