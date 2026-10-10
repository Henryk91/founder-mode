import type { Rng } from '../rng'
import type {
  ChannelId,
  Customer,
  GameState,
  Lead,
  LeadChange,
  LeadSource,
  LostReason,
  ReportEntry,
  SegmentId,
  WeekPlan,
} from '../types'
import { isMonthEnd } from './finance'
import { energyFactor } from './founder'
import { coverage, fit, priceFactor } from './market'
import { channelFactor } from './office'
import { OddsTally } from './odds'
import type { TeamOutput } from './team'

/** A lead can take part in a demo when it asked for one and is still answering. */
export function canBookDemo(lead: Lead): boolean {
  return lead.stage === 'demo' && lead.silentSinceWeek === null
}

/** An open lead the founder can follow up with: still asking, or waiting for a demo. */
export function canFollowUp(lead: Lead): boolean {
  return lead.stage === 'lead' || lead.stage === 'demo'
}

type NameParts = {
  first: readonly string[]
  second: readonly string[]
  /** Which word tells the segment's companies apart. Defaults to the first. */
  distinct?: 'first' | 'second'
}

/** The word of a lead name that tells companies apart, or null if the name is not from `parts`. */
export function distinctWord(parts: NameParts, name: string): string | null {
  const second = parts.distinct === 'second'
  let best: string | null = null
  for (const w of second ? parts.second : parts.first) {
    const match = second ? name.endsWith(` ${w}`) : name.startsWith(`${w} `)
    if (match && (best === null || w.length > best.length)) best = w
  }
  return best
}

/**
 * A company name no lead has had yet, whose distinctive word no open lead uses (`busy`): one word
 * from each list, joined by a space. A few random tries find one while most are free; after that,
 * a pick among all that qualify. If open leads hold every distinctive word, any unused name.
 */
export function pickName(
  parts: NameParts,
  used: ReadonlySet<string>,
  busy: ReadonlySet<string>,
  rng: Rng,
): string {
  const { first, second } = parts
  if (first.length === 0 || second.length === 0) {
    throw new Error('No company names for this segment')
  }
  const fresh = (a: string, b: string) =>
    !used.has(`${a} ${b}`) && !busy.has(parts.distinct === 'second' ? b : a)
  for (let tries = 0; tries < 8; tries++) {
    const a = rng.pick(first)
    const b = rng.pick(second)
    if (fresh(a, b)) return `${a} ${b}`
  }
  const all = first.flatMap((a) => second.map((b) => [a, b] as const))
  const free = all.filter(([a, b]) => fresh(a, b))
  const pick = free.length > 0 ? rng.pick(free) : null
  if (pick) return `${pick[0]} ${pick[1]}`
  const unused = all.map(([a, b]) => `${a} ${b}`).filter((n) => !used.has(n))
  if (unused.length > 0) return rng.pick(unused)
  // Every combination is taken, far beyond what a run produces. Stay distinguishable anyway.
  const base = `${rng.pick(first)} ${rng.pick(second)}`
  let n = 2
  while (used.has(`${base} ${n}`)) n++
  return `${base} ${n}`
}

const holdsName = (l: Lead) => l.stage !== 'lost' && l.stage !== 'paying'

/**
 * Hands out fresh lead names for one week's new leads: never a name any lead has had, and never
 * a distinctive word that an open lead of the same segment still carries.
 */
export function namePicker(
  state: GameState,
  leads: readonly Lead[],
): (segmentId: SegmentId, rng: Rng) => string {
  const used = new Set(leads.map((l) => l.name))
  const busy = new Map<SegmentId, Set<string>>()
  const partsOf = (id: SegmentId): NameParts =>
    state.scenario.companyNames[id] ?? { first: [], second: [] }
  return (segmentId, rng) => {
    const parts = partsOf(segmentId)
    let words = busy.get(segmentId)
    if (!words) {
      words = new Set(
        leads
          .filter((l) => l.segmentId === segmentId && holdsName(l))
          .flatMap((l) => distinctWord(parts, l.name) ?? []),
      )
      busy.set(segmentId, words)
    }
    const name = pickName(parts, used, words, rng)
    used.add(name)
    const word = distinctWord(parts, name)
    if (word !== null) words.add(word)
    return name
  }
}

/** Adds `count` new open leads in a segment, with fresh company names, found by `source`. */
export function addLeads(
  state: GameState,
  segmentId: SegmentId,
  count: number,
  rng: Rng,
  source: LeadSource,
): GameState {
  if (count <= 0) return state
  const leads = [...state.leads]
  const nextName = namePicker(state, leads)
  for (let i = 0; i < count; i++) {
    const name = nextName(segmentId, rng)
    leads.push({
      id: `lead_${leads.length + 1}`,
      name,
      segmentId,
      stage: 'lead',
      source,
      stageSinceWeek: state.week,
      lastContactWeek: state.week,
      silentSinceWeek: null,
      lostReason: null,
    })
  }
  return { ...state, leads }
}

