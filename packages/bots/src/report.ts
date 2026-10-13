import type { RunResult } from './simulate'
import { CHECK_WEEK, EVIDENCE_WEEK, PACING_WEEKS, STANDARD_WEEKS } from './simulate'
import { EARLY_HIRE_WIDE_ID, FREELANCE_TARGET_ID } from './specs'
import { energyRows, fundingRows, longTargetRows, teamRows } from './longReport'
import { tourismRows, tourismTargetRows } from './tourismReport'
import { combined, fmtMargin, medianMargin, pairedMargin, rateMargin, ratioMargin } from './margin'

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
  /** The playtest bot's market, and what the hand playtest reached (`{week}` is the check week). */
  playtest?: { segment: string; note: string | null }
  /** Run length, for long mode; the 60 week report leaves it out and keeps its old layout. */
  maxWeeks?: number
  /** A tourism scenario (the bookings model): its own targets and tables. */
  tourism?: boolean
  /** Build hours of each market's must have features, for the freelancer split (target 19). */
  marketBuildHours?: Record<string, number>
}

/** The validate_then_build variants the targets are judged on. */
export const TARGET_STRATEGIES = [
  'validate_then_build',
  'validate_then_build_hire',
  'validate_then_build_early_hire',
] as const

/** validate_then_build itself, run with the inbox policies when they use more seeds. */
export const READER_ID = 'validate_then_build inbox:reader'

/** The hire variants, compared with plain validate_then_build in their own section. */
const HIRE_STRATEGIES = ['validate_then_build_hire', 'validate_then_build_early_hire'] as const

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2
}

export const pct = (part: number, whole: number) => (whole ? (100 * part) / whole : 0)
export const fmtPct = (p: number) => `${p.toFixed(1)}%`
export const fmtNum = (n: number | null, digits = 0) => (n === null ? '-' : n.toFixed(digits))
const fmtEur = (cents: number | null) =>
  cents === null ? '-' : `${Math.round(cents / 100).toLocaleString('en-GB')} EUR`

/** A win: Sustainable, or Growing for a funded run in long mode (Part D). */
export const isWin = (r: RunResult) => r.ending === 'sustainable' || r.ending === 'growing'
export const isLoss = (r: RunResult) => !isWin(r)

/**
 * A target of plan section 7. `value` is '-' when the runs it needs were not part of the input.
 * `margin` is the 95% margin of error of the value ('' where it has none, such as a count).
 */
export type Target = { id: number; text: string; value: string; margin: string; pass: boolean }

export const wins = (rs: readonly RunResult[]) => rs.filter(isWin)

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

export const firstCustomerWeeks = (rs: readonly RunResult[]) =>
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

