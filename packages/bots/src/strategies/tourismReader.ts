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
/** A feature or product is ready, as the product list shows it. */
const shipped = (view: PlayerView, id: string) =>
  view.product.features.some((f) => f.id === id && f.shipped)
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
/** A restaurant week well short of its open capacity. */
const quietRestaurant = (view: PlayerView) => {
  const cap = (view.bookings?.products ?? [])
    .filter((p) => p.shipped && p.inSeason)
    .reduce((t, p) => t + p.capacity, 0)
  return cap > 0 && bookedNow(view) < cap * 0.5
}

export const TOURISM_READER: Record<string, Record<string, TourismReaderRule>> = {
  // Plan 4: the beach tender. Tuning 1: bidding as before (bidding higher where hotel guests
  // were the market cost the careful bot 1.5 points, 1,000 seeds); the reviews carry the bid.
  tiefgang: {},
  rueckenwind: {
    beach_tender: () => 'same',
  },
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
  hinterhof: {
    // Validation: contacts where a service can take their guests; cheap lessons early.
    street_association: (v) => (v.week <= 12 ? 'attend' : null),
    office_manager_coffee: ifServes('office_lunch', 'present'),
    popup_dinner_offer: (v) => (v.week <= 8 && cashEur(v) >= 5000 ? 'cook' : null),
    hotel_concierge: ifServes('tourists', 'show'),
    food_blog_interview: (v) => (anyServed(v) ? 'interview' : null),
    lunch_box_test: (v) => (v.week <= 8 ? 'test' : null),
    old_cook_notebook: () => 'read',
    tourism_office_listing: ifServes('tourists', 'send'),
    // Sales: guests where there is room; the delivery deal is growth that costs the margin.
    reservation_feature: (v) =>
      serves(v, 'evening_locals') && quietRestaurant(v) && cashEur(v) >= 4000 ? 'feature' : null,
    critic_booking: (v) => (bookedNow(v) < 150 ? 'special' : null),
    catering_tomorrow: (v) => (bookedNow(v) < 180 && energy(v) > 50 ? 'take' : null),
    oktoberfest_rush: (v) => (serves(v, 'tourists') && energy(v) > 40 ? 'specials' : null),
    hotel_partner_offer: ifServes('tourists', 'accept'),
    lunch_card_scheme: (v, c) =>
      c.target === 'office_lunch' && serves(v, 'office_lunch') ? 'join' : null,
    stammtisch_request: (v) =>
      serves(v, 'evening_locals') && quietRestaurant(v) ? 'reserve' : null,
    christmas_parties: (v) => (serves(v, 'evening_locals') && energy(v) > 40 ? 'take' : null),
    maps_photos: (v) =>
      serves(v, 'tourists') && (v.bookings!.rating ?? 0) >= 4.2 ? 'shoot' : null,
    // Product: the kitchen first, and fines avoided.
    dishwasher_breaks: (v) => (cashEur(v) >= 3000 || bookedNow(v) >= 150 ? 'repair' : null),
    hair_in_soup: () => 'refund',
    hygiene_inspector: () => 'prepare',
    supplier_price_rise: (v) => (v.week <= 80 ? 'new_menu' : null),
    teething_menu: () => 'practise',
    extractor_fan: (v) => (v.bookings!.peak && cashEur(v) >= 5000 ? 'replace' : null),
    courtyard_noise: () => 'close_early',
    cold_room_fails: ifCash(4000, 'repair'),
    // Finance: the refit only with the money for it; keep the bank informed.
    own_fitout_offer: (v) =>
      cashEur(v) >= 25000 + (2 * v.company.monthlyFixedCostsCents) / 100 ? 'refit' : null,
    bank_quarterly_numbers: () => 'send',
    bank_missed_call: () => 'talk',
    music_licence_audit: () => 'find',
    tenant_deposit: ifCash(5000, 'lawyer'),
    christmas_vouchers: (v) => (energy(v) > 40 ? 'stall' : null),
    august_closure: (_v, c) => (c.target === 'office_lunch' ? 'close' : null),
    card_fees_review: () => 'switch',
    // Founder: rest when it shows.
    kitchen_burn: ifTired(60, 'doctor'),
    monday_rest: () => 'rest',
    old_head_chef: ifTired(70, 'go'),
    tv_cooking_show: (v) => (serves(v, 'evening_locals') && energy(v) > 50 ? 'film' : null),
    parents_visit: () => 'welcome',
    night_shift_sleep: () => 'sleep',
    cooking_class_offer: (v) => (serves(v, 'evening_locals') && energy(v) > 50 ? 'teach' : null),
    // Team.
    cook_saturdays: (v) => (bookedNow(v) < 200 && energy(v) > 60 ? 'agree' : null),
    server_quits: (v) => (cashEur(v) >= 3000 ? 'agency' : energy(v) > 50 ? 'yourself' : null),
    tips_dispute: () => 'pool',
    cook_poached: (v) => (v.bookings!.peak || bookedNow(v) >= 200 ? 'match' : null),
  },
  seeblick: {
    // Validation: contacts where rooms can take their guests; lessons in the quiet winter.
    tourism_statistics: (v) => (v.week <= 12 ? 'read' : null),
    open_house_offer: (v) => (cashEur(v) >= 3000 ? 'host' : null),
    // Plan 2 audit: the texts name what must be ready (invoices, a room to marry in).
    plant_office_manager: (v) =>
      serves(v, 'project_guests') && shipped(v, 'invoice_billing') ? 'meet' : null,
    wedding_planner_visit: (v) => (serves(v, 'groups') && shipped(v, 'event_room') ? 'show' : null),
    previous_guestbook: (v) => (v.week <= 10 ? 'read' : null),
    travel_blogger: (v) => (serves(v, 'leisure') && bookedNow(v) < 60 ? 'host' : null),
    test_rates_advice: () => 'listen',
    // Sales: guests where there is room; a permanent commission for a badge is not worth it.
    firm_block_booking: (v) => (serves(v, 'project_guests') && !v.bookings!.peak ? 'accept' : null),
    village_festival: (v) => (serves(v, 'leisure') && energy(v) > 40 ? 'push' : null),
    boat_package: ifServes('leisure', 'join'),
    twelve_room_cancel: () => 'complain',
    november_empty: (v) =>
      serves(v, 'project_guests') ? 'call_firms' : bookedNow(v) < 10 ? 'close_floor' : null,
    wedding_fair: (v) =>
      serves(v, 'groups') && shipped(v, 'event_room') && cashEur(v) >= 5000 ? 'stand' : null,
    christmas_vouchers_hotel: (v) => (serves(v, 'leisure') ? 'sell' : null),
    regatta_weekend: (v) => (serves(v, 'groups') && bookedNow(v) < 70 ? 'host' : null),
    // Product: the house first, fines avoided.
    heating_fails: (v) => (cashEur(v) >= 3000 || bookedNow(v) >= 30 ? 'engineer' : null),
    bathroom_review: () => 'reply',
    dripping_shower: () => 'fix',
    fire_inspection: () => 'prepare',
    lake_flood: ifCash(3000, 'pump'),
    wifi_complaints: (v) => (cashEur(v) >= 6000 ? 'upgrade' : null),
    breakfast_supplier: (v) => (serves(v, 'leisure') && cashEur(v) >= 6000 ? 'farm' : null),
    noisy_neighbour_build: (v) => (bookedNow(v) < 60 ? 'move' : null),
    // Finance: the refresh only with the money for it; negotiate the lease.
    refresh_offer: (v) =>
      cashEur(v) >= 60000 + (2 * v.company.monthlyFixedCostsCents) / 100 ? 'refresh' : null,
    lease_increase: () => 'negotiate',
    wedding_cancels: () => 'refund',
    bank_quarterly_hotel: () => 'send',
    bank_missed_hotel: () => 'talk',
    tourist_tax_audit: () => 'prepare',
    winter_heating_bill: ifCash(4000, 'pay', 'spread'),
    insulation_grant: (v) => (v.bookings!.peak ? null : 'apply'),
    // Founder: rest when it shows.
    night_bell: ifTired(50, 'nap'),
    lake_swim: () => 'swim',
    former_colleague: () => 'dinner',
    family_christmas: (v) => (bookedNow(v) < 10 ? 'go' : null),
    back_strain: () => 'physio',
    village_council: (v) => (serves(v, 'leisure') && energy(v) > 50 ? 'join' : null),
    // Team.
    housekeeper_quits: (v) => (cashEur(v) >= 3000 ? 'agency' : null),
    breakfast_help_late: () => 'talk',
  },
}
