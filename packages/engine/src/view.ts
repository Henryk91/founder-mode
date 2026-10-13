import { loanView } from './systems/loan'
import { bookingsRevenueOrSubscriptions, bookingsView } from './systems/bookings'
import { fundingView } from './systems/funding'
import {
  interviewsOf,
  openLeadCount,
  presaleBatchesUsed,
  landingTestsUsed,
} from './systems/experiments'
import { monthlyFixedCostsCents, receivablesCents, runwayWeeks } from './systems/finance'
import { committedHours } from './systems/founder'
import { isOverdue, overdueWeeks } from './systems/invoices'
import { nextMilestone, reachedMilestones } from './systems/milestones'
import {
  bookedHours,
  freelanceWorkHours,
  freelancerIn,
  activeMembers,
  canHire,
  maxHires,
  maxMembers,
  roleTerms,
  openBooking,
  workingMembers,
} from './systems/team'
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
  FreelanceView,
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
    mode: scenario.mode ?? 'standard',
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
      tiredBelow: scenario.founder.energy.fullAt,
      lowEnergyBelow: scenario.founder.energy.lowBelow,
      burnoutWeeks: scenario.founder.energy.burnoutWeeks,
      weeksAtZeroEnergy: founder.weeksAtZeroEnergy,
      savingsCents: founder.savingsCents,
      livingCostCentsPerWeek: founder.livingCostCentsPerWeek,
      livingCostCentsPerMonth: founder.livingCostCentsPerWeek * scenario.finance.weeksPerMonth,
      nextLivingStep:
        (scenario.founder.livingSteps ?? [])
          .filter((step) => step.week > state.week)
          .map((step) => ({ week: step.week, centsPerWeek: step.centsPerWeek }))[0] ?? null,
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
      freelanceCentsPerWeek: freelanceWeekCents(state),
      runwayWeeks: runwayWeeks(state),
      uiStage: company.uiStage,
      officeStage: {
        id: company.officeStage,
        name:
          scenario.officeStages.find((o) => o.id === company.officeStage)?.name ??
          company.officeStage,
      },
      nextMonthEndWeek:
        Math.ceil(state.week / scenario.finance.weeksPerMonth) * scenario.finance.weeksPerMonth,
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
      presaleMaxBatches: scenario.experiments.presale.maxBatchesPerSegment,
      presaleRefundWeeks: scenario.experiments.presale.refundWeeks,
      followUpHours: scenario.sales.followUpHours,
      saturationHours: scenario.sales.saturationHours,
      saturationWeeks: scenario.sales.saturationWeeks,
      presaleWeeks: scenario.experiments.presale.weeks,
      chaseHours: scenario.finance.chaseHours,
      searchHours: scenario.team.searchHours,
      searchWeeks: scenario.team.searchWeeks,
      startWeeks: scenario.team.startWeeks,
      freelanceNoticeWeeks: scenario.team.freelance.noticeWeeks,
      teamMaxMembers: scenario.team.maxMembers ?? 1,
      teamMaxHires: scenario.team.maxHires ?? 1,
      managementHoursPerMember: scenario.team.managementHoursPerMember ?? 0,
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
        look: scenario.events.find((e) => e.id === m.eventId)?.look ?? 'letter',
        text: m.text,
        choices: m.choices.map((c) => ({ ...c })),
        answeredChoiceId: m.status === 'answered' ? m.choiceId : null,
      })),
    team: teamView(state),
    funding: fundingView(state),
    bookings: bookingsView(state),
    loan: loanView(state),
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
      source: l.source,
      walkInFrom:
        l.walkInFrom === undefined
          ? null
          : (scenario.officeStages.find((o) => o.id === l.walkInFrom)?.name ?? l.walkInFrom),
      channel: l.channel ?? null,
      referredBy:
        l.referredBy === undefined
          ? null
          : (state.customers.find((c) => c.id === l.referredBy)?.name ?? null),
      foundBy: l.source === 'team' ? (l.foundBy ?? state.team.members[0]?.id ?? null) : null,
    })),
    customers: activeCustomers(state).map((c) => ({
      id: c.id,
      name: c.name,
      segmentId: c.segmentId,
      sinceWeek: c.sinceWeek,
      priceCentsPerMonth: c.priceCentsPerMonth,
    })),
    customersWon: state.customers.length,
    customersLost: state.customers.filter((c) => c.churnedWeek !== null).length,
    monthlyRevenueCents: bookingsRevenueOrSubscriptions(state),
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
      presaleBatchesLeft: Math.max(
        0,
        scenario.experiments.presale.maxBatchesPerSegment - presaleBatchesUsed(state, seg.id),
      ),
      lastChannel: lastChannel(state, seg.id),
      landingTestsLeft:
        scenario.experiments.landing.maxTestsPerSegment === undefined
          ? null
          : Math.max(
              0,
              scenario.experiments.landing.maxTestsPerSegment - landingTestsUsed(state, seg.id),
            ),
    })),
    funnel: demoFunnel(state),
    milestones: { reached: reachedMilestones(state), next: nextMilestone(state) },
    history: state.ledger.map((l) => ({
      week: l.week,
      cashCents: l.cashEndCents,
      savingsCents: l.savingsEndCents,
      monthlyRevenueCents: l.monthlyRevenueCents,
      customers: l.customers,
      runwayWeeks: l.runwayWeeks,
      investmentCents: l.investmentCents,
    })),
  }
}