export const find = (input: ReportInput, id: string) =>
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
  const winMargin = (id: string) => {
    const s = find(input, id)
    return s ? fmtMargin(rateMargin(wins(s.results).length, s.results.length)) : ''
  }
  const wonList = (id: string) => (find(input, id)?.results ?? []).map(winsOf)
  /** Margin of the difference `b - a` in win rate, on the same seeds. */
  const diffMargin = (a: string, b: string) => pairedMargin(wonList(a), wonList(b))
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
  // Targets 6, 11 and 13 may run on more seeds (`--wide-runs`), against a reading run of
  // validate_then_build on those seeds.
  const wide = find(input, READER_ID)
  const wideNote =
    wide && wide.results.length !== input.runs ? ` (on ${wide.results.length} seeds)` : ''
  const spreadRuns = vtbId === 'validate_then_build' && wide ? wide.results : vtbRuns
  const pairedId = wide ? READER_ID : 'validate_then_build'
  const pairedRuns = wide ? wide.results : plainRuns
  const spread = marketSpread(spreadRuns)
  const firstWin = median(firstCustomerWeeks(wins(vtbRuns)))
  // Changes are judged by the mean: the median of whole weeks jumps when it crosses a half.
  const firstWeeks = firstCustomerWeeks(wins(vtbRuns))
  const firstMean = firstWeeks.length
    ? firstWeeks.reduce((a, b) => a + b, 0) / firstWeeks.length
    : null
  const firstMeanMargin =
    firstMean === null || firstWeeks.length < 2
      ? 0
      : 1.96 *
        Math.sqrt(
          firstWeeks.reduce((t, w) => t + (w - firstMean) ** 2, 0) /
            (firstWeeks.length - 1) /
            firstWeeks.length,
        )
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
  const paceMargin = (id: string) => {
    const rs = find(input, id)?.results ?? []
    return ratioMargin(
      rs.map((r) => r.decisionWeeks),
      rs.map((r) => r.pacingWeeks),
    )
  }
  const rows = input.events ? eventRows(plainRuns, input.events) : []
  const measured = rows.filter((r) => r.seeds >= EVENT_MIN_SEEDS)
  const cheapShare = pct(measured.filter((r) => r.favoursCheap).length, measured.length)
  const none = winRate('validate_then_build inbox:none')
  const effort = winRate('validate_then_build inbox:effort')
  const cheapest = winRate('validate_then_build inbox:cheapest')
  // The inbox policies may run on more seeds than the rest; reading is then their own reader run.
  const readerId = find(input, READER_ID) ? READER_ID : 'validate_then_build'
  const reading = winRate(readerId)
  const repeated = input.strategies.reduce(
    (t, st) => t + st.results.reduce((u, r) => u + r.repeatedEvents, 0),
    0,
  )
  const behaviour = (name: string) => {
    const v = find(input, `validate_then_build -${name}`)
    return v ? paired(pairedRuns, v.results) : null
  }
  const offs = ['chase', 'landing', 'books'].map((n) => ({ n, p: behaviour(n) }))
  const presaleMax = winRate('presale_max')
  const shares = customerShares(plainRuns)
  const topShare = shares[0]
  const shareMargin = topShare
    ? ratioMargin(
        wins(plainRuns).map((r) => r.customersBySource[topShare.key] ?? 0),
        wins(plainRuns).map((r) =>
          Object.values(r.customersBySource).reduce((a: number, b: number) => a + b, 0),
        ),
      )
    : 0
  const spreadMargin = (() => {
    const markets = [...new Set(spreadRuns.map((r) => r.viableSegment))]
    const byMarket = winRateByMarket(spreadRuns, markets).sort((a, b) => a.rate - b.rate)
    const lo = byMarket[0]
    const hi = byMarket[byMarket.length - 1]
    if (!lo || !hi) return 0
    const m = (x: typeof lo) => rateMargin(Math.round((x.rate * x.runs) / 100), x.runs)
    return combined(m(lo), m(hi))
  })()
  const blindBest = [
    { id: 'validate_then_build inbox:none', rate: none },
    { id: 'validate_then_build inbox:effort', rate: effort },
    { id: 'validate_then_build inbox:cheapest', rate: cheapest },
  ].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0]!
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  return [
    {
      id: 1,
      text: 'build_only reaches Sustainable business in under 5% of runs',
      value: buildOnly === null ? '-' : fmtPct(buildOnly),
      margin: winMargin('build_only'),
      pass: buildOnly !== null && buildOnly < 5,
    },
    {
      id: 2,
      text: 'validate_then_build reaches it in 25 to 45% of runs',
      value: vtb === null ? '-' : fmtPct(vtb),
      margin: winMargin(vtbId),
      pass: vtb !== null && vtb >= 25 && vtb <= 45,
    },
    {
      id: 3,
      text: 'No strategy exceeds 60%',
      value: top ? `${top.id} ${fmtPct(top.rate)}` : '-',
      margin: top ? winMargin(top.id) : '',
      pass: !top || top.rate <= 60,
    },
    {
      id: 4,
      text: 'Median run length of losing runs (all strategies) is between week 20 and week 40',
      value: `week ${fmtNum(losingMedian, 1)}`,
      margin: fmtMargin(medianMargin(losing)),
      pass: losingMedian !== null && losingMedian >= 20 && losingMedian <= 40,
    },
    {
      id: 5,
      text: '1000 runs complete in under 60 seconds (slowest strategy, timed while the other bot processes run)',
      value: `${slowest.toFixed(1)} s per 1000 runs`,
      margin: '',
      pass: slowest < 60,
    },
    {
      id: 6,
      text: `validate_then_build win rates across the three viable markets lie within 15 points${vtbId === 'validate_then_build' ? wideNote : ''}`,
      value: `${spread.toFixed(1)} points`,
      margin: fmtMargin(spreadMargin),
      pass: spreadRuns.length > 0 && spread <= 15,
    },
    {
      id: 7,
      text: 'validate_then_build gets its first paying customer between week 4 and 10 in the median winning run',
      value: `week ${fmtNum(firstWin, 1)} (mean ${fmtNum(firstMean, 2)})`,
      margin: `${fmtMargin(medianMargin(firstCustomerWeeks(wins(vtbRuns))))} (mean ${fmtMargin(firstMeanMargin, 2)})`,
      pass: firstWin !== null && firstWin >= 4 && firstWin <= 10,
    },
    {
      id: 8,
      text: 'By week 10, at least 70% of validate_then_build runs have a paying customer or have left a market that is not viable',
      value: evidence.length ? fmtPct(evidenceShare) : '-',
      margin: fmtMargin(
        rateMargin(evidence.filter((r) => r.evidenceByCheck).length, evidence.length),
      ),
      pass: evidence.length > 0 && evidenceShare >= 70,
    },
    {
      id: 9,
      text: 'In weeks 1 to 20, at least 85% of weeks bring decision news, for validate_then_build and playtest',
      value: `${paceVtb === null ? '-' : fmtPct(paceVtb)} and ${pacePlay === null ? '-' : fmtPct(pacePlay)}`,
      margin: `${fmtMargin(paceMargin('validate_then_build'))} and ${fmtMargin(paceMargin('playtest'))}`,
      pass: paceVtb !== null && pacePlay !== null && paceVtb >= 85 && pacePlay >= 85,
    },
    {
      id: 10,
      text: `At least a third of events (seen in ${EVENT_MIN_SEEDS} or more seeds) favour the cheap or free choice`,
      value: measured.length
        ? `${measured.filter((r) => r.favoursCheap).length} of ${measured.length} (${fmtPct(cheapShare)})`
        : '-',
      margin: '',
      pass: measured.length > 0 && cheapShare >= 100 / 3,
    },
    {
      id: 11,
      text: `Each blind inbox policy (most effort, always cheapest) gains at most a third of what reading the messages gains over leaving them alone; reading beats every blind policy by at least 4 points${wideNote}`,
      value:
        none === null || effort === null || cheapest === null || reading === null
          ? '-'
          : `effort ${signed(effort - none)} (${Math.round((100 * (effort - none)) / (reading - none))}% of reading), cheapest ${signed(cheapest - none)}, reading ${signed(reading - none)}`,
      margin: `${fmtMargin(diffMargin('validate_then_build inbox:none', 'validate_then_build inbox:effort'))}, ${fmtMargin(diffMargin('validate_then_build inbox:none', 'validate_then_build inbox:cheapest'))}, ${fmtMargin(diffMargin(blindBest.id, readerId))} over the best blind`,
      pass:
        none !== null &&
        effort !== null &&
        cheapest !== null &&
        reading !== null &&
        effort - none <= (reading - none) / 3 &&
        cheapest - none <= (reading - none) / 3 &&
        reading - Math.max(none, effort, cheapest) >= 4,
    },
    {
      id: 13,
      text: `Switching off chase, landing tests or books each costs at least 2 points, with more seeds won only with it${wideNote}`,
      value: offs
        .map(({ n, p }) =>
          p ? `${n} ${signed(p.change)} (${p.onlyFull}/${p.onlyOther})` : `${n} -`,
        )
        .join(', '),
      margin: offs
        .map(({ n }) => fmtMargin(diffMargin(pairedId, `validate_then_build -${n}`)))
        .join(', '),
      pass: offs.every(({ p }) => !!p && p.change <= -2 && p.onlyFull > p.onlyOther),
    },
    {
      id: 14,
      text: 'presale_max does not beat validate_then_build by more than 3 points',
      value: presaleMax === null || plain === null ? '-' : `${signed(presaleMax - plain)} points`,
      margin: fmtMargin(diffMargin('validate_then_build', 'presale_max')),
      pass: presaleMax !== null && plain !== null && presaleMax - plain <= 3,
    },
    {
      id: 15,
      text: 'No single action (outreach counted per channel) finds more than 40% of the customers in winning validate_then_build runs',
      value: topShare ? `${topShare.key} ${fmtPct(topShare.share)}` : '-',
      margin: topShare ? fmtMargin(shareMargin) : '',
      pass: !!topShare && topShare.share <= 40,
    },
    {
      id: 16,
      text: 'No run of any strategy brings an event twice, except events that recur on purpose',
      value: `${repeated} repeats`,
      margin: '',
      pass: repeated === 0,
    },
    pricingTarget(input),
    pricingSpreadTarget(input),
    freelanceTarget(input),
  ]
}

