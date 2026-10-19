import { conditionValue } from '../src/systems/conditions'
import { viewConditionValue } from '../src/systems/viewConditions'
import { describe, expect, it } from 'vitest'
import { ScenarioSchema, EventSchema, loadScenario } from '@founder-mode/content'
import { respond } from '../src/systems/inbox'
import { canFinance, settleLoans } from '../src/systems/loan'
import { clonePlan, validatePlan } from '../src/plan'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import {
  beginLeisure,
  billLeisure,
  finishLeisure,
  holdLeisure,
  leisureCapacity,
  leisureAppeal,
  leisureOpen,
  leisureRoom,
  leisureValid,
  leisureVisits,
  loseLeisureInstructor,
  joinLeisure,
  recordLeisureTurnAway,
} from '../src/systems/leisure'
import type { Booking, GameState, LeisureMember, WeekPlan } from '../src/types'
import { plan } from './helpers'
import { leisureConfig, leisureScenario } from './leisure'

const rng = () => new Rng(seedRng('leisure-fixture'))
const game = (over: Parameters<typeof leisureScenario>[0] = {}) =>
  createGame(leisureScenario(over), 'leisure-fixture')
const open = (s: GameState): GameState => ({
  ...s,
  product: { ...s.product, features: s.product.features.map((f) => ({ ...f, shippedWeek: 0 })) },
})
const start = (s: GameState) => beginLeisure(s, plan(), rng()).state
const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'test_booking',
  productId: 'basic_ordering',
  segmentId: 'small_offices',
  week: 1,
  units: 1,
  priceCents: 10000,
  channel: 'direct',
  bookedWeek: 1,
  status: 'booked',
  slotId: 'evening',
  ...over,
})
const member = (over: Partial<LeisureMember> = {}): LeisureMember => ({
  id: 'test_member',
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
  ...over,
})
const withMember = (s: GameState, m: LeisureMember): GameState => ({
  ...s,
  bookings: { ...s.bookings!, leisure: { ...s.bookings!.leisure!, members: [m] } },
})
const bp = (leisure: NonNullable<NonNullable<WeekPlan['bookings']>['leisure']>): WeekPlan =>
  plan({
    bookings: {
      shifts: {},
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
      leisure,
    },
  })

describe('leisure slots and crowding', () => {
  it('keeps each slot within its hard capacity and holds consume exactly one place', () => {
    const s = open(game())
    const booked = [booking({ units: 4 })]
    expect(leisureRoom(s, booked, 'basic_ordering', 'evening', 1)).toBe(0)
    expect(leisureRoom(s, booked, 'basic_ordering', 'daytime', 1)).toBe(4)
    expect(leisureCapacity(s, 'basic_ordering', 'missing', 1)).toBe(0)
  })

  it('allows soft crowding up to the hard limit and reports packed load without exposing comfort', () => {
    const c = leisureConfig()
    c.products.basic_ordering!.comfort = { daytime: 2, evening: 2 }
    const s = start(open(game(c)))
    const original = structuredClone(s)
    const served = [booking({ status: 'served', units: 4 })]
    const result = finishLeisure(s, served)
    expect(result.reviewPenalty).toBeGreaterThan(0)
    expect(
      result.state
        .bookings!.leisure!.weeks.at(-1)!
        .slots.find((x) => x.productId === 'basic_ordering' && x.slotId === 'evening'),
    ).toMatchObject({ visits: 4, load: 'packed' })
    expect(s).toEqual(original)
    const view = getView(result.state).bookings!.leisure!
    expect(JSON.stringify(view)).not.toContain('comfort')
    expect(JSON.stringify(view)).not.toContain('slotShare')
  })

  it('rejects unknown offers, slots and fractional hours', () => {
    const s = open(game())
    expect(leisureValid(s, bp({ offers: { missing: { enabled: true, priceCents: 1 } } }))).toBe(
      false,
    )
    expect(leisureValid(s, bp({ settingHours: { basic_ordering: 1.5 } }))).toBe(false)
    expect(leisureValid(s, bp({ aggregator: { slots: ['missing'], leave: false } }))).toBe(false)
  })
})

