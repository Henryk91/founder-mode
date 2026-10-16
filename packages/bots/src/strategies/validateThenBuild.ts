import { answerOffers, officeOffers, type OfficeRule } from '../office'
import {
  loadScenario,
  type Scenario,
  type ScenarioEvent,
  type ScenarioId,
} from '@founder-mode/content'
import {
  viewConditionsHold,
  type ChannelId,
  type MessageView,
  type PlayerView,
  type WeekPlan,
} from '@founder-mode/engine'
import { FixedPrice, PriceRecipe, PriceSearch, type Pricer, type SearchRule } from '../pricing'
import {
  bookableLeads,
  ChannelLog,
  PlanBuilder,
  segmentNotes,
  type Player,
  type Strategy,
} from '../strategy'

const FIRST_WEEK_INTERVIEWS = 8
const SECOND_WEEK_INTERVIEWS = 5
const MAX_BUILD_HOURS = 45
const BUG_LIMIT = 3
const BUG_FIX_HOURS = 8
/** Leads per hour need this many hours on a channel before the bot trusts them. */
const CHANNEL_TRIAL_HOURS = 10
/** Give up on a market after this many weeks of selling without a customer there. */
const PIVOT_AFTER_WEEKS = 12
/** Overdue invoices chased per week. */
const CHASE_PER_WEEK = 3
/**
 * Long mode (C3): one more chase a week for every this many customers, so chasing keeps up with a
 * growing company. The 60 week game keeps `CHASE_PER_WEEK`.
 */
const CUSTOMERS_PER_CHASE = 3
/** Pre-sale batches without a deposit that refute the chosen market. */
const MAX_PRESALE_BATCHES = 2
/**
 * How much a market's landing page sign up rate counts next to interviews, per standard error
 * above or below the rate of every tested market together.
 */
const LANDING_WEIGHT = 0.1
/**
 * A tested market is dropped when another tested market's sign up rate is this many standard
 * errors ahead of it (a two proportion test). Markets are compared with each other, so the rule
 * needs no sign up rate of its own per scenario.
 */
export const LANDING_DROP_Z = 1.5
/** How much the pre-sale commit rate, above or below the bar, counts next to interviews. */
const PRESALE_WEIGHT = 3
const PRESALE_BAR = 0.08
/** Markets that get a landing page test in week 2, best interviews first. */
const LANDING_MARKETS = 2

/** Open leads in the chosen market followed up per week, silent ones first. */
const FOLLOW_UPS_PER_WEEK = 6
/**
 * Payback hire: weeks from extra outreach to money in the bank (demo, trial, invoice, payment),
 * the skill assumed before candidates are seen, and the months of salary the founder must hold.
 */
const PAYBACK_LAG_WEEKS = 8
const ASSUMED_SKILL = 0.85
const PAYBACK_CASH_MONTHS = 2

/**
 * Long mode team rules (Part C), all read from the money the player sees. "A month" is the change
 * in cash plus savings averaged over the last `NET_MONTHS` months, so it counts money received, not
 * invoiced, and one month of late invoices paid at once does not count as growth.
 * A hire is looked for once a month makes money, the money in hand would pay what the hire
 * adds to the monthly loss for `HIRE_RUNWAY_MONTHS`, and at least `HIRE_HORIZON_WEEKS` would be
 * left once they start. The newest hire is let go once the runway shown falls below
 * `LET_GO_MONTHS`. A new search waits until the newest hire has worked `SETTLE_WEEKS`. A developer
 * is hired while the features the market asks for still need `BACKLOG_HOURS`, else a salesperson.
 */
const NET_MONTHS = 3
const HIRE_RUNWAY_MONTHS = 6
const HIRE_HORIZON_WEEKS = 26
const LET_GO_MONTHS = 3
const SETTLE_WEEKS = 8
const BACKLOG_HOURS = 40
/**
 * A salesperson is let go after `RESULTS_WEEKS` of work unless the customers they found pay at
 * least `RESULTS_SHARE` of their salary (C3a round 3, plan 3.1).
 */
const RESULTS_WEEKS = 16
const RESULTS_SHARE = 0.5
/**
 * Expansion (plan 3.1 point 4b): from week `EXPAND_FROM`, once the founder's leads per outreach hour
 * in the first market over the last `RATE_WEEKS` weeks of selling fall below `DRY_SHARE` of its best
 * `RATE_WEEKS` so far (the founder's selling skill grows, so the first weeks are not the best
 * yardstick), the bot opens the best ranked other market. It interviews there until
 * `SECOND_INTERVIEWS`, builds what those interviews ask for (the founder up to
 * `SECOND_BUILD_HOURS` a week), then sells there with half its outreach. Without a customer there
 * `SECOND_GIVE_UP_WEEKS` after it started selling there, it gives the second market up.
 */
const EXPAND_FROM = 53
const RATE_WEEKS = 8
const DRY_SHARE = 0.6
const SECOND_INTERVIEWS = 12
const SECOND_BUILD_HOURS = 20
const SECOND_GIVE_UP_WEEKS = 16
/** Hiring on savings: the first search once building starts, while money holds this many salaries. */
const SAVINGS_SALARIES = 3
/** ...and that hire is kept until the runway shown falls below this many months. */
const SAVINGS_LET_GO_MONTHS = 1
/**
 * The freelancer before the first hire: hours a week, and months of the added loss money must
 * hold (shorter than a hire's, since a week's notice ends it).
 */
const FIRST_FREELANCE_HOURS = 20
const FIRST_FREELANCE_MONTHS = 3

/** The books arrive as this message; sorting them yourself is the careful answer. */
const BOOKS_EVENT = 'receipts_pile'
const BOOKS_CHOICE = 'sort'

/** Inbox policy limits: hours per message, hours per week, and how much cash may be spent. */
const MESSAGE_HOURS_MAX = 6
const MESSAGE_HOURS_PER_WEEK = 8
const MESSAGE_CASH_SHARE = 0.1
const MESSAGE_CASH_FLOOR_CENTS = 450_000

/**
 * How the inbox is answered: `reader` reads each message and picks the answer that suits it
 * (`readerChoices`), `effort` takes the most effortful affordable choice without reading
 * (`answerInbox`), `cheapest` always takes the choice with the fewest hours and then the least
 * money (`cheapestInbox`), `none` leaves every message to its default.
 */
export type InboxPolicy = 'reader' | 'effort' | 'cheapest' | 'none'

/** Open leads as the Pipeline shows them, the same count the scenario's `leads.open` reads. */
const openLeads = (v: PlayerView) =>
  v.leads.filter((l) => l.stage !== 'lost' && l.stage !== 'paying').length
/** A pipeline thin enough that one more lead is worth an afternoon, as the messages hint. */
const THIN_PIPELINE = 8
const ROOMY_PIPELINE = 12
const thin = (v: PlayerView) => openLeads(v) <= THIN_PIPELINE
const tired = (v: PlayerView) => v.founder.energy < v.founder.tiredBelow
/** The lead a message is from, by its name, which no two leads share. */
const senderLead = (v: PlayerView, m: MessageView) => v.leads.find((l) => l.name === m.fromName)
const senderSilent = (v: PlayerView, m: MessageView) => senderLead(v, m)?.silent === true
const senderOverdue = (v: PlayerView, m: MessageView) =>
  v.invoices.some((i) => i.customerName === m.fromName && i.status === 'overdue')
/** Cash below which a careful founder spends hours instead of money. */
const TIGHT_CASH_CENTS = 600_000
const tight = (v: PlayerView) => v.company.cashCents < TIGHT_CASH_CENTS

/**
 * `READ_CONDITIONS`: the answer is read off the event's declared conditions (`fromConditions`),
 * as a player reads the situation the text names, instead of a rule written here (step 3).
 */
const READ_CONDITIONS = Symbol('read the conditions')
type ReaderRule =
  string | typeof READ_CONDITIONS | ((view: PlayerView, message: MessageView) => string)

/** Effects that help, and effects that cost, by type and sign. */
const helps = (fx: ScenarioEvent['choices'][number]['effects'][number]): boolean | null => {
  switch (fx.type) {
    case 'newLeads':
    case 'invoicePayChance':
    case 'touchLead':
    case 'guests':
      return true
    case 'review':
      return fx.rating >= 3.5
    case 'lostHours':
    case 'churnChance':
    case 'fixedCost':
      return false
    case 'skill':
    case 'energy':
    case 'investorConfidence':
      return fx.delta > 0
    case 'bugs':
      return fx.delta < 0
    case 'cash':
      return fx.amountCents > 0
    default:
      return null
  }
}

/**
 * The answer an event's declared conditions point to: the first choice other than the default
 * with a conditional benefit that applies now, no conditional cost that applies, and no lasting
 * cost (a customer at risk, a monthly cost) that always applies. Otherwise the default. Conditions are read from the view only.
 */
export function fromConditions(
  event: ScenarioEvent,
  view: PlayerView,
  message: MessageView,
): string {
  for (const c of event.choices) {
    if (c.id === event.defaultChoice) continue
    const good = c.effects.filter((fx) => helps(fx) === true && fx.when.length > 0)
    const bad = c.effects.filter((fx) => helps(fx) === false)
    const applies = (fx: (typeof c.effects)[number]) => viewConditionsHold(view, fx.when, message)
    // A cost that always comes blocks the choice only if it lasts: a customer at risk or a monthly
    // cost. Hours, energy and a price shown on the card are what answering costs.
    const lasting = (fx: (typeof c.effects)[number]) =>
      fx.type === 'churnChance' || fx.type === 'fixedCost'
    if (
      good.some(applies) &&
      !bad.some((fx) => (fx.when.length === 0 ? lasting(fx) : applies(fx)))
    ) {
      return c.id
    }
  }
  return event.defaultChoice
}

/**
 * What a careful reader answers, per kind of message. A function reads the situation the message
 * hints at: the pipeline, the sender, energy, cash, bugs. Messages not listed take their default.
 * Shared events have one answer in every scenario; each scenario adds its own events.
 */
