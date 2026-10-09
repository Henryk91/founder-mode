import type { RunResult } from './simulate'
import { CHECK_WEEK, EVIDENCE_WEEK, PACING_WEEKS } from './simulate'

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
  /** Forced answer runs of validate_then_build, one per event and choice. */
  events?: EventChoiceRuns[]
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

/** A target of plan section 7. `value` is '-' when the runs it needs were not part of the input. */
export type Target = { id: number; text: string; value: string; pass: boolean }

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

/** Forced choice runs for the event table: one event answered one way, every time. */
export type EventChoiceRuns = {
  eventId: string
  choiceId: string
  hours: number
  costCents: number
  results: RunResult[]
}

export type EventRow = {
  eventId: string
  /** Seeds where the event arrived in at least one of the runs compared. */
  seeds: number
  choices: { choiceId: string; hours: number; costCents: number; rate: number }[]
  best: string
  cheapest: string
  /** The cheapest choice (fewest hours, then least money) has the highest win rate. */
  favoursCheap: boolean
  /** Win rate of plain validate_then_build, which reads each arrival, on the same seeds. */
  reading: number
}

/** Seeds with this few arrivals are too noisy to say which answer is best. */
export const EVENT_MIN_SEEDS = 150

/** Win rate of each forced answer per event, on the seeds where the event arrived. */
export function eventRows(
  base: readonly RunResult[],
  runs: readonly EventChoiceRuns[],
): EventRow[] {
  const ids = [...new Set(runs.map((r) => r.eventId))]
  return ids.map((eventId) => {
    const forced = runs.filter((r) => r.eventId === eventId)
    const seen = new Set<number>()
    base.forEach((r, i) => r.eventsSeen.includes(eventId) && seen.add(i))
    for (const f of forced)
      f.results.forEach((r, i) => r.eventsSeen.includes(eventId) && seen.add(i))
    const choices = forced.map((f) => {
      const rs = [...seen].flatMap((i) => (f.results[i] ? [f.results[i]] : []))
      return {
        choiceId: f.choiceId,
        hours: f.hours,
        costCents: f.costCents,
        rate: pct(wins(rs).length, rs.length),
      }
    })
    const best = [...choices].sort((x, y) => y.rate - x.rate)[0]
    const cheapest = [...choices].sort((x, y) => x.hours - y.hours || x.costCents - y.costCents)[0]
    const read = [...seen].flatMap((i) => (base[i] ? [base[i]] : []))
    return {
      eventId,
      seeds: seen.size,
      choices,
      best: best?.choiceId ?? '-',
      cheapest: cheapest?.choiceId ?? '-',
      favoursCheap: !!best && !!cheapest && cheapest.rate >= best.rate,
      reading: pct(wins(read).length, read.length),
    }
  })
}

/** Customers won in winning runs, by the action that found them, largest share first. */
export function customerShares(results: readonly RunResult[]): { key: string; share: number }[] {
  const totals = new Map<string, number>()
  for (const r of wins(results)) {
    for (const [k, n] of Object.entries(r.customersBySource))
      totals.set(k, (totals.get(k) ?? 0) + n)
  }
  const all = [...totals.values()].reduce((a, b) => a + b, 0)
  return [...totals.entries()]
    .map(([key, n]) => ({ key, share: pct(n, all) }))
    .sort((a, b) => b.share - a.share)
}

/** Paired comparison on the same seeds: points of difference, and seeds that flipped each way. */
export function paired(full: readonly RunResult[], other: readonly RunResult[]) {
  let onlyFull = 0
  let onlyOther = 0
  other.forEach((r, i) => {
    const f = full[i]
    if (!f) return
    if (winsOf(f) && !winsOf(r)) onlyFull++
    if (!winsOf(f) && winsOf(r)) onlyOther++
  })
  const n = Math.max(1, full.length)
  return {
    change: pct(wins(other).length, n) - pct(wins(full).length, n),
    onlyFull,
    onlyOther,
  }
}

const find = (input: ReportInput, id: string) =>
  [...input.strategies, ...(input.ablations ?? []), ...(input.extras ?? [])].find(
    (x) => x.id === id,
  )

