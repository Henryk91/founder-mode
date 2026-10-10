import type { ChannelId, MessageLook, Scenario, TeamRoleId } from '@founder-mode/content'

export type { Scenario, TeamRoleId }

export type SegmentId = string
export type FeatureId = string
export type BucketId = string

/** sfc32 state, four signed 32 bit integers. */
export type RngState = { a: number; b: number; c: number; d: number }

export type { ChannelId }

export type EndingId = 'bankrupt' | 'burnout' | 'shut_down' | 'still_searching' | 'sustainable'
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
  /** One entry per resolved week, oldest first. */
  ledger: WeekLedger[]
  /** Everything needed to rebuild this state from the seed. */
  actionLog: LoggedAction[]
  /** Random outcomes with their expected values, for the post-mortem. */
  eventLog: LoggedEvent[]
  /** Milestones reached, in the order they were reached. */
  milestones: ReachedMilestone[]
}

export type ReachedMilestone = { id: string; week: number }

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

/** How a lead was found: outreach, a landing page sign up, an inbox message, or the salesperson. */
export type LeadSource = 'outreach' | 'landing' | 'inbox' | 'team' | 'presale'

/** Observable facts only. */
export type Lead = {
  id: string
  name: string
  segmentId: SegmentId
  stage: LeadStage
  source: LeadSource
  /** The outreach channel that found the lead, for outreach by the founder or the salesperson. */
  channel?: ChannelId
  stageSinceWeek: number
  lastContactWeek: number
  /** Week in which the lead stopped answering, or null. Silent leads cannot progress. */
  silentSinceWeek: number | null
  lostReason: LostReason | null
  /** The deposit a committed prospect paid, one month at the pitched price. */
  depositCents?: number
}

/** Why a lead was lost. `refunded`: a deposit was paid back because the product did not ship. */
export type LostReason = 'declined' | 'silent' | 'refunded'

export type Customer = {
  id: string
  leadId: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  churnedWeek: number | null
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

export type TeamSearch = { role: TeamRoleId; readyWeek: number }
export type Candidate = {
  id: string
  name: string
  role: TeamRoleId
  /** Id of the impression label, true skill plus noise. */
  impressionId: string
}
export type TeamMember = {
  id: string
  name: string
  role: TeamRoleId
  offerWeek: number
  startWeek: number
  letGoWeek: number | null
}
export type TeamState = {
  search: TeamSearch | null
  candidates: Candidate[]
  /** At most one in the early MVP. */
  members: TeamMember[]
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
  /** Late fees, severance, and costs of inbox choices. */
  otherCostsCents: number
  /** Money from inbox choices. */
  otherIncomeCents: number
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

export type OddsKind = 'leads' | 'lead_demo' | 'demo' | 'trial' | 'churn' | 'never_pays' | 'message'

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
  /** Make an offer to this candidate. */
  hire: string | null
  /** Let the current team member go. */
  letGo: boolean
  /** The feature a developer works on. */
  teamBuild: FeatureId | null
  /** Where a salesperson does outreach, after holding every demo they can. */
  teamOutreach: { segmentId: SegmentId; channel: ChannelId } | null
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
  | { code: 'invalid_hire'; candidateId: string }
  | { code: 'let_go_not_allowed' }
  | { code: 'invalid_team_work' }

// ---------------------------------------------------------------------------
// What the UI receives. Contains no hidden values.

export type PlayerView = {
  scenarioId: string
  scenarioName: string
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
  }
  company: {
    cashCents: number
    priceCentsPerMonth: number
    fixedCosts: FixedCost[]
    monthlyFixedCostsCents: number
    /**
     * Whole weeks until company cash plus personal savings reach zero at the recent net weekly
     * change. Null when that total is not shrinking.
     */
    runwayWeeks: number | null
    uiStage: UiStage
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
  }
  /** Hours already spent this week by answers to messages, and by earlier penalties. */
  committedHours: number
  forcedHours: number
  invoices: InvoiceView[]
  /** Sum of invoices that are issued and not yet paid or written off. */
  receivablesCents: number
  inbox: MessageView[]
  team: TeamView
  /** Landing page tests and pre-sales still running. */
  pendingExperiments: PendingExperimentView[]
  guidance: GuidanceView
  channels: ChannelId[]
  product: ProductView
  leads: LeadView[]
  customers: CustomerView[]
  /** Sum of the monthly prices of active customers. */
  monthlyRevenueCents: number
  segments: SegmentView[]
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
}

export type MemberView = {
  id: string
  name: string
  role: TeamRoleId
  roleName: string
  monthlyCents: number
  /** First working week. In the future while the new hire is still starting. */
  startWeek: number
  working: boolean
  letGoCostCents: number
}

export type TeamView = {
  /** False once someone was hired, or while a search is running. */
  canSearch: boolean
  roles: { id: TeamRoleId; name: string; monthlyCents: number; weeklyHours: number }[]
  search: { role: TeamRoleId; readyWeek: number } | null
  candidates: CandidateView[]
  member: MemberView | null
  /** True once someone has been hired and let go: the early MVP allows one hire. */
  hadHire: boolean
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
}

export type LeadChange =
  | 'wants_demo'
  | 'trial_started'
  | 'won'
  | 'declined'
  | 'went_silent'
  | 'lost_silent'
  | 'committed'
  | 'refunded'

export type ReportEntry =
  | MoneyMovement
  | { kind: 'revenue'; amountCents: number; customers: number }
  | { kind: 'invoices_issued'; amountCents: number; count: number }
  | { kind: 'invoice_written_off'; amountCents: number; name: string }
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
  | { kind: 'message_resolved'; fromName: string; choiceLabel: string; expired: boolean }
  | { kind: 'cash_effect'; amountCents: number }
  | { kind: 'feature_shipped'; featureId: FeatureId; name: string; bugsAdded: number }
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
  | { kind: 'customer_churned'; customerId: string; name: string; segmentId: SegmentId }

// ---------------------------------------------------------------------------
// Saves

export type SaveFile = {
  engineVersion: string
  scenarioId: string
  /** Fingerprint of the scenario's numbers and texts. Missing in saves made before 0.4.0. */
  scenarioHash?: string
  seed: string
  actions: LoggedAction[]
}

/** Why a save cannot be continued. */
export type SaveProblem = 'engine_version' | 'scenario_id' | 'scenario_changed'

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
  customersLost: number
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
    hire: HireEconomicsView | null
  }
  luck: {
    /** At most four, most important first. */
    items: LuckItem[]
    /** All luck together, in customers. Positive when luck helped. */
    netCustomers: number
    /** Whether average luck would have turned this ending around. Null when money did not decide it. */
    averageWouldChange: boolean | null
  }
}

/** `HireEconomics` from the team system, repeated here so the type has no import cycle. */
export type HireEconomicsView = {
  role: TeamRoleId
  costCents: number
  customersGained: number
  costPerCustomerCents: number | null
  lifetimeValueCents: number | null
}
