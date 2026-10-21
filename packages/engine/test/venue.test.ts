import { describe, expect, it } from 'vitest'
import { LeisureSchema } from '@founder-mode/content'
import { createGame, getView } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { applyBookings } from '../src/systems/bookings'
import { beginLeisure, finishLeisure, leisureCapacity } from '../src/systems/leisure'
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