/** The targets of plan section 7. Targets 2, 6, 7 and 8 are judged on `vtbId`. */
export function evaluateTargets(
  input: ReportInput,
  vtbId: string = 'validate_then_build',
): Target[] {
  const winRate = (id: string) => {
    const s = find(input, id)
    return s ? pct(wins(s.results).length, s.results.length) : null
  }
  const buildOnly = winRate('build_only')
  const vtb = winRate(vtbId)
  const plain = winRate('validate_then_build')
  const rates = input.strategies.map((s) => ({ id: s.id, rate: winRate(s.id) ?? 0 }))
  const top = rates.sort((a, b) => b.rate - a.rate)[0]
  const losing = input.strategies.flatMap((s) => s.results.filter(isLoss).map((r) => r.weeks))
  const losingMedian = median(losing)
  const slowest = Math.max(...input.strategies.map((s) => (s.seconds * 1000) / s.results.length))
  const vtbRuns = find(input, vtbId)?.results ?? []
  const plainRuns = find(input, 'validate_then_build')?.results ?? []
  const spread = marketSpread(vtbRuns)
  const firstWin = median(firstCustomerWeeks(wins(vtbRuns)))
  const evidence = vtbRuns.filter((r) => r.evidenceByCheck !== null)
  const evidenceShare = pct(evidence.filter((r) => r.evidenceByCheck).length, evidence.length)
  const decisionShare = (id: string) => {
    const rs = find(input, id)?.results ?? []
    const weeks = rs.reduce((t, r) => t + r.pacingWeeks, 0)
    return weeks
      ? pct(
          rs.reduce((t, r) => t + r.decisionWeeks, 0),
          weeks,
        )
      : null
  }
  const paceVtb = decisionShare('validate_then_build')
  const pacePlay = decisionShare('playtest')
  const rows = input.events ? eventRows(plainRuns, input.events) : []
  const measured = rows.filter((r) => r.seeds >= EVENT_MIN_SEEDS)
  const cheapShare = pct(measured.filter((r) => r.favoursCheap).length, measured.length)
  const none = winRate('validate_then_build inbox:none')
  const effort = winRate('validate_then_build inbox:effort')
  const cheapest = winRate('validate_then_build inbox:cheapest')
  const repeated = input.strategies.reduce(
    (t, st) => t + st.results.reduce((u, r) => u + r.repeatedEvents, 0),
    0,
  )
  const behaviour = (name: string) => {
    const v = find(input, `validate_then_build -${name}`)
    return v ? paired(plainRuns, v.results) : null
  }
  const offs = ['chase', 'landing', 'books'].map((n) => ({ n, p: behaviour(n) }))
  const presaleMax = winRate('presale_max')
  const shares = customerShares(plainRuns)
  const topShare = shares[0]
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  return [
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
      text: 'Median run length of losing runs (all strategies) is between week 20 and week 40',
      value: `week ${fmtNum(losingMedian, 1)}`,
      pass: losingMedian !== null && losingMedian >= 20 && losingMedian <= 40,
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
      text: 'validate_then_build gets its first paying customer between week 4 and 10 in the median winning run',
      value: `week ${fmtNum(firstWin, 1)}`,
      pass: firstWin !== null && firstWin >= 4 && firstWin <= 10,
    },
    {
      id: 8,
      text: 'By week 10, at least 70% of validate_then_build runs have a paying customer or have left a market that is not viable',
      value: evidence.length ? fmtPct(evidenceShare) : '-',
      pass: evidence.length > 0 && evidenceShare >= 70,
    },
    {
      id: 9,
      text: 'In weeks 1 to 20, at least 85% of weeks bring decision news, for validate_then_build and playtest',
      value: `${paceVtb === null ? '-' : fmtPct(paceVtb)} and ${pacePlay === null ? '-' : fmtPct(pacePlay)}`,
      pass: paceVtb !== null && pacePlay !== null && paceVtb >= 85 && pacePlay >= 85,
    },
    {
      id: 10,
      text: `At least a third of events (seen in ${EVENT_MIN_SEEDS} or more seeds) favour the cheap or free choice`,
      value: measured.length
        ? `${measured.filter((r) => r.favoursCheap).length} of ${measured.length} (${fmtPct(cheapShare)})`
        : '-',
      pass: measured.length > 0 && cheapShare >= 100 / 3,
    },
    {
      id: 11,
      text: 'Blind inbox policies (most effort, always cheapest) each lie within 4 points of leaving messages alone; reading beats all three by at least 4',
      value:
        none === null || effort === null || cheapest === null || plain === null
          ? '-'
          : `effort ${signed(effort - none)}, cheapest ${signed(cheapest - none)}, reading ${signed(plain - none)}`,
      pass:
        none !== null &&
        effort !== null &&
        cheapest !== null &&
        plain !== null &&
        Math.abs(effort - none) <= 4 &&
        Math.abs(cheapest - none) <= 4 &&
        plain - Math.max(none, effort, cheapest) >= 4,
    },
    {
      id: 13,
      text: 'Switching off chase, landing tests or books each costs at least 2 points, with more seeds won only with it',
      value: offs
        .map(({ n, p }) =>
          p ? `${n} ${signed(p.change)} (${p.onlyFull}/${p.onlyOther})` : `${n} -`,
        )
        .join(', '),
      pass: offs.every(({ p }) => !!p && p.change <= -2 && p.onlyFull > p.onlyOther),
    },
    {
      id: 14,
      text: 'presale_max does not beat validate_then_build by more than 3 points',
      value: presaleMax === null || plain === null ? '-' : `${signed(presaleMax - plain)} points`,
      pass: presaleMax !== null && plain !== null && presaleMax - plain <= 3,
    },
    {
      id: 15,
      text: 'No single action (outreach counted per channel) finds more than 40% of the customers in winning validate_then_build runs',
      value: topShare ? `${topShare.key} ${fmtPct(topShare.share)}` : '-',
      pass: !!topShare && topShare.share <= 40,
    },
    {
      id: 16,
      text: 'No run of any strategy brings an event twice, except events that recur on purpose',
      value: `${repeated} repeats`,
      pass: repeated === 0,
    },
  ]
}

