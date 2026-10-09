// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { ScenarioSchema, type Scenario } from './schema'
import kantinoScenario from './scenarios/kantino/scenario.yaml?raw'
import kantinoFeatures from './scenarios/kantino/features.yaml?raw'
import kantinoQuotes from './scenarios/kantino/messages/interview_quotes.yaml?raw'
import kantinoIntro from './scenarios/kantino/messages/intro.yaml?raw'
import kantinoEvents from './scenarios/kantino/messages/events.yaml?raw'
import kantinoNames from './scenarios/kantino/messages/company_names.yaml?raw'

export const SCENARIO_IDS = ['kantino'] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export type ScenarioSources = {
  scenario: string
  features: string
  interviewQuotes: string
  companyNames: string
  intro: string
  events: string
}

const SOURCES: Record<ScenarioId, ScenarioSources> = {
  kantino: {
    scenario: kantinoScenario,
    features: kantinoFeatures,
    interviewQuotes: kantinoQuotes,
    companyNames: kantinoNames,
    intro: kantinoIntro,
    events: kantinoEvents,
  },
}

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources): Scenario {
  const file: unknown = parse(sources.scenario)
  const intro: unknown = parse(sources.intro)
  const events: unknown = parse(sources.events)
  return ScenarioSchema.parse({
    ...(typeof file === 'object' && file !== null ? file : {}),
    ...(typeof intro === 'object' && intro !== null ? intro : {}),
    ...(typeof events === 'object' && events !== null ? events : {}),
    features: parse(sources.features),
    interviewQuotes: parse(sources.interviewQuotes),
    companyNames: parse(sources.companyNames),
  })
}

/** Returns a freshly parsed copy of a built in scenario. */
export function loadScenario(id: ScenarioId): Scenario {
  return parseScenario(SOURCES[id])
}

export function scenarioSources(id: ScenarioId): ScenarioSources {
  return SOURCES[id]
}