type FreelanceSplit = { label: string; seeds: number[] }

/**
 * Seeds of a freelancer run grouped by the build hours of the market it booked for: every seed,
 * then each build size, then seeds where it never booked (identical to plain play).
 */
function freelanceSplits(input: ReportInput, runs: StrategyRuns): FreelanceSplit[] {
  const hours = input.marketBuildHours ?? {}
  const sizes = [...new Set(Object.values(hours))].sort((a, b) => a - b)
  const all = runs.results.map((_, i) => i)
  const of = (r: RunResult) => (r.freelance?.market ? hours[r.freelance.market] : undefined)
  return [
    { label: 'all', seeds: all },
    ...sizes.map((h) => ({
      label: `${h} h (${Object.keys(hours)
        .filter((m) => hours[m] === h)
        .join(', ')})`,
      seeds: all.filter((i) => of(runs.results[i]!) === h),
    })),
    { label: 'never booked', seeds: all.filter((i) => runs.results[i]!.freelance === null) },
  ]
}

/** Paired change in points of `other` against `base` on some seeds, with its margin. */
export function pairedOn(base: StrategyRuns, other: StrategyRuns, seeds: number[]) {
  const b = seeds.map((i) => winsOf(base.results[i]!))
  const o = seeds.map((i) => winsOf(other.results[i]!))
  const rate = (xs: boolean[]) => pct(xs.filter(Boolean).length, xs.length)
  return { change: rate(o) - rate(b), margin: pairedMargin(b, o), n: seeds.length }
}

