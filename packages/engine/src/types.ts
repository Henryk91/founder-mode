import type { ChannelId, GameMode, MessageLook, Scenario, TeamRoleId } from '@founder-mode/content'

export type { GameMode, Scenario, TeamRoleId }

export type SegmentId = string
export type FeatureId = string
export type BucketId = string

/** sfc32 state, four signed 32 bit integers. */
export type RngState = { a: number; b: number; c: number; d: number }

export type { ChannelId }

export type EndingId =
  | 'bankrupt'
  | 'burnout'
  | 'shut_down'
  | 'still_searching'
  | 'sustainable'
  /** Long mode with funding: raised money, still burning it, with runway and growth (Part D). */
  | 'growing'
export type UiStage = 'scrappy' | 'organised'

// ---------------------------------------------------------------------------
// Game state. Never passed to the UI. See docs/schema.md.

export type GameState = {
  engineVersion: string
  /** The scenario this run was created from. Not part of the save file. */
  scenario: Scenario
  scenarioId: string
  seed: string
  rng: RngState
  /** Current week, starts at 1. Does not advance past the week in which the run ended. */
  week: number
  status: 'running' | 'ended'
  ending: EndingId | null

  founder: FounderState
  company: CompanyState

  /** Never leaves the engine. */
  hidden: {
    segments: Record<SegmentId, HiddenSegment>
    /** Landing page tests and pre-sales that have not reported yet. */
    experiments: PendingExperiment[]
    /**
     * Week in which each invoice will be paid, or null if it will not be paid on its own. Keyed
     * by invoice id.
     */
    payWeeks: Record<string, number | null>
    /** Invoices whose customer pays only once chased. Their pay week is null until then. */
    waitsForChase: string[]
    /** True skill of every candidate and team member. Keyed by candidate id. */
    teamSkills: Record<string, number>
    /** Funding (long mode): each investor's appetite, and the investors' confidence (0 to 1). */
    funding: HiddenFunding
    /** Tourism: each segment's demand at peak and season curve, and next week's true weather. */
    bookings: HiddenBookings | null
  }

  /** What the player has observed, per segment. */
  knowledge: Record<SegmentId, Evidence[]>
  product: ProductState
  /** Every lead ever found, oldest first. Lost and won leads stay for the record. */
  leads: Lead[]
  /** Every customer ever won, oldest first. Churned customers stay with `churnedWeek` set. */
  customers: Customer[]
  /** Every invoice ever issued, oldest first. */
  invoices: Invoice[]
  /** Every message ever received, oldest first. */
  inbox: Message[]
  /** Events that were drawn, for `once` and the cooldown. */
  drawnEvents: { eventId: string; week: number }[]
  team: TeamState
  /** Raising money (long mode, Part D). Empty in a run that never raises. */
  funding: FundingState
  /** Tourism (step 4): bookings of capacity that expires. Null in the subscription model. */
  bookings: BookingsState | null
  /** One entry per resolved week, oldest first. */
  ledger: WeekLedger[]
  /** Everything needed to rebuild this state from the seed. */
  actionLog: LoggedAction[]
  /** Random outcomes with their expected values, for the post-mortem. */
  eventLog: LoggedEvent[]
  /** Milestones reached, in the order they were reached. */
  milestones: ReachedMilestone[]
  /** Lasting effects that change the rules while they last, such as an office's. */
  modifiers: Modifier[]
}

/**
 * A lasting change to the rules: energy every week, and outreach response per channel. Added and
 * replaced by effects (an office move replaces the office's modifier), never by time.
 */
export type Modifier = {
  id: string
  source: 'office'
  energyPerWeek: number
  channelFactors: Partial<Record<ChannelId, number>>
  /** Leads that walk in each week from one market, at a mean rate. Null for none. */
  walkIns: { segmentId: SegmentId; leadsPerWeek: number } | null
}

export type ReachedMilestone = { id: string; week: number }

// ---------------------------------------------------------------------------
// Funding (Phase 9 Part D, long mode)

export type RoundId = 'angel' | 'seed'

/**
 * Where an investor stands: `interested` after a good first meeting (a second look may be booked),
 * `offered` with a term sheet open, `accepted` while closing, `closed` once the money arrived;
 * `passed` with a reason, `declined` by the founder, `lapsed` when a term sheet or the round ran
 * out, `withdrawn` in due diligence.
 */
export type InvestorStage =
  'interested' | 'passed' | 'offered' | 'declined' | 'lapsed' | 'accepted' | 'withdrawn' | 'closed'

/** Why an investor passed or withdrew, from what they can see. */
export type PassReason =
  'too_early' | 'runway' | 'churn' | 'focus' | 'growth_flat' | 'more_revenue' | 'revenue_dropped'

export type TermSheet = {
  amountCents: number
  preMoneyCents: number
  /** Share of the company after the money, in basis points (100 = 1%). */
  shareBp: number
  /** A growth milestone in the terms: monthly revenue by a week. */
  milestone: { monthlyCents: number; byWeek: number } | null
  /** Last week the term sheet can be accepted. */
  expiresWeek: number
  /** Monthly revenue when it was offered, for due diligence. */
  monthlyAtOffer: number
}

export type Investor = {
  id: string
  name: string
  round: RoundId
  metWeek: number
  stage: InvestorStage
  reason: PassReason | null
  terms: TermSheet | null
  /** Week the money arrives, once the terms are accepted. */
  closeWeek: number | null
}

/** A closed round on the cap table: the share it bought, of the company at that time. */
export type Stake = {
  investorId: string
  name: string
  round: RoundId
  amountCents: number
  shareBp: number
  week: number
}

export type FundingState = {
  /** The open round, or null. `next` is the next investor of the round's shuffled pool. */
  round: { id: RoundId; startWeek: number; pool: string[]; next: number } | null
  investors: Investor[]
  stakes: Stake[]
  /** The open growth milestone of the last terms, if any. */
  milestone: { monthlyCents: number; byWeek: number; status: 'open' | 'met' | 'missed' } | null
}

// ---------------------------------------------------------------------------
// Tourism: bookings (step 4, docs/tourism-proposal.md)

export type WeatherState = 'good' | 'mixed' | 'bad' | 'dangerous'
export type Policy = 'flexible' | 'strict'
export type BookingChannel = 'platform' | 'direct'
/**
 * `booked` until its week; then `served`, `cancelled` (the guest, refunded under a flexible
 * policy), `cancelled_paid` (the guest, kept under a strict one), or `company_cancelled` (no room
 * on the roster, or closed by the weather: refunded).
 */
export type BookingStatus =
  'booked' | 'served' | 'cancelled' | 'cancelled_paid' | 'company_cancelled'

export type Booking = {
  id: string
  segmentId: SegmentId
  productId: FeatureId
  /** The week it is for. */
  week: number
  units: number
  /** Price per unit agreed when booked. */
  priceCents: number
  channel: BookingChannel
  bookedWeek: number
  status: BookingStatus
}