const SHARED_READER: Record<string, ReaderRule> = {
  // validation
  startup_meetup: 'skip',
  visitor_list: 'pass',
  podcast_invite: READ_CONDITIONS,
  // sales
  discount_demand: 'hold',
  slow_lead: 'wait',
  sales_coach: 'decline',
  chamber_breakfast: READ_CONDITIONS,
  seven_questions: (v, m) => (senderSilent(v, m) ? 'answer' : 'later'),
  suspicious_price: (v, m) => (senderSilent(v, m) ? 'explain' : 'ignore'),
  trial_extension: (v, m) => (senderSilent(v, m) ? 'extend' : 'refuse'),
  referral_reward: (v) => (thin(v) ? 'voucher' : 'thanks'),
  pilot_request: (v, m) => (senderSilent(v, m) ? 'counter' : 'decline'),
  ballpark_call: (v, m) => (senderSilent(v, m) ? 'call' : 'demo'),
  business_park_flyers: READ_CONDITIONS,
  frequent_emails: 'back_off',
  letterhead_quote: 'pdf',
  // product
  security_notice: (v) => (v.customers.length >= 1 ? 'patch' : 'ignore'),
  hosting_pricing: 'migrate',
  missing_backups: 'backup',
  framework_upgrade: 'stay',
  bounty_hunter: (v) => (v.customers.length === 0 ? 'ignore' : tight(v) ? 'fix' : 'pay'),
  bug_weekend: (v) => (v.customers.length >= 1 ? 'sprint' : 'carry_on'),
  unused_feature: (v) => (v.product.bugs >= 3 ? 'remove' : 'keep'),
  uptime_monitor: 'skip',
  // finance
  late_payer_first: 'reminder',
  filing_deadline: 'file',
  regional_grant: 'apply',
  laptop_fan: 'live_with_it',
  bank_fee: 'switch',
  tax_letter: 'answer',
  invoice_app: 'pass',
  overdue_again: (v, m) => (senderOverdue(v, m) ? 'reminder' : 'wait'),
  old_bike: 'sell',
  growth_package: 'decline',
  forgotten_subscriptions: (v) => (tight(v) ? 'cancel' : 'ignore'),
  parking_fine: 'pay',
  vat_return: (v) => (tight(v) ? 'self' : 'accountant'),
  address_change: (v, m) => (senderOverdue(v, m) ? 'reissue' : 'later'),
  equipment_grant: 'apply',
  double_charge: 'refund',
  // founder
  bad_sleep: 'nap',
  flu: (v) => (v.founder.energy - 10 < v.founder.tiredBelow ? 'rest' : 'work_through'),
  old_boss: 'freelance',
  ten_k_run: (v) => (tired(v) ? 'train' : 'back_out'),
  birthday_party: (v) => (tired(v) ? 'go' : 'card'),
  dentist: 'go',
  four_am_idea: (v) => (tired(v) ? 'sleep_in' : 'get_up'),
  lake_weekend: (v) => (tired(v) ? 'go' : 'stay'),
  sister_dinner: (v) => (tired(v) ? 'go' : 'reschedule'),
  coffee_machine: (v) => (tight(v) ? 'cafe' : 'buy'),
  mentor_offer: 'accept',
  burnout_article: 'day_off',
  cracked_phone: 'live_with_it',
  parents_visit: (v) => (tired(v) ? 'day' : 'coffee'),
  personal_tax: 'file',
  back_pain: (v) => (v.founder.energy <= 60 ? 'physio' : 'stretch'),
  // team
  team_plan: 'session',
  raise_request: 'decline',
  second_monitor: 'buy',
  hire_holiday: 'approve',
  hire_idea: 'listen',
  hire_laptop: (v) => (tight(v) ? 'keep' : 'buy'),
  hire_feedback: 'session',
  recruiter_call: 'talk',
  design_tool: 'decline',
  office_question: 'not_yet',
  // The second year (long mode only, shared/events/year2.yaml).
  rent_rise_letter: (v) => (tired(v) ? 'haggle' : 'accept'),
  company_birthday: (v) => (tired(v) ? 'celebrate' : 'carry_on'),
  flatmate_offer: (v) => (tight(v) ? 'take' : 'decline'),
  job_offer: 'decline',
  second_winter: (v) => (tired(v) ? 'wait_in' : 'jumpers'),
  holiday_question: (v) => (tired(v) ? 'long_weekend' : 'not_now'),
  gym_reminder: (v) => (tired(v) ? 'go' : 'ignore'),
  blood_pressure: 'follow',
  student_talk: 'decline',
  unkind_regards: READ_CONDITIONS,
  debt_collector: READ_CONDITIONS,
  payment_plan: 'agree',
  annual_accounts: (v) => (tight(v) ? 'sort' : 'pay'),
  insurance_renewal: 'post',
  tool_prices: 'audit',
  vat_check: (v) => (tight(v) ? 'prepare' : 'accountant'),
  credit_check: 'decline',
  renewal_review: 'call',
  loyalty_discount: (v) => (tight(v) ? 'card' : 'gift'),
  supplier_questionnaire: 'decline',
  more_locations: READ_CONDITIONS,
  case_study: READ_CONDITIONS,
  conference_stand: 'skip',
  exit_survey: 'call',
  side_project_request: 'refer',
  new_contact: 'meeting',
  switching_offer: (v) => (tight(v) ? 'visit' : 'match'),
  reference_request: 'arrange',
  procurement_portal: READ_CONDITIONS,
  old_code: (v) => (v.product.bugs >= 3 ? 'refactor' : 'live_with_it'),
  data_request: 'send',
  slow_with_growth: (v) => (tired(v) ? 'apologise' : 'optimise'),
  password_monday: 'fix_flow',
  request_document: 'ignore',
  night_outage: (v) => (v.product.bugs >= 3 ? 'investigate' : 'sleep'),
  browser_update: (v) => (v.customers.length >= 3 ? 'test' : 'wait'),
  other_market_asks: READ_CONDITIONS,
  market_report: 'pass',
  midnight_emails: 'talk',
  counter_offer: (v) => (tight(v) ? 'think' : 'match'),
  training_course: (v) => (tight(v) ? 'decline' : 'send'),
  write_it_down: 'write',
  rhyming_application: 'reply',
  second_christmas: (v) => (tired(v) ? 'go_home' : 'call'),
  price_review: 'write',
  loyal_referral: 'call',
  tax_prepayment: 'object',
  accountant_retires: 'shop_around',
  redesign_wish: 'ignore',
  knee: (v) => (tired(v) ? 'physio' : 'ignore'),
  competitor_newsletter: 'ignore',
  year_end_review: 'skip',
  bigger_office_offer: 'decline',
  domain_renewal: 'pay',
  local_paper: READ_CONDITIONS,
  two_year_contract: 'negotiate',
  spring_clean: (v) => (tired(v) ? 'clean' : 'ignore'),
  // Investors (long mode with funding, shared/events/funding.yaml).
  investor_hire_push: 'explain',
  investor_price_push: 'call',
  investor_checkin: (v) => (tired(v) ? 'postpone' : 'attend'),
  investor_worried_call: 'plan',
  milestone_letter: 'explain',
  board_deck_request: 'deck',
  portfolio_tool: 'decline',
  investor_conference: 'decline',
  investor_intro: (v) => (openLeads(v) <= ROOMY_PIPELINE ? 'calls' : 'later'),
  investor_second_intro: (v) => (openLeads(v) <= ROOMY_PIPELINE ? 'call' : 'later'),
  investor_praise: 'smile',
}

const SCENARIO_READER: Record<ScenarioId, Record<string, ReaderRule>> = {
  zollstock: {},
  // Tourism events are read from their declared conditions (tourism bots).
  gratwanderung: {},
  hinterhof: {},
  seeblick: {},
  rueckenwind: {},
  tiefgang: {},
  kantino: {
    // validation
    survey_offer: 'pass',
    friend_of_friend: 'decline',
    student_thesis: 'decline',
    office_manager_forum: READ_CONDITIONS,
    lunch_diary: 'decline',
    university_pilot: READ_CONDITIONS,
    rival_customer: (v) => (thin(v) ? 'coffee' : 'skip'),
    focus_group: 'pass',
    online_poll: 'ignore',
    tenant_survey: 'pass',
    catering_inquiry: 'decline',
    expert_interview: READ_CONDITIONS,
    // sales
    referral: 'follow_up',
    food_fair: 'pass',
    integration_question: 'honest',
    competitor_launch: 'ignore',
    supplier_form: (v, m) => (senderSilent(v, m) ? 'short' : 'leave'),
    colleague_intro: READ_CONDITIONS,
    coworking_open_day: READ_CONDITIONS,
    demo_no_show: (v, m) => (senderSilent(v, m) ? 'rebook' : 'drop'),
    reseller_offer: READ_CONDITIONS,
    big_tender: 'decline',
    newsletter_paragraph: READ_CONDITIONS,
    returning_prospect: (v) => (openLeads(v) <= ROOMY_PIPELINE ? 'call' : 'later'),
    wedding_fair: 'decline',
    // product
    crash_report: 'patch',
    restaurant_portal: 'decline',
    font_complaint: 'thank',
    reception_browser: 'explain',
    dark_mode: 'later',
    slow_order_page: (v) => (v.product.bugs >= 3 ? 'optimise' : 'reply'),
    screen_reader: 'fix',
    french_translation: 'decline',
    partner_directory: 'decline',
    company_phones: 'fix',
    whiteboard_menus: 'type_once',
    export_request: 'by_hand',
    // finance
    insurance_broker: 'decline',
    // founder
    family_lunch: (v) => (tired(v) ? 'go' : 'stay'),
    founder_dinner: READ_CONDITIONS,
    // team
    team_lunch: 'order',
  },
}

/**
 * Zollstock's own events take the mechanics of a Kantino event with a similar tension (content
 * generator, docs/decisions.md), so the reader answers each as it answers that twin.
 */
const ZOLLSTOCK_TWINS: Record<string, string> = {
  trade_survey: 'survey_offer',
  friend_plumber: 'friend_of_friend',
  master_project: 'student_thesis',
  trades_forum: 'office_manager_forum',
  job_diary: 'lunch_diary',
  vocational_school: 'university_pilot',
  rival_user: 'rival_customer',
  workshop_panel: 'focus_group',
  online_poll: 'online_poll',
  landlord_survey: 'tenant_survey',
  diy_inquiry: 'catering_inquiry',
  expert_interview: 'expert_interview',
  site_visit: 'referral',
  trade_fair: 'food_fair',
  payroll_question: 'integration_question',
  competitor_flyers: 'competitor_launch',
  subcontractor_form: 'supplier_form',
  flatmate_intro: 'colleague_intro',
  guild_evening: 'coworking_open_day',
  voice_message: 'demo_no_show',
  wholesaler_counter: 'reseller_offer',
  public_tender: 'big_tender',
  guild_newsletter: 'newsletter_paragraph',
  returning_prospect: 'returning_prospect',
  christmas_market: 'wedding_fair',
  crash_report: 'crash_report',
  marketplace_pitch: 'restaurant_portal',
  tiny_buttons: 'font_complaint',
  no_typing: 'reception_browser',
  sunlight_mode: 'dark_mode',
  slow_job_plan: 'slow_order_page',
  apprentice_setup: 'screen_reader',
  bavarian_translation: 'french_translation',
  accounting_partner: 'partner_directory',
  cellar_signal: 'company_phones',
  paper_job_sheets: 'whiteboard_menus',
  job_export: 'export_request',
  trade_insurance: 'insurance_broker',
  family_lunch: 'family_lunch',
  founder_dinner: 'founder_dinner',
  hire_site_day: 'team_lunch',
}
SCENARIO_READER.zollstock = {
  ...Object.fromEntries(
    Object.entries(ZOLLSTOCK_TWINS).map(([id, twin]) => [id, SCENARIO_READER.kantino[twin]!]),
  ),
  // Tuned to land only with room in the pipeline, as their texts say (decisions, part C).
  site_visit: (v) => (thin(v) ? 'follow_up' : 'ignore'),
  // Offline mode is a 10 h build for one loud customer (round 3); explaining keeps most of them.
  cellar_signal: 'workaround',
  // Phase 8: the effortful answer pays only in the situation the text names.
  crash_report: (v) => (v.product.bugs >= 3 ? 'patch' : 'apologise'),
  apprentice_setup: (v) => (v.customers.length >= 3 ? 'fix' : 'later'),
}

/** The reader's table for one scenario: the shared answers plus the scenario's own. */
const readerChoices = (scenarioId: string): Record<string, ReaderRule> => ({
  ...SHARED_READER,
  ...(SCENARIO_READER as Record<string, Record<string, ReaderRule> | undefined>)[scenarioId],
})

/** Events the reader has an answer for in a scenario. Every scenario event should be here. */
export const readerEventIds = (scenarioId: string): string[] =>
  Object.keys(readerChoices(scenarioId))

/** The reader's answers: the listed choice when its hours fit and its money leaves a cushion. */
export function readInbox(
  view: PlayerView,
  scenario: Scenario,
): { messageId: string; choiceId: string }[] {
  const answers: { messageId: string; choiceId: string }[] = []
  let used = view.committedHours
  const table = readerChoices(view.scenarioId)
  for (const m of view.inbox) {
    if (m.answeredChoiceId !== null) continue
    const rule = table[m.eventId]
    if (!rule) continue
    const event = scenario.events.find((e) => e.id === m.eventId)
    const id =
      rule === READ_CONDITIONS
        ? event
          ? fromConditions(event, view, m)
          : null
        : typeof rule === 'function'
          ? rule(view, m)
          : rule
    const c = m.choices.find((x) => x.id === id)
    if (!c) continue
    const hosting = view.bookings?.hostingHours ?? 0
    if (used + c.hours + view.forcedHours + hosting > view.founder.maxHoursPerWeek) continue
    if (c.costCents > 0 && view.company.cashCents - c.costCents < MESSAGE_CASH_FLOOR_CENTS) continue
    answers.push({ messageId: m.id, choiceId: c.id })
    used += c.hours
  }
  return answers
}

/**
 * When to make the one hire: never, once monthly revenue covers the salary, or as soon as the
 * observed funnel says the hire could pay for themselves before the last week.
 */
export type HireRule = 'none' | 'covered' | 'payback'

/**
 * How the careful bot builds a team in long mode. `start`: `covered` hires once revenue covers
 * today's costs (the reference), `savings` makes the first hire once building starts, paid from
 * savings. `partTime` hires only part time. `freelanceFirst` rents a freelancer before the first
 * hire.
 */
