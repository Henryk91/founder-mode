import type { TrialConfig } from '@founder-mode/content'
import type { Rng } from '../rng'
import type {
  Evidence,
  ExperimentEvent,
  GameState,
  PendingExperiment,
  ReportEntry,
  SegmentId,
  Voucher,
  WeekPlan,
} from '../types'
import { priceCurve } from './market'

// Plan 2 step 1a: the tourism specs' own experiments (trials) and vouchers, in place of landing
// page tests and pre-sales. Every function here does nothing without a `trials` or `vouchers`
// block, so the subscription games never draw a random number in this file.

const isShipped = (state: GameState, id: string) =>
  state.product.features.some((f) => f.id === id && f.shippedWeek !== null)

/** The segment's price per unit this week (peak or off season). */
function segmentPrice(state: GameState, segmentId: SegmentId): number {
  const cfg = state.scenario.bookings!
  const p = state.bookings?.prices[segmentId]
  if (!p) return 0
  const woy = ((cfg.startWeekOfYear - 1 + state.week - 1) % 52) + 1
  const month = Math.min(12, Math.floor(((woy - 1) * 12) / 52) + 1)
  return cfg.peakMonths.includes(month) ? p.peak : p.off
}

/** Chance a person of a segment responds: honest about its pain, and about the price asked. */
function responseChance(
  state: GameState,
  rate: { base: number; perPain: number },
  segmentId: SegmentId,
  priceCents: number,
): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return 0
  const curve = priceCurve(state.scenario, priceCents / Math.max(1, hidden.wtpCents))
  return Math.min(1, (rate.base + rate.perPain * hidden.pain) * curve)
}

const plansOf = (state: GameState, plan?: WeekPlan): WeekPlan[] => [
  ...state.actionLog.flatMap((a) => (a.type === 'endWeek' ? [a.plan] : [])),
  ...(plan ? [plan] : []),
]

/** Runs of a trial so far (in that segment, for a trial where the player picks one). */
export function trialsUsed(
  state: GameState,
  trialId: string,
  segmentId: SegmentId | null,
  plan?: WeekPlan,
): number {
  let n = 0
  for (const p of plansOf(state, plan)) {
    for (const t of p.bookings?.trials ?? []) {
      if (t.id === trialId && (segmentId === null || t.segmentId === segmentId)) n++
    }
  }
  return n
}

/** Voucher batches offered to a segment so far. */
export function voucherBatchesUsed(
  state: GameState,
  segmentId: SegmentId,
  plan?: WeekPlan,
): number {
  let n = 0
  for (const p of plansOf(state, plan)) n += p.bookings?.vouchers?.[segmentId] ?? 0
  return n
}

/** A trial can run now: before the product it waits for has opened, if it waits for one. */
export function trialOpen(state: GameState, t: TrialConfig): boolean {
  return t.before === undefined || !isShipped(state, t.before)
}

/** Founder hours of the week's trials and voucher batches. */
export function trialsHours(state: Pick<GameState, 'scenario'>, plan: WeekPlan): number {
  const cfg = state.scenario.bookings
  const p = plan.bookings
  if (!cfg || !p) return 0
  let hours = 0
  for (const t of p.trials ?? []) hours += cfg.trials?.[t.id]?.hours ?? 0
  for (const n of Object.values(p.vouchers ?? {})) hours += n * (cfg.vouchers?.hoursPerBatch ?? 0)
  return hours
}

/** What the week's trials cost (gear wear, ingredients, a listing fee, cake). */
export function trialsCostCents(state: Pick<GameState, 'scenario'>, plan: WeekPlan): number {
  const cfg = state.scenario.bookings
  let cents = 0
  for (const t of plan.bookings?.trials ?? []) cents += cfg?.trials?.[t.id]?.cents ?? 0
  return cents
}

