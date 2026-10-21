import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import type { Booking } from '../src/types'
import { plan } from './helpers'
import { leisureScenario } from './leisure'

function game(workload = true) {
  const scenario = leisureScenario({
    classStaffing: true,
    instructorWorkload: workload ? { maxClasses: 3, penaltyPerOverloadedClass: 0.5 } : undefined,
    products: { basic_ordering: { capacity: {}, classPlaces: 8, classHours: 1, room: 'studio' } },
  })
  for (const segment of Object.values(scenario.bookings.segments)) segment.base = { min: 0, max: 0 }
  scenario.bookings.roles.guide!.contracts = {
    permanent: {
      shifts: 3,
      centsPerWeek: 10000,
      quality: 0,
      max: 2,
      noticeWeeks: 1,
    },
  }
  const s = createGame(scenario, 'class-workload')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.product.bugs = 0
  s.bookings!.leisure!.timetable.basic_ordering = { daytime: 3, evening: 3 }
  s.bookings!.bookings = ['daytime', 'evening'].map((slotId, i): Booking => ({
    id: `class-${i}`,
    productId: 'basic_ordering',
    segmentId: 'small_offices',
    week: 1,
    units: 6,
    priceCents: 1000,
    channel: 'direct',
    bookedWeek: 0,
    status: 'booked',
    slotId,
  }))
  return s
}
const roster = (founderShifts: Record<string, number>, shifts: Record<string, number> = {}) =>
  plan({
    bookings: {
      shifts,
      founderShifts,
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    },
  })
const rng = () => new Rng(seedRng('class-workload'))

describe('identified class-instructor workload', () => {
  it('counts one founder across teaching roles and affects actual service reviews', () => {
    const s = game()
    s.scenario.bookings!.roles.teacher = { ...s.scenario.bookings!.roles.guide!, name: 'Teacher' }
    const original = structuredClone(s)
    const out = applyBookings(s, roster({ guide: 3, teacher: 3 }), rng())
    expect(out.state.bookings!.leisure!.instructorLoads).toEqual([
      { id: 'founder', kind: 'founder', classes: 6 },
    ])
    const noLimit = structuredClone(s)
    noLimit.scenario.bookings!.leisure!.instructorWorkload = undefined
    const plain = applyBookings(noLimit, roster({ guide: 3, teacher: 3 }), rng())
    expect(plain.state.bookings!.rating! - out.state.bookings!.rating!).toBeCloseTo(0.25)
    expect(getView(out.state).bookings!.leisure!.instructorWork).toEqual({
      maxClasses: 3,
      loads: [{ id: 'founder', kind: 'founder', classes: 6 }],
    })
    expect(s).toEqual(original)
  })

  it('does not tire two separate contracted instructors as if they were one person', () => {
    const s = game()
    s.bookings!.contracts = ['a', 'b'].map((id) => ({
      id,
      roleId: 'guide',
      kind: 'permanent',
      name: id,
      startWeek: 0,
      endWeek: null,
    }))
    const out = applyBookings(s, roster({}), rng())
    expect(out.state.bookings!.leisure!.instructorLoads).toEqual([
      { id: 'a', kind: 'contract', name: 'a', classes: 3 },
      { id: 'b', kind: 'contract', name: 'b', classes: 3 },
    ])
    const noLimit = structuredClone(s)
    noLimit.scenario.bookings!.leisure!.instructorWorkload = undefined
    expect(applyBookings(noLimit, roster({}), rng()).state.bookings!.rating).toBe(
      out.state.bookings!.rating,
    )
  })

  it('treats flexible per-class cover as a pool and leaves unconfigured views unchanged', () => {
    const out = applyBookings(game(), roster({}, { guide: 6 }), rng())
    expect(out.state.bookings!.leisure!.instructorLoads).toEqual([])
    const old = applyBookings(game(false), roster({}, { guide: 6 }), rng())
    expect(old.state.bookings!.rating).toBe(out.state.bookings!.rating)
    expect(old.state.bookings!.leisure!.instructorLoads).toBeUndefined()
    expect(getView(old.state).bookings!.leisure!.instructorWork).toBeUndefined()
  })
})
