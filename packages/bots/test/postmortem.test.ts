import { loadScenario } from '@founder-mode/content'
import {
  buildPostMortem,
  createGame,
  endWeek,
  getView,
  respond,
  type EndingId,
  type GameState,
} from '@founder-mode/engine'
import { describe, expect, it } from 'vitest'
import { STRATEGIES } from '../src/strategies'

const scenario = loadScenario('kantino')

function play(strategyId: string, seed: string): GameState {
  const strategy = STRATEGIES.find((s) => s.id === strategyId)!
  const player = strategy.create(scenario, seed)
  let state = createGame(scenario, seed)
  while (state.status === 'running') {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    const out = endWeek(state, player.plan(getView(state)))
    player.observe?.(out.report, getView(out.state))
    state = out.state
  }
  return state
}

/** Phase 7 "done when": every ending leads to a post-mortem with a cause and the truth. */
describe('post-mortem over bot runs', () => {
  it('names a cause, reveals every market, and lists a misread whenever the interviews were off', () => {
    const endings = new Set<EndingId>()
    let misreads = 0
    for (const strategyId of ['validate_then_build', 'playtest', 'overworker', 'random']) {
      for (let i = 0; i < 8; i++) {
        const state = play(strategyId, `pm-${i}`)
        const pm = buildPostMortem(state)
        endings.add(pm.ending)
        expect(pm.cause.id).toBeTruthy()
        expect(pm.chain.at(-1)?.kind).toBe('ending')
        expect(pm.markets).toHaveLength(scenario.segments.length)
        expect(pm.suggestions.at(-1)).toBe('sample_sizes')
        for (const m of pm.markets) {
          const off = m.saidBucketId !== null && m.saidBucketId !== m.painBucketId
          const listed = pm.misreads.some(
            (r) =>
              (r.kind === 'interviews_high' || r.kind === 'interviews_low') &&
              r.segmentId === m.segmentId,
          )
          expect(listed).toBe(off)
        }
        misreads += pm.misreads.length
      }
    }
    expect(endings.has('bankrupt')).toBe(true)
    expect(endings.has('sustainable')).toBe(true)
    expect(misreads).toBeGreaterThan(0)
  }, 60_000)
})
