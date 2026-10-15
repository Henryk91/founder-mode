import { fmtPct, pairedOn, pct, wins, type StrategyRuns, type Target } from './report'
import { fmtMargin } from './margin'

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
      text: `O1. Moving at the right time pays: the careful bot with its stage rules beats never moving by at least 2 points${note}`,
      value: o1 ? signed(o1.change) : '-',
      margin: o1 ? fmtMargin(o1.margin) : '',
      pass: !!o1 && o1.change + o1.margin >= 2,
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
