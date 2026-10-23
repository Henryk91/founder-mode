import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { applyBookings } from '../src/systems/bookings'
import { leisureVisits } from '../src/systems/leisure'
import { membershipMonthlyCost } from '../src/systems/membership'
import { Rng, seedRng } from '../src/rng'
import { leisureScenario } from './leisure'
import { plan } from './helpers'
const rng = () => new Rng(seedRng('aggregator-payment'))
function game(direct: boolean) {
  const spec = leisureScenario({
    aggregator: {
      name: 'Turnsaldo',
      ...(direct ? { payOnVisit: true as const } : {}),
      payoutCents: { min: 1100, max: 1100 },
      capPerMonth: 4,
      noticeWeeks: 13,
      users: { small_offices: { min: 1, max: 1 } },
      visitsPerWeek: 1,
      cannibalisation: {},
    },
  })
  for (const seg of Object.values(spec.bookings.segments)) seg.base = { min: 0, max: 0 }
  spec.bookings.segments.small_offices!.invoiced = true
  const s = createGame(spec, 'aggregator-payment')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.bookings = [
    {
      id: 'checkin',
      productId: 'basic_ordering',
      segmentId: 'small_offices',
      week: 1,
      units: 1,
      priceCents: 1100,
      channel: 'direct',
      bookedWeek: 1,
      status: 'booked',
      slotId: 'evening',
      aggregatorUser: 0,
    },
  ]
  return s
}
const roster = () =>
  plan({
    bookings: {
      shifts: { guide: 1 },
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    },
  })
describe('content-enabled aggregator settlement', () => {
  it('pays a corporate-labelled check-in without inventing an invoice to that company', () => {
    const s = game(true),
      before = structuredClone(s),
      r = applyBookings(s, roster(), rng())
    expect(r.state.bookings!.bookings[0]!.status).toBe('served')
    expect(r.revenueCents).toBe(1100)
    expect(r.state.invoices).toEqual([])
    expect(r.state.bookings!.leisure!.aggregator!.payoutCents).toBe(1100)
    expect(s).toEqual(before)
    expect(applyBookings(s, roster(), rng())).toEqual(r)
  })
  it('preserves the older segment invoice path when the content flag is absent', () => {
    const r = applyBookings(game(false), roster(), rng())
    expect(r.revenueCents).toBe(0)
    expect(r.state.invoices).toHaveLength(1)
    expect(r.state.invoices[0]!.amountCents).toBe(1100)
  })
  it('uses an explicitly stated offer frequency for both visits and the pack budget basis', () => {
    const s = game(true),
      l = s.scenario.bookings!.leisure!,
      offer = l.memberships!.shift_schedule!
    offer.visitsPerWeek = 1
    const member = {
      id: 'weekly-pack',
      segmentId: 'small_offices',
      offerId: 'shift_schedule',
      joinedWeek: 1,
      termUntil: 1,
      noticeUntil: null,
      endedWeek: null,
      inactive: false,
      priceCents: 10000,
      owedVisits: 10,
      expiresWeek: 26,
      waitlist: [],
      reason: null,
    }
    s.bookings!.leisure!.members = [member]
    s.bookings!.bookings = []
    expect(membershipMonthlyCost(s, 'small_offices', offer, 10000)).toBe(4000)
    const visits = leisureVisits(s, [], rng()).added
    expect(visits.filter((b) => b.memberId === 'weekly-pack')).toHaveLength(1)
    expect(
      getView(s).bookings!.leisure!.members.find((m) => m.offerId === 'shift_schedule')!
        .visitsPerWeek,
    ).toBe(1)
    delete offer.visitsPerWeek
    expect(membershipMonthlyCost(s, 'small_offices', offer, 10000)).toBe(8000)
  })
})
