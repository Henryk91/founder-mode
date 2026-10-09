import { loadScenario, type Scenario } from '@founder-mode/content'
import { createGame, emptyPlan, endWeek, type GameState, type WeekPlan } from '../src/index'

// Parsed once: YAML parsing is slow enough to dominate tests that create many games.
// Frozen, so a test or the engine that mutates the scenario fails loudly.
let parsed: Scenario | null = null
export const kantino = (): Scenario => (parsed ??= deepFreeze(loadScenario('kantino')))

/** Kantino with enough cash that a run without revenue survives all 78 weeks. */
export function richKantino(): Scenario {
  const s = kantino()
  return { ...s, start: { ...s.start, cashCents: 100_000_000 } }
}

/** Kantino where no inbox message ever arrives, for tests about other systems. */
export function quietKantino(): Scenario {
  const s = kantino()
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
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

/**
 * A scripted player that knows the truth (tests only): builds the must haves of the segment with
 * the most pain, does outreach there, holds every demo it can, and fixes bugs when it has time.
 */
export function informedPlan(state: GameState): WeekPlan {
  const [segId, hidden] = Object.entries(state.hidden.segments).sort(
    (a, b) => b[1].pain - a[1].pain,
  )[0]!
  const demoHours = state.scenario.sales.demoHours
  // A chase for each overdue invoice (at most three).
  const chase = state.invoices
    .filter((i) => i.paidWeek === null && i.writtenOffWeek === null && state.week > i.dueWeek)
    .slice(0, 3)
    .map((i) => i.id)
  let free = 50 - chase.length
  const build: Record<string, number> = {}
  for (const id of hidden.mustHave) {
    const f = state.product.features.find((x) => x.id === id)!
    if (f.shippedWeek !== null) continue
    const def = state.scenario.features.find((x) => x.id === id)!
    const hours = Math.min(free, def.buildHours - f.progressHours, 40)
    if (hours > 0) build[id] = hours
    free -= hours
  }
  const demos = state.leads
    .filter((l) => l.stage === 'demo' && l.silentSinceWeek === null)
    .slice(0, Math.floor(free / demoHours))
    .map((l) => l.id)
  free -= demos.length * demoHours
  const bugFixHours = Math.min(
    free > 10 ? 4 : 0,
    state.product.bugs * state.scenario.product.fixHoursPerBug - state.product.fixProgressHours,
  )
  free -= bugFixHours
  const shipped = hidden.mustHave.every(
    (id) => state.product.features.find((x) => x.id === id)!.shippedWeek !== null,
  )
  return plan({
    build,
    demos,
    bugFixHours,
    chase,
    outreach:
      shipped || state.week > 3 ? { [segId]: { channel: 'phone', hours: Math.max(0, free) } } : {},
  })
}
