import type { ReportEntry } from '@founder-mode/engine'

/**
 * Plan 7 step 2b: where each kind of weekly report line can be found after the report is closed.
 * Every report is also kept for Help's Past weeks (rebuilt when a save is continued), so every
 * kind is reachable there; `home` names the screen that keeps the same information for good, or
 * `past weeks` when only the old report holds it. Typed over every kind, so a new kind cannot be
 * added without saying where it lives.
 */
export type EntryHome = {
  /** The screen that keeps it, or 'past weeks' when only the old report holds it. */
  home: string
  /** A decision depends on it (plan 7, spec 4.2): those must have a home of their own. */
  decides: boolean
}

const past = (decides = false): EntryHome => ({ home: 'past weeks', decides })
const at = (home: string, decides = true): EntryHome => ({ home, decides })

export const ENTRY_HOMES: Record<ReportEntry['kind'], EntryHome> = {
  // Money
  savings_transfer: at('Money: savings and cash by week', false),
  auto_top_up: at('Money: savings and cash by week', false),
  founder_draw: at('Money: savings and cash by week', false),
  revenue: at('Money: money in by week; Pipeline: customers', false),
  invoices_issued: at('Money: invoices'),
  invoice_written_off: at('Money: invoices (written off); Pipeline: lost list (stopped paying)'),
  ad_spend: at('Market: the landing page test and its budget', false),
  cash_effect: past(),
  team_chased: at('Money: invoices', false),
  living_costs_changed: at('Money: living costs', false),
  costs_rose: at('Money: costs', true),
  tender: at('Plan: the tender card', true),
  // Experiments: kept with their experiment
  landing_result: at('Market: landing page tests'),
  presale_result: at('Market: pre-sales'),
  trial_result: at('Market: trials'),
  voucher_result: at('Market: vouchers'),
  vouchers_redeemed: at('Market: vouchers', false),
  // Sales
  new_leads: at('Pipeline: open leads, with the channel that found them; Plan: channel tiredness'),
  lead_update: at('Pipeline: open leads, customers and the lost list with reasons'),
  walk_in_leads: at('Pipeline: open leads (walked in)'),
  referral_lead: at('Pipeline: open leads (recommended by)'),
  customer_churned: at('Pipeline: lost list (cancelled, weeks paid, reason)'),
  // Product
  feature_shipped: at('Plan: Build and fix (shipped features, bugs)'),
  bugs_fixed: at('Plan: Build and fix (bugs left)', false),
  // Team and freelancers
  candidates_ready: at('Plan: Team (candidates)'),
  hire_agreed: at('Plan: Team (members)'),
  hire_started: at('Plan: Team (members)'),
  member_let_go: at('Plan: Team (members)', false),
  team_output: past(),
  freelance_booked: at('Plan: Team (freelancer)'),
  freelance_hours: at('Plan: Team (freelancer)'),
  freelance_notice: at('Plan: Team (freelancer)'),
  freelance_ended: at('Plan: Team (freelancer)', false),
  freelance_output: past(),
  freelance_bill: at('Money: costs by week', false),
  // Inbox
  message_resolved: past(),
  // Office
  office_accepted: at('Plan: Office'),
  office_moved: at('Plan: Office'),
  office_notice: at('Plan: Office'),
  office_left: at('Plan: Office', false),
  ui_established: at('The whole screen (the established look)', false),
  // Funding
  round_started: at('Plan: Raise (the round)'),
  round_stopped: at('Plan: Raise (the round)'),
  investor_met: at('Plan: Raise (investors)'),
  second_look: at('Plan: Raise (investors)'),
  term_sheet: at('Plan: Raise (terms on the table)'),
  terms_accepted: at('Plan: Raise (the round)'),
  terms_lapsed: at('Plan: Raise (investors)', false),
  terms_withdrawn: at('Plan: Raise (investors)', false),
  round_closed: at('Plan: Raise (cap table); Money', false),
  investor_update: past(),
  funding_milestone: past(),
  // Loan
  loan_applied: at('Plan: Loan'),
  loan_refused: at('Plan: Loan'),
  loan_offer: at('Plan: Loan'),
  loan_accepted: at('Plan: Loan', false),
  loan_paid_out: at('Plan: Loan; Money', false),
  loan_payment: at('Plan: Loan; Money', false),
  loan_missed: at('Plan: Loan'),
  loan_repaid: at('Plan: Loan', false),
  // Bookings: guests, the calendar and reviews
  bookings_new: at('Calendar: bookings ahead'),
  bookings_cancelled: at('Calendar: bookings ahead', false),
  company_cancelled: past(),
  guests_served: at('Calendar: guests by week', false),
  turned_away: at('Plan: Office (weeks that turned guests away)'),
  review: at('Calendar: rating and reviews'),
  shifts_paid: at('Money: costs by week', false),
  contracts_paid: at('Money: costs by week', false),
  contract_signed: at('Plan: Roster (contracts)'),
  contract_ended: at('Plan: Roster (contracts)', false),
  food_waste: past(),
  works_started: at('Plan: Renovation'),
  works_done: at('Plan: Renovation', false),
  // Abroad: conditions, trips, licences and assets
  weather: past(),
  conditions: past(),
  conditions_moved: past(),
  conditions_cancelled: past(),
  trips: past(),
  trips_cancelled: past(),
  graduates: past(),
  graduates_returned: past(),
  licence_applied: at('Plan: licences'),
  permit_refused: at('Plan: licences'),
  asset_option: at('Plan: the asset card'),
  asset_broke: at('Plan: the asset card'),
  asset_repaired: at('Plan: the asset card', false),
  asset_haul_out: at('Plan: the asset card'),
  asset_taken_back: at('Plan: the asset card', false),
  gear_worn: at('Plan: the asset card (gear)'),
  gear_replaced: at('Plan: the asset card (gear)', false),
  cruise_cancelled: past(),
  deposits_refunded: past(),
  friction: past(),
}
