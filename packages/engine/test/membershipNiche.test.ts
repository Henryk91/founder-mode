import { describe, expect, it } from 'vitest'
import { LeisureSchema } from '@founder-mode/content'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { runInterviews } from '../src/systems/experiments'
import { billLeisure, joinLeisure } from '../src/systems/leisure'
import { membershipWtp } from '../src/systems/membership'
import { plan } from './helpers'
import { leisureConfig, leisureScenario } from './leisure'

const rng = () => new Rng(seedRng('membership-niche'))
function game(share: number) {
  const s = createGame(
    leisureScenario({
      wtpBasis: 'monthly',
      premiumNiche: {
        feature: 'invoice_export',
        offers: ['supplier_portal'],
        segments: ['medical'],
        share: { min: share, max: share },
        wtpFactor: 2,
      },
    }),
    'membership-niche',
  )
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  for (const id of ['member_billing', 'supplier_portal']) {
    s.bookings!.leisure!.offers[id] = { enabled: true, priceCents: 100 }
  }
  return s
}

describe('optional premium demand and founding cohort', () => {
  it('can leave specialist enquiries unmet without changing legacy fallback', () => {
    const legacy = game(1)
    legacy.bookings!.leisure!.offers.supplier_portal!.enabled = false
    expect(
      joinLeisure(legacy, 'medical', 100, rng()).bookings!.leisure!.members.length,
    ).toBeGreaterThan(0)
    const strict = structuredClone(legacy)
    strict.scenario.bookings!.leisure!.premiumNiche!.requirePreferredOffer = true
    const before = structuredClone(strict)
    expect(joinLeisure(strict, 'medical', 100, rng()).bookings!.leisure!.members).toEqual([])
    expect(strict).toEqual(before)
    strict.bookings!.leisure!.offers.supplier_portal!.enabled = true
    expect(
      joinLeisure(strict, 'medical', 100, rng()).bookings!.leisure!.members.length,
    ).toBeGreaterThan(0)
  })

  it('keeps the founder’s original following on its paid ordinary fallback', () => {
    const s = game(1),
      l = s.bookings!.leisure!
    s.scenario.bookings!.leisure!.premiumNiche!.requirePreferredOffer = true
    s.scenario.bookings!.leisure!.foundingFollowing = {
      segment: 'medical',
      count: { min: 8, max: 8 },
      weeks: 4,
    }
    s.hidden.bookings!.leisure!.foundingFollowing = 8
    l.foundingFollowing = { invited: 0, joined: 0 }
    l.openingWeek = 1
    l.offers.supplier_portal!.enabled = false
    const joined = joinLeisure(s, 'medical', 0, rng())
    expect(joined.bookings!.leisure!.foundingFollowing!.joined).toBeGreaterThan(0)
    expect(joined.bookings!.leisure!.members.every((m) => m.offerId === 'member_billing')).toBe(
      true,
    )
    expect(billLeisure(joined, rng()).revenueCents).toBe(
      joined.bookings!.leisure!.members.length * 100,
    )
  })

  it('renews an accepted ordinary intro without redrawing an unavailable specialist requirement', () => {
    const s = joinLeisure(game(0), 'medical', 100, rng())
    const l = s.bookings!.leisure!,
      c = s.scenario.bookings!.leisure!
    s.week = 2
    c.premiumNiche!.requirePreferredOffer = true
    s.hidden.bookings!.leisure!.premiumInterest = 1
    l.offers.supplier_portal!.enabled = false
    c.memberships!.shift_schedule = {
      ...c.memberships!.shift_schedule!,
      kind: 'intro',
      validWeeks: 1,
      convert: 1,
    }
    l.members = [{ ...l.members[0]!, offerId: 'shift_schedule', expiresWeek: 2 }]
    const result = billLeisure(s, rng())
    expect(result.state.bookings!.leisure!.members[0]!.offerId).toBe('member_billing')
    expect(result.state.bookings!.leisure!.members[0]!.endedWeek).toBeNull()
    expect(result.revenueCents).toBe(100)
  })

  it('changes actual paid-offer preference by the drawn niche and signals it in interviews', () => {
    const interested = game(1)
    const original = structuredClone(interested)
    const premium = joinLeisure(interested, 'medical', 100, rng())
    expect(premium.bookings!.leisure!.members.length).toBeGreaterThan(0)
    expect(premium.bookings!.leisure!.members.every((m) => m.offerId === 'supplier_portal')).toBe(
      true,
    )
    const ordinary = joinLeisure(game(0), 'medical', 100, rng())
    expect(ordinary.bookings!.leisure!.members.every((m) => m.offerId === 'member_billing')).toBe(
      true,
    )
    const hints = runInterviews(interested, plan({ interviews: { medical: 4 } }), rng())
    expect(hints.outcomes).toHaveLength(4)
    expect(hints.outcomes.every((o) => o.evidence.mentionedFeatureId === 'invoice_export')).toBe(
      true,
    )
    expect(membershipWtp(interested, 'medical', 'supplier_portal', 10000)).toBe(20000)
    expect(membershipWtp(interested, 'medical', 'member_billing', 10000)).toBe(10000)
    expect(JSON.stringify(getView(premium))).not.toContain('premiumInterest')
    expect(interested).toEqual(original)
    expect(joinLeisure(interested, 'medical', 100, rng())).toEqual(premium)
  })

  it('introduces a finite opening cohort and collects actual membership fees', () => {
    let s = createGame(
      leisureScenario({
        foundingFollowing: {
          segment: 'medical',
          count: { min: 8, max: 8 },
          weeks: 4,
        },
      }),
      'founding-cohort',
    )
    s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
    s.bookings!.leisure!.offers.member_billing = { enabled: true, priceCents: 100 }
    let receipts = 0
    for (let week = 1; week <= 4; week++) {
      s = { ...s, week }
      s = joinLeisure(s, 'medical', 0, rng())
      expect(s.bookings!.leisure!.foundingFollowing!.invited).toBe(2 * week)
      const billed = billLeisure(s, rng())
      receipts += billed.revenueCents
      s = billed.state
    }
    const cohort = s.bookings!.leisure!.foundingFollowing!
    expect(cohort.joined).toBeGreaterThan(0)
    expect(cohort.joined).toBeLessThanOrEqual(8)
    expect(receipts).toBe(cohort.joined * 100)
    expect(getView(s).bookings!.leisure!.foundingFollowing).toEqual(cohort)
    const next = joinLeisure({ ...s, week: 5 }, 'medical', 0, rng())
    expect(next.bookings!.leisure!.foundingFollowing).toEqual(cohort)
    expect(next.bookings!.leisure!.members).toEqual(s.bookings!.leisure!.members)
  })

  it('does not add a cohort or a hidden interest field to unconfigured games', () => {
    const s = createGame(leisureScenario(), 'no-membership-niche')
    expect(s.hidden.bookings!.leisure!.premiumInterest).toBeUndefined()
    expect(s.hidden.bookings!.leisure!.foundingFollowing).toBeUndefined()
    expect(s.bookings!.leisure!.foundingFollowing).toBeUndefined()
    expect(getView(s).bookings!.leisure!.foundingFollowing).toBeUndefined()
  })

  it('replays a real class opening with premium evidence and a paid founding cohort', () => {
    const scenario = leisureScenario({
      wtpBasis: 'monthly',
      classStaffing: true,
      foundingFollowing: { segment: 'medical', count: { min: 8, max: 8 }, weeks: 4 },
      premiumNiche: {
        feature: 'invoice_export',
        offers: ['supplier_portal'],
        segments: ['medical'],
        share: { min: 0.5, max: 0.5 },
        wtpFactor: 2,
      },
      products: { basic_ordering: { capacity: {}, classPlaces: 8, classHours: 1, room: 'studio' } },
    })
    for (const feature of scenario.features) feature.buildHours = 1
    let state = createGame(scenario, 'membership-replay')
    for (let week = 1; week <= 8; week++) {
      const result = endWeek(
        state,
        plan({
          build:
            week === 1
              ? { basic_ordering: 1, member_billing: 1, supplier_portal: 1, invoice_export: 1 }
              : {},
          interviews: week === 1 ? { medical: 4 } : {},
          bookings: {
            shifts: { guide: 2 },
            founderShifts: {},
            prices: {},
            policy: null,
            platform: null,
            partnerships: [],
            outreach: {},
            leisure: {
              offers: {
                member_billing: { enabled: true, priceCents: 100 },
                supplier_portal: { enabled: true, priceCents: 100 },
              },
              timetable: { basic_ordering: { daytime: 1, evening: 1 } },
            },
          },
        }),
      )
      state = result.state
    }
    expect(state.bookings!.leisure!.foundingFollowing!.joined).toBeGreaterThan(0)
    expect(replay(scenario, toSave(state))).toEqual(state)
  })

  it('validates niche offers and founding segments', () => {
    const c = leisureConfig({
      premiumNiche: {
        feature: 'invoice_export',
        offers: ['missing'],
        segments: ['medical'],
        share: { min: 0, max: 1 },
        wtpFactor: 2,
      },
    })
    expect(LeisureSchema.safeParse(c).success).toBe(false)
    c.premiumNiche = undefined
    c.foundingFollowing = { segment: 'missing', count: { min: 1, max: 2 }, weeks: 4 }
    expect(LeisureSchema.safeParse(c).success).toBe(false)
  })
})
