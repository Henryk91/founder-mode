import { Rng, seedRng } from '../rng'
import type {
  GameState,
  Loss,
  LossCause,
  LossReasonKind,
  LossReasonsLine,
  LossView,
  ReportEntry,
  SegmentId,
  StatedReason,
  WeekPlan,
} from '../types'
import { fit } from './market'
import { leisureAlternativeMet } from './requirements'

/**
 * Plan 7: reasons for losses. Every lost lead and every customer who leaves gets a loss record
 * with its real cause (hidden), and maybe a reason they give unprompted. The player can ask why,
 * and an answer may come the next week. What they say is the real cause with a chance that falls
 * with the market's politeness, else a softer reason. Draws come from streams of their own, so
 * the rest of the game plays the same whether or not anyone asks.
 */

const SOFT: readonly LossReasonKind[] = ['budget_freeze', 'bad_timing', 'next_year']
/** Lead updates that lose the lead. */
const LOST_CHANGES = new Set<string>(['declined', 'declined_price', 'lost_silent', 'refunded'])

/** Must haves of a segment that have not shipped (or been met another way). */
export function missingFeatures(state: GameState, segmentId: SegmentId): string[] {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return []
  return hidden.mustHave.filter(
    (id) =>
      !state.product.features.some((f) => f.id === id && f.shippedWeek !== null) &&
      !leisureAlternativeMet(state, id),
  )
}

/**
 * How much each part of the fit falls short, 0 to 1 each: must haves missing, quality below what
 * it was at the start (bugs), and pain below the least pain of the scenario's most pained role
 * (a market that manages without it: the mediocre and trap markets, spec 3.1).
 */
function fitShortfalls(state: GameState, segmentId: SegmentId): Record<FitCause, number> {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return { missing_feature: 0, quality: 0, no_need: 1 }
  const { fitBase, fitPerQuality, startQuality } = state.scenario.product
  const must = hidden.mustHave.length
  const missing = must === 0 ? 0 : missingFeatures(state, segmentId).length / must
  const best = fitBase + (fitPerQuality * Math.max(startQuality, state.product.quality)) / 100
  const now = fitBase + (fitPerQuality * state.product.quality) / 100
  const enough = Math.max(0, ...state.scenario.roles.map((r) => r.pain.min))
  return {
    missing_feature: missing,
    quality: best > 0 ? 1 - now / best : 0,
    no_need: enough > 0 ? Math.max(0, enough - hidden.pain) / enough : 0,
  }
}

type FitCause = 'missing_feature' | 'quality' | 'no_need'

/** Picks a key by its weight, with one draw; the last positive weight on rounding. */
function pickWeighted<K extends string>(weights: [K, number][], rng: Rng, fallback: K): K {
  const total = weights.reduce((t, [, w]) => t + Math.max(0, w), 0)
  if (total <= 0) return fallback
  let draw = rng.next() * total
  let last = fallback
  for (const [k, w] of weights) {
    if (w <= 0) continue
    last = k
    if (draw < w) return k
    draw -= w
  }
  return last
}

/**
 * The cause of a lead lost at a demo or at the end of a trial without a no over the price: by the
 * fit's shortfalls. When nothing falls short (a pained market, every must have, no bugs), they
 * still say no sometimes: then the price, by how close it is to what they would pay, or the pain
 * they live with.
 */
function declineCause(state: GameState, segmentId: SegmentId, rng: Rng): LossCause {
  const s = fitShortfalls(state, segmentId)
  if (s.missing_feature + s.quality + s.no_need <= 0) {
    const hidden = state.hidden.segments[segmentId]
    const ratio = hidden ? state.company.priceCentsPerMonth / hidden.wtpCents : 1
    return pickWeighted(
      [
        ['price', ratio],
        ['no_need', 1 - (hidden?.pain ?? 0)],
      ],
      rng,
      'no_need',
    )
  }
  return pickWeighted(
    [
      ['missing_feature', s.missing_feature],
      ['quality', s.quality],
      ['no_need', s.no_need],
    ],
    rng,
    'no_need',
  )
}

/**
 * The cause of a customer who left, not over the price: their chance to leave split by its parts,
 * the base (the pain faded), the misfit (split by the fit's shortfalls) and the bugs (quality).
 */
function churnCause(state: GameState, segmentId: SegmentId, rng: Rng): LossCause {
  const c = state.scenario.sales.churn
  const misfit = c.perMisfit * (1 - fit(state, segmentId))
  const s = fitShortfalls(state, segmentId)
  const sum = s.missing_feature + s.quality + s.no_need
  const share = (x: number) => (sum > 0 ? (misfit * x) / sum : 0)
  return pickWeighted(
    [
      ['missing_feature', share(s.missing_feature)],
      ['quality', share(s.quality) + c.perBug * state.product.bugs],
      ['no_need', share(s.no_need) + c.base],
    ],
    rng,
    'no_need',
  )
}

