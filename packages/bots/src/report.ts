import type { RunResult } from './simulate'
import { CHECK_WEEK, PACING_WEEKS } from './simulate'

export type StrategyRuns = {
  id: string
  description: string
  results: RunResult[]
  seconds: number
}

export type ReportInput = {
  engineVersion: string
  runs: number
  seedPrefix: string
  strategies: StrategyRuns[]
  /** Leave-behaviours-out runs of the validate_then_build variants, ids `<base> -<name> ...`. */
  ablations?: StrategyRuns[]
  /** Runs for the report only, such as the random bot that never answers a message. */
  extras?: StrategyRuns[]
}

/** The validate_then_build variants the targets are judged on. */
export const TARGET_STRATEGIES = [
  'validate_then_build',
  'validate_then_build_hire',
  'validate_then_build_early_hire',
] as const

/** The hire variants, compared with plain validate_then_build in their own section. */
const HIRE_STRATEGIES = ['validate_then_build_hire', 'validate_then_build_early_hire'] as const

/** Heading of the hand written part of docs/balancing.md, kept when the report is rebuilt. */
export const NOTES_HEADING = '## Tuning notes'

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

const pct = (part: number, whole: number) => (whole ? (100 * part) / whole : 0)
const fmtPct = (p: number) => `${p.toFixed(1)}%`
const fmtNum = (n: number | null, digits = 0) => (n === null ? '-' : n.toFixed(digits))
const fmtEur = (cents: number | null) =>
  cents === null ? '-' : `${Math.round(cents / 100).toLocaleString('en-GB')} EUR`

export const isLoss = (r: RunResult) => r.ending !== 'sustainable'

/** Targets 6 and 7 were added after the Phase 3 review; nothing has been tuned toward them. */
export type Target = { id: number; text: string; value: string; pass: boolean; tuned: boolean }

const wins = (rs: readonly RunResult[]) => rs.filter((r) => r.ending === 'sustainable')

/** Win rate in percent per viable market, in the given market order. */
export function winRateByMarket(results: readonly RunResult[], markets: readonly string[]) {
  return markets.map((m) => {
    const runs = results.filter((r) => r.viableSegment === m)
    return { market: m, runs: runs.length, rate: pct(wins(runs).length, runs.length) }
  })
}

/** Largest minus smallest win rate across viable markets, in percentage points. */
export function marketSpread(results: readonly RunResult[]): number {
  const markets = [...new Set(results.map((r) => r.viableSegment))]
  const rates = winRateByMarket(results, markets).map((x) => x.rate)
  return rates.length ? Math.max(...rates) - Math.min(...rates) : 0
}

const firstCustomerWeeks = (rs: readonly RunResult[]) =>
  rs.flatMap((r) => (r.firstCustomerWeek === null ? [] : [r.firstCustomerWeek]))