describe('leisure memberships and prepaid visits', () => {
  it('keeps an annual contract paying when an unhappy member stops visiting, then ends after its term', () => {
    const c = leisureConfig()
    c.segments.small_offices!.churn = 1
    let s = withMember(
      start(open(game(c))),
      member({ offerId: 'supplier_portal', termUntil: 53, priceCents: 8000 }),
    )
    s = { ...s, week: 2 }
    s = billLeisure(s, rng()).state
    expect(s.bookings!.leisure!.members[0]).toMatchObject({ inactive: true, endedWeek: null })
    expect(billLeisure({ ...s, week: 5 }, rng()).revenueCents).toBe(8000)
    expect(leisureVisits(s, [], rng()).added).toHaveLength(0)
    expect(
      billLeisure({ ...s, week: 53 }, rng()).state.bookings!.leisure!.members[0]!.endedWeek,
    ).toBe(53)
  })

  it('honours monthly cancellation notice', () => {
    const c = leisureConfig()
    c.segments.small_offices!.churn = 1
    const initial = withMember(start(open(game(c))), member())
    const s = billLeisure({ ...initial, week: 2 }, rng()).state
    expect(s.bookings!.leisure!.members[0]).toMatchObject({ noticeUntil: 6, endedWeek: null })
    expect(
      billLeisure({ ...s, week: 6 }, rng()).state.bookings!.leisure!.members[0]!.endedWeek,
    ).toBe(6)
  })

  it('holds pack money as a liability, redeems only served visits and releases the remainder on expiry', () => {
    const initial = withMember(
      start(open(game())),
      member({ offerId: 'shift_schedule', owedVisits: 10, owedCents: 10000, expiresWeek: 27 }),
    )
    expect(billLeisure(initial, rng())).toMatchObject({ revenueCents: 0, voucherCents: 10000 })
    const served = Array.from({ length: 3 }, (_, i) =>
      booking({ id: `visit_${i}`, status: 'served', memberId: 'test_member', priceCents: 0 }),
    )
    const result = finishLeisure(initial, served)
    expect(result.voucherRedeemedCents).toBe(3000)
    expect(result.state.bookings!.leisure!.members[0]).toMatchObject({
      owedVisits: 7,
      owedCents: 7000,
    })
    const expiry = billLeisure({ ...result.state, week: 27 }, rng())
    expect(expiry.voucherRedeemedCents).toBe(7000)
    expect(expiry.state.bookings!.leisure!.members[0]).toMatchObject({
      owedVisits: 0,
      endedWeek: 27,
    })
  })

  it('applies January fade to the January cohort rather than every member', () => {
    const c = leisureConfig()
    c.segments.small_offices!.januaryFade = 1
    const scenario = leisureScenario(c)
    scenario.bookings.startWeekOfYear = 1
    const initial = withMember(start(open(createGame(scenario, 'january'))), member())
    expect(
      billLeisure({ ...initial, week: 9 }, rng()).state.bookings!.leisure!.members[0]!.reason,
    ).toBe('january')
    const spring = withMember({ ...initial, week: 10 }, member({ joinedWeek: 9 }))
    expect(billLeisure(spring, rng()).state.bookings!.leisure!.members[0]!.reason).toBeNull()
  })
})

describe('freshness and date holds', () => {
  it('closes only a refreshed area, pays once and reopens with a new local theme pool', () => {
    const c = leisureConfig({
      freshness: {
        basic_ordering: {
          newAbove: 65,
          knownAbove: 30,
          weeklyLoss: 0,
          useLoss: 1,
          localPool: { min: 100, max: 100 },
          localSegments: ['small_offices'],
          sensitivity: { small_offices: 1 },
          refresh: { hours: 2, cents: 250000, weeks: 2 },
        },
      },
    })
    const s = open(game(c))
    const result = beginLeisure(s, bp({ refresh: ['basic_ordering'] }), rng())
    expect(result.costsCents).toBe(250000)
    expect(leisureOpen(result.state, 'basic_ordering', 1)).toBe(false)
    expect(leisureOpen(result.state, 'allergy_filter', 1)).toBe(true)
    const ready = beginLeisure({ ...result.state, week: 3 }, plan(), rng())
    expect(ready.costsCents).toBe(0)
    expect(ready.state.bookings!.leisure!.freshness.basic_ordering).toMatchObject({
      value: 100,
      localGroups: 0,
      refreshUntil: null,
    })
  })

  const holds = (convert = 1, lateReleaseShare = 0) => ({
    feeCents: 50000,
    weeks: { min: 2, max: 2 },
    lateReleaseShare,
    segments: { small_offices: { ask: 1, convert, feeConversion: 1, noHoldConversion: 0 } },
  })

  it('reserves a slot and credits its hold fee once when the client confirms', () => {
    let s = start(open(game({ holds: holds() })))
    s = {
      ...s,
      bookings: { ...s.bookings!, leisure: { ...s.bookings!.leisure!, holdPolicy: 'fee' } },
    }
    const held = holdLeisure(s, booking({ week: 4, priceCents: 100000 }), rng())
    expect(held).toMatchObject({ accepted: true, held: true, revenueCents: 50000 })
    expect(leisureRoom(held.state, [], 'basic_ordering', 'evening', 4)).toBe(3)
    const confirmed = beginLeisure({ ...held.state, week: 3 }, plan(), rng())
    expect(confirmed.revenueCents).toBe(0)
    expect(confirmed.state.bookings!.bookings[0]!.depositCents).toBe(50000)
    expect(
      held.revenueCents +
        confirmed.revenueCents +
        100000 -
        confirmed.state.bookings!.bookings[0]!.depositCents!,
    ).toBe(100000)
    expect(s.bookings!.leisure!.holds).toHaveLength(0)
  })

  it('records a late release and declines a hold-dependent client under no holds', () => {
    const s = start(open(game({ holds: holds(0, 1) })))
    const held = holdLeisure(s, booking({ week: 4 }), rng())
    const released = beginLeisure({ ...held.state, week: 4 }, plan(), rng()).state
    expect(released.bookings!.leisure!.weeks.at(-1)).toMatchObject({ released: 1, lateReleased: 1 })
    const no = {
      ...s,
      bookings: {
        ...s.bookings!,
        leisure: { ...s.bookings!.leisure!, holdPolicy: 'none' as const },
      },
    }
    expect(holdLeisure(no, booking({ week: 4 }), rng()).accepted).toBe(false)
  })
})

