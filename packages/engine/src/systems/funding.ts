import type { RoundConfig } from '@founder-mode/content'
import { bookingsRevenueOrSubscriptions } from './bookings'
import type { Rng } from '../rng'
import type {
  FundingPlan,
  FundingState,
  FundingView,
  GameState,
  HiddenFunding,
  Investor,
  PassReason,
  ReportEntry,
  RoundId,
  Stake,
  WeekPlan,
} from '../types'
import { activeCustomers } from './customers'

// Raising money (Phase 9 Part D, long mode). Shaped like hiring: start a round, pitch hours bring
// first meetings, an interested investor gets a second look, a good second look brings a term
// sheet, accepting it starts the closing, and the money arrives at closing. Investors judge only
// what the player can see. Every random draw happens on a funding action, so a run that never
// raises plays exactly as before.

const ROUNDS: RoundId[] = ['angel', 'seed']
const WEEKS_BACK = 12

export const emptyFunding = (): FundingState => ({
  round: null,
  investors: [],
  stakes: [],
  milestone: null,
})

export const emptyHiddenFunding = (state: { scenario: GameState['scenario'] }): HiddenFunding => ({
  appetite: {},
  confidence: state.scenario.funding?.startConfidence ?? 0,
})

const NO_PLAN: FundingPlan = {
  start: null,
  pitchHours: 0,
  secondLooks: [],
  accept: null,
  decline: [],
  stop: false,
  update: null,
}

/** The plan's funding part, nothing when it has none. */
export const fundingPlanOf = (plan: WeekPlan): FundingPlan => plan.funding ?? NO_PLAN

/** Copies a funding plan, for `clonePlan`. */
export const cloneFundingPlan = (p: FundingPlan): FundingPlan => ({
  ...p,
  secondLooks: [...p.secondLooks],
  decline: [...p.decline],
})

const roundCfg = (state: GameState, id: RoundId): RoundConfig => {
  const cfg = state.scenario.funding?.rounds[id]
  if (!cfg) throw new Error(`No funding round ${id}`)
  return cfg
}

/** Monthly revenue of active customers now. */
const monthlyNow = (state: GameState) => bookingsRevenueOrSubscriptions(state)

/** Monthly revenue at the end of the week `back` weeks before the last one played, else 0. */
const monthlyBack = (state: GameState, back: number) =>
  state.ledger[state.ledger.length - 1 - back]?.monthlyRevenueCents ?? 0

/** A round is closing: terms accepted and the money not yet here. */
const closing = (state: GameState) => state.funding.investors.some((i) => i.stage === 'accepted')

/** Investors of a round type not met yet in this run: someone who passed does not meet again. */
export function unmetInvestors(state: GameState, id: RoundId): string[] {
  const met = new Set(state.funding.investors.filter((i) => i.round === id).map((i) => i.name))
  return (state.scenario.funding?.rounds[id].investors ?? []).filter((n) => !met.has(n))
}

/** Investors who put money in. */
export const hasInvestors = (state: GameState) => state.funding.stakes.length > 0

/** A month end with investors on board: the update is due. */
export const updateDue = (state: GameState) =>
  hasInvestors(state) && state.week % state.scenario.finance.weeksPerMonth === 0

/** The founder's share after every round, in basis points. */
export function founderShareBp(stakes: readonly Stake[]): number {
  return Math.round(stakes.reduce((share, s) => share * (1 - s.shareBp / 10_000), 1) * 10_000)
}

/** Each stake's share now, after the rounds that came after it, in basis points. */
export function currentShareBp(stakes: readonly Stake[], index: number): number {
  let share = (stakes[index]?.shareBp ?? 0) / 10_000
  for (const later of stakes.slice(index + 1)) share *= 1 - later.shareBp / 10_000
  return Math.round(share * 10_000)
}

/** The company's value by the visible rule: a multiple of yearly revenue plus cash; 0 bankrupt. */
export function companyValueCents(state: GameState): number {
  const cfg = state.scenario.funding
  if (!cfg || state.ending === 'bankrupt') return 0
  return Math.max(
    0,
    Math.round(cfg.valueRevenueMultiple * 12 * monthlyNow(state) + state.company.cashCents),
  )
}