/**
 * The founder's outreach hours per `segment/channel` in the weeks before this one that are still
 * inside the saturation window.
 */
export function recentOutreach(state: GameState): Map<string, number> {
  const from = state.week - state.scenario.sales.saturationWeeks + 1
  const spent = new Map<string, number>()
  for (const a of state.actionLog) {
    if (a.type !== 'endWeek' || a.week < from) continue
    for (const [seg, out] of Object.entries(a.plan.outreach)) {
      const key = `${seg}/${out.channel}`
      spent.set(key, (spent.get(key) ?? 0) + out.hours)
    }
  }
  return spent
}

/**
 * Outreach hours as they count for finding leads: full while the channel's hours in the window
 * stay within `limit`, `factor` of an hour beyond. `before` is what was spent there already.
 */
export function effectiveHours(
  before: number,
  hours: number,
  limit: number,
  factor: number,
): number {
  const full = Math.max(0, Math.min(hours, limit - before))
  return full + (hours - full) * factor
}

/** floor(x), plus one more with probability equal to the fraction. */
function randomRound(x: number, rng: Rng): number {
  const whole = Math.floor(x)
  return whole + (rng.chance(x - whole) ? 1 : 0)
}

/**
 * Sales step (plan section 4.5), in this order, leads in list order:
 * -1. committed prospects: a paying customer once their market's must haves have shipped, their
 *     deposit counting as the first month; refunded and lost after `refundWeeks` without them,
 * 0. follow ups: the lead answers again, is not ghosted this week, and is a bit keener,
 * 1. demos held this week: the lead becomes a trial or is lost,
 * 2. trials that ran their course: the lead becomes a paying customer or is lost,
 * 3. open leads agree to a demo,
 * 4. silent leads are lost after a while, untouched open leads may go silent,
 * 5. outreach finds new leads, the founder's per market and then the salesperson's.
 * A salesperson (`team`) holds demos too, without costing the founder hours or raising the
 * founder's selling skill.
 */
