import type { LeisureConfig } from '@founder-mode/content'
import type { Booking, GameState } from '../types'

type Offer = NonNullable<LeisureConfig['memberships']>[string]

/** Convert a class ticket to the same monthly units as the segment's budget. */
export function leisurePriceBasis(s: GameState, segmentId: string, priceCents: number): number {
  const c = s.scenario.bookings?.leisure
  return c?.wtpBasis === 'monthly'
    ? priceCents * (c.segments[segmentId]?.visitsPerWeek ?? 0) * s.scenario.finance.weeksPerMonth
    : priceCents
}

/** Packs and short intros quote a total; recurring offers already quote a month. */
export function membershipMonthlyCost(
  s: GameState,
  segmentId: string,
  offer: Offer,
  priceCents: number,
): number {
  const segment = s.scenario.bookings!.leisure!.segments[segmentId]!
  return offer.kind === 'pack'
    ? (priceCents / offer.visits!) * segment.visitsPerWeek * s.scenario.finance.weeksPerMonth
    : offer.kind === 'intro'
      ? (priceCents / offer.validWeeks!) * s.scenario.finance.weeksPerMonth
      : priceCents
}

/** Do not sell an evening-only customer an early-only membership. */
export function membershipUsable(s: GameState, segmentId: string, offer: Offer): boolean {
  const c = s.scenario.bookings!.leisure!
  return (
    !c.respectSlotPreferences ||
    offer.slots.some((id) => (c.segments[segmentId]?.slotShare[id] ?? 0) > 0)
  )
}

/** Visits on a paid membership are judged against its monthly fee, not a zero-price ticket. */
export function leisureReviewPrice(s: GameState, booking: Booking): number {
  const c = s.scenario.bookings?.leisure
  if (c?.wtpBasis !== 'monthly') return booking.priceCents
  const member = booking.memberId
    ? s.bookings?.leisure?.members.find((m) => m.id === booking.memberId)
    : undefined
  const offer = member ? c.memberships?.[member.offerId] : undefined
  return member && offer
    ? membershipMonthlyCost(s, member.segmentId, offer, member.priceCents)
    : leisurePriceBasis(s, booking.segmentId, booking.priceCents)
}
