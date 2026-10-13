import type { Scenario } from '@founder-mode/content'
import {
  bookingTotals,
  createGame,
  endWeek,
  getView,
  fundingEconomics,
  hireEconomics,
  respond,
  validatePlan,
  type EndingId,
  type GameState,
  type HireEconomics,
  type WeekReport,
} from '@founder-mode/engine'
import type { Strategy } from './strategy'

/** Week at which the playtest numbers are compared. */
export const CHECK_WEEK = 15
/** Pacing is measured over the opening weeks, where hand play felt empty. */
export const PACING_WEEKS = 20
/** Long mode's second year starts in this week (target 26 measures decision news from here). */
export const YEAR2_WEEK = 53
/** Long mode runs are split by where they stood at the end of the 60 week game (target 28). */
export const STANDARD_WEEKS = 60

/** By this week a careful player should have a customer or have left a market that is not viable. */
export const EVIDENCE_WEEK = 10

/** The stricter reading: news that asks for a decision, not routine flow such as one new lead. */
export function isDecisive(e: WeekReport['entries'][number]): boolean {
  return (
    e.kind === 'lead_update' ||
    e.kind === 'landing_result' ||
    e.kind === 'presale_result' ||
    e.kind === 'customer_churned' ||
    e.kind === 'invoice_written_off' ||
    e.kind === 'candidates_ready' ||
    // Tourism: new bookings, guests turned away or cancelled by the company.
    e.kind === 'bookings_new' ||
    e.kind === 'turned_away' ||
    e.kind === 'company_cancelled'
  )
}

/**
 * Something the player did not simply do themselves: a result, a reply, money, a loss. Interviews,
 * ad spend, team output and invoices issued do not count.
 */
export function isNoteworthy(e: WeekReport['entries'][number]): boolean {
  switch (e.kind) {
    case 'new_leads':
      return e.count > 0
    case 'revenue':
    case 'invoice_written_off':
    case 'landing_result':
    case 'presale_result':
    case 'candidates_ready':
    case 'hire_started':
    case 'feature_shipped':
    case 'lead_update':
    case 'customer_churned':
      return true
    default:
      return false
  }
}

