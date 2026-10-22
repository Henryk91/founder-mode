import type {
  ChannelId,
  ContractKind,
  GameMode,
  MessageLook,
  Scenario,
  TeamRoleId,
} from '@founder-mode/content'

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
  /** The bank called the loan after a second missed payment in a row (step 6). */
  | 'bank_called'
/**
 * `established` (plan 3, long modes): from the week money in has covered all costs for the
 * scenario's `establishedAt` months in a row, a move into its office stage completed, or (Kantino
 * long) a funding round closed.
 */
export type UiStage = 'scrappy' | 'organised' | 'established'

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
  /** The bank loan (step 6). Null in a scenario without one. */
  loan: LoanState | null
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
  /** Paid when booked (a deposit, step 7); the rest is due at the stay. Absent: none. */
  depositCents?: number
  /** Advance already returned following a venue restriction. */
  refundedCents?: number
  /** Plan 2: a voucher redeemed for this booking; it was paid when the voucher was sold. */
  voucherId?: string
  /** Plan 4: a trip guest who waited a week for a group already (absent otherwise). */
  waited?: true
  /** Plan 5: the indoor slot and visits paid through a membership or aggregator. */
  slotId?: string
  memberId?: string
  aggregatorUser?: number
}

/** Plan 2 step 1a: a voucher sold; a liability until it is redeemed. */
export type Voucher = {
  id: string
  segmentId: SegmentId
  soldWeek: number
  units: number
  /** What the buyer paid. */
  valueCents: number
  /** The week the guests came, or null while it is open. */
  redeemedWeek: number | null
}

/** Plan 2 step 1b: staff on a contract rather than shifts booked week by week. */
export type StaffContract = {
  id: string
  roleId: string
  kind: ContractKind
  name: string
  startWeek: number
  /** The last week worked and paid, once notice is given or a season ends; null while running. */
  endWeek: number | null
}

/** Plan 2 step 1d: a room under works, closed until its end week. */
export type RoomWorks = { startWeek: number; endWeek: number }

/** Why the bank said no, in the words the player sees. */
export type LoanRefusal =
  | 'own_money'
  | 'no_guests'
  | 'missed_payment'
  | 'too_many'
  /** Plan 2 step 2: more working capital than the bank's stated months of fixed costs. */
  | 'working_capital'

export type LoanTerms = {
  amountCents: number
  termMonths: number
  graceMonths: number
  /**
   * Plan 2 step 2, where the bank lends against a plan: the products it pays for (bought when
   * the money arrives), rooms to renovate, and working capital. The amount is their sum.
   */
  items?: FeatureId[]
  rooms?: number
  workingCapitalCents?: number
  /** Plan 3: an office stage on offer, its fit-out paid for at payout. */
  stage?: string
}

export type Loan = {
  id: string
  principalCents: number
  balanceCents: number
  rateBp: number
  termMonths: number
  graceMonths: number
  /** Week the money arrived. */
  startWeek: number
  /** Month ends passed since the money arrived, paid or missed. */
  months: number
  /** The fixed payment once the repayment-free months are over. */
  paymentCents: number
  interestPaidCents: number
  feesCents: number
  /** Missed payments in a row, and over the loan's life. */
  missedInRow: number
  missedTotal: number
  /** The week the first payment was missed, if one was. */
  firstMissedWeek?: number
  status: 'running' | 'repaid' | 'called'
  /** Plan 2 step 2: what the plan listed. */
  items?: FeatureId[]
  rooms?: number
  /** Plan 3: the office stage whose fit-out it paid for. */
  stage?: string
  workingCapitalCents?: number
}

export type LoanState = {
  /** Hours put into the business plan; full at `planHours` (half for a second try). */
  planHours: number
  planNeeded: number
  application: (LoanTerms & { decideWeek: number }) | null
  offer: (LoanTerms & { rateBp: number; paymentCents: number; week: number }) | null
  /** Accepted, paid out at the next month end. */
  accepted: (LoanTerms & { rateBp: number }) | null
  refusal: { reason: LoanRefusal; week: number } | null
  loans: Loan[]
  /** Plan 2 step 2: products and rooms a loan bought, not yet shipped or started. */
  bought?: FeatureId[]
  roomsBought?: number
}

/** The loan part of a week's plan. */
export type LoanPlan = {
  planHours: number
  apply: LoanTerms | null
  accept: boolean
  decline: boolean
  /** Repay this loan in full at the next month end. */
  repay: string | null
}

/** Bookings of one status, segment and channel added up: units, what they paid, the first week. */
export type BookingTotal = {
  status: BookingStatus
  segmentId: SegmentId
  channel: BookingChannel
  units: number
  grossCents: number
  firstWeek: number
}

export type BookingsState = {
  hostingReliefHours?: number
  leisure?: LeisureState
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
  /**
   * Finished bookings older than a year, folded into totals per status, segment and channel
   * (step 6): only the post-mortem and the counts read them.
   */
  archived?: BookingTotal[]
  rating: number | null
  reviews: number
  /** This week's weather once it happened, and the forecast shown for next week. */
  weather: WeatherState | null
  forecast: WeatherState
  /** Requests turned away for lack of room, per week (the last 12 weeks). */
  turnedAway: { week: number; segmentId: SegmentId; units: number }[]
  /** Plan 2 step 1a: vouchers sold. Absent before any was. */
  vouchers?: Voucher[]
  /** Plan 2 step 1b: contracts, running and ended. Absent before any was signed. */
  contracts?: StaffContract[]
  /** Plan 2 step 1c: units prepared per service product, kept from week to week. */
  prep?: Record<FeatureId, number>
  /** Plan 2 step 1c: food cost of everything thrown away over the run. */
  wasteCents?: number
  /** Plan 2 step 2: what each product earned over the run, net of commission and unit costs. */
  earned?: Record<FeatureId, number>
  /** Plan 2 step 1d: rooms renovated, and rooms under works. */
  renovated?: number
  works?: RoomWorks[]
  /** Plan 2 step 1d: a minimum stay of two nights in the minimum stay months. */
  minStay?: boolean
  /** Plan 4: the abroad mechanics, where the scenario has day conditions. */
  abroad?: AbroadState
  /** Plan 4: assets and how the company has them, where the scenario has assets. */
  assets?: Record<string, AssetState>
  /** Plan 4: weeks held for whole-boat bookings, where the scenario lets weeks be held. */
  held?: number[]
  /** Plan 4: the minimum to sail, in cabins (0 sails with any), and since when it holds. */
  minSail?: { min: number; move: boolean; sinceWeek: number }
  /** Tuning 1: each week cancelled below the minimum to sail, for the post-mortem. */
  cancelledWeeks?: CancelledWeek[]
}