function teamView(state: GameState): TeamView {
  const cfg = state.scenario.team
  const { team } = state
  const impression = (id: string) => cfg.impressions.find((b) => b.id === id)?.name ?? id
  const working = new Set(workingMembers(state).map((m) => m.id))
  return {
    canSearch: team.search === null && canHire(state),
    canHire: canHire(state),
    roles: (['developer', 'salesperson'] as const).map((id) => ({
      id,
      name: cfg.roles[id].name,
      monthlyCents: cfg.roles[id].monthlyCents,
      weeklyHours: cfg.roles[id].weeklyHours,
      partTime: cfg.roles[id].partTime
        ? {
            monthlyCents: cfg.roles[id].partTime.monthlyCents,
            weeklyHours: cfg.roles[id].partTime.weeklyHours,
          }
        : null,
    })),
    search: team.search
      ? {
          role: team.search.role,
          readyWeek: team.search.readyWeek,
          partTime: team.search.partTime === true,
        }
      : null,
    candidates: team.candidates.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      impression: impression(c.impressionId),
      partTime: c.partTime === true,
    })),
    members: activeMembers(state).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      roleName: cfg.roles[m.role].name,
      monthlyCents: roleTerms(state, m).monthlyCents,
      weeklyHours: roleTerms(state, m).weeklyHours,
      partTime: m.partTime === true,
      startWeek: m.startWeek,
      working: working.has(m.id),
      letGoCostCents: Math.round(
        (roleTerms(state, m).monthlyCents * cfg.severanceWeeks) /
          state.scenario.finance.weeksPerMonth,
      ),
      managementHours: cfg.managementHoursPerMember ?? 0,
    })),
    maxMembers: maxMembers(state),
    hiresLeft: Math.max(0, maxHires(state) - team.members.length),
    freelance: freelanceView(state),
  }
}

/** The open freelance booking's bill for a week at its hours from next week, or 0. */
function freelanceWeekCents(state: GameState): number {
  const f = openBooking(state)
  if (!f) return 0
  const week = Math.max(state.week, f.startWeek)
  return bookedHours(f, week) * state.scenario.team.freelance.roles[f.role].centsPerHour
}

function freelanceView(state: GameState): FreelanceView {
  const cfg = state.scenario.team.freelance
  const f = openBooking(state)
  const week = f ? Math.max(state.week, f.startWeek) : state.week
  return {
    roles: (['developer', 'salesperson'] as const).map((id) => ({
      id,
      name: cfg.roles[id].name,
      centsPerHour: cfg.roles[id].centsPerHour,
    })),
    hoursOptions: [...cfg.hoursOptions],
    outputShare: cfg.outputShare,
    onboardingFactor: cfg.onboardingFactor,
    noticeWeeks: cfg.noticeWeeks,
    extraBugsPerFeature: cfg.extraBugsPerFeature,
    canBook: f === null || (f.endWeek !== null && f.endWeek <= state.week),
    current:
      f && (f.endWeek === null || f.endWeek >= state.week)
        ? {
            id: f.id,
            name: f.name,
            role: f.role,
            roleName: cfg.roles[f.role].name,
            hoursPerWeek: bookedHours(f, week),
            centsPerHour: cfg.roles[f.role].centsPerHour,
            centsPerWeek: bookedHours(f, week) * cfg.roles[f.role].centsPerHour,
            startWeek: f.startWeek,
            working: freelancerIn(state, state.week)?.id === f.id,
            endWeek: f.endWeek,
            nextHours: f.nextHours && f.nextHours.week > state.week ? { ...f.nextHours } : null,
            workHoursThisWeek:
              freelancerIn(state, state.week)?.id === f.id
                ? freelanceWorkHours(state, f, state.week)
                : 0,
          }
        : null,
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
    budget: e.budget
      ? {
          quote:
            scenario.segments.find((s) => s.id === e.segmentId)?.budgetQuotes[
              e.budget.quoteIndex
            ] ?? '',
          amountCents: e.budget.amountCents,
        }
      : null,
  }
}

/** Demos held and the trials they became, counted from what happened. */
function demoFunnel(state: GameState): PlayerView['funnel'] {
  let demosHeld = 0
  let trialsFromDemos = 0
  for (const e of state.eventLog) {
    if (e.kind !== 'odds' || e.odds !== 'demo') continue
    demosHeld += e.tries
    trialsFromDemos += e.observed
  }
  return { demosHeld, trialsFromDemos }
}
