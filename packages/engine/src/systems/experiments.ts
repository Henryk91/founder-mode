import { Rng, seedRng } from '../rng'
import type {
  Evidence,
  ExperimentEvent,
  GameState,
  InterviewEvent,
  InterviewEvidence,
  PendingExperiment,
  ReportEntry,
  SegmentId,
  WeekPlan,
} from '../types'
import { priceFactor } from './market'
import { addLeads } from './sales'

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
 * The budget quote of a segment's interview number `index`, if it has one. Drawn from its own
 * stream (seeded by the run's seed, segment and index), so budget quotes never shift the game's
 * main random sequence. The amount is honest on average and rounded like speech: to 50 EUR below
 * 1,000 EUR, to 100 EUR above.
 */
export function budgetHint(
  state: GameState,
  segmentId: SegmentId,
  index: number,
): { quoteIndex: number; amountCents: number } | null {
  const cfg = state.scenario.experiments.interview
  const quotes = state.scenario.segments.find((s) => s.id === segmentId)?.budgetQuotes ?? []
  const hidden = state.hidden.segments[segmentId]
  if (!hidden || quotes.length === 0) return null
  const r = new Rng(seedRng(`${state.seed}/budget/${segmentId}/${index}`))
  if (!r.chance(cfg.budgetChance)) return null
  const factor = Math.min(1.8, Math.max(0.4, 1 + r.normal(cfg.budgetNoiseSd)))
  const raw = hidden.wtpCents * factor
  const step =
    cfg.budgetSmallStepCents !== undefined && raw < 20_000
      ? cfg.budgetSmallStepCents
      : raw < 100_000
        ? 5_000
        : 10_000
  return {
    quoteIndex: r.int(0, quotes.length - 1),
    amountCents: Math.max(step, Math.round(raw / step) * step),
  }
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
      const asked =
        interviewsOf(state.knowledge[seg.id] ?? []).length +
        outcomes.filter((o) => o.evidence.segmentId === seg.id).length
      const budget = budgetHint(state, seg.id, asked)

      outcomes.push({
        evidence: {
          kind: 'interview',
          week: state.week,
          segmentId: seg.id,
          bucketId,
          quoteIndex,
          mentionedFeatureId,
          ...(budget ? { budget } : {}),
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

/** Pre-sale batches a market has had so far: every logged week plan, plus `plan` if given. */
export function presaleBatchesUsed(state: GameState, segmentId: string, plan?: WeekPlan): number {
  let used = plan?.presales[segmentId] ?? 0
  for (const a of state.actionLog) {
    if (a.type === 'endWeek') used += a.plan.presales[segmentId] ?? 0
  }
  return used
}

/** Landing page tests run in a market so far, plus one this plan starts there. */
export function landingTestsUsed(state: GameState, segmentId: string, plan?: WeekPlan): number {
  let used = (plan?.landing[segmentId] ?? 0) > 0 ? 1 : 0
  for (const a of state.actionLog) {
    if (a.type === 'endWeek' && (a.plan.landing[segmentId] ?? 0) > 0) used++
  }
  return used
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
        p: (landing.signupBase + landing.signupPerPain * hidden.pain) * priceFactor(state, seg.id),
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
        // Cold prospects: no leads needed.
        trials: batches * presale.batchSize,
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

/**
 * Draws the result of every experiment due this week and files it as evidence. Landing sign ups
 * become leads; every pre-sale commit pays a deposit of one month and becomes a committed lead.
 */
export function resolveExperiments(
  state: GameState,
  rng: Rng,
): { state: GameState; entries: ReportEntry[]; depositsCents: number } {
  // Tourism trials and vouchers resolve in `trials.ts` (plan 2).
  const due = state.hidden.experiments.filter(
    (e) => e.resolveWeek <= state.week && (e.kind === 'landing' || e.kind === 'presale'),
  )
  if (due.length === 0) return { state, entries: [], depositsCents: 0 }
  let depositsCents = 0
  const entries: ReportEntry[] = []
  const events: ExperimentEvent[] = []
  const knowledge = { ...state.knowledge }
  let withLeads = state
  for (const e of due) {
    const observed = rng.binomial(e.trials, e.p)
    // Sign ups who leave their details become leads, a few per test.
    const leads =
      e.kind === 'landing'
        ? Math.floor(observed / state.scenario.experiments.landing.signupsPerLead)
        : 0
    // Tourism: a test listing is a signal only, and a pilot's guests who would book again join
    // the repeat guests (their price is paid now, as a voucher).
    if (withLeads.bookings) {
      if (e.kind === 'presale' && observed > 0) {
        const b = withLeads.bookings
        withLeads = {
          ...withLeads,
          bookings: {
            ...b,
            repeatGuests: {
              ...b.repeatGuests,
              [e.segmentId]: (b.repeatGuests[e.segmentId] ?? 0) + observed,
            },
          },
        }
        depositsCents += observed * e.priceCents
      }
    } else {
      withLeads = addLeads(withLeads, e.segmentId, leads, rng, 'landing')
    }
    if (e.kind === 'presale' && observed > 0 && !withLeads.bookings) {
      const before = withLeads.leads.length
      withLeads = addLeads(withLeads, e.segmentId, observed, rng, 'presale')
      withLeads = {
        ...withLeads,
        leads: withLeads.leads.map((l, i) =>
          i < before ? l : { ...l, stage: 'committed', depositCents: e.priceCents },
        ),
      }
      depositsCents += observed * e.priceCents
    }
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
        ? {
            kind: 'landing_result',
            segmentId: e.segmentId,
            visitors: e.trials,
            signups: observed,
            leads,
          }
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
      leads: withLeads.leads,
      knowledge,
      hidden: {
        ...state.hidden,
        experiments: state.hidden.experiments.filter((e) => !due.includes(e)),
      },
      eventLog: [...state.eventLog, ...events],
    },
    entries,
    depositsCents,
  }
}
