// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { EVENT_AREAS, ScenarioSchema, type EventArea, type GameMode, type Scenario } from './schema'
import sharedValidation from './shared/events/validation.yaml?raw'
import sharedSales from './shared/events/sales.yaml?raw'
import sharedProduct from './shared/events/product.yaml?raw'
import sharedFinance from './shared/events/finance.yaml?raw'
import sharedFounder from './shared/events/founder.yaml?raw'
import sharedTeam from './shared/events/team.yaml?raw'
import sharedYear2 from './shared/events/year2.yaml?raw'
import sharedFunding from './shared/events/funding.yaml?raw'
import kantinoAbout from './scenarios/kantino/about.yaml?raw'
import kantinoScenario from './scenarios/kantino/scenario.yaml?raw'
import kantinoFeatures from './scenarios/kantino/features.yaml?raw'
import kantinoQuotes from './scenarios/kantino/messages/interview_quotes.yaml?raw'
import kantinoIntro from './scenarios/kantino/messages/intro.yaml?raw'
import kantinoValidation from './scenarios/kantino/messages/events/validation.yaml?raw'
import kantinoSales from './scenarios/kantino/messages/events/sales.yaml?raw'
import kantinoProduct from './scenarios/kantino/messages/events/product.yaml?raw'
import kantinoFinance from './scenarios/kantino/messages/events/finance.yaml?raw'
import kantinoFounder from './scenarios/kantino/messages/events/founder.yaml?raw'
import kantinoTeam from './scenarios/kantino/messages/events/team.yaml?raw'
import kantinoNames from './scenarios/kantino/messages/company_names.yaml?raw'
import zollstockAbout from './scenarios/zollstock/about.yaml?raw'
import zollstockScenario from './scenarios/zollstock/scenario.yaml?raw'
import zollstockFeatures from './scenarios/zollstock/features.yaml?raw'
import zollstockQuotes from './scenarios/zollstock/messages/interview_quotes.yaml?raw'
import zollstockIntro from './scenarios/zollstock/messages/intro.yaml?raw'
import zollstockValidation from './scenarios/zollstock/messages/events/validation.yaml?raw'
import zollstockSales from './scenarios/zollstock/messages/events/sales.yaml?raw'
import zollstockProduct from './scenarios/zollstock/messages/events/product.yaml?raw'
import zollstockFinance from './scenarios/zollstock/messages/events/finance.yaml?raw'
import zollstockFounder from './scenarios/zollstock/messages/events/founder.yaml?raw'
import zollstockTeam from './scenarios/zollstock/messages/events/team.yaml?raw'
import zollstockNames from './scenarios/zollstock/messages/company_names.yaml?raw'
import gratwanderungAbout from './scenarios/gratwanderung/about.yaml?raw'
import gratwanderungScenario from './scenarios/gratwanderung/scenario.yaml?raw'
import gratwanderungFeatures from './scenarios/gratwanderung/features.yaml?raw'
import gratwanderungQuotes from './scenarios/gratwanderung/messages/interview_quotes.yaml?raw'
import gratwanderungIntro from './scenarios/gratwanderung/messages/intro.yaml?raw'
import gratwanderungValidation from './scenarios/gratwanderung/messages/events/validation.yaml?raw'
import gratwanderungSales from './scenarios/gratwanderung/messages/events/sales.yaml?raw'
import gratwanderungProduct from './scenarios/gratwanderung/messages/events/product.yaml?raw'
import gratwanderungFinance from './scenarios/gratwanderung/messages/events/finance.yaml?raw'
import gratwanderungFounder from './scenarios/gratwanderung/messages/events/founder.yaml?raw'
import gratwanderungTeam from './scenarios/gratwanderung/messages/events/team.yaml?raw'
import gratwanderungNames from './scenarios/gratwanderung/messages/company_names.yaml?raw'
import hinterhofAbout from './scenarios/hinterhof/about.yaml?raw'
import hinterhofScenario from './scenarios/hinterhof/scenario.yaml?raw'
import hinterhofFeatures from './scenarios/hinterhof/features.yaml?raw'
import hinterhofQuotes from './scenarios/hinterhof/messages/interview_quotes.yaml?raw'
import hinterhofIntro from './scenarios/hinterhof/messages/intro.yaml?raw'
import hinterhofValidation from './scenarios/hinterhof/messages/events/validation.yaml?raw'
import hinterhofSales from './scenarios/hinterhof/messages/events/sales.yaml?raw'
import hinterhofProduct from './scenarios/hinterhof/messages/events/product.yaml?raw'
import hinterhofFinance from './scenarios/hinterhof/messages/events/finance.yaml?raw'
import hinterhofFounder from './scenarios/hinterhof/messages/events/founder.yaml?raw'
import hinterhofTeam from './scenarios/hinterhof/messages/events/team.yaml?raw'
import hinterhofNames from './scenarios/hinterhof/messages/company_names.yaml?raw'
import seeblickAbout from './scenarios/seeblick/about.yaml?raw'
import seeblickScenario from './scenarios/seeblick/scenario.yaml?raw'
import seeblickFeatures from './scenarios/seeblick/features.yaml?raw'
import seeblickQuotes from './scenarios/seeblick/messages/interview_quotes.yaml?raw'
import seeblickIntro from './scenarios/seeblick/messages/intro.yaml?raw'
import seeblickValidation from './scenarios/seeblick/messages/events/validation.yaml?raw'
import seeblickSales from './scenarios/seeblick/messages/events/sales.yaml?raw'
import seeblickProduct from './scenarios/seeblick/messages/events/product.yaml?raw'
import seeblickFinance from './scenarios/seeblick/messages/events/finance.yaml?raw'
import seeblickFounder from './scenarios/seeblick/messages/events/founder.yaml?raw'
import seeblickTeam from './scenarios/seeblick/messages/events/team.yaml?raw'
import seeblickNames from './scenarios/seeblick/messages/company_names.yaml?raw'
import tourismValidation from './shared/tourism/validation.yaml?raw'
import tourismSales from './shared/tourism/sales.yaml?raw'
import tourismProduct from './shared/tourism/product.yaml?raw'
import tourismFinance from './shared/tourism/finance.yaml?raw'
import tourismFounder from './shared/tourism/founder.yaml?raw'
import tourismTeam from './shared/tourism/team.yaml?raw'

