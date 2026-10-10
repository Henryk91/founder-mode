import type { Scenario, ScenarioId } from '@founder-mode/content'
import type { MessageView, PlayerView, WeekPlan } from '@founder-mode/engine'
import { PriceSearch, type PricingRule } from '../pricing'
import { botScenario } from '../scenarios'
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
/** Pre-sale batches a careful player runs in its chosen market, and the batches that refute it. */
const MAX_PRESALE_BATCHES = 2
/** How much the landing page sign up rate, above or below the bar, counts next to interviews. */
const LANDING_WEIGHT = 4
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
const shipped = (v: PlayerView) => v.product.features.filter((f) => f.shipped).length
/** The lead a message is from, by its name, which no two leads share. */
const senderLead = (v: PlayerView, m: MessageView) => v.leads.find((l) => l.name === m.fromName)
const senderSilent = (v: PlayerView, m: MessageView) => senderLead(v, m)?.silent === true
const senderOverdue = (v: PlayerView, m: MessageView) =>
  v.invoices.some((i) => i.customerName === m.fromName && i.status === 'overdue')
/** Cash below which a careful founder spends hours instead of money. */
const TIGHT_CASH_CENTS = 600_000
const tight = (v: PlayerView) => v.company.cashCents < TIGHT_CASH_CENTS

type ReaderRule = string | ((view: PlayerView, message: MessageView) => string)

/**
 * What a careful reader answers, per kind of message. A function reads the situation the message
 * hints at: the pipeline, the sender, energy, cash, bugs. Messages not listed take their default.
 * Shared events have one answer in every scenario; each scenario adds its own events.
 */
const SHARED_READER: Record<string, ReaderRule> = {
  // validation
  startup_meetup: 'skip',
  visitor_list: 'pass',
  podcast_invite: (v) => (thin(v) ? 'record' : 'decline'),
  // sales
  discount_demand: 'hold',
  slow_lead: 'wait',
  sales_coach: 'decline',
  chamber_breakfast: (v) => (thin(v) ? 'go' : 'skip'),
  seven_questions: (v, m) => (senderSilent(v, m) ? 'answer' : 'later'),
  suspicious_price: (v, m) => (senderSilent(v, m) ? 'explain' : 'ignore'),
  trial_extension: (v, m) => (senderSilent(v, m) ? 'extend' : 'refuse'),
  referral_reward: (v) => (thin(v) ? 'voucher' : 'thanks'),
  pilot_request: (v, m) => (senderSilent(v, m) ? 'counter' : 'decline'),
  ballpark_call: (v, m) => (senderSilent(v, m) ? 'call' : 'demo'),
  business_park_flyers: (v) => (thin(v) ? 'flyers' : 'skip'),
  frequent_emails: 'back_off',
  letterhead_quote: 'pdf',
  // product
  security_notice: 'patch',
  hosting_pricing: 'migrate',
  missing_backups: 'backup',
  framework_upgrade: 'stay',
  bounty_hunter: (v) => (tight(v) ? 'fix' : 'pay'),
  bug_weekend: (v) => (v.customers.length >= 1 ? 'sprint' : 'carry_on'),
  unused_feature: 'keep',
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
}