export type TeamRule = { start: 'covered' | 'savings'; partTime: boolean; freelanceFirst: boolean }

/** Target 20's situations: who does a burst of building or a year of selling. */
export type Situation = { kind: 'burst' | 'steady'; by: 'freelancer' | 'hire' }

/**
 * When to raise (Part D). `traction`: an angel round once monthly revenue covers the company's
 * costs and grew in each of the last two months, with at least `RAISE_RUNWAY_WEEKS` of runway; a
 * seed round once monthly revenue reaches the seed bar and grows. `early`: an angel round in week 3
 * on interviews and sign ups, a seed round as soon as the angel money is in. `always`: an angel
 * round at the first paying customer, needed or not, then a seed round as `traction`. `late`:
 * bootstraps, and starts an angel round only once the runway shown falls below
 * `LATE_RUNWAY_WEEKS`. `update`: the monthly investor update.
 */
export type RaiseRule = {
  when: 'traction' | 'early' | 'always' | 'late'
  update: 'proper' | 'short' | 'never'
}

/** Pitch hours a week while a round is open: two first meetings. */
const PITCH_HOURS = 10
const RAISE_RUNWAY_WEEKS = 20
const LATE_RUNWAY_WEEKS = 12
/** A round that ran out of investors is tried again after this many weeks. */
const RAISE_RETRY_WEEKS = 12
/** With investors' money, a hire is made while the money lasts this many months after it. */
const FUNDED_HIRE_MONTHS = 9

/** The reference careful bot's team rule in long mode. */
export const CAREFUL_TEAM: TeamRule = { start: 'covered', partTime: false, freelanceFirst: false }

/** The behaviours added in Phase 4 and after, each of which can be switched off to measure it. */
export type Behaviours = {
  inbox: InboxPolicy
  chase: boolean
  landing: boolean
  books: boolean
  followUps: boolean
  hire: HireRule
  /**
   * `careful`: every batch the chosen market allows, one a week. `one`: only the first batch, in
   * week 2 (for the report's pre-sale check). `max`: every batch allowed, everywhere.
   */
  presales: 'careful' | 'one' | 'max'
  /** Rent a freelancer (target 19): a developer for the build, or a salesperson for a while. */
  freelance?: FreelanceRule
  /**
   * The energy check of target 19: below `below` energy the founder plans `hours` fewer and, with
   * `rent`, books a freelancer for those hours (developer while wanted features are unbuilt, else
   * salesperson), until energy is back at the scenario's tired mark.
   */
  tiredFreelance?: { below: number; hours: number; rent: boolean }
  /**
   * Long mode team building. Missing: `CAREFUL_TEAM` in long mode for a bot without another hire
   * or freelancer rule, else none. Null: never hires (bootstrapped solo).
   */
  team?: TeamRule | null
  /** Target 20: one extra person for a burst or for steady work (`SITUATION_VARIANTS`). */
  situation?: Situation
  /** Long mode with funding: when to raise money, and how to answer the investors (Part D). */
  raise?: RaiseRule
  /** For the event table: always answer this event with this choice. */
  forced?: { eventId: string; choiceId: string }
  /** For measuring an event's share of an inbox policy: leave this event to its default. */
  skipEvent?: string
  /** For measuring the second year's events: leave every long mode only event to its default. */
  skipYear2?: boolean
  /**
   * Long mode: open a second market once the first runs out of new leads in year 2 (plan 3.1
   * point 4b). With a team rule the hires serve it: a developer builds its features, then a
   * salesperson sells there.
   */
  expand?: boolean
  /**
   * Long mode: who chases late invoices once someone is on the team. `team` (the default): the
   * founder stops chasing and the first working member does it as part of their task; `founder`:
   * the founder keeps chasing.
   */
  chaseBy?: 'team' | 'founder'
  /** Plan 3: office stage offers (`office.ts`). Missing: careful. */
  office?: OfficeRule
}

/**
 * When to rent a freelancer, once per run. `developer`: booked in week 2 when building starts,
 * until the wanted features have all shipped (at most `MAX_FREELANCE_WEEKS`).
 * `salesperson`: from the first paying customer, for `weeks` weeks of outreach in the market.
 */
export type FreelanceRule =
  { role: 'developer'; hours: number } | { role: 'salesperson'; hours: number; weeks: number }

/** A rented developer is let go after this many weeks even if features are still wanted. */
const MAX_FREELANCE_WEEKS = 12

export const ALL_BEHAVIOURS: Behaviours = {
  inbox: 'reader',
  chase: true,
  landing: true,
  books: true,
  followUps: true,
  hire: 'none',
  presales: 'careful',
}

export type PaybackInput = {
  maxWeeks: number
  /** Week the hire would start working. */
  startWeek: number
  monthlySalaryCents: number
  weeksPerMonth: number
  priceCentsPerMonth: number
  /** Outreach hours (or founder hours freed for outreach) the hire adds per week. */
  weeklyHours: number
  /** Most hours the work lasts in total; a developer runs out of wanted features. */
  usefulHours: number
  leadsPerHour: number
  /** Share of closed leads in the market that became customers. */
  winRate: number
  lagWeeks: number
}

/**
 * Money the hire's extra hours bring in before the last week, minus their salary from the start
 * week on. Every extra hour finds `leadsPerHour x winRate` customers, who pay the price from
 * `lagWeeks` later until the end. No churn: this is the plausible case, not the cautious one.
 */
export function hirePayback(p: PaybackInput): number {
  let value = 0
  let left = p.usefulHours
  const perWeek = p.priceCentsPerMonth / p.weeksPerMonth
  for (let w = p.startWeek; w <= p.maxWeeks && left > 0; w++) {
    const h = Math.min(p.weeklyHours, left)
    left -= h
    const paidWeeks = Math.max(0, p.maxWeeks - (w + p.lagWeeks) + 1)
    value += h * p.leadsPerHour * p.winRate * perWeek * paidWeeks
  }
  const salaryWeeks = Math.max(0, p.maxWeeks - p.startWeek + 1)
  return value - (p.monthlySalaryCents / p.weeksPerMonth) * salaryWeeks
}

/** Landing page visitors and sign ups, over all tests in a market. */
function landingCounts(view: PlayerView, segmentId: string): { visitors: number; signups: number } {
  const tests = view.segments.find((s) => s.id === segmentId)?.landingTests ?? []
  return {
    visitors: tests.reduce((t, x) => t + x.visitors, 0),
    signups: tests.reduce((t, x) => t + x.signups, 0),
  }
}

/**
 * How far a market's sign up rate lies above (positive) or below the rate of every tested market
 * together, in standard errors; null when the market has no landing test or none differs.
 */
export function landingStanding(view: PlayerView, segmentId: string): number | null {
  const own = landingCounts(view, segmentId)
  if (own.visitors === 0) return null
  const all = view.segments.map((s) => landingCounts(view, s.id))
  const visitors = all.reduce((t, x) => t + x.visitors, 0)
  const pooled = all.reduce((t, x) => t + x.signups, 0) / visitors
  const se = Math.sqrt((pooled * (1 - pooled)) / own.visitors)
  return se > 0 ? (own.signups / own.visitors - pooled) / se : null
}

/**
 * True when another tested market drew clearly more sign ups than this one: a two proportion test
 * against the best other tested market reaches `LANDING_DROP_Z`.
 */
export function landingBehind(view: PlayerView, segmentId: string): boolean {
  const own = landingCounts(view, segmentId)
  if (own.visitors === 0) return false
  return view.segments.some((s) => {
    if (s.id === segmentId) return false
    const other = landingCounts(view, s.id)
    if (other.visitors === 0) return false
    const pooled = (own.signups + other.signups) / (own.visitors + other.visitors)
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / own.visitors + 1 / other.visitors))
    if (se === 0) return false
    const z = (other.signups / other.visitors - own.signups / own.visitors) / se
    return z >= LANDING_DROP_Z
  })
}

/** Share of pre-sale prospects who paid a deposit, over all batches in a market, or null. */
function presaleRate(view: PlayerView, segmentId: string): number | null {
  const sales = view.segments.find((s) => s.id === segmentId)?.presales ?? []
  const prospects = sales.reduce((t, x) => t + x.prospects, 0)
  return prospects ? sales.reduce((t, x) => t + x.commits, 0) / prospects : null
}

/** Markets by what the evidence on screen says: interviews, landing tests, pre-sales. Best first. */
export function rankMarkets(scenario: Scenario, view: PlayerView): { id: string; score: number }[] {
  return view.segments
    .map((s) => {
      const notes = segmentNotes(scenario, view, s.id)
      const landing = landingStanding(view, s.id)
      return { id: s.id, score: score(notes, landing, presaleRate(view, s.id)) }
    })
    .sort((a, b) => b.score - a.score)
}

function score(
  notes: ReturnType<typeof segmentNotes>,
  landing: number | null,
  presale: number | null,
): number {
  const fromLanding = landing === null ? 0 : LANDING_WEIGHT * landing
  const fromPresale = presale === null ? 0 : PRESALE_WEIGHT * (presale - PRESALE_BAR)
  return notes.meanBucket + notes.mentionRate + fromLanding + fromPresale
}

/**
 * The inbox policy, using only what the message shows: hours, money now (sure or at risk) and
 * money per month.
 * For each open message, take the eligible choice that asks the most effort, where eligible means
 * no monthly cost, at most 6 h (8 h a week in all), and money only while it is at most a tenth of
 * the cash and leaves 4,500 EUR. A message whose best choice costs nothing is left alone, so its
 * free default happens.
 */
export function answerInbox(view: PlayerView): { messageId: string; choiceId: string }[] {
  const answers: { messageId: string; choiceId: string }[] = []
  let used = view.committedHours
  const cash = view.company.cashCents
  for (const m of view.inbox) {
    if (m.answeredChoiceId !== null) continue
    const eligible = m.choices
      // A risk shown on the card counts as money, as a player reading only numbers would count it.
      .map((c) => ({ ...c, costCents: c.costCents + c.possibleCostCents }))
      .filter(
        (c) =>
          c.monthlyCostCents === 0 &&
          c.hours <= MESSAGE_HOURS_MAX &&
          used + c.hours <= MESSAGE_HOURS_PER_WEEK &&
          used + c.hours + view.forcedHours + (view.bookings?.hostingHours ?? 0) <=
            view.founder.maxHoursPerWeek &&
          (c.costCents === 0 ||
            (c.costCents <= cash * MESSAGE_CASH_SHARE &&
              cash - c.costCents >= MESSAGE_CASH_FLOOR_CENTS)),
      )
    eligible.sort((a, b) => b.hours - a.hours || a.costCents - b.costCents)
    const best = eligible[0]
    if (!best || (best.hours === 0 && best.costCents === 0)) continue
    answers.push({ messageId: m.id, choiceId: best.id })
    used += best.hours
  }
  return answers
}

/**
 * The other blind policy: for each open message, the choice with the fewest hours, then the least
 * money now and per month, without reading. Ties go to the first choice listed.
 */
export function cheapestInbox(view: PlayerView): { messageId: string; choiceId: string }[] {
  const answers: { messageId: string; choiceId: string }[] = []
  for (const m of view.inbox) {
    if (m.answeredChoiceId !== null) continue
    const cost = (c: MessageView['choices'][number]) => c.costCents + c.monthlyCostCents
    const best = [...m.choices].sort((a, b) => a.hours - b.hours || cost(a) - cost(b))[0]
    if (best) answers.push({ messageId: m.id, choiceId: best.id })
  }
  return answers
}

/**
 * Interviews every market, then runs one landing page test on the market its interviews favour
 * and drops that market if too few visitors sign up. Picks the market that sounds most in pain,
 * signs up visitors and asks for features most, builds what its interviewees asked for, then sells
 * there on the channel that finds the most leads per hour. Pitches pre-sales to test what
 * prospects do. Reads the inbox, sorts the books when the accountant asks, and chases late
 * invoices. Moves to
 * the next market after a long stretch without a customer, or when pre-sales find nobody who
 * pays. Follows up with open leads in that market. `behaviours.hire` sets when it makes the one
 * hire.
 */
