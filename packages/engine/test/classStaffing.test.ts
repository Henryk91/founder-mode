import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import type { Booking } from '../src/types'
import { plan } from './helpers'
import { leisureScenario } from './leisure'

const rng = () => new Rng(seedRng('class-staffing'))
function game(enabled = true) {
  const scenario = leisureScenario({
    classStaffing: enabled ? true : undefined,
    products: { basic_ordering: { capacity: {}, classPlaces: 8, classHours: 1, room: 'studio' } },
  })
  for (const segment of Object.values(scenario.bookings.segments)) segment.base = { min: 0, max: 0 }
  scenario.bookings.roles.guide!.units.basic_ordering = 18
  const s = createGame(scenario, 'class-staffing')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.leisure!.timetable.basic_ordering = { daytime: 1, evening: 1 }
  s.bookings!.bookings = ['daytime', 'evening'].map((slotId, i): Booking => ({
    id: `class-${i}`,
    productId: 'basic_ordering',
    segmentId: 'small_offices',
    week: 1,
    units: 3,
    priceCents: 1000,
    channel: 'direct',
    bookedWeek: 0,
    status: 'booked',
    slotId,
  }))
  return s
}
const roster = (shifts: number) =>
  plan({
    bookings: {
      shifts: { guide: shifts },
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    },
  })

describe('optional class-aware staffing', () => {
  it('cannot stretch one instructor shift across two small classes', () => {
    const s = game()
    const original = structuredClone(s)
    const outcome = applyBookings(s, roster(1), rng())
    expect(outcome.state.bookings!.bookings.map((b) => b.status)).toEqual([
      'served',
      'company_cancelled',
    ])
    expect(outcome.entries).toContainEqual({ kind: 'company_cancelled', units: 3, reason: 'staff' })
    expect(getView(outcome.state).bookings!.leisure!.timetable[0]!.coveredClasses).toEqual({
      daytime: 1,
      evening: 0,
    })
    expect(s).toEqual(original)
    expect(applyBookings(s, roster(1), rng())).toEqual(outcome)
    const old = applyBookings(game(false), roster(1), rng())
    expect(old.state.bookings!.bookings.every((b) => b.status === 'served')).toBe(true)
    expect(old.state.bookings!.leisure!.classCoverage).toBeUndefined()
  })

  it('covers separate classes with separate qualified shifts and pays each once', () => {
    const outcome = applyBookings(game(), roster(2), rng())
    expect(outcome.state.bookings!.bookings.every((b) => b.status === 'served')).toBe(true)
    expect(outcome.entries).toContainEqual({ kind: 'shifts_paid', shifts: 2, amountCents: 60000 })
    expect(outcome.state.bookings!.leisure!.classCoverage!.basic_ordering).toEqual({
      daytime: 1,
      evening: 1,
    })
  })

  it('pays rostered empty classes and does not borrow their instructor for another slot', () => {
    const s = game()
    s.bookings!.bookings = s.bookings!.bookings.filter((b) => b.slotId === 'evening')
    const outcome = applyBookings(s, roster(1), rng())
    expect(outcome.state.bookings!.bookings[0]!.status).toBe('company_cancelled')
    expect(outcome.entries).toContainEqual({ kind: 'shifts_paid', shifts: 1, amountCents: 30000 })
    expect(outcome.state.bookings!.leisure!.classCoverage!.basic_ordering).toEqual({
      daytime: 1,
      evening: 0,
    })
  })
})