describe('aggregator check-ins', () => {
  const aggregate = () => ({
    name: 'Test platform',
    payoutCents: { min: 1000, max: 1000 },
    capPerMonth: 4,
    noticeWeeks: 13,
    users: { small_offices: { min: 1, max: 1 } },
    visitsPerWeek: 1,
    cannibalisation: { small_offices: 1 },
  })

  it('pays only served check-ins and caps an individual at four in a calendar month', () => {
    const scenario = leisureScenario({ aggregator: aggregate() })
    scenario.bookings.startWeekOfYear = 1
    for (const s of Object.values(scenario.bookings.leisure.segments))
      s.slotShare = { daytime: 0, evening: 1 }
    let s = open(createGame(scenario, 'platform'))
    s = beginLeisure(s, bp({ aggregator: { slots: ['evening'], leave: false } }), rng()).state
    for (let week = 1; week <= 5; week++) {
      if (week > 1) s = beginLeisure({ ...s, week }, plan(), rng()).state
      const visits = leisureVisits(s, [], rng())
      expect(visits.added).toHaveLength(week <= 4 ? 1 : 0)
      s = finishLeisure(
        visits.state,
        visits.added.map((b) => ({ ...b, status: 'served' as const })),
      ).state
    }
    expect(s.bookings!.leisure!.aggregator).toMatchObject({ checkins: 4, payoutCents: 4000 })
    s = beginLeisure({ ...s, week: 6 }, plan(), rng()).state
    expect(leisureVisits(s, [], rng()).added).toHaveLength(1)
  })

  it('does not move peak-only platform users into a closed off-peak slot', () => {
    const c = leisureConfig({ aggregator: aggregate() })
    c.segments.small_offices!.slotShare = { daytime: 0, evening: 1 }
    const s = beginLeisure(
      open(game(c)),
      bp({ aggregator: { slots: ['daytime'], leave: false } }),
      rng(),
    ).state
    expect(leisureVisits(s, [], rng()).added).toHaveLength(0)
  })
})

describe('build-outs and replay', () => {
  it('charges a build once at its start and accepts only future bookings after it will be ready', () => {
    const scenario = leisureScenario({
      buildOut: { basic_ordering: { weeks: 2 } },
      opening: { areas: ['basic_ordering'], requires: [] },
    })
    const initial = createGame(scenario, 'build-out')
    const original = structuredClone(initial)
    const hours = scenario.features.find((f) => f.id === 'basic_ordering')!.buildHours
    let s = endWeek(initial, plan({ build: { basic_ordering: hours } })).state
    expect(initial).toEqual(original)
    expect(s.ledger[0]!.bookingCostsCents).toBe(
      scenario.bookings.products.basic_ordering!.oneOffCents,
    )
    expect(s.product.features.find((f) => f.id === 'basic_ordering')).toMatchObject({
      readyWeek: 3,
      shippedWeek: null,
    })
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 2)).toBe(0)
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 4)).toBe(4)
    s = endWeek(s, plan()).state
    s = endWeek(s, plan()).state
    expect(s.bookings!.leisure!.openingWeek).toBe(3)
    expect(s.ledger.slice(1).reduce((t, l) => t + l.bookingCostsCents, 0)).toBe(0)
  })

  it('replays a real action log exactly and never changes the input state', () => {
    const scenario = leisureScenario({
      buildOut: { basic_ordering: { weeks: 2 } },
      opening: { areas: ['basic_ordering'], requires: [] },
    })
    let s = createGame(scenario, 'leisure-replay')
    for (let week = 1; week <= 16 && s.status === 'running'; week++) {
      const next =
        week === 1
          ? plan({
              build: {
                basic_ordering: scenario.features.find((f) => f.id === 'basic_ordering')!
                  .buildHours,
              },
            })
          : plan()
      const original = structuredClone(s)
      const result = endWeek(s, next)
      expect(s).toEqual(original)
      s = result.state
    }
    expect(replay(scenario, toSave(s))).toEqual(s)
  })
})