export function validatingPlayer(
  scenario: Scenario,
  budget: number,
  pricing: (() => Pricer) | null = null,
  behaviours: Behaviours = ALL_BEHAVIOURS,
): Player {
  const channels = new ChannelLog(scenario.sales)
  // Plan 3: office stage offers, and whether the team rule wanted a hire the desks blocked.
  const stageOffers = officeOffers(scenario)
  let wantsDesk = false
  const long = scenario.mode === 'long'
  // In long mode a careful player reads the budget hints and the trials' answers to set its price
  // (plan 3.1), as `price_aware` does.
  const prices = pricing ? pricing() : long ? new PriceSearch(PRICE_RULE) : null
  let lastView: PlayerView | null = null
  const abandoned = new Set<string>()
  let target: string | null = null
  let sellingSince: number | null = null
  let largerLanding = false
  let lastPlan: WeekPlan | null = null
  let freelanceUsed = false
  let tiredMode = false
  const teamRule: TeamRule | null =
    behaviours.team !== undefined
      ? behaviours.team
      : scenario.mode === 'long' && behaviours.hire === 'none' && !behaviours.freelance
        ? CAREFUL_TEAM
        : null
  const impressionOrder = scenario.team.impressions.map((i) => i.name)
  const year2 = behaviours.skipYear2 ? year2EventIds(scenario) : new Set<string>()
  /** Week a round of each kind last ran out of investors, for the retry wait. */
  const roundGaveUp: Partial<Record<'angel' | 'seed', number>> = {}

  // Expansion (`behaviours.expand`): the second market, the first market's founder outreach per
  // week of selling (hours and leads, only weeks without team outreach there), and when selling in
  // the second market began.
  let second: string | null = null
  let expanded = false
  let secondSince: number | null = null
  let secondUnshipped: string[] = []
  /** The second market's interviews are in and at most one of its features is left to build. */
  let secondReady = false
  const firstRates: { hours: number; leads: number }[] = []
  const rateOf = (xs: readonly { hours: number; leads: number }[]) => {
    const h = xs.reduce((t, x) => t + x.hours, 0)
    return h > 0 ? xs.reduce((t, x) => t + x.leads, 0) / h : 0
  }
  /** The first market runs out of new leads: recent leads per hour below `DRY_SHARE` of the best. */
  let bestRate = 0
  const firstRunsDry = () => {
    if (firstRates.length < RATE_WEEKS) return false
    const recent = rateOf(firstRates.slice(-RATE_WEEKS))
    bestRate = Math.max(bestRate, recent)
    return firstRates.length >= 2 * RATE_WEEKS && recent < DRY_SHARE * bestRate
  }
  /** Features still to build: the second market's first, then the first market's. */
  const toBuild = (unshipped: string[]) => [...secondUnshipped, ...unshipped]

  // Inbox events whose choice moves to an office with walk-in leads: event id -> choice, market.
  const officeMoves = new Map<string, { choiceId: string; segmentId: string }>()
  for (const e of scenario.events) {
    for (const c of e.choices) {
      for (const fx of c.effects) {
        if (fx.type !== 'moveOffice') continue
        const walkIns = scenario.officeStages.find((o) => o.id === fx.stage)?.walkIns
        if (walkIns) officeMoves.set(e.id, { choiceId: c.id, segmentId: walkIns.segment })
      }
    }
  }
  const ranked = (view: PlayerView) => rankMarkets(scenario, view)

  /** Skill the bot expects from an impression label: the middle of its band. */
  const skillOf = (label: string | null): number => {
    const bands = scenario.team.impressions
    const i = bands.findIndex((b) => b.name === label)
    if (i < 0) return ASSUMED_SKILL
    const lo = bands[i - 1]?.below ?? (bands[i]?.below ?? ASSUMED_SKILL) - 0.25
    const hi = bands[i]?.below ?? lo + 0.25
    return (lo + hi) / 2
  }

  /** Best payback over the two roles for a hire starting at `startWeek`, from what was observed. */
  const bestPayback = (
    view: PlayerView,
    unshipped: string[],
    market: string,
    startWeek: number,
    roleOnly: 'developer' | 'salesperson' | null,
    skill: number,
  ): { role: 'developer' | 'salesperson'; value: number } | null => {
    const leads = view.leads.filter((l) => l.segmentId === market)
    const won = leads.filter((l) => l.stage === 'paying').length
    const closed = won + leads.filter((l) => l.stage === 'lost').length
    if (won === 0 || closed === 0) return null
    const remaining = unshipped.reduce(
      (t, f) => t + (view.product.features.find((x) => x.id === f)?.remainingHours ?? 0),
      0,
    )
    const roles = (['developer', 'salesperson'] as const).filter((r) => !roleOnly || r === roleOnly)
    let best: { role: 'developer' | 'salesperson'; value: number } | null = null
    for (const role of roles) {
      const salary = view.team.roles.find((r) => r.id === role)?.monthlyCents ?? Infinity
      const value = hirePayback({
        maxWeeks: view.maxWeeks,
        startWeek,
        monthlySalaryCents: salary,
        weeksPerMonth: scenario.finance.weeksPerMonth,
        priceCentsPerMonth: view.company.priceCentsPerMonth,
        weeklyHours: scenario.team.roles[role].weeklyHours * skill,
        usefulHours: role === 'developer' ? remaining : Infinity,
        leadsPerHour: channels.bestRate(market, view.channels),
        winRate: won / closed,
        lagWeeks: PAYBACK_LAG_WEEKS,
      })
      if (!best || value > best.value) best = { role, value }
    }
    return best
  }

  /**
   * The one hire. `covered`: search once revenue covers the salary and hire the best impression.
   * `payback`: search once the observed funnel says a hire pays back before the last week and
   * the founder holds two months of salary, then hire the best impression if it still does.
   */
  const staffing = (b: PlanBuilder, view: PlayerView, wanted: string[], market: string | null) => {
    const team = view.team
    const unshipped = wanted.filter((f) => !view.product.features.find((x) => x.id === f)?.shipped)
    const money = view.company.cashCents + Math.max(0, view.founder.savingsCents)
    // The bots make one hire at most, in every mode (long mode's several hires are for Part C).
    const first = team.members.length === 0 && team.hiresLeft > 0
    if (team.candidates.length > 0 && first) {
      const best = [...team.candidates].sort(
        (x, y) => impressionOrder.indexOf(y.impression) - impressionOrder.indexOf(x.impression),
      )[0]
      if (best && behaviours.hire === 'covered') b.plan.hire = best.id
      if (best && behaviours.hire === 'payback' && market) {
        const start = view.week + view.costs.startWeeks
        const pay = bestPayback(view, unshipped, market, start, best.role, skillOf(best.impression))
        if (pay && pay.value > 0) b.plan.hire = best.id
      }
    } else if (team.canSearch && team.candidates.length === 0 && first) {
      if (b.free >= view.costs.searchHours) {
        let role: 'developer' | 'salesperson' | null = null
        if (behaviours.hire === 'covered') {
          const r = unshipped.length > 0 ? 'developer' : 'salesperson'
          const salary = team.roles.find((x) => x.id === r)?.monthlyCents ?? Infinity
          if (view.monthlyRevenueCents >= salary) role = r
        } else if (behaviours.hire === 'payback' && market) {
          const start = view.week + view.costs.searchWeeks + view.costs.startWeeks
          const pay = bestPayback(view, unshipped, market, start, null, ASSUMED_SKILL)
          const salary = team.roles.find((x) => x.id === pay?.role)?.monthlyCents ?? Infinity
          if (pay && pay.value > 0 && money >= PAYBACK_CASH_MONTHS * salary) role = pay.role
        }
        if (role) {
          b.plan.searchRole = role
          b.free -= view.costs.searchHours
        }
      }
    }
    for (const member of team.members) {
      if (!member.working) continue
      if (member.role === 'developer') {
        const next = unshipped[0] ?? view.product.features.find((f) => !f.shipped)?.id
        if (next) b.plan.teamTasks[member.id] = { kind: 'build', featureId: next }
      } else if (market) {
        b.plan.teamTasks[member.id] = {
          kind: 'outreach',
          segmentId: market,
          channel: channels.choose(market, view.channels, 0),
        }
      }
    }
  }

  /**
   * Months the money would last after adding `extraCents` a month: the burn from the runway shown
   * (money over its weeks, as a month), plus the extra. The runway shown never exceeds the weeks
   * left, so this errs on the careful side near the end.
   */
  const fundedMonths = (view: PlayerView, extraCents: number): number => {
    const money = moneyOf(view)
    const weeks = view.company.runwayWeeks
    const burn =
      weeks === null || weeks === 0 ? 0 : (money / weeks) * scenario.finance.weeksPerMonth
    const total = burn + extraCents
    return total <= 0 ? Infinity : money / total
  }

  /** Monthly revenue three months ago and now, at month ends, from the history. */
  const revenueGrewTwice = (view: PlayerView): boolean => {
    const h = view.history
    const wpm = scenario.finance.weeksPerMonth
    const at = (back: number) => h[h.length - 1 - back * wpm]?.monthlyRevenueCents
    const [a, b, c] = [at(2), at(1), at(0)]
    return a !== undefined && b !== undefined && c !== undefined && c > b && b > a
  }

  /**
   * Raising (`behaviours.raise`): starts a round when the rule says, pitches while it is open,
   * books a second look with every interested investor, accepts the first term sheet, stops a
   * round that ran out of investors, and sends the monthly update.
   */
  const raising = (b: PlanBuilder, view: PlayerView) => {
    const rule = behaviours.raise
    const f = view.funding
    if (!rule || !f) return
    const plan: NonNullable<WeekPlan['funding']> = {
      start: null,
      pitchHours: 0,
      secondLooks: [],
      accept: null,
      decline: [],
      stop: false,
      update: null,
    }
    const take = (hours: number) => {
      const h = Math.min(hours, b.free)
      b.free -= h
      return h
    }
    if (f.updateDue && rule.update !== 'never') {
      const hours = rule.update === 'proper' ? f.updateHours.proper : f.updateHours.short
      if (b.free >= hours) {
        plan.update = rule.update
        take(hours)
      }
    }
    const has = (round: 'angel' | 'seed') => view.funding!.capTable.some((c) => c.round === round)
    const closingNow = f.investors.some((i) => i.stage === 'accepted')
    const offered = f.investors.filter((i) => i.stage === 'offered')
    const interested = f.investors.filter((i) => i.stage === 'interested')
    if (offered[0] && !closingNow) plan.accept = offered[0].id
    const seedBar = scenario.funding?.rounds.seed.barMonthlyCents ?? Infinity
    const covered = view.monthlyRevenueCents >= view.company.monthlyFixedCostsCents
    const runway = view.company.runwayWeeks
    const wants = (round: 'angel' | 'seed'): boolean => {
      if (has(round)) return false
      if ((f.rounds.find((r) => r.id === round)?.investorsLeft ?? 0) === 0) return false
      const gaveUp = roundGaveUp[round]
      // The early raiser believes in raising and tries again at once.
      const wait = rule.when === 'early' ? 0 : RAISE_RETRY_WEEKS
      if (gaveUp !== undefined && view.week - gaveUp < wait) return false
      if (round === 'seed') {
        if (rule.when === 'early') return has('angel')
        if (rule.when === 'late') return false
        return view.monthlyRevenueCents >= seedBar && revenueGrewTwice(view)
      }
      switch (rule.when) {
        case 'early':
          return view.week >= 3
        case 'always':
          return view.customers.length > 0
        case 'late':
          return runway !== null && runway < LATE_RUNWAY_WEEKS
        case 'traction':
          return (
            covered && revenueGrewTwice(view) && (runway === null || runway >= RAISE_RUNWAY_WEEKS)
          )
      }
    }
    if (f.round) {
      // A late raiser needs the money and keeps the round open to the end.
      const exhausted =
        f.round.investorsLeft === 0 && interested.length === 0 && offered.length === 0
      if (exhausted && rule.when !== 'late') {
        plan.stop = true
        roundGaveUp[f.round.id] = view.week
      } else {
        for (const inv of interested) {
          const hours = f.rounds.find((r) => r.id === inv.round)?.secondLookHours ?? 0
          if (b.free < hours) break
          plan.secondLooks.push(inv.id)
          take(hours)
        }
        if (f.round.investorsLeft > 0) plan.pitchHours = take(PITCH_HOURS)
        const per = f.rounds.find((r) => r.id === f.round!.id)?.pitchHoursPerMeeting ?? 1
        plan.pitchHours -= plan.pitchHours % per
      }
    } else if (f.canStart && !closingNow) {
      const round = wants('angel') ? 'angel' : wants('seed') ? 'seed' : null
      const cfg = round ? f.rounds.find((r) => r.id === round) : undefined
      if (round && cfg && b.free >= cfg.prepHours + PITCH_HOURS) {
        plan.start = round
        take(cfg.prepHours)
        plan.pitchHours = take(PITCH_HOURS)
        plan.pitchHours -= plan.pitchHours % cfg.pitchHoursPerMeeting
      }
    }
    b.plan.funding = plan
  }

  /** Monthly revenue from customers whose lead this member found, as the pipeline shows it. */
  const foundRevenue = (view: PlayerView, memberId: string): number => {
    const names = new Set(
      view.leads.filter((l) => l.foundBy === memberId && l.stage === 'paying').map((l) => l.name),
    )
    return view.customers
      .filter((c) => names.has(c.name))
      .reduce((t, c) => t + c.priceCentsPerMonth, 0)
  }

  const moneyOf = (view: PlayerView) =>
    view.company.cashCents + Math.max(0, view.founder.savingsCents)
  /**
   * Change in cash plus savings a month, averaged over the last `NET_MONTHS` months; null before
   * they have been played.
   */
  const lastMonth = (view: PlayerView): number | null => {
    const h = view.history
    const then = h[h.length - 1 - NET_MONTHS * scenario.finance.weeksPerMonth]
    if (!then) return null
    return (moneyOf(view) - (then.cashCents + Math.max(0, then.savingsCents))) / NET_MONTHS
  }
  /** Money in hand covers `months` of the monthly loss once `extraCents` a month is added. */
  const covers = (view: PlayerView, extraCents: number, months: number): boolean => {
    const net = lastMonth(view)
    if (net === null) return false
    return moneyOf(view) >= months * Math.max(0, extraCents - net)
  }
  /**
   * The runway shown is below `months` (null runway: money is not shrinking), and the money
   * does not last to the end (runway never shows more than the weeks left, this one included).
   */
  const short = (view: PlayerView, months: number) =>
    view.company.runwayWeeks !== null &&
    view.company.runwayWeeks < months * scenario.finance.weeksPerMonth &&
    view.company.runwayWeeks < view.maxWeeks - view.week + 1
  /** The role that limits growth: a developer while the market's wanted features need building. */
  const limitingRole = (view: PlayerView, unshipped: string[]): 'developer' | 'salesperson' => {
    const backlog = unshipped.reduce(
      (t, f) => t + (view.product.features.find((x) => x.id === f)?.remainingHours ?? 0),
      0,
    )
    return backlog >= BACKLOG_HOURS ? 'developer' : 'salesperson'
  }
  const salaryOf = (view: PlayerView, role: 'developer' | 'salesperson', partTime: boolean) => {
    const r = view.team.roles.find((x) => x.id === role)
    return (partTime ? r?.partTime?.monthlyCents : r?.monthlyCents) ?? Infinity
  }

  /**
   * Long mode team building by `teamRule`: lets the newest hire go when money runs short (or a
   * developer has nothing left to build), searches when the rule says the next hire is affordable,
   * hires the best impression, and gives every working member a task.
   */
  const growing = (
    b: PlanBuilder,
    view: PlayerView,
    unshipped: string[],
    market: string | null,
  ) => {
    const rule = teamRule
    if (!rule) return
    const team = view.team
    const members = team.members
    const newest = members[members.length - 1]
    const nothingToBuild = view.product.features.every((f) => f.shipped)
    const floor = rule.start === 'savings' ? SAVINGS_LET_GO_MONTHS : LET_GO_MONTHS
    const idleDev = members.find(
      (m) =>
        m.working &&
        m.role === 'developer' &&
        (second !== null ? toBuild(unshipped).length === 0 : nothingToBuild),
    )
    // With investors' money a funded company spends towards its runway target: it hires without
    // waiting for the newest hire to settle, and keeps the results rule.
    const funded = behaviours.raise !== undefined && (view.funding?.raisedCents ?? 0) > 0
    const unpaid = members.find(
      (m) =>
        m.working &&
        m.role === 'salesperson' &&
        view.week - m.startWeek >= RESULTS_WEEKS &&
        foundRevenue(view, m.id) < RESULTS_SHARE * m.monthlyCents,
    )
    if (newest && short(view, floor)) b.plan.letGo = newest.id
    else if (idleDev) b.plan.letGo = idleDev.id
    else if (unpaid) b.plan.letGo = unpaid.id
    const beforeFirstHire = team.hiresLeft === view.costs.teamMaxHires

    const role = limitingRole(view, second !== null ? toBuild(unshipped) : unshipped)
    const salary = salaryOf(view, role, rule.partTime)
    const startWeek = view.week + view.costs.searchWeeks + view.costs.startWeeks
    const firstOnSavings = rule.start === 'savings' && beforeFirstHire
    const horizon = view.maxWeeks - startWeek + 1 >= HIRE_HORIZON_WEEKS
    const hireAffordable = firstOnSavings
      ? view.week >= 3 && moneyOf(view) >= SAVINGS_SALARIES * salary
      : behaviours.raise && (view.funding?.raisedCents ?? 0) > 0
        ? fundedMonths(view, salary) >= FUNDED_HIRE_MONTHS && horizon
        : (lastMonth(view) ?? -1) >= 0 && covers(view, salary, HIRE_RUNWAY_MONTHS) && horizon

    // The freelancer before the first hire: rented by the same need, ended once a hire is near.
    if (rule.freelanceFirst) freelancingFirst(b, view, unshipped, market, beforeFirstHire)

    // The offer is made only if the rule still holds (candidates not hired lapse at the next search).
    const settled =
      !newest || funded || (newest.working && view.week - newest.startWeek >= SETTLE_WEEKS)
    const offer = b.plan.letGo === null && team.candidates.length > 0 && team.canHire
    // Plan 3: the rule would look for someone, but every desk or place on the team is taken.
    wantsDesk =
      b.plan.letGo === null &&
      !team.canHire &&
      team.search === null &&
      team.candidates.length === 0 &&
      team.hiresLeft > 0 &&
      !!market &&
      settled &&
      hireAffordable
    if (offer && hireAffordable) {
      const best = [...team.candidates].sort(
        (x, y) => impressionOrder.indexOf(y.impression) - impressionOrder.indexOf(x.impression),
      )[0]
      if (best) b.plan.hire = best.id
    } else if (
      b.plan.letGo === null &&
      team.canSearch &&
      market &&
      b.free >= view.costs.searchHours &&
      settled &&
      hireAffordable
    ) {
      b.plan.searchRole = role
      if (rule.partTime) b.plan.searchPartTime = true
      b.free -= view.costs.searchHours
    }
    // With a second market open, developers build its features first and salespeople sell there
    // once at most one of them is left.
    const sellIn = second !== null && secondReady ? second : market
    for (const member of members) {
      if (!member.working || member.id === b.plan.letGo) continue
      if (member.role === 'developer') {
        const next = toBuild(unshipped)[0] ?? view.product.features.find((f) => !f.shipped)?.id
        if (next) b.plan.teamTasks[member.id] = { kind: 'build', featureId: next }
      } else if (sellIn) {
        b.plan.teamTasks[member.id] = {
          kind: 'outreach',
          segmentId: sellIn,
          channel: channels.choose(sellIn, view.channels, 0),
        }
      }
    }
  }

  /**
   * Long mode chasing, once the team's week is planned. With someone working on the team who
   * stays (`chaseBy` team), the first of them chases late invoices before their own work, and the
   * founder does not. Otherwise the founder chases `CHASE_PER_WEEK`, or one more for every
   * `CUSTOMERS_PER_CHASE` customers.
   */
  const chasing = (b: PlanBuilder, view: PlayerView) => {
    if (!long || !behaviours.chase) return
    const member =
      (behaviours.chaseBy ?? 'team') === 'team'
        ? view.team.members.find((m) => m.working && m.id !== b.plan.letGo)
        : undefined
    if (member) {
      const task = b.plan.teamTasks[member.id]
      b.plan.teamTasks[member.id] =
        task && task.kind !== 'admin' ? { ...task, admin: true } : { kind: 'admin' }
      return
    }
    b.chase(Math.max(CHASE_PER_WEEK, Math.ceil(view.customers.length / CUSTOMERS_PER_CHASE)))
  }

  /**
   * Long mode: once the founder's outreach is planned, each salesperson and a freelance
   * salesperson take the channel in their market that finds the most leads after the hours
   * already planned on it this week, so they do not wear out the founder's channel.
   */
  const placeHelpers = (b: PlanBuilder, view: PlayerView) => {
    if (!long) return
    const planned = new Map<string, Partial<Record<ChannelId, number>>>()
    const add = (segmentId: string, channel: ChannelId, hours: number) => {
      const m = planned.get(segmentId) ?? {}
      m[channel] = (m[channel] ?? 0) + hours
      planned.set(segmentId, m)
    }
    for (const [seg, out] of Object.entries(b.plan.outreach)) add(seg, out.channel, out.hours)
    for (const m of view.team.members) {
      const task = b.plan.teamTasks[m.id]
      if (task?.kind !== 'outreach') continue
      const hours = m.weeklyHours * ASSUMED_SKILL
      const channel = channels.choose(
        task.segmentId,
        view.channels,
        0,
        hours,
        planned.get(task.segmentId),
      )
      b.plan.teamTasks[m.id] = { ...task, channel }
      add(task.segmentId, channel, hours)
    }
    const fo = b.plan.freelance.outreach
    const cur = view.team.freelance.current
    if (fo && cur) {
      const hours = cur.workHoursThisWeek
      b.plan.freelance.outreach = {
        ...fo,
        channel: channels.choose(fo.segmentId, view.channels, 0, hours, planned.get(fo.segmentId)),
      }
    }
  }

  /** `behaviours.situation`: one extra person for a burst or steady work, then let go. */
  let situationUsed = false
  const situational = (
    b: PlanBuilder,
    view: PlayerView,
    unshipped: string[],
    market: string | null,
  ) => {
    const sit = behaviours.situation
    if (!sit) return
    const role = sit.kind === 'burst' ? 'developer' : 'salesperson'
    // Steady work starts once the business can carry a part time salesperson by the careful
    // rule (a month makes money, money covers what they add to the loss for six months, and a
    // hire's horizon is left), the same week for the freelancer and the hire.
    const want =
      sit.kind === 'burst'
        ? view.week >= 3 && unshipped.length > 0
        : view.customers.length > 0 &&
          (lastMonth(view) ?? -1) >= 0 &&
          covers(view, salaryOf(view, 'salesperson', true), HIRE_RUNWAY_MONTHS) &&
          view.maxWeeks - (view.week + view.costs.searchWeeks + view.costs.startWeeks) + 1 >=
            HIRE_HORIZON_WEEKS
    const done = (sit.kind === 'burst' && unshipped.length === 0) || short(view, LET_GO_MONTHS)
    const outreach = () =>
      market ? { segmentId: market, channel: channels.choose(market, view.channels, 0) } : null
    if (sit.by === 'freelancer') {
      const fl = view.team.freelance
      const cur = fl.current
      if (cur && cur.endWeek === null && done) b.plan.freelance.end = true
      else if (!situationUsed && cur === null && fl.canBook && want && !done) {
        b.plan.freelance.book = { role, hoursPerWeek: FIRST_FREELANCE_HOURS }
        situationUsed = true
      }
      if (!cur?.working) return
      if (cur.role === 'developer') {
        const left = (id: string) => {
          const f = view.product.features.find((x) => x.id === id)
          return f ? f.remainingHours - (b.plan.build[id] ?? 0) : 0
        }
        const best = [...unshipped].sort((x, y) => left(y) - left(x))[0]
        b.plan.freelance.build = best && left(best) > 0 ? best : null
      } else b.plan.freelance.outreach = outreach()
      return
    }
    const team = view.team
    const member = team.members[0]
    if (member && done) b.plan.letGo = member.id
    else if (!member && !situationUsed && team.candidates.length > 0 && team.canHire && !done) {
      const best = [...team.candidates].sort(
        (x, y) => impressionOrder.indexOf(y.impression) - impressionOrder.indexOf(x.impression),
      )[0]
      if (best) {
        b.plan.hire = best.id
        situationUsed = true
      }
    } else if (
      !member &&
      !situationUsed &&
      team.canSearch &&
      team.search === null &&
      team.candidates.length === 0 &&
      want &&
      !done &&
      b.free >= view.costs.searchHours
    ) {
      b.plan.searchRole = role
      b.plan.searchPartTime = true
      b.free -= view.costs.searchHours
    }
    if (!member?.working || b.plan.letGo === member.id) return
    if (member.role === 'developer') {
      const next = unshipped[0]
      if (next) b.plan.teamTasks[member.id] = { kind: 'build', featureId: next }
    } else {
      const o = outreach()
      if (o) b.plan.teamTasks[member.id] = { kind: 'outreach', ...o }
    }
  }

  /**
   * `freelanceFirst`: until the first hire is on the way, a 20 h freelancer in the limiting role.
   * A developer is a burst: from week 3, while money in hand covers the whole build left at their
   * rate plus three months of today's loss. A salesperson is steady: from the first paying
   * customer, while money in hand covers the added loss for three months, with a hire's horizon
   * left. Notice when the role needed changes, the runway shown falls below three months, or a
   * search for a hire starts.
   */
  const freelancingFirst = (
    b: PlanBuilder,
    view: PlayerView,
    unshipped: string[],
    market: string | null,
    beforeFirstHire: boolean,
  ) => {
    const fl = view.team.freelance
    const cur = fl.current
    const role = limitingRole(view, unshipped)
    const running = cur !== null && cur.endWeek === null
    const hiring =
      !beforeFirstHire ||
      view.team.search !== null ||
      view.team.candidates.length > 0 ||
      b.plan.searchRole !== null
    const perHour = fl.roles.find((r) => r.id === role)?.centsPerHour ?? Infinity
    const bill = FIRST_FREELANCE_HOURS * perHour * scenario.finance.weeksPerMonth
    const backlog = unshipped.reduce(
      (t, f) => t + (view.product.features.find((x) => x.id === f)?.remainingHours ?? 0),
      0,
    )
    // Before a month has been played, the loss is living and fixed costs.
    const loss = Math.max(
      0,
      -(
        lastMonth(view) ??
        view.monthlyRevenueCents -
          view.company.monthlyFixedCostsCents -
          view.founder.livingCostCentsPerMonth
      ),
    )
    const affordable =
      role === 'developer'
        ? view.week >= 3 &&
          moneyOf(view) >= (backlog / fl.outputShare) * perHour + FIRST_FREELANCE_MONTHS * loss
        : view.customers.length > 0 &&
          covers(view, bill, FIRST_FREELANCE_MONTHS) &&
          view.maxWeeks - view.week >= HIRE_HORIZON_WEEKS
    if (running && (hiring || cur.role !== role || short(view, LET_GO_MONTHS)))
      b.plan.freelance.end = true
    else if (cur === null && fl.canBook && !hiring && affordable)
      b.plan.freelance.book = { role, hoursPerWeek: FIRST_FREELANCE_HOURS }
    if (!cur?.working) return
    if (cur.role === 'developer') {
      const left = (id: string) => {
        const f = view.product.features.find((x) => x.id === id)
        return f ? f.remainingHours - (b.plan.build[id] ?? 0) : 0
      }
      const best = [...unshipped].sort((x, y) => left(y) - left(x))[0]
      b.plan.freelance.build = best && left(best) > 0 ? best : null
    } else if (market) {
      b.plan.freelance.outreach = {
        segmentId: market,
        channel: channels.choose(market, view.channels, 0),
      }
    }
  }

  /** The freelancer of `behaviours.freelance`: booked once, given work, let go when done. */
  const freelancing = (b: PlanBuilder, view: PlayerView, unshipped: string[]) => {
    const rule = behaviours.freelance
    if (!rule) return
    const fl = view.team.freelance
    const cur = fl.current
    if (!freelanceUsed && cur === null && fl.canBook) {
      const wanted = rule.role === 'developer' ? unshipped.length > 0 : view.customers.length > 0
      if (wanted) {
        b.plan.freelance.book = { role: rule.role, hoursPerWeek: rule.hours }
        freelanceUsed = true
      }
      return
    }
    if (!cur) return
    if (cur.endWeek === null) {
      // A developer gets notice once next week is the last with work left for them.
      const leftAfter =
        unshipped.reduce(
          (t, id) =>
            t +
            (view.product.features.find((x) => x.id === id)?.remainingHours ?? 0) -
            (b.plan.build[id] ?? 0),
          0,
        ) - cur.workHoursThisWeek
      const done =
        rule.role === 'developer'
          ? leftAfter <= cur.hoursPerWeek * fl.outputShare ||
            view.week - cur.startWeek + 1 >= MAX_FREELANCE_WEEKS
          : view.week - cur.startWeek + 1 + fl.noticeWeeks >= rule.weeks
      if (done) b.plan.freelance.end = true
    }
    if (!cur.working) return
    if (cur.role === 'developer') {
      // The wanted feature with the most left after the founder's own hours this week.
      const left = (id: string) => {
        const f = view.product.features.find((x) => x.id === id)
        return f ? f.remainingHours - (b.plan.build[id] ?? 0) : 0
      }
      const best = [...unshipped].sort((x, y) => left(y) - left(x))[0]
      b.plan.freelance.build = best && left(best) > 0 ? best : null
    } else if (target) {
      b.plan.freelance.outreach = {
        segmentId: target,
        channel: channels.choose(target, view.channels, 0),
      }
    }
  }

  /** The tired founder's freelancer (`behaviours.tiredFreelance`): booked while tired, then let go. */
  const tiredRenting = (b: PlanBuilder, view: PlayerView, unshipped: string[]) => {
    const rule = behaviours.tiredFreelance
    if (!rule?.rent) return
    const fl = view.team.freelance
    const cur = fl.current
    const running = cur !== null && cur.endWeek === null
    const role = unshipped.length > 0 ? 'developer' : 'salesperson'
    if (tiredMode) {
      if (!running && fl.canBook) b.plan.freelance.book = { role, hoursPerWeek: rule.hours }
      else if (running && cur.role !== role) b.plan.freelance.end = true
    } else if (running) {
      b.plan.freelance.end = true
    }
    if (!cur?.working) return
    if (cur.role === 'developer') {
      const left = (id: string) => {
        const f = view.product.features.find((x) => x.id === id)
        return f ? f.remainingHours - (b.plan.build[id] ?? 0) : 0
      }
      const best = [...unshipped].sort((x, y) => left(y) - left(x))[0]
      b.plan.freelance.build = best && left(best) > 0 ? best : null
    } else if (target) {
      b.plan.freelance.outreach = {
        segmentId: target,
        channel: channels.choose(target, view.channels, 0),
      }
    }
  }

  return {
    focus: () => target,
    respond(input) {
      // A forced answer comes first and takes its messages out of the rest.
      const forced = behaviours.forced
      const forcedAnswers: { messageId: string; choiceId: string }[] = []
      let forcedHours = 0
      for (const m of input.inbox) {
        if (!forced || m.eventId !== forced.eventId || m.answeredChoiceId !== null) continue
        const c = m.choices.find((x) => x.id === forced.choiceId)
        const hours = input.committedHours + forcedHours + input.forcedHours + (c?.hours ?? 0)
        if (!c || hours > input.founder.maxHoursPerWeek) continue
        forcedAnswers.push({ messageId: m.id, choiceId: c.id })
        forcedHours += c.hours
      }
      const view = {
        ...input,
        committedHours: input.committedHours + forcedHours,
        inbox: input.inbox.filter(
          (m) =>
            (!forced || m.eventId !== forced.eventId) &&
            m.eventId !== behaviours.skipEvent &&
            !year2.has(m.eventId),
        ),
      }
      // The books are their own behaviour: sorted by hand, or left to the default.
      const books = view.inbox.filter(
        (m) => m.eventId === BOOKS_EVENT && m.answeredChoiceId === null,
      )
      const answers = behaviours.books
        ? books.flatMap((m) => {
            const c = m.choices.find((x) => x.id === BOOKS_CHOICE)
            const fits =
              c &&
              view.committedHours +
                view.forcedHours +
                (view.bookings?.hostingHours ?? 0) +
                c.hours <=
                view.founder.maxHoursPerWeek
            return fits ? [{ messageId: m.id, choiceId: BOOKS_CHOICE }] : []
          })
        : []
      const used = answers.reduce(
        (t, a) =>
          t +
          (books.find((m) => m.id === a.messageId)?.choices.find((c) => c.id === a.choiceId)
            ?.hours ?? 0),
        0,
      )
      const rest = {
        ...view,
        committedHours: view.committedHours + used,
        inbox: view.inbox.filter((m) => m.eventId !== BOOKS_EVENT),
      }
      // An office move that brings walk-in leads: taken only when this bot's own evidence ranks
      // that market first, else left to its default.
      // Plan 3: office stage offers by the bot's own office rule, whatever its inbox policy.
      const stageMoves = answerOffers(
        rest,
        stageOffers,
        behaviours.office ?? 'careful',
        wantsDesk,
        rest.founder.maxHoursPerWeek -
          rest.committedHours -
          rest.forcedHours -
          (rest.bookings?.hostingHours ?? 0),
      )
      rest.committedHours += stageMoves.reduce((t, a) => t + a.hours, 0)
      rest.inbox = rest.inbox.filter((m) => !stageOffers.has(m.eventId))
      const stageAnswers = stageMoves.map(({ messageId, choiceId }) => ({ messageId, choiceId }))
      // Leaving the inbox to its defaults is about messages, not where the company works.
      if (behaviours.inbox === 'none') return [...forcedAnswers, ...answers, ...stageAnswers]
      const moves =
        behaviours.inbox === 'reader'
          ? rest.inbox.flatMap((m) => {
              const move = officeMoves.get(m.eventId)
              if (!move || m.answeredChoiceId !== null) return []
              return ranked(view)[0]?.id === move.segmentId
                ? [{ messageId: m.id, choiceId: move.choiceId }]
                : []
            })
          : []
      return [
        ...forcedAnswers,
        ...answers,
        ...stageAnswers,
        ...moves,
        ...(behaviours.inbox === 'reader'
          ? readInbox(rest, scenario)
          : behaviours.inbox === 'cheapest'
            ? cheapestInbox(rest)
            : answerInbox(rest)),
      ]
    },
    plan(view) {
      const tiredRule = behaviours.tiredFreelance
      if (tiredRule) {
        if (!tiredMode && view.founder.energy < tiredRule.below) tiredMode = true
        else if (tiredMode && view.founder.energy >= view.founder.tiredBelow) tiredMode = false
      }
      const b = new PlanBuilder(view, budget - (tiredMode && tiredRule ? tiredRule.hours : 0))
      const ids = view.segments.map((s) => s.id)
      lastView = view
      if (prices && view.week <= 2) b.price(prices.price(view, null))
      // Long mode chases after the team's week is planned (`chasing`), so a hire can take it over.
      if (behaviours.chase && !long) b.chase(CHASE_PER_WEEK)

      // Week 1: interviews only. Week 2: a landing page test where the interviews point, more
      // interviews there, and the feature everyone asks for.
      if (view.week === 1) {
        for (const id of ids) b.interviews(id, FIRST_WEEK_INTERVIEWS)
        lastPlan = b.plan
        return b.plan
      }
      if (view.week === 2) {
        const top = ranked(view)
        if (behaviours.presales === 'max') {
          for (const { id } of top) while (b.presale(id));
        } else if (top[0]) {
          b.presale(top[0].id)
        }
        if (behaviours.landing) for (const { id } of top.slice(0, LANDING_MARKETS)) b.landing(id)
        for (const { id } of top.slice(0, 2)) b.interviews(id, SECOND_WEEK_INTERVIEWS)
        const all = new Map<string, number>()
        for (const id of ids) {
          for (const [f, n] of segmentNotes(scenario, view, id).mentions) {
            all.set(f, (all.get(f) ?? 0) + n)
          }
        }
        const common = [...all.entries()].sort((x, y) => y[1] - x[1])[0]
        if (common) b.build(common[0], MAX_BUILD_HOURS)
        // A rented developer is booked the week building starts, to work from week 3.
        if (common && behaviours.freelance?.role === 'developer') freelancing(b, view, [common[0]])
        tiredRenting(b, view, common ? [common[0]] : [])
        lastPlan = b.plan
        return b.plan
      }

      // A market whose landing page test drew clearly fewer sign ups than another's is out.
      for (const s of view.segments) {
        if (behaviours.landing && landingBehind(view, s.id) && !abandoned.has(s.id)) {
          abandoned.add(s.id)
          if (target === s.id) {
            target = null
            sellingSince = null
          }
        }
      }
      // First landing results that do not separate the markets: one larger test in each, once.
      if (behaviours.landing && !largerLanding) {
        const tested = view.segments.filter((s) => s.landingTests.length > 0)
        const waitingLanding = view.pendingExperiments.some((e) => e.kind === 'landing')
        if (tested.length >= 2 && !waitingLanding) {
          largerLanding = true
          if (!tested.some((s) => landingBehind(view, s.id)))
            for (const s of tested) if (!abandoned.has(s.id)) b.landing(s.id, 'large')
        }
      }
      if (target === null) {
        target =
          ranked(view).find((r) => !abandoned.has(r.id))?.id ?? ranked(view)[0]?.id ?? ids[0]!
      }
      if (prices) b.price(prices.price(view, target))
      const notes = segmentNotes(scenario, view, target)
      const wanted = notes.mentions.map(([f]) => f)
      const unshipped = wanted.filter(
        (f) => !view.product.features.find((x) => x.id === f)?.shipped,
      )

      // Expansion: open the second market once the first runs dry in year 2, learn what it asks
      // for, and give it up if selling there finds nobody.
      const dry = behaviours.expand && !expanded && firstRunsDry()
      if (dry && view.week >= EXPAND_FROM) {
        expanded = true
        second =
          ranked(view).find((r) => r.id !== target && !abandoned.has(r.id))?.id ??
          ranked(view).find((r) => r.id !== target)?.id ??
          null
      }
      if (second !== null) {
        const wanted2 = segmentNotes(scenario, view, second).mentions.map(([f]) => f)
        secondUnshipped = wanted2.filter(
          (f) => !view.product.features.find((x) => x.id === f)?.shipped && !unshipped.includes(f),
        )
        secondReady =
          segmentNotes(scenario, view, second).interviews >= SECOND_INTERVIEWS &&
          secondUnshipped.length <= 1
        const here = view.customers.filter((c) => c.segmentId === second).length
        if (secondSince !== null && view.week - secondSince >= SECOND_GIVE_UP_WEEKS && here === 0) {
          abandoned.add(second)
          second = null
          secondUnshipped = []
          secondReady = false
        }
      }

      if (behaviours.hire !== 'none') staffing(b, view, wanted, target)
      growing(b, view, unshipped, target)
      situational(b, view, unshipped, target)
      chasing(b, view)
      raising(b, view)
      b.demos(bookableLeads(view, target))
      b.demos(bookableLeads(view))
      if (behaviours.followUps) b.followUp(FOLLOW_UPS_PER_WEEK, target)
      if (behaviours.followUps && second !== null) b.followUp(FOLLOW_UPS_PER_WEEK, second)
      if (view.product.bugs >= BUG_LIMIT) b.fixBugs(BUG_FIX_HOURS)
      // Keep listening until a few different features have come up.
      if (wanted.length < 3 && notes.interviews < 20) b.interviews(target, 3)
      for (const f of unshipped) b.build(f, MAX_BUILD_HOURS - (b.plan.build[f] ?? 0))
      if (second !== null) {
        const heard = segmentNotes(scenario, view, second).interviews
        if (heard < SECOND_INTERVIEWS) b.interviews(second, SECOND_INTERVIEWS - heard)
        let left = SECOND_BUILD_HOURS
        for (const f of secondUnshipped) left -= b.build(f, Math.min(left, MAX_BUILD_HOURS))
      }
      freelancing(b, view, unshipped)
      tiredRenting(b, view, unshipped)

      // Pre-sales measure what prospects do. A careful player pitches every batch its chosen market
      // allows, one a week; nobody in two batches and this market is out.
      const sales = view.segments.find((s) => s.id === target)?.presales ?? []
      const waiting = view.pendingExperiments.some(
        (e) => e.kind === 'presale' && e.segmentId === target,
      )
      const prospects = sales.reduce((t, x) => t + x.prospects, 0)
      const commits = sales.reduce((t, x) => t + x.commits, 0)
      if (behaviours.presales === 'max') {
        for (const r of ranked(view)) if (!abandoned.has(r.id)) while (b.presale(r.id));
      } else if (!waiting && behaviours.presales === 'careful') {
        b.presale(target)
      }
      const refuted =
        sales.length >= MAX_PRESALE_BATCHES &&
        prospects >= MAX_PRESALE_BATCHES * view.costs.presaleBatchSize &&
        commits === 0

      // With the second market's features built, half of the outreach goes there.
      if (second !== null && secondReady && b.free > 0) {
        secondSince ??= view.week
        const half = Math.floor(b.free / 2)
        const channel = channels.choose(second, view.channels, CHANNEL_TRIAL_HOURS, half)
        b.outreach(second, channel, half)
      }
      if (unshipped.length <= 1 && wanted.length > 0) {
        sellingSince ??= view.week
        const channel = channels.choose(target, view.channels, CHANNEL_TRIAL_HOURS, b.free)
        b.outreach(target, channel, b.free)
      }

      placeHelpers(b, view)

      const customersHere = view.customers.filter((c) => c.segmentId === target).length
      if (
        refuted ||
        (sellingSince !== null &&
          view.week - sellingSince >= PIVOT_AFTER_WEEKS &&
          customersHere === 0)
      ) {
        abandoned.add(target)
        target = null
        sellingSince = null
      }
      lastPlan = b.plan
      return b.plan
    },
    observe(report) {
      if (lastPlan) channels.record(lastPlan, report)
      // The first market's founder outreach, for expansion: weeks where only the founder sold there.
      const out = target !== null ? lastPlan?.outreach[target] : undefined
      const teamThere =
        lastPlan !== null &&
        Object.values(lastPlan.teamTasks).some(
          (t) => t.kind === 'outreach' && t.segmentId === target,
        )
      if (behaviours.expand && out && out.hours > 0 && !teamThere) {
        const leads = report.entries.reduce(
          (t, e) =>
            e.kind === 'new_leads' && e.segmentId === target && e.channel === out.channel
              ? t + e.count
              : t,
          0,
        )
        firstRates.push({ hours: out.hours, leads })
      }
      if (prices && lastView) prices.observe(lastView, report, target)
    },
  }
}