/** Events every tourism scenario shares, one file per area. */
const TOURISM_EVENTS: Record<EventArea, string> = {
  validation: tourismValidation,
  sales: tourismSales,
  product: tourismProduct,
  finance: tourismFinance,
  founder: tourismFounder,
  team: tourismTeam,
}

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

export type ScenarioSources = {
  scenario: string
  features: string
  interviewQuotes: string
  companyNames: string
  intro: string
  /**
   * One events file per area. Every event in a file belongs to that area. An entry
   * `{ shared: <id> }` places a shared event of the same area at that position.
   */
  events: Record<EventArea, string>
  /** Events shared by every scenario, one file per area. */
  sharedEvents: Record<EventArea, string>
  /**
   * Long mode only: events of the second year, shared by every scenario with a long mode, any
   * area. The 60 week game never loads them, so its scenario and fingerprint are untouched.
   */
  longEvents: string
  /** Long mode events about investors (Part D), drawn only once money is raised. */
  fundingEvents?: string
}

/** Events every scenario gets: the founder's life, money, the hire, generic sales moments. */
const SHARED_EVENTS: Record<EventArea, string> = {
  validation: sharedValidation,
  sales: sharedSales,
  product: sharedProduct,
  finance: sharedFinance,
  founder: sharedFounder,
  team: sharedTeam,
}