/** Chance that a market's stated reason is the real cause: lower the more polite it is. */
export function honesty(state: GameState, segmentId: SegmentId): number {
  const cfg = state.scenario.sales.losses
  if (!cfg) return 1
  const politeness = state.hidden.segments[segmentId]?.politeness ?? 0
  return Math.min(
    1,
    Math.max(0, cfg.honesty.max - (cfg.honesty.max - cfg.honesty.min) * politeness),
  )
}

/** What a lost lead or customer says, drawn from `rng`: the cause if honest, else a soft reason. */
function statedReason(
  state: GameState,
  loss: Loss,
  cause: { cause: LossCause; featureId: string | null },
  rng: Rng,
  week: number,
  asked: boolean,
): StatedReason {
  const truthful =
    cause.cause !== 'silent' &&
    cause.cause !== 'stopped_paying' &&
    rng.chance(honesty(state, loss.segmentId))
  const kind: LossReasonKind = truthful ? (cause.cause as LossReasonKind) : rng.pick(SOFT)
  const featureId = truthful && kind === 'missing_feature' ? cause.featureId : null
  const texts = state.scenario.lossReasons?.[loss.segmentId]?.[kind] ?? []
  const feature = state.scenario.features.find((f) => f.id === featureId)
  const need = feature ? (feature.missing ?? feature.name) : ''
  const text = texts.length > 0 ? rng.pick(texts).split('{need}').join(need) : ''
  return { kind, featureId, text, week, asked }
}

/** Last week in which a loss can be asked about. */
export const askUntilWeek = (state: GameState, loss: Loss): number =>
  loss.week + (state.scenario.sales.losses?.askWeeks ?? 0)

/** Whether the player can ask why about this loss in the current week. */
export function canAsk(state: GameState, loss: Loss): boolean {
  return (
    !!state.scenario.sales.losses &&
    state.status === 'running' &&
    loss.askable &&
    loss.stated === null &&
    loss.askedWeek === null &&
    state.week > loss.week &&
    state.week <= askUntilWeek(state, loss)
  )
}

/** Founder hours of the plan's Ask why. */
export function askHours(state: Pick<GameState, 'scenario'>, plan: WeekPlan): number {
  return (plan.askWhy?.length ?? 0) * (state.scenario.sales.losses?.askHours ?? 0)
}

/**
 * The week's losses, after churn (end of `endWeek`): answers to this week's asks, then a record
 * for every lead lost and every customer who left this week, in list order, each with its cause
 * and maybe a reason given unprompted. The report's loss entries get the record's id.
 */
