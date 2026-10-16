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
