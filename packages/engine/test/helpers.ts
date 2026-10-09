import { loadScenario, type Scenario } from '@founder-mode/content'
import { createGame, emptyPlan, endWeek, type GameState, type WeekPlan } from '../src/index'

export const kantino = (): Scenario => loadScenario('kantino')

/** Kantino with enough cash that a run without revenue survives all 78 weeks. */
export function richKantino(): Scenario {
  const s = kantino()
  return { ...s, start: { ...s.start, cashCents: 100_000_000 } }
}

export function plan(overrides: Partial<WeekPlan> = {}): WeekPlan {
  return { ...emptyPlan(), ...overrides }
}

/** A fixed, varied script: interviews rotate across segments, some rest and transfers. */
export function scriptedPlan(state: GameState): WeekPlan {
  const ids = state.scenario.segments.map((s) => s.id)
  const w = state.week
  const target = ids[w % ids.length] as string
  return plan({
    interviews: w <= 12 ? { [target]: 1 + (w % 4) } : {},
    restHours: (w * 7) % 5,
    transferToCompanyCents: w === 3 ? Math.min(100_000, state.founder.savingsCents) : 0,
  })
}

export function play(
  state: GameState,
  weeks: number,
  planFor: (s: GameState) => WeekPlan = scriptedPlan,
): GameState {
  let s = state
  for (let i = 0; i < weeks && s.status === 'running'; i++) s = endWeek(s, planFor(s)).state
  return s
}

export function newGame(seed = 'test-seed', scenario = kantino()): GameState {
  return createGame(scenario, seed)
}

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const v of Object.values(value)) deepFreeze(v)
  }
  return value
}
