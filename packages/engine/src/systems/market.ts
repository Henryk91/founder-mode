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

/** 1 up to the willingness to pay, then falling off as exp(-slope * (price / wtp - 1)). */
export function priceFactor(state: GameState, segmentId: SegmentId): number {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) return 0
  const price = state.company.priceCentsPerMonth
  if (price <= hidden.wtpCents) return 1
  return expNeg(state.scenario.sales.priceSlope * (price / hidden.wtpCents - 1))
}
