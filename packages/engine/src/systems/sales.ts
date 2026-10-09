import type { Rng } from '../rng'
import type {
  Customer,
  GameState,
  Lead,
  LeadChange,
  ReportEntry,
  SegmentId,
  WeekPlan,
} from '../types'
import { isMonthEnd } from './finance'
import { energyFactor } from './founder'
import { fit, priceFactor } from './market'

/** A lead can take part in a demo when it asked for one and is still answering. */
export function canBookDemo(lead: Lead): boolean {
  return lead.stage === 'demo' && lead.silentSinceWeek === null
}

type NameParts = { first: readonly string[]; second: readonly string[] }

/**
 * A company name no lead has yet: one word from each list, joined by a space. A few random
 * tries find a free one while most are free; after that, a pick among all free combinations.
 */
export function pickName(parts: NameParts, used: ReadonlySet<string>, rng: Rng): string {
  const { first, second } = parts
  if (first.length === 0 || second.length === 0) {
    throw new Error('No company names for this segment')
  }
  for (let tries = 0; tries < 8; tries++) {
    const name = `${rng.pick(first)} ${rng.pick(second)}`
    if (!used.has(name)) return name
  }
  const free = first.flatMap((a) => second.map((b) => `${a} ${b}`)).filter((n) => !used.has(n))
  if (free.length > 0) return rng.pick(free)
  // Every combination is taken, far beyond what a run produces. Stay distinguishable anyway.
  const base = `${rng.pick(first)} ${rng.pick(second)}`
  let n = 2
  while (used.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

/** floor(x), plus one more with probability equal to the fraction. */
function randomRound(x: number, rng: Rng): number {
  const whole = Math.floor(x)
  return whole + (rng.chance(x - whole) ? 1 : 0)
}

/**
 * Sales step (plan section 4.5), in this order, leads in list order:
 * 1. demos held this week: the lead becomes a trial or is lost,
 * 2. trials that ran their course: the lead becomes a paying customer or is lost,
 * 3. open leads agree to a demo,
 * 4. silent leads are lost after a while, untouched open leads may go silent,
 * 5. outreach finds new leads.
 */
export function applySales(
  state: GameState,
  plan: WeekPlan,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const cfg = state.scenario.sales
  const week = state.week
  const entries: ReportEntry[] = []
  const leads: Lead[] = state.leads.map((l) => ({ ...l }))
  const customers: Customer[] = [...state.customers]
  const demoIds = new Set(plan.demos)
  const touched = new Set<string>()
  let selling = state.founder.skills.selling
  const sellingAtStart = selling
  // Energy after this week's hours (step 3 runs first): a tired founder sells worse.
  const tired = energyFactor(state.founder, state.scenario)

  const update = (lead: Lead, change: LeadChange) =>
    entries.push({
      kind: 'lead_update',
      change,
      leadId: lead.id,
      name: lead.name,
      segmentId: lead.segmentId,
    })
  const lose = (lead: Lead, reason: 'declined' | 'silent') => {
    lead.stage = 'lost'
    lead.stageSinceWeek = week
    lead.lostReason = reason
  }

  // 1. Demos
  for (const lead of leads) {
    if (!demoIds.has(lead.id)) continue
    selling = Math.min(cfg.skillCap, selling + cfg.skillGainPerDemo)
    lead.lastContactWeek = week
    touched.add(lead.id)
    const p = (cfg.demoToTrialBase + cfg.demoToTrialPerFit * fit(state, lead.segmentId)) * tired
    if (rng.chance(p)) {
      lead.stage = 'trial'
      lead.stageSinceWeek = week
      update(lead, 'trial_started')
    } else {
      lose(lead, 'declined')
      update(lead, 'declined')
    }
  }

  // 2. Trials
  for (const lead of leads) {
    if (lead.stage !== 'trial' || week - lead.stageSinceWeek < cfg.trialWeeks) continue
    const p = fit(state, lead.segmentId) * priceFactor(state, lead.segmentId) * tired
    if (rng.chance(p)) {
      lead.stage = 'paying'
      lead.stageSinceWeek = week
      lead.lastContactWeek = week
      customers.push({
        id: `customer_${customers.length + 1}`,
        leadId: lead.id,
        name: lead.name,
        segmentId: lead.segmentId,
        sinceWeek: week,
        churnedWeek: null,
        priceCentsPerMonth: state.company.priceCentsPerMonth,
      })
      update(lead, 'won')
    } else {
      lose(lead, 'declined')
      update(lead, 'declined')
    }
  }

  // 3. Open leads agree to a demo
  for (const lead of leads) {
    if (lead.stage !== 'lead' || lead.silentSinceWeek !== null) continue
    const pain = state.hidden.segments[lead.segmentId]?.pain ?? 0
    const p = cfg.leadToDemoBase * (cfg.leadToDemoOffset + cfg.leadToDemoPerPain * pain) * tired
    if (rng.chance(p)) {
      lead.stage = 'demo'
      lead.stageSinceWeek = week
      lead.lastContactWeek = week
      touched.add(lead.id)
      update(lead, 'wants_demo')
    }
  }

  // 4. Ghosting
  for (const lead of leads) {
    if (lead.stage !== 'lead' && lead.stage !== 'demo') continue
    if (lead.silentSinceWeek !== null) {
      if (week - lead.silentSinceWeek >= cfg.silentWeeksToLose) {
        lose(lead, 'silent')
        update(lead, 'lost_silent')
      }
    } else if (!touched.has(lead.id) && rng.chance(cfg.ghostChancePerWeek)) {
      lead.silentSinceWeek = week
      update(lead, 'went_silent')
    }
  }

  // 5. Outreach, segments in scenario order
  const used = new Set(leads.map((l) => l.name))
  for (const seg of state.scenario.segments) {
    const out = plan.outreach[seg.id]
    if (!out || out.hours <= 0) continue
    const response = state.hidden.segments[seg.id]?.channelResponse[out.channel] ?? 0
    const count = randomRound(
      out.hours * response * (cfg.sellingBase + sellingAtStart) * tired,
      rng,
    )
    for (let i = 0; i < count; i++) {
      const parts = state.scenario.companyNames[seg.id] ?? { first: [], second: [] }
      const name = pickName(parts, used, rng)
      used.add(name)
      leads.push({
        id: `lead_${leads.length + 1}`,
        name,
        segmentId: seg.id,
        stage: 'lead',
        stageSinceWeek: week,
        lastContactWeek: week,
        silentSinceWeek: null,
        lostReason: null,
      })
    }
    entries.push({ kind: 'new_leads', segmentId: seg.id, channel: out.channel, count })
  }

  return {
    state: {
      ...state,
      founder: { ...state.founder, skills: { ...state.founder.skills, selling } },
      leads,
      customers,
    },
    entries,
  }
}

/** Chance that an active customer leaves at a month end. */
export function churnChance(state: GameState, segmentId: SegmentId): number {
  const c = state.scenario.sales.churn
  const p = c.base + c.perMisfit * (1 - fit(state, segmentId)) + c.perBug * state.product.bugs
  return Math.min(c.cap, p)
}

/** Churn check (plan section 4.11 step 9), on every month end. */
export function applyChurn(
  state: GameState,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  if (!isMonthEnd(state, state.week)) return { state, entries: [] }
  const entries: ReportEntry[] = []
  const customers = state.customers.map((c) => {
    // Customers won this week have not had a month yet.
    if (c.churnedWeek !== null || c.sinceWeek >= state.week) return c
    if (!rng.chance(churnChance(state, c.segmentId))) return c
    entries.push({
      kind: 'customer_churned',
      customerId: c.id,
      name: c.name,
      segmentId: c.segmentId,
    })
    return { ...c, churnedWeek: state.week }
  })
  return { state: { ...state, customers }, entries }
}
