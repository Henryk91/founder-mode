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
import { leisureBuildOrder, leisureWanted, planLeisure } from '../src/strategies/leisure'
import { CAREFUL_TOURISM } from '../src/strategies/tourism'

describe('Ausgesperrt players', () => {
  const scenario = loadScenario('ausgesperrt', 'long')
  const strategies = TOURISM_STRATEGIES.filter((s) => playsIn(s, scenario))
  it('keeps the brochure-led portfolio temptation inside its physical-space limit', () => {
    const view = getView(createGame(scenario, 'blind-portfolio'))
    const themes = scenario.bookings!.leisure!.opening!.areas
    expect(leisureBuildOrder(view, themes)).not.toContain('vr_room')
    const blind = leisureBuildOrder(view, themes, true)
    expect(blind).toContain('vr_room')
    expect(blind).toHaveLength(view.bookings!.leisure!.space!.max)
    expect(blind[0]).toBe('vr_room')
  })
  it('can finance a larger room after accepting a smaller startup loan', () => {
    const player = strategies.find((s) => s.id === 'tourism_careful')!.create(scenario, 'test-0')
    let state = createGame(scenario, 'test-0')
    const accepted: number[] = []
    while (state.status === 'running' && accepted.length < 2) {
      for (const a of player.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const result = endWeek(state, player.plan(getView(state)))
      state = result.state
      player.observe?.(result.report, getView(state))
      for (const entry of result.report.entries)
        if (entry.kind === 'loan_accepted') accepted.push(entry.amountCents)
    }
    expect(accepted).toHaveLength(2)
    expect(accepted[1]).toBeGreaterThan(accepted[0]!)
    const cashOnly = strategies.find((s) => s.id === 'leisure_no_later_loan')!
    expect(runGame(scenario, cashOnly, 'test-0').loan?.second).toBe(false)
  })
  it('adds capacity after repeated visible refusals, while preserving the comparison policies', () => {
    const view = getView(createGame(scenario, 'room-pressure'))
    const l = view.bookings!.leisure!
    l.buildChoice = ['heist']
    l.openingWeek = 10
    view.week = 14
    const first = view.product.features.find((f) => f.id === 'heist')!
    first.shipped = true
    first.remainingHours = 0
    const theme = l.freshness.find((f) => f.productId === 'heist')!
    theme.openedWeek = 10
    theme.word = 'new'
    const wanted = (rule = CAREFUL_TOURISM) =>
      leisureWanted(scenario, view, rule, [], 'locals', 'room-pressure')
    expect(wanted()).toEqual(['heist'])
    l.history = [11, 12, 13].map((week) => ({
      week,
      turnedAway: { locals: 5 },
      joined: 0,
      cancelled: 0,
      active: 0,
      signed: 0,
      held: 0,
      converted: 0,
      released: 0,
      lateReleased: 0,
      aggregatorCancellations: 0,
      aggregatorPayoutCents: 0,
      slots: [
        {
          productId: 'heist',
          slotId: 'weekend',
          visits: 14,
          turnedAway: 5,
          aggregator: 0,
          load: 'packed' as const,
        },
      ],
    }))
    expect(wanted()).toHaveLength(2)
    expect(wanted({ ...CAREFUL_TOURISM, leisure: { rooms: 'one' } })).toEqual(['heist'])
    expect(wanted({ ...CAREFUL_TOURISM, leisure: { rooms: 'quarterly' } })).toEqual(['heist'])
    l.history = l.history.slice(1)
    expect(wanted()).toEqual(['heist'])
    const unfinished = view.product.features.find((f) => f.id === 'horror')!
    unfinished.progressHours = 5
    unfinished.remainingHours -= 5
    expect(wanted()).toEqual(['heist', 'horror'])
    theme.word = 'known'
    expect(wanted()).toEqual(['heist', 'horror'])
  })
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
    expect(targets.find((t) => t.id === 3)!.margin).toContain('±')
    expect(targets.find((t) => t.id === 15)!.text).toContain('retained cash')
  })
})