const SCENARIO_READER: Record<ScenarioId, Record<string, ReaderRule>> = {
  zollstock: {},
  kantino: {
    // validation
    survey_offer: 'pass',
    friend_of_friend: 'decline',
    student_thesis: 'decline',
    office_manager_forum: (v) => (thin(v) ? 'post' : 'skip'),
    lunch_diary: 'decline',
    university_pilot: (v) => (v.customers.length <= 1 ? 'pilot' : 'decline'),
    rival_customer: (v) => (thin(v) ? 'coffee' : 'skip'),
    focus_group: 'pass',
    online_poll: 'ignore',
    tenant_survey: 'pass',
    catering_inquiry: 'decline',
    expert_interview: (v) => (v.customers.length === 0 ? 'meet' : 'decline'),
    // sales
    referral: 'follow_up',
    food_fair: 'pass',
    integration_question: 'honest',
    competitor_launch: 'ignore',
    supplier_form: (v, m) => (senderSilent(v, m) ? 'short' : 'leave'),
    colleague_intro: (v) => (openLeads(v) <= ROOMY_PIPELINE ? 'intro' : 'later'),
    coworking_open_day: (v) => (thin(v) ? 'go' : 'skip'),
    demo_no_show: (v, m) => (senderSilent(v, m) ? 'rebook' : 'drop'),
    reseller_offer: (v) => (shipped(v) >= 3 ? 'sign' : 'decline'),
    big_tender: 'decline',
    newsletter_paragraph: (v) => (thin(v) ? 'write' : 'skip'),
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
    founder_dinner: (v) => (thin(v) ? 'go' : 'skip'),
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
export function readInbox(view: PlayerView): { messageId: string; choiceId: string }[] {
  const answers: { messageId: string; choiceId: string }[] = []
  let used = view.committedHours
  const table = readerChoices(view.scenarioId)
  for (const m of view.inbox) {
    if (m.answeredChoiceId !== null) continue
    const rule = table[m.eventId]
    if (!rule) continue
    const id = typeof rule === 'function' ? rule(view, m) : rule
    const c = m.choices.find((x) => x.id === id)
    if (!c) continue
    if (used + c.hours + view.forcedHours > view.founder.maxHoursPerWeek) continue
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

/** The behaviours added in Phase 4 and after, each of which can be switched off to measure it. */
export type Behaviours = {
  inbox: InboxPolicy
  chase: boolean
  landing: boolean
  books: boolean
  followUps: boolean
  hire: HireRule
  /** `careful`: up to two batches in the chosen market. `max`: every batch allowed, everywhere. */
  presales: 'careful' | 'max'
  /** For the event table: always answer this event with this choice. */
  forced?: { eventId: string; choiceId: string }
}

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

/** Share of landing page visitors who signed up, over all tests in a market, or null. */
function landingRate(view: PlayerView, segmentId: string): number | null {
  const tests = view.segments.find((s) => s.id === segmentId)?.landingTests ?? []
  const visitors = tests.reduce((t, x) => t + x.visitors, 0)
  return visitors ? tests.reduce((t, x) => t + x.signups, 0) / visitors : null
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
      const landing = landingRate(view, s.id)
      const bar = botScenario(scenario.id).landingBar
      return { id: s.id, score: score(notes, landing, bar, presaleRate(view, s.id)) }
    })
    .sort((a, b) => b.score - a.score)
}

function score(
  notes: ReturnType<typeof segmentNotes>,
  landing: number | null,
  landingBar: number,
  presale: number | null,
): number {
  const fromLanding = landing === null ? 0 : LANDING_WEIGHT * (landing - landingBar)
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
          used + c.hours + view.forcedHours <= view.founder.maxHoursPerWeek &&
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
  pricing: PricingRule | null = null,
  behaviours: Behaviours = ALL_BEHAVIOURS,
): Player {
  const channels = new ChannelLog(scenario.sales)
  const prices = pricing ? new PriceSearch(pricing) : null
  let lastView: PlayerView | null = null
  const abandoned = new Set<string>()
  let target: string | null = null
  let sellingSince: number | null = null
  let lastPlan: WeekPlan | null = null
  const impressionOrder = scenario.team.impressions.map((i) => i.name)

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
    if (team.candidates.length > 0 && !team.member) {
      const best = [...team.candidates].sort(
        (x, y) => impressionOrder.indexOf(y.impression) - impressionOrder.indexOf(x.impression),
      )[0]
      if (best && behaviours.hire === 'covered') b.plan.hire = best.id
      if (best && behaviours.hire === 'payback' && market) {
        const start = view.week + view.costs.startWeeks
        const pay = bestPayback(view, unshipped, market, start, best.role, skillOf(best.impression))
        if (pay && pay.value > 0) b.plan.hire = best.id
      }
    } else if (team.canSearch && team.candidates.length === 0 && !team.hadHire) {
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
    if (team.member?.working && team.member.role === 'developer') {
      const next = unshipped[0] ?? view.product.features.find((f) => !f.shipped)?.id
      b.plan.teamBuild = next ?? null
    }
    if (team.member?.working && team.member.role === 'salesperson' && market) {
      b.plan.teamOutreach = {
        segmentId: market,
        channel: channels.choose(market, view.channels, 0),
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
        inbox: input.inbox.filter((m) => !forced || m.eventId !== forced.eventId),
      }
      // The books are their own behaviour: sorted by hand, or left to the default.
      const books = view.inbox.filter(
        (m) => m.eventId === BOOKS_EVENT && m.answeredChoiceId === null,
      )
      const answers = behaviours.books
        ? books.flatMap((m) => {
            const c = m.choices.find((x) => x.id === BOOKS_CHOICE)
            const fits =
              c && view.committedHours + view.forcedHours + c.hours <= view.founder.maxHoursPerWeek
            return fits ? [{ messageId: m.id, choiceId: BOOKS_CHOICE }] : []
          })
        : []
      if (behaviours.inbox === 'none') return [...forcedAnswers, ...answers]
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
        ...moves,
        ...(behaviours.inbox === 'reader'
          ? readInbox(rest)
          : behaviours.inbox === 'cheapest'
            ? cheapestInbox(rest)
            : answerInbox(rest)),
      ]
    },
    plan(view) {
      const b = new PlanBuilder(view, budget)
      const ids = view.segments.map((s) => s.id)
      lastView = view
      if (prices) b.price(prices.price(view))
      if (behaviours.chase) b.chase(CHASE_PER_WEEK)

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
        lastPlan = b.plan
        return b.plan
      }

      // A market where the landing page test drew too few sign ups is out.
      for (const s of view.segments) {
        const rate = landingRate(view, s.id)
        if (rate !== null && rate < botScenario(scenario.id).landingBar && !abandoned.has(s.id)) {
          abandoned.add(s.id)
          if (target === s.id) {
            target = null
            sellingSince = null
          }
        }
      }
      if (target === null) {
        target =
          ranked(view).find((r) => !abandoned.has(r.id))?.id ?? ranked(view)[0]?.id ?? ids[0]!
      }
      const notes = segmentNotes(scenario, view, target)
      const wanted = notes.mentions.map(([f]) => f)
      const unshipped = wanted.filter(
        (f) => !view.product.features.find((x) => x.id === f)?.shipped,
      )

      if (behaviours.hire !== 'none') staffing(b, view, wanted, target)
      b.demos(bookableLeads(view, target))
      b.demos(bookableLeads(view))
      if (behaviours.followUps) b.followUp(FOLLOW_UPS_PER_WEEK, target)
      if (view.product.bugs >= BUG_LIMIT) b.fixBugs(BUG_FIX_HOURS)
      // Keep listening until a few different features have come up.
      if (wanted.length < 3 && notes.interviews < 20) b.interviews(target, 3)
      for (const f of unshipped) b.build(f, MAX_BUILD_HOURS - (b.plan.build[f] ?? 0))

      // Pre-sales measure what prospects do. A careful player runs a second batch only when the
      // first found nobody; nobody in two batches and this market is out.
      const sales = view.segments.find((s) => s.id === target)?.presales ?? []
      const waiting = view.pendingExperiments.some(
        (e) => e.kind === 'presale' && e.segmentId === target,
      )
      const prospects = sales.reduce((t, x) => t + x.prospects, 0)
      const commits = sales.reduce((t, x) => t + x.commits, 0)
      if (behaviours.presales === 'max') {
        for (const r of ranked(view)) if (!abandoned.has(r.id)) while (b.presale(r.id));
      } else if (botScenario(scenario.id).presales === 'all') {
        if (!waiting) b.presale(target)
      } else if (sales.length < MAX_PRESALE_BATCHES && commits === 0 && !waiting) {
        b.presale(target)
      }
      const refuted =
        sales.length >= MAX_PRESALE_BATCHES &&
        prospects >= MAX_PRESALE_BATCHES * view.costs.presaleBatchSize &&
        commits === 0

      if (unshipped.length <= 1 && wanted.length > 0) {
        sellingSince ??= view.week
        const channel = channels.choose(target, view.channels, CHANNEL_TRIAL_HOURS, b.free)
        b.outreach(target, channel, b.free)
      }

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
      if (prices && lastView) prices.observe(lastView, report)
    },
  }
}

