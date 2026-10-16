import {
  fmtNum,
  fmtPct,
  median,
  pairedOn,
  pct,
  wins,
  type ReportInput,
  type StrategyRuns,
  type Target,
} from './report'
import { fmtMargin, medianMargin, rateMargin } from './margin'

const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

/**
 * Plan 3 (docs/office-stages.md section 5): targets O1 to O3 on the careful bot and its never
 * and always moving variants, on the same seeds. O4 is a test (the offer texts and the
 * post-mortem); O5 is the rest of the scenario's own targets. `firstId` numbers them.
 */
export function evaluateOfficeTargets(
  firstId: number,
  careful: StrategyRuns | undefined,
  never: StrategyRuns | undefined,
  always: StrategyRuns | undefined,
  note = '',
): Target[] {
  const seeds = careful ? careful.results.map((_, i) => i) : []
  const o1 = careful && never ? pairedOn(never, careful, seeds) : null
  const o2 = careful && always ? pairedOn(always, careful, seeds) : null
  // O3: among the careful bot's wins, each stage offered is taken in some and declined in others,
  // and taken in at most 90% of the wins where it was offered.
  const won = careful ? wins(careful.results) : []
  const stages = [3, 4, 5].map((n) => {
    const offered = won.filter((r) => r.office.offered.includes(n))
    const taken = offered.filter((r) => r.office.taken.includes(n))
    return { n, offered: offered.length, taken: taken.length }
  })
  return [
    {
      id: firstId,
      // Restated after review (docs/office-stages.md section 5): two-year runs cannot pay back a
      // fixed-cost move, so "beats never moving by 2 points" rewarded what the game cannot give.
      text: `O1. Moving at the right time costs little: the careful bot with its stage rules loses at most 1 point against never moving${note}`,
      value: o1 ? signed(o1.change) : '-',
      margin: o1 ? fmtMargin(o1.margin) : '',
      pass: !!o1 && o1.change + o1.margin >= -1,
    },
    {
      id: firstId + 1,
      text: `O2. Moving early loses: accepting every offer at once loses to the careful bot by at least 3 points${note}`,
      value: o2 ? signed(-o2.change) : '-',
      margin: o2 ? fmtMargin(o2.margin) : '',
      pass: !!o2 && o2.change + o2.margin >= 3,
    },
    {
      id: firstId + 2,
      text: "O3. No stage is always right: among the careful bot's wins, each of stages 3 to 5 is taken in some and declined in others (taken in at most 90% of the wins where it was offered)",
      value: careful
        ? stages
            .map((x) =>
              x.offered
                ? `stage ${x.n} taken in ${fmtPct(pct(x.taken, x.offered))} of ${x.offered}`
                : `stage ${x.n} never offered`,
            )
            .join('; ')
        : '-',
      margin: '',
      pass:
        !!careful &&
        stages.every((x) => x.offered > 0 && x.taken > 0 && x.taken < x.offered) &&
        stages.every((x) => pct(x.taken, x.offered) <= 90),
    },
  ]
}

/** E1's band: the share of the careful bot's winning runs that turn established, and the week. */
export const E1_SHARE = [40, 80] as const
export const E1_WEEK = [60, 90] as const

/**
 * Plan 3, after review: target E1 on the careful bot's runs. The established look comes to a
 * company that has made it: in 40 to 80% of its winning runs, median week 60 to 90.
 */
export function evaluateEstablishedTarget(id: number, careful: StrategyRuns | undefined): Target {
  const won = careful ? wins(careful.results) : []
  const weeks = won.flatMap((r) => (r.establishedWeek === null ? [] : [r.establishedWeek]))
  const share = pct(weeks.length, won.length)
  const week = median(weeks)
  const shareMargin = rateMargin(weeks.length, won.length)
  const weekMargin = weeks.length ? medianMargin(weeks) : 0
  const within = (x: number, [lo, hi]: readonly [number, number], m: number) =>
    x + m >= lo && x - m <= hi
  return {
    id,
    text: `E1. The established look comes once the company has made it: the careful bot reaches it in ${E1_SHARE[0]} to ${E1_SHARE[1]}% of its winning runs, median week ${E1_WEEK[0]} to ${E1_WEEK[1]}`,
    value: careful ? `${fmtPct(share)} of ${won.length} wins; median week ${fmtNum(week)}` : '-',
    margin: careful ? `${fmtMargin(shareMargin)}; ${fmtMargin(weekMargin)}` : '',
    pass:
      !!careful &&
      week !== null &&
      within(share, E1_SHARE, shareMargin) &&
      within(week, E1_WEEK, weekMargin),
  }
}

/**
 * Plan 3: how often and when runs turn established (months covering all costs in a row, office
 * stage 4, or a closed round in Kantino long), per long mode strategy that reached it at least once.
 */
export function establishedRows(input: ReportInput): string[] {
  const rows = input.strategies.filter((x) => x.results.some((r) => r.establishedWeek !== null))
  if (rows.length === 0) return []
  return [
    '',
    '## The established look',
    '',
    "Runs that turned established (money in covering all costs for the scenario's months in a row, a move into office stage 4, or in Kantino long a closed funding round), and the median week it happened in the winning runs that reached it.",
    '',
    '| Strategy | Runs | Of all runs | Of winning runs | Median week (wins) |',
    '|---|---|---|---|---|',
    ...rows.map((x) => {
      const won = wins(x.results)
      const reached = (rs: typeof won) => rs.filter((r) => r.establishedWeek !== null)
      const weeks = reached(won).map((r) => r.establishedWeek!)
      return `| ${x.id} | ${x.results.length} | ${fmtPct(pct(reached(x.results).length, x.results.length))} | ${fmtPct(pct(reached(won).length, won.length))} | ${fmtNum(median(weeks))} |`
    }),
  ]
}
