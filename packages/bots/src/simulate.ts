import type { Scenario } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
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
    e.kind === 'candidates_ready'
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
  /** For runs with a hire: what it cost per customer it found, and what a customer was worth. */
  hire: HireEconomics | null
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

const monthlyRevenue = (s: GameState) =>
  s.customers.filter((c) => c.churnedWeek === null).reduce((t, c) => t + c.priceCentsPerMonth, 0)

/** Plays one full run. Throws if a strategy produces an invalid plan, which is a bot bug. */
export function runGame(scenario: Scenario, strategy: Strategy, seed: string): RunResult {
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
  let pacingWeeks = 0
  let noteworthyWeeks = 0
  let decisionWeeks = 0
  let messageWeeks = 0
  let dryWeeks = 0
  let firstDryWeek: number | null = null

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
    const result = endWeek(state, plan)
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
    eventsSeen: state.drawnEvents.map((d) => d.eventId),
    dryWeeks,
    firstDryWeek,
    repeatedEvents: repeats(scenario, state.drawnEvents),
    evidenceByCheck,
    customersBySource,
    hire: hireEconomics(state),
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