const SOURCES: Record<ScenarioId, ScenarioSources> = {
  kantino: {
    scenario: kantinoScenario,
    features: kantinoFeatures,
    interviewQuotes: kantinoQuotes,
    companyNames: kantinoNames,
    intro: kantinoIntro,
    events: {
      validation: kantinoValidation,
      sales: kantinoSales,
      product: kantinoProduct,
      finance: kantinoFinance,
      founder: kantinoFounder,
      team: kantinoTeam,
    },
    sharedEvents: SHARED_EVENTS,
    longEvents: sharedYear2,
    fundingEvents: sharedFunding,
  },
  zollstock: {
    scenario: zollstockScenario,
    features: zollstockFeatures,
    interviewQuotes: zollstockQuotes,
    companyNames: zollstockNames,
    intro: zollstockIntro,
    events: {
      validation: zollstockValidation,
      sales: zollstockSales,
      product: zollstockProduct,
      finance: zollstockFinance,
      founder: zollstockFounder,
      team: zollstockTeam,
    },
    sharedEvents: SHARED_EVENTS,
    longEvents: sharedYear2,
    fundingEvents: sharedFunding,
  },
  // Tourism (step 5): its own shared pool instead of the software scenarios' shared and second
  // year events; the funding events still apply.
  gratwanderung: {
    scenario: gratwanderungScenario,
    features: gratwanderungFeatures,
    interviewQuotes: gratwanderungQuotes,
    companyNames: gratwanderungNames,
    intro: gratwanderungIntro,
    events: {
      validation: gratwanderungValidation,
      sales: gratwanderungSales,
      product: gratwanderungProduct,
      finance: gratwanderungFinance,
      founder: gratwanderungFounder,
      team: gratwanderungTeam,
    },
    sharedEvents: TOURISM_EVENTS,
    // No year 2 file of its own: valid YAML and valid JSON, as the web bundle reads JSON.
    longEvents: '{"events": []}',
    fundingEvents: sharedFunding,
  },
  hinterhof: {
    scenario: hinterhofScenario,
    features: hinterhofFeatures,
    interviewQuotes: hinterhofQuotes,
    companyNames: hinterhofNames,
    intro: hinterhofIntro,
    events: {
      validation: hinterhofValidation,
      sales: hinterhofSales,
      product: hinterhofProduct,
      finance: hinterhofFinance,
      founder: hinterhofFounder,
      team: hinterhofTeam,
    },
    sharedEvents: TOURISM_EVENTS,
    // No year 2 file of its own: valid YAML and valid JSON, as the web bundle reads JSON.
    longEvents: '{"events": []}',
    fundingEvents: sharedFunding,
  },
  seeblick: {
    scenario: seeblickScenario,
    features: seeblickFeatures,
    interviewQuotes: seeblickQuotes,
    companyNames: seeblickNames,
    intro: seeblickIntro,
    events: {
      validation: seeblickValidation,
      sales: seeblickSales,
      product: seeblickProduct,
      finance: seeblickFinance,
      founder: seeblickFounder,
      team: seeblickTeam,
    },
    sharedEvents: TOURISM_EVENTS,
    // No year 2 file of its own: valid YAML and valid JSON, as the web bundle reads JSON.
    longEvents: '{"events": []}',
    fundingEvents: sharedFunding,
  },
}

/** What the Start screen shows about a scenario before a run exists. Not part of the game rules. */
export type ScenarioAbout = { id: ScenarioId; name: string; lines: string[]; modes: GameMode[] }

const ABOUT: Record<ScenarioId, string> = {
  kantino: kantinoAbout,
  zollstock: zollstockAbout,
  gratwanderung: gratwanderungAbout,
  hinterhof: hinterhofAbout,
  seeblick: seeblickAbout,
}

/** The id of an event entry, or of the shared event it places. */
const entryKey = (e: unknown): { id: unknown; shared: unknown } => {
  const obj = (e ?? {}) as { id?: unknown; shared?: unknown }
  return { id: obj.id, shared: obj.shared }
}

/**
 * A scenario's events of one area, with shared events in place: each `{ shared: id }` entry is
 * replaced by that shared event, and shared events not placed follow the scenario's own, in the
 * shared file's order. Placement keeps the draw order, which decides which event a roll picks.
 */