export type BookingsState = {
  bookings: Booking[]
  /** Price per unit per segment, for peak and off season months. */
  prices: Record<SegmentId, { peak: number; off: number }>
  policy: Policy
  policySinceWeek: number
  platformListed: boolean
  /** Segments whose partners send guests. */
  partnerships: SegmentId[]
  /** Guests booked directly, per segment: they come back and tell others. */
  repeatGuests: Record<SegmentId, number>
  /**
   * Guests an inbox answer sent this week, per segment (step 5): they ask to book next turn like
   * any request, so they need a product with room. Absent in saves before step 5.
   */
  eventGuests?: Record<SegmentId, number>
  rating: number | null
  reviews: number
  /** This week's weather once it happened, and the forecast shown for next week. */
  weather: WeatherState | null
  forecast: WeatherState
  /** Requests turned away for lack of room, per week (the last 12 weeks). */
  turnedAway: { week: number; segmentId: SegmentId; units: number }[]
}

export type HiddenBookings = {
  base: Record<SegmentId, number>
  /** Twelve monthly multipliers per segment, the drawn season curve. */
  season: Record<SegmentId, number[]>
  /** Next week's true weather. */
  nextWeather: WeatherState
}

/**
 * The bookings part of a week's plan: shifts per staff role (the founder's own shifts apart),
 * new prices, the cancellation policy, the platform listing, new partnerships, and outreach.
 */
export type BookingsPlan = {
  shifts: Record<string, number>
  founderShifts: Record<string, number>
  prices: Record<SegmentId, { peak: number; off: number }>
  policy: Policy | null
  platform: boolean | null
  partnerships: SegmentId[]
  outreach: Record<SegmentId, number>
}

export type HiddenFunding = {
  /** Score each investor needs, keyed by investor id. */
  appetite: Record<string, number>
  confidence: number
}

/** A milestone with its name, for the view and the post-mortem. */
export type MilestoneView = { id: string; name: string; week: number }

/**
 * The next milestone on the progress bar: how far along the run is. `unit` says how to read the
 * numbers: a count, money in cents per month, or weeks.
 */
export type NextMilestoneView = {
  id: string
  name: string
  unit: 'count' | 'cents' | 'weeks'
  current: number
  target: number
}

export type FounderState = {
  baseHoursPerWeek: number
  maxHoursPerWeek: number
  energy: number
  /** Weeks in a row that ended with energy at 0. Burnout at scenario burnoutWeeks. */
  weeksAtZeroEnergy: number
  savingsCents: number
  livingCostCentsPerWeek: number
  skills: { interviewing: number; selling: number }
  /** Hours already taken out of the coming week by penalties and events. */
  forcedHours: number
}

export type FixedCost = { id: string; name: string; monthlyCents: number }

export type CompanyState = {
  cashCents: number
  priceCentsPerMonth: number
  fixedCosts: FixedCost[]
  uiStage: UiStage
  /** Id of the scenario office stage the company works from. */
  officeStage: string
}

export type FeatureProgress = {
  id: FeatureId
  progressHours: number
  /** Week in which the feature shipped, or null while it is still being built. */
  shippedWeek: number | null
}

export type ProductState = {
  features: FeatureProgress[]
  /** startQuality - qualityPerBug * bugs, never below 0. */
  quality: number
  bugs: number
  /** Bug fixing hours not yet enough for a whole bug. */
  fixProgressHours: number
}

/** `committed`: paid a deposit in a pre-sale, waiting for the product. */
export type LeadStage = 'lead' | 'demo' | 'trial' | 'committed' | 'paying' | 'lost'

/**
 * How a lead was found: outreach, a landing page sign up, an inbox message, the salesperson, a
 * pre-sale, walking in at the office, or a paying customer's recommendation.
 */
export type LeadSource =
  'outreach' | 'landing' | 'inbox' | 'team' | 'presale' | 'walk_in' | 'referral' | 'freelancer'

/** Observable facts only. */
export type Lead = {
  id: string
  name: string
  segmentId: SegmentId
  stage: LeadStage
  source: LeadSource
  /** For walk-ins: the office stage the lead walked in at. */
  walkInFrom?: string
  /** The outreach channel that found the lead, for outreach by the founder or the salesperson. */
  channel?: ChannelId
  /** For referrals: the id of the customer who recommended the company. */
  referredBy?: string
  /** For leads a team member found: that member's id. */
  foundBy?: string
  stageSinceWeek: number
  lastContactWeek: number
  /** Week in which the lead stopped answering, or null. Silent leads cannot progress. */
  silentSinceWeek: number | null
  lostReason: LostReason | null
  /** The deposit a committed prospect paid, one month at the pitched price. */
  depositCents?: number
}

/** Why a lead was lost. `refunded`: a deposit was paid back because the product did not ship. */
/** `price`: the trial ended in a no that the lead put down to the price. */
export type LostReason = 'declined' | 'price' | 'silent' | 'refunded'

export type Customer = {
  id: string
  leadId: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  churnedWeek: number | null
  /**
   * Why the customer left, when known: `price` (they said so), or `stopped_paying` (an invoice
   * was written off, so their service stopped).
   */
  churnReason?: 'price' | 'stopped_paying'
  /** The monthly price agreed when the customer signed. Later price changes do not touch it. */
  priceCentsPerMonth: number
  /** Months already paid for, by a pre-sale deposit. These month ends send no invoice. */
  prepaidMonths?: number
}

export type HiddenSegment = {
  roleId: string
  size: number
  pain: number
  politeness: number
  wtpCents: number
  mustHave: FeatureId[]
  channelResponse: Record<ChannelId, number>
  paymentDelayDaysMean: number
  neverPaysShare: number
  waitsForChaseShare: number
}

export type InterviewEvidence = {
  kind: 'interview'
  week: number
  segmentId: SegmentId
  bucketId: BucketId
  quoteIndex: number
  /** A must have feature the interviewee asked for in their own words, if any. */
  mentionedFeatureId: FeatureId | null
  /** A budget quote (index into the segment's `budgetQuotes`) and the amount it names. */
  budget?: { quoteIndex: number; amountCents: number }
}

export type LandingEvidence = {
  kind: 'landing'
  /** The week the result came in. */
  week: number
  segmentId: SegmentId
  budgetCents: number
  visitors: number
  signups: number
}

export type PresaleEvidence = {
  kind: 'presale'
  /** The week the result came in. */
  week: number
  segmentId: SegmentId
  prospects: number
  commits: number
  /** The monthly price the prospects were asked to commit to. */
  priceCents: number
}

export type Evidence = InterviewEvidence | LandingEvidence | PresaleEvidence

/** A landing page test or pre-sale in progress. Holds the hidden chance, so it stays hidden. */
export type PendingExperiment = {
  kind: 'landing' | 'presale'
  segmentId: SegmentId
  startWeek: number
  resolveWeek: number
  /** Visitors or prospects. */
  trials: number
  /** Chance per visitor or prospect, fixed when the experiment starts. */
  p: number
  budgetCents: number
  priceCents: number
}

