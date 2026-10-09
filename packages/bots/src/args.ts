export type BotArgs = {
  runs: number
  seedPrefix: string
}

export function parseArgs(argv: readonly string[]): BotArgs {
  const args: BotArgs = { runs: 100, seedPrefix: 'bot' }
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
    }
  }
  return args
}
