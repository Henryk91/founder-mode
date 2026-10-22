import { describe, expect, it } from 'vitest'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { beginLeisure, joinLeisure, leisureVisits, finishLeisure } from '../src/systems/leisure'
import { applyBookings } from '../src/systems/bookings'
import { finishQualifications } from '../src/systems/qualifications'
import type { Booking, LeisureMember } from '../src/types'
import { LeisureSchema, type Scenario } from '@founder-mode/content'
import { leisureScenario, leisureConfig } from './leisure'
import { plan } from './helpers'

const rng = () => new Rng(seedRng('personal-skills'))
const q = {
  levels: {
    belay: { name: 'Top-rope belay', requires: [] },
    lead: { name: 'Lead climbing', requires: ['belay'] },
  },
  initial: { medical: { belay: { min: 0, max: 0 } } },
  courseMembership: { invoice_export: 1 },
}
function game(enabled = true) {
  const raw = leisureScenario({
    ...(enabled ? { qualifications: q } : {}),
    products: {
      basic_ordering: { capacity: { daytime: 100, evening: 100 } },
      allergy_filter: { capacity: { daytime: 4, evening: 4 } },
      invoice_export: { capacity: { daytime: 6, evening: 6 } },
    },
    aggregator: {
      name: 'Turnsaldo',
      payoutCents: { min: 1000, max: 1000 },
      capPerMonth: 8,
      noticeWeeks: 4,
      users: { medical: { min: 2, max: 2 } },
      visitsPerWeek: 1,
      cannibalisation: {},
    },
  })
  const spec = { ...raw, bookings: raw.bookings as NonNullable<Scenario['bookings']> }
  spec.bookings.products.basic_ordering!.needsLevel = 'belay'
  spec.bookings.products.invoice_export = {
    ...spec.bookings.products.invoice_export!,
    capacity: 6,
    serves: ['medical'],
    course: { level: 'belay' },
  }
  spec.bookings.leisure!.memberships!.member_billing!.products = [
    'basic_ordering',
    'allergy_filter',
  ]
  for (const segment of Object.values(spec.bookings.segments)) segment.base = { min: 0, max: 0 }
  const s = createGame(spec, 'personal-skills')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.leisure!.offers.member_billing = { enabled: true, priceCents: 100 }
  return s
}
const member = (id: string, levels: string[]): LeisureMember => ({
  id,
  levels,
  segmentId: 'medical',
  offerId: 'member_billing',
  joinedWeek: 1,
  termUntil: 1,
  noticeUntil: null,
  endedWeek: null,
  inactive: false,
  priceCents: 100,
  owedVisits: null,
  expiresWeek: null,
  waitlist: [],
  reason: null,
})
const course = (status: Booking['status'] = 'served'): Booking => ({
  id: 'course',
  productId: 'invoice_export',
  segmentId: 'medical',
  week: 1,
  units: 1,
  priceCents: 8900,
  channel: 'direct',
  bookedWeek: 1,
  status,
  slotId: 'evening',
})

