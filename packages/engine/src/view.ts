import { monthlyFixedCostsCents, runwayWeeks } from './systems/finance'
import { activeCustomers } from './systems/customers'
import { selectFounderNote } from './systems/guidance'
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
      lowEnergyBelow: scenario.founder.energy.lowBelow,
      burnoutWeeks: scenario.founder.energy.burnoutWeeks,
      weeksAtZeroEnergy: founder.weeksAtZeroEnergy,
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
    costs: {
      interviewHours: scenario.experiments.interview.hours,
      demoHours: scenario.sales.demoHours,
      fixHoursPerBug: scenario.product.fixHoursPerBug,
      trialWeeks: scenario.sales.trialWeeks,
    },
    guidance: {
      intro: scenario.intro.cards.map((c) => ({ id: c.id, title: c.title, body: c.body })),
      founderNote: selectFounderNote(state),
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
      priceCentsPerMonth: c.priceCentsPerMonth,
    })),
    monthlyRevenueCents: activeCustomers(state).reduce((sum, c) => sum + c.priceCentsPerMonth, 0),
    segments: scenario.segments.map((seg) => ({
      id: seg.id,
      name: seg.name,
      description: seg.description,
      interviews: (state.knowledge[seg.id] ?? []).map((e) => interviewView(state, e)),
      lastChannel: lastChannel(state, seg.id),
    })),
    history: state.ledger.map((l) => ({
      week: l.week,
      cashCents: l.cashEndCents,
      savingsCents: l.savingsEndCents,
    })),
  }
}

/** The outreach channel of the latest plan that had one for this segment. */
function lastChannel(state: GameState, segmentId: string): ChannelId | null {
  for (let i = state.actionLog.length - 1; i >= 0; i--) {
    const out = state.actionLog[i]?.plan.outreach[segmentId]
    if (out) return out.channel
  }
  return null
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
