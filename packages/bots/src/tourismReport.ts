import {
  find,
  fmtNum,
  fmtPct,
  median,
  pairedOn,
  pct,
  wins,
  winsOf,
  winRateByMarket,
  type ReportInput,
  type StrategyRuns,
  type Target,
} from './report'
import { fmtMargin, rateMargin } from './margin'
import type { RunResult } from './simulate'
import { PACING_WEEKS, YEAR2_WEEK } from './simulate'

/**
 * Tourism (step 4): the target template of `docs/tourism-proposal.md` section 13, judged on
 * `tourism_careful` and its variants, all on the same seeds in the main part.
 */
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

export function evaluateTourismTargets(input: ReportInput): Target[] {
  const s = (id: string) => input.strategies.find((x) => x.id === id) ?? find(input, id)
  const careful = s('tourism_careful')
  if (!careful) return []
  const all = careful.results.map((_, i) => i)
  const rate = (x: StrategyRuns) => pct(wins(x.results).length, x.results.length)
  const margin = (x: StrategyRuns) => rateMargin(wins(x.results).length, x.results.length)
  const vs = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const r = rate(careful)
  const top = [...input.strategies].sort((a, b) => rate(b) - rate(a))[0]!
  const noTests = s('tourism_no_tests')
  const markets = [...new Set(careful.results.map((x) => x.viableSegment))].sort()
  const byMarket = winRateByMarket(careful.results, markets)
  const spread = byMarket.length
    ? Math.max(...byMarket.map((m) => m.rate)) - Math.min(...byMarket.map((m) => m.rate))
    : 0
  const firstWeeks = wins(careful.results).flatMap((x) =>
    x.tourism?.firstViableWeek != null ? [x.tourism.firstViableWeek] : [],
  )
  const firstMedian = median(firstWeeks)
  const share = (
    rs: readonly RunResult[],
    k: (x: RunResult) => number,
    n: (x: RunResult) => number,
  ) => {
    const whole = rs.reduce((t, x) => t + n(x), 0)
    return whole
      ? pct(
          rs.reduce((t, x) => t + k(x), 0),
          whole,
        )
      : null
  }
  const early = share(
    careful.results,
    (x) => x.decisionWeeks,
    (x) => x.pacingWeeks,
  )
  const late = share(
    careful.results,
    (x) => x.year2DecisionWeeks,
    (x) => x.year2Weeks,
  )
  const price = vs('tourism_price_blind')
  const noInbox = vs('tourism_inbox_none')
  const effort = vs('tourism_inbox_effort')
  const platform = vs('tourism_platform_only')
  const over = vs('tourism_overstaffing')
  const under = vs('tourism_understaffing')
  const review = vs('tourism_review_blind')
  const flex = s('tourism_always_flexible')
  const strict = s('tourism_always_strict')
  const policy = flex && strict ? pairedOn(flex, strict, all) : null
  const policySplit = (() => {
    if (!flex || !strict) return null
    const splits = markets.map((m) => {
      const seeds = all.filter((i) => careful.results[i]!.viableSegment === m)
      return { m, p: pairedOn(flex, strict, seeds) }
    })
    const strictAhead = splits.some((x) => x.p.change - x.p.margin > 0)
    const flexAhead = splits.some((x) => x.p.change + x.p.margin < 0)
    return { splits, strictAhead, flexAhead }
  })()
  const slowest = Math.max(...input.strategies.map((x) => (x.seconds * 1000) / x.results.length))
  // Within its own margin of a limit counts as at the limit (plan 1).
  const loses = (p: { change: number; margin: number } | null, by: number) =>
    p !== null && p.change - p.margin <= -by
  return [
    {
      id: 1,
      text: 'tourism_careful wins (Sustainable or Growing) 25 to 45% of runs',
      value: fmtPct(r),
      margin: fmtMargin(margin(careful)),
      pass: r + margin(careful) >= 25 && r - margin(careful) <= 45,
    },
    {
      id: 2,
      text: 'No strategy wins over 60%; tourism_no_tests under 5%',
      value: `top ${top.id} ${fmtPct(rate(top))}; no tests ${noTests ? fmtPct(rate(noTests)) : '-'}`,
      margin: `${fmtMargin(margin(top))}; ${noTests ? fmtMargin(margin(noTests)) : ''}`,
      pass: rate(top) <= 60 && !!noTests && rate(noTests) < 5,
    },
    {
      id: 3,
      text: 'tourism_careful win rates across the viable segments lie within 15 points',
      value: `${spread.toFixed(1)} points (${byMarket.map((m) => `${m.market} ${fmtPct(m.rate)}`).join(', ')})`,
      margin: '',
      pass: byMarket.length > 0 && spread <= 15,
    },
    {
      id: 4,
      text: 'The first guest from the viable segment is served by week 12 in the median winning run',
      value: `week ${fmtNum(firstMedian, 1)}`,
      margin: '',
      pass: firstMedian !== null && firstMedian <= 12,
    },
    {
      id: 5,
      text: `Decision news in at least 85% of weeks 1 to ${PACING_WEEKS} and 70% of weeks ${YEAR2_WEEK} to 104`,
      value: `${early === null ? '-' : fmtPct(early)}; year 2 ${late === null ? '-' : fmtPct(late)}`,
      margin: '',
      pass: early !== null && late !== null && early >= 85 && late >= 70,
    },
    {
      id: 6,
      text: 'Reading the inbox pays: tourism_careful beats leaving every message to its default by at least 3 points, and blind effort gains at most a third of that',
      value:
        noInbox && effort
          ? `reading ${signed(-noInbox.change)}, blind effort ${signed(effort.change - noInbox.change)}`
          : '-',
      margin: noInbox ? fmtMargin(noInbox.margin) : '',
      pass:
        !!noInbox &&
        !!effort &&
        -noInbox.change + noInbox.margin >= 3 &&
        effort.change - noInbox.change - noInbox.margin <= -noInbox.change / 3,
    },
    {
      id: 7,
      text: 'Seasonal pricing pays: tourism_careful (prices from hints per season) beats tourism_price_blind by 2 to 10 points',
      value: price ? signed(-price.change) : '-',
      margin: price ? fmtMargin(price.margin) : '',
      pass: !!price && -price.change + price.margin >= 2 && -price.change - price.margin <= 10,
    },
    {
      id: 8,
      text: 'Platform dependence is a trap: tourism_platform_only loses at least 3 points to the careful mix',
      value: platform ? signed(platform.change) : '-',
      margin: platform ? fmtMargin(platform.margin) : '',
      pass: loses(platform, 3),
    },
    {
      id: 9,
      text: 'Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster',
      value: `over ${over ? signed(over.change) : '-'}, under ${under ? signed(under.change) : '-'}`,
      margin: `${over ? fmtMargin(over.margin) : ''}, ${under ? fmtMargin(under.margin) : ''}`,
      pass: loses(over, 3) && loses(under, 3),
    },
    {
      id: 10,
      text: 'Reviews matter: tourism_review_blind loses at least 2 points',
      value: review ? signed(review.change) : '-',
      margin: review ? fmtMargin(review.margin) : '',
      pass: loses(review, 2),
    },
    {
      id: 11,
      text: 'The cancellation policy is a real decision: always strict and always flexible each win in some segment split, and neither is ahead by more than 5 points overall',
      value: policy
        ? `strict ahead by ${signed(policy.change)} overall; ${policySplit!.splits.map((x) => `${x.m} ${signed(x.p.change)}`).join(', ')}`
        : '-',
      margin: policy ? fmtMargin(policy.margin) : '',
      pass:
        !!policy &&
        !!policySplit &&
        policySplit.strictAhead &&
        policySplit.flexAhead &&
        Math.abs(policy.change) - policy.margin <= 5,
    },
    {
      id: 12,
      text: '1000 runs complete in under 150 seconds (slowest strategy)',
      value: `${slowest.toFixed(1)} s per 1000 runs`,
      margin: '',
      pass: slowest < 150,
    },
  ]
}

