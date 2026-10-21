import { describe, expect, it } from 'vitest'
import { LeisureSchema, ScenarioSchema, loadScenario } from '@founder-mode/content'
import { createGame, endWeek, getView, replay, toSave } from '../src/index'
import { validatePlan } from '../src/plan'
import { canFinance } from '../src/systems/loan'
import { leisureCapacity } from '../src/systems/leisure'
import { conditionValue } from '../src/systems/conditions'
import { viewConditionValue } from '../src/systems/viewConditions'
import { leisureConfig, leisureScenario } from './leisure'
import { plan } from './helpers'

function scenario(approval: number) {
  const s = leisureScenario({
    memberships: undefined,
    buildOut: { basic_ordering: { weeks: 2 } },
    permits: { basic_ordering: { approval, refundCents: 70000 } },
    opening: { areas: ['basic_ordering'], requires: [] },
  })
  s.events = []
  for (const segment of Object.values(s.bookings.segments)) segment.base = { min: 0, max: 0 }
  return s
}
function waiting(approval: number) {
  const spec = scenario(approval)
  const initial = createGame(spec, 'venue-permit')
  const hours = spec.features.find((f) => f.id === 'basic_ordering')!.buildHours
  const first = endWeek(initial, plan({ build: { basic_ordering: hours } }))
  return { spec, initial, first, before: endWeek(first.state, plan()).state }
}

describe('venue permit decisions', () => {
  it('decides at readiness, returns only the stated refundable cost and never refunds twice', () => {
    const { initial, first, before } = waiting(0)
    expect(first.state.ledger[0]!.bookingCostsCents).toBe(100000)
    expect(first.state.product.features.find((f) => f.id === 'basic_ordering')).toMatchObject({
      readyWeek: 3,
      shippedWeek: null,
    })
    const original = structuredClone(before)
    const result = endWeek(before, plan())
    const feature = result.state.product.features.find((f) => f.id === 'basic_ordering')!
    expect(feature).toMatchObject({ refusedWeek: 3, shippedWeek: null })
    expect(feature.readyWeek).toBeUndefined()
    expect(result.state.ledger.at(-1)!.bookingCostsCents).toBe(-70000)
    expect(result.state.ledger.at(-1)!.bookingRevenueCents).toBe(0)
    expect(result.report.entries).toContainEqual({
      kind: 'permit_refused',
      featureId: 'basic_ordering',
      name: 'Daily group order',
      refundCents: 70000,
      feeCents: 30000,
    })
    const again = endWeek(result.state, plan()).state
    expect(again.ledger.at(-1)!.bookingCostsCents).toBe(0)
    expect(again.ledger.reduce((sum, w) => sum + w.bookingCostsCents, 0)).toBe(30000)
    expect(again.bookings!.leisure!.permitRefunds).toEqual({
      basic_ordering: { week: 3, cents: 70000 },
    })
    expect(before).toEqual(original)
    expect(initial.product.features.find((f) => f.id === 'basic_ordering')!.progressHours).toBe(0)
  })

  it('ships approved construction normally with no cashback or refusal fields', () => {
    const { before } = waiting(1)
    const result = endWeek(before, plan())
    expect(result.state.product.features.find((f) => f.id === 'basic_ordering')).toMatchObject({
      shippedWeek: 3,
    })
    expect(
      result.state.product.features.find((f) => f.id === 'basic_ordering')!.refusedWeek,
    ).toBeUndefined()
    expect(result.state.bookings!.leisure!.openingWeek).toBe(3)
    expect(result.state.bookings!.leisure!.permitRefunds).toEqual({})
    expect(result.state.ledger.reduce((sum, w) => sum + w.bookingCostsCents, 0)).toBe(100000)
    expect(result.report.entries.some((e) => e.kind === 'permit_refused')).toBe(false)
  })

  it('does not sell a refused build or allow the same application to be built again', () => {
    const { before } = waiting(0)
    const s = endWeek(before, plan()).state
    expect(leisureCapacity(s, 'basic_ordering', 'evening', 20)).toBe(0)
    expect(
      validatePlan(s, plan({ build: { basic_ordering: 1 } })).some(
        (i) => i.code === 'build_exceeds_remaining',
      ),
    ).toBe(true)
    const bank = { ...loadScenario('ausgesperrt', 'long').loan!, items: ['basic_ordering'] }
    const fresh = createGame({ ...scenario(0), loan: bank }, 'venue-permit')
    expect(canFinance(fresh, 'basic_ordering')).toBe(true)
    expect(canFinance({ ...s, scenario: { ...s.scenario, loan: bank } }, 'basic_ordering')).toBe(
      false,
    )
  })

  it('exposes the stated refundable amount and actual decision, not its approval chance', () => {
    const { first, before } = waiting(0)
    const waitingView = getView(first.state).bookings!.leisure!.builds[0]!
    expect(waitingView.permit).toEqual({
      refundableCents: 70000,
      refusedWeek: null,
      returnedCents: 0,
    })
    expect(Object.keys(waitingView.permit!)).not.toContain('approval')
    const s = endWeek(before, plan()).state
    const v = getView(s)
    expect(v.bookings!.leisure!.builds[0]!.permit).toEqual({
      refundableCents: 70000,
      refusedWeek: 3,
      returnedCents: 70000,
    })
    expect(conditionValue(s, 'leisure.permitRefusals')).toBe(1)
    expect(viewConditionValue(v, 'leisure.permitRefusals')).toBe(1)
  })

  it.each([0, 1])(
    'replays the permit decision and settlement exactly at approval=%s',
    (approval) => {
      const { spec, before } = waiting(approval)
      let s = endWeek(before, plan()).state
      s = endWeek(s, plan()).state
      expect(replay(spec, toSave(s))).toEqual(s)
    },
  )

  it('requires a real waited build and a refundable amount no larger than its cost', () => {
    expect(ScenarioSchema.safeParse(scenario(0.5)).success).toBe(true)
    const excessive = scenario(0.5)
    excessive.bookings.leisure!.permits!.basic_ordering!.refundCents = 100001
    expect(ScenarioSchema.safeParse(excessive).success).toBe(false)
    expect(
      LeisureSchema.safeParse(
        leisureConfig({ permits: { basic_ordering: { approval: 0.5, refundCents: 0 } } }),
      ).success,
    ).toBe(false)
    const unknown = scenario(0.5)
    unknown.bookings.leisure!.permits = { missing: { approval: 1, refundCents: 0 } }
    unknown.bookings.leisure!.buildOut = { missing: { weeks: 1 } }
    expect(ScenarioSchema.safeParse(unknown).success).toBe(false)
  })
})
