import { interviewsOf, openLeadCount } from './systems/experiments'
import { monthlyFixedCostsCents, receivablesCents, runwayWeeks } from './systems/finance'
import { committedHours } from './systems/founder'
import { isOverdue, overdueWeeks } from './systems/invoices'
import { workingMember } from './systems/team'
import { activeCustomers } from './systems/customers'
import { selectFounderNote } from './systems/guidance'
import { maxBugFixHours } from './systems/product'
import { canBookDemo, canFollowUp } from './systems/sales'
import type {
  ChannelId,
  GameState,
  InterviewEvidence,
  InterviewView,
  InvoiceStatus,
  PlayerView,
  TeamView,
} from './types'

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
      landingHours: scenario.experiments.landing.hours,
      landingBudgetsCents: [...scenario.experiments.landing.budgetsCents],
      landingVisitorCents: scenario.experiments.landing.centsPerVisitor,
      landingWeeks: scenario.experiments.landing.weeks,
      presaleHoursPerBatch: scenario.experiments.presale.hoursPerBatch,
      presaleBatchSize: scenario.experiments.presale.batchSize,
      presaleMinLeads: scenario.experiments.presale.minLeads,
      followUpHours: scenario.sales.followUpHours,
      presaleWeeks: scenario.experiments.presale.weeks,
      chaseHours: scenario.finance.chaseHours,
      searchHours: scenario.team.searchHours,
      searchWeeks: scenario.team.searchWeeks,
      startWeeks: scenario.team.startWeeks,
    },
    committedHours: committedHours(state),
    forcedHours: founder.forcedHours,
    invoices: state.invoices.map((inv) => {
      const status: InvoiceStatus =
        inv.paidWeek !== null
          ? 'paid'
          : inv.writtenOffWeek !== null
            ? 'written_off'
            : isOverdue(inv, state.week)
              ? 'overdue'
              : 'open'
      return {
        id: inv.id,
        customerName: inv.customerName,
        segmentId: inv.segmentId,
        amountCents: inv.amountCents,
        issuedWeek: inv.issuedWeek,
        dueWeek: inv.dueWeek,
        status,
        overdueWeeks: status === 'overdue' ? overdueWeeks(inv, state.week) : 0,
        paidWeek: inv.paidWeek,
        canChase: status === 'overdue',
      }
    }),
    receivablesCents: receivablesCents(state),
    inbox: state.inbox
      .filter((m) => m.status === 'open' || m.status === 'answered')
      .map((m) => ({
        id: m.id,
        eventId: m.eventId,
        week: m.week,
        expiresWeek: m.expiresWeek,
        fromRole: m.fromRole,
        fromName: m.fromName,
        text: m.text,
        choices: m.choices.map((c) => ({ ...c })),
        answeredChoiceId: m.status === 'answered' ? m.choiceId : null,
      })),
    team: teamView(state),
    pendingExperiments: state.hidden.experiments.map((e) => ({
      kind: e.kind,
      segmentId: e.segmentId,
      resolveWeek: e.resolveWeek,
    })),
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
      canFollowUp: canFollowUp(l),
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
      interviews: interviewsOf(state.knowledge[seg.id] ?? []).map((e) => interviewView(state, e)),
      landingTests: (state.knowledge[seg.id] ?? []).flatMap((e) =>
        e.kind === 'landing'
          ? [
              {
                week: e.week,
                budgetCents: e.budgetCents,
                visitors: e.visitors,
                signups: e.signups,
              },
            ]
          : [],
      ),
      presales: (state.knowledge[seg.id] ?? []).flatMap((e) =>
        e.kind === 'presale'
          ? [{ week: e.week, prospects: e.prospects, commits: e.commits, priceCents: e.priceCents }]
          : [],
      ),
      openLeads: openLeadCount(state, seg.id),
      lastChannel: lastChannel(state, seg.id),
    })),
    history: state.ledger.map((l) => ({
      week: l.week,
      cashCents: l.cashEndCents,
      savingsCents: l.savingsEndCents,
    })),
  }
}

function teamView(state: GameState): TeamView {
  const cfg = state.scenario.team
  const { team } = state
  const hired = team.members.length > 0
  const current = team.members.find((m) => m.letGoWeek === null) ?? null
  const impression = (id: string) => cfg.impressions.find((b) => b.id === id)?.name ?? id
  const monthly = (role: 'developer' | 'salesperson') => cfg.roles[role].monthlyCents
  return {
    canSearch: !hired && team.search === null,
    roles: (['developer', 'salesperson'] as const).map((id) => ({
      id,
      name: cfg.roles[id].name,
      monthlyCents: monthly(id),
    })),
    search: team.search ? { role: team.search.role, readyWeek: team.search.readyWeek } : null,
    candidates: team.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      impression: impression(c.impressionId),
    })),
    member: current
      ? {
          id: current.id,
          name: current.name,
          role: current.role,
          roleName: cfg.roles[current.role].name,
          monthlyCents: monthly(current.role),
          startWeek: current.startWeek,
          working: workingMember(state)?.id === current.id,
          letGoCostCents: Math.round(
            (monthly(current.role) * cfg.severanceWeeks) / state.scenario.finance.weeksPerMonth,
          ),
        }
      : null,
    hadHire: hired && current === null,
  }
}

/** The outreach channel of the latest plan that had one for this segment. */
function lastChannel(state: GameState, segmentId: string): ChannelId | null {
  for (let i = state.actionLog.length - 1; i >= 0; i--) {
    const action = state.actionLog[i]
    const out = action?.type === 'endWeek' ? action.plan.outreach[segmentId] : undefined
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
