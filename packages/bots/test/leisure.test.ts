import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  replay,
  respond,
  toSave,
  type BookingsPlan,
} from '@founder-mode/engine'
import { runGame } from '../src/simulate'
import { playsIn } from '../src/strategy'
import { TOURISM_STRATEGIES } from '../src/strategies/tourism'
import { evaluateTourismTargets } from '../src/tourismReport'
import { PlanBuilder } from '../src/strategy'
import { planLeisure } from '../src/strategies/leisure'
import { CAREFUL_TOURISM } from '../src/strategies/tourism'

describe('Ausgesperrt players', () => {
  const scenario = loadScenario('ausgesperrt', 'long')
  const strategies = TOURISM_STRATEGIES.filter((s) => playsIn(s, scenario))
  it('budgets all rebuilds together with construction finishing this week', () => {
    const view = getView(createGame(scenario, 'rebuild-budget'))
    view.company.cashCents = 7000000
    const l = view.bookings!.leisure!
    const open = ['heist', 'horror', 'munich_history']
    for (const f of view.product.features)
      if (open.includes(f.id)) {
        f.shipped = true
        f.remainingHours = 0
      }
    for (const f of l.freshness) if (open.includes(f.productId)) f.word = 'tired'
    const b = new PlanBuilder(view, 50)
    const plan = {
      shifts: {},
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    } as NonNullable<typeof b.plan.bookings>
    planLeisure(view, b, plan, CAREFUL_TOURISM)
    expect(plan.leisure!.refresh).toHaveLength(2)
    const building = new PlanBuilder(view, 50)
    building.plan.build.kids_adventure = view.product.features.find(
      (f) => f.id === 'kids_adventure',
    )!.remainingHours
    const next: BookingsPlan = { ...plan }
    delete next.leisure
    planLeisure(view, building, next, CAREFUL_TOURISM)
    expect(next.leisure!.refresh).toHaveLength(1)
  })
  it.each(strategies.map((s) => [s.id, s] as const))(
    '%s completes a run with valid plans',
    (_id, strategy) => {
      const r = runGame(scenario, strategy, 'leisure-smoke')
      expect(r.weeks).toBeGreaterThan(0)
      expect(r.weeks).toBeLessThanOrEqual(104)
      expect(Number.isFinite(r.finalWealthCents)).toBe(true)
    },
  )
  it('replays the careful player, never overbooks physical space, and exposes its actual opening', () => {
    const bot = strategies.find((s) => s.id === 'tourism_careful')!
    const player = bot.create(scenario, 'leisure-replay')
    let state = createGame(scenario, 'leisure-replay')
    while (state.status === 'running') {
      for (const a of player.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const r = endWeek(state, player.plan(getView(state)))
      state = r.state
      player.observe?.(r.report, getView(state))
      const space = getView(state).bookings!.leisure!.space!
      expect(space.used).toBeLessThanOrEqual(space.max)
    }
    expect(state.bookings!.leisure!.openingWeek).not.toBeNull()
    expect(replay(scenario, toSave(state))).toEqual(state)
  })
  it('reports X1–X4, E1 and T4 relative to opening, without office expansion targets', () => {
    const rows = strategies.map((s) => ({
      id: s.id,
      description: s.description,
      seconds: 0.1,
      results: [runGame(scenario, s, 'leisure-report')],
    }))
    const targets = evaluateTourismTargets({
      engineVersion: 'test',
      runs: 1,
      seedPrefix: 'leisure-report',
      strategies: rows,
      tourism: true,
      maxWeeks: 104,
    })
    expect(targets.map((t) => t.id)).toContain('E1')
    expect(
      targets.filter((t) => typeof t.id === 'string' && t.id.startsWith('X')).map((t) => t.id),
    ).toEqual(['X1', 'X2', 'X3', 'X4'])
    expect(targets.map((t) => t.id)).not.toContain(19)
    expect(targets.find((t) => t.id === 4)!.text).toContain('from opening')
  })
})
