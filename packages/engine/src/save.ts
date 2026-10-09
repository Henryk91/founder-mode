import { createGame } from './create'
import { endWeek } from './turn'
import type { GameState, SaveFile, Scenario } from './types'
import { ENGINE_VERSION } from './version'

export function toSave(state: GameState): SaveFile {
  return {
    engineVersion: state.engineVersion,
    scenarioId: state.scenarioId,
    seed: state.seed,
    actions: state.actionLog.map((a) => ({
      ...a,
      plan: { ...a.plan, interviews: { ...a.plan.interviews } },
    })),
  }
}

/** True when this engine can replay the save to the same result. */
export function isCompatibleSave(save: SaveFile): boolean {
  return save.engineVersion === ENGINE_VERSION
}

/** Rebuilds a game by applying the saved actions to a fresh game with the same seed. */
export function replay(scenario: Scenario, save: SaveFile): GameState {
  if (!isCompatibleSave(save)) {
    throw new Error(`Save is from engine ${save.engineVersion}, this is ${ENGINE_VERSION}`)
  }
  if (save.scenarioId !== scenario.id) {
    throw new Error(`Save is for scenario ${save.scenarioId}, not ${scenario.id}`)
  }
  let state = createGame(scenario, save.seed)
  for (const action of save.actions) {
    if (action.week !== state.week) {
      throw new Error(`Save action for week ${action.week} does not match week ${state.week}`)
    }
    state = endWeek(state, action.plan).state
  }
  return state
}