export function applySales(
  state: GameState,
  plan: WeekPlan,
  rng: Rng,
  team: TeamOutput | null = null,
): { state: GameState; entries: ReportEntry[]; refundsCents: number } {
  const cfg = state.scenario.sales
  const refundWeeks = state.scenario.experiments.presale.refundWeeks
  let refundsCents = 0
  const week = state.week
  const entries: ReportEntry[] = []
  const leads: Lead[] = state.leads.map((l) => ({ ...l }))
  const customers: Customer[] = [...state.customers]
  const founderDemoIds = new Set(plan.demos)
  const demoIds = new Set([...plan.demos, ...(team?.demos ?? [])])
  const touched = new Set<string>()
  const followedUp = new Set(plan.followUps)
  let selling = state.founder.skills.selling
  const sellingAtStart = selling
  // Energy after this week's hours (step 3 runs first): a tired founder sells worse.
  const tired = energyFactor(state.founder, state.scenario)
  const odds = new OddsTally(week)

  const update = (lead: Lead, change: LeadChange) =>
    entries.push({
      kind: 'lead_update',
      change,
      leadId: lead.id,
      name: lead.name,
      segmentId: lead.segmentId,
    })
  const lose = (lead: Lead, reason: LostReason) => {
    lead.stage = 'lost'
    lead.stageSinceWeek = week
    lead.lostReason = reason
  }

  // -1. Committed prospects
  for (const lead of leads) {
    if (lead.stage !== 'committed') continue
    if (coverage(state, lead.segmentId) >= 1) {
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
        priceCentsPerMonth: lead.depositCents ?? state.company.priceCentsPerMonth,
        prepaidMonths: 1,
      })
      update(lead, 'won')
    } else if (week - lead.stageSinceWeek >= refundWeeks) {
      refundsCents += lead.depositCents ?? 0
      lose(lead, 'refunded')
      update(lead, 'refunded')
    }
  }

  // 0. Follow ups
  for (const lead of leads) {
    if (!followedUp.has(lead.id) || !canFollowUp(lead)) continue
    lead.silentSinceWeek = null
    lead.lastContactWeek = week
    touched.add(lead.id)
  }
  // 1. Demos
  for (const lead of leads) {
    if (!demoIds.has(lead.id)) continue
    if (founderDemoIds.has(lead.id)) {
      selling = Math.min(cfg.skillCap, selling + cfg.skillGainPerDemo)
    }
    lead.lastContactWeek = week
    touched.add(lead.id)
    const p = (cfg.demoToTrialBase + cfg.demoToTrialPerFit * fit(state, lead.segmentId)) * tired
    const trial = rng.chance(p)
    odds.roll('demo', lead.segmentId, p, trial)
    if (trial) {
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
    const won = rng.chance(p)
    odds.roll('trial', lead.segmentId, p, won)
    if (won) {
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
    const boost = followedUp.has(lead.id) ? cfg.followUpDemoBoost : 0
    // A recommended lead is keener (scenario `sales.referral.demoBonus`).
    const referred = lead.source === 'referral' ? 1 + cfg.referral.demoBonus : 1
    const p =
      (cfg.leadToDemoBase * (cfg.leadToDemoOffset + cfg.leadToDemoPerPain * pain) + boost) *
      referred *
      tired
    const agrees = rng.chance(p)
    odds.roll('lead_demo', lead.segmentId, p, agrees)
    if (agrees) {
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

  // 5. Outreach, segments in scenario order, then the salesperson
  const nextName = namePicker(state, leads)
  const items: {
    segmentId: SegmentId
    channel: ChannelId
    hours: number
    source: LeadSource
    selling: number
  }[] = []
  for (const seg of state.scenario.segments) {
    const out = plan.outreach[seg.id]
    if (out && out.hours > 0) {
      items.push({ segmentId: seg.id, ...out, source: 'outreach', selling: sellingAtStart })
    }
  }
  if (team?.outreach) {
    items.push({
      ...team.outreach,
      channel: team.outreach.channel as ChannelId,
      source: 'team',
      selling: team.selling,
    })
  }
  // Hours already spent per market and channel in the saturation window, this week's included.
  const spent = recentOutreach(state)
  const limit = cfg.saturationHours * cfg.saturationWeeks
  for (const item of items) {
    const response =
      (state.hidden.segments[item.segmentId]?.channelResponse[item.channel] ?? 0) *
      channelFactor(state, item.channel)
    const key = `${item.segmentId}/${item.channel}`
    const before = spent.get(key) ?? 0
    spent.set(key, before + item.hours)
    const hours = effectiveHours(before, item.hours, limit, cfg.saturatedFactor)
    const mean = hours * response * (cfg.sellingBase + item.selling) * tired
    const count = randomRound(mean, rng)
    odds.count('leads', item.segmentId, mean, count)
    for (let i = 0; i < count; i++) {
      const name = nextName(item.segmentId, rng)
      leads.push({
        id: `lead_${leads.length + 1}`,
        name,
        segmentId: item.segmentId,
        stage: 'lead',
        source: item.source,
        channel: item.channel,
        stageSinceWeek: week,
        lastContactWeek: week,
        silentSinceWeek: null,
        lostReason: null,
      })
    }
    entries.push({
      kind: 'new_leads',
      segmentId: item.segmentId,
      channel: item.channel,
      count,
      wornOut: hours < item.hours,
    })
  }
  return {
    state: {
      ...state,
      founder: { ...state.founder, skills: { ...state.founder.skills, selling } },
      leads,
      customers,
      eventLog: [...state.eventLog, ...odds.events()],
    },
    entries,
    refundsCents,
  }
}

/** Chance that a paying customer of a market recommends the company this week. */
export function referralChance(state: GameState, segmentId: SegmentId): number {
  const r = state.scenario.sales.referral
  return Math.max(0, r.chancePerFit * fit(state, segmentId) - r.chancePerBug * state.product.bugs)
}

/**
 * Referrals (after outreach and walk-ins): every customer paying since an earlier week may
 * recommend the company to one new lead in its own market, customers in the order they were won.
 * A customer whose chance is 0 never rolls, so a scenario without referrals draws nothing.
 */
export function applyReferrals(
  state: GameState,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const entries: ReportEntry[] = []
  const odds = new OddsTally(state.week)
  let out = state
  for (const c of state.customers) {
    if (c.churnedWeek !== null || c.sinceWeek >= state.week) continue
    const p = referralChance(state, c.segmentId)
    if (p <= 0) continue
    const hit = rng.chance(p)
    odds.roll('referrals', c.segmentId, p, hit)
    if (!hit) continue
    out = addLeads(out, c.segmentId, 1, rng, 'referral')
    const lead = out.leads[out.leads.length - 1]!
    out = { ...out, leads: [...out.leads.slice(0, -1), { ...lead, referredBy: c.id }] }
    entries.push({
      kind: 'referral_lead',
      segmentId: c.segmentId,
      leadId: lead.id,
      name: lead.name,
      from: c.name,
    })
  }
  const events = odds.events()
  if (events.length === 0) return { state: out, entries }
  return { state: { ...out, eventLog: [...out.eventLog, ...events] }, entries }
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
  const odds = new OddsTally(state.week)
  const customers = state.customers.map((c) => {
    // Customers won this week have not had a month yet.
    if (c.churnedWeek !== null || c.sinceWeek >= state.week) return c
    const p = churnChance(state, c.segmentId)
    const leaves = rng.chance(p)
    odds.roll('churn', c.segmentId, p, leaves, c.priceCentsPerMonth)
    if (!leaves) return c
    entries.push({
      kind: 'customer_churned',
      customerId: c.id,
      name: c.name,
      segmentId: c.segmentId,
    })
    return { ...c, churnedWeek: state.week }
  })
  return {
    state: { ...state, customers, eventLog: [...state.eventLog, ...odds.events()] },
    entries,
  }
}
