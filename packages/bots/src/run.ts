import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadScenario, scenarioCatalogue, type Scenario } from '@founder-mode/content'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { parseArgs } from './args'
import { buildReport, evaluateTargets, TARGET_STRATEGIES, type StrategyRuns } from './report'
import { deskComparison } from './desk'
import { asSection, mergeReportFile } from './reportFile'
import { botScenario } from './scenarios'
import { runTasks, type Task, type TaskDone } from './pool'
import {
  ABLATION_SPECS,
  INBOX_SPECS,
  PRICING_SPECS,
  READER_SPEC,
  strategyOf,
  type StrategySpec,
} from './specs'
import { STRATEGIES } from './strategies'
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

/**
 * The parts of the report, run and timed one after another: `main` the strategies the targets look
 * at (and the silent random bot), `paired` the leave-one-out runs, `inbox` the inbox policies of
 * target 11 (both on `--wide-runs` seeds, with a reading run on the same seeds), `events` every answer
 * of every event.
 */
type Part = 'main' | 'paired' | 'inbox' | 'price' | 'events'
type Planned = { strategy: Strategy; spec: StrategySpec; part: Part; runs: number }

/** Every strategy one scenario's report needs, with the spec a worker builds it from. */
function planFor(scenario: Scenario): Planned[] {
  const plan = (spec: StrategySpec, part: Part, runs = args.runs): Planned => ({
    strategy: strategyOf(spec),
    spec,
    part,
    runs,
  })
  const full = args.only.length === 0
  const out: Planned[] = []
  if (args.parts.includes('main')) {
    out.push(...strategies.map((s) => plan({ kind: 'listed', id: s.id }, 'main')))
    if (full) out.push(plan({ kind: 'randomNoInbox' }, 'main'))
  }
  // Leave-one-out runs of validate_then_build. Only for the report, so they stay out of the
  // strategy list that the targets look at.
  // The reading run that targets 6, 11 and 13 are judged against, on the wide seeds; once.
  const wideParts = (['paired', 'inbox', 'price'] as const).filter((p) => args.parts.includes(p))
  if (full && wideParts[0]) out.push(plan(READER_SPEC, wideParts[0], args.wideRuns))
  if (full && args.parts.includes('paired'))
    out.push(...ABLATION_SPECS.map((spec) => plan(spec, 'paired', args.wideRuns)))
  if (full && args.parts.includes('inbox'))
    out.push(...INBOX_SPECS.map((spec) => plan(spec, 'inbox', args.wideRuns)))
  if (full && args.parts.includes('price'))
    out.push(...PRICING_SPECS.map((spec) => plan(spec, 'price', args.wideRuns)))
  // Every answer of every event, forced, on validate_then_build. Slow, so only on request.
  if (args.parts.includes('events'))
    for (const e of scenario.events)
      for (const c of e.choices)
        out.push(plan({ kind: 'forced', eventId: e.id, choiceId: c.id }, 'events'))
  return out
}

/** The report of one scenario, as `buildReport` writes it, from its finished runs. */
function reportFor(scenario: Scenario, planned: Planned[], done: TaskDone[]): string {
  const runs = (keep: (p: Planned) => boolean) =>
    planned.flatMap((p, i): StrategyRuns[] =>
      keep(p)
        ? [
            {
              id: p.strategy.id,
              description: describeStrategy(p.strategy, scenario),
              results: done[i]!.results,
              seconds: done[i]!.seconds,
            },
          ]
        : [],
    )
  const events = args.parts.includes('events')
    ? planned.flatMap((p, i) => {
        if (p.spec.kind !== 'forced') return []
        const { eventId, choiceId } = p.spec
        const choice = scenario.events
          .find((e) => e.id === eventId)!
          .choices.find((c) => c.id === choiceId)!
        return [
          {
            eventId,
            choiceId,
            hours: choice.hours,
            costCents: choice.effects.reduce(
              (t, fx) => t + (fx.type === 'cash' && fx.amountCents < 0 ? -fx.amountCents : 0),
              0,
            ),
            results: done[i]!.results,
          },
        ]
      })
    : undefined

  const { segment, note } = botScenario(scenario.id).playtest
  const input = {
    engineVersion: ENGINE_VERSION,
    runs: args.runs,
    seedPrefix: args.seedPrefix,
    strategies: runs((p) => p.part === 'main' && p.spec.kind === 'listed'),
    ablations: runs((p) => p.spec.kind === 'without'),
    extras: runs(
      (p) =>
        (p.part === 'main' && p.spec.kind !== 'listed') ||
        p.spec.kind === 'inbox' ||
        p.spec.kind === 'pricing',
    ),
    ...(events ? { events } : {}),
    playtest: { segment, note },
  }
  for (const id of TARGET_STRATEGIES.slice(0, 1)) {
    console.log(`\nTargets for ${scenario.id}, ${id}`)
    for (const t of evaluateTargets(input, id)) {
      const status = t.value === '-' ? '----' : t.pass ? 'ok  ' : 'FAIL'
      console.log(`${status} ${t.id}. ${t.text}: ${t.value}${t.margin ? ` (${t.margin})` : ''}`)
    }
  }
  return buildReport(input)
}

if (args.desk) {
  for (const c of chosen)
    console.log(`\n${deskComparison(loadScenario(c.id), args.runs, args.seedPrefix)}`)
  process.exit(0)
}

// Each part runs on its own, timed; within a part every scenario's runs share one pool.
const loaded = chosen.map((c) => loadScenario(c.id))
const plans = loaded.map(planFor)
const done = plans.map((p) => p.map((): TaskDone => ({ results: [], seconds: 0 })))
const timings: string[] = []
for (const part of ['main', 'paired', 'inbox', 'price', 'events'] as const) {
  const index = plans.flatMap((p, s) => p.flatMap((x, i) => (x.part === part ? [{ s, i }] : [])))
  if (index.length === 0) continue
  const tasks = index.map(({ s, i }): Task => {
    const p = plans[s]![i]!
    return { scenarioId: chosen[s]!.id, spec: p.spec, seedPrefix: args.seedPrefix, runs: p.runs }
  })
  const started = performance.now()
  const finished = await runTasks(tasks, args.jobs, (task, d) => {
    if (task.spec.kind !== 'forced')
      console.log(
        `${task.scenarioId} ${strategyOf(task.spec).id}: ${task.runs} runs in ${d.seconds.toFixed(1)} s`,
      )
  })
  index.forEach(({ s, i }, k) => (done[s]![i] = finished[k]!))
  const wall = (performance.now() - started) / 1000
  const cpu = finished.reduce((t, d) => t + d.seconds, 0)
  timings.push(
    `${part}: ${tasks.length} strategy runs, ${wall.toFixed(0)} s (${cpu.toFixed(0)} s of play over ${args.jobs} processes)`,
  )
  console.log(`Part ${timings[timings.length - 1]}`)
}
const reports = new Map(
  loaded.map((scenario, i) => [scenario.id, reportFor(scenario, plans[i]!, done[i]!)] as const),
)
console.log(`\nTimings\n${timings.join('\n')}`)
const skipped = (['main', 'paired', 'inbox', 'price', 'events'] as const).filter(
  (p) => !args.parts.includes(p),
)
if (skipped.length) console.log(`Skipped parts: ${skipped.join(', ')}`)

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
