import type { Rng } from '../rng'
import type { LeisureConfig } from '@founder-mode/content'
import type { Booking, GameState, LeisureMember } from '../types'

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
export function leisureReviewPrice(
  s: GameState,
  booking: Booking,
  index?: ReadonlyMap<string, LeisureMember>,
): number {
  const c = s.scenario.bookings?.leisure
  if (c?.wtpBasis !== 'monthly') return booking.priceCents
  const member = booking.memberId
    ? index
      ? index.get(booking.memberId)
      : s.bookings?.leisure?.members.find((m) => m.id === booking.memberId)
    : undefined
  const offer = member ? c.memberships?.[member.offerId] : undefined
  return member && offer
    ? membershipMonthlyCost(s, member.segmentId, offer, member.priceCents) /
        membershipWtp(s, member.segmentId, member.offerId, 1)
    : leisurePriceBasis(s, booking.segmentId, booking.priceCents)
}

/** A niche is a preference,not another must-have for the whole market. */
export function chooseMembershipOffer(
  s: GameState,
  segmentId: string,
  offers: [string, Offer][],
  rng: Rng,
): [string, Offer] {
  const niche = s.scenario.bookings!.leisure!.premiumNiche
  if (!niche?.segments.includes(segmentId)) return rng.pick(offers)
  const premium = rng.chance(s.hidden.bookings?.leisure?.premiumInterest ?? 0)
  const preferred = offers.filter(([id]) => niche.offers.includes(id) === premium)
  return rng.pick(preferred.length ? preferred : offers)
}

export function membershipWtp(
  s: GameState,
  segmentId: string,
  offerId: string,
  base: number,
): number {
  const niche = s.scenario.bookings?.leisure?.premiumNiche
  return niche?.segments.includes(segmentId) && niche.offers.includes(offerId)
    ? base * niche.wtpFactor
    : base
}
