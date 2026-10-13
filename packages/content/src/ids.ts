import type { GameMode } from './schema'

/** Built in scenarios, in the order the Start screen lists them. */
export const SCENARIO_IDS = [
  'kantino',
  'zollstock',
  'gratwanderung',
  'hinterhof',
  'seeblick',
] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export const isScenarioId = (id: string): id is ScenarioId =>
  (SCENARIO_IDS as readonly string[]).includes(id)

/**
 * The modes each scenario can be played in, as its file defines them (a test keeps them equal), so
 * the Start screen needs none of the scenario files.
 */
export const SCENARIO_MODES: Record<ScenarioId, GameMode[]> = {
  kantino: ['standard', 'long'],
  zollstock: ['standard'],
  gratwanderung: ['long'],
  hinterhof: ['long'],
  seeblick: ['long'],
}
