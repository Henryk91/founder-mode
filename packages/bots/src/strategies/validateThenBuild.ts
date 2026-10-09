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

const FIRST_WEEK_INTERVIEWS = 4
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
/** How much a landing page sign up rate counts next to the interview score. */
const LANDING_WEIGHT = 4

/** Share of landing page visitors who signed up, over all tests in a market. */
function landingRate(view: PlayerView, segmentId: string): number {
  const tests = view.segments.find((s) => s.id === segmentId)?.landingTests ?? []
  const visitors = tests.reduce((t, x) => t + x.visitors, 0)
  return visitors ? tests.reduce((t, x) => t + x.signups, 0) / visitors : 0
}

function score(notes: ReturnType<typeof segmentNotes>, landing: number): number {
  return notes.meanBucket + notes.mentionRate + LANDING_WEIGHT * landing
}

/**
 * Interviews every market and runs a small landing page test in each, picks the one that sounds
 * most in pain, signs up most visitors and asks for features most, builds what its interviewees
 * asked for, then sells there on the channel that finds the most leads per hour. Runs pre-sales
 * once it has enough leads. Does the books and chases late invoices every week. Moves to the next
 * market after a long stretch without a customer, or when pre-sales find nobody who pays.
 */
export function validatingPlayer(
  scenario: Scenario,
  budget: number,
  pricing: PricingRule | null = null,
): Player {
  const channels = new ChannelLog()
  const prices = pricing ? new PriceSearch(pricing) : null
  let lastView: PlayerView | null = null
  const abandoned = new Set<string>()
  let target: string | null = null
  let sellingSince: number | null = null
  let lastPlan: WeekPlan | null = null

  const ranked = (view: PlayerView) =>
    view.segments
      .map((s) => ({
        id: s.id,
        notes: segmentNotes(scenario, view, s.id),
        landing: landingRate(view, s.id),
      }))
      .sort((a, b) => score(b.notes, b.landing) - score(a.notes, a.landing))

  return {
    plan(view) {
      const b = new PlanBuilder(view, budget)
      const ids = view.segments.map((s) => s.id)
      lastView = view
      if (prices) b.price(prices.price(view))
      b.bookkeeping()
      b.chase(CHASE_PER_WEEK)

      // Weeks 1 and 2: interviews only, plus building the feature everyone asks for.
      if (view.week === 1) {
        for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
        for (const id of ids) b.landing(id)
        lastPlan = b.plan
        return b.plan
      }
      if (view.week === 2) {
        for (const { id } of ranked(view).slice(0, 2)) b.interviews(id, SECOND_WEEK_INTERVIEWS)
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

      if (target === null) target = ranked(view).find((r) => !abandoned.has(r.id))?.id ?? ids[0]!
      const notes = segmentNotes(scenario, view, target)
      const wanted = notes.mentions.map(([f]) => f)
      const unshipped = wanted.filter(
        (f) => !view.product.features.find((x) => x.id === f)?.shipped,
      )

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
        prospects >= MAX_PRESALE_BATCHES * view.costs.presaleBatchSize && commits === 0

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

export const validateThenBuild: Strategy = {
  id: 'validate_then_build',
  description:
    'Interviews every market and runs a small landing page test in each, builds what the most promising one asks for, sells there on its best channel, runs two pre-sale batches, and moves on after 12 weeks without a customer or two pre-sale batches without a commitment. Does the books and chases three late invoices a week.',
  create: (scenario) => validatingPlayer(scenario, 50),
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
