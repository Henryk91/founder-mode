// Public API of the simulation engine.

export { ENGINE_VERSION } from './version'
export { createGame } from './create'
export { getView } from './view'
export { checkPlan, clonePlan, emptyPlan, validatePlan } from './plan'
export type { PlanCheck } from './plan'
export { endWeek, shutDown } from './turn'
export { respond } from './systems/inbox'
export { conditionValue } from './systems/conditions'
export { viewConditionsHold, viewConditionValue } from './systems/viewConditions'
export { hireEconomics, hiresEconomics, roleTerms } from './systems/team'
export { buildPostMortem, fundingEconomics } from './postmortem'
export { bookingTotals } from './systems/bookings'
export type { HireEconomics } from './systems/team'
export { replay, saveProblem, toSave } from './save'
export { scenarioHash } from './hash'

export type {
  ChannelId,
  CandidateView,
  CustomerView,
  EndingId,
  FeatureView,
  FounderNoteView,
  GuidanceView,
  IntroCardView,
  InvoiceStatus,
  InvoiceView,
  MemberView,
  MessageChoice,
  MessageView,
  PendingExperimentView,
  TeamView,
  TeamTask,
  GameMode,
  BookingsPlan,
  BookingsView,
  AbroadView,
  AbroadEconomics,
  ConditionsWeek,
  LadderYear,
  Booking,
  CalendarCell,
  Policy,
  WeatherState,
  FreelancePlan,
  FundingEconomics,
  FundingPlan,
  FundingView,
  InvestorStage,
  InvestorView,
  PassReason,
  RoundId,
  RoundView,
  Stake,
  TermSheet,
  FreelanceView,
  FreelancerView,
  FreelanceBooking,
  FreelanceEconomicsView,
  HireEconomicsView,
  LandingView,
  PresaleView,
  LeadChange,
  LeadStage,
  LeadView,
  PlanIssue,
  PostMortem,
  GuestsEconomics,
  BookingTotal,
  LoanEconomics,
  LoanView,
  LoanPlan,
  LoanTerms,
  MilestoneView,
  NextMilestoneView,
  PostMortemCauseId,
  ChainItem,
  ChainKind,
  MarketTruth,
  Misread,
  LuckItem,
  LuckKind,
  SuggestionId,
  HoursByActivity,
  Activity,
  ProductView,
  InterviewView,
  MoneyMovement,
  MoneyMovementKind,
  PlayerView,
  ReportEntry,
  SaveFile,
  SaveProblem,
  SegmentView,
  UiStage,
  TeamRoleId,
  WeekPlan,
  WeekReport,
} from './types'
// GameState is exported as a type for bots and the store. Never hand it to UI components.
export type { GameState } from './types'
