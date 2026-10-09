import type { Scenario } from '@founder-mode/content'
import type { PlayerView, WeekPlan } from '@founder-mode/engine'
import {
  bookableLeads,
  ChannelLog,
  PlanBuilder,
  segmentNotes,
  type Player,
  type Strategy,
} from '../strategy'

const FIRST_WEEK_INTERVIEWS = 6
const SECOND_WEEK_INTERVIEWS = 5
const MAX_BUILD_HOURS = 45
const BUG_LIMIT = 3
const BUG_FIX_HOURS = 8
/** Leads per hour need this many hours on a channel before the bot trusts them. */
const CHANNEL_TRIAL_HOURS = 10
/** Give up on a market after this many weeks of selling without a customer there. */
const PIVOT_AFTER_WEEKS = 12

function score(notes: ReturnType<typeof segmentNotes>): number {
  return notes.meanBucket + notes.mentionRate
}

/**
 * Interviews every market, picks the one that sounds most in pain and asks for features most,
 * builds what its interviewees asked for, then sells there on the channel that finds the most
 * leads per hour. Moves to the next market after a long stretch without a customer.
 */
export function validatingPlayer(scenario: Scenario, budget: number): Player {
  const channels = new ChannelLog()
  const abandoned = new Set<string>()
  let target: string | null = null
  let sellingSince: number | null = null
  let lastPlan: WeekPlan | null = null

  const ranked = (view: PlayerView) =>
    view.segments
      .map((s) => ({ id: s.id, notes: segmentNotes(scenario, view, s.id) }))
      .sort((a, b) => score(b.notes) - score(a.notes))

  return {
    plan(view) {
      const b = new PlanBuilder(view, budget)
      const ids = view.segments.map((s) => s.id)

      // Weeks 1 and 2: interviews only, plus building the feature everyone asks for.
      if (view.week === 1) {
        for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
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

      if (unshipped.length <= 1 && wanted.length > 0) {
        sellingSince ??= view.week
        const channel = channels.choose(target, view.channels, CHANNEL_TRIAL_HOURS)
        b.outreach(target, channel, b.free)
      }

      const customersHere = view.customers.filter((c) => c.segmentId === target).length
      if (
        sellingSince !== null &&
        view.week - sellingSince >= PIVOT_AFTER_WEEKS &&
        customersHere === 0
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
    },
  }
}

export const validateThenBuild: Strategy = {
  id: 'validate_then_build',
  description:
    'Interviews every market, builds what the most promising one asks for, sells there on its best channel, and moves on after 12 weeks without a customer.',
  create: (scenario) => validatingPlayer(scenario, 50),
}

export const overworker: Strategy = {
  id: 'overworker',
  description: 'Plays like validate_then_build, but plans 65 h every week.',
  create: (scenario) => validatingPlayer(scenario, 65),
}
