import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  loadScenario,
  scenarioCatalogue,
  type GameMode,
  type Scenario,
  type ScenarioAbout,
} from '@founder-mode/content'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { parseArgs } from './args'
import { buildReport, evaluateTargets, TARGET_STRATEGIES, type StrategyRuns } from './report'
import { deskComparison } from './desk'
import { asSection, mergeReportFile, type ScenarioSection } from './reportFile'
import { botScenario } from './scenarios'
import { runTasks, taskSeeds, type Task, type TaskDone } from './pool'
import type { RunResult } from './simulate'
import {
  ABLATION_SPECS,
  FREELANCE_TARGET_SPEC,
  TIRED_SPECS,
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
/** A scenario in one mode: one section of the report. */
type Unit = { about: ScenarioAbout; mode: GameMode; scenario: Scenario; section: ScenarioSection }
const modesFor = (about: ScenarioAbout): GameMode[] =>
  about.modes.filter((m) => args.mode === 'all' || args.mode === m)
const sectionOf = (about: ScenarioAbout, mode: GameMode): ScenarioSection =>
  mode === 'standard'
    ? { id: about.id, name: about.name, flags: `--scenario ${about.id}` }
    : {
        id: `${about.id}/${mode}`,
        name: `${about.name}, long mode`,
        flags: `--scenario ${about.id} --mode ${mode}`,
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
type Part = 'main' | 'paired' | 'inbox' | 'price' | 'freelance' | 'tired' | 'events'
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
  } else if (args.parts.includes('events')) {
    // The event table reuses the careful bot's runs on seeds where an event never arrives.
    out.push(plan({ kind: 'listed', id: 'validate_then_build' }, 'main'))
  }
  // Leave-one-out runs of validate_then_build. Only for the report, so they stay out of the
  // strategy list that the targets look at.
  // The reading run that targets 6, 11 and 13 are judged against, on the wide seeds; once.
  const wideParts = (['paired', 'inbox', 'price', 'freelance'] as const).filter((p) =>
    args.parts.includes(p),
  )
  if (full && wideParts[0]) out.push(plan(READER_SPEC, wideParts[0], args.wideRuns))
  if (full && args.parts.includes('paired'))
    out.push(...ABLATION_SPECS.map((spec) => plan(spec, 'paired', args.wideRuns)))
  if (full && args.parts.includes('inbox'))
    out.push(...INBOX_SPECS.map((spec) => plan(spec, 'inbox', args.wideRuns)))
  if (full && args.parts.includes('price'))
    out.push(...PRICING_SPECS.map((spec) => plan(spec, 'price', args.wideRuns)))
  // Target 19's freelancer, and any extra freelancer runs asked for, on the wide seeds.
  if (full && args.parts.includes('freelance')) {
    out.push(plan(FREELANCE_TARGET_SPEC, 'freelance', args.wideRuns))
    out.push(plan({ kind: 'earlyHireWide' }, 'freelance', args.wideRuns))
    for (const f of args.freelance) {
      const spec: StrategySpec = {
        kind: 'freelance',
        role: f.role,
        hours: f.hours,
        centsPerHour: f.eurPerHour === null ? null : Math.round(f.eurPerHour * 100),
        weeks: f.weeks,
      }
      out.push(plan(spec, 'freelance', args.wideRuns))
    }
  }
  // The energy check of target 19, on the wide seeds, only when asked for.
  if (full && args.parts.includes('tired'))
    out.push(...TIRED_SPECS.map((spec) => plan(spec, 'tired', args.wideRuns)))
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
    ...(scenario.mode ? { maxWeeks: scenario.maxWeeks } : {}),
    engineVersion: ENGINE_VERSION,
    runs: args.runs,
    seedPrefix: args.seedPrefix,
    strategies: runs((p) => p.part === 'main' && p.spec.kind === 'listed'),
    ablations: runs((p) => p.spec.kind === 'without'),
    extras: runs(
      (p) =>
        (p.part === 'main' && p.spec.kind !== 'listed') ||
        p.spec.kind === 'inbox' ||
        p.spec.kind === 'pricing' ||
        p.spec.kind === 'freelance' ||
        p.spec.kind === 'earlyHireWide' ||
        p.spec.kind === 'tired',
    ),
    ...(events ? { events } : {}),
    playtest: { segment, note },
    marketBuildHours: Object.fromEntries(
      scenario.segments.map((seg) => [
        seg.id,
        seg.mustHave.reduce(
          (t, f) => t + (scenario.features.find((x) => x.id === f)?.buildHours ?? 0),
          0,
        ),
      ]),
    ),
  }
  for (const id of TARGET_STRATEGIES.slice(0, 1)) {
    console.log(`\nTargets for ${scenario.id}${scenario.mode ? ` (${scenario.mode})` : ''}, ${id}`)
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

/**
 * A forced answer game is the careful bot's own game until the event arrives, so on a seed where
 * the careful bot never saw the event the result is the same. Those seeds are not played again:
 * the careful bot's result is reused under the forced strategy's id.
 */
function forcedSeeds(task: Task, reader: RunResult[] | undefined): number[] | undefined {
  if (task.spec.kind !== 'forced' || !reader) return undefined
  const eventId = task.spec.eventId
  return taskSeeds(task).filter((i) => reader[i]?.eventsSeen.includes(eventId) ?? true)
}

function withReused(task: Task, played: TaskDone, reader: RunResult[], id: string): TaskDone {
  if (!task.seeds) return played
  const byIndex = new Map(task.seeds.map((seed, k) => [seed, played.results[k]!] as const))
  const results = Array.from(
    { length: task.runs },
    (_, i) => byIndex.get(i) ?? { ...reader[i]!, strategy: id },
  )
  return { results, seconds: played.seconds }
}

// Each part runs on its own, timed; within a part every unit's runs share one pool.
const units: Unit[] = chosen.flatMap((about) =>
  modesFor(about).map((mode) => ({
    about,
    mode,
    scenario: loadScenario(about.id, mode),
    section: sectionOf(about, mode),
  })),
)
if (units.length === 0) throw new Error(`No scenario has mode ${args.mode}`)
const plans = units.map((u) => planFor(u.scenario))
const done = plans.map((p) => p.map((): TaskDone => ({ results: [], seconds: 0 })))
const timings: string[] = []
const readerOf = (s: number): RunResult[] | undefined => {
  const i = plans[s]!.findIndex((p) => p.part === 'main' && p.strategy.id === 'validate_then_build')
  return i >= 0 ? done[s]![i]!.results : undefined
}
for (const part of ['main', 'paired', 'inbox', 'price', 'freelance', 'tired', 'events'] as const) {
  const index = plans.flatMap((p, s) => p.flatMap((x, i) => (x.part === part ? [{ s, i }] : [])))
  if (index.length === 0) continue
  const tasks = index.map(({ s, i }): Task => {
    const p = plans[s]!
    const task: Task = {
      scenarioId: units[s]!.about.id,
      mode: units[s]!.mode,
      spec: p[i]!.spec,
      seedPrefix: args.seedPrefix,
      runs: p[i]!.runs,
    }
    const seeds = forcedSeeds(task, readerOf(s))
    return seeds ? { ...task, seeds } : task
  })
  const started = performance.now()
  const finished = await runTasks(tasks, args.jobs, (task, d) => {
    if (task.spec.kind !== 'forced')
      console.log(
        `${task.scenarioId}${task.mode === 'standard' ? '' : ` (${task.mode})`} ${strategyOf(task.spec).id}: ${task.runs} runs in ${d.seconds.toFixed(1)} s`,
      )
  })
  index.forEach(({ s, i }, k) => {
    const reader = readerOf(s)
    done[s]![i] = reader
      ? withReused(tasks[k]!, finished[k]!, reader, plans[s]![i]!.strategy.id)
      : finished[k]!
  })
  const wall = (performance.now() - started) / 1000
  const cpu = finished.reduce((t, d) => t + d.seconds, 0)
  const played = tasks.reduce((t, x) => t + taskSeeds(x).length, 0)
  const all = tasks.reduce((t, x) => t + x.runs, 0)
  timings.push(
    `${part}: ${tasks.length} strategy runs, ${wall.toFixed(0)} s (${cpu.toFixed(0)} s of play over ${args.jobs} processes)${played < all ? `, ${played} of ${all} games played, the rest reused` : ''}`,
  )
  console.log(`Part ${timings[timings.length - 1]}`)
}
const reports = new Map(
  units.map((u, i) => [u.section.id, reportFor(u.scenario, plans[i]!, done[i]!)] as const),
)
console.log(`\nTimings\n${timings.join('\n')}`)
const skipped = (
  ['main', 'paired', 'inbox', 'price', 'freelance', 'tired', 'events'] as const
).filter((p) => !args.parts.includes(p))
if (skipped.length) console.log(`Skipped parts: ${skipped.join(', ')}`)

if (args.out === '-') {
  for (const report of reports.values()) console.log(report)
} else {
  // pnpm runs the script inside packages/bots; the path is relative to the repo root.
  const path = resolve(import.meta.dirname, '../../..', args.out)
  const old = existsSync(path) ? readFileSync(path, 'utf8') : null
  const sections = new Map(
    units.map((u) => [u.section.id, asSection(reports.get(u.section.id)!, u.section)] as const),
  )
  const order = catalogue.flatMap((about) => about.modes.map((mode) => sectionOf(about, mode)))
  writeFileSync(path, mergeReportFile(old, order, sections))
  console.log(`Report written to ${args.out}`)
}
