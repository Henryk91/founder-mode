import { fmtMargin, rateMargin } from './margin'
import { isWin, pairedOn, type StrategyRuns, type Target } from './report'

const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

/** Each variant changes one policy on the same seeds as the careful player. */
export function escapeTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('leisure_one_room')) return []
  const pair = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const single = pair('leisure_one_room')
  const quarterly = pair('leisure_quarterly_rooms')
  const themes = pair('leisure_theme_blind')
  const daytime = pair('leisure_no_daytime')
  const vr = pair('leisure_vr_first_year')
  const value = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const margin = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const loses = (p: { change: number; margin: number } | null, n: number) =>
    p !== null && p.change - p.margin <= -n
  return [
    {
      id: 'X1',
      text: 'Products have a life: never building a second room loses at least 5 points, and building a new room every three months loses at least 3',
      value: `one room ${value(single)}; quarterly ${value(quarterly)}`,
      margin: `${margin(single)}; ${margin(quarterly)}`,
      pass: loses(single, 5) && loses(quarterly, 3),
    },
    {
      id: 'X2',
      text: 'Theme is a market choice: random themes lose at least 2 points to the careful bot',
      value: value(themes),
      margin: margin(themes),
      pass: loses(themes, 2),
    },
    {
      id: 'X3',
      text: 'Selling dead slots pays: never selling weekday daytime to companies or at a lower price loses at least 2 points',
      value: value(daytime),
      margin: margin(daytime),
      pass: loses(daytime, 2),
    },
    {
      id: 'X4',
      text: 'The VR room is a trap: building it in the first year loses at least 3 points',
      value: value(vr),
      margin: margin(vr),
      pass: loses(vr, 3),
    },
  ]
}

/** Venue comparisons use the same seeds; V3 counts runs with real late service. */
export function venueTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  const noisy = s('venue_no_insulation')
  if (!noisy) return []
  const pair = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const free = pair('venue_free_holds'),
    none = pair('venue_no_holds')
  const company = pair('venue_companies_only'),
    wedding = pair('venue_weddings_only')
  const roof = pair('venue_roof_first_year')
  const loses = (p: { change: number; margin: number } | null, n: number) =>
    p !== null && p.change - p.margin <= -n
  const value = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const margin = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const late = noisy.results.filter((r) => (r.tourism?.leisure?.venue?.lateEvents ?? 0) > 0)
  const restrictions = late.filter((r) => (r.tourism?.leisure?.venue?.restrictions ?? 0) > 0).length
  const rate = late.length ? (100 * restrictions) / late.length : 0
  const rateError = rateMargin(restrictions, late.length)
  const nets = careful.results.flatMap((r) =>
    r.tourism?.leisure?.venue ? [r.tourism.leisure.venue.netCents / 100] : [],
  )
  const mean = nets.length ? nets.reduce((a, b) => a + b, 0) / nets.length : 0
  const error =
    nets.length > 1
      ? 1.96 *
        Math.sqrt(nets.reduce((a, b) => a + (b - mean) ** 2, 0) / (nets.length * (nets.length - 1)))
      : 0
  return [
    {
      id: 'V1',
      text: 'Holds are a decision: granting every hold freely and granting none each lose at least 2 points to careful',
      value: `free ${value(free)}; none ${value(none)}`,
      margin: `${margin(free)}; ${margin(none)}`,
      pass: loses(free, 2) && loses(none, 2),
    },
    {
      id: 'V2',
      text: 'The calendar has two businesses: careful beats companies-only and weddings-only by at least 3 points each',
      value: `companies ${value(company)}; weddings ${value(wedding)}`,
      margin: `${margin(company)}; ${margin(wedding)}`,
      pass: loses(company, 3) && loses(wedding, 3),
    },
    {
      id: 'V3',
      text: 'Late events without insulation restrict at least 20% of runs that hold them; careful late events pay more than their attributable costs',
      value: `restricted ${rate.toFixed(1)}% (${restrictions}/${late.length}); careful mean net ${mean.toFixed(0)} EUR/run`,
      margin: `${fmtMargin(rateError)}; ${fmtMargin(error, 0)} EUR`,
      pass: late.length > 0 && nets.length > 0 && rate + rateError >= 20 && mean + error > 0,
    },
    {
      id: 'V4',
      text: 'The roof terrace is a trap: building it in the first year loses at least 3 points',
      value: value(roof),
      margin: margin(roof),
      pass: loses(roof, 3),
    },
  ]
}