describe('optional personal climbing qualifications', () => {
  it('keeps beginners off uncoached rope visits, with a real accessible alternative', () => {
    let s = game()
    s.bookings!.leisure!.members = [member('novice', []), member('trained', ['belay'])]
    s = beginLeisure(s, plan(), rng()).state
    const before = structuredClone(s)
    const result = leisureVisits(s, [], rng())
    expect(
      result.added
        .filter((b) => b.memberId === 'novice')
        .every((b) => b.productId === 'allergy_filter'),
    ).toBe(true)
    expect(
      result.added
        .filter((b) => b.memberId === 'trained')
        .every((b) => b.productId === 'basic_ordering'),
    ).toBe(true)
    expect(result.added.some((b) => b.productId === 'invoice_export')).toBe(false)
    expect(s).toEqual(before)
    expect(leisureVisits(s, [], rng())).toEqual(result)
  })
  it('assigns actual initial skills without exposing the hidden rate', () => {
    const s = joinLeisure(game(), 'medical', 100, rng())
    expect(s.bookings!.leisure!.members.length).toBeGreaterThan(0)
    expect(s.bookings!.leisure!.members.every((m) => m.levels?.length === 0)).toBe(true)
    const v = getView(s).bookings!.leisure!
    expect(v.qualifications!.levels.find((l) => l.id === 'belay')!.members).toBe(0)
    expect(JSON.stringify(v)).not.toMatch(/qualificationRates|"initial"/)
    expect(
      createGame(leisureScenario(), 'old-personal').hidden.bookings!.leisure!.qualificationRates,
    ).toBeUndefined()
  })
  it('cannot sell a rope-only membership to a beginner who cannot use it', () => {
    const s = game()
    s.scenario.bookings!.leisure!.memberships!.member_billing!.products = ['basic_ordering']
    expect(joinLeisure(s, 'medical', 100, rng()).bookings!.leisure!.members).toHaveLength(0)
  })
  it('teaches only the actual member or check-in user after served completion', () => {
    const s = game()
    s.bookings!.leisure!.members = [member('student', []), member('other', [])]
    const old = structuredClone(s)
    const booking = { ...course(), memberId: 'student' }
    const result = finishQualifications(s, [booking], rng())
    expect(result.bookings!.leisure!.members.map((m) => m.levels)).toEqual([['belay'], []])
    expect(result.bookings!.leisure!.qualifiedEnquiries).toEqual([])
    expect(
      finishQualifications(s, [{ ...booking, status: 'company_cancelled' }], rng()).bookings!
        .leisure!.members[0]!.levels,
    ).toEqual([])
    const user = finishQualifications(s, [{ ...course(), aggregatorUser: 0 }], rng())
    expect(user.bookings!.leisure!.aggregator!.users[0]!.levels).toEqual(['belay'])
    expect(user.bookings!.leisure!.aggregator!.users[1]!.levels).toEqual([])
    expect(s).toEqual(old)
  })
  it('turns served graduates into qualified paid-offer enquiries next week, before billing', () => {
    let s = beginLeisure(game(), plan(), rng()).state
    s = finishLeisure(s, [course()], rng()).state
    expect(s.bookings!.leisure!.members).toHaveLength(0)
    expect(s.bookings!.leisure!.qualifiedEnquiries).toEqual([
      { week: 2, segmentId: 'medical', units: 1, levels: ['belay'] },
    ])
    s.week = 2
    const r = beginLeisure(s, plan(), rng()).state
    expect(r.bookings!.leisure!.members[0]!.levels).toEqual(['belay'])
    expect(r.bookings!.leisure!.members[0]!.joinedWeek).toBe(2)
    expect(r.bookings!.leisure!.courseConversion).toEqual({ graduates: 1, enquiries: 1, joined: 1 })
    expect(r.bookings!.leisure!.qualifiedEnquiries).toEqual([])
  })
  it('keeps one learner identity through courses and does not sell the same member twice', () => {
    let s = beginLeisure(game(), plan(), rng()).state
    s = finishLeisure(s, [{ ...course(), coursePeople: ['learner-1'] }], rng()).state
    expect(s.bookings!.leisure!.qualifiedEnquiries![0]!.personId).toBe('learner-1')
    s.week = 2
    s = beginLeisure(s, plan(), rng()).state
    expect(s.bookings!.leisure!.coursePeople![0]!.memberId).toBe(
      s.bookings!.leisure!.members[0]!.id,
    )
    s.scenario.bookings!.products.invoice_export!.course!.level = 'lead'
    s = finishLeisure(
      s,
      [{ ...course(), week: 2, coursePeople: ['learner-1'], levels: ['belay'] }],
      rng(),
    ).state
    expect(s.bookings!.leisure!.members).toHaveLength(1)
    expect(s.bookings!.leisure!.members[0]!.levels).toEqual(['belay', 'lead'])
    expect(s.bookings!.leisure!.qualifiedEnquiries).toEqual([])
  })
  it('awards a real rostered course completion, never a staff cancellation', () => {
    const s = game()
    for (const segment of Object.values(s.scenario.bookings!.segments))
      segment.base = { min: 0, max: 0 }
    s.scenario.bookings!.roles.guide!.units.invoice_export = 6
    s.bookings!.bookings = [{ ...course('booked') }]
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
    const taught = applyBookings(s, roster(1), rng()).state
    expect(taught.bookings!.bookings.find((b) => b.id === 'course')!.status).toBe('served')
    expect(taught.bookings!.leisure!.qualifiedEnquiries).toEqual([
      { week: 2, segmentId: 'medical', units: 1, levels: ['belay'] },
    ])
    const cancelled = applyBookings(s, roster(0), rng()).state
    expect(cancelled.bookings!.leisure!.qualifiedEnquiries).toEqual([])
    expect(cancelled.bookings!.leisure!.courseConversion!.graduates).toBe(0)
  })
  it('includes prerequisites of advanced earned skills and validates optional content', () => {
    const s = game()
    s.scenario.bookings!.products.invoice_export!.course!.level = 'lead'
    const r = finishQualifications(s, [course()], rng())
    expect(r.bookings!.leisure!.qualifiedEnquiries![0]!.levels).toEqual(['belay', 'lead'])
    expect(LeisureSchema.parse(leisureConfig({ qualifications: q })).qualifications).toEqual(q)
    expect(getView(game(false)).bookings!.leisure!.qualifications).toBeUndefined()
  })
})