/** `paidWeek` and `writtenOffWeek` are null while the invoice is open. */
export type Invoice = {
  id: string
  customerId: string
  customerName: string
  segmentId: SegmentId
  amountCents: number
  issuedWeek: number
  dueWeek: number
  paidWeek: number | null
  writtenOffWeek: number | null
}

/**
 * `costCents` is what the choice certainly costs now (cash going out), `monthlyCostCents` what it
 * adds to the fixed costs. `possibleCostCents` is cash that may go out but not for sure (an effect
 * with a chance below 1 or a `when`), shown as a risk, never with its odds. Gains are never shown.
 */
export type MessageChoice = {
  id: string
  label: string
  hours: number
  costCents: number
  possibleCostCents: number
  monthlyCostCents: number
}

/**
 * - open: waiting for an answer
 * - answered: the player chose; hours count this week and effects land when the week ends
 * - resolved: the player's choice has taken effect
 * - expired: nobody answered, the default choice took effect
 */
export type MessageStatus = 'open' | 'answered' | 'resolved' | 'expired'

export type Message = {
  id: string
  eventId: string
  area: string
  /** Week in which the message arrived. */
  week: number
  /** Last week in which it can be answered. */
  expiresWeek: number
  fromRole: string
  fromName: string
  /** The customer or lead the message is about, if any. */
  targetId: string | null
  text: string
  choices: MessageChoice[]
  status: MessageStatus
  choiceId: string | null
}

/**
 * `partTime` (long mode, where a role offers both) marks a part time search, candidate or member;
 * it is left out for full time, and in the 60 week game, whose one kind of hire it does not touch.
 */
export type TeamSearch = { role: TeamRoleId; readyWeek: number; partTime?: true }
export type Candidate = {
  id: string
  name: string
  role: TeamRoleId
  /** Id of the impression label, true skill plus noise. */
  impressionId: string
  partTime?: true
}
export type TeamMember = {
  id: string
  name: string
  role: TeamRoleId
  partTime?: true
  offerWeek: number
  startWeek: number
  letGoWeek: number | null
}
/**
 * A freelancer booked by the week (Phase 9). Works from `startWeek`; once notice is given,
 * `endWeek` is the last week worked and billed.
 */
export type FreelanceBooking = {
  id: string
  name: string
  role: TeamRoleId
  hoursPerWeek: number
  bookedWeek: number
  startWeek: number
  endWeek: number | null
  /** A change of hours that applies from `week` on, or null. */
  nextHours: { week: number; hours: number } | null
  /** Hours of work delivered so far (build or outreach hours). */
  workedHours: number
}

export type TeamState = {
  search: TeamSearch | null
  candidates: Candidate[]
  /** At most one in the early MVP. */
  members: TeamMember[]
  /** Every freelancer booking, in order. At most one is booked at a time. */
  freelancers: FreelanceBooking[]
  /** Features a freelance developer has put hours into: they ship with extra bugs. */
  freelanceFeatures: FeatureId[]
  /** Bugs those features brought in when they shipped, for the post-mortem. */
  freelanceBugs: number
}

/** Money movements of one resolved week. All values in cents, outflows positive. */
export type WeekLedger = {
  week: number
  /** Invoices paid and pre-sale deposits received. Refunds of deposits are other costs. */
  revenueCents: number
  fixedCostsCents: number
  livingCostsCents: number
  /** Part of the living costs paid by the company because savings ran out. */
  founderDrawCents: number
  /** Savings moved into the company by the player. */
  transferCents: number
  /** Savings moved into the company automatically to cover negative cash. */
  autoTransferCents: number
  /** Ad budgets of landing page tests started this week. */
  adSpendCents: number
  /** The freelancer's bill for this week: a company cost, counted in the win test. */
  freelanceCents: number
  /** Late fees, severance, and costs of inbox choices. */
  otherCostsCents: number
  /** Money from inbox choices. */
  otherIncomeCents: number
  /**
   * Investment that arrived at a round's closing (Part D). Never revenue, never in the net change
   * that runway counts, never in the win test.
   */
  investmentCents: number
  /** Tourism: guests' payments on the day (net of commission), part of `revenueCents`. */
  bookingRevenueCents: number
  /** Tourism: shifts, unit costs and products' one-off costs, company costs in the win test. */
  bookingCostsCents: number
  cashEndCents: number
  savingsEndCents: number
  /** Monthly revenue of active customers at the end of the week, after churn. */
  monthlyRevenueCents: number
  /** Active customers at the end of the week, after churn. */
  customers: number
  /** Runway at the end of the week, null while money is not shrinking. */
  runwayWeeks: number | null
  /** Founder energy at the end of the week. */
  energyEnd: number
  /** The founder's hours this week by activity, inbox answers and lost hours under admin. */
  hours: HoursByActivity
}

export type Activity = 'learning' | 'building' | 'selling' | 'admin' | 'rest'
export type HoursByActivity = Record<Activity, number>

export type LoggedAction =
  | { type: 'endWeek'; week: number; plan: WeekPlan }
  | { type: 'respond'; week: number; messageId: string; choiceId: string }
  | { type: 'shutDown'; week: number }

export type LoggedEvent = InterviewEvent | ExperimentEvent | MoneyEvent | MessageEvent | OddsEvent

export type InterviewEvent = {
  kind: 'interview'
  week: number
  segmentId: SegmentId
  expected: number
  observed: number
}

/** A landing page test or pre-sale result next to what its chance predicted. */
export type ExperimentEvent = {
  kind: 'landing' | 'presale'
  week: number
  segmentId: SegmentId
  expected: number
  observed: number
}

export type MessageEvent = {
  kind: 'message'
  week: number
  eventId: string
  choiceId: string
  expired: boolean
}

export type MoneyEvent = { kind: MoneyMovementKind; week: number; amountCents: number }

/**
 * Chance outcomes of one kind in one week, for the post-mortem's luck section: how many tries,
 * how many successes the chances predicted (`expected`, a sum of chances) and how many happened.
 * - leads: leads found by outreach (one try per outreach line, expected is the mean count)
 * - lead_demo: open leads agreeing to a demo
 * - demo: demos that became trials
 * - trial: trials that became paying customers
 * - churn: customers who left at a month end
 * - never_pays: invoices whose customer will never pay them
 * - message: a cash effect of an inbox answer that depends on chance
 * `unitCents` is the money one success moves (invoice amount, cash effect), 0 when none.
 * Logging never draws from the PRNG, so it does not change any outcome.
 */
export type OddsEvent = {
  kind: 'odds'
  odds: OddsKind
  week: number
  segmentId: SegmentId | null
  /** The inbox event, for `message` odds. */
  eventId: string | null
  tries: number
  expected: number
  observed: number
  unitCents: number
}

