import {
  evaluateTargets,
  find,
  firstCustomerWeeks,
  fmtNum,
  fmtPct,
  isLoss,
  marketSpread,
  median,
  pairedOn,
  pct,
  READER_ID,
  wins,
  winsOf,
  winRateByMarket,
  type ReportInput,
  type StrategyRuns,
  type Target,
} from './report'
import { combined, fmtMargin, medianMargin, rateMargin, ratioMargin } from './margin'
import type { RunResult } from './simulate'
import { PACING_WEEKS, STANDARD_WEEKS, YEAR2_WEEK } from './simulate'
import { ENERGY_BUDGETS, energyId } from './specs'

/**
 * Long mode (Part C): targets 20 to 30, judged on `validate_then_build`, which builds a team in
 * long mode. The wide reading run is the careful bot on the wide seeds; the team variants ran on
 * the same seeds under `team:<id>`.
 */
const SOLO = 'team:validate_then_build_solo'
const FREELANCE_FIRST = 'team:validate_then_build_freelance_first'
const EXPAND = 'team:validate_then_build_expand'
const EXPAND_SOLO = 'team:validate_then_build_expand_solo'
const FOUNDER_CHASES = 'team:validate_then_build_founder_chases'
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

/** Seeds of the wide runs by the role of the freelancer's first booking, then never booked. */
function rentSituations(runs: StrategyRuns): { label: string; seeds: number[] }[] {
  const all = runs.results.map((_, i) => i)
  const by = (f: (r: RunResult) => boolean) => all.filter((i) => f(runs.results[i]!))
  return [
    {
      label: 'freelance developer (the build was the limit)',
      seeds: by((r) => r.freelance?.role === 'developer'),
    },
    {
      label: 'freelance salesperson (the pipeline was the limit)',
      seeds: by((r) => r.freelance?.role === 'salesperson'),
    },
    { label: 'never rented (the same game)', seeds: by((r) => r.freelance === null) },
  ]
}

const marketsOf = (rs: readonly RunResult[]) => [...new Set(rs.map((r) => r.viableSegment))].sort()
const bySegment = (rs: readonly RunResult[], m: string) =>
  rs.map((r, i) => (r.viableSegment === m ? i : -1)).filter((i) => i >= 0)

