// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { EVENT_AREAS, ScenarioSchema, type EventArea, type Scenario } from './schema'
import sharedValidation from './shared/events/validation.yaml?raw'
import sharedSales from './shared/events/sales.yaml?raw'
import sharedProduct from './shared/events/product.yaml?raw'
import sharedFinance from './shared/events/finance.yaml?raw'
import sharedFounder from './shared/events/founder.yaml?raw'
import sharedTeam from './shared/events/team.yaml?raw'
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

/** Built in scenarios, in the order the Start screen lists them. */
export const SCENARIO_IDS = ['kantino'] as const
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
  },
}

/** What the Start screen shows about a scenario before a run exists. Not part of the game rules. */
export type ScenarioAbout = { id: ScenarioId; name: string; lines: string[] }

const ABOUT: Record<ScenarioId, string> = {
  kantino: kantinoAbout,
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

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources): Scenario {
  const file: unknown = parse(sources.scenario)
  const intro: unknown = parse(sources.intro)
  const events = EVENT_AREAS.flatMap((area) =>
    areaEvents(area, sources.events[area], sources.sharedEvents[area]),
  )
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

/** Returns a freshly parsed copy of a built in scenario. */
export function loadScenario(id: ScenarioId): Scenario {
  return parseScenario(SOURCES[id])
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
    return { id, name: about.name, lines }
  })
}