const DESCRIPTION =
  'Interviews every market in week 1. In week 2 pitches one pre-sale batch in the market its interviews favour, runs landing page tests in the top two, and starts the feature everyone asks for. When those tests do not separate the two markets, it runs one larger test in each. Pitches every pre-sale batch its chosen market allows, one a week. Drops a tested market when another drew clearly more landing sign ups (1.5 standard errors), or after two pre-sale batches without a deposit. Builds what its market asks for, sells on its best channel, follows up with up to six open leads there a week, and moves on after 12 weeks of selling without a customer. Sorts the books when the accountant asks, chases three late invoices a week, and reads the inbox (`readInbox`).'

/** What the careful bot adds in long mode: the reference team rule. */
export const LONG_TEAM_TEXT = ` In long mode it also builds a team. It looks for a hire once its cash and savings grew over the last four weeks, would pay what the hire adds to the monthly loss for ${HIRE_RUNWAY_MONTHS} months, and at least ${HIRE_HORIZON_WEEKS} weeks would be left once the hire starts: a developer while the features its market asks for need ${BACKLOG_HOURS} h or more, else a salesperson, full time, the best impression. The next search waits until the newest hire has worked ${SETTLE_WEEKS} weeks. The newest hire is let go once the runway shown falls below ${LET_GO_MONTHS} months, and a developer once every feature has shipped. It takes a bigger office when its offer arrives and the reason is real: its hiring rule wants someone and every desk or place is taken, or, for the first office, three months that paid all costs; and cash and savings cover the move, six months of the added rent and two months of today's costs.`