/**
 * Target 19 (60 weeks, owner's option A after the energy check): renting never beats doing the
 * work yourself, and costs less than an early hire. On the same wide seeds, the freelance
 * developer for the build gains nothing over validate_then_build (its gain minus its margin is at
 * most 0), and wins more often than validate_then_build_early_hire (the difference minus its
 * margin is above 0). "The right call in some situations" is target 20, in long mode.
 */
function freelanceTarget(input: ReportInput): Target {
  const text =
    'Renting never beats doing the work yourself, and costs less than an early hire: a freelance developer for the build gains nothing over validate_then_build, and wins more often than validate_then_build_early_hire'
  const reader = find(input, READER_ID)
  const runs = find(input, FREELANCE_TARGET_ID)
  const hire = find(input, EARLY_HIRE_WIDE_ID)
  if (!reader || !runs || !hire) return { id: 19, text, value: '-', margin: '', pass: false }
  const all = runs.results.map((_, i) => i)
  const rent = pairedOn(reader, runs, all)
  const early = pairedOn(reader, hire, all)
  const apart = pairedOn(hire, runs, all)
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  return {
    id: 19,
    text: `${text} (on ${reader.results.length} seeds)`,
    value: `freelancer ${signed(rent.change)}, early hire ${signed(early.change)}, freelancer ahead of the early hire by ${signed(apart.change)}`,
    margin: `${fmtMargin(rent.margin)}, ${fmtMargin(early.margin)}, ${fmtMargin(apart.margin)}`,
    pass: rent.change - rent.margin <= 0 && apart.change - apart.margin > 0,
  }
}

/**
 * The energy check of target 19: each bot planning 50, 58 or 65 h a week against itself with the
 * tired rule, on the same seeds. "Used" counts the seeds where the renting variant booked, which
 * are the seeds where the rule fired (both variants play the same until then). The split by the
 * plain run: it burned out, it nearly did (energy below 30 at some point), or neither.
 */
function tiredRows(input: ReportInput): string[] {
  const runs = (input.extras ?? []).filter((x) => x.id.startsWith('tired:'))
  if (runs.length === 0) return []
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  const cell = (base: StrategyRuns, r: StrategyRuns, seeds: number[]) => {
    if (seeds.length === 0) return '-'
    const p = pairedOn(base, r, seeds)
    return `${signed(p.change)} ${fmtMargin(p.margin)} (${p.n})`
  }
  const burnout = (r: StrategyRuns, seeds: number[]) =>
    seeds.length === 0
      ? '-'
      : fmtPct(pct(seeds.filter((i) => r.results[i]!.ending === 'burnout').length, seeds.length))
  const out = [
    '',
    '## The freelancer when tired (target 19 check)',
    '',
    `Each bot plays like \`validate_then_build\` planning 50 (the careful bot), 58 or 65 h a week (65 is the overworker). Below 40 or 30 energy, "rent" plans 10 h fewer and books a 10 h freelancer for that work (developer while wanted features are unbuilt, else salesperson) until energy is back at the tired mark (${'70'}); "cut" only plans 10 h fewer. Points against the same bot without the rule, on the same ${runs[0]!.results.length} seeds (paired margin, seeds). "Used": seeds where the rule fired. The last three columns split by the plain run: burned out, nearly (energy below 30 at some point), or neither.`,
    '',
    '| Run | All | Used | Burnout: plain / this | Used: burnout plain / this | Plain burned out | Plain nearly | Neither | Median freelance cost when used |',
    '|---|---|---|---|---|---|---|---|---|',
  ]
  for (const base of runs.filter((r) => !r.id.includes(' below '))) {
    const all = base.results.map((_, i) => i)
    const burned = all.filter((i) => base.results[i]!.ending === 'burnout')
    const nearly = all.filter(
      (i) => base.results[i]!.ending !== 'burnout' && base.results[i]!.minEnergy < 30,
    )
    const neither = all.filter((i) => !burned.includes(i) && !nearly.includes(i))
    out.push(
      `| ${base.id} | ${fmtPct(pct(wins(base.results).length, base.results.length))} won | | ${burnout(base, all)} | | ${burned.length} seeds | ${nearly.length} seeds | ${neither.length} seeds | |`,
    )
    for (const r of runs.filter((x) => x.id.startsWith(`${base.id} `))) {
      const renting = runs.find((x) => x.id === r.id.replace(' cut ', ' rent '))!
      const used = all.filter((i) => renting.results[i]!.freelance !== null)
      const costs = used.map((i) => r.results[i]!.freelance?.costCents ?? 0)
      out.push(
        `| ${r.id} | ${cell(base, r, all)} | ${cell(base, r, used)} | ${burnout(base, all)} / ${burnout(r, all)} | ${burnout(base, used)} / ${burnout(r, used)} | ${cell(base, r, burned)} | ${cell(base, r, nearly)} | ${cell(base, r, neither)} | ${r.id.includes(' rent ') ? fmtEur(median(costs)) : '-'} |`,
      )
    }
  }
  return out
}

