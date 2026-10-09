import type { ChannelId, Scenario } from '@founder-mode/content'

export type { Scenario }

export type SegmentId = string
export type FeatureId = string
export type BucketId = string

/** sfc32 state, four signed 32 bit integers. */
export type RngState = { a: number; b: number; c: number; d: number }

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
  restHours: number
  /** Personal savings to move into the company this week. */
  transferToCompanyCents: number
}

export type PlanIssue =
  | { code: 'game_over' }
  | { code: 'invalid_number'; field: string }
  | { code: 'unknown_segment'; segmentId: string }
  | { code: 'too_many_hours'; plannedHours: number; maxHours: number }
  | { code: 'transfer_exceeds_savings'; savingsCents: number }

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
    /** Whole weeks until cash reaches zero at the recent burn. Null when not burning cash. */
    runwayWeeks: number | null
    uiStage: UiStage
  }
  costs: { interviewHours: number }
  segments: SegmentView[]
  history: { week: number; cashCents: number; savingsCents: number }[]
}

export type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]
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

export type ReportEntry = MoneyMovement

// ---------------------------------------------------------------------------
// Saves

export type SaveFile = {
  engineVersion: string
  scenarioId: string
  seed: string
  actions: LoggedAction[]
}
