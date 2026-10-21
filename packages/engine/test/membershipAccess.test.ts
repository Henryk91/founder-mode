import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import { beginLeisure, joinLeisure, leisureVisits } from '../src/systems/leisure'
import { leisurePriceBasis, leisureReviewPrice } from '../src/systems/membership'
import type { LeisureMember } from '../src/types'
import { plan } from './helpers'
import { leisureConfig, leisureScenario } from './leisure'

const rng = () => new Rng(seedRng('membership-access'))
function game(monthly = true) {
  const s = createGame(
    leisureScenario({ wtpBasis: monthly ? 'monthly' : undefined }),
    'membership-access',
  )
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.leisure!.offers.member_billing!.enabled = true
  s.bookings!.leisure!.offers.member_billing!.priceCents = 100
  return s
}
const activeMember = (): LeisureMember => ({
  id: 'member-1',
  segmentId: 'medical',
  offerId: 'member_billing',
  joinedWeek: 1,
  termUntil: 1,
  noticeUntil: null,
  endedWeek: null,
  inactive: false,
  priceCents: 13900,
  owedVisits: null,
  expiresWeek: null,
  waitlist: [],
  reason: null,
})

describe('optional membership pricing and access', () => {
  it('keeps ticket, recurring and pack review values in the same monthly units', () => {
    const s = game()
    expect(leisurePriceBasis(s, 'medical', 2600)).toBe(20800)
    expect(leisurePriceBasis(game(false), 'medical', 2600)).toBe(2600)
    s.bookings!.leisure!.members = [activeMember()]
    const booking = {
      id: 'visit',
      segmentId: 'medical',
      productId: 'basic_ordering',
      week: 1,
      units: 1,
      priceCents: 0,
      channel: 'direct' as const,
      bookedWeek: 1,
      status: 'booked' as const,
      memberId: 'member-1',
      slotId: 'evening',
    }
    expect(leisureReviewPrice(s, booking)).toBe(13900)
    s.bookings!.leisure!.members[0]!.offerId = 'shift_schedule'
    s.bookings!.leisure!.members[0]!.priceCents = 23000
    expect(leisureReviewPrice(s, booking)).toBe(18400)
  })

  it('rejects an unusable off-peak offer only when preferences are enabled', () => {
    const s = game()
    s.scenario.bookings!.leisure!.respectSlotPreferences = true
    s.scenario.bookings!.leisure!.segments.medical!.slotShare = { evening: 1 }
    s.scenario.bookings!.leisure!.memberships!.member_billing!.slots = ['daytime']
    const original = structuredClone(s)
    expect(joinLeisure(s, 'medical', 100, rng()).bookings!.leisure!.members).toHaveLength(0)
    expect(s).toEqual(original)
    s.scenario.bookings!.leisure!.respectSlotPreferences = undefined
    expect(joinLeisure(s, 'medical', 100, rng()).bookings!.leisure!.members.length).toBeGreaterThan(
      0,
    )
  })

  it('routes restricted paid visits only to their product and records a wait when it is unavailable', () => {
    let s = game()
    s.scenario.bookings!.leisure!.memberships!.member_billing!.products = ['allergy_filter']
    s.scenario.bookings!.leisure!.segments.medical!.slotShare = { evening: 1 }
    s.bookings!.leisure!.members = [activeMember()]
    expect(
      getView(s).bookings!.leisure!.members.find((m) => m.offerId === 'member_billing')!.products,
    ).toEqual(['allergy_filter'])
    s = beginLeisure(s, plan(), rng()).state
    const original = structuredClone(s)
    const result = leisureVisits(s, [], rng())
    expect(result.added).toHaveLength(2)
    expect(result.added.every((b) => b.productId === 'allergy_filter')).toBe(true)
    expect(s).toEqual(original)
    s.product.features.find((f) => f.id === 'allergy_filter')!.shippedWeek = null
    const denied = leisureVisits(s, [], rng())
    expect(denied.added).toHaveLength(0)
    expect(denied.state.bookings!.leisure!.members[0]!.waitlist).toEqual([1, 1])
  })

  it('does not apply a drop-in price curve before the membership fee test', () => {
    const next = plan({
      bookings: {
        shifts: { guide: 100 },
        founderShifts: {},
        prices: {},
        policy: null,
        platform: true,
        partnerships: [],
        outreach: {},
      },
    })
    const run = (ticket: number, monthly: boolean) => {
      const s = game(monthly)
      for (const [id, segment] of Object.entries(s.scenario.bookings!.leisure!.segments)) {
        segment.memberShare = 1
        s.bookings!.prices[id] = { peak: ticket, off: ticket }
      }
      const original = structuredClone(s)
      const result = applyBookings(s, next, rng()).state.bookings!.leisure!.members
      expect(s).toEqual(original)
      return result
    }
    const ordinary = run(2600, true)
    expect(ordinary.length).toBeGreaterThan(0)
    expect(run(1000000000, true)).toEqual(ordinary)
    expect(run(1000000000, false)).toHaveLength(0)
  })

  it('rejects unknown restricted membership products in content validation', async () => {
    const { LeisureSchema } = await import('@founder-mode/content')
    const config = leisureConfig()
    config.memberships!.member_billing!.products = ['missing']
    expect(LeisureSchema.safeParse(config).success).toBe(false)
  })
})
