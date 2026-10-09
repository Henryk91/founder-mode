import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadScenario } from '@founder-mode/content'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { parseArgs } from './args'
import { buildReport, evaluateTargets, NOTES_HEADING, type StrategyRuns } from './report'
import { runGame } from './simulate'
import { STRATEGIES } from './strategies'

/** The hand written tuning notes at the end of an existing report survive a new run. */
function keptNotes(path: string): string {
  if (!existsSync(path)) return ''
  const old = readFileSync(path, 'utf8')
  const at = old.indexOf(`\n${NOTES_HEADING}`)
  return at === -1 ? '' : old.slice(at)
}

const args = parseArgs(process.argv.slice(2))
const scenario = loadScenario('kantino')
const strategies = args.only.length
  ? STRATEGIES.filter((s) => args.only.includes(s.id))
  : STRATEGIES

const runs: StrategyRuns[] = strategies.map((strategy) => {
  const start = performance.now()
  const results = Array.from({ length: args.runs }, (_, i) =>
    runGame(scenario, strategy, `${args.seedPrefix}-${i}`),
  )
  const seconds = (performance.now() - start) / 1000
  console.log(`${strategy.id}: ${args.runs} runs in ${seconds.toFixed(1)} s`)
  return { id: strategy.id, description: strategy.description, results, seconds }
})

const input = {
  engineVersion: ENGINE_VERSION,
  runs: args.runs,
  seedPrefix: args.seedPrefix,
  strategies: runs,
}
const report = buildReport(input)
if (args.out === '-') {
  console.log(report)
} else {
  // pnpm runs the script inside packages/bots; the path is relative to the repo root.
  const path = resolve(import.meta.dirname, '../../..', args.out)
  writeFileSync(path, report + keptNotes(path))
  console.log(`Report written to ${args.out}`)
}
for (const t of evaluateTargets(input)) {
  const status = t.pass ? 'ok  ' : t.tuned ? 'FAIL' : 'open'
  console.log(`${status} ${t.id}. ${t.text}: ${t.value}${t.tuned ? '' : ' (not tuned yet)'}`)
}
