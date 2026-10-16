import type { BookingsConfig, ConditionsConfig } from '@founder-mode/content'
import type { Scenario } from '../src/types'
import { tourismScenario } from './tourism'

/**
 * Plan 4: a fixture for the abroad mechanics (docs/abroad-mechanics.md), built on the bookings
 * fixture: day conditions in two slots, a morning course with a next step, a product for
 * graduates, a day trip, a whole-week product, a licence, a tender and a local cost step. Not a
 * scenario a player can pick.
 */
export const STATES = ['calm', 'light', 'good', 'strong', 'storm'] as const

export function conditions(over: Partial<ConditionsConfig> = {}): ConditionsConfig {
  const month = { morning: [0.5, 0.3, 0.1, 0.07, 0.03], afternoon: [0.1, 0.3, 0.4, 0.15, 0.05] }
  return {
    states: STATES.map((id) => ({ id, name: `${id} wind` })),
    slots: [
      { id: 'morning', name: 'Mornings' },
      { id: 'afternoon', name: 'Afternoons' },
    ],
    monthly: Array.from({ length: 12 }, () => ({ ...month })),
    persistence: 0.6,
    forecastAccuracy: 0.8,
    spot: { name: 'Es Racó', slot: 'afternoon', shift: 1 },
    review: {
      bad: ['strong', 'storm'],
      perBadSlot: 0.1,
      good: ['calm'],
      perGoodSlot: 0.02,
      shelter: 'member_billing',
      shelterFactor: 0.5,
    },
    ...over,
  }
}

export function abroadScenario(over: Partial<BookingsConfig> = {}): Scenario {
  const base = tourismScenario()
  const b = base.bookings!
  const product = (p: Partial<BookingsConfig['products'][string]>) => ({
    capacity: 0,
    serves: [],
    oneOffCents: 0,
    monthlyCents: 0,
    unitCostCents: 0,
    months: [],
    weatherClosed: false,
    ...p,
  })
  const bookings: BookingsConfig = {
    ...b,
    weather: undefined,
    conditions: conditions(),
    trips: { policyWeeks: 2, start: 2 },
    tender: {
      costId: 'accountant',
      higherFactor: 1.4,
      keep: { min: 0.5, max: 0.85, perContract: 0.05 },
      lost: { walkIn: 0.5, partnership: 0.7 },
      hotel: { factor: 0.6, revenueShare: 0.15, walkIn: 0.5, partnership: 0.7 },
    },
    costSteps: [
      { week: 53, factor: 1.15, fixedCosts: ['tools_hosting'], roles: true, unitCosts: true },
    ],
    products: {
      basic_ordering: product({
        capacity: 40,
        serves: ['small_offices', 'coworking', 'medical'],
        unitCostCents: 1_000,
        runsIn: ['calm', 'light'],
        slots: ['morning'],
        alternative: 'supplier_portal',
        course: {
          level: 'basic',
          sameStay: { share: 0.5, products: ['chat_integration'] },
          nextSeason: { direct: 0.5, platform: 0.1, products: ['chat_integration'] },
        },
      }),
      chat_integration: product({
        capacity: 30,
        serves: ['coworking'],
        runsIn: ['light', 'good', 'strong'],
        needsLevel: 'basic',
      }),
      allergy_filter: product({
        capacity: 6,
        serves: ['medical'],
        runsIn: ['good', 'strong'],
        dayTrip: { perTrip: 3, days: 2, costCents: 4_000 },
      }),
      multi_site: product({ capacity: 16, serves: ['small_offices'], wholeWeek: true }),
      member_billing: product({}),
      supplier_portal: product({ capacity: 20, serves: [] }),
      invoice_export: product({}),
      shift_schedule: product({ waitWeeks: 3, oneOffCents: 100_000 }),
    },
    roles: {
      guide: {
        name: 'Guide',
        centsPerShift: 30_000,
        units: {
          basic_ordering: 10,
          chat_integration: 10,
          allergy_filter: 3,
          multi_site: 16,
          supplier_portal: 10,
        },
        available: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
        founderHours: 8,
      },
    },
    ...over,
  }
  return { ...base, bookings }
}