/** Fitness comparisons use paid-service observations and paired outcomes. */
export function fitnessTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('fitness_never_match')) return []
  const pair = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const allSlots = pair('fitness_aggregator_all'),
    none = pair('fitness_aggregator_none')
  const january = pair('fitness_january_peak'),
    neverMatch = pair('fitness_never_match')
  const recovery = pair('fitness_recovery_early')
  const buy = s('fitness_reformer_always'),
    noBuy = s('fitness_reformer_never')
  const reformer = buy && noBuy ? pairedOn(noBuy, buy, all) : null
  const buyOnly =
    buy && noBuy ? all.filter((i) => isWin(buy.results[i]!) && !isWin(noBuy.results[i]!)).length : 0
  const noBuyOnly =
    buy && noBuy ? all.filter((i) => !isWin(buy.results[i]!) && isWin(noBuy.results[i]!)).length : 0
  const departures = s('fitness_never_match')!.results.filter(
    (r) => (r.tourism?.leisure?.fitness?.followersStopped ?? 0) > 0,
  )
  const stopped = departures.reduce(
    (sum, r) => sum + r.tourism!.leisure!.fitness!.followersStopped,
    0,
  )
  const value = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const margin = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const loses = (p: { change: number; margin: number } | null, n: number) =>
    p !== null && p.change - p.margin <= -n
  return [
    {
      id: 'F1',
      text: 'Quiet-slot aggregator access beats all slots and no aggregator by at least 2 points each',
      value: `all ${value(allSlots)}; none ${value(none)}`,
      margin: `${margin(allSlots)}; ${margin(none)}`,
      pass: loses(allSlots, 2) && loses(none, 2),
    },
    {
      id: 'F2',
      text: 'Keeping the January waitlist class peak loses at least 2 points',
      value: value(january),
      margin: margin(january),
      pass: loses(january, 2),
    },
    {
      id: 'F3',
      text: 'Buying reformers and keeping the regular studio are within 5 points, with wins unique to each policy',
      value: `${value(reformer)}; buy-only ${buyOnly}, no-buy-only ${noBuyOnly}, ties ${all.length - buyOnly - noBuyOnly}`,
      margin: margin(reformer),
      pass:
        !!reformer &&
        Math.abs(reformer.change) - reformer.margin <= 5 &&
        buyOnly > 0 &&
        noBuyOnly > 0,
    },
    {
      id: 'F4',
      text: 'Instructor departure visibly stops followers; never matching loses at least 2 points',
      value: `${value(neverMatch)}; ${stopped} followers stopped in ${departures.length} runs`,
      margin: margin(neverMatch),
      pass: loses(neverMatch, 2) && stopped > 0,
    },
    {
      id: 'F5',
      text: 'Building the recovery room in year one loses at least 3 points',
      value: value(recovery),
      margin: margin(recovery),
      pass: loses(recovery, 3),
    },
  ]
}

/** Climbing compares binary endings on identical seeds;all-win/all-loss ties are explicit. */
export function climbingTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  const boulder = s('climbing_boulder_first'),
    rope = s('climbing_rope_first'),
    both = s('climbing_both_first')
  if (!boulder || !rope || !both) return []
  const first = [boulder, rope, both]
  const differing = all.filter((i) => new Set(first.map((x) => isWin(x.results[i]!))).size > 1)
  const shares = first.map((x) => {
    const wins = differing.filter((i) => isWin(x.results[i]!)).length
    const sole = differing.filter(
      (i) => isWin(x.results[i]!) && first.filter((y) => isWin(y.results[i]!)).length === 1,
    ).length
    return {
      id: x.id.replace('climbing_', ''),
      wins,
      sole,
      rate: differing.length ? (100 * wins) / differing.length : 0,
      margin: rateMargin(wins, differing.length),
    }
  })
  const pair = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const half = pair('climbing_setting_half'),
    double = pair('climbing_setting_double')
  const allSlots = pair('climbing_aggregator_all'),
    none = pair('climbing_aggregator_none')
  const speed = pair('climbing_speed_early')
  const noCourses = s('climbing_rope_no_courses')
  const ropeSeeds = all.filter((i) => rope.results[i]!.tourism?.leisure?.climbing?.ropeOpened)
  const courses = noCourses && ropeSeeds.length ? pairedOn(rope, noCourses, ropeSeeds) : null
  const loses = (p: { change: number; margin: number } | null, n: number) =>
    p !== null && p.change - p.margin <= -n
  const value = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const margin = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  return [
    {
      id: 'K1',
      text: 'Each first-wall policy wins or jointly wins on at least15%of paired seeds with different win/loss outcomes',
      value:
        shares
          .map((x) => `${x.id} ${x.rate.toFixed(1)}% (${x.sole} sole,${x.wins - x.sole} joint)`)
          .join('; ') +
        `; differing ${differing.length},all-outcome ties ${all.length - differing.length}`,
      margin: shares.map((x) => fmtMargin(x.margin)).join('; '),
      pass: differing.length > 0 && shares.every((x) => x.rate + x.margin >= 15),
    },
    {
      id: 'K2',
      text: 'Half the careful route-setting hours loses at least3points;twice the hours loses at least2',
      value: `half ${value(half)}; double ${value(double)}`,
      margin: `${margin(half)}; ${margin(double)}`,
      pass: loses(half, 3) && loses(double, 2),
    },
    {
      id: 'K3',
      text: 'Quiet-slot aggregator access beats all slots and no aggregator by at least2points each',
      value: `all ${value(allSlots)}; none ${value(none)}`,
      margin: `${margin(allSlots)}; ${margin(none)}`,
      pass: loses(allSlots, 2) && loses(none, 2),
    },
    {
      id: 'K4',
      text: 'On seeds where rope-first opens rope walls,omitting belay and lead courses loses at least3points',
      value: `${value(courses)}; rope-opened ${ropeSeeds.length},no-rope baseline ${all.length - ropeSeeds.length}`,
      margin: margin(courses),
      pass: loses(courses, 3),
    },
    {
      id: 'K5',
      text: 'Building the speed wall in year one loses at least3points',
      value: value(speed),
      margin: margin(speed),
      pass: loses(speed, 3),
    },
  ]
}
