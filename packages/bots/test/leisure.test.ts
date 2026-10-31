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
import { CAREFUL_TOURISM, tourismPlayer } from '../src/strategies/tourism'

describe('contextual leisure invitations', () => {
  it.each(['ausgesperrt', 'fabriketage', 'schweissperle', 'griffig'] as const)(
    'reads %s season and crowding instead of always buying the mailing',
    (id) => {
      const scenario = structuredClone(loadScenario(id, 'long'))
      const cards = scenario.events.filter((e) =>
        e.choices.some((c) => c.id === 'more' && c.label === 'Buy the invitation mailing'),
      )
      expect(cards).toHaveLength(10)
      for (const card of scenario.events)
        for (const choice of card.choices)
          for (const fx of choice.effects)
            if (fx.type === 'guests' && fx.segment)
              expect(scenario.segments.some((segment) => segment.id === fx.segment)).toBe(true)
      for (const event of cards) {
        const benefit = event.choices.find((c) => c.id === 'act')!.effects[0]!
        const context =
          benefit.type === 'bugs'
            ? 'snags'
            : benefit.type === 'energy'
              ? 'energy'
              : benefit.type === 'guests'
                ? 'cash'
                : benefit.when.some((c) => c.path === 'tour.peak')
                  ? 'season'
                  : 'crowding'
        for (const expected of ['more', 'act', 'leave'] as const) {
          const state = createGame(scenario, 'context-visible')
          state.week = 20
          state.company.cashCents = 100000000
          state.product.features = state.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
          state.bookings!.leisure!.openingWeek = 1
          const view = getView(state)
          view.bookings!.peak = expected === 'act' && context === 'season'
          view.bookings!.reviews = expected === 'leave' ? 0 : 10
          const packed = expected === 'leave' || (expected === 'act' && context === 'crowding')
          view.bookings!.leisure!.load = [
            {
              productId: scenario.bookings!.leisure!.opening!.areas[0]!,
              slotId: scenario.bookings!.leisure!.slots[0]!.id,
              visits: packed ? 100 : 0,
              turnedAway: packed ? 10 : 0,
              aggregator: 0,
              load: packed ? 'packed' : 'quiet',
            },
          ]
          view.product.bugs = expected === 'act' && context === 'snags' ? 3 : 0
          view.founder.energy = expected === 'act' && context === 'energy' ? 30 : 100
          if (expected === 'act' && context === 'cash') view.company.cashCents = 1000000
          view.inbox = [
            {
              id: 'context-card',
              eventId: event.id,
              week: 20,
              expiresWeek: 21,
              fromRole: 'none',
              fromName: event.sender,
              look: event.look,
              text: event.text,
              answeredChoiceId: null,
              choices: event.choices.map((c) => ({
                id: c.id,
                label: c.label,
                hours: c.hours,
                costCents: c.effects.reduce(
                  (sum, fx) =>
                    sum + (fx.type === 'cash' && fx.amountCents < 0 ? -fx.amountCents : 0),
                  0,
                ),
                possibleCostCents: 0,
                monthlyCostCents: 0,
              })),
            },
          ]
          const reader = tourismPlayer(scenario, CAREFUL_TOURISM, 'context-visible')
          const effort = tourismPlayer(
            scenario,
            { ...CAREFUL_TOURISM, inbox: 'effort' },
            'context-visible',
          )
          expect(
            reader.respond!(view).find((a) => a.messageId === 'context-card')?.choiceId ??
              event.defaultChoice,
          ).toBe(expected)
          expect(effort.respond!(view)).toContainEqual({
            messageId: 'context-card',
            choiceId: 'more',
          })
          if (expected === 'more') {
            // Invitations create requests directly, even after ordinary repeat reach is full.
            for (const segment of view.bookings!.segments)
              segment.repeatGuests = scenario.bookings!.website.repeatsFull
            const mature = tourismPlayer(scenario, CAREFUL_TOURISM, 'context-visible')
            expect(mature.respond!(view)).toContainEqual({
              messageId: 'context-card',
              choiceId: 'more',
            })
          }
        }
      }
    },
  )
})

