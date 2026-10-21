import { describe, expect, it } from 'vitest'
import { LeisureSchema } from '@founder-mode/content'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings, mustHaveMet } from '../src/systems/bookings'
import { assetsBought, assetsUsed, chooseAsset } from '../src/systems/assets'
import { beginLeisure, finishLeisure, leisureCapacity, leisureRoom } from '../src/systems/leisure'
import type { Booking, GameState } from '../src/types'
import { plan } from './helpers'
import { leisureConfig, leisureScenario } from './leisure'

const rng = () => new Rng(seedRng('venue-fixture'))
const upgrade = {
  invoice_export: {
    product: 'basic_ordering',
    slot: 'daytime',
    additional: 4,
    unitCostCents: 40000,
  },
}
function fixture(): GameState {
  const scenario = leisureScenario({
    slotUpgrades: upgrade,
    buildOut: { member_billing: { weeks: 2, closes: ['basic_ordering'] } },
  })
  for (const segment of Object.values(scenario.bookings.segments)) segment.base = { min: 0, max: 0 }
  const state = createGame(scenario, 'venue-fixture')
  state.product.features = state.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  return state
}
const book = (over: Partial<Booking> = {}): Booking => ({
  id: 'event',
  productId: 'basic_ordering',
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
const operating = () =>
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

describe('venue closures and weekday turnaround', () => {
  it('closes only the affected pool during construction, then reopens on readiness', () => {
    const s = fixture()
    const f = s.product.features.find((p) => p.id === 'member_billing')!
    f.shippedWeek = null
    f.readyWeek = 3
    const before = structuredClone(s)
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 1)).toBe(0)
    expect(leisureCapacity(s, 'allergy_filter', 'daytime', 1)).toBe(4)
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 3)).toBe(8)
    const view = getView(s).bookings!.leisure!
    expect(view.builds[0]!.closes).toEqual(['basic_ordering'])
    expect(
      view.slotCalendar.find(
        (c) => c.productId === 'basic_ordering' && c.slotId === 'daytime' && c.week === 3,
      )!.capacity,
    ).toBe(8)
    view.builds[0]!.closes!.push('allergy_filter')
    expect(s).toEqual(before)
  })

  it('does not close the hall during unfinished design preparation', () => {
    const s = fixture()
    const f = s.product.features.find((p) => p.id === 'member_billing')!
    f.shippedWeek = null
    f.progressHours = 1
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 1)).toBe(8)
  })

  it('refunds a reservation cancelled by a construction closure', () => {
    const s = fixture()
    const f = s.product.features.find((p) => p.id === 'member_billing')!
    f.shippedWeek = null
    f.readyWeek = 3
    s.bookings!.bookings = [book({ status: 'booked', depositCents: 3000 })]
    const before = structuredClone(s)
    const result = applyBookings(s, operating(), rng())
    expect(result.state.bookings!.bookings[0]!.status).toBe('company_cancelled')
    expect(result.revenueCents).toBe(-3000)
    expect(result.costsCents).toBe(30000)
    expect(s).toEqual(before)
  })

  it('adds only the selected slot capacity after the upgrade is ready', () => {
    const s = fixture()
    const f = s.product.features.find((p) => p.id === 'invoice_export')!
    f.shippedWeek = null
    f.readyWeek = 3
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 2)).toBe(4)
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 3)).toBe(8)
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 3)).toBe(4)
  })

  it('charges only served extra weekday units across a shared pool, not cancellations or evenings', () => {
    const s = fixture()
    s.scenario.bookings!.products.allergy_filter!.capacityOf = 'basic_ordering'
    const started = beginLeisure(s, plan(), rng()).state
    const before = structuredClone(started)
    const result = finishLeisure(started, [
      book({ id: 'main', units: 3 }),
      book({ id: 'alias', productId: 'allergy_filter', units: 3 }),
      book({ id: 'cancelled', status: 'company_cancelled', units: 2 }),
      book({ id: 'evening', slotId: 'evening', units: 4 }),
    ])
    expect(result.extraCostsCents).toBe(80000)
    expect(result.state.bookings!.leisure!.weeks[0]!.turnaroundCents).toEqual({
      invoice_export: 80000,
    })
    const view = getView(result.state).bookings!.leisure!
    expect(view.upgrades).toMatchObject([
      { active: true, additional: 4, paidCents: 80000, unitCostCents: 40000 },
    ])
    view.history[0]!.turnaroundCents!.invoice_export = 1
    expect(result.state.bookings!.leisure!.weeks[0]!.turnaroundCents!.invoice_export).toBe(80000)
    expect(started).toEqual(before)
  })

  it('pays the turnaround cost once in the operating-cost ledger', () => {
    const s = fixture()
    s.bookings!.bookings = [
      book({ units: 6, status: 'booked' }),
      book({ id: 'evening', units: 2, slotId: 'evening', status: 'booked' }),
    ]
    const result = applyBookings(s, operating(), rng())
    expect(
      result.state
        .bookings!.bookings.filter((b) => b.status === 'served')
        .reduce((n, b) => n + b.units, 0),
    ).toBe(8)
    expect(result.costsCents).toBe(30000 + 8 * 1000 + 80000)
  })

  it('charges nothing for a closed upgraded hall with no served events', () => {
    const s = fixture()
    const f = s.product.features.find((p) => p.id === 'member_billing')!
    f.shippedWeek = null
    f.readyWeek = 3
    const started = beginLeisure(s, plan(), rng()).state
    expect(finishLeisure(started, []).extraCostsCents).toBe(0)
  })

  it('rejects upgrades naming unknown pools/slots and overlapping upgrade charges', () => {
    expect(
      LeisureSchema.safeParse(
        leisureConfig({
          slotUpgrades: {
            invoice_export: { ...upgrade.invoice_export, product: 'missing' },
          },
        }),
      ).success,
    ).toBe(false)
    expect(
      LeisureSchema.safeParse(
        leisureConfig({
          slotUpgrades: {
            invoice_export: { ...upgrade.invoice_export, slot: 'missing' },
          },
        }),
      ).success,
    ).toBe(false)
    expect(
      LeisureSchema.safeParse(
        leisureConfig({
          slotUpgrades: {
            ...upgrade,
            member_billing: { ...upgrade.invoice_export },
          },
        }),
      ).success,
    ).toBe(false)
    expect(
      LeisureSchema.safeParse(
        leisureConfig({
          buildOut: {
            member_billing: { weeks: 2, closes: ['missing'] },
          },
        }),
      ).success,
    ).toBe(false)
  })
})