/** The investors' mood: 0 worried, 1 patient, 2 pleased; -1 without investors. */
export function moodLevel(state: GameState): number {
  const cfg = state.scenario.funding
  if (!cfg || !hasInvestors(state)) return -1
  const c = state.hidden.funding.confidence
  return c >= cfg.moodAt.pleased ? 2 : c >= cfg.moodAt.patient ? 1 : 0
}

/** Founder hours the funding part of a plan takes. */
export function fundingHours(state: GameState, plan: WeekPlan): number {
  const cfg = state.scenario.funding
  const p = plan.funding
  if (!cfg || !p) return 0
  const roundId = p.start ?? state.funding.round?.id ?? null
  const round = roundId ? cfg.rounds[roundId] : null
  const second = (id: string) => {
    const inv = state.funding.investors.find((i) => i.id === id)
    return inv ? cfg.rounds[inv.round].secondLookHours : 0
  }
  return (
    (p.start ? (round?.prepHours ?? 0) : 0) +
    p.pitchHours +
    p.secondLooks.reduce((t, id) => t + second(id), 0) +
    (p.update === 'proper'
      ? cfg.updates.properHours
      : p.update === 'short'
        ? cfg.updates.shortHours
        : 0)
  )
}

/** Whether the funding part of a plan can be carried out. */
export function fundingValid(state: GameState, plan: WeekPlan): boolean {
  const p = plan.funding
  if (!p) return true
  const cfg = state.scenario.funding
  const empty =
    p.start === null &&
    p.pitchHours === 0 &&
    p.secondLooks.length === 0 &&
    p.accept === null &&
    p.decline.length === 0 &&
    !p.stop &&
    p.update === null
  if (!cfg) return empty
  const f = state.funding
  if (
    p.start !== null &&
    (!ROUNDS.includes(p.start) ||
      f.round !== null ||
      closing(state) ||
      unmetInvestors(state, p.start).length === 0)
  ) {
    return false
  }
  if (!Number.isInteger(p.pitchHours) || p.pitchHours < 0) return false
  if (p.pitchHours > 0 && f.round === null && p.start === null) return false
  if (p.stop && (f.round === null || p.start !== null || p.secondLooks.length > 0)) return false
  const at = (id: string, stage: Investor['stage']) =>
    f.investors.some((i) => i.id === id && i.stage === stage)
  if (new Set(p.secondLooks).size !== p.secondLooks.length) return false
  if (!p.secondLooks.every((id) => at(id, 'interested'))) return false
  if (p.accept !== null && (!at(p.accept, 'offered') || closing(state))) return false
  if (!p.decline.every((id) => at(id, 'offered') && id !== p.accept)) return false
  if (p.update !== null && !updateDue(state)) return false
  return true
}

/**
 * Why an investor would pass, from what they can see, or null when the numbers clear their bar:
 * no paying customers, runway shorter than the closing, a third of customers lost in 12 weeks, no
 * focus, then the score against their appetite (one roll of noise).
 */
function judge(
  state: GameState,
  round: RoundConfig,
  appetite: number,
  rng: Rng,
): PassReason | null {
  const cfg = state.scenario.funding!
  const active = activeCustomers(state)
  if (active.length === 0) return 'too_early'
  const runway = state.ledger.at(-1)?.runwayWeeks ?? null
  // Runway shows at most the weeks left, so a short run end is not a short runway.
  const left = state.scenario.maxWeeks - state.week + 1
  if (runway !== null && runway < left && runway < round.closingWeeks + cfg.runwayMarginWeeks) {
    return 'runway'
  }
  const lost = state.customers.filter(
    (c) => c.churnedWeek !== null && c.churnedWeek > state.week - WEEKS_BACK,
  ).length
  if (lost >= 2 && lost / (active.length + lost) >= cfg.churnShare) return 'churn'
  const now = monthlyNow(state)
  const bySegment = new Map<string, number>()
  for (const c of active) {
    bySegment.set(c.segmentId, (bySegment.get(c.segmentId) ?? 0) + c.priceCentsPerMonth)
  }
  if (Math.max(...bySegment.values()) / now < cfg.focusShare) return 'focus'
  const then = monthlyBack(state, WEEKS_BACK - 1)
  const growth = then > 0 ? now / then - 1 : 1
  const growthFactor = Math.min(
    cfg.growthFactor.max,
    Math.max(cfg.growthFactor.min, 1 + cfg.growthWeight * growth),
  )
  const pitch = cfg.pitchBase + cfg.pitchPerSelling * state.founder.skills.selling
  const noise = Math.exp(rng.normal(cfg.noiseSd))
  const score = (now / round.barMonthlyCents) ** cfg.scoreExponent * growthFactor * pitch * noise
  if (score >= appetite) return null
  return growth < cfg.flatGrowth ? 'growth_flat' : 'more_revenue'
}

