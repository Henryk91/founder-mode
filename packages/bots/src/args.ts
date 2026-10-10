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
}

export function parseArgs(argv: readonly string[]): BotArgs {
  const args: BotArgs = {
    runs: 100,
    seedPrefix: 'bot',
    out: 'docs/balancing.md',
    only: [],
    events: false,
    scenario: null,
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
    } else if (flag === '--events') {
      args.events = true
    } else if (flag === '--only' && value !== undefined) {
      args.only = value.split(',').filter(Boolean)
      i++
    }
  }
  return args
}
