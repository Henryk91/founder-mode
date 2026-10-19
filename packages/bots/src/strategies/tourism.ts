import { answerOffers, officeOffers, stageToFinance, type OfficeRule } from '../office'
import type { Scenario } from '@founder-mode/content'
import {
  viewConditionsHold,
  type BookingsPlan,
  type PlayerView,
  type WeekPlan,
  type WeekReport,
} from '@founder-mode/engine'
import { budgetHints } from '../pricing'
import { PlanBuilder, segmentNotes, type Player, type Strategy } from '../strategy'
import { TOURISM_READER } from './tourismReader'
import {
  leisureFirstTheme,
  leisureWanted,
  leisureBuildOrder,
  planLeisure,
  type LeisureRule,
} from './leisure'
import { answerInbox, fromConditions, rankMarkets, readInbox } from './validateThenBuild'

/**
 * Bots for the bookings model (tourism, step 4). They see only the view and the scenario's
 * stated rules (products, roles, channel strengths, the platform's commission), never demand,
 * season curves or the true weather.
 */
export type TourismRule = {
  leisure?: LeisureRule
  /** Interviews, a test listing and a pilot before choosing; false builds without them. */
  tests: boolean
  /** Builds every product, the temptation included (the no-tests bot). */
  buildAll: boolean
  /** Channels: the careful mix, or the platform only. */
  channels: 'mix' | 'platform'
  /** Roster: to bookings with a margin, for full capacity, or short of bookings. */
  roster: 'careful' | 'over' | 'under'
  /** Prices from interview hints per season, or the starting price all year. */
  pricing: 'hints' | 'fixed'
  /** Fixes snags and keeps a margin on the roster; false ignores both (reviews blind). */
  reviews: boolean
  /** Cancellation policy: chosen by what the bot sees, or always one. */
  policy: 'adaptive' | 'flexible' | 'strict'
  /** Hours planned a week (65 for the overworker). */
  hours?: number
  /** Inbox policy: read it (default), leave every message to its default, or blind effort. */
  inbox?: 'reader' | 'none' | 'effort'
  /**
   * The bank loan, where a scenario offers one (step 6): borrow what the plan needs (default),
   * the most the bank lends, the most with no repayment-free start (reckless), or nothing.
   */
  loan?: 'careful' | 'max' | 'reckless' | 'none'
  /** A second loan for the own fit-out once guests cover the costs (loan target L1). */
  refitLoan?: boolean
  /**
   * Careful play without what the bots know about a scenario beyond the screen (tourism fixes,
   * item 17): no per-scenario reader rules (messages are answered by their declared conditions
   * only), no bridge months or lead times for the loan, and no channel table (every channel is
   * tried for the groups it targets).
   */
  naive?: boolean
  /** The event table (tourism fixes, item 18): always this answer to this event. */
  forced?: { eventId: string; choiceId: string }
  /**
   * Plan 2 step 1b, contracts: the careful mix (seasonal in season, permanent or part time for
   * steady work), shifts only, or always one kind where the role offers it.
   */
  contracts?: 'careful' | 'none' | 'permanent' | 'seasonal' | 'part_time'
  /** Plan 3: office stage offers (`office.ts`). Missing: careful. */
  office?: OfficeRule
  /**
   * Plan 4, day trips: careful runs a trip for a group of two or more, `always` for one guest,
   * `never` closes the trips. Missing: careful.
   */
  trips?: 'careful' | 'always' | 'never'
  /**
   * Plan 4, product mix extremes: only products for wind (good or strong), only calm-water
   * products (calm or light wind), or no courses. Missing: any product.
   */
  mix?: 'wind' | 'calm' | 'no_courses' | 'no_ladder'
  /** Plan 4: builds the temptation (the eFoil fleet) in the first spring, with the bank's help. */
  temptationEarly?: string
  /**
   * Plan 4, assets: careful starts by sharing and leases once a season shows the shared units
   * full; the others always take one option (buy: the purchase product, with the bank).
   */
  asset?: 'careful' | 'buy' | 'lease' | 'share'
  /** Plan 4: sells only to this segment (the certified-only bot). */
  segment?: string
  /**
   * Plan 4, gulet weeks: careful holds the peak weeks for charters while charter requests are
   * coming in; `all_peak` holds every peak week; `never` holds none. Missing: careful.
   */
  hold?: 'careful' | 'all_peak' | 'never'
  /**
   * Plan 4: the minimum to sail, in cabins; missing: careful (any number on a managed boat,
   * four on a leased or owned one, guests moved).
   */
  minSail?: number
}

/** Hours this week's guests take before anything is planned (plan 2 step 3). */
const bv0 = (view: PlayerView) => view.bookings?.hostingHours ?? 0

export const CAREFUL_TOURISM: TourismRule = {
  tests: true,
  buildAll: false,
  channels: 'mix',
  roster: 'careful',
  pricing: 'hints',
  reviews: true,
  policy: 'adaptive',
}

const FIRST_WEEK_INTERVIEWS = 6
const MORE_INTERVIEWS = 4
/** Shifts planned beyond what this week's bookings need, as a share. */
const ROSTER_MARGIN = 0.1
/** The understaffing bot covers this share of what is booked. */
const UNDER_SHARE = 0.6
/** Food prepared beyond the busiest recent week's guests (plan 2 step 1c). */
const PREP_MARGIN = 0.05
const FIRST_PREP_SHARE = 0.4
/** Founder shifts a week at most, so selling and building still get some hours. */
const FOUNDER_SHIFTS = 4
/** Hours the founder keeps free beside their own shifts. */
const FOUNDER_KEEP_HOURS = 10
const OUTREACH_HOURS = 6
/** A channel counts as reaching a segment from this stated strength. */
const CHANNEL_USEFUL = 0.3
/** Price from the budget hints: peak and off season, as shares of their mean. */
const HINT_PEAK = 1.0
const HINT_OFF = 0.85
/**
 * Tuning 1 (T7): where seasonal pricing failed, the off season is priced at the hints' level
 * too. Below what guests would pay a discount wins almost nobody (the price curve is flat there),
 * so the 0.85 only gave money away: the careful bot gained about 5 points in Hinterhof and
 * Seeblick without it (1,000 seeds), and raising the peak price when full never helped.
 * Gratwanderung and Tiefgang keep 0.85 (their T7 passes); so do Rückenwind, where flat prices
 * gained nothing (its starting prices already sit at the market's level), and Leinen los, where
 * the careful bot then won 48.2% (decisions, tuning 1 step 4).
 */
const HINT_OFF_AT_HINTS = new Set(['hinterhof', 'seeblick', 'rueckenwind'])
const MIN_HINTS = 3
/** The most a price moves at once from the hints. */
const MAX_PRICE_STEP = 0.3
/** Strict policy once this share of last month's guests cancelled and the calendar is busy. */
const STRICT_CANCEL_SHARE = 0.12
const BUSY_SHARE = 0.7
const BUG_LIMIT = 2
/** Plan 4: a shared asset counts as full when its peak weeks used this share of its units. */
const SEATS_FULL = 0.5
/** Plan 4: a segment whose smallest booking is this many units books the whole boat. */
const WHOLE_BOAT = 12
/**
 * Tuning 1: the careful bot's boat choice from expected weeks. Before a season shows how many
 * weeks fill, it expects a whole-boat market to sail this share of the season's weeks, and a
 * cabin market this share with this many of the sixteen places sold (a little under what leased
 * boats sailed in their first season with requests ahead, 400 seeds: 80 to 90% of the weeks at
 * about 10,000 EUR a week).
 */
const WHOLE_FILL = 0.75
const CABIN_FILL = 0.85
const CABIN_PLACES = 14
/** A product costing this share of its price or more is not worth adding (step 6). */
const THIN_MARGIN_SHARE = 0.5
/** Months of fixed costs a careful borrower adds to what the plan needs, and keeps in reserve. */
const LOAN_BUFFER_MONTHS = 4
const RESERVE_MONTHS = 1
/** Rooms a refreshed guesthouse has renovated, as the scenario's stage says (plan 2 step 2). */
const REFRESH_ROOMS = 8
/** A further product is built when its one-off cost is at most this share of the money. */
const EXTRA_SHARE = 0.2
/**
 * Plan 2 step 1a: a small trial (a pilot day, a pop-up dinner) counts like a pre-sale against a
 * bar of one in eight responding; a large one (a listing) by its standing against the other
 * segments that saw it.
 */
const TRIAL_WEIGHT = 3
const TRIAL_BAR = 0.12
const TRIAL_LARGE = 50
const LISTING_WEIGHT = 0.1
/** Plan 2 step 1b: weeks of steady shifts before a contract, and of idle contract shifts before notice. */
const STEADY_WEEKS = 6
const IDLE_WEEKS = 6
/** Plan 2 step 1d: rooms under works only in weeks this little booked; a minimum stay this busy. */
const WORKS_BUSY = 0.5
const MIN_STAY_BUSY = 0.8