/**
 * Tuning 1: a cruise week cancelled below the minimum to sail. `lostCents` is what its guests
 * would have paid; `savedCents` what sailing it would have cost (crew, food and fuel, the
 * owner's share, costs per guest); `costCents` what cancelling cost (refunds or moving guests).
 */
export type CancelledWeek = {
  week: number
  cabins: number
  lostCents: number
  savedCents: number
  costCents: number
}

/** Plan 4: how the company has an asset. */
export type AssetOption = 'none' | 'buy' | 'lease' | 'share'

/** Plan 4 (docs/abroad-mechanics.md section 4): one asset, owned, leased, shared or not had. */
export type AssetState = {
  option: AssetOption
  sinceWeek: number
  /** The week a lease began (its minimum term counts from here). */
  leaseFromWeek: number | null
  boughtWeek: number | null
  /** The last week a breakdown closes it; 0 when it never broke. */
  brokenUntil: number
  breakdowns: number
  /** Shared: the owner took units back this week. */
  takenBack: boolean
  /** Shared with a peak rule: calendar years (from 0) whose peak months the owner released. */
  peakReleased: number[]
  weeksUsed: number
  /** Everything spent on it over the run: fees, upkeep, crew, repairs, haul-outs (not the price). */
  costCents: number
}

/** Plan 4: a week of day conditions: per slot id, the state of each day, Monday first. */
export type ConditionsWeek = Record<string, string[]>

/** Plan 4: courses finished and graduates who booked again, in one year of the run. */
export type LadderYear = {
  /** Guests who finished a course. */
  students: number
  /** Graduates who booked their next step the week after, still on holiday. */
  sameStay: number
  /** Graduates who came back a year later, booking directly or through the platform. */
  returnedDirect: number
  returnedPlatform: number
}

/** Plan 4 (docs/abroad-mechanics.md): day conditions, courses, trips and the tender. */
export type AbroadState = {
  /** The forecast shown for the week being planned, day by day. */
  forecast: ConditionsWeek
  /** The conditions of the last week played; null before the first. */
  lastWeek: ConditionsWeek | null
  /** Slots per state per month of the year (key `1` to `12`), over the run. */
  byMonth: Record<string, Record<string, number>>
  /** Units each product lost to conditions over the run (refunded, or the trip did not run). */
  lost: Record<FeatureId, number>
  /** Units moved to another slot of the same week, to an alternative, or to next week. */
  moved: number
  /** Per run year (index 0 for weeks 1 to 52). */
  ladder: LadderYear[]
  /** Day trips: the policy (the smallest group a trip runs with; null: never). */
  trips?: {
    min: number | null
    sinceWeek: number
    run: number
    wasted: number
    guests: number
    costCents: number
  }
  /** The concession's tender: the answer given and whether the spot was kept. */
  tender?: { bid: 'higher' | 'same' | 'hotel'; kept: boolean; week: number }
}

/** Plan 4: graduates who will ask again a year later (hidden: the shares are). */
export type ReturnRequest = {
  askWeek: number
  targetWeek: number
  segmentId: SegmentId
  channel: BookingChannel
  units: number
  products: FeatureId[]
}

export type HiddenBookings = {
  leisure?: HiddenLeisure
  base: Record<SegmentId, number>
  /** Twelve monthly multipliers per segment, the drawn season curve. */
  season: Record<SegmentId, number[]>
  /** Next week's true weather. */
  nextWeather: WeatherState
  /** Plan 2 step 1a: the week each voucher's guests ask for a date, or null for never. */
  voucherWeeks?: Record<string, number | null>
  /** Plan 4: next week's true conditions, and graduates who will come back. */
  nextConditions?: ConditionsWeek
  returns?: ReturnRequest[]
}

/**
 * The bookings part of a week's plan: shifts per staff role (the founder's own shifts apart),
 * new prices, the cancellation policy, the platform listing, new partnerships, and outreach.
 */
export type BookingsPlan = {
  leisure?: LeisurePlan
  shifts: Record<string, number>
  founderShifts: Record<string, number>
  prices: Record<SegmentId, { peak: number; off: number }>
  policy: Policy | null
  platform: boolean | null
  partnerships: SegmentId[]
  outreach: Record<SegmentId, number>
  /** Plan 2 step 1a: trials started this week, with the segment where the player picks one. */
  trials?: { id: string; segmentId: SegmentId | null }[]
  /** Plan 2 step 1a: voucher batches offered per segment. */
  vouchers?: Record<SegmentId, number>
  /** Plan 2 step 1b: contracts to sign (a role and a kind), and contracts to end (ids). */
  hire?: { roleId: string; kind: ContractKind }[]
  endContracts?: string[]
  /** Plan 2 step 1c: units to prepare per service product, from this week on. */
  prep?: Record<FeatureId, number>
  /** Plan 2 step 1d: rooms whose works start this week; a minimum stay on or off. */
  renovate?: number
  minStay?: boolean | null
  /** Plan 4: a new trip policy: the smallest group a trip runs with, or null for never. */
  trips?: { min: number | null }
  /** Plan 4: weeks to hold for whole-boat bookings (on) or to release (off). */
  hold?: { week: number; on: boolean }[]
  /** Plan 4: a new minimum to sail, and whether guests of a cancelled week are moved. */
  minSail?: { min: number; move: boolean }
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
  /** Plan 3: moves, notice and the stages the company worked from. */
  office: OfficeState
}

