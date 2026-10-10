import type { RunRecord } from './storage'

/** Wins listed on the Start screen, best first. */
const MAX_WINS = 3

export type Bests = {
  /** Most weeks played, the higher revenue first on a tie. */
  longest: RunRecord | null
  /** Highest monthly revenue, null while no run had a paying customer. */
  revenue: RunRecord | null
  /** Runs that ended sustainable, highest revenue first, at most three. */
  wins: RunRecord[]
  winCount: number
}

/** The best of a list of finished runs. Earlier runs win ties, so a record is not stolen by a copy. */
export function bests(runs: readonly RunRecord[]): Bests {
  let longest: RunRecord | null = null
  let revenue: RunRecord | null = null
  for (const r of runs) {
    if (
      !longest ||
      r.weeks > longest.weeks ||
      (r.weeks === longest.weeks && r.peakRevenueCents > longest.peakRevenueCents)
    ) {
      longest = r
    }
    if (r.peakRevenueCents > 0 && (!revenue || r.peakRevenueCents > revenue.peakRevenueCents)) {
      revenue = r
    }
  }
  const won = runs.filter((r) => r.ending === 'sustainable')
  const wins = [...won].sort((a, b) => b.peakRevenueCents - a.peakRevenueCents).slice(0, MAX_WINS)
  return { longest, revenue, wins, winCount: won.length }
}

/** Ordinary runs and replays (started with "Same market again" or from a best run), apart. */
export function bestRuns(runs: readonly RunRecord[]): { ordinary: Bests; replays: Bests | null } {
  const replays = runs.filter((r) => r.replay)
  return {
    ordinary: bests(runs.filter((r) => !r.replay)),
    replays: replays.length > 0 ? bests(replays) : null,
  }
}