export function evaluateTargets(
  input: ReportInput,
  vtbId: string = 'validate_then_build',
): Target[] {
  const winRate = (id: string) => {
    const s = input.strategies.find((x) => x.id === id)
    if (!s) return null
    return pct(s.results.filter((r) => r.ending === 'sustainable').length, s.results.length)
  }
  const buildOnly = winRate('build_only')
  const vtb = winRate(vtbId)
  const rates = input.strategies.map((s) => ({ id: s.id, rate: winRate(s.id) ?? 0 }))
  const top = rates.sort((a, b) => b.rate - a.rate)[0]
  const losing = input.strategies.flatMap((s) => s.results.filter(isLoss).map((r) => r.weeks))
  const losingMedian = median(losing)
  const slowest = Math.max(...input.strategies.map((s) => (s.seconds * 1000) / s.results.length))
  const vtbRuns = input.strategies.find((s) => s.id === vtbId)?.results ?? []
  const spread = marketSpread(vtbRuns)
  const firstWin = median(firstCustomerWeeks(wins(vtbRuns)))
  const targets: Omit<Target, 'tuned'>[] = [
    {
      id: 1,
      text: 'build_only reaches Sustainable business in under 5% of runs',
      value: buildOnly === null ? '-' : fmtPct(buildOnly),
      pass: buildOnly !== null && buildOnly < 5,
    },
    {
      id: 2,
      text: 'validate_then_build reaches it in 25 to 45% of runs',
      value: vtb === null ? '-' : fmtPct(vtb),
      pass: vtb !== null && vtb >= 25 && vtb <= 45,
    },
    {
      id: 3,
      text: 'No strategy exceeds 60%',
      value: top ? `${top.id} ${fmtPct(top.rate)}` : '-',
      pass: !top || top.rate <= 60,
    },
    {
      id: 4,
      text: 'Median run length of losing runs (all strategies) is between week 20 and week 50',
      value: `week ${fmtNum(losingMedian, 1)}`,
      pass: losingMedian !== null && losingMedian >= 20 && losingMedian <= 50,
    },
    {
      id: 5,
      text: '1000 runs complete in under 60 seconds (slowest strategy)',
      value: `${slowest.toFixed(1)} s per 1000 runs`,
      pass: slowest < 60,
    },
    {
      id: 6,
      text: 'validate_then_build win rates across the three viable markets lie within 15 points',
      value: `${spread.toFixed(1)} points`,
      pass: vtbRuns.length > 0 && spread <= 15,
    },
    {
      id: 7,
      text: 'validate_then_build gets its first paying customer between week 8 and 14 in the median winning run',
      value: `week ${fmtNum(firstWin, 1)}`,
      pass: firstWin !== null && firstWin >= 8 && firstWin <= 14,
    },
  ]
  return targets.map((t) => ({ ...t, tuned: t.id <= 5 }))
}

function targetRows(input: ReportInput): string[] {
  const columns = TARGET_STRATEGIES.map((id) => evaluateTargets(input, id))
  const first = columns[0]
  if (!first) return []
  const met = (t: Target) => `${t.pass ? 'yes' : 'no'}${t.tuned ? '' : ' (not tuned yet)'}`
  return first.map((t, i) => {
    const cells = columns.map((c) => {
      const u = c[i] as Target
      return `${u.value} | ${met(u)}`
    })
    return `| ${t.id} | ${t.text} | ${cells.join(' | ')} |`
  })
}

function winsOf(r: RunResult) {
  return r.ending === 'sustainable'
}

/** Win rate comparison of a full strategy with versions that lack some behaviours. */
function behaviourRows(full: StrategyRuns, variants: StrategyRuns[]): string[] {
  const n = full.results.length
  const fullWins = full.results.filter(winsOf).length
  const row = (label: string, s: StrategyRuns) => {
    const w = s.results.filter(winsOf).length
    // Same seeds in the same order: count the runs that flip.
    let onlyFull = 0
    let onlyThis = 0
    s.results.forEach((r, i) => {
      const f = full.results[i]
      if (!f) return
      if (winsOf(f) && !winsOf(r)) onlyFull++
      if (!winsOf(f) && winsOf(r)) onlyThis++
    })
    const bankrupt = s.results.filter((r) => r.ending === 'bankrupt').length
    return `| ${label} | ${fmtPct(pct(w, n))} | ${(pct(w, n) - pct(fullWins, n)).toFixed(1)} | ${onlyFull} | ${onlyThis} | ${fmtPct(pct(bankrupt, n))} | ${fmtNum(median(s.results.filter(isLoss).map((r) => r.weeks)))} |`
  }
  const most = Math.max(
    ...variants.map((v) => v.id.slice(full.id.length).split(' -').filter(Boolean).length),
  )
  return [
    row('all behaviours', full),
    ...variants.map((v) => {
      const off = v.id.slice(full.id.length).split(' -').filter(Boolean)
      return row(off.length === most && most > 1 ? 'without all' : `without ${off.join(', ')}`, v)
    }),
  ]
}

