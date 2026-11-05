import type { ChannelId, SegmentId, WeekPlan } from './types'

/** The order channels are listed and resolved in. */
export const CHANNEL_ORDER: Record<ChannelId, number> = { cold_email: 0, phone: 1, in_person: 2 }

/** Every outreach channel, in channel order. */
export const CHANNELS: readonly ChannelId[] = (Object.keys(CHANNEL_ORDER) as ChannelId[]).sort(
  (a, b) => CHANNEL_ORDER[a] - CHANNEL_ORDER[b],
)

/**
 * A plan's outreach as lines of market, channel and hours above 0: markets in scenario order, then
 * channels in channel order (plan 7). Markets the scenario does not have come last, by id.
 */
export function outreachLines(
  plan: Pick<WeekPlan, 'outreach'>,
  segmentOrder: readonly string[] = [],
): { segmentId: SegmentId; channel: ChannelId; hours: number }[] {
  const rank = (id: string) => {
    const i = segmentOrder.indexOf(id)
    return i < 0 ? segmentOrder.length : i
  }
  const segments = Object.keys(plan.outreach).sort(
    (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0),
  )
  return segments.flatMap((segmentId) =>
    (Object.entries(plan.outreach[segmentId] ?? {}) as [ChannelId, number | undefined][])
      .filter((e): e is [ChannelId, number] => (e[1] ?? 0) > 0)
      .sort((a, b) => (CHANNEL_ORDER[a[0]] ?? 99) - (CHANNEL_ORDER[b[0]] ?? 99))
      .map(([channel, hours]) => ({ segmentId, channel, hours })),
  )
}

/** All outreach hours of a plan, every market and channel. */
export function outreachTotal(plan: Pick<WeekPlan, 'outreach'>): number {
  let total = 0
  for (const out of Object.values(plan.outreach)) {
    for (const h of Object.values(out)) total += h ?? 0
  }
  return total
}