export type OddsKind =
  | 'leads'
  | 'lead_demo'
  | 'demo'
  | 'trial'
  | 'churn'
  | 'never_pays'
  | 'message'
  | 'walk_ins'
  | 'referrals'

/**
 * Money moving between the founder and the company.
 * - savings_transfer: the player moved savings into the company
 * - auto_top_up: savings covered negative company cash automatically
 * - founder_draw: the company paid living costs because savings were empty
 */
export type MoneyMovementKind = 'savings_transfer' | 'auto_top_up' | 'founder_draw'

export type MoneyMovement = { kind: MoneyMovementKind; amountCents: number }

// ---------------------------------------------------------------------------
// Player input

export type WeekPlan = {
  /** Number of interviews per segment. */
  interviews: Record<SegmentId, number>
  /** Build hours per feature. */
  build: Record<FeatureId, number>
  /** Hours spent fixing bugs. */
  bugFixHours: number
  /** Outreach per segment: one channel and the hours spent on it. */
  outreach: Record<SegmentId, { channel: ChannelId; hours: number }>
  /** Ids of leads in the demo stage to hold a demo with this week. */
  demos: string[]
  restHours: number
  /** Personal savings to move into the company this week. */
  transferToCompanyCents: number
  /** New monthly price for customers who sign from this week on, or null to keep it. */
  priceCentsPerMonth: number | null
  /** Landing page tests: ad budget in cents per segment, 0 or missing for none. */
  landing: Record<SegmentId, number>
  /** Pre-sales: number of batches of prospects per segment. */
  presales: Record<SegmentId, number>
  /** Ids of open leads to follow up with this week. */
  followUps: string[]
  /** Ids of overdue invoices to chase. */
  chase: string[]
  /** Start looking for someone in this role. */
  searchRole: TeamRoleId | null
  /**
   * Look for a part time hire in that role (long mode, where the role offers both). Missing or
   * false: full time, or the role's one kind.
   */
  searchPartTime?: boolean
  /** Make an offer to this candidate. */
  hire: string | null
  /** Let this team member go (a member id), or null. */
  letGo: string | null
  /** The freelancer: booking, notice, hours, and what they work on this week. */
  freelance: FreelancePlan
  /**
   * What each working team member does this week, by member id: a developer builds a feature, a
   * salesperson does outreach after holding every demo they can. A member without a task, or
   * with a task that does not suit their role, does nothing.
   */
  teamTasks: Record<string, TeamTask>
  /** Raising money (long mode with funding). Missing means nothing this week. */
  funding?: FundingPlan
  /** Tourism: the roster, prices, policy and channels. Missing means no shifts and no changes. */
  bookings?: BookingsPlan
}

/**
 * Chasing and admin (Phase 9 C3): with `admin`, or as the task `admin` on its own, the member first
 * chases overdue invoices the founder does not, oldest first, `chaseHours` each, then does the rest
 * of the task with the hours left. A salesperson holds demos with any hours left either way.
 */
export type TeamTask =
  | { kind: 'build'; featureId: FeatureId; admin?: boolean }
  | { kind: 'outreach'; segmentId: SegmentId; channel: ChannelId; admin?: boolean }
  | { kind: 'admin' }

/**
 * Raising money (long mode). `start` opens a round; `pitchHours` bring first meetings; second
 * looks are booked by investor id; a term sheet is accepted or declined by investor id; `stop`
 * closes the round to new meetings; `update` answers the investors at a month end.
 */
export type FundingPlan = {
  start: RoundId | null
  pitchHours: number
  secondLooks: string[]
  accept: string | null
  decline: string[]
  stop: boolean
  update: 'proper' | 'short' | null
}

export type FreelancePlan = {
  /** Book a freelancer in this role for this many hours a week. They start next week. */
  book: { role: TeamRoleId; hoursPerWeek: number } | null
  /** New hours a week for the current booking, from next week. Null keeps them. */
  hoursPerWeek: number | null
  /** Give notice: the booking ends after the scenario's notice weeks. */
  end: boolean
  /** The feature a freelance developer works on. */
  build: FeatureId | null
  /** Where a freelance salesperson does outreach. */
  outreach: { segmentId: SegmentId; channel: ChannelId } | null
  /**
   * Chasing and admin: the freelancer first chases overdue invoices the founder and the team do
   * not, oldest first, then builds or does outreach with the hours left. Missing means false.
   */
  admin?: boolean
}

export type PlanIssue =
  | { code: 'game_over' }
  | { code: 'invalid_number'; field: string }
  | { code: 'unknown_segment'; segmentId: string }
  | { code: 'unknown_feature'; featureId: string }
  | { code: 'feature_shipped'; featureId: string }
  | { code: 'build_exceeds_remaining'; featureId: string; remainingHours: number }
  | { code: 'bug_fix_exceeds_bugs'; maxHours: number }
  | { code: 'invalid_channel'; segmentId: string }
  | { code: 'invalid_demo'; leadId: string }
  | { code: 'too_many_hours'; plannedHours: number; maxHours: number }
  | { code: 'transfer_exceeds_savings'; savingsCents: number }
  | { code: 'invalid_price' }
  | { code: 'invalid_follow_up'; leadId: string }
  | { code: 'invalid_budget'; segmentId: string }
  | { code: 'presale_cap'; segmentId: string; left: number }
  | { code: 'invalid_chase'; invoiceId: string }
  | { code: 'search_not_allowed' }
  | { code: 'part_time_not_offered' }
  | { code: 'invalid_hire'; candidateId: string }
  | { code: 'let_go_not_allowed' }
  | { code: 'invalid_team_work' }
  | { code: 'invalid_freelance' }
  | { code: 'invalid_funding' }
  | { code: 'invalid_bookings' }
  /** Long mode: the market has had every landing test allowed. */
  | { code: 'landing_limit'; segmentId: string }

// ---------------------------------------------------------------------------
// What the UI receives. Contains no hidden values.

