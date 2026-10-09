import { createGame } from './create'
import { scenarioHash } from './hash'
import { clonePlan } from './plan'
import { respond } from './systems/inbox'
import { endWeek, shutDown } from './turn'
import type { GameState, SaveFile, SaveProblem, Scenario } from './types'
import { ENGINE_VERSION } from './version'

export function toSave(state: GameState): SaveFile {
  return {
    engineVersion: state.engineVersion,
    scenarioId: state.scenarioId,
    scenarioHash: scenarioHash(state.scenario),
    seed: state.seed,
    actions: state.actionLog.map((a) =>
      a.type === 'endWeek' ? { ...a, plan: clonePlan(a.plan) } : { ...a },
    ),
  }
}

/**
 * Why a save cannot be replayed with this engine and scenario, or null when it can. A save
 * without a scenario hash predates the check and counts as made under other values.
 */
export function saveProblem(scenario: Scenario, save: SaveFile): SaveProblem | null {
  if (save.engineVersion !== ENGINE_VERSION) return 'engine_version'
  if (save.scenarioId !== scenario.id) return 'scenario_id'
  if (save.scenarioHash !== scenarioHash(scenario)) return 'scenario_changed'
  return null
}

const PROBLEM_TEXT: Record<SaveProblem, (scenario: Scenario, save: SaveFile) => string> = {
  engine_version: (_, save) =>
    `Save is from engine ${save.engineVersion}, this is ${ENGINE_VERSION}`,
  scenario_id: (scenario, save) => `Save is for scenario ${save.scenarioId}, not ${scenario.id}`,
  scenario_changed: (scenario, save) =>
    `Save was made with other values for scenario ${scenario.id} ` +
    `(hash ${save.scenarioHash ?? 'missing'}, now ${scenarioHash(scenario)}). ` +
    'Replaying it would give a different game.',
}

/** Rebuilds a game by applying the saved actions to a fresh game with the same seed. */
export function replay(scenario: Scenario, save: SaveFile): GameState {
  const problem = saveProblem(scenario, save)
  if (problem) throw new Error(PROBLEM_TEXT[problem](scenario, save))
  let state = createGame(scenario, save.seed)
  for (const action of save.actions) {
    if (action.week !== state.week) {
      throw new Error(`Save action for week ${action.week} does not match week ${state.week}`)
    }
    if (action.type === 'endWeek') state = endWeek(state, action.plan).state
    else if (action.type === 'respond') state = respond(state, action.messageId, action.choiceId)
    else state = shutDown(state)
  }
  return state
}
