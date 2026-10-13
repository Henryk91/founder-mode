import type { Scenario } from '@founder-mode/content'
import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
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
}

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
/** A further product is built when its one-off cost is at most this share of the money. */
const EXTRA_SHARE = 0.2

export function tourismPlayer(scenario: Scenario, rule: TourismRule): Player {
  const cfg = scenario.bookings!
  let target: string | null = null
  let cancelledRecent: number[] = []
  let servedRecent: number[] = []

  const productsFor = (seg: string) =>
    Object.entries(cfg.products)
      .filter(([, p]) => p.serves.includes(seg))
      .map(([id]) => id)

  /** The features a segment asks for in interviews, then a product that sells to it. */
  const wanted = (view: PlayerView, seg: string): string[] => {
    const mentions = segmentNotes(scenario, view, seg).mentions.map(([f]) => f)
    const base = productsFor(seg).sort(
      (a, b) =>
        (scenario.features.find((f) => f.id === a)?.buildHours ?? 0) -
        (scenario.features.find((f) => f.id === b)?.buildHours ?? 0),
    )[0]
    return [...new Set([...(base ? [base] : []), ...mentions])]
  }

  return {
    focus: () => target,
    respond(view) {
      if (rule.inbox === 'none') return []
      if (rule.inbox === 'effort') return answerInbox(view)
      // The reader: listed answers where the bots have them, else the declared conditions.
      const listed = readInbox(view, scenario)
      const answered = new Set(listed.map((a) => a.messageId))
      let used = view.committedHours + view.forcedHours
      const extra: { messageId: string; choiceId: string }[] = []
      const rules = TOURISM_READER[scenario.id] ?? {}
      for (const m of view.inbox) {
        if (m.answeredChoiceId !== null || answered.has(m.id)) continue
        const event = scenario.events.find((e) => e.id === m.eventId)
        if (!event) continue
        const rule = rules[event.id]
        const conditional = event.choices.some((c) => c.effects.some((fx) => fx.when.length > 0))
        if (!rule && !conditional) continue
        const id = rule
          ? (rule(view, { target }) ?? event.defaultChoice)
          : fromConditions(event, view, m)
        const c = m.choices.find((x) => x.id === id)
        if (!c || id === event.defaultChoice) continue
        if (used + c.hours > view.founder.maxHoursPerWeek) continue
        extra.push({ messageId: m.id, choiceId: id })
        used += c.hours
      }
      return [...listed, ...extra]
    },
    plan(view) {
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
      for (const { productId, booked } of bv.thisWeek) {
        if (booked === 0 && rule.roster !== 'over') continue
        const product = bv.products.find((p) => p.id === productId)
        if (!product?.shipped) continue
        const need =
          rule.roster === 'over'
            ? product.capacity
            : rule.roster === 'under'
              ? booked * UNDER_SHARE
              : booked * (rule.reviews ? 1 + ROSTER_MARGIN : 1)
        let covered = 0
        // The founder's own shifts first: they cost hours, not money.
        for (const r of bv.roles) {
          const per = r.units[productId] ?? 0
          const own = Object.values(plan.founderShifts).reduce((t, n) => t + n, 0)
          if (per <= 0 || r.founderHours === null) continue
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
        // Then paid shifts, the cheapest per guest first.
        const byCost = [...bv.roles]
          .filter((r) => (r.units[productId] ?? 0) > 0)
          .sort(
            (x, y) => x.centsPerShift / x.units[productId]! - y.centsPerShift / y.units[productId]!,
          )
        for (const r of byCost) {
          const per = r.units[productId] ?? 0
          while (covered < need && (pool[r.id] ?? 0) > 0) {
            pool[r.id]!--
            plan.shifts[r.id] = (plan.shifts[r.id] ?? 0) + 1
            covered += per
          }
        }
      }

      // Week 1: listen to everyone. Week 2: a test listing and a pilot where it points.
      if (rule.tests && view.week === 1) {
        for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
      }
      if (rule.tests && view.week === 2) {
        const top = rankMarkets(scenario, view)
        if (top[0]) {
          b.presale(top[0].id)
          if ((cfg.segments[top[0].id]?.response.platform ?? 0) >= CHANNEL_USEFUL)
            b.landing(top[0].id)
        }
        for (const { id } of top.slice(0, 2)) b.interviews(id, MORE_INTERVIEWS)
      }
      if (view.week >= (rule.tests ? 3 : 1) && target === null) {
        target = rule.tests ? (rankMarkets(scenario, view)[0]?.id ?? ids[0]!) : ids[0]!
      }

      if (target !== null) {
        const seg = target
        // Build what the market asks for, or everything. Once that is done, a second kind of
        // guest: the next segment the evidence ranks, so quiet weeks still bring someone.
        const own = wanted(view, seg)
        const done = own.every((f) => view.product.features.find((x) => x.id === f)?.shipped)
        const second = rule.tests
          ? rankMarkets(scenario, view).find((r) => r.id !== seg)?.id
          : undefined
        // More products for the same guests (other months, other days out), when one costs at
        // most a fifth of the money in hand.
        const money = view.company.cashCents + Math.max(0, view.founder.savingsCents)
        const more = done
          ? productsFor(seg).filter(
              (id) => (cfg.products[id]?.oneOffCents ?? 0) <= money * EXTRA_SHARE,
            )
          : []
        const toBuild = rule.buildAll
          ? scenario.features.map((f) => f.id)
          : done && second
            ? [...own, ...more, ...wanted(view, second)]
            : own
        for (const f of toBuild) b.build(f, 40 - (b.plan.build[f] ?? 0))
        if (done && second && rule.channels === 'mix') {
          const r2 = cfg.segments[second]!.response
          if (
            r2.partnership >= CHANNEL_USEFUL &&
            !bv.partnerships.includes(second) &&
            b.free >= bv.partnershipHours + 10
          ) {
            plan.partnerships.push(second)
            b.free -= bv.partnershipHours
          }
          if (r2.platform >= CHANNEL_USEFUL && !bv.platform.listed) plan.platform = true
        }
        if (rule.reviews && view.product.bugs >= BUG_LIMIT) b.fixBugs(8)
        if (
          view.segments.find((s) => s.id === seg) &&
          segmentNotes(scenario, view, seg).interviews < 12
        ) {
          if (rule.tests) b.interviews(seg, 2)
        }

        // Channels.
        const r = cfg.segments[seg]!.response
        if (!bv.platform.listed && (rule.channels === 'platform' || r.platform >= CHANNEL_USEFUL)) {
          plan.platform = true
        }
        if (rule.channels === 'mix') {
          if (
            r.partnership >= CHANNEL_USEFUL &&
            !bv.partnerships.includes(seg) &&
            b.free >= bv.partnershipHours + 10
          ) {
            plan.partnerships.push(seg)
            b.free -= bv.partnershipHours
          }
          if (r.website >= CHANNEL_USEFUL)
            b.build(cfg.website.product, 20 - (b.plan.build[cfg.website.product] ?? 0))
          if (r.outreach >= CHANNEL_USEFUL) {
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
        const r = cfg.segments[target]!.response
        const now = plan.outreach[target] ?? 0
        const more = Math.min(cfg.outreachHoursFull - now, b.free)
        if (r.outreach >= CHANNEL_USEFUL && more > 0) {
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
    },
    observe(report) {
      let cancelled = 0
      let served = 0
      for (const e of report.entries) {
        if (e.kind === 'bookings_cancelled') cancelled += e.units
        if (e.kind === 'guests_served') served += e.units
      }
      cancelledRecent = [...cancelledRecent, cancelled].slice(-4)
      servedRecent = [...servedRecent, served].slice(-4)
    },
  }
}

const tourism = (id: string, description: string, rule: TourismRule): Strategy => ({
  id,
  description,
  model: 'bookings',
  create: (scenario) => tourismPlayer(scenario, rule),
})

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
  tourism('tourism_always_strict', 'Plays like tourism_careful with a strict policy all run.', {
    ...CAREFUL_TOURISM,
    policy: 'strict',
  }),
]
