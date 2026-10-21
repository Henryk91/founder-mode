import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { createGame, getView, endWeek, replay, respond, toSave } from '@founder-mode/engine'
import { runGame } from '../src/simulate'
import { PlanBuilder, playsIn } from '../src/strategy'
import { TOURISM_STRATEGIES, CAREFUL_TOURISM } from '../src/strategies/tourism'
import { planLeisure } from '../src/strategies/leisure'
import { venueWanted } from '../src/strategies/venue'
import { evaluateTourismTargets } from '../src/tourismReport'

const spec = loadScenario('fabriketage', 'long')
const strategies = TOURISM_STRATEGIES.filter((s) => playsIn(s, spec))

describe('venue players', () => {
  it('prepares the common fit-out loan while interviewing and replays a real opening', () => {
    const strategy = strategies.find((s) => s.id === 'tourism_careful')!
    const player = strategy.create(spec, 'test-1')
    let state = createGame(spec, 'test-1')
    const first = player.plan(getView(state))
    expect(first.loan?.planHours).toBeGreaterThan(0)
    expect(Object.keys(first.interviews)).toHaveLength(3)
    // A new player is used because strategy instances remember the weeks they have seen.
    const actual = strategy.create(spec, 'test-1')
    while (state.status === 'running') {
      for (const a of actual.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const r = endWeek(state, actual.plan(getView(state)))
      state = r.state
      actual.observe?.(r.report, getView(state))
    }
    expect(state.bookings!.leisure!.openingWeek).not.toBeNull()
    expect(replay(spec, toSave(state))).toEqual(state)
  })

  it.each(strategies.map((s) => [s.id, s] as const))(
    '%s finishes with valid plans',
    (_id, strategy) => {
      const r = runGame(spec, strategy, 'venue-smoke')
      expect(r.weeks).toBeGreaterThan(0)
      expect(r.weeks).toBeLessThanOrEqual(104)
      expect(r.tourism?.leisure?.venue).toBeDefined()
    },
  )
  it('reserves insulation for a known complaint and a quiet closure window', () => {
    const state = createGame(spec, 'venue-visible')
    state.bookings!.leisure!.openingWeek = 1
    state.product.features.find((f) => f.id === 'fit_out')!.shippedWeek = 0
    const v = getView(state)
    v.bookings!.leisure!.noise!.complaints = 1
    expect(venueWanted(spec, v, CAREFUL_TOURISM, [])).toContain('sound_insulation')
    v.bookings!.leisure!.slotCalendar[0]!.booked = 1
    expect(venueWanted(spec, v, CAREFUL_TOURISM, [])).not.toContain('sound_insulation')
    v.bookings!.leisure!.slotCalendar[0]!.booked = 0
    expect(
      venueWanted(spec, v, { ...CAREFUL_TOURISM, leisure: { venueInsulation: false } }, [
        'sound_insulation',
      ]),
    ).not.toContain('sound_insulation')
  })
  it('sets hold terms from observed decided holds, with isolated fixed variants', () => {
    const v = getView(createGame(spec, 'venue-holds'))
    const policy = (granted: number, converted: number, fixed?: 'free' | 'none') => {
      v.bookings!.leisure!.holds!.granted = granted
      v.bookings!.leisure!.holds!.converted = converted
      const b = new PlanBuilder(v, 50)
      const p = {
        shifts: {},
        founderShifts: {},
        prices: {},
        policy: null,
        platform: null,
        partnerships: [],
        outreach: {},
      }
      planLeisure(v, b, p, { ...CAREFUL_TOURISM, leisure: fixed ? { holdPolicy: fixed } : {} })
      return p as typeof p & { leisure: { holdPolicy: string } }
    }
    expect(policy(0, 0).leisure.holdPolicy).toBe('fee')
    expect(policy(10, 9).leisure.holdPolicy).toBe('free')
    expect(policy(10, 1).leisure.holdPolicy).toBe('none')
    expect(policy(10, 5).leisure.holdPolicy).toBe('fee')
    expect(policy(10, 1, 'free').leisure.holdPolicy).toBe('free')
    expect(policy(10, 9, 'none').leisure.holdPolicy).toBe('none')
  })
  it('includes all venue targets in a main-part report', () => {
    const result = runGame(
      spec,
      strategies.find((s) => s.id === 'tourism_careful')!,
      'venue-target',
    )
    const rows = evaluateTourismTargets({
      engineVersion: 'test',
      runs: 1,
      seedPrefix: 'venue-target',
      tourism: true,
      strategies: strategies.map((s) => ({
        id: s.id,
        description: s.description,
        results: [result],
        seconds: 0,
      })),
    })
    for (const id of ['V1', 'V2', 'V3', 'V4']) expect(rows.some((r) => r.id === id)).toBe(true)
  })
})
