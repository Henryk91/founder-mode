import { describe, expect, it } from 'vitest'
import { LeisureSchema, ScenarioSchema, type LeisureConfig } from '@founder-mode/content'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import type { Booking, GameState } from '../src/types'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import { chooseAsset } from '../src/systems/assets'
import { beginLeisure, finishLeisure, leisureRoom } from '../src/systems/leisure'
import { venueOpen } from '../src/systems/venue'
import { conditionValue } from '../src/systems/conditions'
import { viewConditionValue } from '../src/systems/viewConditions'
import { leisureConfig, leisureScenario } from './leisure'
import { plan } from './helpers'

const noise: NonNullable<LeisureConfig['noise']> = {
  products: ['allergy_filter'],
  insulation: 'member_billing',
  setupProducts: [],
  complaint: 1,
  insulatedComplaint: 0,
  warningAt: 3,
  restrictAt: 4,
  windowWeeks: 52,
  restrictionWeeks: 26,
}
const extras: NonNullable<LeisureConfig['extras']> = {
  invoice_export: {
    segments: { small_offices: { grossCents: 400000, revenueShare: 0.1, unitCostCents: 1000 } },
  },
}
const rng = () => new Rng(seedRng('venue-noise'))
const event = (over: Partial<Booking> = {}): Booking => ({
  id: 'late',
  productId: 'allergy_filter',
  segmentId: 'small_offices',
  week: 1,
  units: 1,
  priceCents: 10000,
  channel: 'direct',
  bookedWeek: 0,
  status: 'served',
  slotId: 'daytime',
  ...over,
})
function scenario(over: Partial<LeisureConfig> = {}) {
  const s = leisureScenario({ memberships: undefined, noise, ...over })
  s.events = []
  s.bookings.products.allergy_filter!.capacityOf = 'basic_ordering'
  delete s.bookings.leisure!.products.allergy_filter
  for (const segment of Object.values(s.bookings.segments)) segment.base = { min: 0, max: 0 }
  return s
}
function game(over: Partial<LeisureConfig> = {}): GameState {
  const s = createGame(scenario(over), 'venue-noise')
  s.product.features = s.product.features.map((f) => ({
    ...f,
    shippedWeek: f.id === 'member_billing' ? null : 0,
  }))
  return s
}
const operating = () =>
  plan({
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

describe('venue complaints and real receipts', () => {
  it('warns, restricts only late dates for the stated duration, and shares facts with conditions', () => {
    const s = beginLeisure(game(), plan(), rng()).state
    const before = structuredClone(s)
    const result = finishLeisure(s, [event({ units: 4 })], rng())
    expect(s).toEqual(before)
    expect(result.state.bookings!.leisure!.noise!.complaintWeeks).toEqual([1, 1, 1, 1])
    const next = { ...result.state, week: 2 }
    const view = getView(next)
    expect(view.bookings!.leisure!.noise).toMatchObject({
      complaints: 4,
      warning: true,
      restricted: true,
      restrictedFrom: 2,
      restrictedUntil: 28,
      lateEvents: 4,
    })
    expect(venueOpen(next, 'allergy_filter', 27)).toBe(false)
    expect(venueOpen(next, 'allergy_filter', 28)).toBe(true)
    expect(leisureRoom(next, [], 'allergy_filter', 'daytime', 2)).toBe(0)
    expect(leisureRoom(next, [], 'basic_ordering', 'daytime', 2)).toBe(4)
    for (const path of ['leisure.complaints', 'leisure.restricted'] as const)
      expect(conditionValue(next, path)).toBe(viewConditionValue(view, path))
    expect(Object.keys(view.bookings!.leisure!.noise!)).not.toContain('complaint')
    expect(Object.keys(view.bookings!.leisure!.noise!)).not.toContain('insulatedComplaint')
  })

  it('uses the insulated rate and never complains about holds or unserved events', () => {
    const s = game()
    s.product.features.find((f) => f.id === 'member_billing')!.shippedWeek = 0
    const started = beginLeisure(s, plan(), rng()).state
    const result = finishLeisure(
      started,
      [
        event({ units: 4 }),
        event({ id: 'cancelled', status: 'company_cancelled', units: 20 }),
        event({ id: 'normal', productId: 'basic_ordering', units: 4 }),
      ],
      rng(),
    )
    expect(result.state.bookings!.leisure!.noise).toMatchObject({
      complaintWeeks: [],
      lateEvents: 4,
      restrictions: [],
    })
  })

  it('expires complaints from the rolling window rather than restricting forever', () => {
    const s = game()
    s.week = 54
    s.bookings!.leisure!.noise!.complaintWeeks = [1, 1, 1]
    const started = beginLeisure(s, plan(), rng()).state
    const result = finishLeisure(started, [event({ week: 54 })], rng())
    expect(result.state.bookings!.leisure!.noise!.restrictions).toEqual([])
    expect(getView(result.state).bookings!.leisure!.noise!.complaints).toBe(1)
  })

  it('immediately refunds restricted future reservations and paid holds exactly once', () => {
    const s = game({
      holds: {
        feeCents: 5000,
        weeks: { min: 2, max: 4 },
        lateReleaseShare: 0,
        segments: { small_offices: { ask: 0, convert: 0, feeConversion: 1, noHoldConversion: 1 } },
      },
    })
    s.bookings!.bookings = [
      event({ units: 4, status: 'booked' }),
      event({ id: 'future', week: 3, status: 'booked', depositCents: 3000 }),
    ]
    s.bookings!.leisure!.holds = [
      {
        id: 'held',
        booking: event({ id: 'held-event', week: 5, status: 'booked' }),
        releaseWeek: 5,
        status: 'held',
        feeCents: 5000,
      },
    ]
    const before = structuredClone(s)
    const result = applyBookings(s, operating(), rng())
    expect(result.revenueCents).toBe(40000 - 3000 - 5000)
    expect(result.state.bookings!.bookings.find((b) => b.id === 'future')).toMatchObject({
      status: 'company_cancelled',
      refundedCents: 3000,
    })
    expect(result.state.bookings!.leisure!.holds[0]).toMatchObject({
      status: 'released',
      refundedCents: 5000,
    })
    expect(getView(result.state).bookings!.leisure!.noise).toMatchObject({
      receiptsCents: 40000,
      refundsCents: 8000,
      cancelledBookings: 1,
      releasedHolds: 1,
    })
    expect(getView(result.state).bookings!.leisure!.holds!.calendar[0]!.refundedCents).toBe(5000)
    const later = applyBookings({ ...result.state, week: 3 }, plan(), rng())
    expect(later.revenueCents).toBe(0)
    expect(later.state.bookings!.leisure!.noise!.refundsCents).toBe(8000)
    expect(s).toEqual(before)
  })

  it('earns ancillary receipts only for served units after installation and copies their public records', () => {
    const s = beginLeisure(game({ noise: undefined, extras }), plan(), rng()).state
    const before = structuredClone(s)
    const result = finishLeisure(
      s,
      [
        event({ units: 2 }),
        event({ id: 'cancelled', status: 'cancelled', units: 20 }),
        event({ id: 'future', status: 'booked', week: 3, units: 20 }),
      ],
      rng(),
    )
    expect(result.extraRevenueCents).toBe(80000)
    expect(result.extraCostsCents).toBe(2000)
    expect(result.state.bookings!.leisure!.extras!.invoice_export).toEqual({
      units: 2,
      receiptsCents: 80000,
      costsCents: 2000,
    })
    const view = getView(result.state).bookings!.leisure!
    view.extras![0]!.terms[0]!.grossCents = 1
    view.history[0]!.extras!.invoice_export!.receiptsCents = 1
    expect(result.state.bookings!.leisure!.weeks[0]!.extras!.invoice_export!.receiptsCents).toBe(
      80000,
    )
    expect(
      result.state.scenario.bookings!.leisure!.extras!.invoice_export!.segments.small_offices!
        .grossCents,
    ).toBe(400000)
    expect(s).toEqual(before)
    const unbuilt = game({ noise: undefined, extras })
    unbuilt.product.features.find((f) => f.id === 'invoice_export')!.shippedWeek = null
    expect(
      finishLeisure(beginLeisure(unbuilt, plan(), rng()).state, [event()], rng()).extraRevenueCents,
    ).toBe(0)
  })

  it('reconciles late contribution with actual commissions, variable costs, payroll and turnaround', () => {
    const s = game({
      noise: { ...noise, complaint: 0, setupProducts: ['member_billing', 'supplier_portal'] },
      extras,
      slotUpgrades: {
        invoice_export: {
          product: 'basic_ordering',
          slot: 'daytime',
          additional: 4,
          unitCostCents: 40000,
        },
      },
    })
    s.product.features.find((f) => f.id === 'member_billing')!.shippedWeek = 0
    s.scenario.bookings!.products.member_billing!.oneOffCents = 3000000
    s.scenario.bookings!.products.supplier_portal!.oneOffCents = 150000
    s.bookings!.bookings = [
      event({ units: 3, channel: 'platform', status: 'booked' }),
      event({ id: 'normal', productId: 'basic_ordering', units: 3, status: 'booked' }),
    ]
    const before = structuredClone(s)
    const result = applyBookings(s, operating(), rng())
    const lateVariable = 3 * s.scenario.bookings!.products.allergy_filter!.unitCostCents + 3000
    const allVariable =
      3 *
      (s.scenario.bookings!.products.allergy_filter!.unitCostCents +
        s.scenario.bookings!.products.basic_ordering!.unitCostCents)
    const view = getView(result.state).bookings!.leisure!
    expect(result.revenueCents).toBe(22500 + 30000 + 240000)
    expect(result.costsCents).toBe(60000 + allVariable + 80000 + 6000)
    expect(view.noise).toMatchObject({
      receiptsCents: 22500 + 120000,
      variableCents: lateVariable,
      staffCents: 30000,
      turnaroundCents: 40000,
      setupCents: 3150000,
    })
    expect(view.noise!.netCents).toBe(142500 - lateVariable - 30000 - 40000 - 3150000)
    expect(result.state.bookings!.earned!.invoice_export).toBe(240000 - 6000)
    const again = applyBookings({ ...result.state, week: 2 }, plan(), rng())
    expect(again.state.bookings!.leisure!.noise!.setupCents).toBe(3150000)
    expect(s).toEqual(before)
  })

  it.each(['basic_ordering', 'allergy_filter'])(
    'attributes only actual %s asset use fees to the late business',
    (product) => {
      const s = game({ noise: { ...noise, complaint: 0 } })
      delete s.scenario.bookings!.products.allergy_filter!.capacityOf
      s.scenario.bookings!.leisure!.products.allergy_filter = {
        capacity: { daytime: 4, evening: 4 },
      }
      s.scenario.bookings!.assets = {
        hired: {
          name: 'Hired equipment',
          products: [product],
          share: { capacity: 1, unitCents: 9000, revenueShare: 0 },
        },
      }
      s.bookings!.assets = {
        hired: {
          option: 'none',
          sinceWeek: 1,
          leaseFromWeek: null,
          boughtWeek: null,
          brokenUntil: 0,
          breakdowns: 0,
          takenBack: false,
          peakReleased: [],
          weeksUsed: 0,
          costCents: 0,
        },
      }
      const hired = chooseAsset(s, 'hired', 'share').state
      hired.bookings!.bookings = [
        event({ units: 3, status: 'booked' }),
        event({ id: 'normal', productId: 'basic_ordering', units: 3, status: 'booked' }),
      ]
      const result = applyBookings(hired, operating(), rng())
      expect(result.state.bookings!.assets!.hired!.costCents).toBe(27000)
      expect(result.state.bookings!.leisure!.noise!.assetCents).toBe(
        product === 'allergy_filter' ? 27000 : 0,
      )
    },
  )

  it('validates new references and the order/effect of warning and insulation terms', () => {
    expect(ScenarioSchema.safeParse(scenario({ extras })).success).toBe(true)
    expect(
      LeisureSchema.safeParse(leisureConfig({ noise: { ...noise, warningAt: 4 } })).success,
    ).toBe(false)
    expect(
      LeisureSchema.safeParse(
        leisureConfig({ noise: { ...noise, complaint: 0.1, insulatedComplaint: 0.2 } }),
      ).success,
    ).toBe(false)
    expect(
      ScenarioSchema.safeParse(scenario({ noise: { ...noise, products: ['missing'] } })).success,
    ).toBe(false)
    expect(
      ScenarioSchema.safeParse(
        scenario({
          extras: {
            invoice_export: {
              segments: { missing: extras.invoice_export!.segments.small_offices! },
            },
          },
        }),
      ).success,
    ).toBe(false)
  })

  it('replays actual complaints, restrictions and ancillary income from an action log', () => {
    const spec = scenario({ extras })
    // Medical events use the late alias, rather than the first equal-capacity base product.
    spec.bookings.products.basic_ordering!.serves = ['small_offices', 'coworking']
    for (const segment of Object.values(spec.bookings.segments)) segment.base = { min: 10, max: 10 }
    // The fixture borrows SaaS market definitions; event prices need matching test budgets.
    for (const segment of spec.segments) segment.wtpCents = { min: 100000, max: 100000 }
    let s = createGame(spec, 'venue-noise-replay')
    for (let w = 0; w < 48; w++) {
      const id = ['basic_ordering', 'allergy_filter', 'invoice_export'].find(
        (id) => s.product.features.find((f) => f.id === id)!.shippedWeek === null,
      )
      const f = s.product.features.find((f) => f.id === id)
      const def = spec.features.find((f) => f.id === id)
      const build = id && f && def ? { [id]: Math.min(10, def.buildHours - f.progressHours) } : {}
      s = endWeek(s, { ...operating(), build }).state
    }
    expect(s.bookings!.leisure!.noise!.complaintWeeks.length).toBeGreaterThan(0)
    expect(s.bookings!.leisure!.noise!.restrictions.length).toBeGreaterThan(0)
    expect(s.bookings!.leisure!.extras!.invoice_export!.receiptsCents).toBeGreaterThan(0)
    expect(replay(spec, toSave(s))).toEqual(s)
  })
})