/** Whether the trials and vouchers of a plan can be carried out. */
export function trialsValid(state: GameState, plan: WeekPlan): boolean {
  const cfg = state.scenario.bookings
  const p = plan.bookings
  if (!p) return true
  const trials = p.trials ?? []
  if (trials.length > 0) {
    if (!cfg?.trials) return false
    const seen = new Set<string>()
    for (const t of trials) {
      const c = cfg.trials[t.id]
      if (!c || !trialOpen(state, c)) return false
      const key = `${t.id}|${t.segmentId ?? ''}`
      if (seen.has(key)) return false
      seen.add(key)
      if (c.choose) {
        if (t.segmentId === null || !(c.reach[t.segmentId] ?? 0)) return false
      } else if (t.segmentId !== null) return false
      if (trialsUsed(state, t.id, c.choose ? t.segmentId : null, plan) > c.max) return false
    }
  }
  for (const [seg, n] of Object.entries(p.vouchers ?? {})) {
    if (n === 0) continue
    const v = cfg?.vouchers
    if (!v || !v.segments.includes(seg) || !Number.isInteger(n) || n < 0) return false
    if (voucherBatchesUsed(state, seg, plan) > v.maxBatches) return false
  }
  return true
}

/** Starts the week's trials and voucher offers; their results come when due. */
export function startTrials(state: GameState, plan: WeekPlan): GameState {
  const cfg = state.scenario.bookings
  const p = plan.bookings
  if (!cfg || !p) return state
  const started: PendingExperiment[] = []
  for (const t of p.trials ?? []) {
    const c = cfg.trials?.[t.id]
    if (!c) continue
    const groups: [SegmentId, number][] = c.choose
      ? [[t.segmentId!, c.people]]
      : state.scenario.segments.map((s) => [s.id, Math.round(c.people * (c.reach[s.id] ?? 0))])
    for (const [seg, people] of groups) {
      if (people <= 0) continue
      const price = segmentPrice(state, seg)
      started.push({
        kind: 'trial',
        trialId: t.id,
        segmentId: seg,
        startWeek: state.week,
        resolveWeek: state.week + c.weeks,
        trials: people,
        p: responseChance(state, c.rate, seg, price),
        budgetCents: 0,
        priceCents: price,
      })
    }
  }
  const v = cfg.vouchers
  for (const seg of state.scenario.segments) {
    const n = p.vouchers?.[seg.id] ?? 0
    if (!v || n <= 0) continue
    const price = segmentPrice(state, seg.id) * v.units
    started.push({
      kind: 'voucher',
      segmentId: seg.id,
      startWeek: state.week,
      resolveWeek: state.week + 1,
      trials: n * v.batchSize,
      p: responseChance(state, v.rate, seg.id, price / v.units),
      budgetCents: 0,
      priceCents: price,
    })
  }
  if (started.length === 0) return state
  return {
    ...state,
    hidden: { ...state.hidden, experiments: [...state.hidden.experiments, ...started] },
  }
}

export type TrialsOutcome = {
  state: GameState
  entries: ReportEntry[]
  /** Paid by trial guests on the day: revenue. */
  revenueCents: number
  /** Vouchers sold: cash, not revenue. */
  voucherCents: number
}

/**
 * The results of trials and voucher offers due this week. A trial's people respond by its chance;
 * paying guests pay the segment's price, those who respond may join the repeat guests, and some
 * segments' guests leave a review. Each voucher sold pays now; whether and when its guests ask for
 * a date is drawn now and kept hidden.
 */
