import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { TOURISM_STRATEGIES, tourismForced } from '../src/strategies/tourism'
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

describe('the tourism event table (tourism fixes, item 18)', () => {
  const scenario = loadScenario('gratwanderung', 'long')
  const careful = TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!

  it('reuses the careful tourism bot where the forced event never arrives', () => {
    let checked = 0
    for (let i = 0; i < 3; i++) {
      const seed = `tour-reuse-${i}`
      const plain = runGame(scenario, careful, seed)
      const missing = scenario.events.find((e) => !plain.eventsSeen.includes(e.id))
      if (!missing) continue
      const forced = runGame(scenario, tourismForced(missing.id, missing.choices[0]!.id), seed)
      expect({ ...forced, strategy: plain.strategy }).toEqual(plain)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('gives the forced answer every time the event arrives', async () => {
    const { createGame, endWeek, getView, respond } = await import('@founder-mode/engine')
    const plain = runGame(scenario, careful, 'tour-forced')
    const eventId = plain.eventsSeen[0]!
    const event = scenario.events.find((e) => e.id === eventId)!
    const choiceId = event.choices.find((c) => c.id !== event.defaultChoice)!.id
    const strategy = tourismForced(eventId, choiceId)
    let state = createGame(scenario, 'tour-forced')
    const player = strategy.create(scenario, 'tour-forced')
    const given: string[] = []
    while (state.status === 'running' && state.week < 60) {
      for (const a of player.respond?.(getView(state)) ?? []) {
        const m = state.inbox.find((x) => x.id === a.messageId)
        if (m?.eventId === eventId) given.push(a.choiceId)
        state = respond(state, a.messageId, a.choiceId)
      }
      const r = endWeek(state, player.plan(getView(state)))
      state = r.state
      player.observe?.(r.report, getView(state))
    }
    expect(given.length).toBeGreaterThan(0)
    expect(new Set(given)).toEqual(new Set([choiceId]))
  })
})