describe('leisure review-blind comparison', () => {
  it.each(['ausgesperrt', 'fabriketage'] as const)(
    'does not repair %s snags through inbox answers',
    (id) => {
      const scenario = loadScenario(id, 'long')
      const state = createGame(scenario, 'snag-check')
      state.product.bugs = 3
      state.product.features = state.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
      state.bookings!.leisure!.openingWeek = 1
      const view = getView(state)
      const event = scenario.events.find((e) =>
        e.choices.some((c) => c.effects.some((fx) => fx.type === 'bugs' && fx.delta < 0)),
      )!
      const repair = event.choices.find((c) =>
        c.effects.some((fx) => fx.type === 'bugs' && fx.delta < 0),
      )!
      view.inbox = [
        {
          id: 'snag-card',
          eventId: event.id,
          week: view.week,
          expiresWeek: view.week + 1,
          fromRole: 'none',
          fromName: event.sender,
          look: event.look,
          text: event.text,
          answeredChoiceId: null,
          choices: event.choices.map((c) => ({
            id: c.id,
            label: c.label,
            hours: c.hours,
            costCents: 0,
            possibleCostCents: 0,
            monthlyCostCents: 0,
          })),
        },
      ]
      const careful = tourismPlayer(scenario, CAREFUL_TOURISM, 'snag-check')
      const blind = tourismPlayer(scenario, { ...CAREFUL_TOURISM, reviews: false }, 'snag-check')
      const answer = { messageId: 'snag-card', choiceId: repair.id }
      expect(careful.respond!(view)).toContainEqual(answer)
      expect(blind.respond!(view)).not.toContainEqual(answer)
    },
  )
})