export function tourismTargetRows(input: ReportInput): string[] {
  const met = (t: Target) => (t.value === '-' ? 'not measured' : t.pass ? 'yes' : 'no')
  return [
    '## Targets (tourism)',
    '',
    'The tourism target template (`docs/tourism-proposal.md` section 13), judged on `tourism_careful`; differences are paired on the same seeds. Target 6 (the inbox) needs the inbox part and is reported with the scenario.',
    '',
    '| # | Target | Value | Margin | Met |',
    '|---|---|---|---|---|',
    ...evaluateTourismTargets(input).map(
      (t) => `| T${t.id} | ${t.text} | ${t.value} | ${t.margin} | ${met(t)} |`,
    ),
  ]
}

/** Guests, money, reviews and channels per tourism strategy. */
export function tourismRows(input: ReportInput): string[] {
  const rows = input.strategies.filter((x) => x.results.some((r) => r.tourism))
  if (rows.length === 0) return []
  const eur = (c: number | null) => (c === null ? '-' : Math.round(c / 100).toLocaleString('en-GB'))
  return [
    '',
    '## Guests (tourism)',
    '',
    'Per strategy, medians over its runs: guests served, what they paid (net of commission), the rating at the end, the share of guests who came through the platform, guests turned away in the last 12 weeks, and guests the company cancelled (roster or weather).',
    '',
    '| Strategy | Win rate | Guests | Paid (EUR) | Rating | Platform share | Turned away | Company cancelled |',
    '|---|---|---|---|---|---|---|---|',
    ...rows.map((x) => {
      const t = x.results.flatMap((r) => (r.tourism ? [r.tourism] : []))
      const m = (f: (v: (typeof t)[number]) => number | null) =>
        median(t.flatMap((v) => (f(v) === null ? [] : [f(v)!])))
      return `| ${x.id} | ${fmtPct(pct(x.results.filter(winsOf).length, x.results.length))} | ${fmtNum(m((v) => v.guests))} | ${eur(m((v) => v.revenueCents))} | ${fmtNum(
        m((v) => v.rating),
        2,
      )} | ${fmtPct((m((v) => v.platformShare) ?? 0) * 100)} | ${fmtNum(m((v) => v.turnedAway))} | ${fmtNum(m((v) => v.companyCancelled))} |`
    }),
  ]
}