/** Plan 3 (docs/office-stages.md): a move under way, from accepting an offer to moving in. */
export type OfficeMove = { stage: string; startWeek: number; readyWeek: number }

/** One stay at an office stage reached by an offer, for the post-mortem. */
export type OfficeStay = {
  stage: string
  /** The week the offer was accepted, and the week the move completed (null while moving). */
  acceptedWeek: number
  movedWeek: number | null
  /** The week the company left (notice ran out), or null. */
  leftWeek: number | null
  /** Paid when accepting (by the company or a loan), and the deposit back when leaving. */
  oneOffCents: number
  depositBackCents: number
  /** Monthly revenue (the last four weeks) the week the offer was accepted. */
  revenueBeforeCents: number
  /** Team members the week the offer was accepted. */
  teamBefore: number
}

export type OfficeState = {
  /** The week the company moved to its current stage (1 at the start). */
  sinceWeek: number
  move: OfficeMove | null
  /** Notice given: the stage drops by one at the end of this week. */
  notice: { endWeek: number } | null
  /** Stages whose one-off a loan paid for (bought at payout). */
  prepaid: string[]
  stays: OfficeStay[]
}

export type FeatureProgress = {
  id: FeatureId
  progressHours: number
  /** Week in which the feature shipped, or null while it is still being built. */
  shippedWeek: number | null
  /** Plan 4: a licence applied for, which ships in this week (absent otherwise). */
  readyWeek?: number
  /** A venue permit refused after its wait; it cannot be rebuilt on the same application. */
  refusedWeek?: number
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

/** Plan 2 step 1a: what a tourism trial heard from one segment. */
export type TrialEvidence = {
  kind: 'trial'
  week: number
  segmentId: SegmentId
  trialId: string
  people: number
  /** People who booked again, ordered again or asked for dates. */
  responses: number
  /** The segment's price per unit at the time. */
  priceCents: number
}

/** Plan 2 step 1a: vouchers offered to one segment. */
export type VoucherEvidence = {
  kind: 'voucher'
  week: number
  segmentId: SegmentId
  prospects: number
  sold: number
  /** What one voucher cost. */
  priceCents: number
}

export type Evidence =
  InterviewEvidence | LandingEvidence | PresaleEvidence | TrialEvidence | VoucherEvidence

/** A landing page test or pre-sale in progress. Holds the hidden chance, so it stays hidden. */
export type PendingExperiment = {
  kind: 'landing' | 'presale' | 'trial' | 'voucher'
  /** Plan 2: the tourism trial, for kind trial. */
  trialId?: string
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
  /** Plan 2: vouchers sold this week. Cash, but a liability: never revenue, never in runway. */
  voucherCents?: number
  /** Plan 2: what the vouchers redeemed this week were sold for, counted as earned in the win test. */
  voucherRedeemedCents?: number
  /**
   * The bank loan (step 6): money paid out (never revenue), and repayments, interest and fees
   * paid (outgoings in the net change and the win test). 0 without a loan.
   */
  loanInCents: number
  loanPrincipalCents: number
  loanInterestCents: number
  loanFeeCents: number
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
  kind: 'landing' | 'presale' | 'trial' | 'voucher'
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
  /** The bank loan (step 6). Missing means no change. */
  loan?: LoanPlan
  /** Plan 3: give notice on the office stage. Missing means no. */
  office?: { notice: boolean }
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
  | { code: 'invalid_loan' }
  /** Plan 3: notice cannot be given now (no stage to leave, a move or notice under way). */
  | { code: 'invalid_office' }
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
  /** The bank loan (step 6): null in a scenario without one. */
  loan: LoanView | null
  /** Plan 3: where the company works, moves and notice (every scenario). */
  office: OfficeView
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
    /** Plan 3: money received that week, and everything paid out (as the runway counts them). */
    inCents: number
    outCents: number
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
  /** Plan 4: a licence applied for and not yet granted: the week it arrives; null otherwise. */
  readyWeek: number | null
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

export type ContractOptionView = {
  kind: ContractKind
  centsPerWeek: number
  shifts: number
  /** Weeks paid after notice; null when it cannot be ended (seasonal). */
  noticeWeeks: number | null
  /** Months it runs in; null for all year. */
  months: number[] | null
  max: number
  /** Such contracts running now in this role. */
  running: number
}

export type ContractView = {
  id: string
  roleId: string
  kind: ContractKind
  name: string
  startWeek: number
  endWeek: number | null
  /** Works this week (a seasonal contract waits for its months). */
  working: boolean
  centsPerWeek: number
  shifts: number
  canEnd: boolean
}

export type TrialOptionView = {
  id: string
  name: string
  hours: number
  cents: number
  weeks: number
  people: number
  /** The player picks one of these segments; otherwise it reaches them all, mostly the first. */
  choose: boolean
  segments: SegmentId[]
  paid: boolean
  /** Runs left: per segment where the player picks one, else one number under the key ''. */
  left: Record<string, number>
  /** False once the product it comes before has opened. */
  open: boolean
}

export type VouchersView = {
  hoursPerBatch: number
  batchSize: number
  units: number
  segments: { id: SegmentId; batchesLeft: number; priceCents: number }[]
  sold: number
  redeemed: number
  /** Sold and not yet redeemed: guests still owed, and what they paid. */
  openCount: number
  openUnits: number
  openValueCents: number
}

export type RenovationView = {
  rooms: number
  renovated: number
  underWorks: number
  /** Works planned that have not ended yet, under works now or not. */
  inProgress: { startWeek: number; endWeek: number }[]
  centsPerRoom: number
  weeks: number
  atOnce: number
  mustHaveRooms: number
  unitsPerRoom: number
  /** Rooms that can start works this week. */
  canStart: number
}

/** Tourism as the player sees it. No demand, no season curve, no true weather. */
export type BookingsView = {
  leisure?: LeisureView
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
    /** Share of the price each unit costs on top (food cost, a delivery platform's cut). */
    unitCostShare: number
    oneOffCents: number
    monthlyCents: number
    /** Plan 4: the level a course reaches, the level a guest needs, a trip's group and days. */
    course: string | null
    needsLevel: string | null
    dayTrip: { perTrip: number; days: number; costCents: number } | null
    wholeWeek: boolean
    /** Plan 4: a unit costs the segment's price times this. */
    priceFactor: number
  }[]
  /** Plan 4: day conditions, courses, trips and the tender; null without day conditions. */
  abroad: AbroadView | null
  /** Plan 4: assets (a boat); empty without them. */
  assets: AssetView[]
  /** Plan 4: the cruise season, week by week, where weeks can be held; null otherwise. */
  cruise: CruiseView | null
  roles: {
    id: string
    name: string
    centsPerShift: number
    units: Record<FeatureId, number>
    available: number
    founderHours: number | null
    /** Plan 2 step 1c: kitchen roles cook, floor roles serve; `serve` does both. */
    kind: 'serve' | 'kitchen' | 'floor'
    /** Plan 2 step 1b: the contracts this role can be hired on. */
    contracts: ContractOptionView[]
  }[]
  /** Plan 2 step 1b: contracts signed, running or in notice; ended ones drop out. */
  contracts: ContractView[]
  /** Plan 2 step 1a: the scenario's trials. Empty where it has none. */
  trials: TrialOptionView[]
  /** Plan 2 step 1a: vouchers, where the scenario sells them. */
  vouchers: VouchersView | null
  /** Plan 2 step 3: founder hours this week's guests take (from last week's), before planning. */
  hostingHours: number
  hostingReliefHours?: number
  /** Plan 2 step 1c: units prepared per service product, or null to prepare what the roster can cook. */
  prep: { productId: FeatureId; units: number | null }[]
  /**
   * Plan 2 step 1c: last week per product, the guests who came (served, or sent away for want of
   * staff or food) and those served. Empty in the first week.
   */
  lastWeek: { productId: FeatureId; came: number; served: number }[]
  /** Plan 2 step 1d: rooms renovated one at a time, where the scenario has it. */
  renovation: RenovationView | null
  /** Plan 2 step 1d: the minimum stay, where the scenario has one. */
  minStay: { on: boolean; months: number[]; segments: SegmentId[]; nights: number } | null
  /** Next 12 weeks per product, this week first. */
  calendar: { productId: FeatureId; cells: CalendarCell[] }[]
  /** Bookings for this week per product, the units the roster must cover. */
  thisWeek: { productId: FeatureId; booked: number }[]
  /** Units booked for the four weeks after this one, every product. */
  bookedAhead: number
  revenueLast4Cents: number
  /**
   * Units served in each of the last five weeks played, oldest first, fewer at the start: guests,
   * covers or room nights, for the headline (tourism fixes).
   */
  servedByWeek: number[]
}

/** Plan 4: the cruise weeks of a gulet scenario. */
export type CruiseView = {
  /** Every week of the season ahead (up to 26), with what is sold in it. */
  weeks: {
    week: number
    held: boolean
    /** Sold to a whole-boat booking (a charter or a retreat). */
    chartered: boolean
    /** Cabins sold of `cabins` (cabin bookings only). */
    sold: number
    cabins: number
    /** The asset closes it (the owner's peak, a haul-out, a breakdown, a refit). */
    closed: boolean
  }[]
  minSail: {
    min: number
    move: boolean
    options: number[]
    locked: boolean
    weeksBefore: number
    moveCents: number
  } | null
  /** Themed weeks are on (friction halved). */
  themed: boolean
}

/** Plan 4: an asset as the player sees it, with the terms of each option the scenario has. */
export type AssetView = {
  id: string
  name: string
  option: AssetOption
  products: FeatureId[]
  /** The product whose purchase buys it. */
  buyProduct: FeatureId | null
  broken: boolean
  brokenUntil: number | null
  /** Owned: the next haul-out's first week, or null. */
  nextHaulOut: number | null
  /** Owned: what it would sell for now. */
  valueCents: number | null
  breakdowns: number
  weeksUsed: number
  costCents: number
  /** Leased: the last week of the minimum term. */
  leaseMinUntil: number | null
  /** Shared with a peak rule: whether this year's peak months are yours. */
  peakReleased: boolean | null
  terms: {
    buy: {
      priceCents: number
      upkeepMonthlyCents: number
      crewWeekCents: number
      haulOut: { month: number; weeks: number; cents: number } | null
      repairCents: number
    } | null
    lease: {
      seasonCents: number
      upfrontShare: number
      months: number[]
      minMonths: number
      crewWeekCents: number
    } | null
    share: {
      capacity: number
      unitCents: number
      revenueShare: number
      takeBack: { share: number; months: number[] } | null
      peakRule: {
        months: number[]
        shoulderMonths: number[]
        needWeeks: number
        byWeek: number
      } | null
    } | null
  }
}

/** Plan 4: the abroad mechanics as the player sees them. */
export type AbroadView = {
  states: { id: string; name: string }[]
  slots: { id: string; name: string }[]
  /** The forecast for this week, day by day per slot, and counted per state. */
  forecast: ConditionsWeek
  forecastCounts: Record<string, Record<string, number>>
  /** Last week as it was, day by day per slot; null before the first week. */
  lastWeek: ConditionsWeek | null
  /** The trip spot: its forecast and last week, day by day. */
  spot: { name: string; forecast: string[]; lastWeek: string[] | null } | null
  /** Per product that follows the conditions: the slots (days at the spot) it runs on this week. */
  runsOn: { productId: FeatureId; suitable: number; total: number; slot: string | null }[]
  /** Courses: this year of the run and the whole run. */
  ladderThisYear: LadderYear
  ladderTotal: LadderYear
  /** Guests moved and guests lost to the conditions over the run. */
  moved: number
  lost: number
  trips: {
    min: number | null
    locked: boolean
    most: number
    run: number
    wasted: number
    guests: number
    costCents: number
  } | null
  tender: { bid: 'higher' | 'same' | 'hotel'; kept: boolean } | null
  /** Plan 4: local costs rise by these factors from these weeks (shown ahead). */
  costSteps: { week: number; factor: number }[]
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

/** Plan 3: the Office card and the Plan's Office section. Only facts the player can see. */
export type OfficeView = {
  stageId: string
  name: string
  /** Its place in the scenario's list, from 1, and how many stages there are. */
  stage: number
  stages: number
  rentCents: number
  /** Desks here (the founder included) and people using them; null without a desk limit. */
  desks: number | null
  people: number
  /** Desks left, at most 99 (99 without a desk limit). */
  desksFree: number
  weeksAtStage: number
  /** 1 while a move or notice runs. */
  busy: number
  move: { name: string; readyWeek: number } | null
  notice: { endWeek: number; backTo: string; depositCents: number } | null
  canGiveNotice: boolean
  noticeWeeks: number | null
  /** Months in a row, up to the last closed one, whose money covered all costs (living too). */
  monthsCoveringAll: number
  /** The same for company costs only. */
  monthsProfitable: number
  /** Tourism: weeks of the last 8 with guests turned away (peak months only), and occupancy. */
  turnedAwayWeeks: number
  peakTurnedAwayWeeks: number
  occupancyPct: number
  /** Stages a loan paid for, by name: accepting their offer costs nothing more. */
  prepaid: string[]
}

/** Raising money as the player sees it. The investors' confidence shows only as their mood. */
export type LoanView = {
  bankName: string
  /** Honest bank-plan signal: months to bridge before the first useful season. */
  bridgeMonthsHint: number | null
  /**
   * Plan 2 step 2, where the bank lends against a plan: the products it may list (not shipped
   * or bought yet), rooms to renovate, and the most working capital it lends (its stated months
   * of fixed costs). Null where the founder names any amount.
   */
  plan: {
    items: { id: FeatureId; name: string; cents: number }[]
    rooms: { centsPerRoom: number; left: number } | null
    workingCapitalMonths: number
    workingCapitalMaxCents: number
    /** Plan 3: office stages on offer that a plan may list, at their one-off cost. */
    stages: { id: string; name: string; cents: number }[]
    /** Bought by a loan and not shipped or started yet. */
    bought: FeatureId[]
    roomsBought: number
  } | null
  planHours: number
  planNeeded: number
  meetingHours: number
  /** The bank's own money rule, as it states it. */
  ownShare: number
  ownMoneyCents: number
  minCents: number
  maxCents: number
  stepCents: number
  termMonths: number[]
  graceMonths: number[]
  /** After a refusal, the week the bank takes a new application. */
  canApplyFrom: number | null
  application: (LoanTerms & { decideWeek: number }) | null
  offer: (LoanTerms & { rateBp: number; paymentCents: number; week: number }) | null
  accepted: (LoanTerms & { rateBp: number }) | null
  refusal: { reason: LoanRefusal; week: number } | null
  loans: {
    id: string
    principalCents: number
    balanceCents: number
    rateBp: number
    nextPaymentCents: number
    monthsLeft: number
    freeMonthsLeft: number
    interestPaidCents: number
    missedInRow: number
    status: Loan['status']
  }[]
}

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
  kind: 'landing' | 'presale' | 'trial' | 'voucher'
  /** Plan 2: the tourism trial, for kind trial. */
  trialId?: string
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

/** Plan 2 step 1a: a tourism trial's result for one segment. */
export type TrialView = {
  week: number
  trialId: string
  people: number
  responses: number
  priceCents: number
}

/** Plan 2 step 1a: vouchers offered to one segment. */
export type VoucherView = { week: number; prospects: number; sold: number; priceCents: number }

export type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]
  landingTests: LandingView[]
  presales: PresaleView[]
  /** Plan 2, tourism only: trial results and voucher offers. */
  trials?: TrialView[]
  vouchers?: VoucherView[]
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
  | {
      kind: 'company_cancelled'
      units: number
      /** Plan 2: `sold_out` when the kitchen prepared too little, `works` for rooms under works. */
      reason: 'staff' | 'weather' | 'sold_out' | 'works' | 'conditions' | 'asset'
    }
  /** Plan 4: the week's day conditions, and bookings moved or cancelled for them. */
  | { kind: 'conditions'; days: ConditionsWeek }
  | {
      kind: 'conditions_moved'
      productId: FeatureId
      units: number
      to: 'slot' | 'alternative' | 'next_week'
    }
  | { kind: 'conditions_cancelled'; productId: FeatureId; units: number }
  /** Plan 4: day trips run this week, those the conditions wasted, and the guests served. */
  | {
      kind: 'trips'
      productId: FeatureId
      run: number
      wasted: number
      guests: number
      costCents: number
    }
  /** Plan 4: trips not run (below the policy's group, or never), the guests refunded. */
  | { kind: 'trips_cancelled'; productId: FeatureId; units: number }
  /** Plan 4: graduates of the week's courses, and those booking their next step. */
  | { kind: 'graduates'; units: number; sameStay: number }
  | { kind: 'graduates_returned'; units: number; direct: number }
  /** Plan 4: a licence applied for; it arrives in `readyWeek`. */
  | { kind: 'licence_applied'; featureId: FeatureId; name: string; readyWeek: number }
  | {
      kind: 'permit_refused'
      featureId: FeatureId
      name: string
      refundCents: number
      feeCents: number
    }
  /** Plan 4: local costs rose by a factor this week. */
  | { kind: 'costs_rose'; factor: number }
  /** Plan 4: the concession's tender decided. */
  | { kind: 'tender'; bid: 'higher' | 'same' | 'hotel'; kept: boolean }
  /** Plan 4: an asset's option changed (bought, leased, shared, given up), with what it cost now. */
  | { kind: 'asset_option'; assetId: string; option: AssetOption; costCents: number }
  /** Plan 4: an owned asset broke down until `untilWeek`; repairing it costs `repairCents`. */
  | { kind: 'asset_broke'; assetId: string; untilWeek: number; repairCents: number; booked: number }
  | { kind: 'asset_repaired'; assetId: string; costCents: number }
  | { kind: 'asset_haul_out'; assetId: string; weeks: number; costCents: number }
  | { kind: 'asset_taken_back'; assetId: string }
  /** Plan 4: a cruise week below the minimum to sail, cancelled three weeks out. */
  | { kind: 'cruise_cancelled'; week: number; cabins: number; moved: boolean; costCents: number }
  /** Plan 4: strangers on one boat did not get on this week. */
  | { kind: 'friction'; groups: number }
  | {
      kind: 'trial_result'
      trialId: string
      segmentId: SegmentId
      people: number
      responses: number
    }
  | {
      kind: 'voucher_result'
      segmentId: SegmentId
      prospects: number
      sold: number
      amountCents: number
    }
  | { kind: 'vouchers_redeemed'; vouchers: number; units: number; valueCents: number }
  | { kind: 'food_waste'; units: number; amountCents: number }
  | { kind: 'contract_signed'; roleId: string; contractKind: ContractKind; name: string }
  | { kind: 'contract_ended'; roleId: string; contractKind: ContractKind; name: string }
  | { kind: 'contracts_paid'; contracts: number; amountCents: number }
  | { kind: 'works_started'; rooms: number; amountCents: number }
  | { kind: 'works_done'; rooms: number; renovated: number }
  | { kind: 'shifts_paid'; shifts: number; amountCents: number }
  | { kind: 'review'; rating: number; reviews: number; added: number }
  /** The bank loan (step 6). */
  | { kind: 'loan_applied'; amountCents: number }
  | { kind: 'loan_refused'; reason: LoanRefusal }
  | { kind: 'loan_offer'; amountCents: number; rateBp: number; paymentCents: number }
  | { kind: 'loan_accepted'; amountCents: number }
  | { kind: 'loan_paid_out'; amountCents: number; name: string }
  | { kind: 'loan_payment'; amountCents: number; interestCents: number; balanceCents: number }
  | { kind: 'loan_missed'; amountCents: number; feeCents: number; inRow: number }
  | { kind: 'loan_repaid'; name: string }
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
  /** Plan 3: an office stage's offer accepted; the move completes in `readyWeek`. */
  | {
      kind: 'office_accepted'
      place: string
      costCents: number
      monthlyCents: number
      readyWeek: number
    }
  /** Plan 3: the company moved in (`stage` is its number, 1 to 5). */
  | { kind: 'office_moved'; place: string; stage: number }
  /** Plan 3: the company has grown into the established style (months covering all costs, stage 4, or a round). */
  | { kind: 'ui_established' }
  /** Plan 3: notice given on the stage; the company leaves at the end of `endWeek`. */
  | { kind: 'office_notice'; place: string; endWeek: number }
  /** Plan 3: notice ran out; the company is back at `backTo` with the deposit. */
  | { kind: 'office_left'; place: string; backTo: string; depositCents: number }
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
  /** Step 6: the bank called the loan after two missed payments in a row. */
  | 'bank_called'

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

/** A loan in the post-mortem: what it cost, what it paid for, and how it ended. */
/** Plan 3: one office stage in the post-mortem: when, what it cost, what changed. */
export type OfficeEconomics = {
  place: string
  stage: number
  acceptedWeek: number
  movedWeek: number | null
  leftWeek: number | null
  oneOffCents: number
  /** The one-off came from a bank loan's plan. */
  paidByLoan: boolean
  rentCents: number
  depositBackCents: number
  /** One-off plus rent less the deposit back. */
  totalCents: number
  /** Money received in the four weeks before accepting, and the last four weeks there. */
  revenueBeforeCents: number
  revenueAfterCents: number
  /** People on the team when accepting, and at the end of the stay. */
  teamBefore: number
  teamAfter: number
  /** Tourism: guests served while there; null elsewhere. */
  guests: number | null
}

export type LoanEconomics = {
  amountCents: number
  rateBp: number
  interestPaidCents: number
  feesCents: number
  balanceCents: number
  status: Loan['status']
  startWeek: number
  /** Products with a one-off cost shipped after the money arrived, by name. */
  paidFor: string[]
  /**
   * Plan 2 step 2: what the plan listed, each with its price and what it earned from its own
   * guests (net of commission and unit costs), or null for an item that serves nobody itself.
   */
  items?: {
    name: string
    cents: number
    earnedCents: number | null
    /** What it is: sells to guests itself, others need it first, a renovated room, or neither. */
    kind: 'earns' | 'base' | 'rooms' | 'other'
  }[]
  workingCapitalCents?: number
}

/** What the guests of a bookings run came to, from the bookings and the ledger. */
export type GuestsEconomics = {
  /** Per segment: units served and what they paid, net of commission. */
  bySegment: { segmentId: SegmentId; served: number; paidCents: number }[]
  /** Share of served units that came through the platform, 0 to 1. */
  platformShare: number
  commissionCents: number
  /** Units the company cancelled (roster or weather) and units guests cancelled. */
  companyCancelled: number
  guestCancelled: number
  /** Units turned away for lack of room in the last 12 weeks played. */
  turnedAwayRecent: number
  /** Staff shifts and costs per guest over the run. */
  bookingCostsCents: number
  rating: number | null
  reviews: number
  /**
   * Plan 2: vouchers sold and never redeemed by the end (a debt in guests still owed), and food
   * prepared and thrown away. Absent where the scenario has neither.
   */
  vouchers?: { sold: number; redeemed: number; openCount: number; openValueCents: number }
  wasteCents?: number
  /** Plan 2: contracts signed over the run, per kind. */
  contracts?: { permanent: number; part_time: number; seasonal: number }
  /** Plan 4: day conditions, the course ladder, trips and the tender. */
  abroad?: AbroadEconomics
  /** Tuning 1: weeks cancelled below the minimum to sail. Absent without a minimum to sail. */
  cancelledWeeks?: CancelledWeek[]
  /** Plan 4: each asset: how it was had, what it cost, its value at the start and the end. */
  assets?: AssetEconomics[]
}

export type AssetEconomics = {
  id: string
  name: string
  option: AssetOption
  boughtWeek: number | null
  /** Owned: the price paid, and what it would sell for at the end. */
  priceCents: number | null
  valueEndCents: number | null
  costCents: number
  weeksUsed: number
  breakdowns: number
}

/** Plan 4: the post-mortem's lines on the abroad mechanics. */
export type AbroadEconomics = {
  /** Slots per state in each month played, months in calendar order (1 to 12). */
  months: { month: number; slots: Record<string, number> }[]
  /** Units each product lost to the conditions, most first. */
  lost: { productId: FeatureId; units: number }[]
  moved: number
  /** Per year of the run. */
  ladder: LadderYear[]
  trips: { run: number; wasted: number; guests: number; costCents: number } | null
  tender: { bid: 'higher' | 'same' | 'hotel'; kept: boolean; week: number } | null
}

export type PostMortem = {
  leisure?: LeisureView
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
    /** The bank loans of the run (step 6), oldest first; empty without one. */
    loans: LoanEconomics[]
  }
  /** Plan 3: each office stage reached by an offer, oldest first. */
  office: OfficeEconomics[]
  /** Leads that walked in at an office, and the customers they became, per office and market. */
  walkIns: { place: string; segmentId: SegmentId; leads: number; customers: number }[]
  /**
   * Every lead and the customers it became, by how it was found: outreach per channel
   * (`outreach:<channel>`), the salesperson per channel (`team:<channel>`), or the source itself
   * (`landing`, `presale`, `inbox`, `walk_in`, `referral`). Most customers first; only sources
   * that found a lead.
   */
  sources: { key: string; leads: number; customers: number }[]
  /** Guests over the run (bookings scenarios only, step 5); null otherwise. */
  guests: GuestsEconomics | null
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

export type LeisureExtraTotals = { units: number; receiptsCents: number; costsCents: number }
export type LeisureNoiseState = {
  complaintWeeks: number[]
  restrictions: { fromWeek: number; untilWeek: number }[]
  lateEvents: number
  cancelledBookings: number
  releasedHolds: number
  refundsCents: number
  receiptsCents: number
  variableCents: number
  staffCents: number
  assetCents: number
  turnaroundCents: number
  setupCents: number
  setupPaid: FeatureId[]
}

/** Plan 5: independent of conditions; present only with bookings.leisure content. */
export type LeisureState = {
  instructorLoads?: { id: string; kind: 'founder' | 'contract'; name?: string; classes: number }[]
  foundingFollowing?: { invited: number; joined: number }
  permitRefunds?: Record<FeatureId, { week: number; cents: number }>
  noise?: LeisureNoiseState
  extras?: Record<FeatureId, LeisureExtraTotals>
  slotPrices?: Record<SegmentId, Record<string, { peak: number; off: number }>>
  salesSlots?: Record<SegmentId, string[]>
  openingWeek: number | null
  buildChoice: FeatureId[]
  instructorDepartures: { week: number; roleId: string; stopped: number; pending: number }[]
  members: LeisureMember[]
  offers: Record<FeatureId, { enabled: boolean; priceCents: number }>
  classCoverage?: Record<FeatureId, Record<string, number>>
  timetable: Record<FeatureId, Record<string, number>>
  settingHours: Record<FeatureId, number>
  freshness: Record<
    FeatureId,
    {
      value: number
      settingProgress: number
      localGroups: number
      refreshUntil: number | null
      served: number
      refreshes: number
      lastRefreshWeek: number | null
      openedWeek: number | null
      weeksTired: number
      closedWeeks: number
    }
  >
  buildPaid: FeatureId[]
  holdPolicy: 'free' | 'fee' | 'none'
  holds: LeisureHold[]
  aggregator: {
    slots: string[]
    joined: boolean
    leavingWeek: number | null
    checkins: number
    payoutCents: number
    cancellations: number
    users: { segmentId: SegmentId; month: number; visits: number }[]
  } | null
  weeks: LeisureWeek[]
}
export type LeisureMember = {
  billingWeek?: number
  id: string
  segmentId: SegmentId
  offerId: FeatureId
  joinedWeek: number
  termUntil: number
  noticeUntil: number | null
  endedWeek: number | null
  inactive: boolean
  priceCents: number
  owedVisits: number | null
  owedCents?: number
  expiresWeek: number | null
  waitlist: number[]
  reason:
    'price' | 'crowding' | 'freshness' | 'january' | 'aggregator' | 'expired' | 'instructor' | null
}
export type LeisureHold = {
  id: string
  booking: Booking
  releaseWeek: number
  status: 'held' | 'converted' | 'released'
  feeCents: number
  refundedCents?: number
}
export type LeisureWeek = {
  extras?: Record<FeatureId, LeisureExtraTotals>
  turnaroundCents?: Record<FeatureId, number>
  turnedAway: Record<string, number>
  week: number
  joined: number
  cancelled: number
  active: number
  signed: number
  held: number
  converted: number
  released: number
  lateReleased: number
  aggregatorCancellations: number
  aggregatorPayoutCents: number
  slots: {
    productId: FeatureId
    slotId: string
    visits: number
    turnedAway: number
    aggregator: number
    load: 'quiet' | 'busy' | 'packed'
  }[]
}
export type HiddenLeisure = {
  premiumInterest?: number
  foundingFollowing?: number
  instructorFollowing: Record<string, number>
  localPools: Record<FeatureId, number>
  payoutCents: number | null
}
export type LeisurePlan = {
  slotPrices?: Record<SegmentId, Record<string, { peak: number; off: number }>>
  salesSlots?: Record<SegmentId, string[]>
  offers?: Record<FeatureId, { enabled: boolean; priceCents: number }>
  timetable?: Record<FeatureId, Record<string, number>>
  settingHours?: Record<FeatureId, number>
  refresh?: FeatureId[]
  aggregator?: { slots: string[]; leave: boolean }
  holdPolicy?: 'free' | 'fee' | 'none'
}
/** Observed visits and words only. Comfort, freshness scores and conversion chances stay hidden. */
export type LeisureView = {
  instructorWork?: { maxClasses: number; loads: NonNullable<LeisureState['instructorLoads']> }
  foundingFollowing?: { invited: number; joined: number }
  noise?: {
    complaints: number
    totalComplaints: number
    warning: boolean
    restricted: boolean
    restrictedFrom: number | null
    restrictedUntil: number | null
    restrictions: number
    lateEvents: number
    cancelledBookings: number
    releasedHolds: number
    refundsCents: number
    receiptsCents: number
    variableCents: number
    staffCents: number
    assetCents: number
    turnaroundCents: number
    setupCents: number
    costsCents: number
    netCents: number
  }
  extras?: {
    productId: FeatureId
    name: string
    active: boolean
    terms: {
      segmentId: SegmentId
      grossCents: number
      revenueShare: number
      unitCostCents: number
    }[]
    units: number
    receiptsCents: number
    costsCents: number
    receiptsLast4Cents: number
    costsLast4Cents: number
  }[]
  upgrades?: {
    productId: FeatureId
    name: string
    poolId: FeatureId
    slotId: string
    additional: number
    unitCostCents: number
    active: boolean
    paidCents: number
  }[]
  slotPrices?: Record<SegmentId, Record<string, { peak: number; off: number }>>
  salesSlots?: Record<SegmentId, string[]>
  space?: { max: number; used: number; uses: Record<FeatureId, number> }
  minimumAreas: Record<SegmentId, number>
  slotCalendar: {
    productId: FeatureId
    slotId: string
    week: number
    capacity: number
    booked: number
    held: number
  }[]
  courses: (LadderYear & { byYear: LadderYear[] }) | null
  instructorDepartures: { week: number; name: string; stopped: number; pending: number }[]
  openingWeek: number | null
  buildChoice: FeatureId[]
  slots: { id: string; name: string; hours: number }[]
  load: LeisureWeek['slots']
  turnedAwayBySlot: Record<string, number>
  members: {
    products?: FeatureId[]
    offerId: FeatureId
    visits?: number
    name: string
    active: number
    inactive: number
    owedVisits: number
    agreedMonthlyCents: number
    enabled: boolean
    priceCents: number
    kind: string
    termWeeks: number
    noticeWeeks: number
    slots: string[]
    validWeeks: number | null
  }[]
  joinsLast4: number
  cancellationsLast4: number
  signed: number
  retained: number
  aggregator: {
    name: string
    slots: string[]
    joined: boolean
    leavingWeek: number | null
    capPerMonth: number
    noticeWeeks: number
    checkinsLast4: number
    payoutLast4Cents: number
    cancellationsLast4: number
    checkins: number
    payoutCents: number
    cancellations: number
  } | null
  freshness: {
    productId: FeatureId
    name: string
    word: 'new' | 'known' | 'tired'
    localGroups: number
    settingHours: number
    settingProgressHours: number
    served: number
    refreshes: number
    lastRefreshWeek: number | null
    openedWeek: number | null
    weeksTired: number
    closedWeeks: number
    resetHours: number
    refreshCents: number
    refreshWeeks: number
    lostCapacity: Record<string, number>
    refreshingUntil: number | null
  }[]
  builds: {
    permit?: { refundableCents: number; refusedWeek: number | null; returnedCents: number }
    closes?: FeatureId[]
    productId: FeatureId
    name: string
    readyWeek: number | null
    weeks: number
    started: boolean
    complete: boolean
    costCents: number
  }[]
  holds: {
    policy: 'free' | 'fee' | 'none'
    feeCents: number
    calendar: {
      id: string
      week: number
      slotId: string | null
      segmentId: SegmentId
      releaseWeek: number
      status: LeisureHold['status']
      refundedCents?: number
    }[]
    granted: number
    converted: number
    released: number
    lateReleased: number
  } | null
  timetable: {
    productId: FeatureId
    name: string
    room: string | null
    places: number
    classHours?: number
    available?: boolean
    coveredClasses?: Record<string, number>
    classes: Record<string, number>
  }[]
  history: LeisureWeek[]
}
