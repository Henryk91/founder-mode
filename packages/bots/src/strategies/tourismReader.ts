import type { PlayerView } from '@founder-mode/engine'

/**
 * The tourism reader (step 5): how a careful player answers each tourism event from what the
 * card and the screen show. A rule returns a choice id, or null to leave the default. Events
 * without a rule fall back to their declared conditions.
 */
export type TourismReaderRule = (view: PlayerView, ctx: { target: string | null }) => string | null

/** A shipped product serves this segment, so guests from it can book. */
export const serves = (view: PlayerView, segmentId: string) =>
  (view.bookings?.products ?? []).some((p) => p.shipped && p.serves.includes(segmentId))

const cashEur = (view: PlayerView) => view.company.cashCents / 100
const energy = (view: PlayerView) => view.founder.energy
/** Guests for a segment are worth it once something serves them. */
const ifServes = (segmentId: string, yes: string) => (view: PlayerView) =>
  serves(view, segmentId) ? yes : null
/** A one-off cost the bot pays when the money comfortably covers it. */
const ifCash =
  (eur: number, yes: string, no: string | null = null) =>
  (view: PlayerView) =>
    cashEur(view) >= eur ? yes : no
const ifTired = (below: number, yes: string) => (view: PlayerView) =>
  energy(view) < below ? yes : null
const anyServed = (view: PlayerView) =>
  (view.bookings?.segments ?? []).some((s) => serves(view, s.id))

/** Units booked this week, as the calendar shows them. */
const bookedNow = (view: PlayerView) =>
  (view.bookings?.thisWeek ?? []).reduce((t, x) => t + x.booked, 0)
const quiet = (view: PlayerView) => bookedNow(view) < 6

export const TOURISM_READER: Record<string, Record<string, TourismReaderRule>> = {
  gratwanderung: {
    // Validation: contacts are worth it where something sells to them; skill courses are not.
    // Contacts send guests next week: only where a tour can take them.
    hotel_owner_chat: ifServes('tourists', 'meet'),
    tourism_office_newsletter: () => 'read',
    guest_survey_cards: (v) => (anyServed(v) ? 'cards' : null),
    competitor_visit: (v) => (v.bookings!.peak ? null : 'go'),
    hr_forum: (v) => (serves(v, 'team_events') && energy(v) > 40 ? 'speak' : null),
    teacher_conference: ifServes('school_groups', 'attend'),
    local_newspaper_feature: (v) => (anyServed(v) ? 'interview' : null),
    // Sales: offers that bring guests where they can be served and the money allows.
    featured_placement: (v) =>
      serves(v, 'tourists') && v.bookings!.platform.listed && cashEur(v) >= 3000 ? 'accept' : null,
    hotel_cut_offer: (v, c) => (c.target === 'tourists' && serves(v, 'tourists') ? 'accept' : null),
    travel_agency_bundle: ifServes('tourists', 'sign'),
    youth_hostel_partners: ifServes('school_groups', 'send'),
    one_star_cloud: () => 'reply',
    autumn_offsites: ifServes('team_events', 'offer'),
    last_minute_group: (v) =>
      serves(v, 'tourists') && quiet(v) && energy(v) > 50 ? 'squeeze' : null,
    second_valley_school: ifServes('school_groups', 'pitch'),
    // A shop window brings tourists walking past, and only tourists.
    town_base_offer: (v, c) =>
      c.target === 'tourists' && serves(v, 'tourists') && cashEur(v) >= 6000 ? 'take' : null,
    platform_fee_change: ifTired(50, 'complain'),
    repeat_guest_thanks: (v) => (anyServed(v) ? 'discount' : null),
    review_reply_bad: () => 'apologise',
    // Product: guests' safety and reviews first, then the money.
    guide_sick: (v) => (cashEur(v) >= 5000 ? 'premium' : energy(v) > 50 ? 'yourself' : null),
    canyon_closed: () => 'hike_instead',
    lost_hiker: () => 'briefing',
    gear_wear: (v) => (v.bookings!.peak && cashEur(v) >= 2000 ? 'replace' : null),
    platform_ranking_drop: (v) =>
      v.bookings!.platform.listed && bookedNow(v) >= 3 ? 'ask_reviews' : null,
    // A borrowed van is fine out of season; in the season it makes transfers late.
    van_inspection: (v) => (v.bookings!.peak ? (cashEur(v) >= 2000 ? 'fix' : 'borrow') : 'borrow'),
    route_closure: () => 'scout',
    summit_book: () => 'do_it',
    health_and_safety_check: () => 'prepare',
    booking_system_outage: (v) => (anyServed(v) ? 'check' : null),
    // Finance: claim money back where the hours are few.
    insurance_renewal_outdoor: () => 'shop',
    invoice_reminder_team: () => 'call',
    gear_grant: (v) => (v.bookings!.peak ? null : 'apply'),
    dead_season_bills: () => 'sublet',
    tax_advance_tourism: (v) => (v.monthlyRevenueCents < 400_000 ? 'object' : null),
    energy_bill: ifCash(3000, 'pay', 'plan'),
    winter_vouchers: (v) => (energy(v) > 40 && anyServed(v) ? 'stall' : null),
    // Founder: rest when it shows.
    summit_sunrise: ifTired(60, 'go'),
    van_nights: () => 'home',
    second_season_doubt: () => 'plan',
    guide_reunion: () => 'go',
    winter_course: ifCash(3000, 'attend'),
    rainy_week_off: ifTired(70, 'rest'),
    friend_wedding: () => 'go',
    season_end_fatigue: ifTired(60, 'rest'),
    family_sunday: ifTired(70, 'go'),
    // Team.
    guide_poached: (v) => (v.bookings!.peak && cashEur(v) >= 8000 ? 'match' : null),
    guide_feedback: () => 'adopt',
    staff_holiday_clash: (v) => (quiet(v) && energy(v) > 40 ? 'both' : null),
    shared_bus: (v, c) =>
      c.target === 'team_events' && serves(v, 'team_events') && cashEur(v) >= 8000 ? 'sign' : null,
    staff_thank_you: ifCash(6000, 'dinner'),
  },
}
