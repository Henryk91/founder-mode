import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings, bookingTotals, occupancyPct } from '../src/systems/bookings'
import { leisureScenario } from './leisure'
import { plan } from './helpers'

it('compacts class visits while preserving last-year calendars and lifetime totals', () => {
  const spec = leisureScenario({
    classStaffing: true,
    products: { basic_ordering: { capacity: {}, classPlaces: 8, classHours: 1, room: 'studio' } },
  })
  for (const s of Object.values(spec.bookings.segments)) s.base = { min: 0, max: 0 }
  let state = createGame(spec, 'visit-archive')
  state.product.features = state.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  state.bookings!.leisure!.timetable.basic_ordering = { daytime: 1, evening: 1 }
  const roster = plan({
    bookings: {
      shifts: { guide: 2 },
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    },
  })
  for (let week = 1; week <= 60; week++) {
    state = {
      ...state,
      week,
      bookings: {
        ...state.bookings!,
        bookings: [
          ...state.bookings!.bookings,
          {
            id: `visit-${week}`,
            productId: 'basic_ordering',
            segmentId: 'small_offices',
            week,
            units: 2,
            priceCents: 1000,
            channel: 'direct',
            bookedWeek: week,
            status: 'booked',
            slotId: 'daytime',
          },
        ],
      },
    }
    const before = structuredClone(state)
    state = applyBookings(state, roster, new Rng(seedRng(`visit-${week}`))).state
    expect(before.bookings!.bookings.at(-1)!.status).toBe('booked')
  }
  expect(state.bookings!.bookings.map((b) => b.week)).toEqual([59, 60])
  expect(state.bookings!.leisure!.traffic).toHaveLength(54)
  expect(
    bookingTotals(state.bookings!)
      .filter((b) => b.status === 'served')
      .reduce((n, b) => n + b.units, 0),
  ).toBe(120)
  state = { ...state, week: 61 }
  const v = getView(state).bookings!
  expect(v.lastWeek.find((p) => p.productId === 'basic_ordering')).toEqual({
    productId: 'basic_ordering',
    came: 2,
    served: 2,
  })
  expect(v.servedByWeek).toEqual([2, 2, 2, 2, 2])
  expect(
    v.calendar.find((p) => p.productId === 'basic_ordering')!.cells.every((c) => c.lastYear === 2),
  ).toBe(true)
  expect(occupancyPct(state)).toBe(13)
  expect(JSON.stringify(v.leisure)).not.toContain('nonCancelled')
})

describe('ordinary leisure history', () => {
  it('does not add compact traffic records without class-aware content', () => {
    const s = createGame(leisureScenario(), 'old-visits')
    expect(s.bookings!.leisure!.traffic).toBeUndefined()
  })
})