/** The freelancer runs against plain play on the same seeds, by build size and by market role. */
function freelanceRows(input: ReportInput): string[] {
  const reader = find(input, READER_ID)
  const runs = (input.extras ?? []).filter(
    (x) => x.id.startsWith('freelance:') || x.id === EARLY_HIRE_WIDE_ID,
  )
  if (!reader || runs.length === 0) return []
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  const cell = (r: StrategyRuns, seeds: number[]) => {
    if (seeds.length === 0) return '-'
    const p = pairedOn(reader, r, seeds)
    return `${signed(p.change)} ${fmtMargin(p.margin)} (${p.n})`
  }
  const splits = freelanceSplits(input, runs[0]!)
  const roles = [...new Set(reader.results.flatMap((r) => Object.values(r.roles)))].sort()
  const out = [
    '',
    '## The freelancer (target 19)',
    '',
    `Each freelancer run plays like \`validate_then_build\` until it books, on the same ${reader.results.length} seeds. Points against plain play (paired margin, seeds). Split by the build hours of the must haves of the market the bot was working on when it booked; "never booked" seeds play exactly as plain. A developer is booked from the first week with a chosen market and unbuilt wanted features, on the wanted feature with the most hours left, until they have shipped; a salesperson from the first paying customer for a fixed number of weeks.`,
    '',
    `| Run | ${splits.map((x) => x.label).join(' | ')} | Booked | Median cost | Median weeks | Median hours of work |`,
    `|---|${splits.map(() => '---').join('|')}|---|---|---|---|`,
  ]
  for (const r of runs) {
    const own = freelanceSplits(input, r)
    const booked = r.results.filter((x) => x.freelance !== null)
    out.push(
      `| ${r.id} | ${own.map((x) => cell(r, x.seeds)).join(' | ')} | ${fmtPct(pct(booked.length, r.results.length))} | ${fmtEur(median(booked.map((x) => x.freelance!.costCents)))} | ${fmtNum(median(booked.map((x) => x.freelance!.weeks)))} | ${fmtNum(median(booked.map((x) => x.freelance!.workedHours)))} |`,
    )
  }
  out.push(
    '',
    'By the real role of the market the bot booked for (hidden, report only):',
    '',
    `| Run | ${roles.join(' | ')} |`,
    `|---|${roles.map(() => '---').join('|')}|`,
  )
  for (const r of runs) {
    const cells = roles.map((role) =>
      cell(
        r,
        r.results
          .map((x, i) => (x.freelance?.market && x.roles[x.freelance.market] === role ? i : -1))
          .filter((i) => i >= 0),
      ),
    )
    out.push(`| ${r.id} | ${cells.join(' | ')} |`)
  }
  return out
}

const SEARCH_ID = 'pricing:search'
const PRICING_IDS = [SEARCH_ID, 'pricing:recipe', 'pricing:fixed x1.5', 'pricing:fixed x2'] as const

/**
 * Target 17: on the wide seeds, the price search beats the default price by 3 to 10 points
 * overall, loses at most 1 point in any viable market, and twice the default price loses to the
 * default in at least two of the three viable markets.
 */