export type RunResult = {
  strategy: string
  seed: string
  ending: EndingId
  /** The week in which the run ended. */
  weeks: number
  /** Hidden truth, read by the report only: the segment with the viable role. */
  viableSegment: string
  /** Hidden truth, read by the report only: every segment's role. */
  roles: Record<string, string>
  peakMonthlyRevenueCents: number
  /** Money received from customers over the whole run. */
  revenueReceivedCents: number
  /** Most customers active at the end of any week. */
  peakCustomers: number
  /** Week the first customer signed, or null when none did. */
  firstCustomerWeek: number | null
  /** Monthly price at the end of the run. */
  finalPriceCents: number
  /** Weeks in which the plan changed the price. */
  priceChanges: number
  /** Hidden truth, read by the report only: every segment's willingness to pay. */
  wtpCents: Record<string, number>
  customersEnd: number
  /** Company cash plus personal savings at the end. */
  finalWealthCents: number
  /** Week of the offer to the one hire, or null when nobody was hired. */
  hiredWeek: number | null
  hiredRole: 'developer' | 'salesperson' | null
  /** Weeks among the first PACING_WEEKS played: with a noteworthy entry, with a new message. */
  pacingWeeks: number
  noteworthyWeeks: number
  /** Weeks with a new message, a lead that moved, an experiment result, or a lost customer. */
  decisionWeeks: number
  messageWeeks: number
  /** Long mode: weeks played from YEAR2_WEEK on, and how many brought decision news (0 otherwise). */
  year2Weeks: number
  year2DecisionWeeks: number
  /**
   * Long mode: the run at the end of week STANDARD_WEEKS. `profitable`: running and profitable in
   * each of the last two months (the 60 week win test), `alive`: running but not that, `over`:
   * ended before. Null in the 60 week game.
   */
  at60: 'profitable' | 'alive' | 'over' | null
  /** Every offer made, in order: week, role and part time. */
  hires: { week: number; role: 'developer' | 'salesperson'; partTime: boolean }[]
  /** Hires let go over the run, and people on the team (working or starting) at the end. */
  lettingsGo: number
  teamAtEnd: number
  /**
   * Invoice chases over the run, the founder hours they took, and what each chased invoice would
   * have done unchased (hidden truth, report only): paid anyway, waited for a chase, or never.
   */
  chases: { count: number; hours: number; wouldPay: number; waited: number; never: number }
  /** Founder hours planned over the run. */
  plannedHoursTotal: number
  /** Ids of the inbox events that arrived, in order. */
  eventsSeen: string[]
  /**
   * Weeks in which the inbox should have brought a message (nothing new, fewer open than the
   * guarantee) but no event was eligible any more, and the first such week, or null.
   */
  dryWeeks: number
  firstDryWeek: number | null
  /** Arrivals of an event that had already arrived, not counting events that recur on purpose. */
  repeatedEvents: number
  /**
   * By EVIDENCE_WEEK: a paying customer, or the player's focus moved off a market that is not
   * viable. Null for players without a focus.
   */
  evidenceByCheck: boolean | null
  /**
   * Long mode with funding: money raised, the founder's share and its value by the visible rule,
   * the week of the first money, and whether the run went bankrupt while raising (a round open or
   * closing) or after raising, as the post-mortem names it. Null without funding.
   */
  funding: {
    raisedCents: number
    rounds: ('angel' | 'seed')[]
    founderShareBp: number
    founderValueCents: number
    firstMoneyWeek: number | null
    roundsStarted: number
    bankruptWhileRaising: boolean
    bankruptAfterRaise: boolean
    /** Investors who passed as too early: pitched before a paying customer. */
    pitchedTooEarly: number
  } | null
  /**
   * Tourism (bookings model): guests served, their payments, the rating at the end, the share of
   * served guests who came through the platform, guests turned away and cancelled by the company,
   * and the first week a guest from the secretly viable segment was served. Null otherwise.
   */
  tourism: {
    guests: number
    revenueCents: number
    rating: number | null
    reviews: number
    platformShare: number
    turnedAway: number
    companyCancelled: number
    firstViableWeek: number | null
  } | null
  /**
   * The bank loan (step 6): what was borrowed over the run, interest and fees paid, how many
   * loans, and whether a payment was ever missed (a default). Null without a loan offer.
   */
  loan: {
    borrowedCents: number
    interestCents: number
    loans: number
    missed: boolean
    /**
     * A payment missed while the four weeks before it covered every other cost: the loan, not
     * the business, broke the run (target L3).
     */
    missedByLoan: boolean
    second: boolean
  } | null
  /** For runs with a hire: what it cost per customer it found, and what a customer was worth. */
  hire: HireEconomics | null
  /**
   * For runs that booked a freelancer: the week of the first booking, the market the player
   * worked on in the freelancer's first week of work, and what freelancers cost and delivered.
   */
  freelance: {
    /** Role of the first booking. */
    role: 'developer' | 'salesperson'
    market: string | null
    bookedWeek: number
    costCents: number
    weeks: number
    workedHours: number
  } | null
  /** Customers won over the run, by the action that found them: `outreach:<channel>`, `landing`, ... */
  customersBySource: Record<string, number>
  customersAtCheck: number
  monthlyRevenueAtCheckCents: number
  minEnergy: number
  meanPlannedHours: number
  leads: number
  outreachHours: number
  /** Landing page tests and pre-sale batches the run paid for. */
  landingTests: number
  presaleBatches: number
  /** The market of the first pre-sale batch, or null without one. */
  firstPresaleSegment: string | null
  /** Book requests left to their gamble ('later'), and invoices written off, over the run. */
  booksLeft: number
  writtenOffInvoices: number
  invoicesIssued: number
  /** Messages in the inbox over the run, and how many the player answered. */
  messages: number
  messagesAnswered: number
  /** Week 1 interviews, when every market was interviewed that week. Null otherwise. */
  firstWeekSignal: FirstWeekSignal | null
  /** Interviews per market in the first plan, when every market got some. Null otherwise. */
  firstWeekInterviews: number | null
}

