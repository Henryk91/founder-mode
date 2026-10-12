import { availableParallelism } from 'node:os'

export type BotArgs = {
  runs: number
  seedPrefix: string
  /** Where to write the markdown report, relative to the repo root. '-' prints only. */
  out: string
  /** Run only these strategies; empty means all. */
  only: string[]
  /** Also run every answer of every inbox event (slow). */
  events: boolean
  /** Run only this scenario; null runs every scenario. */
  scenario: string | null
  /** Instead of the report, compare taking the office with walk-ins against declining it. */
  desk: boolean
  /** Processes that play the seeds. 1 plays everything in this process. */
  jobs: number
  /**
   * Report parts to run: main, paired, inbox, price, freelance, events. `--events` adds events.
   * `tired` (the energy check of target 19), `team` (long mode team variants on the wide seeds)
   * and `energy` (the energy curve) run only when asked for.
   */
  parts: string[]
  /** Seeds for the paired, inbox and price parts (targets 6, 11, 13 and 17); defaults to `runs`. */
  wideRuns: number
  /**
   * Extra freelancer runs for the `freelance` part, beside target 19's own: `role:hours`, with
   * an optional rate in EUR per hour (`:0` for a free freelancer) and, for a salesperson, weeks.
   */
  freelance: FreelanceArg[]
  /** Run length: the 60 week game (default), long mode, or every mode a scenario has. */
  mode: 'standard' | 'long' | 'all'
  /** The `team` part plays only these team variants (ids without `team:`); empty plays all. */
  team: string[]
}

export type FreelanceArg = {
  role: 'developer' | 'salesperson'
  hours: number
  eurPerHour: number | null
  weeks: number | null
}

const PARTS = ['main', 'paired', 'inbox', 'price', 'freelance', 'tired', 'team', 'energy', 'events']

/** `developer:20`, `developer:20:0`, `salesperson:20:0:8`. */
export function parseFreelance(text: string): FreelanceArg {
  const [role, hours, eur, weeks] = text.split(':')
  if (role !== 'developer' && role !== 'salesperson') throw new Error(`Invalid --freelance ${text}`)
  const n = (v: string | undefined) => (v === undefined || v === '' ? null : Number(v))
  const out = { role, hours: Number(hours), eurPerHour: n(eur), weeks: n(weeks) } as const
  if (!Number.isInteger(out.hours) || out.hours < 1) throw new Error(`Invalid --freelance ${text}`)
  return out
}

export function parseArgs(argv: readonly string[]): BotArgs {
  const args: BotArgs = {
    runs: 100,
    seedPrefix: 'bot',
    out: 'docs/balancing.md',
    only: [],
    events: false,
    scenario: null,
    desk: false,
    jobs: Math.max(1, availableParallelism() - 1),
    parts: ['main', 'paired', 'inbox', 'price', 'freelance'],
    wideRuns: 0,
    freelance: [],
    mode: 'standard',
    team: [],
  }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--runs' && value !== undefined) {
      const runs = Number.parseInt(value, 10)
      if (!Number.isInteger(runs) || runs < 1) throw new Error(`Invalid --runs value: ${value}`)
      args.runs = runs
      i++
    } else if (flag === '--seed-prefix' && value !== undefined) {
      args.seedPrefix = value
      i++
    } else if (flag === '--out' && value !== undefined) {
      args.out = value
      i++
    } else if (flag === '--scenario' && value !== undefined) {
      args.scenario = value
      i++
    } else if (flag === '--jobs' && value !== undefined) {
      const jobs = Number.parseInt(value, 10)
      if (!Number.isInteger(jobs) || jobs < 1) throw new Error(`Invalid --jobs value: ${value}`)
      args.jobs = jobs
      i++
    } else if (flag === '--parts' && value !== undefined) {
      const parts = value.split(',').filter(Boolean)
      const unknown = parts.filter((p) => !PARTS.includes(p))
      if (unknown.length) throw new Error(`Unknown --parts: ${unknown.join(', ')}`)
      args.parts = parts
      i++
    } else if (flag === '--wide-runs' && value !== undefined) {
      const runs = Number.parseInt(value, 10)
      if (!Number.isInteger(runs) || runs < 1)
        throw new Error(`Invalid --wide-runs value: ${value}`)
      args.wideRuns = runs
      i++
    } else if (flag === '--freelance' && value !== undefined) {
      args.freelance = value.split(',').filter(Boolean).map(parseFreelance)
      i++
    } else if (flag === '--mode' && value !== undefined) {
      if (value !== 'standard' && value !== 'long' && value !== 'all') {
        throw new Error(`Invalid --mode value: ${value}`)
      }
      args.mode = value
      i++
    } else if (flag === '--team' && value !== undefined) {
      args.team = value.split(',').filter(Boolean)
      i++
    } else if (flag === '--desk') {
      args.desk = true
    } else if (flag === '--events') {
      args.events = true
    } else if (flag === '--only' && value !== undefined) {
      args.only = value.split(',').filter(Boolean)
      i++
    }
  }
  if (args.events && !args.parts.includes('events')) args.parts = [...args.parts, 'events']
  args.events = args.parts.includes('events')
  if (args.wideRuns === 0) args.wideRuns = args.runs
  return args
}
