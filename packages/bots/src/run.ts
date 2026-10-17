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
import { evaluateFundingTargets, evaluateLongTargets } from './longReport'
import { evaluateTourismTargets } from './tourismReport'
import { asSection, mergeReportFile, type ScenarioSection } from './reportFile'
import { botScenario } from './scenarios'
import { runTasks, taskSeeds, type Task, type TaskDone } from './pool'
import type { RunResult } from './simulate'
import {
  ABLATION_SPECS,
  ENERGY_SPECS,
  FREELANCE_TARGET_SPEC,
  TEAM_SPECS,
  TIRED_SPECS,
  FUNDING_SPECS,
  INBOX_SPECS,
  YEAR2_INBOX_SPECS,
  PRICING_SPECS,
  READER_SPEC,
  strategyOf,
  type StrategySpec,
} from './specs'
import { STRATEGIES } from './strategies'
import { describeStrategy, playsIn, type Strategy } from './strategy'

/** The careful bot whose runs the event table compares with: the tourism one in a tourism game. */
const carefulId = (scenario: Scenario) =>
  scenario.bookings ? 'tourism_careful' : 'validate_then_build'

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
type Part =
  | 'main'
  | 'paired'
  | 'inbox'
  | 'price'
  | 'freelance'
  | 'tired'
  | 'team'
  | 'funding'
  | 'energy'
  | 'events'
  | 'skips'
const PARTS: Part[] = [
  'main',
  'paired',
  'inbox',
  'price',
  'freelance',
  'tired',
  'team',
  'funding',
  'energy',
  'events',
  'skips',
]
/** The blind effort policy whose events the skips part leaves out one at a time. */
const SKIP_BASE = 'tourism_inbox_effort'
type Planned = { strategy: Strategy; spec: StrategySpec; part: Part; runs: number }