export type PlayerView = {
  scenarioId: string
  scenarioName: string
  /** `standard` (60 weeks) or `long` (104 weeks). */
  mode: GameMode
  seed: string
  week: number
  maxWeeks: number
  status: 'running' | 'ended'
  ending: EndingId | null
  founder: {
    baseHoursPerWeek: number
    maxHoursPerWeek: number
    energy: number
    maxEnergy: number
    /** Below this energy things start to work less well, and below `lowEnergyBelow` much less. */
    tiredBelow: number
    /** Below this energy everything works less well. Scenario text, not a hidden value. */
    lowEnergyBelow: number
    /** Weeks in a row at 0 energy that end the run. */
    burnoutWeeks: number
    /** Weeks in a row that ended at 0 energy so far. */
    weeksAtZeroEnergy: number
    savingsCents: number
    livingCostCentsPerWeek: number
    /** Living costs over one game month (weeksPerMonth weeks). */
    livingCostCentsPerMonth: number
    /** The next scheduled change of living costs (long mode, week 53), or null. */
    nextLivingStep: { week: number; centsPerWeek: number } | null
  }
  company: {
    cashCents: number
    priceCentsPerMonth: number
    fixedCosts: FixedCost[]
    monthlyFixedCostsCents: number
    /** The freelancer's bill for a week at the hours booked from next week; 0 without one. */
    freelanceCentsPerWeek: number
    /**
     * Whole weeks until company cash plus personal savings reach zero at the recent net weekly
     * change. Null when that total is not shrinking.
     */
    runwayWeeks: number | null
    uiStage: UiStage
    /** Where the company works: an office stage of the scenario. */
    officeStage: { id: string; name: string }
    /** The next month end, this week included: fixed costs go out and invoices are sent. */
    nextMonthEndWeek: number
  }
  costs: {
    interviewHours: number
    demoHours: number
    fixHoursPerBug: number
    trialWeeks: number
    landingHours: number
    landingBudgetsCents: number[]
    landingVisitorCents: number
    landingWeeks: number
    presaleHoursPerBatch: number
    presaleBatchSize: number
    presaleMaxBatches: number
    presaleRefundWeeks: number
    followUpHours: number
    /** Outreach on one channel in one market works fully up to this many hours a week, on average over `saturationWeeks`. */
    saturationHours: number
    saturationWeeks: number
    presaleWeeks: number
    chaseHours: number
    searchHours: number
    searchWeeks: number
    startWeeks: number
    /** Weeks a freelancer keeps working (and billing) after notice. */
    freelanceNoticeWeeks: number
    /** People who may work at once, hires over the run, founder hours each takes a week. */
    teamMaxMembers: number
    teamMaxHires: number
    managementHoursPerMember: number
  }
  /** Hours already spent this week by answers to messages, and by earlier penalties. */
  committedHours: number
  forcedHours: number
  invoices: InvoiceView[]
  /** Sum of invoices that are issued and not yet paid or written off. */
  receivablesCents: number
  inbox: MessageView[]
  team: TeamView
  /** Raising money, in long mode with funding; null otherwise. */
  funding: FundingView | null
  /** Tourism: calendar, roster, prices, channels and reviews; null in the subscription model. */
  bookings: BookingsView | null
  /** Landing page tests and pre-sales still running. */
  pendingExperiments: PendingExperimentView[]
  guidance: GuidanceView
  channels: ChannelId[]
  product: ProductView
  leads: LeadView[]
  customers: CustomerView[]
  /** Customers won over the run, and of those the ones who left (churned or stopped paying). */
  customersWon: number
  customersLost: number
  /** Sum of the monthly prices of active customers. */
  monthlyRevenueCents: number
  segments: SegmentView[]
  /** Demos held so far (by anyone) and how many of them became trials. Observed, not odds. */
  funnel: { demosHeld: number; trialsFromDemos: number }
  milestones: {
    reached: MilestoneView[]
    /** The first milestone on the bar not reached yet, null when all are. */
    next: NextMilestoneView | null
  }
  history: {
    week: number
    cashCents: number
    savingsCents: number
    monthlyRevenueCents: number
    customers: number
    runwayWeeks: number | null
    /** Money from investors that arrived that week (Part D), never revenue. */
    investmentCents: number
  }[]
}

/** Onboarding text from the scenario. Placeholders: {name} plain, {name:eur} for cents. */
export type GuidanceView = {
  intro: IntroCardView[]
  /** Null after the first weeks, or when no rule applies. */
  founderNote: FounderNoteView | null
}

export type IntroCardView = { id: string; title: string; body: string }

export type FounderNoteView = {
  id: 'first_week' | 'no_evidence' | 'only_interviews' | 'built_unseen' | 'leads_only'
  template: string
  values: Record<string, number>
}

export type ProductView = {
  quality: number
  bugs: number
  /** Most bug fixing hours that still make sense this week. */
  fixableHours: number
  features: FeatureView[]
}

export type FeatureView = {
  id: FeatureId
  name: string
  buildHours: number
  progressHours: number
  remainingHours: number
  shipped: boolean
}

export type LeadView = {
  id: string
  name: string
  segmentId: SegmentId
  stage: LeadStage
  weeksInStage: number
  lastContactWeek: number
  silent: boolean
  lostReason: LostReason | null
  /** True when a demo can be held with this lead this week. */
  canBookDemo: boolean
  /** True when the lead is open and a follow up can be booked. */
  canFollowUp: boolean
  /** How the lead was found. */
  source: LeadSource
  /** For walk-ins: the name of the office stage they walked in at, else null. */
  walkInFrom: string | null
  /** For outreach by the founder or the salesperson: the channel that found the lead, else null. */
  channel: ChannelId | null
  /** For referrals: the name of the customer who recommended the company, else null. */
  referredBy: string | null
  /** For a lead a team member found: that member's id, else null. */
  foundBy: string | null
}

export type CustomerView = {
  id: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  priceCentsPerMonth: number
}

export type InvoiceStatus = 'open' | 'overdue' | 'paid' | 'written_off'

export type InvoiceView = {
  id: string
  customerName: string
  segmentId: SegmentId
  amountCents: number
  issuedWeek: number
  dueWeek: number
  status: InvoiceStatus
  /** Weeks past the due week for an overdue invoice, else 0. */
  overdueWeeks: number
  paidWeek: number | null
  canChase: boolean
}

export type MessageView = {
  id: string
  /** Which scenario event the message is, so the same kind of message can be recognised. */
  eventId: string
  week: number
  expiresWeek: number
  fromRole: string
  fromName: string
  /** Letter, sticky note or official letter, from the scenario event. */
  look: MessageLook
  text: string
  choices: MessageChoice[]
  /** The choice made this week, still to take effect when the week ends. */
  answeredChoiceId: string | null
}

export type CandidateView = {
  id: string
  name: string
  role: TeamRoleId
  impression: string
  /** A part time candidate (long mode), paid and working the role's part time terms. */
  partTime: boolean
}

export type MemberView = {
  id: string
  name: string
  role: TeamRoleId
  roleName: string
  monthlyCents: number
  weeklyHours: number
  partTime: boolean
  /** First working week. In the future while the new hire is still starting. */
  startWeek: number
  working: boolean
  letGoCostCents: number
  /** Founder hours this member takes every week they work. */
  managementHours: number
}

/** One week of the calendar for one product: units booked against what it can sell. */
export type CalendarCell = {
  week: number
  booked: number
  capacity: number
  lastYear: number | null
}