export function buildReport(input: ReportInput): string {
  const lines: string[] = []
  const push = (...l: string[]) => lines.push(...l)
  const segments = [
    ...new Set(input.strategies.flatMap((s) => s.results.map((r) => r.viableSegment))),
  ].sort()

  push(
    '# Balancing report',
    '',
    `Generated by \`pnpm bots --runs ${input.runs} --seed-prefix ${input.seedPrefix}\`, engine ${input.engineVersion}. Every strategy plays the same seeds.`,
    '',
    '## Targets (plan section 7)',
    '',
    `Targets 1, 3, 4 and 5 look at all strategies and are the same in every column. Targets 2, 6 and 7 are judged on each of ${TARGET_STRATEGIES.map((id) => `\`${id}\``).join(', ')}.`,
    '',
    `| # | Target | ${TARGET_STRATEGIES.map((id) => `${id} | Met`).join(' | ')} |`,
    `|---|---|${TARGET_STRATEGIES.map(() => '---|---').join('|')}|`,
    ...targetRows(input),
    '',
    '## Endings',
    '',
    '| Strategy | Sustainable | Still searching | Bankrupt | Burnout | Shut down | Median week of bankruptcy | Median losing run length | Median peak monthly revenue | Median customers at end |',
    '|---|---|---|---|---|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const n = s.results.length
    const count = (e: string) => s.results.filter((r) => r.ending === e).length
    const bankrupt = s.results.filter((r) => r.ending === 'bankrupt').map((r) => r.weeks)
    push(
      `| ${s.id} | ${fmtPct(pct(count('sustainable'), n))} | ${fmtPct(pct(count('still_searching'), n))} | ${fmtPct(pct(count('bankrupt'), n))} | ${fmtPct(pct(count('burnout'), n))} | ${fmtPct(pct(count('shut_down'), n))} | ${fmtNum(median(bankrupt))} | ${fmtNum(median(s.results.filter(isLoss).map((r) => r.weeks)))} | ${fmtEur(median(s.results.map((r) => r.peakMonthlyRevenueCents)))} | ${fmtNum(median(s.results.map((r) => r.customersEnd)))} |`,
    )
  }

  push(
    '',
    '## Wins by viable market',
    '',
    'Share of runs ending Sustainable, split by which market was secretly viable in that run.',
    '',
    `| Strategy | ${segments.join(' | ')} | Spread |`,
    `|---|${segments.map(() => '---').join('|')}|---|`,
  )
  for (const s of input.strategies) {
    const cells = winRateByMarket(s.results, segments).map((x) => fmtPct(x.rate))
    push(`| ${s.id} | ${cells.join(' | ')} | ${marketSpread(s.results).toFixed(1)} |`)
  }

  const plain = input.strategies.find((s) => s.id === 'validate_then_build')
  const priced = input.strategies.find((s) => s.id === 'price_aware')
  if (plain && priced) {
    const a = winRateByMarket(plain.results, segments)
    const b = winRateByMarket(priced.results, segments)
    push(
      '',
      '## Price aware against plain',
      '',
      '`price_aware` plays like `validate_then_build` and raises the price while trials keep converting. Win rates by viable market, and the price it ended on.',
      '',
      '| Viable market | validate_then_build | price_aware | Difference | price_aware median final price | price_aware median final price in winning runs |',
      '|---|---|---|---|---|---|',
      ...segments.map((m, i) => {
        const runs = priced.results.filter((r) => r.viableSegment === m)
        return `| ${m} | ${fmtPct(a[i]!.rate)} | ${fmtPct(b[i]!.rate)} | ${(b[i]!.rate - a[i]!.rate).toFixed(1)} points | ${fmtEur(median(runs.map((r) => r.finalPriceCents)))} | ${fmtEur(median(wins(runs).map((r) => r.finalPriceCents)))} |`
      }),
    )
  }

  const weekBins: [number, number][] = [
    [1, 10],
    [11, 20],
    [21, 30],
    [31, 40],
    [41, 50],
    [51, 60],
    [61, 70],
    [71, 78],
  ]
  push(
    '',
    '## Week the run ended',
    '',
    'Share of all runs per strategy, by the week the run ended. Runs that reach the last week end in week 78, won or not.',
    '',
    `| Strategy | ${weekBins.map(([a, b]) => `${a} to ${b}`).join(' | ')} |`,
    `|---|${weekBins.map(() => '---').join('|')}|`,
  )
  for (const s of input.strategies) {
    const cells = weekBins.map(([a, b]) =>
      fmtPct(pct(s.results.filter((r) => r.weeks >= a && r.weeks <= b).length, s.results.length)),
    )
    push(`| ${s.id} | ${cells.join(' | ')} |`)
  }

  const revenueBins: [string, (c: number) => boolean][] = [
    ['0', (c) => c === 0],
    ['1 to 599', (c) => c > 0 && c < 60_000],
    ['600 to 1,199', (c) => c >= 60_000 && c < 120_000],
    ['1,200 to 2,069', (c) => c >= 120_000 && c < 207_000],
    ['2,070 or more', (c) => c >= 207_000],
  ]
  const customerBins: [string, (n: number) => boolean][] = [
    ['0', (n) => n === 0],
    ['1', (n) => n === 1],
    ['2 to 3', (n) => n >= 2 && n <= 3],
    ['4 to 6', (n) => n >= 4 && n <= 6],
    ['7 or more', (n) => n >= 7],
  ]
  push(
    '',
    '## Losing runs: what they earned',
    '',
    'Losing runs only (bankrupt, burnout, still searching). "Never paid" means no customer payment arrived in the whole run. Peak monthly revenue is the most the active customers paid per month at any point; 2,070 EUR covers fixed and living costs. Peak customers is the most active customers at once.',
    '',
    `| Strategy | Losing runs | Never paid | Peak monthly revenue (EUR): ${revenueBins.map(([l]) => l).join(' / ')} | Peak customers: ${customerBins.map(([l]) => l).join(' / ')} |`,
    '|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const lost = s.results.filter(isLoss)
    const share = (f: (r: RunResult) => boolean) => fmtPct(pct(lost.filter(f).length, lost.length))
    push(
      `| ${s.id} | ${lost.length} | ${share((r) => r.revenueReceivedCents === 0)} | ${revenueBins.map(([, f]) => share((r) => f(r.peakMonthlyRevenueCents))).join(' / ')} | ${customerBins.map(([, f]) => share((r) => f(r.peakCustomers))).join(' / ')} |`,
    )
  }

  push(
    '',
    '## First paying customer',
    '',
    'Week in which the first customer signed. Medians count only runs that had one.',
    '',
    '| Strategy | Runs with a customer | Median week, all such runs | Median week, winning runs | Median week, losing runs |',
    '|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const all = firstCustomerWeeks(s.results)
    push(
      `| ${s.id} | ${fmtPct(pct(all.length, s.results.length))} | ${fmtNum(median(all), 1)} | ${fmtNum(median(firstCustomerWeeks(wins(s.results))), 1)} | ${fmtNum(median(firstCustomerWeeks(s.results.filter(isLoss))), 1)} |`,
    )
  }

  push(
    '',
    `## Pace and effort (week ${CHECK_WEEK} and whole run)`,
    '',
    `| Strategy | Median customers at week ${CHECK_WEEK} | Median monthly revenue at week ${CHECK_WEEK} | Leads per outreach hour | Mean planned hours | Median lowest energy | Runs with energy below 30 |`,
    '|---|---|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const leads = s.results.reduce((t, r) => t + r.leads, 0)
    const hours = s.results.reduce((t, r) => t + r.outreachHours, 0)
    push(
      `| ${s.id} | ${fmtNum(median(s.results.map((r) => r.customersAtCheck)))} | ${fmtEur(median(s.results.map((r) => r.monthlyRevenueAtCheckCents)))} | ${hours ? (leads / hours).toFixed(3) : '-'} | ${fmtNum(s.results.reduce((t, r) => t + r.meanPlannedHours, 0) / s.results.length, 1)} | ${fmtNum(median(s.results.map((r) => r.minEnergy)), 1)} | ${fmtPct(pct(s.results.filter((r) => r.minEnergy < 30).length, s.results.length))} |`,
    )
  }

  push(
    '',
    '## Interview signal in week 1',
    '',
    'Strategies that interview every market in week 1. How often the secretly viable market sounded most in pain (strictly highest mean answer), and the share of its answers in the top bucket.',
    '',
    '| Strategy | Interviews per market | Viable market ranked first | Viable answers in the top bucket |',
    '|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const signals = s.results.flatMap((r) => (r.firstWeekSignal ? [r.firstWeekSignal] : []))
    if (signals.length < s.results.length / 2) continue
    push(
      `| ${s.id} | ${fmtNum(median(s.results.flatMap((r) => (r.firstWeekInterviews === null ? [] : [r.firstWeekInterviews]))))} | ${fmtPct(pct(signals.filter((x) => x.viableRankedFirst).length, signals.length))} | ${fmtPct((100 * signals.reduce((t, x) => t + x.viableTopShare, 0)) / signals.length)} |`,
    )
  }

  const playtest = input.strategies.find((s) => s.id === 'playtest')
  if (playtest) {
    const viable = playtest.results.filter((r) => r.viableSegment === 'coworking')
    push(
      '',
      '## Playtest strategy where coworking is viable',
      '',
      `The hand playtest found 9 customers and 2,700 EUR monthly revenue by week ${CHECK_WEEK}. Runs of the playtest bot where coworking was the viable market (${viable.length} runs):`,
      '',
      `- Median customers at week ${CHECK_WEEK}: ${fmtNum(median(viable.map((r) => r.customersAtCheck)))}`,
      `- Median monthly revenue at week ${CHECK_WEEK}: ${fmtEur(median(viable.map((r) => r.monthlyRevenueAtCheckCents)))}`,
      `- Sustainable: ${fmtPct(pct(viable.filter((r) => r.ending === 'sustainable').length, viable.length))}`,
    )
  }

  push(
    '',
    '## Phase 4 systems in use',
    '',
    "Per run, averaged over all runs of a strategy. Books left is the number of accountant requests left to their default ('later'). Written off is the share of invoices never paid. Messages answered is the share of inbox messages the strategy answered instead of leaving to its default.",
    '',
    '| Strategy | Landing tests | Pre-sale batches | Invoices issued | Written off | Books left | Messages | Messages answered |',
    '|---|---|---|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const n = s.results.length
    const mean = (f: (r: RunResult) => number) => s.results.reduce((t, r) => t + f(r), 0) / n
    const issued = s.results.reduce((t, r) => t + r.invoicesIssued, 0)
    const lost = s.results.reduce((t, r) => t + r.writtenOffInvoices, 0)
    const messages = s.results.reduce((t, r) => t + r.messages, 0)
    const answered = s.results.reduce((t, r) => t + r.messagesAnswered, 0)
    push(
      `| ${s.id} | ${mean((r) => r.landingTests).toFixed(1)} | ${mean((r) => r.presaleBatches).toFixed(1)} | ${mean((r) => r.invoicesIssued).toFixed(1)} | ${fmtPct(pct(lost, issued))} | ${mean((r) => r.booksLeft).toFixed(2)} | ${mean((r) => r.messages).toFixed(1)} | ${fmtPct(pct(answered, messages))} |`,
    )
  }

  for (const id of TARGET_STRATEGIES) {
    const full = input.strategies.find((x) => x.id === id)
    const variants = (input.ablations ?? []).filter((x) => x.id.startsWith(`${id} `))
    if (!full || variants.length === 0) continue
    push(
      '',
      `## What each behaviour changed: ${id}`,
      '',
      'Same seeds, one behaviour switched off at a time. "Won only with" counts seeds the full strategy wins and this variant does not; "won only without" the other way round. The win rate of one 1000 run batch is uncertain by about 1.2 points on its own; the paired counts show how many seeds actually flipped.',
      '',
      '| Variant | Win rate | Change (points) | Won only with | Won only without | Bankrupt | Median losing run length |',
      '|---|---|---|---|---|---|---|',
      ...behaviourRows(full, variants),
    )
  }

  const plainRuns = input.strategies.find((x) => x.id === 'validate_then_build')?.results
  const hireVariants = HIRE_STRATEGIES.flatMap((id) => {
    const found = input.strategies.find((x) => x.id === id)
    return found ? [found] : []
  })
  if (hireVariants.length > 0) {
    const rate = (rs: RunResult[]) =>
      rs.length ? fmtPct(pct(rs.filter(winsOf).length, rs.length)) : '-'
    push(
      '',
      '## The hire',
      '',
      'Each hire variant plays like `validate_then_build` until its hire rule fires, so on the same seed the runs are identical up to the search. "With a hire" and "without" split the variant\'s own runs; "same seeds, plain" is plain `validate_then_build` on the seeds where the variant hired, so the two win rates on the right compare the same games with and without the hire.',
      '',
      '| Variant | Runs with a hire | Developer / salesperson | Median offer week | Win rate | Win rate with a hire | Win rate without | Same seeds, plain | Won only with the hire | Won only without |',
      '|---|---|---|---|---|---|---|---|---|---|',
    )
    for (const v of hireVariants) {
      const hired = v.results.filter((r) => r.hiredWeek !== null)
      const dev = hired.filter((r) => r.hiredRole === 'developer').length
      const plainSame = plainRuns
        ? hired.flatMap((r) => plainRuns.filter((p) => p.seed === r.seed))
        : []
      let onlyHire = 0
      let onlyPlain = 0
      for (const r of hired) {
        const p = plainRuns?.find((x) => x.seed === r.seed)
        if (!p) continue
        if (winsOf(r) && !winsOf(p)) onlyHire++
        if (!winsOf(r) && winsOf(p)) onlyPlain++
      }
      push(
        `| ${v.id} | ${hired.length} (${fmtPct(pct(hired.length, v.results.length))}) | ${dev} / ${hired.length - dev} | ${fmtNum(median(hired.map((r) => r.hiredWeek as number)))} | ${rate(v.results)} | ${rate(hired)} | ${rate(v.results.filter((r) => r.hiredWeek === null))} | ${rate(plainSame)} | ${onlyHire} | ${onlyPlain} |`,
      )
    }
    const early = hireVariants.find((v) => v.id === 'validate_then_build_early_hire')
    if (early) {
      const hired = early.results.filter((r) => r.hiredWeek !== null)
      const bins: [number, number][] = [
        [1, 15],
        [16, 25],
        [26, 35],
        [36, 50],
        [51, 78],
      ]
      push(
        '',
        'Offer week of `validate_then_build_early_hire`, and the win rate of the runs that hired in that window:',
        '',
        `| Offer week | ${bins.map(([a, b]) => `${a} to ${b}`).join(' | ')} |`,
        `|---|${bins.map(() => '---').join('|')}|`,
        `| Runs | ${bins.map(([a, b]) => hired.filter((r) => r.hiredWeek! >= a && r.hiredWeek! <= b).length).join(' | ')} |`,
        `| Win rate | ${bins.map(([a, b]) => rate(hired.filter((r) => r.hiredWeek! >= a && r.hiredWeek! <= b))).join(' | ')} |`,
      )
    }
  }

  push(
    '',
    `## Pacing in weeks 1 to ${PACING_WEEKS}`,
    '',
    "Share of weeks with at least one noteworthy thing: a new message, new leads, a lead that moved, an experiment result, a shipped feature, a payment, a churned customer, or candidates. Interviews and the player's own spending do not count. The stricter column counts only news that asks for a decision: a new message, a lead that moved stage, an experiment result, a lost customer or invoice, or candidates.",
    '',
    '| Strategy | Weeks with something noteworthy | Weeks with decision news (stricter) | Weeks with a new message | Median noteworthy weeks per run | Runs with 5 or more weeks without decision news |',
    '|---|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const weeks = s.results.reduce((t, r) => t + r.pacingWeeks, 0)
    const noted = s.results.reduce((t, r) => t + r.noteworthyWeeks, 0)
    const msgs = s.results.reduce((t, r) => t + r.messageWeeks, 0)
    const decided = s.results.reduce((t, r) => t + r.decisionWeeks, 0)
    const empty = s.results.filter((r) => r.pacingWeeks - r.decisionWeeks >= 5).length
    push(
      `| ${s.id} | ${fmtPct(pct(noted, weeks))} | ${fmtPct(pct(decided, weeks))} | ${fmtPct(pct(msgs, weeks))} | ${fmtNum(median(s.results.map((r) => r.noteworthyWeeks)))} of ${fmtNum(median(s.results.map((r) => r.pacingWeeks)))} | ${fmtPct(pct(empty, s.results.length))} |`,
    )
  }

  const random = input.strategies.find((x) => x.id === 'random')
  const silent = (input.extras ?? []).find((x) => x.id === 'random_no_inbox')
  if (random && silent) {
    const n = random.results.length
    const dist = (s: StrategyRuns) =>
      ['sustainable', 'still_searching', 'bankrupt', 'burnout']
        .map((e) => fmtPct(pct(s.results.filter((r) => r.ending === e).length, n)))
        .join(' | ')
    const mean = (f: (r: RunResult) => number, s: StrategyRuns) =>
      s.results.reduce((t, r) => t + f(r), 0) / n
    let longer = 0
    let shorter = 0
    random.results.forEach((r, i) => {
      const o = silent.results[i]
      if (!o) return
      if (r.weeks > o.weeks) longer++
      else if (r.weeks < o.weeks) shorter++
    })
    push(
      '',
      '## Random bot: what its inbox answers changed',
      '',
      'The same random bot with and without answering messages. Its answers are random choices (about half of the messages), made with their own random stream. Because answers take hours and money, the weekly plans differ a little after the first answer, so the runs are close but not identical.',
      '',
      '| Variant | Sustainable | Still searching | Bankrupt | Burnout | Mean run length | Mean cash plus savings at the end (EUR) | Mean customers at the end | Messages answered |',
      '|---|---|---|---|---|---|---|---|---|',
      ...[silent, random].map(
        (s) =>
          `| ${s.id} | ${dist(s)} | ${mean((r) => r.weeks, s).toFixed(1)} | ${Math.round(mean((r) => r.finalWealthCents, s) / 100).toLocaleString('en-GB')} | ${mean((r) => r.customersEnd, s).toFixed(2)} | ${fmtPct(
            pct(
              s.results.reduce((t, r) => t + r.messagesAnswered, 0),
              s.results.reduce((t, r) => t + r.messages, 0),
            ),
          )} |`,
      ),
      '',
      `Runs where answering made the run last longer: ${longer}, shorter: ${shorter}, same length: ${n - longer - shorter}.`,
    )
  }

  push('', '## Strategies', '')
  for (const s of input.strategies) {
    push(`- \`${s.id}\`: ${s.description} (${s.seconds.toFixed(1)} s for ${s.results.length} runs)`)
  }
  push('')
  return lines.join('\n')
}