export const validateThenBuild: Strategy = {
  id: 'validate_then_build',
  description: DESCRIPTION,
  describe: (scenario) => (scenario.mode === 'long' ? DESCRIPTION + LONG_TEAM_TEXT : DESCRIPTION),
  create: (scenario) => validatingPlayer(scenario, 50),
}

export const validateThenBuildHire: Strategy = {
  id: 'validate_then_build_hire',
  description:
    'Plays like validate_then_build, and makes the one hire (a developer while wanted features are unbuilt, else a salesperson) once monthly revenue covers that salary, choosing the best impression.',
  create: (scenario) =>
    validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, hire: 'covered' }),
}

export const validateThenBuildEarlyHire: Strategy = {
  id: 'validate_then_build_early_hire',
  description:
    'Plays like validate_then_build, and searches for the one hire as soon as its own funnel (leads per hour on the best channel, share of closed leads won, current price) says a developer or salesperson would bring in more than their salary before the last week, assuming no churn and 8 weeks from extra outreach to payment, while cash and savings hold two months of that salary. Takes the role that pays back more, and hires the best impression if it still pays back at that skill.',
  create: (scenario) =>
    validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, hire: 'payback' }),
}

/** Long mode team variants of the careful bot, each against the reference team rule. */
export const TEAM_VARIANTS: {
  id: string
  team: TeamRule | null
  description: string
  /** Behaviours beside the team rule. */
  extra?: Partial<Behaviours>
}[] = [
  {
    id: 'validate_then_build_solo',
    team: null,
    description:
      'Plays like validate_then_build and never hires or rents anyone: the bootstrapped solo founder.',
  },
  {
    id: 'validate_then_build_savings_hire',
    team: { ...CAREFUL_TEAM, start: 'savings' },
    description: `Plays like validate_then_build, and makes its first hire on savings: it looks for one as soon as building starts (week 3), while cash and savings hold ${SAVINGS_SALARIES} months of the salary, and keeps that hire until the runway shown falls below ${SAVINGS_LET_GO_MONTHS} month. Later hires follow the reference rule.`,
  },
  {
    id: 'validate_then_build_part_time',
    team: { ...CAREFUL_TEAM, partTime: true },
    description:
      'Plays like validate_then_build, with the same team rule, but hires only part time (20 h at half the salary).',
  },
  {
    id: 'validate_then_build_freelance_first',
    team: { ...CAREFUL_TEAM, freelanceFirst: true },
    description: `Plays like validate_then_build, and until its first hire is on the way rents a ${FIRST_FREELANCE_HOURS} h freelancer in the role that limits it. A developer for the build, as a burst: from week 3, while the features its market asks for need ${BACKLOG_HOURS} h or more and cash and savings cover the whole build left at the freelancer's rate plus ${FIRST_FREELANCE_MONTHS} months of the current loss. A salesperson for the pipeline, steady: from the first paying customer, while cash and savings would pay the added loss for ${FIRST_FREELANCE_MONTHS} months. Gives notice when the role needed changes, the runway shown falls below ${LET_GO_MONTHS} months, or the reference rule starts a search for a hire.`,
  },
  {
    id: 'validate_then_build_expand',
    team: CAREFUL_TEAM,
    extra: { expand: true },
    description: `Plays like validate_then_build, and from week ${EXPAND_FROM}, once its leads per outreach hour in its market over the last ${RATE_WEEKS} weeks of selling fall below ${DRY_SHARE * 100}% of its best ${RATE_WEEKS} weeks so far, opens the best ranked other market: interviews there until it has heard ${SECOND_INTERVIEWS}, builds what they ask for (up to ${SECOND_BUILD_HOURS} h a week itself), then sells there with half its outreach, and gives it up after ${SECOND_GIVE_UP_WEEKS} weeks of selling there without a customer. Its team rule serves the second market: a developer while its features need ${BACKLOG_HOURS} h, building them first, then a salesperson selling there.`,
  },
  {
    id: 'validate_then_build_never_move',
    team: CAREFUL_TEAM,
    extra: { office: 'never' },
    description:
      'Plays like validate_then_build but declines every office offer (plan 3, target O1): it stays where it started, desks or not.',
  },
  {
    id: 'validate_then_build_always_move',
    team: CAREFUL_TEAM,
    extra: { office: 'always' },
    description:
      'Plays like validate_then_build but accepts every office offer at once (plan 3, target O2), whether or not it needs the room or has the money.',
  },
  {
    id: 'validate_then_build_expand_solo',
    team: null,
    extra: { expand: true },
    description:
      'Plays like validate_then_build_expand, but never hires or rents anyone: the founder opens the second market alone.',
  },
  {
    id: 'validate_then_build_founder_chases',
    team: CAREFUL_TEAM,
    extra: { chaseBy: 'founder' },
    description:
      'Plays like validate_then_build, but the founder keeps chasing late invoices when someone is on the team, instead of handing it to them.',
  },
]

