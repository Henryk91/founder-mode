import type { LeisureConfig } from '@founder-mode/content'
import { tourismScenario } from './tourism'

const segment = () => ({
  slotShare: { daytime: 0.3, evening: 0.7 },
  visitsPerWeek: 2,
  memberShare: 0.5,
  churn: 0,
  crowdingChurn: 0,
  freshnessChurn: 0,
  priceChurn: 0,
  januaryFade: 0,
  waitlistAt: 3,
})
export const leisureConfig = (over: Partial<LeisureConfig> = {}): LeisureConfig => ({
  slots: [
    { id: 'daytime', name: 'Weekday daytime', hours: 20 },
    { id: 'evening', name: 'Weekday evenings', hours: 20 },
  ],
  segments: { small_offices: segment(), coworking: segment(), medical: segment() },
  products: {
    basic_ordering: { capacity: { daytime: 4, evening: 4 } },
    allergy_filter: { capacity: { daytime: 4, evening: 4 } },
  },
  memberships: {
    member_billing: {
      kind: 'monthly',
      priceCents: 10000,
      serves: ['small_offices', 'coworking', 'medical'],
      slots: ['daytime', 'evening'],
      termWeeks: 0,
      noticeWeeks: 4,
    },
    supplier_portal: {
      kind: 'annual',
      priceCents: 8000,
      serves: ['small_offices', 'coworking', 'medical'],
      slots: ['daytime', 'evening'],
      termWeeks: 52,
      noticeWeeks: 4,
    },
    shift_schedule: {
      kind: 'pack',
      priceCents: 10000,
      serves: ['small_offices', 'coworking', 'medical'],
      slots: ['daytime', 'evening'],
      termWeeks: 0,
      noticeWeeks: 0,
      visits: 10,
      validWeeks: 26,
    },
  },
  crowdingPenalty: 1,
  quietBelow: 0.5,
  packedFrom: 1,
  ...over,
})
export function leisureScenario(over: Partial<LeisureConfig> = {}) {
  const s = tourismScenario()
  const b = s.bookings!
  const zero = {
    capacity: 0,
    serves: [],
    oneOffCents: 0,
    monthlyCents: 0,
    unitCostCents: 0,
    months: [],
    weatherClosed: false,
  }
  return {
    ...s,
    start: { ...s.start, cashCents: 100000000, savingsCents: 10000000 },
    bookings: {
      ...b,
      weather: undefined,
      leisure: leisureConfig(over),
      segments: Object.fromEntries(
        Object.entries(b.segments).map(([id, x]) => [
          id,
          {
            ...x,
            cancel: 0,
            leadWeeks: { min: 0, max: 0 },
            weatherSensitive: false,
            invoiced: false,
          },
        ]),
      ),
      products: {
        ...b.products,
        basic_ordering: { ...b.products.basic_ordering!, capacity: 8 },
        allergy_filter: { ...b.products.allergy_filter!, capacity: 8 },
        member_billing: { ...zero },
        invoice_export: { ...zero },
        supplier_portal: { ...zero },
        shift_schedule: { ...zero },
      },
    },
  }
}