function equipmentGame(alias = false): GameState {
  const scenario = leisureScenario({ memberships: undefined })
  for (const segment of Object.values(scenario.bookings.segments)) segment.base = { min: 0, max: 0 }
  const product = alias ? 'allergy_filter' : 'basic_ordering'
  if (alias) {
    scenario.bookings.products.allergy_filter!.capacityOf = 'basic_ordering'
    delete scenario.bookings.leisure!.products.allergy_filter
  }
  scenario.bookings.products[product]!.requires = 'member_billing'
  scenario.bookings.assets = {
    equipment: {
      name: 'Tables and chairs',
      products: [product],
      buy: {
        product: 'member_billing',
        upkeepMonthlyCents: 0,
        crewWeekCents: 0,
        breakdown: { weekly: 0, perYear: 0, weeks: { min: 1, max: 1 }, repairCents: 0 },
        ageYears: 0,
        valueLossPerYear: 0,
      },
      share: { capacity: 1, unitCents: 90000, revenueShare: 0 },
      lease: {
        seasonCents: 1200000,
        upfrontShare: 0,
        months: Array.from({ length: 12 }, (_, n) => n + 1),
        minMonths: 1,
        crewWeekCents: 0,
      },
    },
  }
  const s = createGame(scenario, 'venue-equipment')
  s.product.features = s.product.features.map((f) => ({
    ...f,
    shippedWeek: f.id === 'member_billing' ? null : 0,
  }))
  return s
}

