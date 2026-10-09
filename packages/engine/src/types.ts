import type { ChannelId, Scenario } from '@founder-mode/content'

export type { Scenario }

export type SegmentId = string
export type FeatureId = string
export type BucketId = string

/** sfc32 state, four signed 32 bit integers. */
export type RngState = { a: number; b: number; c: number; d: number }

export type { ChannelId }

export type EndingId = 'bankrupt' | 'still_searching' | 'sustainable'
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
  }

  /** What the player has observed, per segment. */
  knowledge: Record<SegmentId, Evidence[]>
  product: ProductState
  /** Every lead ever found, oldest first. Lost and won leads stay for the record. */
  leads: Lead[]
  /** Every customer ever won, oldest first. Churned customers stay with `churnedWeek` set. */
  customers: Customer[]
  /** One entry per resolved week, oldest first. */
  ledger: WeekLedger[]
  /** Everything needed to rebuild this state from the seed. */
  actionLog: LoggedAction[]
  /** Random outcomes with their expected values, for the post-mortem. */
  eventLog: LoggedEvent[]
}

export type FounderState = {
  baseHoursPerWeek: number
  maxHoursPerWeek: number
  energy: number
  savingsCents: number
  livingCostCentsPerWeek: number
  skills: { interviewing: number; selling: number }
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

export type LeadStage = 'lead' | 'demo' | 'trial' | 'paying' | 'lost'

/** Observable facts only. */
export type Lead = {
  id: string
  name: string
  segmentId: SegmentId
  stage: LeadStage
  stageSinceWeek: number
  lastContactWeek: number
  /** Week in which the lead stopped answering, or null. Silent leads cannot progress. */
  silentSinceWeek: number | null
  lostReason: 'declined' | 'silent' | null
}

export type Customer = {
  id: string
  leadId: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  churnedWeek: number | null
  /** The monthly price agreed when the customer signed. Later price changes do not touch it. */
  priceCentsPerMonth: number
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

export type Evidence = InterviewEvidence

/** Money movements of one resolved week. All values in cents, outflows positive. */
export type WeekLedger = {
  week: number
  revenueCents: number
  fixedCostsCents: number
  livingCostsCents: number
  /** Part of the living costs paid by the company because savings ran out. */
  founderDrawCents: number
  /** Savings moved into the company by the player. */
  transferCents: number
  /** Savings moved into the company automatically to cover negative cash. */
  autoTransferCents: number
  cashEndCents: number
  savingsEndCents: number
}

export type LoggedAction = { type: 'endWeek'; week: number; plan: WeekPlan }

export type LoggedEvent = InterviewEvent | MoneyEvent

export type InterviewEvent = {
  kind: 'interview'
  week: number
  segmentId: SegmentId
  expected: number
  observed: number
}

export type MoneyEvent = { kind: MoneyMovementKind; week: number; amountCents: number }

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
    savingsCents: number
    livingCostCentsPerWeek: number
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
  }
  costs: { interviewHours: number; demoHours: number; fixHoursPerBug: number; trialWeeks: number }
  guidance: GuidanceView
  channels: ChannelId[]
  product: ProductView
  leads: LeadView[]
  customers: CustomerView[]
  /** Sum of the monthly prices of active customers. */
  monthlyRevenueCents: number
  segments: SegmentView[]
  history: { week: number; cashCents: number; savingsCents: number }[]
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
  lostReason: 'declined' | 'silent' | null
  /** True when a demo can be held with this lead this week. */
  canBookDemo: boolean
}

export type CustomerView = {
  id: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  priceCentsPerMonth: number
}

export type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]
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
}

export type LeadChange =
  'wants_demo' | 'trial_started' | 'won' | 'declined' | 'went_silent' | 'lost_silent'

export type ReportEntry =
  | MoneyMovement
  | { kind: 'revenue'; amountCents: number; customers: number }
  | { kind: 'feature_shipped'; featureId: FeatureId; name: string; bugsAdded: number }
  | { kind: 'bugs_fixed'; count: number }
  | { kind: 'new_leads'; segmentId: SegmentId; channel: ChannelId; count: number }
  | { kind: 'lead_update'; change: LeadChange; leadId: string; name: string; segmentId: SegmentId }
  | { kind: 'customer_churned'; customerId: string; name: string; segmentId: SegmentId }

// ---------------------------------------------------------------------------
// Saves

export type SaveFile = {
  engineVersion: string
  scenarioId: string
  seed: string
  actions: LoggedAction[]
}