/** Tourism as the player sees it. No demand, no season curve, no true weather. */
export type BookingsView = {
  weekOfYear: number
  month: number
  peak: boolean
  weather: WeatherState | null
  forecast: WeatherState
  policy: Policy
  policyLocked: boolean
  platform: { name: string; commission: number; listed: boolean }
  partnerships: SegmentId[]
  partnershipHours: number
  outreachHoursFull: number
  rating: number | null
  reviews: number
  prices: Record<SegmentId, { peak: number; off: number }>
  segments: {
    id: SegmentId
    unit: 'person' | 'group' | 'cover' | 'night'
    invoiced: boolean
    repeatGuests: number
    turnedAwayLast4: number
  }[]
  products: {
    id: FeatureId
    name: string
    shipped: boolean
    capacity: number
    serves: SegmentId[]
    inSeason: boolean
    unitCostCents: number
    oneOffCents: number
    monthlyCents: number
  }[]
  roles: {
    id: string
    name: string
    centsPerShift: number
    units: Record<FeatureId, number>
    available: number
    founderHours: number | null
  }[]
  /** Next 12 weeks per product, this week first. */
  calendar: { productId: FeatureId; cells: CalendarCell[] }[]
  /** Bookings for this week per product, the units the roster must cover. */
  thisWeek: { productId: FeatureId; booked: number }[]
  /** Units booked for the four weeks after this one, every product. */
  bookedAhead: number
  revenueLast4Cents: number
}

/** A funding round type as the Raise section describes it: rules and the public bar. */
export type RoundView = {
  id: RoundId
  name: string
  barText: string
  prepHours: number
  pitchHoursPerMeeting: number
  secondLookHours: number
  termSheetWeeks: number
  closingWeeks: number
  dueDiligenceHours: number
  amountCents: { min: number; max: number }
  /** Investors of this kind not met yet in this run; a round needs at least one. */
  investorsLeft: number
}

export type InvestorView = {
  id: string
  name: string
  round: RoundId
  metWeek: number
  stage: InvestorStage
  reason: PassReason | null
  terms: TermSheet | null
  closeWeek: number | null
}

/** Raising money as the player sees it. The investors' confidence shows only as their mood. */
export type FundingView = {
  rounds: RoundView[]
  round: { id: RoundId; name: string; startWeek: number; investorsLeft: number } | null
  /** A round may be started: none is open and none is closing. */
  canStart: boolean
  investors: InvestorView[]
  /** Owners now: the founder first, then each investor, as shares in basis points. */
  capTable: {
    name: string
    round: RoundId | null
    shareBp: number
    amountCents: number
    week: number | null
  }[]
  founderShareBp: number
  raisedCents: number
  mood: 'worried' | 'patient' | 'pleased' | null
  milestone: FundingState['milestone']
  /** An investor update is due this week (a month end with investors on board). */
  updateDue: boolean
  updateHours: { proper: number; short: number }
  /** The company's value by the visible rule: a multiple of yearly revenue plus cash. */
  valueCents: number
  valueRevenueMultiple: number
}

/** The freelancer as the Plan tab shows them. Rules of the game, no hidden values. */
export type FreelanceView = {
  roles: { id: TeamRoleId; name: string; centsPerHour: number }[]
  hoursOptions: number[]
  /** Share of booked hours that become work. */
  outputShare: number
  /** Share of that in the first week of a booking. */
  onboardingFactor: number
  noticeWeeks: number
  extraBugsPerFeature: number
  /** True when nobody is booked from next week on. */
  canBook: boolean
  current: FreelancerView | null
}

export type FreelancerView = {
  id: string
  name: string
  role: TeamRoleId
  roleName: string
  hoursPerWeek: number
  centsPerHour: number
  centsPerWeek: number
  startWeek: number
  working: boolean
  /** Last week worked once notice was given, else null. */
  endWeek: number | null
  nextHours: { week: number; hours: number } | null
  /** Hours of work this week (fewer in the first week). */
  workHoursThisWeek: number
}

export type TeamView = {
  /** False while a search runs, or when no more people can be hired or added. */
  canSearch: boolean
  /** False when the team is full or every hire of the run is used. */
  canHire: boolean
  roles: {
    id: TeamRoleId
    name: string
    monthlyCents: number
    weeklyHours: number
    /** The same role part time, where it is offered beside full time (long mode), else null. */
    partTime: { monthlyCents: number; weeklyHours: number } | null
  }[]
  search: { role: TeamRoleId; readyWeek: number; partTime: boolean } | null
  candidates: CandidateView[]
  /** Everyone hired and not let go, in hiring order, working or still starting. */
  members: MemberView[]
  /** People who may work at once (1 in the 60 week game). */
  maxMembers: number
  /** Hires still allowed in this run (the 60 week game allows one in all). */
  hiresLeft: number
  freelance: FreelanceView
}

export type PendingExperimentView = {
  kind: 'landing' | 'presale'
  segmentId: SegmentId
  resolveWeek: number
}

export type LandingView = {
  week: number
  budgetCents: number
  visitors: number
  signups: number
}

export type PresaleView = { week: number; prospects: number; commits: number; priceCents: number }

export type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]
  landingTests: LandingView[]
  presales: PresaleView[]
  /** Leads of this segment that are not lost and not yet customers. */
  openLeads: number
  /** Pre-sale batches still allowed in this market, after the ones already run. */
  presaleBatchesLeft: number
  /** Landing page tests still allowed in this market (long mode), or null for no limit. */
  landingTestsLeft: number | null
  /** Outreach channel picked for this segment in the latest plan that had one, else null. */
  lastChannel: ChannelId | null
}

export type InterviewView = {
  week: number
  segmentId: SegmentId
  bucketId: BucketId
  bucketName: string
  quote: string
  mentionedFeature: { id: FeatureId; name: string; quote: string } | null
  /** What the interviewee said about money: the quote holds {amount}, rough and rounded. */
  budget: { quote: string; amountCents: number } | null
}

export type WeekReport = {
  week: number
  plannedHours: number
  energyBefore: number
  energyAfter: number
  interviews: InterviewView[]
  /** Notable things that happened this week, in order. More kinds arrive with later systems. */
  entries: ReportEntry[]
  ledger: WeekLedger
  ending: EndingId | null
  /** Milestones reached this week, in scenario order. */
  milestones: MilestoneView[]
  /** True in the one week the UI turned organised, so the results can say so once. */
  uiStageChanged: boolean
}

export type LeadChange =
  | 'wants_demo'
  | 'trial_started'
  | 'won'
  | 'declined'
  | 'declined_price'
  | 'went_silent'
  | 'lost_silent'
  | 'committed'
  | 'refunded'