function pricingTarget(input: ReportInput): Target {
  const text =
    'A price search that reads only the screen beats the default price by 3 to 10 points, loses at most 1 point in any viable market and wins at most 45%; twice the default loses in at least two of three. Within its own margin of a limit counts as at the limit'
  const reader = find(input, READER_ID)
  const search = find(input, SEARCH_ID)
  const double = find(input, 'pricing:fixed x2')
  if (!reader || !search || !double) return { id: 17, text, value: '-', margin: '', pass: false }
  const rate = (rs: readonly RunResult[]) => pct(wins(rs).length, rs.length)
  const gain = rate(search.results) - rate(reader.results)
  const markets = [...new Set(reader.results.map((r) => r.viableSegment))].sort()
  const inMarket = (rs: readonly RunResult[], m: string) => rs.filter((r) => r.viableSegment === m)
  const change = (other: StrategyRuns, m: string) =>
    rate(inMarket(other.results, m)) - rate(inMarket(reader.results, m))
  const worst = Math.min(...markets.map((m) => change(search, m)))
  const doubleLoses = markets.filter((m) => change(double, m) < 0).length
  const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`
  const marketMargin = (other: StrategyRuns, m: string) =>
    pairedMargin(inMarket(reader.results, m).map(winsOf), inMarket(other.results, m).map(winsOf))
  const worstMarket = markets.find((m) => change(search, m) === worst) ?? markets[0]!
  const gainMargin = pairedMargin(reader.results.map(winsOf), search.results.map(winsOf))
  const worstMargin = marketMargin(search, worstMarket)
  const searchRate = rate(search.results)
  const rateMargin_ = rateMargin(wins(search.results).length, search.results.length)
  return {
    id: 17,
    text: `${text} (on ${reader.results.length} seeds)`,
    value: `search ${signed(gain)} (${fmtPct(searchRate)}), worst market ${worstMarket} ${signed(worst)}; twice the default loses in ${doubleLoses} of ${markets.length}`,
    margin: `${fmtMargin(gainMargin)} (${fmtMargin(rateMargin_)}), ${fmtMargin(worstMargin)}`,
    pass:
      gain + gainMargin >= 3 &&
      gain - gainMargin <= 10 &&
      worst + worstMargin >= -1 &&
      searchRate - rateMargin_ <= 45 &&
      doubleLoses >= 2,
  }
}

/** Target 18: the price search's win rates across the viable markets lie within 25 points. */
function pricingSpreadTarget(input: ReportInput): Target {
  const text =
    'For the price search that reads the screen, win rates across the three viable markets lie within 25 points; within its own margin counts as at the limit'
  const search = find(input, SEARCH_ID)
  if (!search) return { id: 18, text, value: '-', margin: '', pass: false }
  const spread = marketSpread(search.results)
  const markets = [...new Set(search.results.map((r) => r.viableSegment))]
  const byMarket = winRateByMarket(search.results, markets).sort((a, b) => a.rate - b.rate)
  const m = (x: (typeof byMarket)[number]) =>
    rateMargin(Math.round((x.rate * x.runs) / 100), x.runs)
  const margin = combined(m(byMarket[0]!), m(byMarket[byMarket.length - 1]!))
  return {
    id: 18,
    text: `${text} (on ${search.results.length} seeds)`,
    value: `${spread.toFixed(1)} points (${byMarket.map((x) => `${x.market} ${fmtPct(x.rate)}`).join(', ')})`,
    margin: fmtMargin(margin),
    pass: spread - margin <= 25,
  }
}

/** Win rates of the pricing runs by viable market, and where the search and the recipe end up. */
function pricingRows(input: ReportInput): string[] {
  const reader = find(input, READER_ID)
  const runs = PRICING_IDS.map((id) => find(input, id))
  if (!reader || runs.some((r) => !r)) return []
  const all = [reader, ...(runs as StrategyRuns[])]
  const markets = [...new Set(reader.results.map((r) => r.viableSegment))].sort()
  const rate = (rs: readonly RunResult[]) => pct(wins(rs).length, rs.length)
  const inMarket = (s: StrategyRuns, m: string | null) =>
    m === null ? s.results : s.results.filter((r) => r.viableSegment === m)
  const cell = (s: StrategyRuns, m: string | null) => {
    const base = rate(inMarket(reader, m))
    const r = rate(inMarket(s, m))
    if (s === reader) return fmtPct(r)
    const p = pairedMargin(inMarket(reader, m).map(winsOf), inMarket(s, m).map(winsOf))
    return `${fmtPct(r)} (${r - base >= 0 ? '+' : ''}${(r - base).toFixed(1)} ${fmtMargin(p)})`
  }
  const names: Record<string, string> = {
    [READER_ID]: 'default price (validate_then_build)',
    [SEARCH_ID]: 'search (price_aware)',
    'pricing:recipe': 'recipe (price_recipe)',
    'pricing:fixed x1.5': '1.5 times the default',
    'pricing:fixed x2': '2 times the default',
  }
  // Final price over what the viable market would pay: report only, never shown to the player.
  const share = (rs: readonly RunResult[]) =>
    median(rs.map((r) => r.finalPriceCents / (r.wtpCents[r.viableSegment] ?? 1)))
  const changes = (rs: readonly RunResult[]) =>
    rs.length ? rs.reduce((t, r) => t + r.priceChanges, 0) / rs.length : null
  const moving = all.filter((s) => s.id === SEARCH_ID || s.id === 'pricing:recipe')
  return [
    '',
    '## Pricing (target 17)',
    '',
    `\`validate_then_build\` at different prices, same ${reader.results.length} seeds. Points against the default price, with the paired margin. The search reads only what the screen shows: trials in its market that said yes or "too expensive", and customers who left over the price. The recipe raises a fifth every 3 weeks until its first "too expensive", then goes one step back for good.`,
    '',
    `| Pricing | All | ${markets.join(' | ')} |`,
    `|---|---|${markets.map(() => '---').join('|')}|`,
    ...all.map(
      (s) =>
        `| ${names[s.id] ?? s.id} | ${cell(s, null)} | ${markets.map((m) => cell(s, m)).join(' | ')} |`,
    ),
    '',
    `Spread across viable markets (largest minus smallest win rate, information only; target 6 is judged at the default price): default ${marketSpread(reader.results).toFixed(1)} points, search ${marketSpread(find(input, SEARCH_ID)!.results).toFixed(1)} points.`,
    '',
    'Where the moving prices end, by viable market: the median final price as a share of what that market would pay (hidden, report only), in all runs and in winning runs, and price changes per run.',
    '',
    `| Pricing | ${markets.map((m) => `${m}: all / wins / changes`).join(' | ')} |`,
    `|---|${markets.map(() => '---').join('|')}|`,
    ...moving.map((s) => {
      const cells = markets.map((m) => {
        const rs = inMarket(s, m)
        const f = (x: number | null) => (x === null ? '-' : x.toFixed(2))
        return `${f(share(rs))} / ${f(share(wins(rs)))} / ${f(changes(rs))}`
      })
      return `| ${names[s.id] ?? s.id} | ${cells.join(' | ')} |`
    }),
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
    if (!PER_VARIANT.has(t.id))
      return `| ${t.id} | ${t.text} | ${t.value} | ${t.margin} | ${met(t)} | | | | |`
    const cells = columns.map((c, j) => {
      const u = c[i] as Target
      return j === 0 ? `${u.value} | ${u.margin} | ${met(u)}` : `${u.value} | ${met(u)}`
    })
    return `| ${t.id} | ${t.text} | ${cells.join(' | ')} |`
  })
}