/** Terms for an investor who says yes: amount from the round's range, valuation by the rule. */
function termsFor(state: GameState, round: RoundConfig, rng: Rng): Investor['terms'] {
  const step = 1_000_000
  const now = monthlyNow(state)
  const weak = now < round.barMonthlyCents ? round.weakTractionTerms : undefined
  const amountFactor = weak?.amountFactor ?? 1
  const preMoneyFactor = weak?.preMoneyFactor ?? 1
  const amount =
    Math.round((rng.range(round.amountCents.min, round.amountCents.max) * amountFactor) / step) *
    step
  const pre = Math.max(
    Math.round(round.preMoneyFloorCents * preMoneyFactor),
    Math.round(round.revenueMultiple * 12 * now * preMoneyFactor),
  )
  return {
    amountCents: amount,
    preMoneyCents: pre,
    shareBp: Math.round((10_000 * amount) / (pre + amount)),
    milestone: round.milestone
      ? {
          monthlyCents: Math.round(round.milestone.multiple * now),
          byWeek: state.week + round.milestone.weeks,
        }
      : null,
    expiresWeek: state.week + round.termSheetWeeks,
    monthlyAtOffer: now,
  }
}

export type FundingOutcome = {
  state: GameState
  entries: ReportEntry[]
  investmentCents: number
  /** Due diligence hours taken out of next week. */
  forcedHours: number
}

/**
 * Funding step, after the team and before finance:
 * 1. the investor update at a month end, and the month's numbers, move the confidence,
 * 2. a growth milestone whose week has come is met or missed,
 * 3. term sheets are declined, accepted (closing starts), or lapse,
 * 4. a round is stopped or started,
 * 5. second looks: a term sheet or a pass,
 * 6. first meetings, one for every `pitchHoursPerMeeting` of pitching,
 * 7. a closing whose week has come: the money arrives, or due diligence withdraws the terms.
 */
