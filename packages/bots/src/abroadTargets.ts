import { fmtMargin } from './margin'
import { pairedOn, winsOf, type StrategyRuns, type Target } from './report'

/**
 * Plan 4: the abroad scenarios' own targets, judged on `tourism_careful` and single-choice bots
 * on the same seeds: Rückenwind W1 to W5 (`docs/scenario-watersports.md` section 16).
 */
const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

/** Seeds where each of two bots won and the other did not. */
function aheadIn(a: StrategyRuns, b: StrategyRuns, seeds: number[]) {
  let aOnly = 0
  let bOnly = 0
  for (const i of seeds) {
    const x = winsOf(a.results[i]!)
    const y = winsOf(b.results[i]!)
    if (x && !y) aOnly++
    if (y && !x) bOnly++
  }
  return { aOnly, bOnly }
}

export function watersportsTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('tourism_wind_only')) return []
  const vs = (id: string) => {
    const o = s(id)
    return o ? pairedOn(careful, o, all) : null
  }
  const loses = (p: { change: number; margin: number } | null, by: number) =>
    p !== null && p.change - p.margin <= -by
  const wind = vs('tourism_wind_only')
  const calm = vs('tourism_calm_only')
  const always = vs('tourism_trips_always')
  const never = vs('tourism_trips_never')
  const noCourses = vs('tourism_no_courses')
  const efoil = vs('tourism_efoil_spring')
  const higher = s('tourism_tender_higher')
  const same = s('tourism_tender_same')
  const tender = higher && same ? pairedOn(higher, same, all) : null
  const ahead = higher && same ? aheadIn(higher, same, all) : null
  const year2 = careful.results.flatMap((r) => (r.tourism?.abroad ? [r.tourism.abroad] : []))
  const direct = year2.reduce((t, x) => t + x.returnedDirect2, 0)
  const platform = year2.reduce((t, x) => t + x.returnedPlatform2, 0)
  const v = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const m = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  return [
    {
      id: 'W1',
      text: 'Selling for every kind of day pays: the careful bot beats a bot that offers only wind products, and a bot that offers only calm products, by at least 3 points each',
      value: `wind only ${v(wind)}, calm only ${v(calm)}`,
      margin: `${m(wind)}, ${m(calm)}`,
      pass: loses(wind, 3) && loses(calm, 3),
    },
    {
      id: 'W2',
      text: 'Kite trips are a real decision: trips_always (run with one student) and trips_never each lose to the careful bot by at least 2 points',
      value: `always ${v(always)}, never ${v(never)}`,
      margin: `${m(always)}, ${m(never)}`,
      pass: loses(always, 2) && loses(never, 2),
    },
    {
      id: 'W3',
      text: "Courses pay over two seasons: a bot that sells hire and tours but no courses loses at least 3 points, and the careful bot's year 2 has more returning graduates through direct channels than through the platform",
      value: `no courses ${v(noCourses)}; year 2 returners direct ${direct}, platform ${platform}`,
      margin: m(noCourses),
      pass: loses(noCourses, 3) && direct > platform,
    },
    {
      id: 'W4',
      text: 'The tender is a decision: always bidding higher and always bidding as before are within 5 points of each other overall, and each is ahead in some runs',
      value: tender
        ? `higher against as before ${signed(-tender.change)}; higher alone wins ${ahead!.aOnly} seeds, as before alone ${ahead!.bOnly}`
        : '-',
      margin: m(tender),
      pass:
        !!tender &&
        Math.abs(tender.change) - tender.margin <= 5 &&
        ahead!.aOnly > 0 &&
        ahead!.bOnly > 0,
    },
    {
      id: 'W5',
      text: 'The eFoil fleet is a trap: buying it in the first spring loses at least 3 points against not buying it',
      value: v(efoil),
      margin: m(efoil),
      pass: loses(efoil, 3),
    },
  ]
}

const median = (xs: number[]) => {
  if (xs.length === 0) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2
}

/** Bankrupt or with the loan called: the runs owning went wrong in. */
const failed = (r: StrategyRuns['results'][number]) =>
  r.ending === 'bankrupt' || r.ending === 'bank_called'

/**
 * Three single-option bots on paired seeds: on the seeds where they do not all end alike, the
 * share each has the best result (a win where another lost; among equals, the most money net of
 * the boat).
 */
function bestOfThree(bots: StrategyRuns[], seeds: number[]) {
  const best = bots.map(() => 0)
  let differ = 0
  for (const i of seeds) {
    const rs = bots.map((b) => b.results[i]!)
    const w = rs.map((r) => winsOf(r))
    if (w.every((x) => x === w[0]) && rs.every((r) => r.ending === rs[0]!.ending)) continue
    differ++
    const score = rs.map((r, k) => (w[k] ? 1e15 : 0) + r.netWealthCents)
    best[score.indexOf(Math.max(...score))]!++
  }
  return { differ, shares: best.map((n) => (differ > 0 ? (100 * n) / differ : 0)) }
}

/** Plan 4: Tiefgang's targets D1 to D4 (`docs/scenario-dive.md` section 15). */
export function diveTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('tourism_always_buy')) return []
  return assetTargets('D', careful, s, all, {
    only: 'tourism_certified_only',
    ladder: 'tourism_no_ladder',
    options: ['tourism_always_buy', 'tourism_always_lease', 'tourism_always_share'],
  })
}

