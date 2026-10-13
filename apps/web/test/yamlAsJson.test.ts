import { describe, expect, it } from 'vitest'
import {
  parseScenario,
  SCENARIO_IDS,
  scenarioModes,
  scenarioSources,
  type ScenarioSources,
} from '@founder-mode/content'
import { scenarioHash } from '@founder-mode/engine'
import { parse } from 'yaml'
import { yamlToJson } from '../build/yamlAsJson'
import { parse as shimParse } from '../src/yamlShim'

/** Every text of a scenario's sources, turned into JSON as the web build does. */
function asJson(sources: ScenarioSources): ScenarioSources {
  const map = (r: Record<string, string>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, yamlToJson(v)]))
  return {
    ...sources,
    scenario: yamlToJson(sources.scenario),
    features: yamlToJson(sources.features),
    interviewQuotes: yamlToJson(sources.interviewQuotes),
    companyNames: yamlToJson(sources.companyNames),
    intro: yamlToJson(sources.intro),
    events: map(sources.events) as ScenarioSources['events'],
    sharedEvents: map(sources.sharedEvents) as ScenarioSources['sharedEvents'],
    longEvents: yamlToJson(sources.longEvents),
  }
}

describe('content YAML parsed at build time', () => {
  for (const id of SCENARIO_IDS) {
    it(`gives the same ${id} scenario, with the same hash, so saves stay valid`, () => {
      const sources = scenarioSources(id)
      // Each scenario in its first mode: the 60 week game, or long mode for a tourism one.
      const mode = scenarioModes(id)[0]
      const fromJson = parseScenario(asJson(sources), mode)
      const fromYaml = parseScenario(sources, mode)
      expect(fromJson).toEqual(fromYaml)
      expect(scenarioHash(fromJson)).toBe(scenarioHash(fromYaml))
      if (id === 'kantino') {
        expect(parseScenario(asJson(sources), 'long')).toEqual(parseScenario(sources, 'long'))
      }
    })

    it(`reads every ${id} file with JSON.parse as the YAML parser does`, () => {
      const sources = asJson(scenarioSources(id))
      const texts = [
        sources.scenario,
        sources.features,
        sources.interviewQuotes,
        sources.companyNames,
        sources.intro,
        ...Object.values(sources.events),
        ...Object.values(sources.sharedEvents),
        sources.longEvents,
      ]
      for (const text of texts) expect(shimParse(text)).toEqual(parse(text))
    })
  }
})