export function evaluateLongTargets(input: ReportInput): Target[] {
  const main = (id: string) => input.strategies.find((s) => s.id === id)
  const rate = (s: StrategyRuns | undefined) =>
    s ? pct(wins(s.results).length, s.results.length) : null
  const winMargin = (s: StrategyRuns | undefined) =>
    s ? fmtMargin(rateMargin(wins(s.results).length, s.results.length)) : ''
  const vtb = main('validate_then_build')
  const vtbRuns = vtb?.results ?? []
  const reader = find(input, READER_ID)
  const wideRuns = reader?.results ?? vtbRuns
  const wideNote = reader ? ` (on ${reader.results.length} seeds)` : ''
  const std = evaluateTargets(input)
  const t = (id: number) => std.find((x) => x.id === id)!

  // 20: freelancer or hire, each in its own situation.
  const sit = (kind: string, by: string) => find(input, `team:validate_then_build_${kind}_${by}`)
  const t20 = (() => {
    const text = `Freelancer or hire is each the right call in its own situation: for a burst (the build, from week 3 until it ships), a 20 h freelance developer beats a part time developer hire by at least 2 points; for steady work (selling from the week the business can carry a part time salesperson by the careful rule, to the end), a part time salesperson hire beats a 20 h freelance salesperson by at least 2 points. Both on top of the solo careful bot, on the same seeds${wideNote}`
    const bf = sit('burst', 'freelancer')
    const bh = sit('burst', 'hire')
    const sf = sit('steady', 'freelancer')
    const sh = sit('steady', 'hire')
    if (!bf || !bh || !sf || !sh) return { id: 20, text, value: '-', margin: '', pass: false }
    const all = bf.results.map((_, i) => i)
    const burst = pairedOn(bh, bf, all)
    const steady = pairedOn(sf, sh, all)
    return {
      id: 20,
      text,
      value: `burst: freelancer ahead by ${signed(burst.change)}; steady: hire ahead by ${signed(steady.change)}`,
      margin: `${fmtMargin(burst.margin)}, ${fmtMargin(steady.margin)}`,
      pass: burst.change >= 2 && steady.change >= 2,
    }
  })()

  // 21: mirrors 1 and 3.
  const buildOnly = main('build_only')
  const rates = input.strategies.map((s) => ({ s, rate: rate(s) ?? 0 }))
  const top = [...rates].sort((a, b) => b.rate - a.rate)[0]
  const bo = rate(buildOnly)
  // 23: mirrors 4.
  const losing = input.strategies.flatMap((s) => s.results.filter(isLoss).map((r) => r.weeks))
  const losingMedian = median(losing)
  // 24: mirrors 6.
  const spread = marketSpread(wideRuns)
  const spreadMargin = (() => {
    const by = winRateByMarket(wideRuns, marketsOf(wideRuns)).sort((a, b) => a.rate - b.rate)
    const lo = by[0]
    const hi = by[by.length - 1]
    if (!lo || !hi) return 0
    const m = (x: typeof lo) => rateMargin(Math.round((x.rate * x.runs) / 100), x.runs)
    return combined(m(lo), m(hi))
  })()
  // 25: mirrors 7 and 8.
  const firstWin = median(firstCustomerWeeks(wins(vtbRuns)))
  const evidence = vtbRuns.filter((r) => r.evidenceByCheck !== null)
  const evidenceShare = pct(evidence.filter((r) => r.evidenceByCheck).length, evidence.length)
  // 26: mirrors 9, plus year 2.
  const share = (
    rs: readonly RunResult[],
    k: (r: RunResult) => number,
    n: (r: RunResult) => number,
  ) => {
    const whole = rs.reduce((x, r) => x + n(r), 0)
    return whole
      ? pct(
          rs.reduce((x, r) => x + k(r), 0),
          whole,
        )
      : null
  }
  const playRuns = main('playtest')?.results ?? []
  const early = share(
    vtbRuns,
    (r) => r.decisionWeeks,
    (r) => r.pacingWeeks,
  )
  const earlyPlay = share(
    playRuns,
    (r) => r.decisionWeeks,
    (r) => r.pacingWeeks,
  )
  const late = share(
    vtbRuns,
    (r) => r.year2DecisionWeeks,
    (r) => r.year2Weeks,
  )
  const lateMargin = ratioMargin(
    vtbRuns.map((r) => r.year2DecisionWeeks),
    vtbRuns.map((r) => r.year2Weeks),
  )
  // 27: mirrors 11 and 16, plus dry weeks.
  const inbox = t(11)
  const repeats = t(16)
  const dryRuns = wideRuns.filter((r) => r.dryWeeks > 0).length
  const dryShare = pct(dryRuns, wideRuns.length)
  // 28: year 2 matters.
  const group = (g: RunResult['at60']) => wideRuns.filter((r) => r.at60 === g)
  const profitable = group('profitable')
  const alive = group('alive')
  const keepShare = pct(wins(profitable).length, profitable.length)
  const turnShare = pct(wins(alive).length, alive.length)
  // 29 (restated in plan 3.1): hiring pays only when the business can carry it.
  const solo = find(input, SOLO)
  const savings = find(input, 'team:validate_then_build_savings_hire')
  const expand = find(input, EXPAND)
  const expandSolo = find(input, EXPAND_SOLO)
  const t29 = (() => {
    const text = `Hiring pays only when the business can carry it: validate_then_build's hiring is not worse than validate_then_build_solo overall (within its margin); validate_then_build_savings_hire (first hire in week 3, paid from savings) loses to solo by more than its margin; and in at least one situation hiring beats its solo counterpart by at least 2 points: (a) pricing from the hints (validate_then_build against validate_then_build_solo) or (b) opening a second market once the first runs dry (validate_then_build_expand against validate_then_build_expand_solo)${wideNote}`
    if (!reader || !solo || !savings) return { id: 29, text, value: '-', margin: '', pass: false }
    const all = reader.results.map((_, i) => i)
    const careful = pairedOn(solo, reader, all)
    const early = pairedOn(solo, savings, all)
    const b = expand && expandSolo ? pairedOn(expandSolo, expand, all) : null
    // A situation within its own margin of +2 is at the limit and passes (plan 1).
    const reaches = (p: { change: number; margin: number }) => p.change + p.margin >= 2
    return {
      id: 29,
      text,
      value: `overall (a) ${signed(careful.change)}; on savings ${signed(early.change)}; (b) ${b ? signed(b.change) : '-'}`,
      margin: `${fmtMargin(careful.margin)}; ${fmtMargin(early.margin)}; ${b ? fmtMargin(b.margin) : ''}`,
      pass:
        careful.change + careful.margin >= 0 &&
        early.change + early.margin < 0 &&
        (reaches(careful) || (b !== null && reaches(b))),
    }
  })()
  // 30: mirrors 5.
  const slowest = Math.max(...input.strategies.map((s) => (s.seconds * 1000) / s.results.length))

  return [
    t20,
    {
      id: 21,
      text: 'build_only reaches Sustainable business in under 5% of runs; no strategy exceeds 60%',
      value: `build_only ${bo === null ? '-' : fmtPct(bo)}; top ${top ? `${top.s.id} ${fmtPct(top.rate)}` : '-'}`,
      margin: `${winMargin(buildOnly)}; ${top ? winMargin(top.s) : ''}`,
      pass: bo !== null && bo < 5 && !!top && top.rate <= 60,
    },
    {
      id: 22,
      text: 'validate_then_build reaches it in 25 to 45% of runs',
      value: vtb ? fmtPct(rate(vtb)!) : '-',
      margin: winMargin(vtb),
      pass: !!vtb && rate(vtb)! >= 25 && rate(vtb)! <= 45,
    },
    {
      id: 23,
      text: 'Median run length of losing runs (all strategies) is between week 30 and week 70',
      value: `week ${fmtNum(losingMedian, 1)}`,
      margin: fmtMargin(medianMargin(losing)),
      pass: losingMedian !== null && losingMedian >= 30 && losingMedian <= 70,
    },
    {
      id: 24,
      text: `validate_then_build win rates across the three viable markets lie within 15 points${wideNote}`,
      value: `${spread.toFixed(1)} points`,
      margin: fmtMargin(spreadMargin),
      pass: wideRuns.length > 0 && spread <= 15,
    },
    {
      id: 25,
      text: 'validate_then_build gets its first paying customer between week 4 and 10 in the median winning run, and by week 10 at least 70% of its runs have a paying customer or have left a market that is not viable',
      value: `week ${fmtNum(firstWin, 1)}; ${evidence.length ? fmtPct(evidenceShare) : '-'}`,
      margin: `${fmtMargin(medianMargin(firstCustomerWeeks(wins(vtbRuns))))}; ${fmtMargin(rateMargin(evidence.filter((r) => r.evidenceByCheck).length, evidence.length))}`,
      pass:
        firstWin !== null &&
        firstWin >= 4 &&
        firstWin <= 10 &&
        evidence.length > 0 &&
        evidenceShare >= 70,
    },
    {
      id: 26,
      text: `In weeks 1 to ${PACING_WEEKS}, at least 85% of weeks bring decision news for validate_then_build and playtest; in weeks ${YEAR2_WEEK} to 104, at least 70% for validate_then_build`,
      value: `${early === null ? '-' : fmtPct(early)} and ${earlyPlay === null ? '-' : fmtPct(earlyPlay)}; year 2 ${late === null ? '-' : fmtPct(late)}`,
      margin: fmtMargin(lateMargin),
      pass:
        early !== null &&
        earlyPlay !== null &&
        late !== null &&
        early >= 85 &&
        earlyPlay >= 85 &&
        late >= 70,
    },
    {
      id: 27,
      text: `Target 11 holds (blind inbox policies gain at most a third of reading's gain, reading beats each by 4 points), no event arrives twice unless it recurs on purpose, and under 1% of validate_then_build runs have a week when the inbox ran dry${wideNote}`,
      value: `${inbox.value}; ${repeats.value}; dry in ${fmtPct(dryShare)} of runs`,
      margin: `${inbox.margin}; ${fmtMargin(rateMargin(dryRuns, wideRuns.length))}`,
      pass: inbox.pass && repeats.pass && dryShare < 1,
    },
    {
      id: 28,
      text: `Year 2 matters: of validate_then_build runs profitable in each of the two months to week ${STANDARD_WEEKS}, at most 85% end Sustainable; of runs alive but not profitable at week ${STANDARD_WEEKS}, at least 15% end Sustainable${wideNote}`,
      value: `${fmtPct(keepShare)} of ${profitable.length}; ${fmtPct(turnShare)} of ${alive.length}`,
      margin: `${fmtMargin(rateMargin(wins(profitable).length, profitable.length))}; ${fmtMargin(rateMargin(wins(alive).length, alive.length))}`,
      pass: profitable.length > 0 && alive.length > 0 && keepShare <= 85 && turnShare >= 15,
    },
    t29,
    {
      id: 30,
      text: '1000 long runs complete in under 120 seconds (slowest strategy, timed while the other bot processes run)',
      value: `${slowest.toFixed(1)} s per 1000 runs`,
      margin: '',
      pass: slowest < 120,
    },
  ]
}