function assetTargets(
  prefix: 'D' | 'G',
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
  ids: { only?: string; ladder?: string; options: [string, string, string] },
): Target[] {
  const vs = (id: string | undefined) => {
    const o = id ? s(id) : undefined
    return o ? pairedOn(careful, o, all) : null
  }
  const loses = (p: { change: number; margin: number } | null, by: number) =>
    p !== null && p.change - p.margin <= -by
  const v = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const m = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const bots = ids.options.map((id) => s(id))
  const out: Target[] = []
  if (prefix === 'D') {
    const only = vs(ids.only)
    out.push({
      id: 'D1',
      text: 'The famous site is not the business: a bot that sells only to certified divers (wreck and shore dives, no try dives or entry courses) loses at least 3 points to the careful bot',
      value: v(only),
      margin: m(only),
      pass: loses(only, 3),
    })
  }
  if (bots.every(Boolean)) {
    const b = bots as StrategyRuns[]
    const three = bestOfThree(b, all)
    const names = ids.options.map((x) => x.replace('tourism_', ''))
    out.push({
      id: `${prefix}${prefix === 'D' ? 2 : 1}`,
      text: `No boat option is always right: on paired seeds, each of ${names.join(', ')} has the best result of the three in at least 15% of the seeds where they differ (money counted net of the boat: cash plus its resale value less the loan left)`,
      value: `${names.map((n, k) => `${n} ${three.shares[k]!.toFixed(1)}%`).join(', ')} of ${three.differ} seeds`,
      margin: '',
      pass: three.differ > 0 && three.shares.every((x) => x >= 15),
    })
    const failShare = (x: StrategyRuns) =>
      (100 * x.results.filter(failed).length) / Math.max(1, x.results.length)
    const gap = failShare(b[0]!) - failShare(b[2]!)
    const gapMargin =
      1.96 *
      Math.sqrt(
        (failShare(b[0]!) * (100 - failShare(b[0]!)) +
          failShare(b[2]!) * (100 - failShare(b[2]!))) /
          Math.max(1, b[0]!.results.length),
      )
    const cash = b.map((x) => median(x.results.filter(winsOf).map((r) => r.netWealthCents / 100)))
    const highest = cash[0] !== null && cash.every((c, k) => k === 0 || c === null || cash[0]! >= c)
    out.push({
      id: `${prefix}${prefix === 'D' ? 3 : 2}`,
      text: `Owning is risky: ${names[0]} ends bankrupt or with the loan called at least 10 points more often than ${names[2]}, and its median final money net of the boat (cash plus resale value less the loan left) among its wins is the highest of the three`,
      value: `failed ${failShare(b[0]!).toFixed(1)}% against ${failShare(b[2]!).toFixed(1)}% (gap ${signed(gap)}); median net in wins ${cash.map((c, k) => `${names[k]} ${c === null ? '-' : Math.round(c).toLocaleString('en-GB')}`).join(', ')} EUR`,
      margin: fmtMargin(gapMargin),
      pass: gap + gapMargin >= 10 && highest,
    })
  }
  if (prefix === 'D') {
    const ladder = vs(ids.ladder)
    out.push({
      id: 'D4',
      text: 'The ladder pays: a bot that sells try dives but no courses loses at least 3 points',
      value: v(ladder),
      margin: m(ladder),
      pass: loses(ladder, 3),
    })
  }
  return out
}

export { assetTargets }

/** Plan 4: Leinen los's targets G1 to G4 (`docs/scenario-gulet.md` section 16). */
export function guletTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('tourism_always_manage')) return []
  const out = assetTargets('G', careful, s, all, {
    options: ['tourism_gulet_buy', 'tourism_gulet_lease', 'tourism_always_manage'],
  })
  const vs = (id: string) => {
    const o = s(id)
    return o ? pairedOn(careful, o, all) : null
  }
  const loses = (p: { change: number; margin: number } | null, by: number) =>
    p !== null && p.change - p.margin <= -by
  const v = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const m = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const allPeak = vs('tourism_hold_all_peak')
  const never = vs('tourism_hold_never')
  out.push({
    id: 'G3',
    text: 'Holding weeks is a decision: a bot that holds every peak week for charters and a bot that never holds each lose to the careful bot by at least 2 points',
    value: `hold every peak week ${v(allPeak)}, never hold ${v(never)}`,
    margin: `${m(allPeak)}, ${m(never)}`,
    pass: loses(allPeak, 2) && loses(never, 2),
  })
  const always = s('tourism_sail_always')
  const six = s('tourism_sail_six')
  if (always && six) {
    const overall = pairedOn(always, six, all)
    const markets = [...new Set(careful.results.map((x) => x.viableSegment))].sort()
    const splits = markets.map((mk) => {
      const seeds = all.filter((i) => careful.results[i]!.viableSegment === mk)
      return { mk, p: pairedOn(always, six, seeds) }
    })
    out.push({
      id: 'G4',
      text: 'Sailing half-empty beats cancelling: always sailing beats a minimum of six cabins by at least 3 points (restated in tuning 1: a trap whose lesson the post-mortem shows, each cancelled week with what it gave up and what it saved)',
      value: `always sailing ahead by ${signed(-overall.change)} overall; ${splits.map((x) => `${x.mk} ${signed(-x.p.change)}`).join(', ')}`,
      margin: fmtMargin(overall.margin),
      pass: overall.change - overall.margin <= -3,
    })
  }
  return out
}