/** Every strategy one scenario's report needs, with the spec a worker builds it from. */
function planFor(scenario: Scenario): Planned[] {
  const mode = scenario.mode ?? 'standard'
  const plan = (spec: StrategySpec, part: Part, runs = args.runs): Planned => ({
    strategy: strategyOf(spec),
    spec,
    part,
    runs,
  })
  // Tourism scenarios play their own bots and only the main part (step 4).
  const full = args.only.length === 0 && !scenario.bookings
  const out: Planned[] = []
  if (args.parts.includes('main')) {
    out.push(
      ...strategies
        .filter((s) => playsIn(s, scenario))
        .map((s) => plan({ kind: 'listed', id: s.id }, 'main')),
    )
    if (full) out.push(plan({ kind: 'randomNoInbox' }, 'main'))
  } else if (args.parts.includes('events')) {
    // The event table reuses the careful bot's runs on seeds where an event never arrives.
    out.push(plan({ kind: 'listed', id: carefulId(scenario) }, 'main'))
  }
  // Leave-one-out runs of validate_then_build. Only for the report, so they stay out of the
  // strategy list that the targets look at.
  // The reading run that targets 6, 11 and 13 are judged against, on the wide seeds; once.
  const wideParts = (['paired', 'inbox', 'price', 'freelance', 'team', 'funding'] as const).filter(
    (p) => args.parts.includes(p),
  )
  if (full && wideParts[0]) out.push(plan(READER_SPEC, wideParts[0], args.wideRuns))
  if (full && args.parts.includes('paired'))
    out.push(...ABLATION_SPECS.map((spec) => plan(spec, 'paired', args.wideRuns)))
  if (full && args.parts.includes('inbox'))
    out.push(
      ...[...INBOX_SPECS, ...(mode === 'long' ? YEAR2_INBOX_SPECS : [])].map((spec) =>
        plan(spec, 'inbox', args.wideRuns),
      ),
    )
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
  // Long mode team variants on the wide seeds (targets 20 and 29).
  if (full && args.parts.includes('team') && mode === 'long')
    out.push(
      ...TEAM_SPECS.filter(
        (spec) => args.team.length === 0 || (spec.kind === 'team' && args.team.includes(spec.id)),
      ).map((spec) => plan(spec, 'team', args.wideRuns)),
    )
  // Long mode raising bots on the wide seeds (targets 31 to 37), where the scenario has funding.
  if (full && args.parts.includes('funding') && mode === 'long')
    out.push(...FUNDING_SPECS.map((spec) => plan(spec, 'funding', args.wideRuns)))
  // The energy curve, on the wide seeds, only when asked for.
  if (full && args.parts.includes('energy'))
    out.push(...ENERGY_SPECS.map((spec) => plan(spec, 'energy', args.wideRuns)))
  // Plan 2 step 3: blind effort with one event left to its default, every event (tourism).
  if (args.parts.includes('skips') && scenario.bookings)
    for (const e of scenario.events)
      out.push(plan({ kind: 'skip', base: SKIP_BASE, eventId: e.id }, 'skips'))
  // Every answer of every event, forced, on validate_then_build. Slow, so only on request.
  if (args.parts.includes('events'))
    for (const e of scenario.events)
      for (const c of e.choices)
        out.push(
          plan(
            {
              kind: 'forced',
              eventId: e.id,
              choiceId: c.id,
              ...(scenario.bookings ? { tourism: true } : {}),
            },
            'events',
          ),
        )
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

  const { segment, note } = scenario.bookings
    ? { segment: '', note: null }
    : botScenario(scenario.id).playtest
  const input = {
    ...(scenario.mode ? { maxWeeks: scenario.maxWeeks } : {}),
    ...(scenario.bookings ? { tourism: true, firstSeasonWeek: firstSeasonWeek(scenario) } : {}),
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
        p.spec.kind === 'tired' ||
        p.spec.kind === 'team' ||
        p.spec.kind === 'funding' ||
        p.spec.kind === 'energy',
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
    for (const t of scenario.bookings
      ? evaluateTourismTargets(input)
      : scenario.mode === 'long'
        ? [...evaluateLongTargets(input), ...evaluateFundingTargets(input)]
        : evaluateTargets(input, id)) {
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
  if ((task.spec.kind !== 'forced' && task.spec.kind !== 'skip') || !reader) return undefined
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
const readerOf = (s: number, spec?: StrategySpec): RunResult[] | undefined => {
  const careful = spec?.kind === 'skip' ? spec.base : carefulId(units[s]!.scenario)
  const i = plans[s]!.findIndex((p) => p.part === 'main' && p.strategy.id === careful)
  return i >= 0 ? done[s]![i]!.results : undefined
}
for (const part of PARTS) {
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
    const seeds = forcedSeeds(task, readerOf(s, task.spec))
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
    const reader = readerOf(s, tasks[k]!.spec)
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
// The skips part: what each event adds to blind effort, paired on the same seeds (plan 2 step 3).
plans.forEach((p, s) => {
  const base = p.findIndex((x) => x.part === 'main' && x.strategy.id === SKIP_BASE)
  const skips = p.flatMap((x, i) => (x.spec.kind === 'skip' ? [i] : []))
  if (base < 0 || skips.length === 0) return
  const win = (r: RunResult) => (r.ending === 'sustainable' || r.ending === 'growing' ? 1 : 0)
  const full = done[s]![base]!.results
  const rows = skips.map((i) => {
    const spec = p[i]!.spec as { eventId: string }
    const res = done[s]![i]!.results
    const diffs = full.map((r, k) => win(r) - win(res[k]!))
    const n = diffs.length
    const mean = diffs.reduce((t, x) => t + x, 0) / n
    const sd = Math.sqrt(diffs.reduce((t, x) => t + (x - mean) ** 2, 0) / Math.max(1, n - 1))
    const seen = full.filter((r) => r.eventsSeen.includes(spec.eventId)).length
    return { id: spec.eventId, gain: 100 * mean, margin: (196 * sd) / Math.sqrt(n), seen }
  })
  rows.sort((a, b) => b.gain - a.gain)
  const total = rows.reduce((t, r) => t + r.gain, 0)
  console.log(
    `\nSkips for ${units[s]!.about.id}: what each event adds to ${SKIP_BASE} (points, paired)`,
  )
  console.log(`Sum of all events: ${total.toFixed(1)}`)
  for (const r of rows)
    console.log(`${r.id}\t${r.gain.toFixed(2)}\t±${r.margin.toFixed(2)}\tseen ${r.seen}`)
})
const reports = new Map(
  units.map((u, i) => [u.section.id, reportFor(u.scenario, plans[i]!, done[i]!)] as const),
)
console.log(`\nTimings\n${timings.join('\n')}`)
const skipped = PARTS.filter((p) => !args.parts.includes(p))
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

/**
 * Tuning 1: the first run week in which a tourism scenario's products can sell (1 where one sells
 * all year), for target 4 in runs that start out of season.
 */
function firstSeasonWeek(scenario: Scenario): number {
  const b = scenario.bookings!
  const months = Object.values(b.products)
    .filter((p) => (p.serves ?? []).length > 0)
    .map((p) => p.months ?? [])
  if (months.some((m) => m.length === 0)) return 1
  const open = new Set(months.flat())
  const inSeason = (w: number) => {
    const woy = ((b.startWeekOfYear - 1 + w - 1) % 52) + 1
    return open.has(Math.min(12, Math.floor(((woy - 1) * 12) / 52) + 1))
  }
  // A season's last few weeks at the start (Leinen los starts in October) do not count: nobody
  // could have booked them. The first season is the first that opens after a closed week.
  let w = 1
  while (w <= 8 && inSeason(w)) w++
  if (w > 8) return 1
  while (w <= scenario.maxWeeks && !inSeason(w)) w++
  return w
}
