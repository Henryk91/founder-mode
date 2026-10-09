// Public API of the simulation engine.

export { ENGINE_VERSION } from './version'
export { createGame } from './create'
export { getView } from './view'
export { emptyPlan, validatePlan } from './plan'
export { endWeek } from './turn'
export { isCompatibleSave, replay, toSave } from './save'

export type {
  EndingId,
  InterviewView,
  MoneyMovement,
  MoneyMovementKind,
  PlanIssue,
  PlayerView,
  ReportEntry,
  SaveFile,
  SegmentView,
  UiStage,
  WeekPlan,
  WeekReport,
} from './types'
// GameState is exported as a type for bots and the store. Never hand it to UI components.
export type { GameState } from './types'
