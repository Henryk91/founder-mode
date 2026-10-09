import type { Scenario } from '@founder-mode/content'
import type { PlayerView, WeekPlan } from '@founder-mode/engine'
import { PriceSearch, type PricingRule } from '../pricing'
import {
  bookableLeads,
  ChannelLog,
  PlanBuilder,
  segmentNotes,
  type Player,
  type Strategy,
} from '../strategy'

const FIRST_WEEK_INTERVIEWS = 8
const SECOND_WEEK_INTERVIEWS = 5
const MAX_BUILD_HOURS = 45
const BUG_LIMIT = 3
const BUG_FIX_HOURS = 8
/** Leads per hour need this many hours on a channel before the bot trusts them. */
const CHANNEL_TRIAL_HOURS = 10
/** Give up on a market after this many weeks of selling without a customer there. */
const PIVOT_AFTER_WEEKS = 12
/** Overdue invoices chased per week. */
const CHASE_PER_WEEK = 3
/** Pre-sale batches run in the chosen market, and the batches without a commitment that end it. */
const MAX_PRESALE_BATCHES = 2
/** How much the landing page sign up rate, above or below the bar, counts next to interviews. */
const LANDING_WEIGHT = 4
/** Share of landing page visitors who must sign up for the market to stay interesting. */
const LANDING_BAR = 0.07

/** Inbox policy limits: hours per message, hours per week, and how much cash may be spent. */
const MESSAGE_HOURS_MAX = 6
const MESSAGE_HOURS_PER_WEEK = 8
const MESSAGE_CASH_SHARE = 0.1
const MESSAGE_CASH_FLOOR_CENTS = 300_000

/** The four behaviours added in Phase 4, each of which can be switched off to measure it. */
export type Behaviours = {
  inbox: boolean
  chase: boolean
  landing: boolean
  books: boolean
  /** Makes the one hire once monthly revenue covers the salary. */
  hire: boolean
}

export const ALL_BEHAVIOURS: Behaviours = {
  inbox: true,
  chase: true,
  landing: true,
  books: true,
  hire: false,
}

/** Share of landing page visitors who signed up, over all tests in a market, or null. */
function landingRate(view: PlayerView, segmentId: string): number | null {
  const tests = view.segments.find((s) => s.id === segmentId)?.landingTests ?? []
  const visitors = tests.reduce((t, x) => t + x.visitors, 0)
  return visitors ? tests.reduce((t, x) => t + x.signups, 0) / visitors : null
}

function score(notes: ReturnType<typeof segmentNotes>, landing: number | null): number {
  const adjust = landing === null ? 0 : LANDING_WEIGHT * (landing - LANDING_BAR)
  return notes.meanBucket + notes.mentionRate + adjust
}

/**
 * The inbox policy, using only what the message shows: hours, money now and money per month.
 * For each open message, take the eligible choice that asks the most effort, where eligible means
 * no monthly cost, at most 6 h (8 h a week in all), and money only while it is at most a tenth of
 * the cash and leaves 3,000 EUR. A message whose best choice costs nothing is left alone, so its
 * free default happens.
 */
export function answerInbox(view: PlayerView): { messageId: string; choiceId: string }[] {
  const answers: { messageId: string; choiceId: string }[] = []
  let used = view.committedHours
  const cash = view.company.cashCents
  for (const m of view.inbox) {
    if (m.answeredChoiceId !== null) continue
    const eligible = m.choices.filter(
      (c) =>
        c.monthlyCostCents === 0 &&
        c.hours <= MESSAGE_HOURS_MAX &&
        used + c.hours <= MESSAGE_HOURS_PER_WEEK &&
        used + c.hours + view.forcedHours <= view.founder.maxHoursPerWeek &&
        (c.costCents === 0 ||
          (c.costCents <= cash * MESSAGE_CASH_SHARE &&
            cash - c.costCents >= MESSAGE_CASH_FLOOR_CENTS)),
    )
    eligible.sort((a, b) => b.hours - a.hours || a.costCents - b.costCents)
    const best = eligible[0]
    if (!best || (best.hours === 0 && best.costCents === 0)) continue
    answers.push({ messageId: m.id, choiceId: best.id })
    used += best.hours
  }
  return answers
}

