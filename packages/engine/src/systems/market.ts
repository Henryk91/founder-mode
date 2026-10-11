import { expNeg } from '../math'
import type { ChannelId } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { GameState, HiddenSegment, Scenario, SegmentId } from '../types'

/**
 * Draws the hidden demand of every segment. Roles (viable, mediocre, trap) are shuffled across
 * segments first, so every run has one good market and one trap in a different place.
 */
export function drawHiddenSegments(scenario: Scenario, rng: Rng): Record<SegmentId, HiddenSegment> {
  const roles = rng.shuffle(scenario.roles)
  const out: Record<SegmentId, HiddenSegment> = {}
  scenario.segments.forEach((seg, i) => {
    const role = roles[i]
    if (!role) throw new Error(`No role for segment ${seg.id}`)
    const channelResponse = {} as HiddenSegment['channelResponse']
    // Sorted so the draw order does not depend on key order in the YAML.
    for (const channel of Object.keys(seg.channelResponse).sort() as ChannelId[]) {
      const r = seg.channelResponse[channel]
      channelResponse[channel] = rng.range(r.min, r.max)
    }
    out[seg.id] = {
      roleId: role.id,
      size: rng.int(seg.size.min, seg.size.max),
      pain: rng.range(role.pain.min, role.pain.max),
      politeness: rng.range(role.politeness.min, role.politeness.max),
      wtpCents: rng.int(seg.wtpCents.min, seg.wtpCents.max),
      mustHave: [...seg.mustHave],
      channelResponse,
      paymentDelayDaysMean: seg.paymentDelayDaysMean,
      neverPaysShare: seg.neverPaysShare,
      waitsForChaseShare: seg.waitsForChaseShare,
    }
  })
  return out
}

/** Share of a segment's must have features that have shipped (0..1). */
export function coverage(state: GameState, segmentId: SegmentId): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden || hidden.mustHave.length === 0) return 0
  const shipped = hidden.mustHave.filter((id) =>
    state.product.features.some((f) => f.id === id && f.shippedWeek !== null),
  )
  return shipped.length / hidden.mustHave.length
}

/** How well the product fits a segment: pain * coverage * (fitBase + fitPerQuality * quality / 100). */
export function fit(state: GameState, segmentId: SegmentId): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return 0
  const { fitBase, fitPerQuality } = state.scenario.product
  return (
    hidden.pain *
    coverage(state, segmentId) *
    (fitBase + (fitPerQuality * state.product.quality) / 100)
  )
}

/**
 * How the current price changes a yes in a segment: 1 at a price of 0, falling smoothly as the
 * price nears and passes the willingness to pay (a logistic curve in price / wtp, scenario
 * `sales.price`).
 */
export function priceFactor(state: GameState, segmentId: SegmentId): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return 0
  return priceCurve(state.scenario, state.company.priceCentsPerMonth / hidden.wtpCents)
}

/** (1 + e^(-k m)) / (1 + e^(k (r - m))), computed with expNeg only. */
export function priceCurve(scenario: Scenario, ratio: number): number {
  const { midpoint, steepness } = scenario.sales.price
  const x = steepness * (ratio - midpoint)
  const atZero = 1 + expNeg(steepness * midpoint)
  if (x <= 0) return atZero / (1 + expNeg(-x))
  const shrink = expNeg(x)
  // e^x = 1 / shrink; past about e^60 nobody says yes.
  return shrink === 0 ? 0 : (atZero * shrink) / (shrink + 1)
}

/**
 * The part of a customer's monthly chance to leave that comes from their own price:
 * perPrice * max(0, price / wtp - priceFrom).
 */
export function priceChurn(state: GameState, segmentId: SegmentId, priceCents: number): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return 0
  const { priceFrom, perPrice } = state.scenario.sales.churn
  return perPrice * Math.max(0, priceCents / hidden.wtpCents - priceFrom)
}