export function winsOf(r: RunResult) {
  return isWin(r)
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
  // A variant's id is its base id followed by ` -name` per behaviour switched off. The full run
  // may have another id (the wide reading run), so the names are read from the variant's own id.
  const offOf = (v: StrategyRuns) => v.id.split(' -').slice(1)
  const most = Math.max(...variants.map((v) => offOf(v).length))
  return [
    row('all behaviours', full),
    ...variants.map((v) => {
      const off = offOf(v)
      return row(off.length === most && most > 1 ? 'without all' : `without ${off.join(', ')}`, v)
    }),
  ]
}

/**
 * Chasing invoices (measurement only, Part C2b): how often the careful bot chases, the founder
 * hours it takes, what the chased invoices would have done unchased (hidden truth), and the
 * seeds it wins only without chasing, against the leave-one-out run on the same seeds.
 */
function chaseRows(input: ReportInput): string[] {
  const off = find(input, 'validate_then_build -chase')
  const reader = find(input, READER_ID)
  const full =
    reader && off && reader.results.length === off.results.length
      ? reader
      : input.strategies.find((x) => x.id === 'validate_then_build')
  if (!full) return []
  const rs = full.results
  const sum = (f: (r: RunResult) => number) => rs.reduce((t, r) => t + f(r), 0)
  const chases = sum((r) => r.chases.count)
  const hours = sum((r) => r.chases.hours)
  const planned = sum((r) => r.plannedHoursTotal)
  const weeks = sum((r) => r.weeks)
  const share = (n: number) => fmtPct(pct(n, chases))
  const out = [
    '',
    '## Chasing invoices',
    '',
    `The careful bot chases up to three overdue invoices a week, 1 h each (${full.id}, ${rs.length} runs). "Unchased" is what each chased invoice would have done without the chase (hidden truth): paid anyway, later; waited for a chase; or never paid. A chase changes nothing else in the game.`,
    '',
    '| Runs that chased | Chases per run | Chases per week played | Founder hours per run | Share of all planned hours | Unchased: paid anyway / waited for a chase / never |',
    '|---|---|---|---|---|---|',
    `| ${fmtPct(pct(rs.filter((r) => r.chases.count > 0).length, rs.length))} | ${(chases / rs.length).toFixed(1)} | ${(chases / Math.max(1, weeks)).toFixed(2)} | ${(hours / rs.length).toFixed(1)} | ${fmtPct(pct(hours, planned))} | ${share(sum((r) => r.chases.wouldPay))} / ${share(sum((r) => r.chases.waited))} / ${share(sum((r) => r.chases.never))} |`,
  ]
  if (off) {
    const p = paired(full.results, off.results)
    const onlyWithout = off.results
      .map((r, i) => ({ r, f: full.results[i]! }))
      .filter(({ r, f }) => winsOf(r) && !winsOf(f))
    const med = (xs: number[]) => fmtNum(median(xs), 1)
    out.push(
      '',
      `Against the same bot that never chases (same seeds): ${p.change.toFixed(1)} points without chasing; won only with chasing ${p.onlyFull} seeds, only without ${p.onlyOther}. In the seeds won only without, the chasing run chased a median ${med(onlyWithout.map(({ f }) => f.chases.count))} times (${med(onlyWithout.map(({ f }) => f.chases.hours))} h) against ${med(full.results.map((r) => r.chases.count))} in all runs.`,
    )
  }
  return out
}