export function applyFunding(input: GameState, plan: WeekPlan, rng: Rng): FundingOutcome {
  const cfg = input.scenario.funding
  const out: FundingOutcome = { state: input, entries: [], investmentCents: 0, forcedHours: 0 }
  if (!cfg) return out
  const p = fundingPlanOf(plan)
  const week = input.week
  let f: FundingState = input.funding
  let hidden: HiddenFunding = input.hidden.funding
  let company = input.company
  const clampConf = (c: number) => Math.min(1, Math.max(0, c))
  const setInvestor = (id: string, change: Partial<Investor>) => {
    f = { ...f, investors: f.investors.map((i) => (i.id === id ? { ...i, ...change } : i)) }
  }

  // 1. The update and the month's numbers.
  if (updateDue(input)) {
    const kind = p.update ?? 'none'
    const up = monthlyNow(input) > monthlyBack(input, input.scenario.finance.weeksPerMonth - 1)
    hidden = {
      ...hidden,
      confidence: clampConf(
        hidden.confidence +
          cfg.updates[kind] +
          (up ? cfg.updates.revenueUp : cfg.updates.revenueDown),
      ),
    }
    out.entries.push({ kind: 'investor_update', update: kind })
  }

  // 2. The growth milestone.
  if (f.milestone?.status === 'open' && week >= f.milestone.byWeek) {
    const met = monthlyNow(input) >= f.milestone.monthlyCents
    f = { ...f, milestone: { ...f.milestone, status: met ? 'met' : 'missed' } }
    if (!met) {
      hidden = { ...hidden, confidence: clampConf(hidden.confidence + cfg.updates.milestoneMissed) }
    }
    out.entries.push({
      kind: 'funding_milestone',
      met,
      monthlyCents: f.milestone!.monthlyCents,
    })
  }

  // 3. Term sheets.
  for (const id of p.decline) setInvestor(id, { stage: 'declined' })
  if (p.accept !== null) {
    const inv = f.investors.find((i) => i.id === p.accept)!
    const round = cfg.rounds[inv.round]
    const closeWeek = week + round.closingWeeks
    setInvestor(inv.id, { stage: 'accepted', closeWeek })
    out.forcedHours += round.dueDiligenceHours
    out.entries.push({ kind: 'terms_accepted', name: inv.name, closeWeek })
    // The other term sheets of the round lapse.
    for (const other of f.investors) {
      if (other.stage === 'offered') setInvestor(other.id, { stage: 'lapsed' })
    }
  }
  for (const inv of f.investors) {
    if (inv.stage === 'offered' && inv.terms && week > inv.terms.expiresWeek) {
      setInvestor(inv.id, { stage: 'lapsed' })
      out.entries.push({ kind: 'terms_lapsed', name: inv.name })
    }
  }

  // 4. Stopping or starting a round.
  if (p.stop && f.round) {
    out.entries.push({ kind: 'round_stopped', round: f.round.id })
    for (const inv of f.investors) {
      if (inv.stage === 'interested' || inv.stage === 'offered') {
        setInvestor(inv.id, { stage: 'lapsed' })
      }
    }
    f = { ...f, round: null }
  }
  if (p.start !== null) {
    roundCfg(input, p.start)
    const pool = rng.shuffle(unmetInvestors(input, p.start))
    f = { ...f, round: { id: p.start, startWeek: week, pool, next: 0 } }
    out.entries.push({ kind: 'round_started', round: p.start })
  }

  // 5. Second looks.
  for (const id of p.secondLooks) {
    const inv = f.investors.find((i) => i.id === id)!
    const round = cfg.rounds[inv.round]
    const reason = judge(input, round, hidden.appetite[id] ?? 1, rng)
    if (reason) {
      setInvestor(id, { stage: 'passed', reason })
      out.entries.push({ kind: 'second_look', name: inv.name, offered: false, reason })
    } else {
      const terms = termsFor(input, round, rng)!
      setInvestor(id, { stage: 'offered', terms })
      out.entries.push({ kind: 'second_look', name: inv.name, offered: true, reason: null })
      out.entries.push({
        kind: 'term_sheet',
        name: inv.name,
        amountCents: terms.amountCents,
        shareBp: terms.shareBp,
      })
    }
  }

  // 6. First meetings.
  if (f.round && p.pitchHours > 0) {
    const round = cfg.rounds[f.round.id]
    const meetings = Math.floor(p.pitchHours / round.pitchHoursPerMeeting)
    for (let k = 0; k < meetings && f.round && f.round.next < f.round.pool.length; k++) {
      const name = f.round.pool[f.round.next]!
      const roundId = f.round.id
      f = { ...f, round: { ...f.round, next: f.round.next + 1 } }
      const id = `investor_${f.investors.length + 1}`
      // Investors already on board shape the round: pleased ones introduce you, worried ones warn.
      const mood = moodLevel({ ...input, hidden: { ...input.hidden, funding: hidden } })
      const follow =
        mood === 2 ? cfg.followOnAppetite.pleased : mood === 0 ? cfg.followOnAppetite.worried : 1
      const appetite = rng.range(cfg.appetite.min, cfg.appetite.max) * follow
      hidden = { ...hidden, appetite: { ...hidden.appetite, [id]: appetite } }
      const reason = judge(input, round, appetite, rng)
      f = {
        ...f,
        investors: [
          ...f.investors,
          {
            id,
            name,
            round: roundId,
            metWeek: week,
            stage: reason ? 'passed' : 'interested',
            reason,
            terms: null,
            closeWeek: null,
          },
        ],
      }
      out.entries.push({ kind: 'investor_met', name, interested: reason === null, reason })
    }
  }

  // 7. Closing.
  for (const inv of f.investors) {
    if (inv.stage !== 'accepted' || inv.closeWeek !== week || !inv.terms) continue
    const round = cfg.rounds[inv.round]
    const drop = round.withdrawDrop
    if (drop !== undefined && monthlyNow(input) < inv.terms.monthlyAtOffer * (1 - drop)) {
      setInvestor(inv.id, { stage: 'withdrawn', reason: 'revenue_dropped' })
      out.entries.push({ kind: 'terms_withdrawn', name: inv.name, reason: 'revenue_dropped' })
      continue
    }
    setInvestor(inv.id, { stage: 'closed' })
    const stake: Stake = {
      investorId: inv.id,
      name: inv.name,
      round: inv.round,
      amountCents: inv.terms.amountCents,
      shareBp: inv.terms.shareBp,
      week,
    }
    f = {
      ...f,
      stakes: [...f.stakes, stake],
      round: f.round?.id === inv.round ? null : f.round,
      milestone: inv.terms.milestone ? { ...inv.terms.milestone, status: 'open' } : f.milestone,
    }
    for (const other of f.investors) {
      if (
        other.round === inv.round &&
        (other.stage === 'interested' || other.stage === 'offered')
      ) {
        setInvestor(other.id, { stage: 'lapsed' })
      }
    }
    // The first money in starts the investors' confidence where the scenario says.
    if (f.stakes.length === 1) {
      hidden = { ...hidden, confidence: cfg.startConfidence }
      if (cfg.founderSalaryCents && !company.fixedCosts.some((c) => c.id === 'founder_salary')) {
        company = {
          ...company,
          fixedCosts: [
            ...company.fixedCosts,
            { id: 'founder_salary', name: 'Founder salary', monthlyCents: cfg.founderSalaryCents },
          ],
        }
      }
    }
    out.investmentCents += inv.terms.amountCents
    out.entries.push({
      kind: 'round_closed',
      name: inv.name,
      round: inv.round,
      amountCents: inv.terms.amountCents,
      shareBp: inv.terms.shareBp,
    })
  }

  if (f === input.funding && hidden === input.hidden.funding) return out
  out.state = { ...input, company, funding: f, hidden: { ...input.hidden, funding: hidden } }
  return out
}

