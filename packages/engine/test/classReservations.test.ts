import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { beginLeisure, finishLeisure, leisureVisits } from '../src/systems/leisure'
import { leisureConfig, leisureScenario } from './leisure'
import { plan } from './helpers'
import type { Booking } from '../src/types'

function game(shared: boolean) {
  const segments = leisureConfig().segments
  segments.small_offices = {
    ...segments.small_offices!,
    slotShare: { evening: 1 },
    visitsPerWeek: 1,
  }
  const spec = leisureScenario({
    classStaffing: true,
    segments,
    products: { basic_ordering: { capacity: {}, classPlaces: 1, classHours: 1, room: 'studio' } },
    aggregator: {
      name: 'Turnsaldo',
      ...(shared ? { sharedQueue: true as const } : {}),
      payoutCents: { min: 1100, max: 1100 },
      capPerMonth: 8,
      noticeWeeks: 4,
      users: { small_offices: { min: 1, max: 1 } },
      visitsPerWeek: 1,
      cannibalisation: {},
    },
  })
  const s = createGame(spec, 'class-queue')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  const l = s.bookings!.leisure!
  l.timetable.basic_ordering = { evening: 1 }
  l.members = [
    {
      id: 'member-1',
      segmentId: 'small_offices',
      offerId: 'member_billing',
      joinedWeek: 1,
      termUntil: 1,
      noticeUntil: null,
      endedWeek: null,
      inactive: false,
      priceCents: 10000,
      owedVisits: null,
      expiresWeek: null,
      waitlist: [],
      reason: null,
    },
  ]
  l.aggregator!.joined = true
  l.aggregator!.slots = ['evening']
  l.aggregator!.users = [{ segmentId: 'small_offices', month: 0, visits: 0 }]
  return s
}
const rng = (seed: string) => new Rng(seedRng(seed))

describe('shared member and platform class reservations', () => {
  it('keeps legacy member priority unless content enables a shared queue', () => {
    for (let i = 0; i < 20; i++) {
      const result = leisureVisits(game(false), [], rng(`queue-${i}`))
      expect(result.added).toHaveLength(1)
      expect(result.added[0]!.memberId).toBe('member-1')
      expect(result.state.bookings!.leisure!.members[0]!.waitlist).toEqual([])
    }
    expect(getView(game(false)).bookings!.leisure!.aggregator).not.toHaveProperty('sharedQueue')
  })

  it('allocates one real place with deterministic arrivals and records refused members', () => {
    const s = game(true),
      before = structuredClone(s)
    let member = 0,
      platform = 0
    for (let i = 0; i < 20; i++) {
      const result = leisureVisits(s, [], rng(`queue-${i}`))
      expect(result).toEqual(leisureVisits(s, [], rng(`queue-${i}`)))
      expect(result.added).toHaveLength(1)
      if (result.added[0]!.memberId) member++
      else platform++
      expect(result.state.bookings!.leisure!.members[0]!.waitlist).toEqual(
        result.added[0]!.memberId ? [] : [1],
      )
    }
    expect(member).toBeGreaterThan(0)
    expect(platform).toBeGreaterThan(0)
    expect(s).toEqual(before)
    expect(getView(s).bookings!.leisure!.aggregator!.sharedQueue).toBe(true)
  })

  it('does not shuffle or draw extra randomness when platform slots are closed', () => {
    const shared = game(true),
      legacy = game(false)
    shared.bookings!.leisure!.aggregator!.slots = []
    legacy.bookings!.leisure!.aggregator!.slots = []
    const a = rng('closed'),
      b = rng('closed')
    expect(leisureVisits(shared, [], a).added).toEqual(leisureVisits(legacy, [], b).added)
    expect(a.next()).toBe(b.next())
  })

  it('reflects actual denied member reservations in class reviews once', () => {
    const s = beginLeisure(game(false), plan(), rng('review')).state
    s.bookings!.leisure!.members[0]!.waitlist = [1]
    const booking: Booking = {
      id: 'served',
      productId: 'basic_ordering',
      segmentId: 'small_offices',
      week: 1,
      units: 1,
      priceCents: 0,
      channel: 'direct',
      bookedWeek: 1,
      status: 'served',
      slotId: 'evening',
      memberId: 'member-1',
    }
    const before = structuredClone(s)
    expect(finishLeisure(s, [booking]).reviewPenalty).toBeCloseTo(
      s.scenario.bookings!.reviews.cancelPenalty / 2,
    )
    expect(s).toEqual(before)
    s.scenario.bookings!.leisure!.classStaffing = undefined
    expect(finishLeisure(s, [booking]).reviewPenalty).toBe(0)
  })
})
