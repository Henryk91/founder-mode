import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadScenario, scenarioCatalogue, type Scenario } from '@founder-mode/content'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { parseArgs } from './args'
import { buildReport, evaluateTargets, TARGET_STRATEGIES, type StrategyRuns } from './report'
import { asSection, mergeReportFile } from './reportFile'
import { botScenario } from './scenarios'
import { runGame } from './simulate'
import { STRATEGIES } from './strategies'
import { randomNoInbox } from './strategies/random'
import {
  BEHAVIOUR_NAMES,
  forcedAnswer,
  withInbox,
  withoutBehaviours,
} from './strategies/validateThenBuild'
import { describeStrategy, type Strategy } from './strategy'

const args = parseArgs(process.argv.slice(2))
const catalogue = scenarioCatalogue()
const chosen = args.scenario === null ? catalogue : catalogue.filter((c) => c.id === args.scenario)
if (chosen.length === 0) {
  throw new Error(
    `Unknown scenario ${args.scenario}. Known: ${catalogue.map((c) => c.id).join(', ')}`,
  )
}
const strategies = args.only.length
  ? STRATEGIES.filter((s) => args.only.includes(s.id))
  : STRATEGIES

/** Every run of one scenario, and its report as `buildReport` writes it. */
function reportFor(scenario: Scenario): string {
  const play = (strategy: Strategy): StrategyRuns => {
    const start = performance.now()
    const results = Array.from({ length: args.runs }, (_, i) =>
      runGame(scenario, strategy, `${args.seedPrefix}-${i}`),
    )
    const seconds = (performance.now() - start) / 1000
    console.log(`${scenario.id} ${strategy.id}: ${args.runs} runs in ${seconds.toFixed(1)} s`)
    return { id: strategy.id, description: describeStrategy(strategy, scenario), results, seconds }
  }

  const runs = strategies.map(play)

  // Leave-one-out runs of the validate_then_build variants, and the silent random bot. Only for
  // the report, so they stay out of the strategy list that the targets look at.
  const full = args.only.length === 0
  const bases = [{ id: 'validate_then_build', hire: 'none' }] as const
  const ablations = full
    ? bases
        .flatMap((base) => [
          ...BEHAVIOUR_NAMES.map((name) => withoutBehaviours(base, [name])),
          withoutBehaviours(base, BEHAVIOUR_NAMES),
        ])
        .map(play)
    : []
  const extras = full
    ? [randomNoInbox, withInbox('none'), withInbox('effort'), withInbox('cheapest')].map(play)
    : []

  // Every answer of every event, forced, on validate_then_build. Slow, so only on request.
  const events = args.events
    ? scenario.events.flatMap((e) =>
        e.choices.map((c) => ({
          eventId: e.id,
          choiceId: c.id,
          hours: c.hours,
          costCents: c.effects.reduce(
            (t, fx) => t + (fx.type === 'cash' && fx.amountCents < 0 ? -fx.amountCents : 0),
            0,
          ),
          results: play(forcedAnswer(e.id, c.id)).results,
        })),
      )
    : undefined

  const { segment, note } = botScenario(scenario.id).playtest
  const input = {
    engineVersion: ENGINE_VERSION,
    runs: args.runs,
    seedPrefix: args.seedPrefix,
    strategies: runs,
    ablations,
    extras,
    ...(events ? { events } : {}),
    playtest: { segment, note },
  }
  for (const id of TARGET_STRATEGIES.slice(0, 1)) {
    console.log(`\nTargets for ${scenario.id}, ${id}`)
    for (const t of evaluateTargets(input, id)) {
      const status = t.value === '-' ? '----' : t.pass ? 'ok  ' : 'FAIL'
      console.log(`${status} ${t.id}. ${t.text}: ${t.value}`)
    }
  }
  return buildReport(input)
}

const reports = new Map(chosen.map((c) => [c.id, reportFor(loadScenario(c.id))] as const))

if (args.out === '-') {
  for (const report of reports.values()) console.log(report)
} else {
  // pnpm runs the script inside packages/bots; the path is relative to the repo root.
  const path = resolve(import.meta.dirname, '../../..', args.out)
  const old = existsSync(path) ? readFileSync(path, 'utf8') : null
  const sections = new Map(chosen.map((c) => [c.id, asSection(reports.get(c.id)!, c)] as const))
  writeFileSync(path, mergeReportFile(old, catalogue, sections))
  console.log(`Report written to ${args.out}`)
}
