import { describe, expect, it } from 'vitest'
import { loadScenario, parseScenario, SCENARIO_IDS, scenarioSources } from '../src/index'

describe('content', () => {
  it.each(SCENARIO_IDS)('%s passes its schema', (id) => {
    expect(() => loadScenario(id)).not.toThrow()
  })

  it('Kantino matches the scenario spec', () => {
    const s = loadScenario('kantino')
    expect(s.segments.map((x) => x.id)).toEqual(['small_offices', 'coworking', 'medical'])
    expect(s.roles.map((x) => x.id)).toEqual(['viable', 'mediocre', 'trap'])
    expect(s.features).toHaveLength(8)
    expect(s.start.cashCents).toBe(1_500_000)
    expect(s.maxWeeks).toBe(78)
  })

  it('every bucket of every segment has quotes', () => {
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      for (const b of s.experiments.interview.buckets) {
        expect(s.interviewQuotes[seg.id]?.[b.id]?.length ?? 0).toBeGreaterThanOrEqual(2)
      }
    }
  })

  it('game text has no em dashes', () => {
    const { scenario, features, interviewQuotes, companyNames } = scenarioSources('kantino')
    expect(scenario + features + interviewQuotes + companyNames).not.toContain('—')
  })

  it('has company names for every segment', () => {
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      expect(s.companyNames[seg.id]?.length ?? 0).toBeGreaterThanOrEqual(10)
    }
  })

  describe('rejects broken content', () => {
    const base = scenarioSources('kantino')

    it('unknown must have feature', () => {
      const scenario = base.scenario.replace('invoice_export, chat', 'invoice_exprot, chat')
      expect(() => parseScenario({ ...base, scenario })).toThrow(/unknown feature invoice_exprot/)
    })

    it('missing quotes for a bucket', () => {
      const interviewQuotes = base.interviewQuotes.replace(/^ {2}urgent:/m, '  urgnet:')
      expect(() => parseScenario({ ...base, interviewQuotes })).toThrow(/no quotes for/)
    })

    it('role count differs from segment count', () => {
      const scenario = base.scenario.replace(/ {2}- id: trap[\s\S]*?\n\n/, '\n')
      expect(() => parseScenario({ ...base, scenario })).toThrow(/one role per segment/)
    })

    it('a segment without company names', () => {
      const companyNames = base.companyNames.replace(/^medical:/m, 'medicine:')
      expect(() => parseScenario({ ...base, companyNames })).toThrow(/no company names for medical/)
    })

    it('inverted range', () => {
      const scenario = base.scenario.replace(
        'size: { min: 800, max: 2000 }',
        'size: { min: 2000, max: 800 }',
      )
      expect(() => parseScenario({ ...base, scenario })).toThrow(/min must not exceed max/)
    })
  })
})
