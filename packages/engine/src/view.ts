import { monthlyFixedCostsCents, runwayKnown, runwayWeeks } from './systems/finance'
import { activeCustomers } from './systems/customers'
import { maxBugFixHours } from './systems/product'
import { canBookDemo } from './systems/sales'
import type { ChannelId, GameState, InterviewEvidence, InterviewView, PlayerView } from './types'

// Compile time check that every channel of the scenario schema is listed.
const CHANNEL_ORDER = { cold_email: 0, phone: 1, in_person: 2 } satisfies Record<ChannelId, number>
const CHANNELS = (Object.keys(CHANNEL_ORDER) as ChannelId[]).sort(
  (a, b) => CHANNEL_ORDER[a] - CHANNEL_ORDER[b],
)

/**
 * The only way game data reaches the UI. Builds every field explicitly from observable state
 * and scenario text, so nothing under `hidden`, no rng state, and no probabilities leak.
 */
export function getView(state: GameState): PlayerView {
  const { scenario, founder, company } = state
  return {
    scenarioId: state.scenarioId,
    scenarioName: scenario.name,
    seed: state.seed,
    week: state.week,
    maxWeeks: scenario.maxWeeks,
    status: state.status,
    ending: state.ending,
    founder: {
      baseHoursPerWeek: founder.baseHoursPerWeek,
      maxHoursPerWeek: founder.maxHoursPerWeek,
      energy: founder.energy,
      maxEnergy: scenario.founder.energy.max,
      savingsCents: founder.savingsCents,
      livingCostCentsPerWeek: founder.livingCostCentsPerWeek,
    },
    company: {
      cashCents: company.cashCents,
      priceCentsPerMonth: company.priceCentsPerMonth,
      fixedCosts: company.fixedCosts.map((c) => ({
        id: c.id,
        name: c.name,
        monthlyCents: c.monthlyCents,
      })),
      monthlyFixedCostsCents: monthlyFixedCostsCents(state),
      runwayWeeks: runwayWeeks(state),
      runwayKnown: runwayKnown(state),
      uiStage: company.uiStage,
    },
    costs: {
      interviewHours: scenario.experiments.interview.hours,
      demoHours: scenario.sales.demoHours,
      fixHoursPerBug: scenario.product.fixHoursPerBug,
    },
    channels: [...CHANNELS],
    product: {
      quality: state.product.quality,
      bugs: state.product.bugs,
      fixableHours: maxBugFixHours(state),
      features: scenario.features.map((def) => {
        const progress = state.product.features.find((f) => f.id === def.id)
        const shipped = progress?.shippedWeek != null
        const done = shipped ? def.buildHours : (progress?.progressHours ?? 0)
        return {
          id: def.id,
          name: def.name,
          buildHours: def.buildHours,
          progressHours: done,
          remainingHours: def.buildHours - done,
          shipped,
        }
      }),
    },
    leads: state.leads.map((l) => ({
      id: l.id,
      name: l.name,
      segmentId: l.segmentId,
      stage: l.stage,
      weeksInStage: state.week - l.stageSinceWeek,
      lastContactWeek: l.lastContactWeek,
      silent: l.silentSinceWeek !== null,
      lostReason: l.lostReason,
      canBookDemo: canBookDemo(l),
    })),
    customers: activeCustomers(state).map((c) => ({
      id: c.id,
      name: c.name,
      segmentId: c.segmentId,
      sinceWeek: c.sinceWeek,
    })),
    monthlyRevenueCents: activeCustomers(state).length * company.priceCentsPerMonth,
    segments: scenario.segments.map((seg) => ({
      id: seg.id,
      name: seg.name,
      description: seg.description,
      interviews: (state.knowledge[seg.id] ?? []).map((e) => interviewView(state, e)),
    })),
    history: state.ledger.map((l) => ({
      week: l.week,
      cashCents: l.cashEndCents,
      savingsCents: l.savingsEndCents,
    })),
  }
}

export function interviewView(state: GameState, e: InterviewEvidence): InterviewView {
  const { scenario } = state
  const bucket = scenario.experiments.interview.buckets.find((b) => b.id === e.bucketId)
  const feature = e.mentionedFeatureId
    ? scenario.features.find((f) => f.id === e.mentionedFeatureId)
    : undefined
  return {
    week: e.week,
    segmentId: e.segmentId,
    bucketId: e.bucketId,
    bucketName: bucket?.name ?? e.bucketId,
    quote: scenario.interviewQuotes[e.segmentId]?.[e.bucketId]?.[e.quoteIndex] ?? '',
    mentionedFeature: feature
      ? { id: feature.id, name: feature.name, quote: feature.mention }
      : null,
  }
}