export function areaEvents(area: EventArea, own: string, shared: string): unknown[] {
  const pool = eventsIn(shared)
  const byId = new Map<unknown, unknown>()
  for (const e of pool) {
    const { id, area: actual } = (e ?? {}) as { id?: unknown; area?: unknown }
    if (actual !== area) {
      throw new Error(
        `shared event ${String(id)} is in the ${area} file but has area ${String(actual)}`,
      )
    }
    byId.set(id, e)
  }
  const placed = new Set<unknown>()
  const list = eventsIn(own).map((e) => {
    const { id, shared: ref } = entryKey(e)
    if (ref === undefined) {
      const actual = (e as { area?: unknown }).area
      if (actual !== area) {
        throw new Error(`event ${String(id)} is in the ${area} file but has area ${String(actual)}`)
      }
      return e
    }
    if (!byId.has(ref)) throw new Error(`no shared ${area} event ${String(ref)}`)
    if (placed.has(ref)) throw new Error(`shared event ${String(ref)} is placed twice`)
    placed.add(ref)
    return byId.get(ref)
  })
  return [...list, ...pool.filter((e) => !placed.has(entryKey(e).id))]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * `base` with `over` laid on top: objects merge key by key, everything else (numbers, strings,
 * arrays) is replaced. Neither input is changed.
 */
export function mergeOverride(base: unknown, over: unknown): unknown {
  if (!isObject(base) || !isObject(over)) return over
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) out[k] = k in base ? mergeOverride(base[k], v) : v
  return out
}

/**
 * The scenario file for one mode. The 60 week game is the file without its `modes` block, so its
 * parsed scenario and fingerprint are exactly those of a file that never had one. Long mode lays
 * `modes.long` over the file and marks the result `mode: long`.
 */
function fileForMode(file: unknown, mode: GameMode, id: string): unknown {
  if (!isObject(file)) return file
  // `longOnly`: a scenario that has no 60 week game (the tourism scenarios).
  const { modes, longOnly, ...rest } = file
  if (mode === 'standard') {
    if (longOnly === true) throw new Error(`scenario ${id} has no standard mode`)
    return rest
  }
  const over = isObject(modes) ? modes[mode] : undefined
  if (!isObject(over)) throw new Error(`scenario ${id} has no ${mode} mode`)
  return { ...(mergeOverride(rest, over) as Record<string, unknown>), mode }
}

/** The modes a scenario's file defines: always the 60 week game, plus any `modes` block. */
export function modesIn(source: string): GameMode[] {
  const file: unknown = parse(source)
  const modes = isObject(file) && isObject(file['modes']) ? Object.keys(file['modes']) : []
  const long = modes.includes('long') ? (['long'] as const) : []
  if (isObject(file) && file['longOnly'] === true) return [...long]
  return ['standard', ...long]
}

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources, mode: GameMode = 'standard'): Scenario {
  const raw: unknown = parse(sources.scenario)
  const file = fileForMode(raw, mode, String(isObject(raw) ? raw['id'] : ''))
  const intro: unknown = parse(sources.intro)
  // Long mode adds the second year's events after every area's own, so the draw order of the
  // others is kept.
  const events = [
    ...EVENT_AREAS.flatMap((area) =>
      areaEvents(area, sources.events[area], sources.sharedEvents[area]),
    ),
    ...(mode === 'long' ? eventsIn(sources.longEvents) : []),
    ...(mode === 'long' && sources.fundingEvents ? eventsIn(sources.fundingEvents) : []),
  ]
  return ScenarioSchema.parse({
    ...(typeof file === 'object' && file !== null ? file : {}),
    ...(typeof intro === 'object' && intro !== null ? intro : {}),
    events,
    features: parse(sources.features),
    interviewQuotes: parse(sources.interviewQuotes),
    companyNames: parse(sources.companyNames),
  })
}

/** The `events` list of one events file, unchecked; the scenario schema checks it. */
export function eventsIn(source: string): unknown[] {
  const file: unknown = parse(source)
  const events =
    typeof file === 'object' && file !== null ? (file as { events?: unknown }).events : null
  return Array.isArray(events) ? events : []
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

/** Name and short description of every built in scenario, in `SCENARIO_IDS` order. */
export function scenarioCatalogue(): ScenarioAbout[] {
  return SCENARIO_IDS.map((id) => {
    const about = parse(ABOUT[id]) as { name?: unknown; lines?: unknown }
    const lines = Array.isArray(about.lines) ? about.lines.map(String) : []
    if (typeof about.name !== 'string' || lines.length !== 2) {
      throw new Error(`${id}/about.yaml needs a name and exactly two lines`)
    }
    return { id, name: about.name, lines, modes: scenarioModes(id) }
  })
}