export function recordLosses(
  before: GameState,
  state: GameState,
  plan: WeekPlan,
  entries: ReportEntry[],
): { state: GameState; entries: ReportEntry[] } {
  const cfg = state.scenario.sales.losses
  if (!cfg || state.bookings) return { state, entries }
  const week = before.week
  const losses = [...(state.losses ?? [])]
  const causes = { ...(state.hidden.lossCauses ?? {}) }
  const stream = (what: string, id: string) => new Rng(seedRng(`${state.seed}|${what}|${id}`))

  // Answers to this week's asks arrive next week.
  for (const id of plan.askWhy ?? []) {
    const at = losses.findIndex((l) => l.id === id)
    const loss = losses[at]
    const cause = causes[id]
    if (!loss || !cause) continue
    const rng = stream('ask', id)
    const answered = rng.chance(cfg.answerShare)
    losses[at] = {
      ...loss,
      askedWeek: week,
      stated: answered ? statedReason(state, loss, cause, rng, week + 1, true) : null,
      unanswered: !answered,
    }
  }

  const add = (
    base: Omit<Loss, 'id' | 'stated' | 'askedWeek' | 'unanswered' | 'askable'>,
    cause: (rng: Rng) => { cause: LossCause; featureId: string | null },
  ): string => {
    const id = `loss_${losses.length + 1}`
    const rng = stream('loss', id)
    const real = cause(rng)
    const askable = real.cause !== 'silent' && real.cause !== 'stopped_paying'
    const loss: Loss = { ...base, id, askable, stated: null, askedWeek: null, unanswered: false }
    if (askable && rng.chance(cfg.unpromptedShare)) {
      loss.stated = statedReason(state, loss, real, rng, week, false)
    }
    causes[id] = real
    losses.push(loss)
    return id
  }
  const missing = (segmentId: SegmentId, rng: Rng) => {
    const options = missingFeatures(state, segmentId)
    return options.length > 0 ? rng.pick(options) : null
  }
  const withFeature = (segmentId: SegmentId, c: LossCause, rng: Rng) => {
    if (c !== 'missing_feature') return { cause: c, featureId: null }
    const featureId = missing(segmentId, rng)
    return featureId ? { cause: c, featureId } : { cause: 'no_need' as const, featureId: null }
  }

  const ids = new Map<string, string>()
  const wasLost = new Set(before.leads.filter((l) => l.stage === 'lost').map((l) => l.id))
  for (const lead of state.leads) {
    if (lead.stage !== 'lost' || wasLost.has(lead.id) || lead.lostReason === null) continue
    const reason = lead.lostReason
    const id = add(
      {
        kind: 'lead',
        refId: lead.id,
        name: lead.name,
        segmentId: lead.segmentId,
        week,
        tag: reason,
        paidWeeks: null,
      },
      (rng) =>
        reason === 'price'
          ? { cause: 'price', featureId: null }
          : reason === 'silent'
            ? { cause: 'silent', featureId: null }
            : reason === 'refunded'
              ? withFeature(lead.segmentId, 'missing_feature', rng)
              : withFeature(lead.segmentId, declineCause(state, lead.segmentId, rng), rng),
    )
    ids.set(lead.id, id)
  }
  const wasGone = new Set(before.customers.filter((c) => c.churnedWeek !== null).map((c) => c.id))
  for (const c of state.customers) {
    if (c.churnedWeek === null || wasGone.has(c.id)) continue
    const stopped = c.churnReason === 'stopped_paying'
    const id = add(
      {
        kind: 'customer',
        refId: c.id,
        name: c.name,
        segmentId: c.segmentId,
        week,
        tag: stopped ? 'stopped_paying' : 'cancelled',
        paidWeeks: Math.max(0, week - c.sinceWeek),
      },
      (rng) =>
        stopped
          ? { cause: 'stopped_paying', featureId: null }
          : c.churnReason === 'price'
            ? { cause: 'price', featureId: null }
            : withFeature(c.segmentId, churnCause(state, c.segmentId, rng), rng),
    )
    ids.set(c.id, id)
  }

  const tagged = entries.map((e): ReportEntry => {
    if (e.kind === 'lead_update' && LOST_CHANGES.has(e.change) && ids.has(e.leadId)) {
      return { ...e, lossId: ids.get(e.leadId)! }
    }
    if (e.kind === 'customer_churned' && ids.has(e.customerId)) {
      return { ...e, lossId: ids.get(e.customerId)! }
    }
    if (e.kind === 'invoice_written_off' && e.serviceStopped) {
      const c = state.customers.find(
        (x) => x.name === e.name && x.churnedWeek === week && ids.has(x.id),
      )
      if (c) return { ...e, lossId: ids.get(c.id)! }
    }
    return e
  })
  return {
    state: { ...state, losses, hidden: { ...state.hidden, lossCauses: causes } },
    entries: tagged,
  }
}

/** Every loss as the player sees it, newest first: never the real cause. */
export function lossViews(state: GameState): LossView[] {
  const name = (id: SegmentId) => state.scenario.segments.find((s) => s.id === id)?.name ?? id
  return [...(state.losses ?? [])].reverse().map((l) => ({
    ...l,
    stated: l.stated ? { ...l.stated } : null,
    segmentName: name(l.segmentId),
    canAsk: canAsk(state, l),
    askUntilWeek: askUntilWeek(state, l),
  }))
}

/** Plan 7, post-mortem: per market with losses, stated reasons against real causes. */
export function lossReasonLines(state: GameState): LossReasonsLine[] {
  const causes = state.hidden.lossCauses ?? {}
  type Real = { cause: LossCause; featureId: string | null; count: number }
  const tally = (list: Real[], cause: LossCause, featureId: string | null) => {
    const hit = list.find((r) => r.cause === cause && r.featureId === featureId)
    if (hit) hit.count++
    else list.push({ cause, featureId, count: 1 })
  }
  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count
  const out: LossReasonsLine[] = []
  for (const seg of state.scenario.segments) {
    const here = (state.losses ?? []).filter((l) => l.segmentId === seg.id)
    if (here.length === 0) continue
    const said: LossReasonsLine['said'] = []
    const unsaidReal: Real[] = []
    for (const l of here) {
      const real = causes[l.id] ?? { cause: 'no_need' as const, featureId: null }
      if (l.stated === null) {
        tally(unsaidReal, real.cause, real.featureId)
        continue
      }
      let line = said.find((x) => x.kind === l.stated!.kind)
      if (!line) {
        line = { kind: l.stated.kind, count: 0, real: [] }
        said.push(line)
      }
      line.count++
      tally(line.real, real.cause, real.featureId)
    }
    for (const line of said) line.real.sort(byCount)
    out.push({
      segmentId: seg.id,
      losses: here.length,
      unsaid: here.filter((l) => l.stated === null).length,
      said: said.sort(byCount),
      unsaidReal: unsaidReal.sort(byCount),
    })
  }
  return out
}