export function tourismPlayer(scenario: Scenario, rule: TourismRule, seed = ''): Player {
  const cfg = scenario.bookings!
  /** Plan 3: the scenario's office stage offers. */
  const stageOffers = officeOffers(scenario)
  let target: string | null = null
  let cancelledRecent: number[] = []
  let servedRecent: number[] = []
  /** Plan 2: paid and contract shifts used per role in recent weeks, newest last. */
  let shiftsUsed: Record<string, number>[] = []

  /** Plan 4: cash covers a lease's deposit, its first month and three months of costs. */
  const leaseAffordable = (view: PlayerView) => {
    const t = view.bookings?.assets[0]?.terms.lease
    if (!t) return false
    const monthly = (t.seasonCents * (1 - t.upfrontShare)) / t.months.length
    return (
      view.company.cashCents >=
      t.seasonCents * t.upfrontShare + monthly + 3 * view.company.monthlyFixedCostsCents
    )
  }

  /**
   * Tuning 1: weeks the boat sailed in the last season that ended (null before one has), from
   * its weeks used at the end of each season's months.
   */
  let lastSeason: number | null = null
  let usedAtSeasonEnd = 0
  let lastMonth = 0
  const trackSeason = (view: PlayerView) => {
    const bv = view.bookings
    const a = bv?.assets[0]
    const months = a?.terms.lease?.months
    if (!bv || !a || !months) return
    if (months.includes(lastMonth) && !months.includes(bv.month) && a.weeksUsed > usedAtSeasonEnd) {
      lastSeason = a.weeksUsed - usedAtSeasonEnd
      usedAtSeasonEnd = a.weeksUsed
    }
    lastMonth = bv.month
  }

  /** Plan 4: shared units used against those offered over the last season's peak weeks. */
  const assetUse: { used: number; offered: number }[] = []
  const seatsFull = () => {
    const recent = assetUse.slice(-26)
    const offered = recent.reduce((t, x) => t + x.offered, 0)
    const used = recent.reduce((t, x) => t + x.used, 0)
    // Peak weeks the owner kept (nothing offered) with guests turned away count as full.
    // A gulet's peak weeks the owner kept (nothing offered) with guests turned away count as
    // full; elsewhere only a share of the units offered does (Tiefgang as in step 3).
    if (cfg.hold) return used > 0 && (offered === 0 || used / offered >= SEATS_FULL)
    return offered > 0 && used / offered >= SEATS_FULL
  }

  /** Markets by the evidence on screen: interviews, then trials and vouchers (plan 2). */
  const rank = (view: PlayerView) =>
    rankMarkets(scenario, view)
      .map((r) => ({ ...r, score: r.score + trialScore(view, r.id) }))
      .sort((a, b) => b.score - a.score)

  // Plan 4: a product for a level sells only to graduates, unless the segment holds the level.
  const productsFor = (seg: string) =>
    Object.entries(cfg.products)
      .filter(
        ([, p]) =>
          p.serves.includes(seg) &&
          (!p.needsLevel || (cfg.segments[seg]?.levels ?? []).includes(p.needsLevel)),
      )
      .map(([id]) => id)

  /** Plan 4: a product the rule's mix allows (support products always). */
  const allowed = (id: string): boolean => {
    const p = cfg.products[id]
    if (!p || !rule.mix) return true
    if (rule.mix === 'no_courses') return !p.course
    // No ladder: no course whose level another product needs (a try dive is still sold).
    if (rule.mix === 'no_ladder')
      return !p.course || !Object.values(cfg.products).some((q) => q.needsLevel === p.course!.level)
    if (p.capacity === 0) return true
    const calm = !!p.runsIn && p.runsIn.every((x) => x === 'calm' || x === 'light')
    return rule.mix === 'calm' ? calm : !calm
  }

  /** A channel reaches a segment: from the scenario's table, or always for the naive bot. */
  const reaches = (seg: string, channel: 'platform' | 'website' | 'partnership' | 'outreach') =>
    rule.naive ? true : (cfg.segments[seg]?.response[channel] ?? 0) >= CHANNEL_USEFUL

  /** The features a segment asks for in interviews, then a product that sells to it. */
  const wanted = (view: PlayerView, seg: string): string[] => {
    const mentions = segmentNotes(scenario, view, seg).mentions.map(([f]) => f)
    const quickest = (ids: string[]) =>
      [...ids].sort(
        (a, b) =>
          (scenario.features.find((f) => f.id === a)?.buildHours ?? 0) -
          (scenario.features.find((f) => f.id === b)?.buildHours ?? 0),
      )[0]
    // From step 6 (scenarios with a bank loan): a product the interviewees asked for first. The
    // earlier scenarios keep the quickest product, so their protected reports stay the same.
    const asked = productsFor(seg).filter((id) => mentions.includes(id) && allowed(id))
    const base =
      scenario.loan && asked.length > 0
        ? quickest(asked)
        : quickest(productsFor(seg).filter(allowed))
    const requested = [...new Set([...(base ? [base] : []), ...mentions.filter(allowed)])]
    return cfg.leisure ? leisureWanted(scenario, view, rule, requested, seg, seed) : requested
  }

  /**
   * From step 6 (scenarios with a bank loan): guests who arrive during the week without booking
   * ahead, seen in the last four weeks, and this week's booked units when the roster was set.
   */
  let arrivals: number[] = []
  let bookedAtPlan = 0
  /** Plan 2: walk-ins per product in recent weeks (who came less what was booked at planning). */
  const walkInsBy: Record<string, number[]> = {}
  let bookedAtPlanBy: Record<string, number> = {}

  /**
   * The refit offered by an inbox event (loan target L1): the office stage it moves to, what it
   * costs, and the monthly revenue at which it arrives, as the scenario states them.
   */
  const refitOffer = (() => {
    for (const e of scenario.events) {
      for (const c of e.choices) {
        const move = c.effects.find((fx) => fx.type === 'moveOffice')
        const pay = c.effects.find((fx) => fx.type === 'cash' && fx.amountCents < 0)
        if (move?.type === 'moveOffice' && pay?.type === 'cash') {
          const revenue = e.when.find((w) => w.path === 'monthlyRevenueEur')?.value ?? 0
          return { stage: move.stage, cents: -pay.amountCents, revenueCents: revenue * 100 }
        }
      }
    }
    return null
  })()

  /** Asked for last time and refused: the next request asks for a fifth less. */
  let refusedAt: number | null = null

  /**
   * The loan part of the week (scenarios with a bank loan only): write the plan, apply for what
   * the rule asks, take the offer. Returns the hours it used.
   */
  function planLoan(view: PlayerView, b: PlanBuilder, wanted: string[]): void {
    const l = view.loan
    const mode = rule.loan ?? 'careful'
    if (!l || mode === 'none') return
    const p = {
      planHours: 0,
      apply: null,
      accept: false,
      decline: false,
      repay: null,
    } as NonNullable<typeof b.plan.loan>
    if (l.offer) {
      if (cfg.leisure) refusedAt = null
      p.accept = true
      b.plan.loan = p
      return
    }
    if (l.application || l.accepted) return
    const runningLoans = l.loans.filter((x) => x.status === 'running')
    const monthly = view.company.monthlyFixedCostsCents
    const cash = view.company.cashCents
    // What the plan needs: products not yet shipped, and a buffer of fixed costs.
    const unshipped = wanted.filter(
      (id) =>
        !view.product.features.find((f) => f.id === id)?.shipped &&
        !view.bookings?.leisure?.builds.some((b) => b.productId === id && b.started) &&
        !(cfg.leisure && view.loan?.plan?.bought.includes(id)),
    )
    // Rooms renovated one at a time count at their price per room (plan 2 step 1d).
    const reno = cfg.renovation
    const rooms =
      reno && wanted.includes(reno.feature) && l
        ? Math.max(
            0,
            reno.mustHaveRooms -
              (view.bookings!.renovation?.renovated ?? 0) -
              (view.bookings!.renovation?.inProgress.length ?? 0),
          ) * reno.centsPerRoom
        : 0
    const oneOff = unshipped.reduce((t, id) => t + (cfg.products[id]?.oneOffCents ?? 0), 0) + rooms
    // Guests who book months ahead (weddings) need a longer bridge: their lead time in months.
    const lead = target && !rule.naive ? (cfg.segments[target]?.leadWeeks.max ?? 0) : 0
    const bufferMonths = Math.max(LOAN_BUFFER_MONTHS, Math.ceil(lead / 4), l.bridgeMonthsHint ?? 0)
    const need = oneOff + bufferMonths * monthly - cash
    const refit =
      rule.refitLoan &&
      runningLoans.length === 1 &&
      refitOffer !== null &&
      view.company.officeStage.id !== refitOffer.stage &&
      view.monthlyRevenueCents >= refitOffer.revenueCents &&
      cash < refitOffer.cents + RESERVE_MONTHS * monthly
    const first =
      (runningLoans.length === 0 ||
        (cfg.leisure &&
          rule.leisure?.laterLoans !== false &&
          runningLoans.length < (scenario.loan?.maxLoans ?? 0) &&
          oneOff > 0)) &&
      (need > 0 || mode !== 'careful')
    // Plan 3: an office stage on offer that the money in hand cannot carry goes to the bank.
    const stageLoan =
      !first && !refit && l.plan
        ? stageToFinance(view, stageOffers, rule.office ?? 'careful')
        : null
    if (!first && !refit && !stageLoan) return
    const left = Math.max(0, l.planNeeded - l.planHours)
    if (left > 0) {
      p.planHours = Math.min(left, Math.max(0, b.free - 10))
      b.free -= p.planHours
      if (l.planHours + p.planHours < l.planNeeded) {
        b.plan.loan = p
        return
      }
    }
    if (l.canApplyFrom !== null && view.week < l.canApplyFrom) {
      b.plan.loan = p
      return
    }
    const step = l.stepCents
    const roundUp = (c: number) => Math.ceil(c / step) * step
    // The most the bank's stated own-money rule allows on top of what is already borrowed.
    const borrowed = runningLoans.reduce((t, x) => t + x.principalCents, 0)
    const allowed =
      Math.floor(((l.ownMoneyCents * (1 - l.ownShare)) / l.ownShare - borrowed) / step) * step
    const term = mode === 'reckless' ? l.termMonths[0]! : (l.termMonths[1] ?? l.termMonths[0]!)
    const grace = mode === 'reckless' ? l.graceMonths[0]! : (l.graceMonths[1] ?? l.graceMonths[0]!)
    if (l.plan) {
      // Plan 2 step 2: a plan of listed items and working capital up to the bank's months.
      const plan = l.plan
      const greedy = mode === 'max' || mode === 'reckless'
      const roomsNeeded = rooms / Math.max(1, reno?.centsPerRoom ?? 1)
      const stageCents = stageLoan ? (plan.stages.find((x) => x.id === stageLoan)?.cents ?? 0) : 0
      let items = stageLoan
        ? []
        : refit
          ? plan.items.filter((x) => cfg.products[x.id]?.stage === refitOffer!.stage)
          : greedy
            ? // Everything the bank lists, temptations included; a refit is a choice of its own (L1).
              plan.items
                .filter((x) => !cfg.products[x.id]?.stage)
                // If the own-money cap forces something out, a deliberately reckless plan keeps
                // the products nobody needs. Removing the temptation first made the max-loan and
                // no-tests bots quietly prudent (plan 2 targets T2 and L2).
                .sort((a, z) => Number(isTemptation(z.id)) - Number(isTemptation(a.id)))
            : plan.items.filter((x) => unshipped.includes(x.id))
      const renovated =
        (view.bookings?.renovation?.renovated ?? 0) +
        (view.bookings?.renovation?.inProgress.length ?? 0)
      // A refit where no product makes it: more rooms, up to the refreshed house's eight.
      const refitRooms = refit && items.length === 0 && plan.rooms
      let roomCount = stageLoan
        ? 0
        : refitRooms
          ? Math.max(0, Math.min(plan.rooms!.left, REFRESH_ROOMS - renovated))
          : refit || !plan.rooms
            ? 0
            : greedy
              ? plan.rooms.left
              : Math.min(plan.rooms.left, roomsNeeded)
      if (refit && items.length === 0 && roomCount === 0) return
      const itemsCents = () =>
        items.reduce((t, x) => t + x.cents, 0) +
        roomCount * (plan.rooms?.centsPerRoom ?? 0) +
        stageCents
      const wcNeed =
        refit || stageLoan
          ? 0
          : greedy
            ? plan.workingCapitalMaxCents
            : Math.max(0, need - itemsCents())
      let wc = Math.floor(Math.min(plan.workingCapitalMaxCents, roundUp(wcNeed)) / step) * step
      // Within the own-money rule and below the last refused amount: less working capital
      // first, then the items listed last.
      // After a refusal, a fifth less each time.
      const cap = Math.min(
        l.maxCents,
        allowed,
        refusedAt === null ? Infinity : Math.floor((refusedAt * 0.8) / step) * step,
      )
      while (itemsCents() + wc > cap && wc > 0) wc -= step
      while (itemsCents() + wc > cap && (items.length > 0 || roomCount > 0)) {
        if (roomCount > 0 && greedy) roomCount--
        else if (items.length > 0) items = items.slice(0, -1)
        else roomCount--
      }
      let amount = itemsCents() + wc
      if (amount < l.minCents) {
        wc += roundUp(l.minCents - amount)
        amount = itemsCents() + wc
        if (wc > plan.workingCapitalMaxCents || amount > cap) return
      }
      if (b.free < l.meetingHours) {
        b.plan.loan = p
        return
      }
      b.free -= l.meetingHours
      refusedAt = amount
      p.apply = {
        amountCents: amount,
        termMonths: term,
        graceMonths: grace,
        items: items.map((x) => x.id),
        rooms: roomCount,
        workingCapitalCents: wc,
        ...(stageLoan ? { stage: stageLoan } : {}),
      }
      b.plan.loan = p
      return
    }
    let amount = refit
      ? roundUp(refitOffer!.cents)
      : mode === 'careful'
        ? roundUp(need)
        : Math.min(l.maxCents, allowed)
    // After a refusal, a fifth less each time.
    if (refusedAt !== null) amount = Math.min(amount, roundUp(refusedAt * 0.8))
    amount = Math.min(l.maxCents, Math.max(l.minCents, amount))
    if (b.free < l.meetingHours) {
      b.plan.loan = p
      return
    }
    b.free -= l.meetingHours
    refusedAt = amount
    p.apply = { amountCents: amount, termMonths: term, graceMonths: grace }
    b.plan.loan = p
  }

  /** A loan-plan item no segment needs, directly or as a dependency, and which is not a refit. */
  function isTemptation(id: string): boolean {
    const required = new Set(scenario.segments.flatMap((s) => s.mustHave))
    for (const feature of scenario.features) {
      if (required.has(feature.id)) {
        const dependency = cfg.products[feature.id]?.requires
        if (dependency) required.add(dependency)
      }
    }
    return !required.has(id) && !cfg.products[id]?.stage
  }

  /** Products and what they require, the required first (a restaurant's fit-out). */
  const withRequired = (ids: string[]) => {
    const out: string[] = []
    for (const id of ids) {
      const req = cfg.products[id]?.requires
      if (req && !out.includes(req)) out.push(req)
      if (!out.includes(id)) out.push(id)
    }
    return out
  }

  /** What a segment's trials and vouchers say, next to its interviews (plan 2 step 1a). */
  function trialScore(view: PlayerView, seg: string): number {
    const mine = view.segments.find((x) => x.id === seg)
    let score = 0
    // Small trials: like a pre-sale, against a bar.
    const small = (mine?.trials ?? []).filter((t) => t.people <= TRIAL_LARGE)
    const people =
      small.reduce((t, x) => t + x.people, 0) +
      (mine?.vouchers ?? []).reduce((t, x) => t + x.prospects, 0)
    const yes =
      small.reduce((t, x) => t + x.responses, 0) +
      (mine?.vouchers ?? []).reduce((t, x) => t + x.sold, 0)
    if (people > 0) score += TRIAL_WEIGHT * (yes / people - TRIAL_BAR)
    // Large trials (a listing): this segment's rate against everyone who saw the same trial.
    for (const id of new Set(
      (mine?.trials ?? []).filter((t) => t.people > TRIAL_LARGE).map((t) => t.trialId),
    )) {
      const all = view.segments.flatMap((x) => (x.trials ?? []).filter((t) => t.trialId === id))
      const n = all.reduce((t, x) => t + x.people, 0)
      const pooled = all.reduce((t, x) => t + x.responses, 0) / Math.max(1, n)
      const own = (mine?.trials ?? []).filter((t) => t.trialId === id)
      const on = own.reduce((t, x) => t + x.people, 0)
      const se = Math.sqrt((pooled * (1 - pooled)) / Math.max(1, on))
      if (se > 0)
        score += (LISTING_WEIGHT * (own.reduce((t, x) => t + x.responses, 0) / on - pooled)) / se
    }
    return score
  }

  /**
   * Week 2's tests where the scenario has its own (plan 2 step 1a): every trial that reaches the
   * segment the interviews favour (the one it picks, or one whose main audience it is), and a
   * batch of vouchers where that segment buys them.
   */
  function planTrials(view: PlayerView, b: PlanBuilder, plan: BookingsPlan, top: string): void {
    const bv = view.bookings!
    plan.trials = []
    for (const t of bv.trials) {
      if (!t.open || b.free < t.hours + 10 || view.company.cashCents < t.cents * 4) continue
      if (t.choose && t.segments.includes(top) && (t.left[top] ?? 0) > 0) {
        plan.trials.push({ id: t.id, segmentId: top })
        b.free -= t.hours
      } else if (!t.choose && t.segments[0] === top && (t.left[''] ?? 0) > 0) {
        plan.trials.push({ id: t.id, segmentId: null })
        b.free -= t.hours
      }
    }
    const v = bv.vouchers
    const vs = v?.segments.find((x) => x.id === top)
    if (v && vs && vs.batchesLeft > 0 && b.free >= v.hoursPerBatch + 10) {
      plan.vouchers = { [top]: 1 }
      b.free -= v.hoursPerBatch
    }
  }

  /**
   * Contracts (plan 2 step 1b): a seasonal contract while its season needs the shifts, a permanent
   * one (or part time) for work that has stayed steady for weeks, and notice for contract shifts
   * that have gone unused for weeks.
   */
  function planContracts(view: PlayerView, plan: BookingsPlan): void {
    const mode = rule.contracts ?? 'careful'
    if (mode === 'none') return
    const bv = view.bookings!
    const hire: NonNullable<BookingsPlan['hire']> = []
    const end: string[] = []
    const money = view.company.cashCents
    const monthly = view.company.monthlyFixedCostsCents
    for (const r of bv.roles) {
      if (r.contracts.length === 0) continue
      const hist = shiftsUsed.map((w) => w[r.id] ?? 0)
      const mine = bv.contracts.filter((c) => c.roleId === r.id && c.endWeek === null)
      const contracted = mine.reduce((t, c) => t + c.shifts, 0)
      const recent = hist.slice(-3)
      const recentAvg = recent.length ? recent.reduce((t, x) => t + x, 0) / recent.length : 0
      const steady = hist.length >= STEADY_WEEKS ? Math.min(...hist.slice(-STEADY_WEEKS)) : 0
      const option = (k: string) =>
        mode === 'careful' || mode === k ? r.contracts.find((c) => c.kind === k) : undefined
      const seasonal = option('seasonal')
      const permanent = option('permanent')
      const partTime = option('part_time')
      // Tuning 1 (T14): the single-kind bots sign once the roster has been full for weeks, with
      // a month of the contract's pay in hand, not only once a quarter of it is spare (by then
      // the run was usually won, and a contract could not show what it pays).
      const affordable = (cents: number) =>
        money >= 3 * monthly + (mode === 'careful' ? 13 : 4) * cents
      // Compare a contract with the weekly shifts it replaces. Requiring every contracted shift
      // to have been used made even a clearly cheaper part time contract impossible for the bot:
      // the founder covers the first shifts, and demand seldom lands on the contract's exact size.
      const breakEvenShifts = (c: NonNullable<typeof seasonal>) =>
        Math.min(c.shifts, c.centsPerWeek / r.centsPerShift)
      if (seasonal && seasonal.months!.includes(bv.month) && seasonal.running < seasonal.max) {
        const seasonalShifts = bv.contracts
          .filter((c) => c.roleId === r.id && c.kind === 'seasonal' && c.working)
          .reduce((t, c) => t + c.shifts, 0)
        if (
          recentAvg - seasonalShifts >= breakEvenShifts(seasonal) &&
          affordable(seasonal.centsPerWeek)
        ) {
          hire.push({ roleId: r.id, kind: 'seasonal' })
          continue
        }
      }
      const inSeason = seasonal?.months?.includes(bv.month) ?? false
      if (!inSeason || mode !== 'careful') {
        if (permanent && permanent.running < permanent.max) {
          if (
            steady - contracted >= breakEvenShifts(permanent) &&
            affordable(permanent.centsPerWeek)
          ) {
            hire.push({ roleId: r.id, kind: 'permanent' })
            continue
          }
        }
        if (partTime && partTime.running < partTime.max) {
          if (
            steady - contracted >= breakEvenShifts(partTime) &&
            affordable(partTime.centsPerWeek)
          ) {
            hire.push({ roleId: r.id, kind: 'part_time' })
            continue
          }
        }
      }
      // Notice for the newest contract whose shifts have gone unused for weeks.
      const endable = mine.filter((c) => c.canEnd).sort((a, z) => z.startWeek - a.startWeek)[0]
      if (endable && hist.length >= IDLE_WEEKS) {
        const peak = Math.max(...hist.slice(-IDLE_WEEKS))
        if (peak <= contracted - endable.shifts) end.push(endable.id)
      }
    }
    if (hire.length) plan.hire = hire
    if (end.length) plan.endContracts = end
  }

  /**
   * Rooms renovated one at a time (plan 2 step 1d): as many as the segment needs, in weeks the
   * calendar is quiet, while the money lasts. The no-tests bot renovates every room.
   */
  function planRenovation(view: PlayerView, plan: BookingsPlan, wanted: string[]): void {
    const r = view.bookings!.renovation
    if (!r || r.canStart === 0) return
    const feature = scenario.bookings!.renovation!.feature
    if (!rule.buildAll && !wanted.includes(feature) && !(view.loan?.plan?.roomsBought ?? 0)) return
    const paid = view.loan?.plan?.roomsBought ?? 0
    const goal = Math.max(
      rule.buildAll ? r.rooms : r.mustHaveRooms,
      r.renovated + r.inProgress.length + paid,
    )
    const left = goal - r.renovated - r.inProgress.length
    if (left <= 0) return
    const cal = view.bookings!.calendar.find(
      (c) => c.productId === scenario.bookings!.renovation!.product,
    )
    const cells = cal?.cells.slice(0, r.weeks) ?? []
    const cap = cells.reduce((t, c) => t + c.capacity, 0)
    const busy = cap > 0 ? cells.reduce((t, c) => t + c.booked, 0) / cap : 0
    if (busy > WORKS_BUSY && !rule.buildAll) return
    const reserve = (RESERVE_MONTHS + 1) * view.company.monthlyFixedCostsCents
    const affordable =
      paid + Math.floor(Math.max(0, view.company.cashCents - reserve) / r.centsPerRoom)
    const n = Math.min(r.canStart, left, Math.max(0, affordable))
    if (n > 0) plan.renovate = n
  }

  /**
   * Plan 4: the trip policy once a trip product has shipped: a group of two (careful), one guest
   * (always) or never. The careful bot's two is the smallest group whose fuel and day of pay a
   * course place carries.
   */
  function planTrips(view: PlayerView, plan: BookingsPlan): void {
    const t = view.bookings!.abroad?.trips
    if (!t || t.locked) return
    const trip = view.bookings!.products.find((p) => p.dayTrip && p.shipped)
    if (!trip) return
    const mode = rule.trips ?? 'careful'
    const want = mode === 'never' ? null : mode === 'always' ? 1 : Math.min(2, t.most)
    if (want !== t.min) plan.trips = { min: want }
  }

  /**
   * Plan 4: the gulet's weeks. Hold the peak weeks ahead for whole-boat bookings (careful: only
   * while charters or retreats have booked or been turned away lately), release a held week six
   * weeks out if nobody took the boat, and set the minimum to sail (careful: four cabins, guests
   * moved to a partner boat rather than refunded).
   */
  function planCruise(view: PlayerView, plan: BookingsPlan): void {
    const c = view.bookings!.cruise
    if (!c) return
    const mode = rule.hold ?? 'careful'
    const whole = scenario.segments
      .filter((g) => (cfg.segments[g.id]?.size.min ?? 0) >= WHOLE_BOAT)
      .map((g) => g.id)
    // Holding pays only while whole-boat groups are being turned away, and only where the peak
    // weeks are the company's to sell (not a managed boat whose owner keeps them).
    const asset = view.bookings!.assets[0]
    const peakOurs =
      !asset || asset.option === 'lease' || asset.option === 'buy' || asset.peakReleased === true
    const demand =
      peakOurs &&
      view.bookings!.segments.filter((x) => whole.includes(x.id)).some((x) => x.turnedAwayLast4 > 0)
    const hold: { week: number; on: boolean }[] = []
    const peakWeek = (w: number) => {
      const woy = ((cfg.startWeekOfYear - 1 + w - 1) % 52) + 1
      return cfg.peakMonths.includes(Math.min(12, Math.floor(((woy - 1) * 12) / 52) + 1))
    }
    for (const w of c.weeks) {
      const want =
        mode === 'all_peak'
          ? peakWeek(w.week) && !w.chartered && w.sold === 0
          : mode === 'careful'
            ? demand && peakWeek(w.week) && !w.chartered && w.sold === 0 && w.week > view.week + 6
            : false
      if (want !== w.held && !(w.held && !want && w.chartered))
        hold.push({ week: w.week, on: want })
    }
    if (hold.length) plan.hold = hold
    const m = c.minSail
    if (m && !m.locked) {
      // Careful: on a managed boat an empty cabin costs nothing (the owner feeds and crews it),
      // so it sails with any number; on its own or a leased boat, four cabins at least.
      const managed = view.bookings!.assets[0]?.option === 'share'
      const min = rule.minSail ?? (managed ? 0 : 4)
      const move = rule.minSail === undefined
      if (m.options.includes(min) && (min !== m.min || move !== m.move))
        plan.minSail = { min, move }
    }
  }

  /** A minimum stay while the target's weekends fill up (plan 2 step 1d). */
  function planMinStay(view: PlayerView, plan: BookingsPlan): void {
    const m = view.bookings!.minStay
    if (!m || target === null || !m.segments.includes(target)) return
    const cells = view.bookings!.calendar.flatMap((c) => c.cells.slice(0, 4))
    const cap = cells.reduce((t, c) => t + c.capacity, 0)
    const busy = cap > 0 ? cells.reduce((t, c) => t + c.booked, 0) / cap : 0
    const want = m.months.includes(view.bookings!.month) && busy >= MIN_STAY_BUSY
    if (want !== m.on) plan.minStay = want
  }

  return {
    focus: () => target,
    respond(input) {
      trackSeason(input)
      // Plan 3: office stage offers by the bot's office rule, whatever its inbox policy.
      const office = answerOffers(
        input,
        stageOffers,
        rule.office ?? 'careful',
        false,
        input.founder.maxHoursPerWeek - input.committedHours - input.forcedHours - bv0(input),
      )
      const view = {
        ...input,
        committedHours: input.committedHours + office.reduce((t, a) => t + a.hours, 0),
        inbox: input.inbox.filter((m) => !stageOffers.has(m.eventId)),
      }
      // Plan 4: the asset's messages by the bot's asset rule.
      const assetAnswers = answerAssets(view)
      const assetIds = new Set(assetAnswers.map((a) => a.messageId))
      const answers = [
        ...office.map(({ messageId, choiceId }) => ({ messageId, choiceId })),
        ...assetAnswers,
        ...answer(view).filter((a) => !assetIds.has(a.messageId)),
      ]
      if (cfg.leisure) {
        const initial = leisureFirstTheme(view, rule, seed)
        if (initial) {
          const existing = answers.findIndex((a) => a.messageId === initial.messageId)
          if (existing >= 0) answers.splice(existing, 1)
          answers.push(initial)
        }
      }
      if (!rule.forced) return answers
      // Every arrival of the forced event gets the forced answer; the rest as the bot reads them.
      const { eventId, choiceId } = rule.forced
      const forced = view.inbox.filter(
        (m) =>
          m.answeredChoiceId === null &&
          m.eventId === eventId &&
          m.choices.some((c) => c.id === choiceId),
      )
      const ids = new Set(forced.map((m) => m.id))
      return [
        ...answers.filter((a) => !ids.has(a.messageId)),
        ...forced.map((m) => ({ messageId: m.id, choiceId })),
      ]
    },
    plan(view) {
      return planWeek(view)
    },
    observe(report) {
      observeWeek(report)
    },
  }

  /**
   * Plan 4: messages that lease, share or repair an asset. The careful bot shares first, leases
   * at the winter offer once the last season's shared units were mostly used in its peak, and
   * repairs a breakdown while it can pay; the single-option bots always pick theirs.
   */
  function answerAssets(view: PlayerView): { messageId: string; choiceId: string }[] {
    const mode = rule.asset ?? 'careful'
    const out: { messageId: string; choiceId: string }[] = []
    for (const m of view.inbox) {
      if (m.answeredChoiceId !== null) continue
      const event = scenario.events.find((e) => e.id === m.eventId)
      if (!event) continue
      const pick = (option: string) =>
        event.choices.find((c) =>
          c.effects.some((fx) => fx.type === 'asset' && fx.option === option),
        )
      const repair = event.choices.find((c) => c.effects.some((fx) => fx.type === 'assetRepair'))
      if (repair) {
        const cost = view.bookings?.assets[0]?.terms.buy?.repairCents ?? 0
        if (view.company.cashCents > cost * 2) out.push({ messageId: m.id, choiceId: repair.id })
        continue
      }
      if (!event.choices.some((c) => c.effects.some((fx) => fx.type === 'asset'))) continue
      const now = view.bookings?.assets[0]?.option ?? 'none'
      let want: string | null = null
      if (mode === 'share' || mode === 'lease') want = mode
      else if (mode === 'careful') {
        // Plan 4: where whole-boat groups are the guests (a gulet's charters, who want the peak
        // weeks a managed boat's owner keeps), a lease from the start if it can be paid; else
        // share first. Before it knows its guests it waits, while the offer is open.
        const wholeBoat =
          !!cfg.hold && target !== null && (cfg.segments[target]?.size.min ?? 0) >= WHOLE_BOAT
        if (now === 'none' && target === null && view.week < 4 && cfg.hold) continue
        if (cfg.hold) {
          // Tuning 1: a gulet by expected value. Lease when the weeks it expects to fill pay
          // the season's fee better than managing would; manage when they are few.
          if ((now === 'none' || now === 'share') && leaseAffordable(view) && leaseWorth(view))
            want = 'lease'
          else if (now === 'none') want = 'share'
        } else if (now === 'none') want = wholeBoat && leaseAffordable(view) ? 'lease' : 'share'
        else if (now === 'share' && seatsFull()) want = 'lease'
      }
      const choice = want && want !== now ? pick(want) : undefined
      if (choice) out.push({ messageId: m.id, choiceId: choice.id })
    }
    return out
  }

  /**
   * Tuning 1: whether a gulet's next season should be leased. The weeks it expects to fill (from
   * the last season where the boat sailed, with groups turned away, else from the market it
   * targets) against the weeks a lease needs to pay its fee and the year's company and living
   * costs. Lease when they are enough; manage when they are few. Null without a target or terms.
   */
  function leaseWorth(view: PlayerView): boolean | null {
    const bv = view.bookings!
    const a = bv.assets[0]
    const lease = a?.terms.lease
    if (!a || !lease || target === null) return null
    const seg = cfg.segments[target]
    const prices = bv.prices[target]
    if (!seg || !prices) return null
    const whole = seg.size.min >= WHOLE_BOAT
    const capacity = cfg.products[a.products[0]!]?.capacity ?? 16
    const season = Math.round((lease.months.length * 52) / 12)
    const peakWeeks = Math.round(
      (lease.months.filter((m) => cfg.peakMonths.includes(m)).length * 52) / 12,
    )
    const price = (prices.peak * peakWeeks + prices.off * (season - peakWeeks)) / season
    const places = whole ? capacity : Math.min(capacity, CABIN_PLACES)
    const net = places * price * (1 - bv.platform.commission / 2) - lease.crewWeekCents
    let weeks = season * (whole ? WHOLE_FILL : CABIN_FILL)
    if (lastSeason !== null) {
      const away = bv.segments.reduce((t, x) => t + x.turnedAwayLast4, 0) / places
      weeks = Math.min(season, lastSeason + away)
    }
    const costs = 13 * (view.company.monthlyFixedCostsCents + view.founder.livingCostCentsPerMonth)
    return net > 0 && weeks >= (lease.seasonCents + costs) / net
  }

  function answer(view: PlayerView): { messageId: string; choiceId: string }[] {
    if (rule.inbox === 'none') return []
    if (rule.inbox === 'effort') return answerInbox(view)
    if (rule.naive) {
      // Only what a message's own conditions say; everything else keeps its default.
      const out: { messageId: string; choiceId: string }[] = []
      let used = view.committedHours + view.forcedHours + bv0(view)
      for (const m of view.inbox) {
        if (m.answeredChoiceId !== null) continue
        const event = scenario.events.find((e) => e.id === m.eventId)
        if (!event || !event.choices.some((c) => c.effects.some((fx) => fx.when.length > 0)))
          continue
        const id = fromConditions(event, view, m)
        const c = m.choices.find((x) => x.id === id)
        if (!c || id === event.defaultChoice) continue
        if (used + c.hours > view.founder.maxHoursPerWeek) continue
        out.push({ messageId: m.id, choiceId: id })
        used += c.hours
      }
      return out
    }
    // The reader: listed answers where the bots have them, else the declared conditions.
    const listed = readInbox(view, scenario)
    const answered = new Set(listed.map((a) => a.messageId))
    let used = view.committedHours + view.forcedHours + bv0(view)
    const extra: { messageId: string; choiceId: string }[] = []
    const rules = TOURISM_READER[scenario.id] ?? {}
    for (const m of view.inbox) {
      if (m.answeredChoiceId !== null || answered.has(m.id)) continue
      const event = scenario.events.find((e) => e.id === m.eventId)
      if (!event) continue
      const rule = rules[event.id]
      const conditional = event.choices.some((c) => c.effects.some((fx) => fx.when.length > 0))
      if (!rule && !conditional) continue
      let id = rule
        ? (rule(view, { target }) ?? event.defaultChoice)
        : fromConditions(event, view, m)
      // A rule's answer whose good effects all wait for a situation the card names: only in that
      // situation (plan 2 step 3).
      const chosen = event.choices.find((x) => x.id === id)
      const gated = chosen?.effects.filter(
        (fx) => fx.when.length > 0 && (fx.type === 'guests' || fx.type === 'review'),
      )
      if (
        rule &&
        gated &&
        gated.length > 0 &&
        !chosen!.effects.some(
          (fx) => fx.when.length === 0 && (fx.type === 'guests' || fx.type === 'review'),
        ) &&
        !gated.some((fx) => viewConditionsHold(view, fx.when, m))
      ) {
        id = event.defaultChoice
      }
      const c = m.choices.find((x) => x.id === id)
      if (!c || id === event.defaultChoice) continue
      if (
        cfg.leisure &&
        c.costCents > 0 &&
        view.company.cashCents - c.costCents < view.company.monthlyFixedCostsCents
      )
        continue
      if (used + c.hours > view.founder.maxHoursPerWeek) continue
      extra.push({ messageId: m.id, choiceId: id })
      used += c.hours
    }
    return [...listed, ...extra]
  }

  function planWeek(view: PlayerView): WeekPlan {
    const b = new PlanBuilder(view, rule.hours ?? 50)
    const bv = view.bookings!
    const ids = view.segments.map((s) => s.id)
    const plan: BookingsPlan = {
      shifts: {},
      founderShifts: {},
      prices: {},
      policy: null,
      platform: null,
      partnerships: [],
      outreach: {},
    }
    b.chase(Math.max(3, view.invoices.filter((i) => i.canChase).length))

    // This week's guests come first: the roster.
    const pool: Record<string, number> = {}
    for (const r of bv.roles) pool[r.id] = r.available
    // Contract staff working this week are paid already: their shifts go first (plan 2).
    const contractLeft: Record<string, number> = {}
    for (const c of bv.contracts) {
      if (c.working) contractLeft[c.roleId] = (contractLeft[c.roleId] ?? 0) + c.shifts
    }
    const used: Record<string, number> = {}
    // Kitchen and floor apart (plan 2 step 1c): each side covers what is booked on its own.
    const hasFloor = bv.roles.some((r) => r.kind === 'floor')
    const sides: ('kitchen' | 'floor' | 'any')[] = hasFloor ? ['kitchen', 'floor'] : ['any']
    const onSide = (kind: string, side: string) =>
      side === 'any' || (side === 'floor' ? kind === 'floor' : kind !== 'floor')
    // Walk-ins expected this week, shared over the products open now by capacity (step 6).
    const open = bv.products.filter((p) => p.shipped && p.inSeason && p.capacity > 0)
    const openCapacity = open.reduce((t, p) => t + p.capacity, 0)
    const walkIns =
      scenario.loan && arrivals.length > 0
        ? arrivals.reduce((t, x) => t + x, 0) / arrivals.length
        : 0
    // Last week's guests per product, against what was booked when it was planned (plan 2).
    if (view.week > 1) {
      for (const p of bv.products) {
        if (!p.shipped || p.capacity === 0) continue
        const came = bv.lastWeek.find((x) => x.productId === p.id)?.came ?? 0
        const was = bookedAtPlanBy[p.id]
        if (was === undefined) continue
        walkInsBy[p.id] = [...(walkInsBy[p.id] ?? []), Math.max(0, came - was)].slice(-4)
      }
    }
    bookedAtPlanBy = Object.fromEntries(bv.thisWeek.map((x) => [x.productId, x.booked]))
    // Plan 4: how much of a shared asset's units last week used, in peak weeks.
    const shared = bv.assets.find((a) => a.option === 'share')
    if (shared && bv.peak && (shared.peakReleased !== false || bv.cruise)) {
      let used = 0
      let offered = 0
      for (const id of shared.products) {
        used += bv.lastWeek.find((x) => x.productId === id)?.served ?? 0
        offered += bv.calendar.find((c) => c.productId === id)?.cells[0]?.capacity ?? 0
      }
      // Guests turned away count as used: they wanted the places the share did not have.
      const away = bv.segments.reduce((t, x) => t + x.turnedAwayLast4, 0) / 4
      assetUse.push({ used: used + away, offered })
    }
    bookedAtPlan = bv.thisWeek.reduce(
      (t, x) => t + (bv.products.find((p) => p.id === x.productId)?.shipped ? x.booked : 0),
      0,
    )
    const prep: Record<string, number> = {}
    for (const { productId, booked: bookedNow } of bv.thisWeek) {
      const product = bv.products.find((p) => p.id === productId)
      // Walk-ins: this product's own recent weeks where the screen shows them (plan 2), else the
      // week's walk-ins shared over the open products by capacity (step 6).
      const own = walkInsBy[productId]
      const expected =
        product &&
        open.includes(product) &&
        scenario.loan &&
        own &&
        own.length > 0 &&
        bv.prep.length > 0
          ? own.reduce((t, x) => t + x, 0) / own.length
          : product && openCapacity > 0 && open.includes(product)
            ? (walkIns * product.capacity) / openCapacity
            : 0
      const booked = rule.roster === 'under' ? bookedNow : bookedNow + expected
      if (booked === 0 && rule.roster !== 'over') continue
      if (!product?.shipped) continue
      // Plan 4: a product that follows the conditions runs only on the forecast's suitable slots.
      const runs = bv.abroad?.runsOn.find((r) => r.productId === productId)
      const forecastCap =
        runs && runs.total > 0 ? (product.capacity * runs.suitable) / runs.total : Infinity
      const need = Math.min(
        forecastCap,
        rule.roster === 'over'
          ? product.capacity
          : rule.roster === 'under'
            ? booked * UNDER_SHARE
            : booked * (rule.reviews ? 1 + ROSTER_MARGIN : 1),
      )
      // Food for what the roster is meant to serve; the overstaffing bot leaves the kitchen to
      // cook for every cover it can.
      // Food (plan 2 step 1c): for what is booked and the walk-ins of recent weeks, a tenth more,
      // and never less than last week's guests; with no guests yet, for two fifths of the seats.
      // Running out turns guests away; a little waste costs less.
      if (bv.prep.some((x) => x.productId === productId) && rule.roster !== 'over') {
        const history = (walkInsBy[productId]?.length ?? 0) >= 2
        const lastShare = walkInsBy[productId]?.at(-1) ?? 0
        prep[productId] =
          rule.roster === 'under'
            ? Math.ceil(need)
            : history
              ? Math.ceil(
                  Math.max(need, (bookedNow + Math.max(expected, lastShare)) * (1 + PREP_MARGIN)),
                )
              : Math.ceil(Math.max(need, product.capacity * FIRST_PREP_SHARE))
      }
      for (const side of sides) {
        let covered = 0
        // Contract shifts are paid whether used or not, so use them before spending founder
        // hours. The old order left signed staff idle while the founder worked their shifts and
        // made every fixed contract look worse than buying shifts by the week.
        const byCost = [...bv.roles]
          .filter((r) => (r.units[productId] ?? 0) > 0 && onSide(r.kind, side))
          .sort(
            (x, y) => x.centsPerShift / x.units[productId]! - y.centsPerShift / y.units[productId]!,
          )
        for (const r of byCost) {
          const per = r.units[productId] ?? 0
          while (covered < need && (contractLeft[r.id] ?? 0) > 0) {
            contractLeft[r.id]!--
            used[r.id] = (used[r.id] ?? 0) + 1
            covered += per
          }
        }
        // The founder's own shifts next: they cost hours, not money.
        for (const r of bv.roles) {
          const per = r.units[productId] ?? 0
          const own = Object.values(plan.founderShifts).reduce((t, n) => t + n, 0)
          if (per <= 0 || r.founderHours === null || !onSide(r.kind, side)) continue
          let taken = own
          while (
            covered < need &&
            taken < FOUNDER_SHIFTS &&
            b.free >= r.founderHours + FOUNDER_KEEP_HOURS
          ) {
            plan.founderShifts[r.id] = (plan.founderShifts[r.id] ?? 0) + 1
            b.free -= r.founderHours
            covered += per
            taken++
          }
        }
        // Finally buy flexible shifts, cheapest per guest first.
        for (const r of byCost) {
          const per = r.units[productId] ?? 0
          while (covered < need && (pool[r.id] ?? 0) > 0) {
            pool[r.id]!--
            plan.shifts[r.id] = (plan.shifts[r.id] ?? 0) + 1
            used[r.id] = (used[r.id] ?? 0) + 1
            covered += per
          }
        }
      }
    }
    // Prepared services nobody is expected at this week get nothing cooked; with no history yet
    // the kitchen's own default stands.
    if (rule.roster !== 'over' && bv.prep.length > 0) {
      plan.prep = Object.fromEntries(bv.prep.map((x) => [x.productId, prep[x.productId] ?? 0]))
    }
    shiftsUsed = [...shiftsUsed, used].slice(-Math.max(STEADY_WEEKS, IDLE_WEEKS))
    planContracts(view, plan)

    // Week 1: listen to everyone. Week 2: a test listing and a pilot where it points.
    if (rule.tests && view.week === 1) {
      for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
    }
    if (rule.tests && view.week === 2) {
      const top = rank(view)
      if (top[0]) {
        if (bv.trials.length > 0 || bv.vouchers) planTrials(view, b, plan, top[0].id)
        else {
          b.presale(top[0].id)
          if (reaches(top[0].id, 'platform')) b.landing(top[0].id)
        }
      }
      for (const { id } of top.slice(0, 2)) b.interviews(id, MORE_INTERVIEWS)
    }
    if (view.week >= (rule.tests ? 3 : 1) && target === null) {
      target = rule.segment ?? (rule.tests ? (rank(view)[0]?.id ?? ids[0]!) : ids[0]!)
    }

    if (target !== null) {
      const seg = target
      // Build what the market asks for, or everything. Once that is done, a second kind of
      // guest: the next segment the evidence ranks, so quiet weeks still bring someone.
      const own = wanted(view, seg)
      const done = own.every((f) => view.product.features.find((x) => x.id === f)?.shipped)
      const second =
        rule.tests && !rule.segment ? rank(view).find((r) => r.id !== seg)?.id : undefined
      // More products for the same guests (other months, other days out), when one costs at
      // most a fifth of the money in hand.
      const money = view.company.cashCents + Math.max(0, view.founder.savingsCents)
      // From step 6 (loan scenarios): not a product whose stated costs eat most of its price.
      const thin = (id: string) =>
        !!scenario.loan &&
        (bv.products.find((p) => p.id === id)?.unitCostShare ?? 0) >= THIN_MARGIN_SHARE
      const more = done
        ? productsFor(seg).filter(
            (id) =>
              (cfg.products[id]?.oneOffCents ?? 0) <= money * EXTRA_SHARE &&
              !thin(id) &&
              allowed(id),
          )
        : []
      // Plan 4: a course's next step for its graduates, once the course is ready, when cheap.
      const nextSteps = bv.abroad
        ? [...own, ...more]
            .filter((id) => view.product.features.find((x) => x.id === id)?.shipped)
            .flatMap((id) => cfg.products[id]?.course?.sameStay?.products ?? [])
            .filter(
              (id) => allowed(id) && (cfg.products[id]?.oneOffCents ?? 0) <= money * EXTRA_SHARE,
            )
        : []
      const toBuild = rule.buildAll
        ? scenario.features.map((f) => f.id)
        : done && second
          ? [...own, ...more, ...nextSteps, ...wanted(view, second)]
          : [...own, ...nextSteps]
      // With a bank loan on offer (step 6): build what is required first, and never a product
      // the money cannot pay for yet.
      // Products a loan bought are built whatever else happens (plan 2 step 2).
      const bought = [
        ...(view.loan?.plan?.bought ?? []),
        // Rooms bought need the works planned.
        ...((view.loan?.plan?.roomsBought ?? 0) > 0 && cfg.renovation
          ? [cfg.renovation.feature]
          : []),
      ]
      // Plan 4: the temptation in the first spring, for the bot that cannot resist it.
      const early = [
        ...(rule.temptationEarly && view.week <= 12 ? [rule.temptationEarly] : []),
        // Plan 4: the always-buy bot buys every asset as soon as it can.
        ...(rule.asset === 'buy'
          ? Object.values(cfg.assets ?? {}).flatMap((a) => (a.buy ? [a.buy.product] : []))
          : []),
      ]
      const baseBuilding = view.loan
        ? withRequired([...new Set([...toBuild, ...bought, ...early])])
        : toBuild
      const building = cfg.leisure ? leisureBuildOrder(view, baseBuilding) : baseBuilding
      if (view.loan) {
        // Keep the bridge a long-lead market needs (the months beyond the usual buffer) as well.
        const leadMonths = rule.naive ? 0 : Math.ceil((cfg.segments[seg]?.leadWeeks.max ?? 0) / 4)
        const visibleBridge = view.loan?.bridgeMonthsHint ?? 0
        const bridge = Math.max(0, Math.max(leadMonths, visibleBridge) - LOAN_BUFFER_MONTHS)
        const reserve = (RESERVE_MONTHS + bridge) * view.company.monthlyFixedCostsCents
        const shipped = (id: string) => !!view.product.features.find((x) => x.id === id)?.shipped
        planLoan(view, b, building)
        // What others require comes first, on its own: nothing sells without it.
        const required = building.filter(
          (f) => !shipped(f) && building.some((g) => cfg.products[g]?.requires === f),
        )
        const now = required.length > 0 ? required : building
        // Plan 4 (day conditions only): products started this week count against the money too.
        let committed = 0
        for (const f of now) {
          const cost =
            bought.includes(f) || bv.leisure?.builds.some((x) => x.productId === f && x.started)
              ? 0
              : (cfg.products[f]?.oneOffCents ?? 0)
          const keep = required.length > 0 ? 0 : reserve
          if (cost > 0 && view.company.cashCents - keep - committed < cost) continue
          if ((bv.abroad || bv.leisure) && !shipped(f)) committed += cost
          b.build(f, 40 - (b.plan.build[f] ?? 0))
        }
      } else {
        for (const f of building) b.build(f, 40 - (b.plan.build[f] ?? 0))
      }
      planRenovation(view, plan, building)
      planMinStay(view, plan)
      planTrips(view, plan)
      planCruise(view, plan)
      if (done && second && rule.channels === 'mix') {
        if (
          reaches(second, 'partnership') &&
          !bv.partnerships.includes(second) &&
          b.free >= bv.partnershipHours + 10
        ) {
          plan.partnerships.push(second)
          b.free -= bv.partnershipHours
        }
        if (reaches(second, 'platform') && !bv.platform.listed) plan.platform = true
        // Tuning 1 (the abroad scenarios without held weeks: Rückenwind and Tiefgang): the
        // website serves the second kind of guest too, so it is built when they book online,
        // even if the first kind does not.
        if ((cfg.conditions || cfg.leisure) && !cfg.hold && reaches(second, 'website'))
          b.build(cfg.website.product, 20 - (b.plan.build[cfg.website.product] ?? 0))
        // And calls and visits to the second kind of guest, where they answer them.
        if ((cfg.conditions || cfg.leisure) && !cfg.hold && reaches(second, 'outreach')) {
          const h = Math.min(OUTREACH_HOURS, b.free)
          if (h > 0) {
            plan.outreach[second] = (plan.outreach[second] ?? 0) + h
            b.free -= h
          }
        }
      }
      if (rule.reviews && view.product.bugs >= BUG_LIMIT) b.fixBugs(8)
      if (
        view.segments.find((s) => s.id === seg) &&
        segmentNotes(scenario, view, seg).interviews < 12
      ) {
        if (rule.tests) b.interviews(seg, 2)
      }

      // Channels.
      if (!bv.platform.listed && (rule.channels === 'platform' || reaches(seg, 'platform'))) {
        plan.platform = true
      }
      if (rule.channels === 'mix') {
        if (
          reaches(seg, 'partnership') &&
          !bv.partnerships.includes(seg) &&
          b.free >= bv.partnershipHours + 10
        ) {
          plan.partnerships.push(seg)
          b.free -= bv.partnershipHours
        }
        if (reaches(seg, 'website'))
          b.build(cfg.website.product, 20 - (b.plan.build[cfg.website.product] ?? 0))
        if (reaches(seg, 'outreach')) {
          const h = Math.min(OUTREACH_HOURS, b.free)
          if (h > 0) {
            plan.outreach[seg] = h
            b.free -= h
          }
        }
      }

      // Prices: from what interviewees said they pay, per season, for every kind of guest.
      if (rule.pricing === 'hints') {
        for (const id of Object.keys(cfg.segments)) {
          const hints = budgetHints(view, id)
          if (hints.length < MIN_HINTS) continue
          // The median, and never more than a step away from today's price: hints are noisy.
          const sorted = [...hints].sort((x, y) => x - y)
          const median = sorted[Math.floor(sorted.length / 2)]!
          const base = bv.prices[id]?.peak ?? median
          const mean = Math.min(
            base * (1 + MAX_PRICE_STEP),
            Math.max(base * (1 - MAX_PRICE_STEP), median),
          )
          const peak = Math.max(100, Math.round((mean * HINT_PEAK) / 100) * 100)
          const offShare = HINT_OFF_AT_HINTS.has(scenario.id) ? 1 : HINT_OFF
          const off = Math.max(100, Math.round((mean * offShare) / 100) * 100)
          const now = bv.prices[id]
          if (!now || now.peak !== peak || now.off !== off) plan.prices[id] = { peak, off }
        }
      }

      // Policy.
      if (rule.policy !== 'adaptive') {
        if (bv.policy !== rule.policy && !bv.policyLocked) plan.policy = rule.policy
      } else if (!bv.policyLocked) {
        const cancelled = cancelledRecent.reduce((t, x) => t + x, 0)
        const served = servedRecent.reduce((t, x) => t + x, 0)
        const share = cancelled + served > 0 ? cancelled / (cancelled + served) : 0
        const cells = bv.calendar.flatMap((c) => c.cells.slice(0, 4))
        const cap = cells.reduce((t, c) => t + c.capacity, 0)
        const busy = cap > 0 ? cells.reduce((t, c) => t + c.booked, 0) / cap : 0
        const want = share >= STRICT_CANCEL_SHARE && busy >= BUSY_SHARE ? 'strict' : 'flexible'
        if (want !== bv.policy) plan.policy = want
      }
    }
    // Hours left over go to more calls and visits for the target, up to what still helps.
    if (target !== null && rule.channels === 'mix') {
      const now = plan.outreach[target] ?? 0
      const more = Math.min(cfg.outreachHoursFull - now, b.free)
      if (reaches(target, 'outreach') && more > 0) {
        plan.outreach[target] = now + more
        b.free -= more
      }
    }
    // The overworker fills every spare hour with more calls and visits.
    if ((rule.hours ?? 50) > 50 && target !== null && b.free > 0) {
      plan.outreach[target] = (plan.outreach[target] ?? 0) + b.free
      b.free = 0
    }
    if (cfg.leisure) planLeisure(view, b, plan, rule)
    b.plan.bookings = plan
    return b.plan
  }

  function observeWeek(report: WeekReport): void {
    let cancelled = 0
    let served = 0
    let staffCancelled = 0
    for (const e of report.entries) {
      if (e.kind === 'bookings_cancelled') cancelled += e.units
      if (e.kind === 'guests_served') served += e.units
      // Guests sent away for want of staff or food came all the same (plan 2: prep).
      if (e.kind === 'company_cancelled' && (e.reason === 'staff' || e.reason === 'sold_out'))
        staffCancelled += e.units
    }
    arrivals = [...arrivals, Math.max(0, served + staffCancelled - bookedAtPlan)].slice(-4)
    cancelledRecent = [...cancelledRecent, cancelled].slice(-4)
    servedRecent = [...servedRecent, served].slice(-4)
  }
}