/**
 * The "Growing" ending: a run that raised money, at the end, with at least `runwayMonths` of money
 * at the burn of its last 4 weeks and monthly revenue `quarterGrowth` above 13 weeks earlier.
 */
export function growingHolds(state: GameState, netLastMonth: number): boolean {
  const cfg = state.scenario.funding
  if (!cfg || !hasInvestors(state)) return false
  const money = state.company.cashCents + Math.max(0, state.founder.savingsCents)
  const months = netLastMonth >= 0 ? Infinity : money / -netLastMonth
  const now = monthlyNow(state)
  const then = monthlyBack(state, 13)
  return (
    months >= cfg.growing.runwayMonths && now > 0 && now >= then * (1 + cfg.growing.quarterGrowth)
  )
}

/** Raising money as the player sees it, or null without funding. */
export function fundingView(state: GameState): FundingView | null {
  const cfg = state.scenario.funding
  if (!cfg) return null
  const f = state.funding
  const stakes = f.stakes
  const mood = moodLevel(state)
  return {
    rounds: ROUNDS.map((id) => {
      const r = cfg.rounds[id]
      return {
        id,
        name: r.name,
        barText: r.barText,
        prepHours: r.prepHours,
        pitchHoursPerMeeting: r.pitchHoursPerMeeting,
        secondLookHours: r.secondLookHours,
        termSheetWeeks: r.termSheetWeeks,
        closingWeeks: r.closingWeeks,
        dueDiligenceHours: r.dueDiligenceHours,
        amountCents: { ...r.amountCents },
        investorsLeft: unmetInvestors(state, id).length,
      }
    }),
    round: f.round
      ? {
          id: f.round.id,
          name: cfg.rounds[f.round.id].name,
          startWeek: f.round.startWeek,
          investorsLeft: f.round.pool.length - f.round.next,
        }
      : null,
    canStart: f.round === null && !closing(state) && state.status === 'running',
    investors: f.investors.map((i) => ({ ...i, terms: i.terms ? { ...i.terms } : null })),
    capTable: [
      {
        name: 'You',
        round: null,
        shareBp: founderShareBp(stakes),
        amountCents: 0,
        week: null,
      },
      ...stakes.map((s, i) => ({
        name: s.name,
        round: s.round,
        shareBp: currentShareBp(stakes, i),
        amountCents: s.amountCents,
        week: s.week,
      })),
    ],
    founderShareBp: founderShareBp(stakes),
    raisedCents: stakes.reduce((t, s) => t + s.amountCents, 0),
    mood: mood === 2 ? 'pleased' : mood === 1 ? 'patient' : mood === 0 ? 'worried' : null,
    milestone: f.milestone ? { ...f.milestone } : null,
    updateDue: updateDue(state),
    updateHours: { proper: cfg.updates.properHours, short: cfg.updates.shortHours },
    valueCents: companyValueCents(state),
    valueRevenueMultiple: cfg.valueRevenueMultiple,
  }
}
