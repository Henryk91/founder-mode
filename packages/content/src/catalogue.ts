// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { SCENARIO_IDS, SCENARIO_MODES, type ScenarioId } from './ids'
import type { GameMode } from './schema'
import kantinoAbout from './scenarios/kantino/about.yaml?raw'
import zollstockAbout from './scenarios/zollstock/about.yaml?raw'
import gratwanderungAbout from './scenarios/gratwanderung/about.yaml?raw'
import hinterhofAbout from './scenarios/hinterhof/about.yaml?raw'
import seeblickAbout from './scenarios/seeblick/about.yaml?raw'

export { SCENARIO_IDS, SCENARIO_MODES, isScenarioId, type ScenarioId } from './ids'

/** What the Start screen shows about a scenario before a run exists. Not part of the game rules. */
export type ScenarioAbout = { id: ScenarioId; name: string; lines: string[]; modes: GameMode[] }

const ABOUT: Record<ScenarioId, string> = {
  kantino: kantinoAbout,
  zollstock: zollstockAbout,
  gratwanderung: gratwanderungAbout,
  hinterhof: hinterhofAbout,
  seeblick: seeblickAbout,
}

/** Name and short description of every built in scenario, in `SCENARIO_IDS` order. */
export function scenarioCatalogue(): ScenarioAbout[] {
  return SCENARIO_IDS.map((id) => {
    const about = parse(ABOUT[id]) as { name?: unknown; lines?: unknown }
    const lines = Array.isArray(about.lines) ? about.lines.map(String) : []
    if (typeof about.name !== 'string' || lines.length !== 2) {
      throw new Error(`${id}/about.yaml needs a name and exactly two lines`)
    }
    return { id, name: about.name, lines, modes: SCENARIO_MODES[id] }
  })
}