export type ReportEntry =
  | MoneyMovement
  | { kind: 'revenue'; amountCents: number; customers: number }
  | { kind: 'invoices_issued'; amountCents: number; count: number }
  /** `serviceStopped`: this write off ended the customer (they stopped paying). */
  | { kind: 'invoice_written_off'; amountCents: number; name: string; serviceStopped: boolean }
  | { kind: 'ad_spend'; amountCents: number }
  | {
      kind: 'landing_result'
      segmentId: SegmentId
      visitors: number
      signups: number
      /** Sign ups that became open leads. */
      leads: number
    }
  | { kind: 'presale_result'; segmentId: SegmentId; prospects: number; commits: number }
  | { kind: 'candidates_ready'; role: TeamRoleId; count: number }
  | { kind: 'hire_started'; name: string; role: TeamRoleId }
  | { kind: 'member_let_go'; name: string; costCents: number }
  | { kind: 'team_output'; role: TeamRoleId; hours: number }
  /** Tourism (step 4). */
  | { kind: 'weather'; weather: WeatherState }
  | { kind: 'bookings_new'; segmentId: SegmentId; bookings: number; units: number }
  | { kind: 'turned_away'; segmentId: SegmentId; units: number }
  | { kind: 'guests_served'; units: number; revenueCents: number; commissionCents: number }
  /** Guests who cancelled: paid anyway under a strict policy (`kept`). */
  | { kind: 'bookings_cancelled'; units: number; kept: boolean }
  | { kind: 'company_cancelled'; units: number; reason: 'staff' | 'weather' }
  | { kind: 'shifts_paid'; shifts: number; amountCents: number }
  | { kind: 'review'; rating: number; reviews: number; added: number }
  /** Funding (Part D). */
  | { kind: 'round_started'; round: RoundId }
  | { kind: 'round_stopped'; round: RoundId }
  | { kind: 'investor_met'; name: string; interested: boolean; reason: PassReason | null }
  | { kind: 'second_look'; name: string; offered: boolean; reason: PassReason | null }
  | { kind: 'term_sheet'; name: string; amountCents: number; shareBp: number }
  | { kind: 'terms_accepted'; name: string; closeWeek: number }
  | { kind: 'terms_lapsed'; name: string }
  | { kind: 'terms_withdrawn'; name: string; reason: PassReason }
  | { kind: 'round_closed'; name: string; round: RoundId; amountCents: number; shareBp: number }
  | { kind: 'investor_update'; update: 'proper' | 'short' | 'none' }
  | { kind: 'funding_milestone'; met: boolean; monthlyCents: number }
  /** Overdue invoices the team and the freelancer chased on the founder's behalf this week. */
  | { kind: 'team_chased'; count: number }
  /** Living costs changed this week (long mode). */
  | { kind: 'living_costs_changed'; fromCents: number; toCents: number }
  | {
      kind: 'freelance_booked'
      name: string
      role: TeamRoleId
      hoursPerWeek: number
      startWeek: number
    }
  | { kind: 'freelance_hours'; name: string; hoursPerWeek: number; fromWeek: number }
  | { kind: 'freelance_notice'; name: string; lastWeek: number }
  | { kind: 'freelance_ended'; name: string }
  /** Hours of work a freelancer delivered; `onboarding` in their first, slower week. */
  | { kind: 'freelance_output'; role: TeamRoleId; hours: number; onboarding: boolean }
  | { kind: 'freelance_bill'; name: string; amountCents: number; hours: number }
  | { kind: 'message_resolved'; fromName: string; choiceLabel: string; expired: boolean }
  | { kind: 'cash_effect'; amountCents: number }
  | {
      kind: 'feature_shipped'
      featureId: FeatureId
      name: string
      bugsAdded: number
      /** Of those, bugs a freelance developer brought in. */
      freelanceBugs: number
    }
  | { kind: 'bugs_fixed'; count: number }
  | {
      kind: 'new_leads'
      segmentId: SegmentId
      channel: ChannelId
      count: number
      /** Some of the hours went beyond the channel's saturation and found fewer people. */
      wornOut: boolean
    }
  | { kind: 'lead_update'; change: LeadChange; leadId: string; name: string; segmentId: SegmentId }
  /** Leads that walked in at the office (`place` is the office stage's name). */
  | { kind: 'walk_in_leads'; segmentId: SegmentId; count: number; place: string }
  /** A paying customer (`from`) recommended the company to a new lead (`name`). */
  | { kind: 'referral_lead'; segmentId: SegmentId; leadId: string; name: string; from: string }
  | {
      kind: 'customer_churned'
      customerId: string
      name: string
      segmentId: SegmentId
      /** The customer said the price was why they left. */
      overPrice: boolean
    }

// ---------------------------------------------------------------------------
// Saves

export type SaveFile = {
  engineVersion: string
  scenarioId: string
  /** Fingerprint of the scenario's numbers and texts. Missing in saves made before 0.4.0. */
  scenarioHash?: string
  /** `long` for a long mode run; missing for the 60 week game, as in every older save. */
  mode?: 'long'
  seed: string
  actions: LoggedAction[]
}

/** Why a save cannot be continued. */
export type SaveProblem = 'engine_version' | 'scenario_id' | 'scenario_changed' | 'mode'

// ---------------------------------------------------------------------------
// Post-mortem. Built only after the run has ended; reveals hidden values on purpose.

/** Why the run ended, as one sentence. The UI words it from the id and the numbers. */
export type PostMortemCauseId =
  | 'bankrupt_no_customers'
  | 'bankrupt_hire'
  | 'bankrupt_churn'
  | 'bankrupt_below_costs'
  | 'burnout'
  | 'still_searching'
  | 'sustainable'
  | 'shut_down'
  /** Part D: the money ran out with a round open or closing, or after raising. */
  | 'bankrupt_while_raising'
  | 'bankrupt_after_raise'
  | 'growing'

export type PostMortemCause = {
  id: PostMortemCauseId
  week: number
  /** Highest monthly revenue of active customers in any week. */
  peakRevenueCents: number
  /** Monthly revenue at the end. */
  revenueCents: number
  /** Company costs plus the founder's living costs over one month, at the end. */
  monthlyCostsCents: number
  /** The same without the hire's salary. Equal to `monthlyCostsCents` without a hire. */
  monthlyCostsWithoutHireCents: number
  customersWon: number
  /** Customers who left (churn, events), not counting those who stopped paying. */
  customersLost: number
  /** Customers whose service stopped because an invoice was written off. */
  customersStoppedPaying: number
  /** Weeks with more hours than the founder's base week. */
  weeksOverBase: number
  /** Revenue at the end as a whole percentage of monthly costs. */
  coveredPercent: number
  /** First week in which monthly revenue covered all monthly costs, or null. */
  coveredWeek: number | null
  /** Runway when the run ended, for a shut down. */
  runwayWeeks: number | null
}

export type ChainKind =
  | 'savings_empty'
  | 'first_customer'
  | 'customer_won'
  | 'customer_lost'
  | 'customer_stopped_paying'
  | 'feature_shipped'
  | 'hire_started'
  | 'hire_let_go'
  | 'price_changed'
  | 'energy_low'
  | 'energy_zero'
  | 'invoice_written_off'
  | 'covers_all_costs'
  | 'lead_declined'
  | 'ending'

/** One dated step in the chain that led to the ending. Fields depend on the kind. */
export type ChainItem = {
  week: number
  kind: ChainKind
  name: string | null
  segmentId: SegmentId | null
  featureId: FeatureId | null
  /** Active customers after the step, for wins and losses. */
  customers: number | null
  /** Money of the step: price, invoice, monthly revenue, or cash at the ending. */
  cents: number | null
  /** The ending, for `ending`. */
  ending: EndingId | null
  /** For `customer_lost` and `lead_declined`: they said it was the price. */
  overPrice: boolean
}

