import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { forcedAnswer, validateThenBuild } from '../src/strategies/validateThenBuild'

/**
 * The event table reuses the careful bot's result on seeds where the forced event never arrived
 * (`forcedSeeds` in run.ts). That is only right if such a game is the very same game.
 */
describe('reusing the careful bot for forced answers', () => {
  it.each(['standard', 'long'] as const)(
    'gives the same result where the event never arrives (%s)',
    (mode) => {
      const scenario = loadScenario('kantino', mode)
      let checked = 0
      for (let i = 0; i < 6; i++) {
        const seed = `reuse-${i}`
        const plain = runGame(scenario, validateThenBuild, seed)
        const missing = scenario.events.find((e) => !plain.eventsSeen.includes(e.id))
        if (!missing) continue
        for (const c of missing.choices) {
          const forced = runGame(scenario, forcedAnswer(missing.id, c.id), seed)
          expect({ ...forced, strategy: plain.strategy }).toEqual(plain)
          checked++
        }
      }
      expect(checked).toBeGreaterThan(0)
    },
  )
})
