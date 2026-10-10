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
  /** Report parts to run: main, paired, inbox, events. `--events` adds events. */
  parts: string[]
  /** Seeds for the paired and inbox parts (targets 6, 11 and 13); defaults to `runs`. */
  wideRuns: number
}

const PARTS = ['main', 'paired', 'inbox', 'events']

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
    parts: ['main', 'paired', 'inbox'],
    wideRuns: 0,
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