export type MarketFeature = {
  featureId: FeatureId
  /** Interviews in which someone mentioned it unprompted. */
  mentions: number
  shippedWeek: number | null
}

/** One market: the hidden truth next to what the player's evidence suggested. */
export type MarketTruth = {
  segmentId: SegmentId
  roleId: string
  /** The interview bucket the true pain falls into. */
  painBucketId: BucketId
  interviews: number
  /** The bucket the interviews averaged, or null without interviews. */
  saidBucketId: BucketId | null
  /** Interviews in the top bucket. */
  topBucketCount: number
  landing: { tests: number; visitors: number; signups: number } | null
  presale: { batches: number; prospects: number; commits: number; priceCents: number } | null
  /** Willingness to pay, rounded to 10 EUR. */
  wtpCents: number
  customersWon: number
  /** Distinct prices customers of this market signed at, lowest first. */
  customerPricesCents: number[]
  /** Trials that ended in a no over the price, and customers who left over it. */
  priceNos: { trials: number; cancellations: number }
  /** Budget quotes heard in interviews and the average figure they named, or null without. */
  budgetHints: { count: number; meanCents: number } | null
  mustHave: MarketFeature[]
}

export type Misread =
  | {
      kind: 'interviews_high' | 'interviews_low'
      segmentId: SegmentId
      interviews: number
      saidBucketId: BucketId
      painBucketId: BucketId
      /** Polite answers explain the gap, or chance does. */
      cause: 'politeness' | 'chance'
      /** For chance: interviews in all that would likely have fixed it, null when already done. */
      interviewsNeeded: number | null
    }
  | {
      kind: 'experiment'
      experiment: 'landing' | 'presale'
      segmentId: SegmentId
      week: number
      /** Visitors or prospects. */
      size: number
      observed: number
      /** What that market would normally give, rounded. */
      normal: number
    }
  | {
      kind: 'went_against'
      /** The market the strongest evidence ranked first: the good one. */
      rankedFirstSegmentId: SegmentId
      evidence: 'presale' | 'landing' | 'interviews'
      focusSegmentId: SegmentId
      focusHours: number
    }

export type LuckKind = OddsKind | 'landing' | 'presale'

/** A group of chance outcomes against what was normal, and what the difference was worth. */
export type LuckItem = {
  kind: LuckKind
  segmentId: SegmentId | null
  eventId: string | null
  tries: number
  observed: number
  expected: number
  /** Effect in customers, positive when luck helped. */
  customers: number
  /** Effect in money, positive when luck helped. 0 when the item is not about money. */
  cents: number
  /** A test result that changed which market came out on top in its week. */
  changedChoice: boolean
}

export type SuggestionId =
  | 'compare_markets'
  | 'talk_more'
  | 'watch_energy'
  | 'listen_features'
  | 'check_price'
  | 'watch_churn'
  | 'hire_cost'
  | 'chase_invoices'
  | 'raise_price'
  | 'sooner'
  | 'sample_sizes'

/** What raising brought, for the post-mortem. Values by the visible rule, 0 when bankrupt. */
export type FundingEconomics = {
  roundsStarted: number
  investorsMet: number
  raisedCents: number
  stakes: Stake[]
  founderShareBp: number
  companyValueCents: number
  founderValueCents: number
  /** Hours spent raising: decks, pitching, second looks, updates. */
  hours: number
  /** Investors met before there was a paying customer, every one of whom passed as too early. */
  pitchedTooEarly: number
}

export type PostMortem = {
  scenarioId: string
  seed: string
  ending: EndingId
  week: number
  maxWeeks: number
  /** Content names for the ids below: markets, features and interview buckets. */
  names: {
    segments: Record<SegmentId, string>
    features: Record<FeatureId, string>
    buckets: Record<BucketId, string>
  }
  /**
   * Scenario text for the markets section. `weakLanding`: shown with every market that had a
   * landing test, when the scenario's landing signal is weak by design; null otherwise.
   */
  notes: { weakLanding: string | null }
  cause: PostMortemCause
  /** Milestones reached over the run, in the order they were reached. */
  milestones: MilestoneView[]
  /** Up to three earlier steps, then every step of the final week, then the ending. */
  chain: ChainItem[]
  /** Every matching suggestion, best first. Always ends with `sample_sizes`. */
  suggestions: SuggestionId[]
  markets: MarketTruth[]
  misreads: Misread[]
  hours: {
    total: number
    byActivity: HoursByActivity
    weeksOverBase: number
    baseHoursPerWeek: number
    /** The market most of the selling and building went to, or null. */
    focusSegmentId: SegmentId | null
    focusSellingHours: number
  }
  money: {
    savingsStartCents: number
    savingsEmptyWeek: number | null
    livingFromSavingsCents: number
    movedByYouCents: number
    movedAutomaticallyCents: number
    companyPaidYouCents: number
    customersPaidCents: number
    peakRevenueCents: number
    /** Every hire of the run, in hiring order. */
    hires: HireEconomicsView[]
    freelance: FreelanceEconomicsView | null
    /** Raising money (long mode): null when no round was ever started. */
    funding: FundingEconomics | null
  }
  /** Leads that walked in at an office, and the customers they became, per office and market. */
  walkIns: { place: string; segmentId: SegmentId; leads: number; customers: number }[]
  /**
   * Every lead and the customers it became, by how it was found: outreach per channel
   * (`outreach:<channel>`), the salesperson per channel (`team:<channel>`), or the source itself
   * (`landing`, `presale`, `inbox`, `walk_in`, `referral`). Most customers first; only sources
   * that found a lead.
   */
  sources: { key: string; leads: number; customers: number }[]
  luck: {
    /** At most four, most important first. */
    items: LuckItem[]
    /** All luck together, in customers. Positive when luck helped. */
    netCustomers: number
    /** Whether average luck would have turned this ending around. Null when money did not decide it. */
    averageWouldChange: boolean | null
  }
}

/** What freelancers cost over the run and what they delivered. Null when none was booked. */
export type FreelanceEconomicsView = {
  /** Every role booked, in order of first booking. */
  roles: TeamRoleId[]
  costCents: number
  weeks: number
  /** Hours booked and billed; `buildHours + outreachHours` of them found work. */
  bookedHours: number
  /** The worked hours at the founder's living costs per base hour, paid anyway. */
  ownHoursCents: number
  /** False when the run did not end sustainable. */
  paid: boolean
  buildHours: number
  outreachHours: number
  leadsFound: number
  customersGained: number
  /** Bugs freelance developers brought in on shipping. */
  extraBugs: number
}

/** `HireEconomics` from the team system, repeated here so the type has no import cycle. */
export type HireEconomicsView = {
  role: TeamRoleId
  costCents: number
  customersGained: number
  costPerCustomerCents: number | null
  lifetimeValueCents: number | null
}
