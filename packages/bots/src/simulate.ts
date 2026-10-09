import type { Scenario } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  respond,
  validatePlan,
  type EndingId,
  type GameState,
  type WeekReport,
} from '@founder-mode/engine'
import type { Strategy } from './strategy'

/** Week at which the playtest numbers are compared. */
export const CHECK_WEEK = 15

export type RunResult = {
  strategy: string
  seed: string
  ending: EndingId
  /** The week in which the run ended. */
  weeks: number
  /** Hidden truth, read by the report only: the segment with the viable role. */
  viableSegment: string
  peakMonthlyRevenueCents: number
  /** Money received from customers over the whole run. */
  revenueReceivedCents: number
  /** Most customers active at the end of any week. */
  peakCustomers: number
  /** Week the first customer signed, or null when none did. */
  firstCustomerWeek: number | null
  /** Monthly price at the end of the run. */
  finalPriceCents: number
  customersEnd: number
  customersAtCheck: number
  monthlyRevenueAtCheckCents: number
  minEnergy: number
  meanPlannedHours: number
  leads: number
  outreachHours: number
  /** Landing page tests and pre-sale batches the run paid for. */
  landingTests: number
  presaleBatches: number
  /** Bookkeeping penalties, and invoices written off, over the run. */
  bookkeepingPenalties: number
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
  let firstReport: WeekReport | null = null
  let firstWeekInterviews: number | null = null

  while (state.status === 'running') {
    for (const answer of player.respond?.(getView(state)) ?? []) {
      state = respond(state, answer.messageId, answer.choiceId)
    }
    const plan = player.plan(getView(state))
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
    const result = endWeek(state, plan)
    state = result.state
    weeks++
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
  }

  const viable = Object.entries(state.hidden.segments).find(([, h]) => h.roleId === 'viable')
  const signal = firstReport && viable ? firstWeekSignal(scenario, firstReport, viable[0]) : null
  return {
    strategy: strategy.id,
    seed,
    ending: state.ending ?? 'still_searching',
    weeks: state.week,
    viableSegment: viable?.[0] ?? '',
    peakMonthlyRevenueCents: peak,
    revenueReceivedCents: state.ledger.reduce((t, l) => t + l.revenueCents, 0),
    peakCustomers,
    firstCustomerWeek: state.customers[0]?.sinceWeek ?? null,
    finalPriceCents: state.company.priceCentsPerMonth,
    customersEnd: state.customers.filter((c) => c.churnedWeek === null).length,
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
    bookkeepingPenalties: state.eventLog.filter((e) => e.kind === 'bookkeeping_penalty').length,
    writtenOffInvoices: state.invoices.filter((i) => i.writtenOffWeek !== null).length,
    invoicesIssued: state.invoices.length,
    messages: state.inbox.length,
    messagesAnswered: state.inbox.filter((m) => m.status === 'resolved').length,
    firstWeekSignal: signal,
    firstWeekInterviews,
  }
}
