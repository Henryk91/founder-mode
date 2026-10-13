import type { Scenario } from '@founder-mode/content'
import type { BookingsPlan, PlayerView } from '@founder-mode/engine'
import { budgetHints } from '../pricing'
import { PlanBuilder, segmentNotes, type Player, type Strategy } from '../strategy'
import { fromConditions, rankMarkets, readInbox } from './validateThenBuild'

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
/** Founder shifts a week at most, so selling and building still get hours. */
const FOUNDER_SHIFTS = 2
const OUTREACH_HOURS = 6
/** A channel counts as reaching a segment from this stated strength. */
const CHANNEL_USEFUL = 0.3
/** Price from the budget hints: peak and off season, as shares of their mean. */
const HINT_PEAK = 1.0
const HINT_OFF = 0.85
const MIN_HINTS = 2
/** Strict policy once this share of last month's guests cancelled and the calendar is busy. */
const STRICT_CANCEL_SHARE = 0.12
const BUSY_SHARE = 0.7
const BUG_LIMIT = 2

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
      // The reader: listed answers where the bots have them, else the declared conditions.
      const listed = readInbox(view, scenario)
      const answered = new Set(listed.map((a) => a.messageId))
      let used = view.committedHours + view.forcedHours
      const extra: { messageId: string; choiceId: string }[] = []
      for (const m of view.inbox) {
        if (m.answeredChoiceId !== null || answered.has(m.id)) continue
        const event = scenario.events.find((e) => e.id === m.eventId)
        if (!event || !event.choices.some((c) => c.effects.some((fx) => fx.when.length > 0)))
          continue
        const id = fromConditions(event, view, m)
        const c = m.choices.find((x) => x.id === id)
        if (!c || id === event.defaultChoice) continue
        if (used + c.hours > view.founder.maxHoursPerWeek) continue
        extra.push({ messageId: m.id, choiceId: id })
        used += c.hours
      }
      return [...listed, ...extra]
    },
    plan(view) {
      const b = new PlanBuilder(view, 50)
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
        for (const r of bv.roles) {
          const per = r.units[productId] ?? 0
          if (per <= 0) continue
          // The founder takes a shift or two first: it costs hours, not money.
          while (
            covered < need &&
            r.founderHours !== null &&
            (plan.founderShifts[r.id] ?? 0) < FOUNDER_SHIFTS &&
            b.free >= r.founderHours + 20
          ) {
            plan.founderShifts[r.id] = (plan.founderShifts[r.id] ?? 0) + 1
            b.free -= r.founderHours
            covered += per
          }
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
        // Build what the market asks for, or everything.
        const toBuild = rule.buildAll ? scenario.features.map((f) => f.id) : wanted(view, seg)
        for (const f of toBuild) b.build(f, 40 - (b.plan.build[f] ?? 0))
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

        // Prices: from what interviewees said they pay, per season.
        if (rule.pricing === 'hints') {
          const hints = budgetHints(view, seg)
          if (hints.length >= MIN_HINTS) {
            const mean = hints.reduce((t, x) => t + x, 0) / hints.length
            const peak = Math.max(100, Math.round((mean * HINT_PEAK) / 100) * 100)
            const off = Math.max(100, Math.round((mean * HINT_OFF) / 100) * 100)
            const now = bv.prices[seg]
            if (!now || now.peak !== peak || now.off !== off) plan.prices[seg] = { peak, off }
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
  tourism('tourism_always_strict', 'Plays like tourism_careful with a strict policy all run.', {
    ...CAREFUL_TOURISM,
    policy: 'strict',
  }),
]
