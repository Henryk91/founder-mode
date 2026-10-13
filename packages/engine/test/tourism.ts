import { loadScenario, type BookingsConfig } from '@founder-mode/content'
import type { Scenario } from '../src/types'

/**
 * A bookings fixture for engine tests: Kantino's markets and features with a `bookings` block, so
 * the engine can be tested before the real tourism scenarios exist (step 4). Not a scenario a
 * player can pick.
 */
export function tourismScenario(over: Partial<BookingsConfig> = {}): Scenario {
  const s = loadScenario('kantino', 'long')
  const flat = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
  const weatherAll = Array.from({ length: 12 }, () => ({
    good: 0.4,
    mixed: 0.3,
    bad: 0.2,
    dangerous: 0.1,
  }))
  const segment = (unit: 'person' | 'group', invoiced = false) => ({
    base: { min: 40, max: 40 },
    unit,
    price: { peak: 50_000, off: 40_000 },
    size: { min: 1, max: 1 },
    leadWeeks: { min: 0, max: 2 },
    season: flat,
    response: { platform: 0.8, website: 0.5, partnership: 0.5, outreach: 0.5, walkIn: 0.2 },
    cancel: 0.1,
    strictConversion: 0.8,
    weatherSensitive: true,
    invoiced,
    reviewWeight: 0.5,
  })
  const bookings: BookingsConfig = {
    startWeekOfYear: 10,
    seasonNoise: 0,
    peakMonths: [6, 7, 8],
    policyWeeks: 4,
    weather: {
      monthly: weatherAll,
      forecastAccuracy: 0.8,
      demand: { good: 1.15, mixed: 1, bad: 0.7, dangerous: 0.5 },
      cancel: { good: 1, mixed: 1.2, bad: 2, dangerous: 3 },
    },
    platform: { name: 'Tripbuddy', commission: 0.25 },
    website: { product: 'invoice_export', repeatsFull: 50 },
    partnershipHours: 6,
    partnershipCut: 0,
    outreachHoursFull: 10,
    reachCap: 1.5,
    roleFactor: { viable: 1, mediocre: 1, trap: 1 },
    fitBase: 0.5,
    segments: {
      small_offices: segment('person'),
      coworking: segment('person'),
      medical: segment('group', true),
    },
    products: {
      basic_ordering: {
        capacity: 30,
        serves: ['small_offices', 'coworking', 'medical'],
        oneOffCents: 100_000,
        monthlyCents: 5_000,
        unitCostCents: 1_000,
        months: [],
        weatherClosed: true,
      },
      allergy_filter: {
        capacity: 10,
        serves: ['medical'],
        oneOffCents: 0,
        monthlyCents: 0,
        unitCostCents: 0,
        months: [],
        weatherClosed: false,
        alternative: undefined,
      },
    },
    roles: {
      guide: {
        name: 'Guide',
        centsPerShift: 30_000,
        units: { basic_ordering: 10, allergy_filter: 5 },
        available: [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
        founderHours: 8,
      },
    },
    reviews: {
      qualityBase: 4.4,
      noiseSd: 0,
      understaffPenalty: 2,
      tiredPenalty: 0.5,
      cancelPenalty: 1,
      snagPenalty: 0.1,
      valueWeight: 1,
      reviewsPerUnit: 0.5,
      reviewsFull: 30,
    },
    ...over,
  }
  return { ...s, bookings }
}