/**
 * Interviews every market, then runs one landing page test on the market its interviews favour
 * and drops that market if too few visitors sign up. Picks the market that sounds most in pain,
 * signs up visitors and asks for features most, builds what its interviewees asked for, then sells
 * there on the channel that finds the most leads per hour. Runs pre-sales once it has enough
 * leads. Answers the inbox by `answerInbox`, does the books, and chases late invoices. Moves to
 * the next market after a long stretch without a customer, or when pre-sales find nobody who
 * pays. With `hire` it makes the one hire once revenue covers the salary.
 */
export function validatingPlayer(
  scenario: Scenario,
  budget: number,
  pricing: PricingRule | null = null,
  behaviours: Behaviours = ALL_BEHAVIOURS,
): Player {
  const channels = new ChannelLog()
  const prices = pricing ? new PriceSearch(pricing) : null
  let lastView: PlayerView | null = null
  const abandoned = new Set<string>()
  let target: string | null = null
  let sellingSince: number | null = null
  let lastPlan: WeekPlan | null = null
  const impressionOrder = scenario.team.impressions.map((i) => i.name)

  const ranked = (view: PlayerView) =>
    view.segments
      .map((s) => ({
        id: s.id,
        notes: segmentNotes(scenario, view, s.id),
        landing: landingRate(view, s.id),
      }))
      .sort((a, b) => score(b.notes, b.landing) - score(a.notes, a.landing))

  /** The one hire: search when revenue covers the salary, hire the best impression, put them to work. */
  const staffing = (b: PlanBuilder, view: PlayerView, wanted: string[], market: string | null) => {
    const team = view.team
    const unshipped = wanted.filter((f) => !view.product.features.find((x) => x.id === f)?.shipped)
    if (team.candidates.length > 0 && !team.member) {
      const best = [...team.candidates].sort(
        (x, y) => impressionOrder.indexOf(y.impression) - impressionOrder.indexOf(x.impression),
      )[0]
      if (best) b.plan.hire = best.id
    } else if (team.canSearch && team.candidates.length === 0 && !team.hadHire) {
      const role = unshipped.length > 0 ? 'developer' : 'salesperson'
      const salary = team.roles.find((r) => r.id === role)?.monthlyCents ?? Infinity
      if (view.monthlyRevenueCents >= salary && b.free >= view.costs.searchHours) {
        b.plan.searchRole = role
        b.free -= view.costs.searchHours
      }
    }
    if (team.member?.working && team.member.role === 'developer') {
      const next = unshipped[0] ?? view.product.features.find((f) => !f.shipped)?.id
      b.plan.teamBuild = next ?? null
    }
    if (team.member?.working && team.member.role === 'salesperson' && market) {
      b.plan.teamOutreach = {
        segmentId: market,
        channel: channels.choose(market, view.channels, 0),
      }
    }
  }

  return {
    respond: (view) => (behaviours.inbox ? answerInbox(view) : []),
    plan(view) {
      const b = new PlanBuilder(view, budget)
      const ids = view.segments.map((s) => s.id)
      lastView = view
      if (prices) b.price(prices.price(view))
      if (behaviours.books) b.bookkeeping()
      if (behaviours.chase) b.chase(CHASE_PER_WEEK)

      // Week 1: interviews only. Week 2: a landing page test where the interviews point, more
      // interviews there, and the feature everyone asks for.
      if (view.week === 1) {
        for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
        lastPlan = b.plan
        return b.plan
      }
      if (view.week === 2) {
        const top = ranked(view)
        if (behaviours.landing && top[0]) b.landing(top[0].id)
        for (const { id } of top.slice(0, 2)) b.interviews(id, SECOND_WEEK_INTERVIEWS)
        const all = new Map<string, number>()
        for (const id of ids) {
          for (const [f, n] of segmentNotes(scenario, view, id).mentions) {
            all.set(f, (all.get(f) ?? 0) + n)
          }
        }
        const common = [...all.entries()].sort((x, y) => y[1] - x[1])[0]
        if (common) b.build(common[0], MAX_BUILD_HOURS)
        lastPlan = b.plan
        return b.plan
      }

      // A market where the landing page test drew too few sign ups is out.
      for (const s of view.segments) {
        const rate = landingRate(view, s.id)
        if (rate !== null && rate < LANDING_BAR && !abandoned.has(s.id)) {
          abandoned.add(s.id)
          if (target === s.id) {
            target = null
            sellingSince = null
          }
        }
      }
      if (target === null) {
        target =
          ranked(view).find((r) => !abandoned.has(r.id))?.id ?? ranked(view)[0]?.id ?? ids[0]!
      }
      const notes = segmentNotes(scenario, view, target)
      const wanted = notes.mentions.map(([f]) => f)
      const unshipped = wanted.filter(
        (f) => !view.product.features.find((x) => x.id === f)?.shipped,
      )

      if (behaviours.hire) staffing(b, view, wanted, target)
      b.demos(bookableLeads(view, target))
      b.demos(bookableLeads(view))
      if (view.product.bugs >= BUG_LIMIT) b.fixBugs(BUG_FIX_HOURS)
      // Keep listening until a few different features have come up.
      if (wanted.length < 3 && notes.interviews < 20) b.interviews(target, 3)
      for (const f of unshipped) b.build(f, MAX_BUILD_HOURS - (b.plan.build[f] ?? 0))

      // Pre-sales measure what prospects do. Nobody commits in two batches: this market is out.
      const sales = view.segments.find((s) => s.id === target)?.presales ?? []
      const waiting = view.pendingExperiments.some(
        (e) => e.kind === 'presale' && e.segmentId === target,
      )
      if (sales.length < MAX_PRESALE_BATCHES && !waiting) b.presale(target)
      const prospects = sales.reduce((t, x) => t + x.prospects, 0)
      const commits = sales.reduce((t, x) => t + x.commits, 0)
      const refuted =
        sales.length >= MAX_PRESALE_BATCHES &&
        prospects >= view.costs.presaleMinLeads &&
        commits === 0

      if (unshipped.length <= 1 && wanted.length > 0) {
        sellingSince ??= view.week
        const channel = channels.choose(target, view.channels, CHANNEL_TRIAL_HOURS)
        b.outreach(target, channel, b.free)
      }

      const customersHere = view.customers.filter((c) => c.segmentId === target).length
      if (
        refuted ||
        (sellingSince !== null &&
          view.week - sellingSince >= PIVOT_AFTER_WEEKS &&
          customersHere === 0)
      ) {
        abandoned.add(target)
        target = null
        sellingSince = null
      }
      lastPlan = b.plan
      return b.plan
    },
    observe(report) {
      if (lastPlan) channels.record(lastPlan, report)
      if (prices && lastView) prices.observe(lastView, report)
    },
  }
}

