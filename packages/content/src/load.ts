// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./yaml.d.ts" />
import { parse } from 'yaml'
import { ScenarioSchema, type Scenario } from './schema'
import kantinoScenario from './scenarios/kantino/scenario.yaml?raw'
import kantinoFeatures from './scenarios/kantino/features.yaml?raw'
import kantinoQuotes from './scenarios/kantino/messages/interview_quotes.yaml?raw'

export const SCENARIO_IDS = ['kantino'] as const
export type ScenarioId = (typeof SCENARIO_IDS)[number]

export type ScenarioSources = {
  scenario: string
  features: string
  interviewQuotes: string
}

const SOURCES: Record<ScenarioId, ScenarioSources> = {
  kantino: {
    scenario: kantinoScenario,
    features: kantinoFeatures,
    interviewQuotes: kantinoQuotes,
  },
}

/** Parses and validates the YAML files of one scenario. Throws on any schema error. */
export function parseScenario(sources: ScenarioSources): Scenario {
  const file: unknown = parse(sources.scenario)
  return ScenarioSchema.parse({
    ...(typeof file === 'object' && file !== null ? file : {}),
    features: parse(sources.features),
    interviewQuotes: parse(sources.interviewQuotes),
  })
}

/** Returns a freshly parsed copy of a built in scenario. */
export function loadScenario(id: ScenarioId): Scenario {
  return parseScenario(SOURCES[id])
}

export function scenarioSources(id: ScenarioId): ScenarioSources {
  return SOURCES[id]
}