export type FirstWeekSignal = {
  /** True when the viable market had the strictly highest mean bucket. */
  viableRankedFirst: boolean
  /** Share of the viable market's interviews that landed in the top bucket. */
  viableTopShare: number
}

function firstWeekSignal(
  scenario: Scenario,
  report: WeekReport,
  viable: string,
): FirstWeekSignal | null {
  const order = scenario.experiments.interview.buckets.map((b) => b.id)
  const mean = (seg: string) => {
    const ivs = report.interviews.filter((iv) => iv.segmentId === seg)
    return ivs.length ? ivs.reduce((t, iv) => t + order.indexOf(iv.bucketId), 0) / ivs.length : null
  }
  const means = scenario.segments.map((s) => ({ id: s.id, mean: mean(s.id) }))
  if (means.some((m) => m.mean === null)) return null
  const own = means.find((m) => m.id === viable)?.mean ?? 0
  const ivs = report.interviews.filter((iv) => iv.segmentId === viable)
  return {
    viableRankedFirst: means.every((m) => m.id === viable || (m.mean ?? 0) < (own ?? 0)),
    viableTopShare: ivs.filter((iv) => iv.bucketId === order.at(-1)).length / ivs.length,
  }
}

function repeats(scenario: Scenario, drawn: readonly { eventId: string }[]): number {
  const once = new Set(scenario.events.filter((e) => e.once).map((e) => e.id))
  const ids = drawn.map((d) => d.eventId).filter((id) => once.has(id))
  return ids.length - new Set(ids).size
}

/** The engine's win test over the ledger so far: revenue covers every cost in each last month. */
function profitableMonths(state: GameState, months: number): boolean {
  const per = state.scenario.finance.weeksPerMonth
  if (state.ledger.length < months * per) return false
  for (let m = 0; m < months; m++) {
    const end = state.ledger.length - m * per
    const month = state.ledger.slice(end - per, end)
    const revenue = month.reduce((t, l) => t + l.revenueCents, 0)
    const costs = month.reduce(
      (t, l) => t + l.fixedCostsCents + l.freelanceCents + l.livingCostsCents,
      0,
    )
    if (revenue < costs) return false
  }
  return true
}

const monthlyRevenue = (s: GameState) =>
  s.customers.filter((c) => c.churnedWeek === null).reduce((t, c) => t + c.priceCentsPerMonth, 0)

