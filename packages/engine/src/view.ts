import { monthlyFixedCostsCents, runwayWeeks } from './systems/finance'
import type { GameState, InterviewEvidence, InterviewView, PlayerView } from './types'

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
      uiStage: company.uiStage,
    },
    costs: { interviewHours: scenario.experiments.interview.hours },
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
