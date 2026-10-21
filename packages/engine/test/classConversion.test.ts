import { describe, expect, it } from 'vitest'
import { LeisureSchema } from '@founder-mode/content'
import { createGame, getView } from '../src/index'
import { leisureCapacity, leisureValid } from '../src/systems/leisure'
import { leisureConfig, leisureScenario } from './leisure'
import { plan } from './helpers'

function game() {
  const s = createGame(
    leisureScenario({
      products: {
        basic_ordering: {
          capacity: {},
          classPlaces: 18,
          classHours: 1,
          room: 'studio',
          classPlacesWhen: { feature: 'invoice_export', places: 8 },
        },
        allergy_filter: { capacity: {}, classPlaces: 8, classHours: 1, room: 'studio' },
      },
    }),
    'class-conversion',
  )
  s.product.features = s.product.features.map((f) => ({
    ...f,
    shippedWeek: f.id === 'invoice_export' ? null : 0,
  }))
  s.bookings!.leisure!.timetable = {
    basic_ordering: { evening: 2 },
    allergy_filter: { evening: 2 },
  }
  return s
}
const timetable = (classes: number) =>
  plan({
    bookings: {
      shifts: {},
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
      leisure: {
        timetable: {
          basic_ordering: { evening: classes },
          allergy_filter: { evening: classes },
        },
      },
    },
  })

describe('optional class-room conversion', () => {
  it('replaces mat seats without creating more room hours and shows actual places', () => {
    const s = game()
    const original = structuredClone(s)
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 1)).toBe(36)
    expect(s).toEqual(original)
    s.product.features.find((f) => f.id === 'invoice_export')!.shippedWeek = 0
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 1)).toBe(16)
    expect(leisureCapacity(s, 'allergy_filter', 'evening', 1)).toBe(16)
    expect(getView(s).bookings!.leisure!.timetable.map((x) => x.places)).toEqual([8, 8])
    expect(leisureValid(s, timetable(10))).toBe(true)
    expect(leisureValid(s, timetable(11))).toBe(false)
  })

  it('uses conversion readiness on the actual service date', () => {
    const s = game()
    s.product.features.find((f) => f.id === 'invoice_export')!.readyWeek = 4
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 3)).toBe(36)
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 4)).toBe(16)
  })

  it('rejects a conversion on a product with no classes', () => {
    const c = leisureConfig()
    c.products.basic_ordering!.classPlacesWhen = { feature: 'invoice_export', places: 8 }
    expect(LeisureSchema.safeParse(c).success).toBe(false)
  })
})
