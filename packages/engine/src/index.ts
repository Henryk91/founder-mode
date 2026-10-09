// Public API of the simulation engine.

export { ENGINE_VERSION } from './version'
export { createGame } from './create'
export { getView } from './view'
export { checkPlan, clonePlan, emptyPlan, validatePlan } from './plan'
export type { PlanCheck } from './plan'
export { endWeek } from './turn'
export { replay, saveProblem, toSave } from './save'
export { scenarioHash } from './hash'

export type {
  ChannelId,
  CustomerView,
  EndingId,
  FeatureView,
  FounderNoteView,
  GuidanceView,
  IntroCardView,
  LeadChange,
  LeadStage,
  LeadView,
  PlanIssue,
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
  WeekPlan,
  WeekReport,
} from './types'
// GameState is exported as a type for bots and the store. Never hand it to UI components.
export type { GameState } from './types'
