import type { ChannelId } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { HiddenSegment, Scenario, SegmentId } from '../types'

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
    }
  })
  return out
}