describe('Ausgesperrt players', () => {
  const scenario = loadScenario('ausgesperrt', 'long')
  const strategies = TOURISM_STRATEGIES.filter((s) => playsIn(s, scenario))
  it.each([
    [340, true],
    [400, false],
  ] as const)('judges a %i-win blind policy by its own paired limit margin', (effortWins, pass) => {
    const sample = runGame(
      scenario,
      strategies.find((s) => s.id === 'tourism_careful')!,
      'margin-shape',
    )
    const rows = (id: string, wins: number) => ({
      id,
      description: '',
      seconds: 0,
      results: Array.from({ length: 1000 }, (_, i) => ({
        ...sample,
        seed: `paired-${i}`,
        ending: i < wins ? ('sustainable' as const) : ('bankrupt' as const),
      })),
    })
    const targets = evaluateTourismTargets({
      engineVersion: 'test',
      runs: 1000,
      seedPrefix: 'paired',
      maxWeeks: 104,
      tourism: true,
      strategies: [
        rows('tourism_careful', 1000),
        rows('tourism_inbox_none', 0),
        rows('tourism_inbox_effort', effortWins),
      ],
    })
    const target = targets.find((t) => t.id === 6)!
    // Reading gains exactly 100 points. 34 is within its own 95% margin of
    // the 33 1/3-point blind limit; 40 is outside it. Reading's margin is zero.
    expect(target.pass).toBe(pass)
    expect(target.margin).toContain('blind limit')
  })
  it('includes the public two-area requirement in the corporate opening plan', () => {
    const view = getView(createGame(scenario, 'corporate-opening-scope'))
    const corporate = leisureWanted(
      scenario,
      view,
      CAREFUL_TOURISM,
      ['meeting_room'],
      'companies',
      'corporate-opening-scope',
    )
    const locals = leisureWanted(
      scenario,
      view,
      CAREFUL_TOURISM,
      [],
      'locals',
      'corporate-opening-scope',
    )
    const areas = scenario.bookings!.leisure!.opening!.areas
    expect(corporate.filter((id) => areas.includes(id))).toHaveLength(2)
    expect(corporate).toContain('meeting_room')
    expect(locals.filter((id) => areas.includes(id))).toHaveLength(1)
  })
  it('signs from sustained paid utilisation even with a quiet week, before winning', () => {
    const state = createGame(scenario, 'intermittent-contract')
    state.company.cashCents = 100000000
    state.product.features.find((f) => f.id === 'heist')!.shippedWeek = 1
    state.bookings!.leisure!.openingWeek = 1
    const player = tourismPlayer(
      scenario,
      { ...CAREFUL_TOURISM, contracts: 'permanent' },
      'intermittent-contract',
    )
    let last: ReturnType<typeof player.plan>
    for (let i = 0; i < 6; i++) {
      state.week = 20 + i
      state.bookings!.bookings =
        i === 0
          ? []
          : ['daytime', 'evening', 'weekend'].map((slotId) => ({
              id: slotId,
              productId: 'heist',
              segmentId: 'locals',
              week: state.week,
              units: 30,
              priceCents: 12500,
              channel: 'direct' as const,
              bookedWeek: 19,
              status: 'booked' as const,
              slotId,
            }))
      last = player.plan(getView(state))
      if (i === 0) expect(last.bookings!.hire ?? []).toHaveLength(0)
    }
    expect(last!.bookings!.hire).toContainEqual({ roleId: 'game_master', kind: 'permanent' })
    expect(state.status).toBe('running')
  })
  it('uses existing permanent shifts before adding seasonal contracts', () => {
    const state = createGame(scenario, 'contract-coverage')
    state.week = 20
    state.company.cashCents = 100000000
    state.bookings!.contracts = [
      {
        id: 'existing',
        roleId: 'game_master',
        kind: 'permanent',
        name: 'Test worker',
        startWeek: 1,
        endWeek: null,
      },
    ]
    state.product.features.find((f) => f.id === 'heist')!.shippedWeek = 1
    state.bookings!.leisure!.openingWeek = 1
    state.bookings!.bookings = ['daytime', 'evening', 'weekend'].map((slotId) => ({
      id: slotId,
      productId: 'heist',
      segmentId: 'locals',
      week: 20,
      units: 10,
      priceCents: 12500,
      channel: 'direct' as const,
      bookedWeek: 19,
      status: 'booked' as const,
      slotId,
    }))
    const view = getView(state)
    expect(view.bookings!.contracts[0]!.working).toBe(true)
    const player = strategies
      .find((s) => s.id === 'tourism_careful')!
      .create(scenario, 'contract-coverage')
    for (const week of [20, 21, 22]) {
      view.week = week
      const plan = player.plan(view)
      expect(plan.bookings!.hire ?? []).not.toContainEqual({
        roleId: 'game_master',
        kind: 'seasonal',
      })
    }
  })
  it('keeps the brochure-led portfolio temptation inside its physical-space limit', () => {
    const view = getView(createGame(scenario, 'blind-portfolio'))
    const themes = scenario.bookings!.leisure!.opening!.areas
    expect(leisureBuildOrder(view, themes)).not.toContain('vr_room')
    const blind = leisureBuildOrder(view, themes, true)
    expect(blind).toContain('vr_room')
    expect(blind).toHaveLength(view.bookings!.leisure!.space!.max)
    expect(blind[0]).toBe('vr_room')
    view.week = 100
    expect(leisureBuildOrder(view, themes)).toEqual([])
    delete view.bookings!.leisure!.space
    expect(leisureBuildOrder(view, themes)).toEqual([])
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
  it('declines rebuilds that cannot reopen or earn their cost before the run ends', () => {
    const view = getView(createGame(scenario, 'rebuild-horizon'))
    view.company.cashCents = 7000000
    const l = view.bookings!.leisure!
    const feature = view.product.features.find((f) => f.id === 'heist')!
    feature.shipped = true
    feature.remainingHours = 0
    const f = l.freshness.find((f) => f.productId === 'heist')!
    f.word = 'tired'
    const refresh = () => {
      const b = new PlanBuilder(view, 50)
      const plan: BookingsPlan = {
        shifts: {},
        founderShifts: {},
        prices: {},
        policy: null,
        platform: null,
        partnerships: [],
        outreach: {},
      }
      planLeisure(view, b, plan, CAREFUL_TOURISM)
      return plan.leisure!.refresh ?? []
    }
    view.week = 103
    expect(refresh()).toEqual([])
    view.week = 98
    l.slotCalendar = [
      { productId: 'heist', slotId: 'daytime', week: 104, capacity: 49, booked: 0, held: 0 },
    ]
    expect(refresh()).toEqual([])
    f.refreshCents = 100000
    expect(refresh()).toEqual(['heist'])
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
