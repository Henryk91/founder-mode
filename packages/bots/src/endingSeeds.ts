import type { Scenario } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  respond,
  shutDown,
  type EndingId,
} from '@founder-mode/engine'
import { runGame } from './simulate'
import { STRATEGIES } from './strategies'

/** One known way to an ending: a seed and the bot that plays it there. */
export type EndingSeed = {
  scenario: string
  /** Long mode (104 weeks); missing for the 60 week game. */
  mode?: 'long'
  ending: EndingId
  /** A bot strategy id, or `shut_down@<week>`: the careful bot plays to that week, then quits. */
  strategy: string
  seed: string
  /** The week the run ended. */
  week: number
}

/**
 * Every ending, and the bots that tend to reach it, most likely first. `long`: only in long mode,
 * where a funded company can end Growing.
 */
export const ENDING_ROUTES: { ending: EndingId; strategies: string[]; long?: true }[] = [
  { ending: 'sustainable', strategies: ['validate_then_build', 'price_aware'] },
  { ending: 'still_searching', strategies: ['validate_then_build', 'sell_first'] },
  { ending: 'bankrupt', strategies: ['build_only', 'random'] },
  { ending: 'burnout', strategies: ['overworker', 'random'] },
  // No bot quits on its own: shutting down is the player's choice.
  { ending: 'shut_down', strategies: ['shut_down@10'] },
  { ending: 'growing', strategies: ['raise_late', 'raise_on_traction'], long: true },
]

/** The endings a scenario can reach in its mode. */
export const routesFor = (scenario: Scenario) =>
  ENDING_ROUTES.filter((r) => !r.long || scenario.mode === 'long')

/** Seeds tried per ending, as `ending-<n>`. */
const MAX_TRIES = 400

/** Plays a run with a strategy, or with a shut down at a week, and says how it ended. */
export function playSeed(
  scenario: Scenario,
  strategyId: string,
  seed: string,
): { ending: EndingId; week: number } {
  const quit = /^shut_down@(\d+)$/.exec(strategyId)
  if (!quit) {
    const strategy = STRATEGIES.find((s) => s.id === strategyId)
    if (!strategy) throw new Error(`No strategy ${strategyId}`)
    const r = runGame(scenario, strategy, seed)
    return { ending: r.ending, week: r.weeks }
  }
  const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
  const player = strategy.create(scenario, seed)
  let state = createGame(scenario, seed)
  while (state.status === 'running' && state.week < Number(quit[1])) {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    const r = endWeek(state, player.plan(getView(state)))
    state = r.state
    player.observe?.(r.report, getView(state))
  }
  if (state.status === 'running') state = shutDown(state)
  return { ending: state.ending!, week: state.week }
}

/** Finds `count` seeds per ending for one scenario, trying each ending's bots in order. */
export function findEndingSeeds(scenario: Scenario, count = 3): EndingSeed[] {
  const found: EndingSeed[] = []
  for (const { ending, strategies } of routesFor(scenario)) {
    let got = 0
    for (const strategy of strategies) {
      for (let n = 1; n <= MAX_TRIES && got < count; n++) {
        const seed = `ending-${n}`
        const r = playSeed(scenario, strategy, seed)
        if (r.ending !== ending) continue
        found.push({
          scenario: scenario.id,
          ...(scenario.mode === 'long' ? { mode: 'long' as const } : {}),
          ending,
          strategy,
          seed,
          week: r.week,
        })
        got++
      }
      if (got >= count) break
    }
    if (got === 0) throw new Error(`No seed found for ${scenario.id} ${ending}`)
  }
  return found
}

const HEADER = '| Scenario | Ending | Strategy | Seed | Ends in week |'

/** The table in docs/seeds.md. */
export function seedsTable(rows: EndingSeed[]): string {
  return [
    HEADER,
    '|---|---|---|---|---|',
    ...rows.map(
      (r) =>
        `| ${r.scenario}${r.mode ? ' (long)' : ''} | ${r.ending} | \`${r.strategy}\` | \`${r.seed}\` | ${r.week} |`,
    ),
  ].join('\n')
}

/** Reads the table back out of docs/seeds.md. */
export function parseSeedsTable(markdown: string): EndingSeed[] {
  const lines = markdown.split('\n')
  const start = lines.indexOf(HEADER)
  if (start < 0) throw new Error('No seeds table found')
  const rows: EndingSeed[] = []
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break
    const [scenario, ending, strategy, seed, week] = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim().replace(/`/g, ''))
    const long = scenario!.endsWith(' (long)')
    rows.push({
      scenario: long ? scenario!.replace(' (long)', '') : scenario!,
      ...(long ? { mode: 'long' as const } : {}),
      ending: ending as EndingId,
      strategy: strategy!,
      seed: seed!,
      week: Number(week),
    })
  }
  return rows
}
