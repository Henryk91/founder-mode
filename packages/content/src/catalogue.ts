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
import rueckenwindAbout from './scenarios/rueckenwind/about.yaml?raw'
import tiefgangAbout from './scenarios/tiefgang/about.yaml?raw'
import leinenlosAbout from './scenarios/leinenlos/about.yaml?raw'
import ausgesperrtAbout from './scenarios/ausgesperrt/about.yaml?raw'
import fabriketageAbout from './scenarios/fabriketage/about.yaml?raw'
import categoriesYaml from './categories.yaml?raw'

export { SCENARIO_IDS, SCENARIO_MODES, isScenarioId, type ScenarioId } from './ids'

/** What the Start screen shows about a scenario before a run exists. Not part of the game rules. */
export type ScenarioAbout = {
  id: ScenarioId
  name: string
  /** The category id (`categories.yaml`) it is listed under. */
  category: string
  /** One short line for its row. */
  short: string
  /** Two or three short tags for its row, besides the run length the Start screen adds. */
  tags: string[]
  /** The full description, two lines, for its sheet. */
  lines: string[]
  modes: GameMode[]
}

/** A kind of business on the Start screen, listed by `order`. */
export type ScenarioCategory = { id: string; name: string; order: number }

/** The categories of `categories.yaml`, in their order. */
export function scenarioCategories(): ScenarioCategory[] {
  const list: unknown = parse(categoriesYaml)
  if (!Array.isArray(list)) throw new Error('categories.yaml needs a list')
  const categories = list.map((c: unknown) => {
    const x = (c ?? {}) as Record<string, unknown>
    if (typeof x['id'] !== 'string' || typeof x['name'] !== 'string') {
      throw new Error('categories.yaml: every category needs an id and a name')
    }
    if (typeof x['order'] !== 'number') throw new Error(`category ${x['id']} needs an order`)
    return { id: x['id'], name: x['name'], order: x['order'] }
  })
  return categories.sort((a, b) => a.order - b.order)
}

const strings = (x: unknown): string[] => (Array.isArray(x) ? x.map(String) : [])

const ABOUT: Record<ScenarioId, string> = {
  kantino: kantinoAbout,
  zollstock: zollstockAbout,
  gratwanderung: gratwanderungAbout,
  hinterhof: hinterhofAbout,
  seeblick: seeblickAbout,
  rueckenwind: rueckenwindAbout,
  tiefgang: tiefgangAbout,
  leinenlos: leinenlosAbout,
  ausgesperrt: ausgesperrtAbout,
  fabriketage: fabriketageAbout,
}

/** Name, category, tags and description of every built in scenario, in `SCENARIO_IDS` order. */
export function scenarioCatalogue(): ScenarioAbout[] {
  const categories = new Set(scenarioCategories().map((c) => c.id))
  return SCENARIO_IDS.map((id) => {
    const about = parse(ABOUT[id]) as Record<string, unknown>
    const lines = strings(about['lines'])
    const tags = strings(about['tags'])
    const { name, category, short } = about
    if (typeof name !== 'string' || lines.length !== 2) {
      throw new Error(`${id}/about.yaml needs a name and exactly two lines`)
    }
    if (typeof category !== 'string' || !categories.has(category)) {
      throw new Error(`${id}/about.yaml needs a category from categories.yaml`)
    }
    if (typeof short !== 'string' || tags.length < 2 || tags.length > 3) {
      throw new Error(`${id}/about.yaml needs a short line and two or three tags`)
    }
    return { id, name, category, short, tags, lines, modes: SCENARIO_MODES[id] }
  })
}
