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
import { answerInbox, fromConditions, rankMarkets, readInbox } from './validateThenBuild'

/**
 * Bots for the bookings model (tourism, step 4). They see only the view and the scenario's
 * stated rules (products, roles, channel strengths, the platform's commission), never demand,
 * season curves or the true weather.
 */
export type TourismRule = {
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
const MIN_HINTS = 3
/** The most a price moves at once from the hints. */
const MAX_PRICE_STEP = 0.3
/** Strict policy once this share of last month's guests cancelled and the calendar is busy. */
const STRICT_CANCEL_SHARE = 0.12
const BUSY_SHARE = 0.7
const BUG_LIMIT = 2
/** A product costing this share of its price or more is not worth adding (step 6). */
const THIN_MARGIN_SHARE = 0.5
/** Months of fixed costs a careful borrower adds to what the plan needs, and keeps in reserve. */
const LOAN_BUFFER_MONTHS = 4
/**
 * What a careful founder of this business knows about its first months (step 7): a guesthouse
 * that opens in November borrows to reach the summer.
 */
const BRIDGE_MONTHS: Record<string, number> = { seeblick: 6 }
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

export function tourismPlayer(scenario: Scenario, rule: TourismRule): Player {
  const cfg = scenario.bookings!
  let target: string | null = null
  let cancelledRecent: number[] = []
  let servedRecent: number[] = []
  /** Plan 2: paid and contract shifts used per role in recent weeks, newest last. */
  let shiftsUsed: Record<string, number>[] = []

  /** Markets by the evidence on screen: interviews, then trials and vouchers (plan 2). */
  const rank = (view: PlayerView) =>
    rankMarkets(scenario, view)
      .map((r) => ({ ...r, score: r.score + trialScore(view, r.id) }))
      .sort((a, b) => b.score - a.score)

  const productsFor = (seg: string) =>
    Object.entries(cfg.products)
      .filter(([, p]) => p.serves.includes(seg))
      .map(([id]) => id)

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
    const asked = productsFor(seg).filter((id) => mentions.includes(id))
    const base = scenario.loan && asked.length > 0 ? quickest(asked) : quickest(productsFor(seg))
    return [...new Set([...(base ? [base] : []), ...mentions])]
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
      (id) => !view.product.features.find((f) => f.id === id)?.shipped,
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
    const bufferMonths = Math.max(
      LOAN_BUFFER_MONTHS,
      Math.ceil(lead / 4),
      rule.naive ? 0 : (BRIDGE_MONTHS[scenario.id] ?? 0),
    )
    const need = oneOff + bufferMonths * monthly - cash
    const refit =
      rule.refitLoan &&
      runningLoans.length === 1 &&
      refitOffer !== null &&
      view.company.officeStage.id !== refitOffer.stage &&
      view.monthlyRevenueCents >= refitOffer.revenueCents &&
      cash < refitOffer.cents + RESERVE_MONTHS * monthly
    const first = runningLoans.length === 0 && (need > 0 || mode !== 'careful')
    if (!first && !refit) return
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
      let items = refit
        ? plan.items.filter((x) => cfg.products[x.id]?.stage === refitOffer!.stage)
        : greedy
          ? // Everything the bank lists, temptations included; a refit is a choice of its own (L1).
            plan.items.filter((x) => !cfg.products[x.id]?.stage)
          : plan.items.filter((x) => unshipped.includes(x.id))
      const renovated =
        (view.bookings?.renovation?.renovated ?? 0) +
        (view.bookings?.renovation?.inProgress.length ?? 0)
      // A refit where no product makes it: more rooms, up to the refreshed house's eight.
      const refitRooms = refit && items.length === 0 && plan.rooms
      let roomCount = refitRooms
        ? Math.max(0, Math.min(plan.rooms!.left, REFRESH_ROOMS - renovated))
        : refit || !plan.rooms
          ? 0
          : greedy
            ? plan.rooms.left
            : Math.min(plan.rooms.left, roomsNeeded)
      if (refit && items.length === 0 && roomCount === 0) return
      const itemsCents = () =>
        items.reduce((t, x) => t + x.cents, 0) + roomCount * (plan.rooms?.centsPerRoom ?? 0)
      const wcNeed = refit
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
      const affordable = (cents: number) => money >= 3 * monthly + 13 * cents
      if (seasonal && seasonal.months!.includes(bv.month) && seasonal.running < seasonal.max) {
        const seasonalShifts = bv.contracts
          .filter((c) => c.roleId === r.id && c.kind === 'seasonal' && c.working)
          .reduce((t, c) => t + c.shifts, 0)
        if (recentAvg - seasonalShifts >= seasonal.shifts && affordable(seasonal.centsPerWeek)) {
          hire.push({ roleId: r.id, kind: 'seasonal' })
          continue
        }
      }
      const inSeason = seasonal?.months?.includes(bv.month) ?? false
      if (!inSeason || mode !== 'careful') {
        if (permanent && permanent.running < permanent.max) {
          if (steady - contracted >= permanent.shifts && affordable(permanent.centsPerWeek)) {
            hire.push({ roleId: r.id, kind: 'permanent' })
            continue
          }
        }
        if (partTime && partTime.running < partTime.max) {
          if (steady - contracted >= partTime.shifts && affordable(partTime.centsPerWeek)) {
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
    respond(view) {
      const answers = answer(view)
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
      const need =
        rule.roster === 'over'
          ? product.capacity
          : rule.roster === 'under'
            ? booked * UNDER_SHARE
            : booked * (rule.reviews ? 1 + ROSTER_MARGIN : 1)
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
        // The founder's own shifts first: they cost hours, not money.
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
        // Then contract shifts, then paid shifts, the cheapest per guest first.
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
      target = rule.tests ? (rank(view)[0]?.id ?? ids[0]!) : ids[0]!
    }

    if (target !== null) {
      const seg = target
      // Build what the market asks for, or everything. Once that is done, a second kind of
      // guest: the next segment the evidence ranks, so quiet weeks still bring someone.
      const own = wanted(view, seg)
      const done = own.every((f) => view.product.features.find((x) => x.id === f)?.shipped)
      const second = rule.tests ? rank(view).find((r) => r.id !== seg)?.id : undefined
      // More products for the same guests (other months, other days out), when one costs at
      // most a fifth of the money in hand.
      const money = view.company.cashCents + Math.max(0, view.founder.savingsCents)
      // From step 6 (loan scenarios): not a product whose stated costs eat most of its price.
      const thin = (id: string) =>
        !!scenario.loan &&
        (bv.products.find((p) => p.id === id)?.unitCostShare ?? 0) >= THIN_MARGIN_SHARE
      const more = done
        ? productsFor(seg).filter(
            (id) => (cfg.products[id]?.oneOffCents ?? 0) <= money * EXTRA_SHARE && !thin(id),
          )
        : []
      const toBuild = rule.buildAll
        ? scenario.features.map((f) => f.id)
        : done && second
          ? [...own, ...more, ...wanted(view, second)]
          : own
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
      const building = view.loan ? withRequired([...new Set([...toBuild, ...bought])]) : toBuild
      if (view.loan) {
        // Keep the bridge a long-lead market needs (the months beyond the usual buffer) as well.
        const lead = rule.naive ? 0 : (cfg.segments[seg]?.leadWeeks.max ?? 0)
        const bridge = Math.max(0, Math.ceil(lead / 4) - LOAN_BUFFER_MONTHS)
        const reserve = (RESERVE_MONTHS + bridge) * view.company.monthlyFixedCostsCents
        const shipped = (id: string) => !!view.product.features.find((x) => x.id === id)?.shipped
        planLoan(view, b, building)
        // What others require comes first, on its own: nothing sells without it.
        const required = building.filter(
          (f) => !shipped(f) && building.some((g) => cfg.products[g]?.requires === f),
        )
        const now = required.length > 0 ? required : building
        for (const f of now) {
          const cost = bought.includes(f) ? 0 : (cfg.products[f]?.oneOffCents ?? 0)
          const keep = required.length > 0 ? 0 : reserve
          if (cost > 0 && view.company.cashCents - keep < cost) continue
          b.build(f, 40 - (b.plan.build[f] ?? 0))
        }
      } else {
        for (const f of building) b.build(f, 40 - (b.plan.build[f] ?? 0))
      }
      planRenovation(view, plan, building)
      planMinStay(view, plan)
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
          const off = Math.max(100, Math.round((mean * HINT_OFF) / 100) * 100)
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

const tourism = (id: string, description: string, rule: TourismRule): Strategy => ({
  id,
  description,
  model: 'bookings',
  ...(rule.loan !== undefined || rule.refitLoan ? { needsLoan: true } : {}),
  create: (scenario) => tourismPlayer(scenario, rule),
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
    'tourism_careful',
    "Interviews every segment in week 1; in week 2 a pilot and, for a segment that books on platforms, a test listing where the interviews point. Picks the segment its evidence favours, builds a product that sells to it and what its interviewees ask for, lists on the platform where that segment books there, sets up its partnerships, builds the website and does outreach where those reach it, prices from interview budget hints (peak at their mean, off season at 85%), rosters to this week's bookings plus a tenth (taking up to two shifts itself), fixes snags, chases invoices, and turns strict only once cancellations are frequent and the calendar busy.",
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
  tourism(
    'tourism_refit_loan',
    'Plays like tourism_careful and takes a second loan for the own fit-out once guests pay about 20,000 EUR a month.',
    { ...CAREFUL_TOURISM, refitLoan: true },
  ),
]
