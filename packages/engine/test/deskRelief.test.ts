import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings, hostingHours } from '../src/systems/bookings'
import { leisureScenario } from './leisure'
import { plan } from './helpers'

function game(relief = true) {
  const scenario = leisureScenario()
  scenario.bookings.hosting = {
    hoursPerUnit: 1,
    maxHours: 8,
    ...(relief ? { relief: { role: 'desk', hoursPerShift: 2 } } : {}),
  }
  scenario.bookings.roles.desk = {
    name: 'Desk cover',
    kind: 'floor',
    centsPerShift: 3600,
    units: {},
    available: Array(12).fill(8),
    contracts: {
      part_time: {
        centsPerWeek: 13000,
        shifts: 4,
        noticeWeeks: 2,
        quality: 0,
        max: 1,
      },
    },
  }
  for (const segment of Object.values(scenario.bookings.segments)) segment.base = { min: 0, max: 0 }
  const s = createGame(scenario, 'desk-relief')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.bookings = [
    {
      id: 'visit',
      productId: 'basic_ordering',
      segmentId: 'small_offices',
      week: 1,
      units: 3,
      priceCents: 1000,
      channel: 'direct',
      bookedWeek: 0,
      status: 'booked',
      slotId: 'evening',
    },
  ]
  return s
}
const roster = (desk: number, guide = 1) =>
  plan({
    bookings: {
      shifts: { desk, guide },
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    },
  })
const rng = () => new Rng(seedRng('desk-relief'))

describe('optional paid desk relief', () => {
  it('pays for real cover and reduces the next founder administration once', () => {
    const s = game()
    const original = structuredClone(s)
    const out = applyBookings(s, roster(1), rng())
    const next = { ...out.state, week: 2 }
    expect(out.entries).toContainEqual({ kind: 'shifts_paid', shifts: 2, amountCents: 33600 })
    expect(next.bookings!.hostingReliefHours).toBe(2)
    expect(hostingHours(next)).toBe(1)
    expect(getView(next).bookings!.hostingReliefHours).toBe(2)
    expect(s).toEqual(original)
    expect(applyBookings(next, roster(0), rng()).state.bookings!.hostingReliefHours).toBe(0)
  })

  it('uses paid contract cover,caps the saving,and never turns desk staff into teachers', () => {
    const s = game()
    s.bookings!.contracts = [
      {
        id: 'desk-contract',
        roleId: 'desk',
        kind: 'part_time',
        name: 'Mara Kiesel',
        startWeek: 0,
        endWeek: null,
      },
    ]
    const out = applyBookings(s, roster(0), rng())
    expect(out.state.bookings!.hostingReliefHours).toBe(8)
    expect(hostingHours({ ...out.state, week: 2 })).toBe(0)
    expect(out.entries).toContainEqual({ kind: 'contracts_paid', contracts: 1, amountCents: 13000 })
    const uncovered = applyBookings(game(), roster(8, 0), rng())
    expect(uncovered.state.bookings!.bookings[0]!.status).toBe('company_cancelled')
    expect(uncovered.state.bookings!.hostingReliefHours).toBe(8)
  })

  it('preserves the original hosting calculation and view without the content switch', () => {
    const out = applyBookings(game(false), roster(1), rng())
    const next = { ...out.state, week: 2 }
    expect(hostingHours(next)).toBe(3)
    expect(next.bookings!.hostingReliefHours).toBeUndefined()
    expect(getView(next).bookings!.hostingReliefHours).toBeUndefined()
  })
})
