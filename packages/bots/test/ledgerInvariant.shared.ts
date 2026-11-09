import { loadScenario, SCENARIO_IDS, SCENARIO_MODES } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  respond,
  weekTotals,
  type GameState,
} from '@founder-mode/engine'
import { expect, it } from 'vitest'
import { playsIn } from '../src/strategy'
import { STRATEGIES } from '../src/strategies'

// Plan 8, step 1: the week report's totals come from the ledger that moves cash, so for every
// week of every bot run: cash at the end = cash at the start + received - paid, and the same for
// savings. Samples a few seeds per bot; at least 50 runs per scenario where its bots allow.
const RUNS_PER_SCENARIO = 50
const failures = new Map<string, string[]>()

function check(id: string, mode: string, strategyId: string, seed: string, scenario: never) {
  const strategy = STRATEGIES.find((s) => s.id === strategyId)!
  const player = strategy.create(scenario, seed)
  let state: GameState = createGame(scenario, seed)
  const bad: string[] = []
  while (state.status === 'running') {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    const cash0 = state.company.cashCents
    const savings0 = state.founder.savingsCents
    const out = endWeek(state, player.plan(getView(state)))
    state = out.state
    const l = out.report.ledger
    const t = weekTotals(l)
    const dCash = l.cashEndCents - cash0
    const dSavings = l.savingsEndCents - savings0
    if (dCash !== t.received.totalCents - t.paid.totalCents) {
      bad.push(
        `${seed} w${l.week} cash off by ${dCash - (t.received.totalCents - t.paid.totalCents)}`,
      )
    }
    const savingsOut =
      l.transferCents + l.autoTransferCents + (l.livingCostsCents - l.founderDrawCents)
    if (dSavings !== -savingsOut) {
      bad.push(`${seed} w${l.week} savings off by ${dSavings + savingsOut}`)
    }
    if (bad.length > 0) break
  }
  if (bad.length > 0)
    failures.set(`${id}/${mode}/${strategyId}`, [
      ...(failures.get(`${id}/${mode}/${strategyId}`) ?? []),
      ...bad,
    ])
}

/** Registers the ledger checks of one scenario (every mode). One test file per scenario keeps
 * each worker's task under vitest's 60 s RPC timer, even on a slow CI runner. */
export function ledgerTests(id: (typeof SCENARIO_IDS)[number]) {
  for (const mode of SCENARIO_MODES[id]) {
    it(`${id} (${mode})`, async () => {
      const scenario = loadScenario(id, mode)
      const bots = STRATEGIES.filter((s) => playsIn(s, scenario))
      const perBot = Math.max(1, Math.ceil(RUNS_PER_SCENARIO / bots.length))
      for (const bot of bots) {
        for (let i = 0; i < perBot; i++) {
          // Yield between runs so the worker can answer vitest's RPC calls.
          await new Promise((resolve) => setTimeout(resolve, 0))
          check(id, mode, bot.id, `ledger-${i}`, scenario as never)
        }
      }
      const mine = [...failures.entries()].filter(([k]) => k.startsWith(`${id}/${mode}/`))
      expect(mine.map(([k, v]) => `${k}: ${v[0]}`)).toEqual([])
    }, 600_000)
  }
}