export const teamVariant = (id: string): Strategy => {
  const v = TEAM_VARIANTS.find((x) => x.id === id)
  const sit = SITUATION_VARIANTS.find((x) => x.id === id)
  if (!v && !sit) throw new Error(`Unknown team variant ${id}`)
  const behaviours: Behaviours = v
    ? { ...ALL_BEHAVIOURS, ...v.extra, team: v.team }
    : { ...ALL_BEHAVIOURS, team: null, situation: sit!.situation }
  return {
    id,
    description: (v ?? sit)!.description,
    modes: ['long'],
    create: (scenario) => validatingPlayer(scenario, 50, null, behaviours),
  }
}

/**
 * Target 20's situations, each played by a solo careful bot with one extra person in a fixed role:
 * a burst (the build, from week 3 until the features the market asks for have shipped) or steady
 * work (selling, from the first paying customer to the end), by a 20 h freelancer or a part time
 * hire. Both let go once the runway shown falls below three months.
 */
export const SITUATION_VARIANTS: { id: string; situation: Situation; description: string }[] = (
  [
    ['burst', 'freelancer'],
    ['burst', 'hire'],
    ['steady', 'freelancer'],
    ['steady', 'hire'],
  ] as const
).map(([kind, by]) => ({
  id: `validate_then_build_${kind}_${by}`,
  situation: { kind, by },
  description: `Plays like validate_then_build_solo, plus ${by === 'freelancer' ? `a ${FIRST_FREELANCE_HOURS} h freelance` : 'a part time (20 h)'} ${kind === 'burst' ? 'developer for the build, looked for in week 3 and kept until the features its market asks for have shipped' : `salesperson for selling, looked for once the business can carry a part time salesperson (a month makes money, cash and savings cover what they add to the loss for ${HIRE_RUNWAY_MONTHS} months, and ${HIRE_HORIZON_WEEKS} weeks are left once they would start) and kept to the end`}${by === 'hire' ? ', the best impression of the candidates' : ''}. Lets them go once the runway shown falls below ${LET_GO_MONTHS} months.`,
}))