export function resolveTrials(state: GameState, rng: Rng): TrialsOutcome {
  const cfg = state.scenario.bookings
  const out: TrialsOutcome = { state, entries: [], revenueCents: 0, voucherCents: 0 }
  if (!cfg || !state.bookings) return out
  const due = state.hidden.experiments.filter(
    (e) => (e.kind === 'trial' || e.kind === 'voucher') && e.resolveWeek <= state.week,
  )
  if (due.length === 0) return out
  let b = { ...state.bookings, repeatGuests: { ...state.bookings.repeatGuests } }
  const knowledge = { ...state.knowledge }
  const events: ExperimentEvent[] = []
  const vouchers: Voucher[] = [...(b.vouchers ?? [])]
  const voucherWeeks = { ...(state.hidden.bookings?.voucherWeeks ?? {}) }
  let rating = b.rating
  let reviews = b.reviews
  for (const e of due) {
    const observed = rng.binomial(e.trials, e.p)
    let evidence: Evidence
    if (e.kind === 'trial') {
      const c = cfg.trials![e.trialId!]!
      if (c.paid) out.revenueCents += e.trials * e.priceCents
      if (c.repeat && observed > 0) {
        b.repeatGuests[e.segmentId] = (b.repeatGuests[e.segmentId] ?? 0) + observed
      }
      if (c.reviewFrom.includes(e.segmentId)) {
        const r = cfg.reviews
        const wtp = state.hidden.segments[e.segmentId]?.wtpCents ?? e.priceCents
        const bonus =
          state.scenario.officeStages.find((o) => o.id === state.company.officeStage)
            ?.qualityBonus ?? 0
        const q = Math.min(
          5,
          Math.max(
            1,
            r.qualityBase +
              bonus -
              r.valueWeight * Math.max(0, e.priceCents / wtp - 1) +
              rng.normal(r.noiseSd),
          ),
        )
        rating = ((rating ?? 0) * reviews + q) / (reviews + 1)
        reviews += 1
        out.entries.push({ kind: 'review', rating, reviews, added: 1 })
      }
      evidence = {
        kind: 'trial',
        week: state.week,
        segmentId: e.segmentId,
        trialId: e.trialId!,
        people: e.trials,
        responses: observed,
        priceCents: e.priceCents,
      }
      out.entries.push({
        kind: 'trial_result',
        trialId: e.trialId!,
        segmentId: e.segmentId,
        people: e.trials,
        responses: observed,
      })
    } else {
      const v = cfg.vouchers!
      for (let i = 0; i < observed; i++) {
        const id = `voucher_${vouchers.length + 1}`
        vouchers.push({
          id,
          segmentId: e.segmentId,
          soldWeek: state.week,
          units: v.units,
          valueCents: e.priceCents,
          redeemedWeek: null,
        })
        voucherWeeks[id] = rng.chance(v.redeemShare)
          ? state.week + rng.int(v.redeemWeeks.min, v.redeemWeeks.max)
          : null
      }
      out.voucherCents += observed * e.priceCents
      evidence = {
        kind: 'voucher',
        week: state.week,
        segmentId: e.segmentId,
        prospects: e.trials,
        sold: observed,
        priceCents: e.priceCents,
      }
      out.entries.push({
        kind: 'voucher_result',
        segmentId: e.segmentId,
        prospects: e.trials,
        sold: observed,
        amountCents: observed * e.priceCents,
      })
    }
    knowledge[e.segmentId] = [...(knowledge[e.segmentId] ?? []), evidence]
    events.push({
      kind: e.kind,
      week: state.week,
      segmentId: e.segmentId,
      expected: e.trials * e.p,
      observed,
    })
  }
  b = { ...b, rating, reviews, ...(vouchers.length ? { vouchers } : {}) }
  out.state = {
    ...state,
    knowledge,
    bookings: b,
    hidden: {
      ...state.hidden,
      experiments: state.hidden.experiments.filter((e) => !due.includes(e)),
      bookings: { ...state.hidden.bookings!, voucherWeeks },
    },
    eventLog: [...state.eventLog, ...events],
  }
  return out
}

/** Vouchers sold and not yet redeemed: what the company still owes in guests. */
export function openVouchers(state: Pick<GameState, 'bookings'>): Voucher[] {
  return (state.bookings?.vouchers ?? []).filter((v) => v.redeemedWeek === null)
}
