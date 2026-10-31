import { EventSchema } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, replay, respond, toSave } from '../src/index'
import { leisureScenario } from './leisure'
import { plan } from './helpers'
import type { GameState } from '../src/types'

function fixture(onOpening = true, capacity = 50) {
  const scenario = leisureScenario({
    opening: { areas: ['basic_ordering'], requires: [] },
    products: { basic_ordering: { capacity: { daytime: capacity, evening: capacity } } },
  })
  scenario.features = scenario.features.map((f) =>
    f.id === 'basic_ordering' ? { ...f, buildHours: 1 } : f,
  )
  scenario.inbox = { ...scenario.inbox, drawChance: 1, cooldownWeeks: 0 }
  for (const segment of Object.values(scenario.bookings!.segments))
    segment.base = { min: 0, max: 0 }
  scenario.events = [
    EventSchema.parse({
      id: 'opening_contacts',
      area: 'sales',
      weight: 1,
      once: true,
      when: ['week >= 1'],
      from: 'none',
      sender: 'The organiser',
      look: 'letter',
      text: 'Arrange opening invitations.',
      defaultChoice: 'wait',
      choices: [
        {
          id: 'prepare',
          label: 'Prepare',
          hours: 1,
          effects: [
            {
              type: 'guests',
              segment: 'coworking',
              count: 3,
              ...(onOpening ? { onOpening: true } : {}),
            },
            {
              type: 'guests',
              segment: 'coworking',
              count: 2,
              ...(onOpening ? { onOpening: true } : {}),
            },
            { type: 'cash', amountCents: -10000 },
          ],
        },
        { id: 'wait', label: 'Wait', hours: 0, effects: [] },
      ],
    }),
  ]
  return scenario
}
function answer(s: GameState) {
  const message = getView(s).inbox.find((m) => m.eventId === 'opening_contacts')!
  return respond(s, message.id, 'prepare')
}
const openPlan = () =>
  plan({
    build: { basic_ordering: 1 },
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
function waiting(capacity = 50) {
  const scenario = fixture(true, capacity)
  const first = endWeek(createGame(scenario, 'opening-invitations'), plan()).state
  return endWeek(answer(first), plan()).state
}

describe('opening invitations', () => {
  it('holds and accumulates paid invitations while closed, without premature complaints', () => {
    const state = waiting()
    expect(state.bookings!.leisure!.openingWeek).toBeNull()
    expect(state.bookings!.openingInvitations).toEqual({ coworking: 5 })
    expect(state.bookings!.reviews).toBe(0)
    expect(state.ledger.at(-1)!.otherCostsCents).toBe(10000)
    const later = endWeek(state, plan()).state
    expect(later.bookings!.openingInvitations).toEqual({ coworking: 5 })
    expect(later.bookings!.reviews).toBe(0)
    expect(later.ledger.at(-1)!.otherCostsCents).toBe(0)
    expect(replay(later.scenario, toSave(later))).toEqual(later)
  })

  it('exposes a copied count of promised opening invitations', () => {
    const state = waiting()
    const view = getView(state)
    expect(view.bookings!.leisure!.openingInvitations).toEqual([
      { segmentId: 'coworking', count: 5 },
    ])
    view.bookings!.leisure!.openingInvitations![0]!.count = 999
    expect(state.bookings!.openingInvitations).toEqual({ coworking: 5 })
  })

  it('waits for a full planning turn after opening, then releases once at ordinary prices', () => {
    const state = waiting()
    const before = structuredClone(state)
    const completed = endWeek(state, openPlan()).state
    expect(completed.bookings!.leisure!.openingWeek).toBe(state.week)
    expect(completed.bookings!.openingInvitations).toEqual({ coworking: 5 })
    expect(completed.bookings!.reviews).toBe(0)
    const service = openPlan()
    service.build = {}
    const opened = endWeek(completed, service).state
    expect(state).toEqual(before)
    expect(opened.bookings!.leisure!.openingWeek).toBe(state.week)
    expect(opened.bookings!.openingInvitations).toEqual({})
    const served = opened.bookings!.bookings.filter((b) => b.status === 'served')
    expect(served).toHaveLength(5)
    expect(
      served.every((b) => b.priceCents === opened.scenario.bookings!.segments.coworking!.price.off),
    ).toBe(true)
    expect(opened.ledger.at(-1)!.bookingRevenueCents).toBe(5 * served[0]!.priceCents)
    const later = endWeek(opened, plan()).state
    expect(later.ledger.at(-1)!.bookingRevenueCents).toBe(0)
    expect(later.bookings!.openingInvitations).toEqual({})
    expect(replay(later.scenario, toSave(later))).toEqual(later)
  })

  it('still refuses invitations beyond the real opening capacity', () => {
    const completed = endWeek(waiting(1), openPlan()).state
    const service = openPlan()
    service.build = {}
    const opened = endWeek(completed, service).state
    const served = opened.bookings!.bookings.filter((b) => b.status === 'served').length
    expect(served).toBeGreaterThan(0)
    expect(served).toBeLessThanOrEqual(2)
    expect(opened.bookings!.openingInvitations).toEqual({})
    expect(opened.bookings!.turnedAway.some((t) => t.segmentId === 'coworking')).toBe(true)
  })

  it('keeps ordinary guest effects immediate while closed', () => {
    const first = endWeek(createGame(fixture(false), 'opening-invitations'), plan()).state
    const state = endWeek(answer(first), plan()).state
    expect(state.bookings!.openingInvitations).toBeUndefined()
    expect(state.bookings!.reviews).toBe(5)
    expect(state.bookings!.rating).toBe(2)
  })

  it('uses opening-marked invitations immediately when already open', () => {
    const first = endWeek(createGame(fixture(), 'opening-invitations'), openPlan()).state
    const service = openPlan()
    service.build = {}
    const state = endWeek(answer(first), service).state
    expect(state.bookings!.openingInvitations).toBeUndefined()
    expect(state.bookings!.bookings.filter((b) => b.status === 'served')).toHaveLength(5)
  })
})
