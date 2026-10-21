// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import type { ScenarioId } from './ids'
import { modesIn, parseScenario, type ScenarioSources } from './parse'
import type { GameMode, Scenario } from './schema'
import { sources as gratwanderung } from './sources/gratwanderung'
import { sources as hinterhof } from './sources/hinterhof'
import { sources as kantino } from './sources/kantino'
import { sources as seeblick } from './sources/seeblick'
import { sources as rueckenwind } from './sources/rueckenwind'
import { sources as tiefgang } from './sources/tiefgang'
import { sources as leinenlos } from './sources/leinenlos'
import { sources as ausgesperrt } from './sources/ausgesperrt'
import { sources as fabriketage } from './sources/fabriketage'
import { sources as zollstock } from './sources/zollstock'

export { SCENARIO_IDS, SCENARIO_MODES, isScenarioId, type ScenarioId } from './ids'
export {
  areaEvents,
  eventsIn,
  mergeOverride,
  modesIn,
  parseScenario,
  type ScenarioSources,
} from './parse'
export {
  scenarioCatalogue,
  scenarioCategories,
  type ScenarioAbout,
  type ScenarioCategory,
} from './catalogue'

/** Every scenario's files, loaded at once (Node: tests, bots; the web loads them lazily). */
const SOURCES: Record<ScenarioId, ScenarioSources> = {
  kantino,
  zollstock,
  gratwanderung,
  hinterhof,
  seeblick,
  rueckenwind,
  tiefgang,
  leinenlos,
  ausgesperrt,
  fabriketage,
}

/**
 * Returns a freshly parsed copy of a built in scenario, for the 60 week game or long mode. Without
 * a mode: the 60 week game, or long mode for a scenario that has only that.
 */
export function loadScenario(id: ScenarioId, mode?: GameMode): Scenario {
  return parseScenario(SOURCES[id], mode ?? scenarioModes(id)[0] ?? 'standard')
}

/** The modes a built in scenario can be played in. */
export function scenarioModes(id: ScenarioId): GameMode[] {
  return modesIn(SOURCES[id].scenario)
}

export function scenarioSources(id: ScenarioId): ScenarioSources {
  return SOURCES[id]
}
