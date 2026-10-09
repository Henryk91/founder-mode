import type { Rng } from '../rng'
import type {
  Evidence,
  ExperimentEvent,
  GameState,
  InterviewEvent,
  InterviewEvidence,
  PendingExperiment,
  ReportEntry,
  WeekPlan,
} from '../types'
import { priceFactor } from './market'

export const interviewsOf = (list: readonly Evidence[]): InterviewEvidence[] =>
  list.filter((e): e is InterviewEvidence => e.kind === 'interview')

export type InterviewOutcome = {
  evidence: InterviewEvidence
  event: InterviewEvent
}

/** Maps an observed interview value to the first bucket whose upper bound it stays below. */
export function bucketFor(state: GameState, observed: number): string {
  const buckets = state.scenario.experiments.interview.buckets
  const bucket = buckets.find((b) => b.below === undefined || observed < b.below)
  if (!bucket) throw new Error('Interview buckets must end with an unbounded bucket')
  return bucket.id
}

/**
 * Index of a quote for a new interview: one not heard before in this segment and bucket, else
 * one not heard this week, else any. So no quote repeats within a week while the bucket has
 * enough of them, and a run goes through every quote before repeating.
 */
function pickQuote(
  count: number,
  heard: readonly InterviewEvidence[],
  segmentId: string,
  bucketId: string,
  week: number,
  rng: Rng,
): number {
  const same = heard.filter((e) => e.segmentId === segmentId && e.bucketId === bucketId)
  const all = Array.from({ length: count }, (_, i) => i)
  const unheard = all.filter((i) => !same.some((e) => e.quoteIndex === i))
  if (unheard.length > 0) return rng.pick(unheard)
  const notThisWeek = all.filter((i) => !same.some((e) => e.week === week && e.quoteIndex === i))
  return rng.pick(notThisWeek.length > 0 ? notThisWeek : all)
}

/**
 * Runs the planned interviews (plan section 4.4). Each interview reads
 * `pain + politeness * (1 - interviewing) + N(0, sd)`, shows only the bucket and a quote, and
 * raises the interviewing skill. Segments run in scenario order, so the plan's key order does
 * not matter.
 */
export function runInterviews(
  state: GameState,
  plan: WeekPlan,
  rng: Rng,
): { state: GameState; outcomes: InterviewOutcome[] } {
  const cfg = state.scenario.experiments.interview
  let interviewing = state.founder.skills.interviewing
  const outcomes: InterviewOutcome[] = []

  for (const seg of state.scenario.segments) {
    const count = plan.interviews[seg.id] ?? 0
    const hidden = state.hidden.segments[seg.id]
    if (!hidden) throw new Error(`Unknown segment ${seg.id}`)
    for (let i = 0; i < count; i++) {
      const expected = hidden.pain + hidden.politeness * (1 - interviewing)
      const observed = expected + rng.normal(cfg.noiseSd)
      const bucketId = bucketFor(state, observed)
      const quotes = state.scenario.interviewQuotes[seg.id]?.[bucketId] ?? []
      const quoteIndex = pickQuote(
        quotes.length,
        [...interviewsOf(state.knowledge[seg.id] ?? []), ...outcomes.map((o) => o.evidence)],
        seg.id,
        bucketId,
        state.week,
        rng,
      )
      const mentions = rng.chance(cfg.mentionBase + cfg.mentionPerPain * hidden.pain)
      const mentionedFeatureId = mentions ? rng.pick(hidden.mustHave) : null

      outcomes.push({
        evidence: {
          kind: 'interview',
          week: state.week,
          segmentId: seg.id,
          bucketId,
          quoteIndex,
          mentionedFeatureId,
        },
        event: { kind: 'interview', week: state.week, segmentId: seg.id, expected, observed },
      })
      interviewing = Math.min(cfg.skillCap, interviewing + cfg.skillGain)
    }
  }

  if (outcomes.length === 0) return { state, outcomes }

  const knowledge = { ...state.knowledge }
  for (const { evidence } of outcomes) {
    knowledge[evidence.segmentId] = [...(knowledge[evidence.segmentId] ?? []), evidence]
  }
  return {
    state: {
      ...state,
      founder: { ...state.founder, skills: { ...state.founder.skills, interviewing } },
      knowledge,
      eventLog: [...state.eventLog, ...outcomes.map((o) => o.event)],
    },
    outcomes,
  }
}