/** The 60 week targets reported in long mode for information: they are not judged there. */
const INFO_TARGETS = [10, 13, 14, 15]

export function longTargetRows(input: ReportInput): string[] {
  const met = (t: Target) => (t.value === '-' ? 'not measured' : t.pass ? 'yes' : 'no')
  const info = evaluateTargets(input).filter((t) => INFO_TARGETS.includes(t.id))
  return [
    '## Targets (long mode)',
    '',
    'Targets 20 to 30 (`docs/phase9-proposal.md` 2.9 and Part C2), judged on `validate_then_build`, which builds a team in long mode. The margin is half the width of a 95% interval; differences between strategies are paired on the same seeds.',
    '',
    '| # | Target | Value | Margin | Met |',
    '|---|---|---|---|---|',
    ...evaluateLongTargets(input).map(
      (t) => `| ${t.id} | ${t.text} | ${t.value} | ${t.margin} | ${met(t)} |`,
    ),
    '',
    'For information only, as the 60 week report words them:',
    '',
    '| # | Target | Value | Margin | Would meet |',
    '|---|---|---|---|---|',
    ...info.map((t) => `| ${t.id} | ${t.text} | ${t.value} | ${t.margin} | ${met(t)} |`),
  ]
}

/** Hires and team size per strategy, the careful bot's hire weeks, and targets 20, 28 and 29. */
export function teamRows(input: ReportInput): string[] {
  const runs = [
    ...input.strategies,
    ...(input.extras ?? []).filter((x) => x.id === READER_ID || x.id.startsWith('team:')),
  ]
  if (runs.length === 0) return []
  const q = (xs: number[], p: number) => {
    const s = [...xs].sort((a, b) => a - b)
    return s.length ? s[Math.floor(p * (s.length - 1))]! : null
  }
  const out = [
    '',
    '## The team (long mode)',
    '',
    'Per strategy, over all its runs. Hire weeks are the weeks of the offers (they start working two weeks later). Team at the end counts people hired and not let go when the run ended.',
    '',
    '| Strategy | Runs | Win rate | Runs with a hire | Hires per run | Hire week (25th, median, 75th) | Developers | Part time | Let go per run | Median team at the end | Median team at the end, runs with a hire | Largest team at the end |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|',
  ]
  for (const s of runs) {
    const rs = s.results
    const hires = rs.flatMap((r) => r.hires)
    const hired = rs.filter((r) => r.hires.length > 0)
    const weeks = hires.map((h) => h.week)
    out.push(
      `| ${s.id} | ${rs.length} | ${fmtPct(pct(wins(rs).length, rs.length))} | ${fmtPct(pct(hired.length, rs.length))} | ${(hires.length / rs.length).toFixed(2)} | ${weeks.length ? `${q(weeks, 0.25)}, ${fmtNum(median(weeks))}, ${q(weeks, 0.75)}` : '-'} | ${hires.length ? fmtPct(pct(hires.filter((h) => h.role === 'developer').length, hires.length)) : '-'} | ${hires.length ? fmtPct(pct(hires.filter((h) => h.partTime).length, hires.length)) : '-'} | ${(rs.reduce((t, r) => t + r.lettingsGo, 0) / rs.length).toFixed(2)} | ${fmtNum(median(rs.map((r) => r.teamAtEnd)))} | ${fmtNum(median(hired.map((r) => r.teamAtEnd)))} | ${Math.max(0, ...rs.map((r) => r.teamAtEnd))} |`,
    )
  }

  const careful =
    find(input, READER_ID) ?? input.strategies.find((s) => s.id === 'validate_then_build')
  if (careful) {
    const rs = careful.results
    const hires = rs.flatMap((r) => r.hires.map((h, k) => ({ ...h, k })))
    const bins: [number, number][] = [
      [1, 26],
      [27, 52],
      [53, 78],
      [79, 104],
    ]
    out.push(
      '',
      `Hires of the careful bot (${careful.id}, ${rs.length} runs) by the week of the offer, and the share of its runs with that many hires over the run:`,
      '',
      `| ${bins.map(([a, b]) => `Weeks ${a} to ${b}`).join(' | ')} | First hire | Second hire | Third or later |`,
      `|${bins.map(() => '---').join('|')}|---|---|---|`,
      `| ${bins.map(([a, b]) => String(hires.filter((h) => h.week >= a && h.week <= b).length)).join(' | ')} | ${hires.filter((h) => h.k === 0).length} | ${hires.filter((h) => h.k === 1).length} | ${hires.filter((h) => h.k >= 2).length} |`,
      '',
      `| Hires over the run | ${[0, 1, 2, 3].map((n) => (n === 3 ? '3 or more' : String(n))).join(' | ')} |`,
      '|---|---|---|---|---|',
      `| Share of runs | ${[0, 1, 2, 3].map((n) => fmtPct(pct(rs.filter((r) => (n === 3 ? r.hires.length >= 3 : r.hires.length === n)).length, rs.length))).join(' | ')} |`,
    )
  }

  const reader = find(input, READER_ID)
  const solo = find(input, SOLO)
  const ff = find(input, FREELANCE_FIRST)
  if (reader && (solo || ff)) {
    const markets = marketsOf(reader.results)
    const cmp = (base: StrategyRuns, other: StrategyRuns, seeds: number[]) => {
      const p = pairedOn(base, other, seeds)
      const r = (s: StrategyRuns) =>
        fmtPct(pct(seeds.filter((i) => winsOf(s.results[i]!)).length, seeds.length))
      return `${seeds.length} | ${r(base)} | ${r(other)} | ${signed(p.change)} ${fmtMargin(p.margin)}`
    }
    const all = reader.results.map((_, i) => i)
    if (solo) {
      out.push(
        '',
        '## Hiring from revenue against on savings (target 29)',
        '',
        'The careful bot with its team rule against the same bot that never hires, on the same seeds, overall and by the secretly viable market; then the bot that makes its first hire on savings in week 3.',
        '',
        '| Seeds | Runs | validate_then_build_solo | validate_then_build | Difference |',
        '|---|---|---|---|---|',
        `| all | ${cmp(solo, reader, all)} |`,
        ...markets.map((m) => `| ${m} | ${cmp(solo, reader, bySegment(reader.results, m))} |`),
      )
      const savings = find(input, 'team:validate_then_build_savings_hire')
      if (savings)
        out.push(
          '',
          '| Seeds | Runs | validate_then_build_solo | validate_then_build_savings_hire | Difference |',
          '|---|---|---|---|---|',
          `| all | ${cmp(solo, savings, all)} |`,
        )
      const ex = find(input, EXPAND)
      const exSolo = find(input, EXPAND_SOLO)
      if (ex && exSolo)
        out.push(
          '',
          'Situation (b): opening a second market once the first runs dry in year 2, with the team rule serving it against the founder alone, on the same seeds.',
          '',
          '| Seeds | Runs | validate_then_build_expand_solo | validate_then_build_expand | Difference |',
          '|---|---|---|---|---|',
          `| all | ${cmp(exSolo, ex, all)} |`,
          ...markets.map((m) => `| ${m} | ${cmp(exSolo, ex, bySegment(reader.results, m))} |`),
          `| against validate_then_build_solo | ${cmp(solo, exSolo, all)} |`,
        )
      const fc = find(input, FOUNDER_CHASES)
      if (fc)
        out.push(
          '',
          'Who chases late invoices once someone is on the team: the team (validate_then_build) against the founder (same seeds).',
          '',
          '| Seeds | Runs | validate_then_build_founder_chases | validate_then_build | Difference |',
          '|---|---|---|---|---|',
          `| all | ${cmp(fc, reader, all)} |`,
        )
    }
    const sits = (['burst', 'steady'] as const).flatMap((kind) =>
      (['freelancer', 'hire'] as const).flatMap((by) => {
        const r = find(input, `team:validate_then_build_${kind}_${by}`)
        return r ? [{ kind, by, r }] : []
      }),
    )
    if (solo && sits.length === 4) {
      const of = (kind: string, by: string) => sits.find((x) => x.kind === kind && x.by === by)!.r
      out.push(
        '',
        '## Freelancer or hire (target 20)',
        '',
        'The solo careful bot with one extra person in a fixed role: a developer for the burst of the build (from week 3 until the features its market asks for have shipped), or a salesperson for steady selling (from the week the business can carry a part time salesperson, to the end), as a 20 h freelancer or a part time hire. Same seeds; each row against the solo bot, then freelancer against hire.',
        '',
        '| Situation | Runs | Solo | Freelancer | Part time hire | Freelancer against solo | Hire against solo | Hire against freelancer | Used (freelancer, hire) |',
        '|---|---|---|---|---|---|---|---|---|',
        ...(['burst', 'steady'] as const).map((kind) => {
          const f = of(kind, 'freelancer')
          const h = of(kind, 'hire')
          const ix = all
          const w = (x: StrategyRuns) => fmtPct(pct(wins(x.results).length, x.results.length))
          const d = (a: StrategyRuns, b: StrategyRuns) => {
            const p = pairedOn(a, b, ix)
            return `${signed(p.change)} ${fmtMargin(p.margin)}`
          }
          const used = (x: StrategyRuns) =>
            fmtPct(
              pct(
                x.results.filter((r) => r.freelance !== null || r.hires.length > 0).length,
                x.results.length,
              ),
            )
          return `| ${kind === 'burst' ? 'burst: the build' : 'steady: selling'} | ${ix.length} | ${w(solo)} | ${w(f)} | ${w(h)} | ${d(solo, f)} | ${d(solo, h)} | ${d(f, h)} | ${used(f)}, ${used(h)} |`
        }),
      )
    }
    if (ff) {
      out.push(
        '',
        '## Freelancer before the first hire',
        '',
        'For information: the careful bot that rents a freelancer until its first hire against the careful bot that only hires, on the same seeds. The two play the same game until the first booking, so the split is by what the freelancer was rented for; seeds where it never rented are the same game.',
        '',
        '| Seeds | Runs | validate_then_build | validate_then_build_freelance_first | Difference |',
        '|---|---|---|---|---|',
        ...rentSituations(ff).map((s) => `| ${s.label} | ${cmp(reader, ff, s.seeds)} |`),
        ...markets.map(
          (m) => `| viable market ${m} | ${cmp(reader, ff, bySegment(reader.results, m))} |`,
        ),
      )
    }
  }

  // The second year's events: what reading and blind effort gain from them (C3 goal).
  const none = find(input, 'validate_then_build inbox:none')
  const effort = find(input, 'validate_then_build inbox:effort')
  const readNo2 = find(input, 'validate_then_build inbox:reader -year2')
  const effortNo2 = find(input, 'validate_then_build inbox:effort -year2')
  if (reader && none && effort && readNo2 && effortNo2) {
    const all = reader.results.map((_, i) => i)
    const d = (a: StrategyRuns, b: StrategyRuns) => {
      const p = pairedOn(a, b, all)
      return `${signed(p.change)} ${fmtMargin(p.margin)}`
    }
    out.push(
      '',
      "## The second year's events",
      '',
      `Reading and blind effort against leaving every message alone, with the second year's events answered as usual and left to their defaults (same ${all.length} seeds). What the events add is the difference between the two.`,
      '',
      '| Policy | Against none, with year 2 events | Against none, year 2 events left alone | Year 2 events add |',
      '|---|---|---|---|',
      `| reading | ${d(none, reader)} | ${d(none, readNo2)} | ${d(readNo2, reader)} |`,
      `| blind effort | ${d(none, effort)} | ${d(none, effortNo2)} | ${d(effortNo2, effort)} |`,
    )
  }

  if (reader) {
    const rs = reader.results
    const groups: [string, RunResult['at60']][] = [
      [`profitable in each of the two months to week ${STANDARD_WEEKS}`, 'profitable'],
      [`alive but not profitable at week ${STANDARD_WEEKS}`, 'alive'],
      [`over before week ${STANDARD_WEEKS}`, 'over'],
    ]
    out.push(
      '',
      '## Year 2 (target 28)',
      '',
      `The careful bot's runs (${rs.length}) by where they stood at the end of the 60 week game, and how they ended at week 104.`,
      '',
      '| At week 60 | Runs | Sustainable | Still searching | Bankrupt | Burnout |',
      '|---|---|---|---|---|---|',
      ...groups.map(([label, g]) => {
        const xs = rs.filter((r) => r.at60 === g)
        const e = (id: string) => fmtPct(pct(xs.filter((r) => r.ending === id).length, xs.length))
        return `| ${label} | ${xs.length} | ${e('sustainable')} | ${e('still_searching')} | ${e('bankrupt')} | ${e('burnout')} |`
      }),
    )
  }
  return out
}