const DESCRIPTION =
  'Interviews every market in week 1. In week 2 pitches one pre-sale batch in the market its interviews favour, runs landing page tests in the top two, and starts the feature everyone asks for. Drops a market below 7% landing sign ups, or after two pre-sale batches without a deposit. Builds what its market asks for, sells on its best channel, follows up with up to six open leads there a week, and moves on after 12 weeks of selling without a customer. Sorts the books when the accountant asks, chases three late invoices a week, and reads the inbox (`readInbox`).'

export const validateThenBuild: Strategy = {
  id: 'validate_then_build',
  description: DESCRIPTION,
  describe: (scenario) =>
    DESCRIPTION.replace(
      'below 7% landing',
      `below ${Math.round(botScenario(scenario.id).landingBar * 1000) / 10}% landing`,
    ),
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
export function withInbox(inbox: InboxPolicy): Strategy {
  return {
    id: `validate_then_build inbox:${inbox}`,
    description: `validate_then_build with the ${inbox} inbox policy.`,
    create: (scenario) => validatingPlayer(scenario, 50, null, { ...ALL_BEHAVIOURS, inbox }),
  }
}

export const PRICE_RULE: PricingRule = { stepCents: 15_000, window: 4, threshold: 0.4 }

export const priceAware: Strategy = {
  id: 'price_aware',
  description:
    'Plays like validate_then_build and raises the price by 150 EUR after every 4 trial results at a price of which at least 40% became customers. Below that it goes back one step and stays.',
  create: (scenario) => validatingPlayer(scenario, 50, PRICE_RULE),
}

export const overworker: Strategy = {
  id: 'overworker',
  description: 'Plays like validate_then_build, but plans 65 h every week.',
  create: (scenario) => validatingPlayer(scenario, 65),
}