/** Targets judged per validate_then_build variant; the others are the same for all. */
const PER_VARIANT = new Set([2, 6, 7, 8])

function targetRows(input: ReportInput): string[] {
  const columns = TARGET_STRATEGIES.map((id) => evaluateTargets(input, id))
  const first = columns[0]
  if (!first) return []
  const met = (t: Target) => (t.value === '-' ? 'not measured' : t.pass ? 'yes' : 'no')
  return first.map((t, i) => {
    if (!PER_VARIANT.has(t.id)) return `| ${t.id} | ${t.text} | ${t.value} | ${met(t)} | | | | |`
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
    `Targets are judged on \`validate_then_build\`. Targets 2, 6, 7 and 8 are also shown for the hire variants, for information only: the hire is meant to pay rarely (decisions log), so those columns are not expected to hold.`,
    '',
    `| # | Target | ${TARGET_STRATEGIES.map((id, i) => `${id} | ${i === 0 ? 'Met' : 'Would meet (info)'}`).join(' | ')} |`,
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
    ['1 to 899', (c) => c > 0 && c < 90_000],
    ['900 to 1,799', (c) => c >= 90_000 && c < 180_000],
    ['1,800 to 3,104', (c) => c >= 180_000 && c < 310_500],
    ['3,105 or more', (c) => c >= 310_500],
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
    'Losing runs only (bankrupt, burnout, still searching). "Never paid" means no customer payment arrived in the whole run. Peak monthly revenue is the most the active customers paid per month at any point; 3,105 EUR covers company and living costs. Peak customers is the most active customers at once.',
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
      '| Variant | Runs with a hire | Developer / salesperson | Median offer week | Win rate | Win rate with a hire | Win rate without | Same seeds, plain | Won only with the hire | Won only without | Median cost per customer the hire found | Median value of a customer |',
      '|---|---|---|---|---|---|---|---|---|---|---|---|',
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
        `| ${v.id} | ${hired.length} (${fmtPct(pct(hired.length, v.results.length))}) | ${dev} / ${hired.length - dev} | ${fmtNum(median(hired.map((r) => r.hiredWeek as number)))} | ${rate(v.results)} | ${rate(hired)} | ${rate(v.results.filter((r) => r.hiredWeek === null))} | ${rate(plainSame)} | ${onlyHire} | ${onlyPlain} | ${fmtEur(median(hired.flatMap((r) => (r.hire?.costPerCustomerCents != null ? [r.hire.costPerCustomerCents] : []))))} | ${fmtEur(median(hired.flatMap((r) => (r.hire?.lifetimeValueCents != null ? [r.hire.lifetimeValueCents] : []))))} |`,
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

  const plainAll = find(input, 'validate_then_build')
  if (plainAll) {
    const variants = ['inbox:none', 'inbox:effort', 'inbox:cheapest'].flatMap((v) => {
      const x = find(input, `validate_then_build ${v}`)
      return x ? [{ label: v.slice(6), runs: x }] : []
    })
    if (variants.length > 0) {
      const none = variants.find((v) => v.label === 'none')?.runs
      push(
        '',
        '## Inbox policies',
        '',
        '`validate_then_build` with four ways of answering the inbox, same seeds. Reading picks the answer each message deserves in the situation it arrives in (`readInbox`); blind effort takes the most effortful affordable choice without reading (`answerInbox`); always cheapest takes the choice with the fewest hours, then the least money (`cheapestInbox`); none leaves every message to its default.',
        '',
        '| Policy | Win rate | Against none (points) | Won only with this policy | Won only with none |',
        '|---|---|---|---|---|',
        ...[{ label: 'reading', runs: plainAll }, ...variants].map(({ label, runs }) => {
          const p = none ? paired(none.results, runs.results) : null
          return `| ${label} | ${fmtPct(pct(wins(runs.results).length, runs.results.length))} | ${p ? p.change.toFixed(1) : '-'} | ${p ? p.onlyOther : '-'} | ${p ? p.onlyFull : '-'} |`
        }),
      )
    }
  }

  push(
    '',
    '## Inbox pool',
    '',
    `A dry week is one where the inbox should have brought a message (nothing new, fewer than two open) but no event was eligible any more. Repeats count arrivals of an event that had already arrived, apart from events that recur on purpose.`,
    '',
    '| Strategy | Mean weeks | Mean messages | Runs with a dry week | Mean dry weeks | Median first dry week | Repeats |',
    '|---|---|---|---|---|---|---|',
    ...input.strategies.map(({ id, results: rs }) => {
      const n = Math.max(1, rs.length)
      const dry = rs.filter((r) => r.dryWeeks > 0)
      const first = median(dry.flatMap((r) => (r.firstDryWeek === null ? [] : [r.firstDryWeek])))
      return `| ${id} | ${fmtNum(rs.reduce((t, r) => t + r.weeks, 0) / n, 1)} | ${fmtNum(rs.reduce((t, r) => t + r.eventsSeen.length, 0) / n, 1)} | ${fmtPct(pct(dry.length, rs.length))} | ${fmtNum(rs.reduce((t, r) => t + r.dryWeeks, 0) / n, 2)} | ${fmtNum(first)} | ${rs.reduce((t, r) => t + r.repeatedEvents, 0)} |`
    }),
  )

  if (input.events && plainAll) {
    const rows = eventRows(plainAll.results, input.events)
    push(
      '',
      '## Inbox events: which answer wins',
      '',
      `\`validate_then_build\` answering one event the same way every time it arrives, everything else by reading. Win rates on the seeds where the event arrived; differences of a few points are noise. Events seen in fewer than ${EVENT_MIN_SEEDS} seeds are not judged.`,
      '',
      '| Event | Seeds | Win rate per answer (hours, money) | Reading | Best fixed | Cheapest | Cheapest wins |',
      '|---|---|---|---|---|---|---|',
      ...rows.map(
        (r) =>
          `| ${r.eventId} | ${r.seeds} | ${r.choices.map((c) => `${c.choiceId} (${c.hours} h${c.costCents ? `, ${fmtEur(c.costCents)}` : ''}) ${fmtPct(c.rate)}`).join('; ')} | ${fmtPct(r.reading)} | ${r.best} | ${r.cheapest} | ${r.seeds < EVENT_MIN_SEEDS ? 'not judged' : r.favoursCheap ? 'yes' : 'no'} |`,
      ),
    )
    const judged = rows.filter((r) => r.seeds >= EVENT_MIN_SEEDS)
    const effortWins = judged.filter((r) => !r.favoursCheap).length
    push(
      '',
      `Of ${judged.length} judged events, ${judged.length - effortWins} favour the cheapest answer and ${effortWins} favour a more effortful one. "Reading" is the win rate when every arrival is read; it sits above every fixed answer where the right answer depends on the situation.`,
    )
  }

  if (plainAll) {
    push(
      '',
      '## Where customers come from',
      '',
      'Customers won in winning runs, by the action that found the lead. Outreach is counted per channel, as the plan chooses it.',
      '',
      '| Strategy | Shares |',
      '|---|---|',
      ...['validate_then_build', 'presale_max', 'validate_then_build_early_hire'].flatMap((id) => {
        const x = find(input, id)
        if (!x) return []
        const shares = customerShares(x.results)
        return [`| ${id} | ${shares.map((v) => `${v.key} ${fmtPct(v.share)}`).join(', ') || '-'} |`]
      }),
    )
    const evidence = (rs: RunResult[]) => {
      const with_ = rs.filter((r) => r.evidenceByCheck !== null)
      return fmtPct(pct(with_.filter((r) => r.evidenceByCheck).length, with_.length))
    }
    push(
      '',
      `## Evidence by week ${EVIDENCE_WEEK}`,
      '',
      `Share of runs that by week ${EVIDENCE_WEEK} had a paying customer or had moved off a market that is not viable.`,
      '',
      '| Strategy | Customer or left a dead market | Paying customer by then |',
      '|---|---|---|',
      ...TARGET_STRATEGIES.flatMap((id) => {
        const x = find(input, id)
        if (!x) return []
        const early = x.results.filter(
          (r) => r.firstCustomerWeek !== null && r.firstCustomerWeek <= EVIDENCE_WEEK,
        ).length
        return [`| ${id} | ${evidence(x.results)} | ${fmtPct(pct(early, x.results.length))} |`]
      }),
    )
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