/**
 * Part D's raising bots: the careful bot with its team rule and a raise rule. `bootstrap` is the
 * careful bot itself (`validate_then_build`), which never raises.
 */
export const FUNDING_VARIANTS: { id: string; raise: RaiseRule; description: string }[] = [
  {
    id: 'raise_on_traction',
    raise: { when: 'traction', update: 'proper' },
    description: `Plays like validate_then_build, and raises once it has traction: an angel round once monthly revenue covers the company's costs and grew in each of the last two months, with at least ${RAISE_RUNWAY_WEEKS} weeks of runway; a seed round once monthly revenue reaches the seed bar and grew in each of the last two months. While a round is open it pitches ${PITCH_HOURS} h a week, books a second look with every interested investor and accepts the first term sheet; a round that runs out of investors is stopped and tried again after ${RAISE_RETRY_WEEKS} weeks. With investors' money it hires while the money would last ${FUNDED_HIRE_MONTHS} months after the hire. Sends a proper update every month.`,
  },
  {
    id: 'raise_early',
    raise: { when: 'early', update: 'proper' },
    description:
      'Plays like raise_on_traction, but starts an angel round in week 3, on interviews and sign ups, starts again at once when a round runs out of investors, and starts a seed round as soon as the angel money is in.',
  },
  {
    id: 'raise_always',
    raise: { when: 'always', update: 'proper' },
    description:
      'Plays like raise_on_traction, but starts an angel round at its first paying customer, whether or not it needs the money.',
  },
  {
    id: 'raise_late',
    raise: { when: 'late', update: 'proper' },
    description: `Plays like validate_then_build, and starts an angel round only once the runway shown falls below ${LATE_RUNWAY_WEEKS} weeks; it keeps that round open to the end, as a founder who needs the money does.`,
  },
  {
    id: 'raise_on_traction_short_updates',
    raise: { when: 'traction', update: 'short' },
    description: 'Plays like raise_on_traction, but sends a short update every month.',
  },
  {
    id: 'raise_on_traction_no_updates',
    raise: { when: 'traction', update: 'never' },
    description: 'Plays like raise_on_traction, but never sends an update.',
  },
]

export const fundingVariant = (id: string): Strategy => {
  const v = FUNDING_VARIANTS.find((x) => x.id === id)
  if (!v) throw new Error(`Unknown funding variant ${id}`)
  return {
    id,
    description: v.description,
    modes: ['long'],
    create: (scenario) =>
      validatingPlayer(scenario, 50, null, {
        ...ALL_BEHAVIOURS,
        team: CAREFUL_TEAM,
        raise: v.raise,
      }),
  }
}

/** The switchable behaviours, for leave-one-out runs. */
export const BEHAVIOUR_NAMES = ['inbox', 'chase', 'landing', 'books', 'followUps'] as const
export type BehaviourName = (typeof BEHAVIOUR_NAMES)[number]

/** A variant of a base strategy with some behaviours switched off, for the report. */
export function withoutBehaviours(
  base: { id: string; hire: HireRule },
  off: readonly BehaviourName[],
): Strategy {
  const behaviours: Behaviours = { ...ALL_BEHAVIOURS, hire: base.hire }
  for (const name of off) {
    if (name === 'inbox') behaviours.inbox = 'none'
    else behaviours[name] = false
  }
  return {
    id: `${base.id} -${off.join(' -')}`,
    description: `${base.id} without ${off.join(', ')}.`,
    create: (scenario) => validatingPlayer(scenario, 50, null, behaviours),
  }
}

export const presaleMax: Strategy = {
  id: 'presale_max',
  description:
    'Plays like validate_then_build, but pitches every pre-sale batch allowed: three in every market it has not dropped, from week 2, as hours allow. Ranks markets by deposits as well as interviews.',
  create: (scenario) =>
    validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, presales: 'max' }),
}

/** validate_then_build that answers one event the same way every time, for the event table. */
export function forcedAnswer(eventId: string, choiceId: string): Strategy {
  return {
    id: `validate_then_build ${eventId}:${choiceId}`,
    description: `validate_then_build, always answering ${eventId} with ${choiceId}.`,
    create: (scenario) =>
      validatingPlayer(scenario, 50, null, {
        ...ALL_BEHAVIOURS,
        forced: { eventId, choiceId },
      }),
  }
}

/** validate_then_build with another inbox policy, for the inbox comparison in the report. */
export function withInbox(inbox: InboxPolicy, skipYear2 = false): Strategy {
  return {
    id: `validate_then_build inbox:${inbox}${skipYear2 ? ' -year2' : ''}`,
    description: `validate_then_build with the ${inbox} inbox policy${skipYear2 ? ', leaving every second year event to its default' : ''}.`,
    create: (scenario) =>
      validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, inbox, skipYear2 }),
  }
}

/** Events of a long mode scenario that its 60 week game does not have: the second year's. */
export function year2EventIds(scenario: Scenario): Set<string> {
  if (scenario.mode !== 'long') return new Set()
  const standard = new Set(loadScenario(scenario.id as ScenarioId).events.map((e) => e.id))
  return new Set(scenario.events.map((e) => e.id).filter((id) => !standard.has(id)))
}

/**
 * Steps of a fifth of the price, judged on 2 trials that said yes or no over the price. With two
 * or more budget quotes in its market it starts at 0.9 times their average and stays between 0.75
 * and 1.05 times it. Starts of 0.8 to 1.0 and bands up to 1.1 all lay within about a point
 * (Phase 8, 10,000 seeds).
 */
export const PRICE_RULE: SearchRule = {
  stepShare: 0.2,
  window: 2,
  tooMany: 0.5,
  hints: { minHints: 2, start: 0.9, low: 0.75, high: 1.05 },
}

export const priceAware: Strategy = {
  id: 'price_aware',
  description:
    'Plays like validate_then_build and searches for its price from what it sees in its own market. With two or more budget quotes from interviews there, it starts at 0.9 times their average and stays between 0.75 and 1.05 times it. After 2 trials there that said yes or no over the price, it raises the price by a fifth if nobody said no over the price, keeps it if a few did, and lowers it by a step if half did or a customer there left over the price. A price it lowered from is tried again only after two clean windows below it.',
  create: (scenario) => validatingPlayer(scenario, 50, () => new PriceSearch(PRICE_RULE)),
}

/** The recipe for comparison: a fifth up every 3 weeks until the first "too expensive". */
export const priceRecipe: Strategy = {
  id: 'price_recipe',
  description:
    'Plays like validate_then_build and raises the price by a fifth every 3 weeks until it sees its first "Too expensive" (a trial or a customer, any market), then goes back one step and never changes it again.',
  create: (scenario) => validatingPlayer(scenario, 50, () => new PriceRecipe(0.2, 3)),
}

/** validate_then_build at a fixed multiple of the default price, for target 17. */
export function fixedPrice(multiple: number): Strategy {
  return {
    id: `fixed_price x${multiple}`,
    description: `validate_then_build at ${multiple} times the default price from week 1.`,
    create: (scenario) => validatingPlayer(scenario, 50, () => new FixedPrice(multiple)),
  }
}

export const overworker: Strategy = {
  id: 'overworker',
  description: 'Plays like validate_then_build, but plans 65 h every week.',
  create: (scenario) => validatingPlayer(scenario, 65),
}

/** validate_then_build that rents a freelancer by `rule`: for target 19, never the reference. */
export function withFreelancer(rule: FreelanceRule, id?: string): Strategy {
  const name =
    id ??
    (rule.role === 'developer'
      ? `freelance_build ${rule.hours}h`
      : `freelance_sales ${rule.hours}h ${rule.weeks}w`)
  return {
    id: name,
    description:
      rule.role === 'developer'
        ? `Plays like validate_then_build, and books a freelance developer for ${rule.hours} h a week in week 2, when it starts building, to work on the wanted feature with the most hours left until they have all shipped (notice when next week is the last with work for them; at most ${MAX_FREELANCE_WEEKS} weeks).`
        : `Plays like validate_then_build, and rents a freelance salesperson for ${rule.hours} h a week from its first paying customer, for ${rule.weeks} weeks of outreach in its market on its best channel.`,
    create: (scenario) =>
      validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, freelance: rule }),
  }
}

/**
 * The energy check of target 19: validate_then_build planning `budget` hours a week (50 is the
 * careful bot itself, 65 the overworker), which below `below` energy plans 10 h fewer and, with
 * `rent`, books a 10 h freelancer for them until energy recovers. Without `below`, the plain bot.
 */
export function tiredFounder(
  budget: number,
  below: number | null,
  rent: boolean,
  id: string,
): Strategy {
  const behaviours: Behaviours =
    below === null
      ? ALL_BEHAVIOURS
      : { ...ALL_BEHAVIOURS, tiredFreelance: { below, hours: 10, rent } }
  return {
    id,
    description:
      below === null
        ? `Plays like validate_then_build, planning ${budget} h a week.`
        : `Plays like validate_then_build, planning ${budget} h a week; below ${below} energy it plans 10 h fewer${rent ? ' and books a 10 h freelancer for that work (developer while wanted features are unbuilt, else salesperson)' : ''}, until energy is back at the tired mark.`,
    create: (scenario) => validatingPlayer(scenario, budget, null, behaviours),
  }
}