/** Plays one full run. Throws if a strategy produces an invalid plan, which is a bot bug. */
export function runGame(real: Scenario, strategy: Strategy, seed: string): RunResult {
  const scenario = strategy.adapt ? strategy.adapt(real) : real
  let state = createGame(scenario, seed)
  const player = strategy.create(scenario, seed)
  let peak = 0
  let peakCustomers = 0
  let customersAtCheck = 0
  let revenueAtCheck = 0
  let minEnergy = state.founder.energy
  let hours = 0
  let outreachHours = 0
  let weeks = 0
  let priceChanges = 0
  let firstReport: WeekReport | null = null
  let firstWeekInterviews: number | null = null
  const focus: (string | null)[] = []
  let freelanceAt: { week: number; market: string | null } | null = null
  let pacingWeeks = 0
  let noteworthyWeeks = 0
  let decisionWeeks = 0
  let messageWeeks = 0
  let dryWeeks = 0
  let firstDryWeek: number | null = null
  const chases = { count: 0, hours: 0, wouldPay: 0, waited: 0, never: 0 }
  let year2Weeks = 0
  let year2DecisionWeeks = 0
  let at60: RunResult['at60'] = scenario.maxWeeks > STANDARD_WEEKS ? 'over' : null

  while (state.status === 'running') {
    for (const answer of player.respond?.(getView(state)) ?? []) {
      state = respond(state, answer.messageId, answer.choiceId)
    }
    const plan = player.plan(getView(state))
    if (
      plan.priceCentsPerMonth !== null &&
      plan.priceCentsPerMonth !== state.company.priceCentsPerMonth
    )
      priceChanges++
    const issues = validatePlan(state, plan)
    if (issues.length > 0) {
      throw new Error(
        `${strategy.id} made an invalid plan in week ${state.week} (seed ${seed}): ${JSON.stringify(issues)}`,
      )
    }
    if (weeks === 0) {
      const counts = scenario.segments.map((seg) => plan.interviews[seg.id] ?? 0)
      firstWeekInterviews = Math.min(...counts) > 0 ? Math.min(...counts) : null
    }
    const inboxBefore = state.inbox.length
    for (const id of plan.chase) {
      chases.count++
      chases.hours += scenario.finance.chaseHours
      const payWeek = state.hidden.payWeeks[id]
      if (payWeek !== null && payWeek !== undefined) chases.wouldPay++
      else if (state.hidden.waitsForChase.includes(id)) chases.waited++
      else chases.never++
    }
    const result = endWeek(state, plan)
    if (freelanceAt === null && result.report.entries.some((e) => e.kind === 'freelance_booked')) {
      freelanceAt = { week: result.report.week, market: null }
    }
    // The market is the one the player works on in the freelancer's first week of work.
    if (
      freelanceAt?.market === null &&
      result.report.entries.some((e) => e.kind === 'freelance_output')
    ) {
      freelanceAt = { ...freelanceAt, market: player.focus ? player.focus() : null }
    }
    state = result.state
    weeks++
    if (result.report.week <= PACING_WEEKS) {
      pacingWeeks++
      // Messages drawn now arrive at the start of the next week; week 1 starts with none.
      const arrived = state.inbox.length > inboxBefore
      if (result.report.entries.some(isNoteworthy) || arrived) noteworthyWeeks++
      if (arrived) messageWeeks++
      if (arrived || result.report.entries.some(isDecisive)) decisionWeeks++
    }
    if (at60 !== null && result.report.week >= YEAR2_WEEK) {
      year2Weeks++
      const arrived = state.inbox.length > inboxBefore
      if (arrived || result.report.entries.some(isDecisive)) year2DecisionWeeks++
    }
    if (at60 !== null && result.report.week === STANDARD_WEEKS && state.status === 'running') {
      at60 = profitableMonths(state, 2) ? 'profitable' : 'alive'
    }
    if (state.status === 'running') {
      const open = state.inbox.filter((m) => m.status === 'open').length
      if (state.inbox.length === inboxBefore && open < scenario.inbox.guaranteeBelowOpen) {
        dryWeeks++
        firstDryWeek ??= result.report.week
      }
    }
    firstReport ??= result.report
    hours += result.report.plannedHours
    for (const o of Object.values(plan.outreach)) outreachHours += o.hours
    minEnergy = Math.min(minEnergy, state.founder.energy)
    peak = Math.max(peak, monthlyRevenue(state))
    peakCustomers = Math.max(
      peakCustomers,
      state.customers.filter((c) => c.churnedWeek === null).length,
    )
    if (result.report.week === CHECK_WEEK) {
      customersAtCheck = state.customers.filter((c) => c.churnedWeek === null).length
      revenueAtCheck = monthlyRevenue(state)
    }
    player.observe?.(result.report, getView(state))
    if (result.report.week <= EVIDENCE_WEEK) focus.push(player.focus ? player.focus() : null)
  }

  const viable = Object.entries(state.hidden.segments).find(([, h]) => h.roleId === 'viable')
  const viableId = viable?.[0] ?? ''
  let evidenceByCheck: boolean | null = null
  if (player.focus) {
    const customer = state.customers.some((c) => c.sinceWeek <= EVIDENCE_WEEK)
    const left = focus.some(
      (f, i) => f !== null && f !== viableId && focus.slice(i + 1).some((g) => g !== f),
    )
    evidenceByCheck = customer || left
  }
  const customersBySource: Record<string, number> = {}
  for (const c of state.customers) {
    const lead = state.leads.find((l) => l.id === c.leadId)
    const key =
      lead?.source === 'outreach' ? `outreach:${lead.channel}` : (lead?.source ?? 'unknown')
    customersBySource[key] = (customersBySource[key] ?? 0) + 1
  }
  const signal = firstReport && viable ? firstWeekSignal(scenario, firstReport, viable[0]) : null
  return {
    strategy: strategy.id,
    seed,
    ending: state.ending ?? 'still_searching',
    weeks: state.week,
    viableSegment: viable?.[0] ?? '',
    roles: Object.fromEntries(
      Object.entries(state.hidden.segments).map(([id, h]) => [id, h.roleId]),
    ),
    peakMonthlyRevenueCents: peak,
    revenueReceivedCents: state.ledger.reduce((t, l) => t + l.revenueCents, 0),
    peakCustomers,
    firstCustomerWeek: state.customers[0]?.sinceWeek ?? null,
    finalPriceCents: state.company.priceCentsPerMonth,
    priceChanges,
    wtpCents: Object.fromEntries(
      Object.entries(state.hidden.segments).map(([id, h]) => [id, h.wtpCents]),
    ),
    customersEnd: state.customers.filter((c) => c.churnedWeek === null).length,
    finalWealthCents: state.company.cashCents + state.founder.savingsCents,
    hiredWeek: state.team.members[0]?.offerWeek ?? null,
    hiredRole: state.team.members[0]?.role ?? null,
    pacingWeeks,
    noteworthyWeeks,
    decisionWeeks,
    messageWeeks,
    chases,
    plannedHoursTotal: hours,
    year2Weeks,
    year2DecisionWeeks,
    at60,
    hires: state.team.members.map((m) => ({
      week: m.offerWeek,
      role: m.role,
      partTime: m.partTime === true,
    })),
    lettingsGo: state.team.members.filter((m) => m.letGoWeek !== null).length,
    teamAtEnd: state.team.members.filter((m) => m.letGoWeek === null).length,
    eventsSeen: state.drawnEvents.map((d) => d.eventId),
    dryWeeks,
    firstDryWeek,
    repeatedEvents: repeats(scenario, state.drawnEvents),
    evidenceByCheck,
    customersBySource,
    hire: hireEconomics(state),
    funding: fundingResult(state),
    tourism: tourismResult(state, viableId),
    loan: state.loan
      ? {
          borrowedCents: state.loan.loans.reduce((t, l) => t + l.principalCents, 0),
          interestCents: state.loan.loans.reduce(
            (t, l) => t + l.interestPaidCents + l.feesCents,
            0,
          ),
          loans: state.loan.loans.length,
          missed: state.loan.loans.some((l) => l.missedTotal > 0),
          missedByLoan: state.loan.loans.some((l) => {
            if (l.firstMissedWeek === undefined) return false
            const before = state.ledger.filter(
              (w) => w.week < l.firstMissedWeek! && w.week >= l.firstMissedWeek! - 4,
            )
            const operating = before.reduce(
              (t, w) =>
                t +
                w.revenueCents +
                w.otherIncomeCents -
                w.fixedCostsCents -
                w.freelanceCents -
                w.bookingCostsCents -
                w.livingCostsCents -
                w.adSpendCents -
                w.otherCostsCents,
              0,
            )
            return before.length > 0 && operating >= 0
          }),
          second: state.loan.loans.length >= 2,
        }
      : null,
    freelance: freelanceAt && {
      role: state.team.freelancers[0]?.role ?? 'developer',
      market: freelanceAt.market,
      bookedWeek: freelanceAt.week,
      costCents: state.ledger.reduce((t, l) => t + l.freelanceCents, 0),
      weeks: state.ledger.filter((l) => l.freelanceCents > 0).length,
      workedHours: state.team.freelancers.reduce((t, f) => t + f.workedHours, 0),
    },
    customersAtCheck,
    monthlyRevenueAtCheckCents: revenueAtCheck,
    minEnergy,
    meanPlannedHours: weeks ? hours / weeks : 0,
    leads: state.leads.length,
    outreachHours,
    landingTests: state.actionLog.reduce(
      (t, a) =>
        t + (a.type === 'endWeek' ? Object.values(a.plan.landing).filter((b) => b > 0).length : 0),
      0,
    ),
    presaleBatches: state.actionLog.reduce(
      (t, a) =>
        t + (a.type === 'endWeek' ? Object.values(a.plan.presales).reduce((x, y) => x + y, 0) : 0),
      0,
    ),
    firstPresaleSegment:
      state.actionLog.flatMap((a) =>
        a.type === 'endWeek'
          ? Object.entries(a.plan.presales).flatMap(([id, n]) => (n > 0 ? [id] : []))
          : [],
      )[0] ?? null,
    booksLeft: state.eventLog.filter(
      (e) => e.kind === 'message' && e.eventId === 'receipts_pile' && e.choiceId === 'later',
    ).length,
    writtenOffInvoices: state.invoices.filter((i) => i.writtenOffWeek !== null).length,
    invoicesIssued: state.invoices.length,
    messages: state.inbox.length,
    messagesAnswered: state.inbox.filter((m) => m.status === 'resolved').length,
    firstWeekSignal: signal,
    firstWeekInterviews,
  }
}