export function buildReport(input: ReportInput): string {
  const long = (input.maxWeeks ?? 0) > STANDARD_WEEKS
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
  )
  if (input.tourism) push(...tourismTargetRows(input))
  else if (long) push(...longTargetRows(input))
  else
    push(
      '## Targets (plan section 7)',
      '',
      `Targets are judged on \`validate_then_build\`. Targets 2, 6, 7 and 8 are also shown for the hire variants, for information only: the hire is meant to pay rarely (decisions log), so those columns are not expected to hold. The margin is half the width of a 95% interval; differences between strategies are paired on the same seeds.`,
      '',
      `| # | Target | ${TARGET_STRATEGIES.map((id, i) => `${id} | ${i === 0 ? 'Margin | Met' : 'Would meet (info)'}`).join(' | ')} |`,
      `|---|---|${TARGET_STRATEGIES.map((_, i) => (i === 0 ? '---|---|---' : '---|---')).join('|')}|`,
      ...targetRows(input),
    )
  const growingCol = input.strategies.some((x) => x.results.some((r) => r.ending === 'growing'))
  push(
    '',
    '## Endings',
    '',
    // Growing (Part D) gets a column only where a run ended that way, so other reports keep theirs.
    growingCol
      ? '| Strategy | Sustainable | Growing | Still searching | Bankrupt | Burnout | Shut down | Median week of bankruptcy | Median losing run length | Median peak monthly revenue | Median customers at end |'
      : '| Strategy | Sustainable | Still searching | Bankrupt | Burnout | Shut down | Median week of bankruptcy | Median losing run length | Median peak monthly revenue | Median customers at end |',
    growingCol
      ? '|---|---|---|---|---|---|---|---|---|---|---|'
      : '|---|---|---|---|---|---|---|---|---|---|',
  )
  for (const s of input.strategies) {
    const n = s.results.length
    const count = (e: string) => s.results.filter((r) => r.ending === e).length
    const bankrupt = s.results.filter((r) => r.ending === 'bankrupt').map((r) => r.weeks)
    push(
      `| ${s.id} | ${fmtPct(pct(count('sustainable'), n))} | ${growingCol ? `${fmtPct(pct(count('growing'), n))} | ` : ''}${fmtPct(pct(count('still_searching'), n))} | ${fmtPct(pct(count('bankrupt'), n))} | ${fmtPct(pct(count('burnout'), n))} | ${fmtPct(pct(count('shut_down'), n))} | ${fmtNum(median(bankrupt))} | ${fmtNum(median(s.results.filter(isLoss).map((r) => r.weeks)))} | ${fmtEur(median(s.results.map((r) => r.peakMonthlyRevenueCents)))} | ${fmtNum(median(s.results.map((r) => r.customersEnd)))} |`,
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

  push(...pricingRows(input))
  push(...freelanceRows(input))
  push(...tiredRows(input))
  push(...chaseRows(input))
  if (input.tourism) push(...tourismRows(input))
  else if (long) push(...teamRows(input), ...fundingRows(input))
  push(...energyRows(input))

  // The 60 week report keeps its old bins (up to 78, the run length before engine 0.7.0); a
  // longer run gets ten week bins up to its last week.
  const last = input.maxWeeks ?? 78
  const weekBins: [number, number][] = Array.from(
    { length: Math.ceil((last - 70) / 10) + 7 },
    (_, i) => [i * 10 + 1, Math.min(last, i * 10 + 10)],
  )
  push(
    '',
    '## Week the run ended',
    '',
    `Share of all runs per strategy, by the week the run ended. Runs that reach the last week end in week ${last}, won or not.`,
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
  if (playtest && input.playtest) {
    const { segment, note } = input.playtest
    const viable = playtest.results.filter((r) => r.viableSegment === segment)
    const handNote = note === null ? '' : `${note.replace('{week}', String(CHECK_WEEK))} `
    push(
      '',
      `## Playtest strategy where ${segment} is viable`,
      '',
      `${handNote}Runs of the playtest bot where ${segment} was the viable market (${viable.length} runs):`,
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
    const variants = (input.ablations ?? []).filter((x) => x.id.startsWith(`${id} `))
    // Compare on the same seeds: the wide reading run when the variants ran on more seeds.
    const reader = find(input, READER_ID)
    const full =
      reader && reader.results.length === variants[0]?.results.length
        ? reader
        : input.strategies.find((x) => x.id === id)
    if (!full || variants.length === 0) continue
    push(
      '',
      `## What each behaviour changed: ${id}`,
      '',
      `Same ${full.results.length} seeds, one behaviour switched off at a time. "Won only with" counts seeds the full strategy wins and this variant does not; "won only without" the other way round. The paired counts show how many seeds actually flipped; the margin of each change is in the targets table (target 13).`,
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

  const plainAll = find(input, READER_ID) ?? find(input, 'validate_then_build')
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
        `\`validate_then_build\` with four ways of answering the inbox, same ${plainAll.results.length} seeds.` +
          ' Reading picks the answer each message deserves in the situation it arrives in (`readInbox`); blind effort takes the most effortful affordable choice without reading (`answerInbox`); always cheapest takes the choice with the fewest hours, then the least money (`cheapestInbox`); none leaves every message to its default.',
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

  // Tourism compares with its own careful bot (tourism fixes, item 18).
  const eventBase = input.tourism ? find(input, 'tourism_careful') : plainAll
  if (input.events && eventBase) {
    const rows = eventRows(eventBase.results, input.events)
    push(
      '',
      '## Inbox events: which answer wins',
      '',
      `\`${eventBase.id}\` answering one event the same way every time it arrives, everything else by reading. Win rates on the seeds where the event arrived; differences of a few points are noise. Events seen in fewer than ${EVENT_MIN_SEEDS} seeds are not judged.`,
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