const DESCRIPTION =
  'Interviews every market, runs one landing page test on the market its interviews favour (and drops it below 7% sign ups), builds what that market asks for, sells on its best channel, runs up to two pre-sale batches, and moves on after 12 weeks without a customer or two pre-sale batches without a commitment. Does the books, chases three late invoices a week, and answers the inbox by the policy in `answerInbox`.'

export const validateThenBuild: Strategy = {
  id: 'validate_then_build',
  description: DESCRIPTION,
  create: (scenario) => validatingPlayer(scenario, 50),
}

export const validateThenBuildHire: Strategy = {
  id: 'validate_then_build_hire',
  description:
    'Plays like validate_then_build, and makes the one hire (a developer while wanted features are unbuilt, else a salesperson) once monthly revenue covers that salary, choosing the best impression.',
  create: (scenario) => validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, hire: true }),
}

/** The four behaviours, for leave-one-out runs. */
export const BEHAVIOUR_NAMES = ['inbox', 'chase', 'landing', 'books'] as const
export type BehaviourName = (typeof BEHAVIOUR_NAMES)[number]

/** A variant of a base strategy with some behaviours switched off, for the report. */
export function withoutBehaviours(
  base: { id: string; hire: boolean },
  off: readonly BehaviourName[],
): Strategy {
  const behaviours: Behaviours = { ...ALL_BEHAVIOURS, hire: base.hire }
  for (const name of off) behaviours[name] = false
  return {
    id: `${base.id} -${off.join(' -')}`,
    description: `${base.id} without ${off.join(', ')}.`,
    create: (scenario) => validatingPlayer(scenario, 50, null, behaviours),
  }
}

export const PRICE_RULE: PricingRule = { stepCents: 10_000, window: 4, threshold: 0.4 }

export const priceAware: Strategy = {
  id: 'price_aware',
  description:
    'Plays like validate_then_build and raises the price by 100 EUR after every 4 trial results at a price of which at least 40% became customers. Below that it goes back one step and stays.',
  create: (scenario) => validatingPlayer(scenario, 50, PRICE_RULE),
}

export const overworker: Strategy = {
  id: 'overworker',
  description: 'Plays like validate_then_build, but plans 65 h every week.',
  create: (scenario) => validatingPlayer(scenario, 65),
}