/** The energy curve: the careful bot at each planned week, win and burnout rates (Part C2). */
export function energyRows(input: ReportInput): string[] {
  const runs = ENERGY_BUDGETS.flatMap((b) => {
    const s = (input.extras ?? []).find((x) => x.id === energyId(b))
    return s ? [{ b, s }] : []
  })
  if (runs.length === 0) return []
  return [
    '',
    '## Energy curve',
    '',
    `validate_then_build planning each number of hours a week, on the same ${runs[0]!.s.results.length} seeds (50 h is the reference). Burnout is the ending; "energy below 30" counts runs that went that low at some point.`,
    '',
    '| Planned hours | Win rate | Burnout | Bankrupt | Still searching | Energy below 30 | Median lowest energy | Median week of burnout |',
    '|---|---|---|---|---|---|---|---|',
    ...runs.map(({ b, s }) => {
      const rs = s.results
      const e = (id: string) => fmtPct(pct(rs.filter((r) => r.ending === id).length, rs.length))
      const winM = fmtMargin(rateMargin(wins(rs).length, rs.length))
      return `| ${b} h | ${e('sustainable')} ${winM} | ${e('burnout')} | ${e('bankrupt')} | ${e('still_searching')} | ${fmtPct(pct(rs.filter((r) => r.minEnergy < 30).length, rs.length))} | ${fmtNum(median(rs.map((r) => r.minEnergy)), 1)} | ${fmtNum(median(rs.filter((r) => r.ending === 'burnout').map((r) => r.weeks)))} |`
    }),
  ]
}