/** `RunResult.funding`: what raising brought, by the post-mortem's rules. */
function fundingResult(state: GameState): RunResult['funding'] {
  if (!state.scenario.funding) return null
  const e = fundingEconomics(state)
  const stakes = state.funding.stakes
  const raising =
    state.funding.round !== null || state.funding.investors.some((i) => i.stage === 'accepted')
  const bankrupt = state.ending === 'bankrupt'
  const value = e?.companyValueCents ?? (bankrupt ? 0 : companyValue(state))
  return {
    raisedCents: e?.raisedCents ?? 0,
    rounds: stakes.map((s) => s.round),
    founderShareBp: e?.founderShareBp ?? 10_000,
    founderValueCents: e?.founderValueCents ?? value,
    firstMoneyWeek: stakes[0]?.week ?? null,
    roundsStarted: e?.roundsStarted ?? 0,
    bankruptWhileRaising: bankrupt && raising,
    bankruptAfterRaise: bankrupt && !raising && stakes.length > 0,
    pitchedTooEarly: e?.pitchedTooEarly ?? 0,
  }
}

/** The company's value by the scenario's visible rule, for a run that never raised. */
function companyValue(state: GameState): number {
  const cfg = state.scenario.funding
  if (!cfg) return 0
  const monthly = state.customers
    .filter((c) => c.churnedWeek === null)
    .reduce((t, c) => t + c.priceCentsPerMonth, 0)
  return Math.max(0, Math.round(cfg.valueRevenueMultiple * 12 * monthly + state.company.cashCents))
}

/** `RunResult.tourism`: what the bookings run served and earned, read from its state. */
function tourismResult(state: GameState, viable: string): RunResult['tourism'] {
  const b = state.bookings
  if (!b) return null
  const all = bookingTotals(b)
  const served = all.filter((x) => x.status === 'served')
  const guests = served.reduce((t, x) => t + x.units, 0)
  const platform = served.filter((x) => x.channel === 'platform').reduce((t, x) => t + x.units, 0)
  const first = served
    .filter((x) => x.segmentId === viable)
    .reduce((m, x) => Math.min(m, x.firstWeek), Number.POSITIVE_INFINITY)
  return {
    guests,
    revenueCents: state.ledger.reduce((t, l) => t + l.bookingRevenueCents, 0),
    rating: b.rating,
    reviews: b.reviews,
    platformShare: guests > 0 ? platform / guests : 0,
    turnedAway: b.turnedAway.reduce((t, x) => t + x.units, 0),
    companyCancelled: all
      .filter((x) => x.status === 'company_cancelled')
      .reduce((t, x) => t + x.units, 0),
    firstViableWeek: Number.isFinite(first) ? first : null,
  }
}