describe('leisure integration boundaries', () => {
  it('validates the fixture and rejects unknown cross-references and mixed indoor/weather models', () => {
    // Loaded events already have parsed conditions; this fixture validates the new raw blocks.
    const scenario = { ...leisureScenario(), events: [] }
    expect(ScenarioSchema.safeParse(scenario).success).toBe(true)
    expect(
      ScenarioSchema.safeParse({
        ...scenario,
        bookings: {
          ...scenario.bookings,
          leisure: { ...scenario.bookings.leisure, buildOut: { missing: { weeks: 2 } } },
        },
      }).success,
    ).toBe(false)
    expect(
      ScenarioSchema.safeParse({
        ...scenario,
        bookings: {
          ...scenario.bookings,
          leisure: {
            ...scenario.bookings.leisure,
            segments: {
              ...scenario.bookings.leisure.segments,
              small_offices: {
                ...scenario.bookings.leisure.segments.small_offices!,
                slotShare: { missing: 1 },
              },
            },
          },
        },
      }).success,
    ).toBe(false)
  })

  it('rechecks the particular slot at service, even when another slot still has space', () => {
    const c = leisureConfig()
    c.products.basic_ordering!.capacity = { daytime: 6, evening: 2 }
    const scenario = leisureScenario(c)
    for (const segment of Object.values(scenario.bookings.segments))
      segment.base = { min: 0, max: 0 }
    let s = open(createGame(scenario, 'slot-service'))
    s = {
      ...s,
      bookings: {
        ...s.bookings!,
        bookings: Array.from({ length: 3 }, (_, i) =>
          booking({ id: `booked_${i}`, bookedWeek: 0 }),
        ),
      },
    }
    const original = structuredClone(s)
    const next = plan({
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
    const result = endWeek(s, next)
    expect(result.state.bookings!.bookings.filter((b) => b.status === 'served')).toHaveLength(2)
    expect(
      result.state.bookings!.bookings.filter((b) => b.status === 'company_cancelled'),
    ).toHaveLength(1)
    expect(
      result.state
        .bookings!.leisure!.weeks.at(-1)!
        .slots.find((x) => x.productId === 'basic_ordering' && x.slotId === 'evening'),
    ).toMatchObject({ visits: 2, turnedAway: 1 })
    expect(s).toEqual(original)
  })

  it('accumulates setting work until a complete reset and keeps persistent setting hours in the weekly budget', () => {
    const s = open(
      game({
        freshness: {
          basic_ordering: {
            newAbove: 65,
            knownAbove: 30,
            weeklyLoss: 10,
            useLoss: 0,
            localSegments: [],
            sensitivity: {},
            refresh: { hours: 25, cents: 0, weeks: 0 },
          },
        },
      }),
    )
    const first = beginLeisure(s, bp({ settingHours: { basic_ordering: 13 } }), rng()).state
    expect(first.bookings!.leisure!.freshness.basic_ordering).toMatchObject({
      value: 90,
      settingProgress: 13,
    })
    const second = beginLeisure({ ...first, week: 2 }, plan(), rng()).state
    expect(second.bookings!.leisure!.freshness.basic_ordering).toMatchObject({
      value: 100,
      settingProgress: 1,
      refreshes: 1,
    })
    expect(
      validatePlan(second, plan({ restHours: second.founder.maxHoursPerWeek })).some(
        (x) => x.code === 'too_many_hours',
      ),
    ).toBe(true)
  })

  it('copies every nested leisure action for saves and same-as-last-week plans', () => {
    const original = bp({
      offers: { member_billing: { enabled: true, priceCents: 10000 } },
      timetable: { basic_ordering: { evening: 2 } },
      settingHours: { basic_ordering: 5 },
      refresh: ['basic_ordering'],
      aggregator: { slots: ['daytime'], leave: false },
      holdPolicy: 'fee',
    })
    const copy = clonePlan(original)
    copy.bookings!.leisure!.offers!.member_billing!.priceCents = 1
    copy.bookings!.leisure!.timetable!.basic_ordering!.evening = 9
    copy.bookings!.leisure!.settingHours!.basic_ordering = 0
    copy.bookings!.leisure!.refresh!.push('allergy_filter')
    copy.bookings!.leisure!.aggregator!.slots.push('evening')
    expect(original.bookings!.leisure).toEqual({
      offers: { member_billing: { enabled: true, priceCents: 10000 } },
      timetable: { basic_ordering: { evening: 2 } },
      settingHours: { basic_ordering: 5 },
      refresh: ['basic_ordering'],
      aggregator: { slots: ['daytime'], leave: false },
      holdPolicy: 'fee',
    })
  })
})

describe('opening choices and construction finance', () => {
  it('shows the initial build choice in week one, resolves it once and replays the choice', () => {
    const scenario = leisureScenario({
      buildOut: { basic_ordering: { weeks: 2 } },
      opening: { areas: ['basic_ordering'], requires: [] },
    })
    scenario.events = [
      EventSchema.parse({
        id: 'initial_build',
        area: 'product',
        weight: 1,
        once: true,
        trigger: ['week >= 1'],
        sender: 'The builder',
        text: 'Choose the first area. The rest can wait.',
        defaultChoice: 'first',
        choices: [
          {
            id: 'first',
            label: 'First area',
            hours: 0,
            effects: [{ type: 'leisureStart', products: ['basic_ordering'] }],
          },
          { id: 'wait', label: 'Wait', hours: 0, effects: [] },
        ],
      }),
    ]
    let s = createGame(scenario, 'opening-choice')
    expect(s.inbox[0]).toMatchObject({ eventId: 'initial_build', week: 1, status: 'open' })
    s = respond(s, s.inbox[0]!.id, 'first')
    s = endWeek(s, plan()).state
    expect(s.bookings!.leisure!.buildChoice).toEqual(['basic_ordering'])
    expect(s.drawnEvents.filter((e) => e.eventId === 'initial_build')).toHaveLength(1)
    expect(replay(scenario, toSave(s))).toEqual(s)
  })

  it('uses bank-paid construction once and reimburses work already bridged from cash', () => {
    const scenario = {
      ...leisureScenario({ buildOut: { basic_ordering: { weeks: 2 } } }),
      loan: { ...loadScenario('seeblick').loan!, items: ['basic_ordering'], financeRooms: false },
    }
    scenario.bookings.products.basic_ordering!.oneOffCents = 1000000
    let s = createGame(scenario, 'construction-finance')
    s = {
      ...s,
      loan: {
        ...s.loan!,
        accepted: {
          amountCents: 1000000,
          termMonths: 60,
          graceMonths: 6,
          rateBp: 500,
          items: ['basic_ordering'],
        },
      },
    }
    const paidByBank = settleLoans(s, plan(), 10000000, true)
    expect(paidByBank.money).toMatchObject({ inCents: 1000000, itemsCents: 1000000 })
    const ready = {
      ...paidByBank.state,
      product: {
        ...s.product,
        features: s.product.features.map((f) =>
          f.id === 'basic_ordering' ? { ...f, readyWeek: 3 } : f,
        ),
      },
    }
    const startBuild = beginLeisure(ready, plan(), rng())
    expect(startBuild.costsCents).toBe(0)
    expect(startBuild.state.bookings!.leisure!.buildPaid).toContain('basic_ordering')
    expect(startBuild.state.loan!.bought).not.toContain('basic_ordering')
    const bridged = {
      ...s,
      bookings: {
        ...s.bookings!,
        leisure: { ...s.bookings!.leisure!, buildPaid: ['basic_ordering'] },
      },
    }
    const original = structuredClone(bridged)
    const reimbursement = settleLoans(bridged, plan(), 10000000, true)
    expect(reimbursement.money).toMatchObject({ inCents: 1000000, itemsCents: 0 })
    expect(reimbursement.state.loan!.bought ?? []).not.toContain('basic_ordering')
    expect(canFinance(bridged, 'basic_ordering')).toBe(false)
    expect(bridged).toEqual(original)
  })
})

describe('instructors and observable event conditions', () => {
  it('honours terms and notice when the most-followed teacher leaves, and exposes only the observed loss', () => {
    let s = start(open(game({ instructors: { guide: { min: 1, max: 1 } } })))
    s = {
      ...s,
      bookings: {
        ...s.bookings!,
        leisure: {
          ...s.bookings!.leisure!,
          members: [
            member(),
            member({ id: 'annual', offerId: 'supplier_portal', termUntil: 53, priceCents: 8000 }),
          ],
        },
      },
    }
    const original = structuredClone(s)
    const left = loseLeisureInstructor(s, 'most_followed', rng())
    expect(left.bookings!.leisure!.members).toMatchObject([
      { inactive: true, noticeUntil: 5, endedWeek: null },
      { inactive: true, noticeUntil: null, endedWeek: null },
    ])
    expect(left.bookings!.leisure!.instructorDepartures[0]).toMatchObject({
      roleId: 'guide',
      stopped: 2,
      pending: 1,
    })
    expect(billLeisure(left, rng()).state.bookings!.leisure!.members[0]!.endedWeek).toBeNull()
    const atNotice = billLeisure({ ...left, week: 5 }, rng())
    expect(atNotice.state.bookings!.leisure!.members[0]!.endedWeek).toBe(5)
    expect(atNotice.state.bookings!.leisure!.members[1]!.endedWeek).toBeNull()
    const view = getView(left).bookings!.leisure!
    expect(view.instructorDepartures[0]).toMatchObject({ stopped: 2, pending: 1 })
    expect(JSON.stringify(view)).not.toContain('instructorFollowing')
    expect(s).toEqual(original)
  })

  it('reads every leisure condition from facts available in the player view', () => {
    let s = start(open(game({ instructors: { guide: { min: 1, max: 1 } } })))
    s = withMember(s, member())
    s = finishLeisure(s, [booking({ status: 'served', units: 4 })]).state
    s = loseLeisureInstructor(s, 'guide', rng())
    const view = getView(s)
    const paths = [
      'leisure.open',
      'leisure.weeksOpen',
      'leisure.members',
      'leisure.cancellations',
      'leisure.packed',
      'leisure.aggregator',
      'leisure.checkins',
      'leisure.holds',
      'leisure.tired',
      'leisure.instructorLosses',
    ] as const
    for (const path of paths)
      expect(viewConditionValue(view, path), path).toBe(conditionValue(s, path))
  })
})

describe('intro membership cohorts', () => {
  it('starts a new billing cycle at conversion but keeps the original January cohort', () => {
    const c = leisureConfig()
    c.memberships!.invoice_export = {
      kind: 'intro',
      priceCents: 4900,
      serves: ['small_offices'],
      slots: ['daytime', 'evening'],
      termWeeks: 0,
      noticeWeeks: 0,
      validWeeks: 3,
      convert: 1,
    }
    c.segments.small_offices!.januaryFade = 1
    const scenario = leisureScenario(c)
    scenario.bookings.startWeekOfYear = 1
    let s = start(open(createGame(scenario, 'intro-cohort')))
    s = beginLeisure(
      { ...s, week: 6 },
      bp({ offers: { member_billing: { enabled: true, priceCents: 10000 } } }),
      rng(),
    ).state
    s = withMember(s, member({ offerId: 'invoice_export', priceCents: 4900, expiresWeek: 6 }))
    const converted = billLeisure(s, rng())
    expect(converted.revenueCents).toBe(10000)
    expect(converted.state.bookings!.leisure!.members[0]).toMatchObject({
      offerId: 'member_billing',
      joinedWeek: 1,
      billingWeek: 6,
      reason: 'january',
      noticeUntil: 10,
    })
  })
})

describe('aggregator contract and lost slots', () => {
  const platform = () => ({
    name: 'Test platform',
    payoutCents: { min: 1000, max: 1000 },
    capPerMonth: 4,
    noticeWeeks: 13,
    users: { small_offices: { min: 1, max: 1 }, medical: { min: 1, max: 1 } },
    visitsPerWeek: 1,
    cannibalisation: { small_offices: 1, medical: 1 },
  })

  it('honours the exit notice even if access is closed, then leaves the contract', () => {
    let s = beginLeisure(
      open(game({ aggregator: platform() })),
      bp({ aggregator: { slots: ['daytime'], leave: false } }),
      rng(),
    ).state
    s = beginLeisure(
      { ...s, week: 2 },
      bp({ aggregator: { slots: [], leave: false } }),
      rng(),
    ).state
    expect(s.bookings!.leisure!.aggregator).toMatchObject({ joined: true, slots: [] })
    s = beginLeisure(s, bp({ aggregator: { slots: [], leave: true } }), rng()).state
    expect(s.bookings!.leisure!.aggregator).toMatchObject({ joined: true, leavingWeek: 15 })
    expect(leisureValid(s, bp({ aggregator: { slots: ['evening'], leave: false } }))).toBe(false)
    expect(
      beginLeisure({ ...s, week: 14 }, plan(), rng()).state.bookings!.leisure!.aggregator!.joined,
    ).toBe(true)
    const left = beginLeisure({ ...s, week: 15 }, plan(), rng()).state
    expect(left.bookings!.leisure!.aggregator).toMatchObject({
      joined: false,
      slots: [],
      leavingWeek: null,
    })
  })

  it('can replace corporate as well as personal memberships without disclosing its hidden share', () => {
    const c = leisureConfig({ aggregator: platform() })
    c.segments.small_offices!.memberShare = 1
    c.segments.medical!.memberShare = 1
    const initial = beginLeisure(
      open(game(c)),
      bp({ offers: { member_billing: { enabled: true, priceCents: 100 } } }),
      rng(),
    ).state
    const joined = beginLeisure(
      initial,
      bp({ aggregator: { slots: ['daytime'], leave: false } }),
      rng(),
    ).state
    for (const segment of ['small_offices', 'medical']) {
      expect(
        joinLeisure(initial, segment, 10, rng()).bookings!.leisure!.members.length,
      ).toBeGreaterThan(0)
      expect(joinLeisure(joined, segment, 10, rng()).bookings!.leisure!.members).toHaveLength(0)
    }
    expect(JSON.stringify(getView(joined).bookings!.leisure)).not.toContain('cannibalisation')
  })

  it('does not pay or consume a user cap for visits the studio could not serve', () => {
    let s = beginLeisure(
      open(game({ aggregator: platform() })),
      bp({ aggregator: { slots: ['daytime', 'evening'], leave: false } }),
      rng(),
    ).state
    const visits = leisureVisits(s, [], rng())
    expect(visits.added.length).toBeGreaterThan(0)
    s = finishLeisure(
      visits.state,
      visits.added.map((b) => ({ ...b, status: 'company_cancelled' as const })),
    ).state
    expect(s.bookings!.leisure!.aggregator).toMatchObject({ checkins: 0, payoutCents: 0 })
    expect(s.bookings!.leisure!.aggregator!.users.every((u) => u.visits === 0)).toBe(true)
  })

  it('records the slot of rejected enquiries and gives the UI independent copies', () => {
    const s = start(open(game()))
    const original = structuredClone(s)
    const lost = recordLeisureTurnAway(s, 'evening', 7)
    const view = getView(lost).bookings!.leisure!
    expect(view.turnedAwayBySlot.evening).toBe(7)
    view.turnedAwayBySlot.evening = 0
    view.history[0]!.turnedAway.evening = 0
    expect(lost.bookings!.leisure!.weeks[0]!.turnedAway.evening).toBe(7)
    expect(s).toEqual(original)
  })
})

describe('finite theme pools and maintenance', () => {
  const room = () => ({
    newAbove: 65,
    knownAbove: 30,
    weeklyLoss: 0,
    useLoss: 0,
    localPool: { min: 2, max: 2 },
    localSegments: ['small_offices'],
    sensitivity: { small_offices: 1, coworking: 0 },
    reviewPenalty: 1,
    refresh: { hours: 2, cents: 0, weeks: 2 },
  })

  it('reserves a finite theme audience across slots and future dates', () => {
    const s = start(open(game({ freshness: { basic_ordering: room() } })))
    const reserved = [booking({ week: 2 })]
    expect(leisureRoom(s, reserved, 'basic_ordering', 'daytime', 1, 'small_offices')).toBe(1)
    expect(leisureRoom(s, reserved, 'basic_ordering', 'daytime', 1, 'coworking')).toBe(4)
    const played = finishLeisure(s, [booking({ status: 'served', units: 2 })])
    expect(played.reviewPenalty).toBeGreaterThan(0)
    expect(leisureAppeal(played.state, 'small_offices', 'basic_ordering')).toBe(0)
    expect(leisureAppeal(played.state, 'coworking', 'basic_ordering')).toBe(1)
    const view = getView(played.state).bookings!.leisure!
    expect(view.freshness[0]).toMatchObject({ word: 'tired', localGroups: 2 })
    expect(JSON.stringify(view)).not.toContain('localPools')
    expect(JSON.stringify(view)).not.toContain('"value":')
  })

  it('opens the next theme pool for dates after a rebuild, while the room stays closed now', () => {
    const s = start(open(game({ freshness: { basic_ordering: room() } })))
    const played = finishLeisure(s, [booking({ status: 'served', units: 2 })]).state
    const rebuilding = beginLeisure(played, bp({ refresh: ['basic_ordering'] }), rng()).state
    expect(leisureRoom(rebuilding, [], 'basic_ordering', 'daytime', 1, 'small_offices')).toBe(0)
    expect(leisureRoom(rebuilding, [], 'basic_ordering', 'daytime', 3, 'small_offices')).toBe(2)
    expect(leisureAppeal(rebuilding, 'small_offices', 'basic_ordering', 3)).toBe(1)
  })

  it('closes only the content-defined part of a slot during a route reset', () => {
    const { localPool: _pool, ...base } = room()
    void _pool
    const f = {
      ...base,
      localSegments: [],
      refresh: { hours: 2, cents: 0, weeks: 0, lostCapacity: { daytime: 2 } },
    }
    const s = open(game({ freshness: { basic_ordering: f } }))
    const reset = beginLeisure(s, bp({ settingHours: { basic_ordering: 2 } }), rng()).state
    expect(leisureCapacity(reset, 'basic_ordering', 'daytime', 1)).toBe(2)
    expect(leisureCapacity(reset, 'basic_ordering', 'evening', 1)).toBe(4)
    expect(leisureCapacity(reset, 'allergy_filter', 'daytime', 1)).toBe(4)
    const next = beginLeisure(
      { ...reset, week: 2 },
      bp({ settingHours: { basic_ordering: 0 } }),
      rng(),
    ).state
    expect(leisureCapacity(next, 'basic_ordering', 'daytime', 2)).toBe(4)
  })
})

describe('slot calendar and indoor course ladder', () => {
  const courseGame = () => {
    const c = leisureConfig()
    for (const seg of Object.values(c.segments)) seg.slotShare = { daytime: 0, evening: 1 }
    const scenario = leisureScenario(c)
    for (const seg of Object.values(scenario.bookings.segments)) seg.base = { min: 0, max: 0 }
    scenario.bookings.products.basic_ordering!.course = {
      level: 'basic',
      sameStay: { share: 1, products: ['allergy_filter'] },
    }
    scenario.bookings.products.allergy_filter!.needsLevel = 'basic'
    return open(createGame(scenario, 'indoor-course'))
  }
  const shifts = () =>
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

  it('gives graduates named-slot follow-ups and exposes factual course totals without weather', () => {
    let s = courseGame()
    s = { ...s, bookings: { ...s.bookings!, bookings: [booking({ segmentId: 'medical' })] } }
    s = endWeek(s, shifts()).state
    expect(
      s.bookings!.bookings.find((b) => b.week === 2 && b.productId === 'allergy_filter'),
    ).toMatchObject({ slotId: 'evening', units: 1 })
    const view = getView(s).bookings!
    expect(view.abroad).toBeNull()
    expect(view.leisure!.courses).toMatchObject({
      students: 1,
      sameStay: 1,
      returnedDirect: 0,
      returnedPlatform: 0,
    })
  })

  it('does not bypass a full preferred slot with a course follow-up', () => {
    let s = courseGame()
    s = {
      ...s,
      bookings: {
        ...s.bookings!,
        bookings: [
          booking({ segmentId: 'medical' }),
          booking({
            id: 'already_full',
            productId: 'allergy_filter',
            segmentId: 'medical',
            week: 2,
            units: 4,
          }),
        ],
      },
    }
    s = endWeek(s, shifts()).state
    expect(s.bookings!.bookings.filter((b) => b.week === 2)).toHaveLength(1)
    expect(getView(s).bookings!.leisure!.courses).toMatchObject({ students: 1, sameStay: 0 })
  })

  it('shows held, booked and free capacity independently, including future construction', () => {
    let s = start(
      open(
        game({
          holds: {
            feeCents: 50000,
            weeks: { min: 2, max: 2 },
            lateReleaseShare: 0,
            segments: {
              small_offices: { ask: 1, convert: 1, feeConversion: 1, noHoldConversion: 0 },
            },
          },
        }),
      ),
    )
    s = holdLeisure(s, booking({ week: 4 }), rng()).state
    s = {
      ...s,
      bookings: { ...s.bookings!, bookings: [booking({ id: 'confirmed', week: 4, units: 2 })] },
    }
    const row = getView(s).bookings!.leisure!.slotCalendar.find(
      (x) => x.productId === 'basic_ordering' && x.slotId === 'evening' && x.week === 4,
    )
    expect(row).toMatchObject({ capacity: 4, booked: 2, held: 1 })
    const scenario = leisureScenario({
      buildOut: { basic_ordering: { weeks: 2 } },
      opening: { areas: ['basic_ordering'], requires: [] },
    })
    const before = createGame(scenario, 'calendar-build')
    const building = endWeek(
      before,
      plan({
        build: {
          basic_ordering: scenario.features.find((f) => f.id === 'basic_ordering')!.buildHours,
        },
      }),
    ).state
    const calendar = getView(building).bookings!.leisure!.slotCalendar
    expect(
      calendar.find(
        (x) => x.productId === 'basic_ordering' && x.slotId === 'evening' && x.week === 2,
      )!.capacity,
    ).toBe(0)
    expect(
      calendar.find(
        (x) => x.productId === 'basic_ordering' && x.slotId === 'evening' && x.week === 3,
      )!.capacity,
    ).toBe(4)
  })

  it('gives returning graduates a named slot and reserves its capacity', () => {
    let s = courseGame()
    s = {
      ...s,
      hidden: {
        ...s.hidden,
        bookings: {
          ...s.hidden.bookings!,
          returns: [
            {
              askWeek: 1,
              targetWeek: 2,
              segmentId: 'medical',
              channel: 'direct',
              units: 1,
              products: ['allergy_filter'],
            },
          ],
        },
      },
    }
    s = endWeek(s, shifts()).state
    expect(s.bookings!.bookings.find((b) => b.productId === 'allergy_filter')).toMatchObject({
      week: 2,
      slotId: 'evening',
    })
    expect(getView(s).bookings!.leisure!.courses!.returnedDirect).toBe(1)
  })
})
