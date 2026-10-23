import { expect, it } from 'vitest'
import { createGame } from '../src/index'
import { coverage } from '../src/systems/market'
import { mustHaveMet } from '../src/systems/bookings'
import { leisureCapacity } from '../src/systems/leisure'
import { leisureScenario } from './leisure'

it('recognises a ready market alternative without creating another physical wall', () => {
  const spec = leisureScenario({ alternatives: { basic_ordering: ['allergy_filter'] } })
  const s = createGame(spec, 'alternative-wall')
  s.hidden.segments.medical!.mustHave = ['basic_ordering']
  s.product.features.find((f) => f.id === 'allergy_filter')!.shippedWeek = 0
  expect(coverage(s, 'medical')).toBe(1)
  expect(mustHaveMet(s, 'basic_ordering')).toBe(true)
  expect(leisureCapacity(s, 'basic_ordering', 'daytime', 1)).toBe(0)
  delete s.scenario.bookings!.leisure!.alternatives
  expect(coverage(s, 'medical')).toBe(0)
  expect(mustHaveMet(s, 'basic_ordering')).toBe(false)
})
it('does not advertise an alternative before its actual prerequisite is ready', () => {
  const spec = leisureScenario({ alternatives: { basic_ordering: ['allergy_filter'] } })
  spec.bookings.products.allergy_filter!.requires = 'invoice_export'
  const s = createGame(spec, 'alternative-required')
  s.product.features.find((f) => f.id === 'allergy_filter')!.shippedWeek = 0
  expect(mustHaveMet(s, 'basic_ordering')).toBe(false)
  s.product.features.find((f) => f.id === 'invoice_export')!.shippedWeek = 0
  expect(mustHaveMet(s, 'basic_ordering')).toBe(true)
})