const tourism = (
  id: string,
  description: string,
  rule: TourismRule,
  scenarios?: string[],
): Strategy => ({
  id,
  description,
  model: 'bookings',
  ...(scenarios ? { scenarios } : {}),
  ...(rule.loan !== undefined || rule.refitLoan ? { needsLoan: true } : {}),
  create: (scenario, seed) => tourismPlayer(scenario, rule, seed),
})

/** The careful bot answering one event the same way every time (the event table, item 18). */
export const tourismForced = (eventId: string, choiceId: string): Strategy =>
  tourism(
    `tourism_careful ${eventId}:${choiceId}`,
    `tourism_careful, always answering ${eventId} with ${choiceId}.`,
    { ...CAREFUL_TOURISM, forced: { eventId, choiceId } },
  )

export const TOURISM_STRATEGIES: Strategy[] = [
  tourism(
    'leisure_one_room',
    'Never builds a second room; still maintains the first.',
    { ...CAREFUL_TOURISM, leisure: { rooms: 'one' } },
    ['ausgesperrt'],
  ),
  tourism(
    'leisure_quarterly_rooms',
    'Starts another room every thirteen weeks from opening when it can finance it.',
    { ...CAREFUL_TOURISM, leisure: { rooms: 'quarterly' } },
    ['ausgesperrt'],
  ),
  tourism(
    'leisure_theme_blind',
    'Chooses room themes from a seeded order without matching the market.',
    { ...CAREFUL_TOURISM, leisure: { themeBlind: true } },
    ['ausgesperrt'],
  ),
  tourism(
    'leisure_no_daytime',
    'Closes weekday daytime sales and keeps the other careful policies.',
    { ...CAREFUL_TOURISM, leisure: { noDaytime: true } },
    ['ausgesperrt'],
  ),
  tourism(
    'leisure_vr_first_year',
    'Adds the virtual room in the first year with bank help when needed.',
    { ...CAREFUL_TOURISM, leisure: { vrEarly: true } },
    ['ausgesperrt'],
  ),
  tourism(
    'leisure_no_later_loan',
    'Keeps the careful startup loan policy but funds every later room from retained cash.',
    { ...CAREFUL_TOURISM, leisure: { laterLoans: false } },
    ['ausgesperrt'],
  ),
  tourism(
    'tourism_careful',
    "Interviews every segment in week 1; in week 2 a pilot and, for a segment that books on platforms, a test listing where the interviews point. Picks the segment its evidence favours, builds a product that sells to it and what its interviewees ask for, lists on the platform where that segment books there, sets up its partnerships, builds the website and does outreach where those reach it, prices from interview budget hints (peak at their mean, off season at 85%), rosters to this week's bookings plus a tenth (taking up to two shifts itself), fixes snags, chases invoices, and turns strict only once cancellations are frequent and the calendar busy. It takes a bigger place when guests were turned away in 3 of the last 8 weeks (at the last stage, in peak weeks or above four fifths full, and only with someone on contract where the place needs it) and cash and savings cover the move, six months of the added rent and two months of costs; else it lists the place in the bank's plan.",
    CAREFUL_TOURISM,
  ),
  tourism(
    'tourism_platform_only',
    'Plays like tourism_careful but sells only through the platform: no partnerships, website or outreach.',
    { ...CAREFUL_TOURISM, channels: 'platform' },
  ),
  tourism(
    'tourism_overstaffing',
    "Plays like tourism_careful but rosters for every product's full capacity, booked or not.",
    { ...CAREFUL_TOURISM, roster: 'over' },
  ),
  tourism(
    'tourism_understaffing',
    'Plays like tourism_careful but rosters for 60% of what is booked.',
    { ...CAREFUL_TOURISM, roster: 'under' },
  ),
  tourism(
    'tourism_no_tests',
    'No interviews or tests: builds every product, the temptation included, and sells to the first segment.',
    { ...CAREFUL_TOURISM, tests: false, buildAll: true },
  ),
  tourism(
    'tourism_price_blind',
    'Plays like tourism_careful but keeps the starting price all year.',
    { ...CAREFUL_TOURISM, pricing: 'fixed' },
  ),
  tourism(
    'tourism_review_blind',
    'Plays like tourism_careful but never fixes snags and rosters exactly to bookings, without a margin.',
    { ...CAREFUL_TOURISM, reviews: false },
  ),
  tourism('tourism_always_flexible', 'Plays like tourism_careful with a flexible policy all run.', {
    ...CAREFUL_TOURISM,
    policy: 'flexible',
  }),
  tourism('tourism_overworker', 'Plays like tourism_careful but plans 65 h every week.', {
    ...CAREFUL_TOURISM,
    hours: 65,
  }),
  tourism(
    'tourism_inbox_none',
    'Plays like tourism_careful but leaves every message to its default.',
    {
      ...CAREFUL_TOURISM,
      inbox: 'none',
    },
  ),
  tourism(
    'tourism_inbox_effort',
    'Plays like tourism_careful but answers messages with blind effort: the choice with the most hours it can afford.',
    {
      ...CAREFUL_TOURISM,
      inbox: 'effort',
    },
  ),
  tourism(
    'tourism_naive_careful',
    'Plays like tourism_careful without scenario knowledge beyond the screen: messages answered by their declared conditions only, no bridge months or lead times for the loan, and every channel tried for its groups instead of the channel table (tourism fixes, item 17).',
    { ...CAREFUL_TOURISM, naive: true },
  ),
  tourism(
    'tourism_contracts_none',
    'Plays like tourism_careful but books every staff shift by the week and signs no contracts.',
    { ...CAREFUL_TOURISM, contracts: 'none' },
  ),
  tourism(
    'tourism_permanent',
    'Plays like tourism_careful but signs only permanent staff contracts where steady work supports them.',
    { ...CAREFUL_TOURISM, contracts: 'permanent' },
  ),
  tourism(
    'tourism_seasonal',
    'Plays like tourism_careful but signs only seasonal staff contracts where the current season supports them.',
    { ...CAREFUL_TOURISM, contracts: 'seasonal' },
  ),
  tourism(
    'tourism_part_time',
    'Plays like tourism_careful but signs only part time staff contracts where steady work supports them.',
    { ...CAREFUL_TOURISM, contracts: 'part_time' },
  ),
  tourism(
    'tourism_never_move',
    'Plays like tourism_careful but declines every offer of a bigger place (plan 3, target O1).',
    { ...CAREFUL_TOURISM, office: 'never' },
  ),
  tourism(
    'tourism_always_move',
    'Plays like tourism_careful but accepts every offer of a bigger place at once, and lists it in the bank plan where there is one (plan 3, target O2).',
    { ...CAREFUL_TOURISM, office: 'always' },
  ),
  tourism('tourism_always_strict', 'Plays like tourism_careful with a strict policy all run.', {
    ...CAREFUL_TOURISM,
    policy: 'strict',
  }),
  // The bank loan (step 6): only where a scenario offers one.
  tourism(
    'tourism_overborrow',
    'Plays like tourism_careful but asks the bank for the most it lends, as soon as the plan is written.',
    { ...CAREFUL_TOURISM, loan: 'max' },
  ),
  tourism(
    'tourism_reckless',
    'Plays like tourism_careful but borrows the most the bank lends, with no repayment-free start and the shortest term.',
    { ...CAREFUL_TOURISM, loan: 'reckless' },
  ),
  // Plan 4: Rückenwind's own targets (W1 to W5).
  ...[
    [
      'tourism_wind_only',
      'Plays like tourism_careful but builds only products for wind (good or strong).',
      { mix: 'wind' },
    ],
    [
      'tourism_calm_only',
      'Plays like tourism_careful but builds only calm-water products (calm or light wind).',
      { mix: 'calm' },
    ],
    [
      'tourism_no_courses',
      'Plays like tourism_careful but sells hire and tours, never a course.',
      { mix: 'no_courses' },
    ],
    [
      'tourism_trips_always',
      'Plays like tourism_careful but runs a kite trip for a single student.',
      { trips: 'always' },
    ],
    [
      'tourism_trips_never',
      'Plays like tourism_careful but never runs a kite trip.',
      { trips: 'never' },
    ],
    [
      'tourism_tender_higher',
      'Plays like tourism_careful but always bids higher in the beach tender.',
      { forced: { eventId: 'beach_tender', choiceId: 'higher' } },
    ],
    [
      'tourism_tender_same',
      'Plays like tourism_careful but always bids as before in the beach tender.',
      { forced: { eventId: 'beach_tender', choiceId: 'same' } },
    ],
    [
      'tourism_efoil_spring',
      'Plays like tourism_careful but builds the eFoil fleet in the first spring, with the bank.',
      { temptationEarly: 'efoil_fleet' },
    ],
  ].map(([id, text, rule]) =>
    tourism(id as string, text as string, { ...CAREFUL_TOURISM, ...(rule as TourismRule) }, [
      'rueckenwind',
    ]),
  ),
  // Plan 4: Tiefgang's own targets (D1 to D4).
  ...[
    [
      'tourism_certified_only',
      'Plays like tourism_careful but sells only to certified divers: wreck and shore dives, no try dives or entry courses.',
      { segment: 'certified_divers' },
    ],
    [
      'tourism_no_ladder',
      'Plays like tourism_careful but sells try dives and no course whose licence another product needs.',
      { mix: 'no_ladder' },
    ],
    [
      'tourism_always_buy',
      'Plays like tourism_careful but buys the boat at once, with the bank, and never leases or shares.',
      { asset: 'buy' },
    ],
    [
      'tourism_always_lease',
      'Plays like tourism_careful but always leases the boat.',
      { asset: 'lease' },
    ],
    [
      'tourism_always_share',
      'Plays like tourism_careful but always buys seats on the partner boat.',
      { asset: 'share' },
    ],
  ].map(([id, text, rule]) =>
    tourism(id as string, text as string, { ...CAREFUL_TOURISM, ...(rule as TourismRule) }, [
      'tiefgang',
    ]),
  ),
  // Plan 4: Leinen los's own targets (G1 to G4).
  ...[
    [
      'tourism_always_manage',
      "Plays like tourism_careful but always manages the owner's gulet.",
      { asset: 'share' },
    ],
    [
      'tourism_gulet_lease',
      'Plays like tourism_careful but always leases the gulet.',
      { asset: 'lease' },
    ],
    [
      'tourism_gulet_buy',
      'Plays like tourism_careful but buys a gulet as soon as it can (the company first), with the bank.',
      { asset: 'buy' },
    ],
    [
      'tourism_hold_all_peak',
      'Plays like tourism_careful but holds every peak week for charters.',
      { hold: 'all_peak' },
    ],
    ['tourism_hold_never', 'Plays like tourism_careful but never holds a week.', { hold: 'never' }],
    [
      'tourism_sail_always',
      'Plays like tourism_careful but sails with any number of cabins.',
      { minSail: 0 },
    ],
    [
      'tourism_sail_six',
      'Plays like tourism_careful but sails only with six cabins or more.',
      { minSail: 6 },
    ],
  ].map(([id, text, rule]) =>
    tourism(id as string, text as string, { ...CAREFUL_TOURISM, ...(rule as TourismRule) }, [
      'leinenlos',
    ]),
  ),
  tourism(
    'tourism_refit_loan',
    'Plays like tourism_careful and takes a second loan for the own fit-out once guests pay about 20,000 EUR a month.',
    { ...CAREFUL_TOURISM, refitLoan: true },
  ),
]
