import { describe, expect, it } from 'vitest'
import type { Scenario } from '@founder-mode/content'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import { beginLeisure, leisureVisits } from '../src/systems/leisure'
import { membershipMonthlyCost } from '../src/systems/membership'
import { leisureScenario } from './leisure'
import { plan } from './helpers'
import type { BookingsPlan, LeisureMember } from '../src/types'
const rng = () => new Rng(seedRng('staffed-extras'))
function game(staffed = true) {
  const spec = leisureScenario({
    products: { basic_ordering: { capacity: { daytime: 40, evening: 40 } } },
    extras: {
      invoice_export: {
        ...(staffed ? { staffing: { role: 'counter', unitsPerShift: 4 } } : {}),
        segments: { small_offices: { grossCents: 500, revenueShare: 1, unitCostCents: 200 } },
      },
    },
  })
  for (const s of Object.values(spec.bookings.segments)) s.base = { min: 0, max: 0 }
  spec.bookings.roles.counter = {
    name: 'Café cover',
    centsPerShift: 7200,
    available: Array(12).fill(10),
    units: {},
  }
  const s = createGame(spec, 'staffed-extras')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.bookings = [
    {
      id: 'visitors',
      productId: 'basic_ordering',
      segmentId: 'small_offices',
      week: 1,
      units: 7,
      priceCents: 1000,
      channel: 'direct',
      bookedWeek: 0,
      status: 'booked',
      slotId: 'daytime',
    },
  ]
  return s
}
const roster = (counter: number, guide = 1): BookingsPlan => ({
  shifts: { counter, guide },
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})

describe('paid ancillary throughput and group units', () => {
  it('earns only from real visits within dedicated paid cover,and pays wages once', () => {
    const s = game(),
      before = structuredClone(s)
    const r = applyBookings(s, plan({ bookings: roster(1) }), rng())
    expect(r.state.bookings!.leisure!.extras!.invoice_export).toEqual({
      units: 4,
      receiptsCents: 2000,
      costsCents: 800,
    })
    expect(r.entries).toContainEqual({ kind: 'shifts_paid', shifts: 2, amountCents: 37200 })
    expect(getView(r.state).bookings!.leisure!.extras![0]!.staffing).toEqual({
      roleId: 'counter',
      name: 'Café cover',
      unitsPerShift: 4,
    })
    expect(s).toEqual(before)
    expect(applyBookings(s, plan({ bookings: roster(1) }), rng())).toEqual(r)
  })
  it('makes no café receipts with no staff or no served visitors,and preserves unstaffed legacy extras', () => {
    expect(
      applyBookings(game(), plan({ bookings: roster(0) }), rng()).state.bookings!.leisure!.extras!
        .invoice_export!.units,
    ).toBe(0)
    expect(
      applyBookings(game(), plan({ bookings: roster(1, 0) }), rng()).state.bookings!.leisure!
        .extras!.invoice_export!.units,
    ).toBe(0)
    expect(
      applyBookings(game(false), plan({ bookings: roster(0) }), rng()).state.bookings!.leisure!
        .extras!.invoice_export!.units,
    ).toBe(7)
  })
  it('honours an explicitly weekly club without changing ordinary membership usage', () => {
    const s = game()
    s.bookings!.bookings = []
    const c = s.scenario.bookings!.leisure!
    c.memberships!.member_billing!.visitsPerWeek = 1
    const member: LeisureMember = {
      id: 'club',
      segmentId: 'small_offices',
      offerId: 'member_billing',
      joinedWeek: 1,
      termUntil: 1,
      noticeUntil: null,
      endedWeek: null,
      inactive: false,
      priceCents: 5500,
      owedVisits: null,
      expiresWeek: null,
      waitlist: [],
      reason: null,
    }
    s.bookings!.leisure!.members = [member]
    const begun = beginLeisure(s, plan(), rng()).state
    expect(leisureVisits(begun, [], rng()).added).toHaveLength(1)
    expect(
      getView(begun).bookings!.leisure!.members.find((m) => m.offerId === 'member_billing')!
        .visitsPerWeek,
    ).toBe(1)
    delete c.memberships!.member_billing!.visitsPerWeek
    expect(leisureVisits(begun, [], rng()).added).toHaveLength(2)
    const pack = { ...c.memberships!.shift_schedule!, visitsPerWeek: 1 }
    expect(membershipMonthlyCost(s, 'small_offices', pack, 10000)).toBe(4000)
  })
  it('sells a ten-person party as ten actual places and199 EUR,leaving individual admissions at one', () => {
    const raw = leisureScenario({
      products: {
        basic_ordering: { capacity: { daytime: 100, evening: 100 } },
        invoice_export: { capacity: { daytime: 100, evening: 100 } },
      },
    })
    const spec = { ...raw, bookings: raw.bookings as NonNullable<Scenario['bookings']> }
    for (const [id, segment] of Object.entries(spec.bookings.segments)) {
      segment.base = id === 'medical' ? { min: 40, max: 40 } : { min: 0, max: 0 }
      segment.response = { platform: 0, website: 0, partnership: 0, outreach: 0, walkIn: 1 }
      segment.price = { peak: 2000, off: 2000 }
    }
    spec.bookings.products.invoice_export = {
      ...spec.bookings.products.invoice_export!,
      serves: ['medical'],
      capacity: 100,
      ownDemand: 1,
      requestSize: { min: 10, max: 10 },
      priceFactor: 0.995,
    }
    spec.bookings.roles.guide!.units.invoice_export = 100
    let s = createGame(spec, 'party-unit')
    s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
    s = applyBookings(s, plan({ bookings: { ...roster(0), shifts: { guide: 9 } } }), rng()).state
    const parties = s.bookings!.bookings.filter((b) => b.productId === 'invoice_export')
    expect(parties.length).toBeGreaterThan(0)
    expect(parties.every((b) => b.units === 10 && b.priceCents * b.units === 19900)).toBe(true)
    expect(
      s
        .bookings!.bookings.filter((b) => b.productId === 'basic_ordering')
        .every((b) => b.units === 1),
    ).toBe(true)
  })
})