describe('leisure equipment supply', () => {
  it('requires available equipment for a pool, with hire fulfilling the physical must-have', () => {
    const initial = equipmentGame()
    expect(leisureCapacity(initial, 'basic_ordering', 'daytime', 1)).toBe(0)
    expect(mustHaveMet(initial, 'member_billing')).toBe(false)
    const s = chooseAsset(initial, 'equipment', 'share').state
    expect(leisureCapacity(s, 'basic_ordering', 'daytime', 1)).toBe(4)
    expect(mustHaveMet(s, 'member_billing')).toBe(true)
    expect(s.product.features.find((f) => f.id === 'member_billing')!.shippedWeek).toBeNull()
    expect(initial.bookings!.assets!.equipment!.option).toBe('none')
  })

  it('does not let an unavailable alias asset close other uses of the hall', () => {
    const initial = equipmentGame(true)
    expect(leisureRoom(initial, [], 'basic_ordering', 'daytime', 1)).toBe(4)
    expect(leisureRoom(initial, [], 'allergy_filter', 'daytime', 1)).toBe(0)
    const hired = chooseAsset(initial, 'equipment', 'share').state
    expect(leisureRoom(hired, [], 'allergy_filter', 'daytime', 1)).toBe(4)
    const reserved = [book({ productId: 'allergy_filter', units: 3, status: 'booked' })]
    expect(leisureRoom(hired, reserved, 'basic_ordering', 'daytime', 1)).toBe(1)
  })

  it('honours an alias preparation date as well as its available equipment', () => {
    const s = chooseAsset(equipmentGame(true), 'equipment', 'share').state
    const f = s.product.features.find((x) => x.id === 'allergy_filter')!
    f.shippedWeek = null
    f.readyWeek = 3
    expect(leisureRoom(s, [], 'allergy_filter', 'daytime', 2)).toBe(0)
    expect(leisureRoom(s, [], 'allergy_filter', 'daytime', 3)).toBe(4)
  })

  it('charges hire once per actually served event while preserving the input', () => {
    const s = chooseAsset(equipmentGame(true), 'equipment', 'share').state
    s.bookings!.bookings = [book({ productId: 'allergy_filter', status: 'booked' })]
    const before = structuredClone(s)
    const result = applyBookings(s, operating(), rng())
    expect(result.state.bookings!.bookings[0]!.status).toBe('served')
    expect(result.state.bookings!.assets!.equipment!.costCents).toBe(90000)
    expect(result.costsCents).toBe(
      30000 + s.scenario.bookings!.products.allergy_filter!.unitCostCents + 90000,
    )
    expect(s).toEqual(before)
  })

  it('charges no hire fee for owned equipment', () => {
    const s = equipmentGame(true)
    s.product.features.find((f) => f.id === 'member_billing')!.shippedWeek = 0
    const bought = assetsBought(s, ['member_billing']).state
    expect(leisureRoom(bought, [], 'allergy_filter', 'daytime', 1)).toBe(4)
    expect(
      assetsUsed(bought, new Map([['allergy_filter', { units: 1, grossCents: 10000 }]])).costsCents,
    ).toBe(0)
  })

  it('refunds an accepted event if its hired equipment is withdrawn', () => {
    const hired = chooseAsset(equipmentGame(true), 'equipment', 'share').state
    const s = chooseAsset(hired, 'equipment', 'none').state
    s.bookings!.bookings = [
      book({ productId: 'allergy_filter', status: 'booked', depositCents: 3000 }),
    ]
    const result = applyBookings(s, operating(), rng())
    expect(result.state.bookings!.bookings[0]!.status).toBe('company_cancelled')
    expect(result.revenueCents).toBe(-3000)
    expect(result.state.bookings!.assets!.equipment!.costCents).toBe(0)
  })

  it('shows lease availability changing within the future calendar', () => {
    const initial = equipmentGame()
    initial.scenario.bookings!.assets!.equipment!.lease!.months = [4]
    const s = chooseAsset(initial, 'equipment', 'lease').state
    const calendar = getView(s).bookings!.leisure!.slotCalendar.filter(
      (c) => c.productId === 'basic_ordering' && c.slotId === 'daytime',
    )
    expect(calendar.find((c) => c.week === 1)!.capacity).toBe(0)
    expect(calendar.find((c) => c.week === 5)!.capacity).toBe(4)
  })

  it('records alias service once under the physical hall load', () => {
    const s = chooseAsset(equipmentGame(true), 'equipment', 'share').state
    const started = beginLeisure(s, plan(), rng()).state
    const result = finishLeisure(started, [book({ productId: 'allergy_filter', units: 3 })])
    const load = getView(result.state).bookings!.leisure!.load
    expect(
      load.find((x) => x.productId === 'basic_ordering' && x.slotId === 'daytime'),
    ).toMatchObject({ visits: 3, load: 'busy' })
    expect(load.some((x) => x.productId === 'allergy_filter')).toBe(false)
  })

  it('replays upgrade installation and closure/reopening from a real action log', () => {
    const scenario = leisureScenario({
      slotUpgrades: upgrade,
      buildOut: { member_billing: { weeks: 2, closes: ['basic_ordering'] } },
    })
    for (const segment of Object.values(scenario.bookings.segments))
      segment.base = { min: 0, max: 0 }
    scenario.events = []
    let s = createGame(scenario, 'venue-capacity-replay')
    let sawClosure = false
    let sawUpgrade = false
    for (let w = 0; w < 48; w++) {
      const id = ['basic_ordering', 'invoice_export', 'member_billing'].find((id) => {
        const f = s.product.features.find((f) => f.id === id)!
        return f.shippedWeek === null && f.readyWeek === undefined
      })
      const f = s.product.features.find((f) => f.id === id)
      const def = scenario.features.find((f) => f.id === id)
      const build = id && f && def ? { [id]: Math.min(10, def.buildHours - f.progressHours) } : {}
      s = endWeek(s, plan({ build })).state
      sawUpgrade ||= getView(s).bookings!.leisure!.upgrades![0]!.active
      sawClosure ||=
        s.product.features.some(
          (f) => f.id === 'member_billing' && f.readyWeek !== undefined && f.shippedWeek === null,
        ) && leisureCapacity(s, 'basic_ordering', 'daytime', s.week) === 0
    }
    expect(sawClosure).toBe(true)
    expect(sawUpgrade).toBe(true)
    expect(replay(scenario, toSave(s))).toEqual(s)
  })
})
