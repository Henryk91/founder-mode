// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { EVENT_AREAS, ScenarioSchema, type EventArea, type Scenario } from './schema'
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

export const SCENARIO_IDS = ['kantino'] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export type ScenarioSources = {
  scenario: string
  features: string
  interviewQuotes: string
  companyNames: string
  intro: string
  /** One events file per area. Every event in a file belongs to that area. */
  events: Record<EventArea, string>
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
  },
}

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources): Scenario {
  const file: unknown = parse(sources.scenario)
  const intro: unknown = parse(sources.intro)
  const events = EVENT_AREAS.flatMap((area) => {
    const list = eventsIn(sources.events[area])
    for (const e of list) {
      const { id, area: actual } = (e ?? {}) as { id?: unknown; area?: unknown }
      if (actual !== area) {
        throw new Error(`event ${String(id)} is in the ${area} file but has area ${String(actual)}`)
      }
    }
    return list
  })
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