/** Leads of a segment that are still in play: not lost and not yet customers. */
export function openLeadCount(state: GameState, segmentId: string): number {
  return state.leads.filter(
    (l) => l.segmentId === segmentId && l.stage !== 'lost' && l.stage !== 'paying',
  ).length
}

/**
 * Starts the planned landing page tests and pre-sales (plan section 4.4). The chance per visitor
 * or prospect is fixed now, at today's price, and the draws happen when the result is due.
 * Segments run in scenario order. The ad budget is paid by the finance step.
 */
export function startExperiments(state: GameState, plan: WeekPlan): GameState {
  const { landing, presale } = state.scenario.experiments
  const started: PendingExperiment[] = []
  for (const seg of state.scenario.segments) {
    const hidden = state.hidden.segments[seg.id]
    if (!hidden) throw new Error(`Unknown segment ${seg.id}`)
    const budget = plan.landing[seg.id] ?? 0
    if (budget > 0) {
      started.push({
        kind: 'landing',
        segmentId: seg.id,
        startWeek: state.week,
        resolveWeek: state.week + landing.weeks,
        trials: Math.floor(budget / landing.centsPerVisitor),
        p: landing.signupBase + landing.signupPerPain * hidden.pain,
        budgetCents: budget,
        priceCents: state.company.priceCentsPerMonth,
      })
    }
    const batches = plan.presales[seg.id] ?? 0
    if (batches > 0) {
      started.push({
        kind: 'presale',
        segmentId: seg.id,
        startWeek: state.week,
        resolveWeek: state.week + presale.weeks,
        // A batch with fewer leads than its size has that many prospects.
        trials: Math.min(batches * presale.batchSize, openLeadCount(state, seg.id)),
        p: presale.commitRate * hidden.pain * priceFactor(state, seg.id),
        budgetCents: 0,
        priceCents: state.company.priceCentsPerMonth,
      })
    }
  }
  if (started.length === 0) return state
  return {
    ...state,
    hidden: { ...state.hidden, experiments: [...state.hidden.experiments, ...started] },
  }
}

/** Draws the result of every experiment due this week and files it as evidence. */
export function resolveExperiments(
  state: GameState,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const due = state.hidden.experiments.filter((e) => e.resolveWeek <= state.week)
  if (due.length === 0) return { state, entries: [] }
  const entries: ReportEntry[] = []
  const events: ExperimentEvent[] = []
  const knowledge = { ...state.knowledge }
  for (const e of due) {
    const observed = rng.binomial(e.trials, e.p)
    events.push({
      kind: e.kind,
      week: state.week,
      segmentId: e.segmentId,
      expected: e.trials * e.p,
      observed,
    })
    const evidence: Evidence =
      e.kind === 'landing'
        ? {
            kind: 'landing',
            week: state.week,
            segmentId: e.segmentId,
            budgetCents: e.budgetCents,
            visitors: e.trials,
            signups: observed,
          }
        : {
            kind: 'presale',
            week: state.week,
            segmentId: e.segmentId,
            prospects: e.trials,
            commits: observed,
            priceCents: e.priceCents,
          }
    knowledge[e.segmentId] = [...(knowledge[e.segmentId] ?? []), evidence]
    entries.push(
      e.kind === 'landing'
        ? { kind: 'landing_result', segmentId: e.segmentId, visitors: e.trials, signups: observed }
        : {
            kind: 'presale_result',
            segmentId: e.segmentId,
            prospects: e.trials,
            commits: observed,
          },
    )
  }
  return {
    state: {
      ...state,
      knowledge,
      hidden: {
        ...state.hidden,
        experiments: state.hidden.experiments.filter((e) => e.resolveWeek > state.week),
      },
      eventLog: [...state.eventLog, ...events],
    },
    entries,
  }
}
