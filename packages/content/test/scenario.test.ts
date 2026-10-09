import { describe, expect, it } from 'vitest'
import {
  companyNameCombinations,
  FOUNDER_NOTE_IDS,
  loadScenario,
  parseScenario,
  SCENARIO_IDS,
  scenarioSources,
} from '../src/index'

describe('content', () => {
  it.each(SCENARIO_IDS)('%s passes its schema', (id) => {
    expect(() => loadScenario(id)).not.toThrow()
  })

  it('Kantino matches the scenario spec', () => {
    const s = loadScenario('kantino')
    expect(s.segments.map((x) => x.id)).toEqual(['small_offices', 'coworking', 'medical'])
    expect(s.roles.map((x) => x.id)).toEqual(['viable', 'mediocre', 'trap'])
    expect(s.features).toHaveLength(8)
    expect(s.start.cashCents).toBe(1_000_000)
    expect(s.maxWeeks).toBe(78)
  })

  it('every bucket of every segment has at least 10 distinct quotes', () => {
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      for (const b of s.experiments.interview.buckets) {
        const quotes = s.interviewQuotes[seg.id]?.[b.id] ?? []
        expect(quotes.length).toBeGreaterThanOrEqual(10)
        expect(new Set(quotes).size).toBe(quotes.length)
      }
    }
  })

  it('game text has no em dashes', () => {
    const { scenario, features, interviewQuotes, companyNames, intro } = scenarioSources('kantino')
    expect(scenario + features + interviewQuotes + companyNames + intro).not.toContain('—')
  })

  it('has at least 400 company names for every segment, none ending in a number', () => {
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      const names = companyNameCombinations(s.companyNames[seg.id]!)
      expect(names.length).toBeGreaterThanOrEqual(400)
      for (const name of names) expect(name).not.toMatch(/\d$/)
    }
  })

  it('has the four intro cards and a note for every rule, without naming a segment', () => {
    const s = loadScenario('kantino')
    expect(s.intro.cards.map((c) => c.id)).toEqual(['you', 'idea', 'problem', 'goal'])
    expect(Object.keys(s.founderNotes).sort()).toEqual([...FOUNDER_NOTE_IDS].sort())
    const text = JSON.stringify([s.intro, s.founderNotes]).toLowerCase()
    for (const word of ['viable', 'trap', 'mediocre', 'best segment']) {
      expect(text).not.toContain(word)
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

    it('a company name that two segments can produce', () => {
      const companyNames = base.companyNames.replace('    - Hausärzte\n', '    - Nordlicht\n')
      const withDigital = companyNames.replace('    - Albers\n', '    - Digital\n')
      expect(() => parseScenario({ ...base, companyNames: withDigital })).toThrow(
        /duplicate company name Nordlicht Digital/,
      )
    })

    it('a segment without company names', () => {
      const companyNames = base.companyNames.replace(/^medical:/m, 'medicine:')
      expect(() => parseScenario({ ...base, companyNames })).toThrow(/no company names for medical/)
    })

    it('an unknown placeholder in the intro or a note', () => {
      const intro = base.intro.replace('{savings:eur}', '{salary:eur}')
      expect(() => parseScenario({ ...base, intro })).toThrow(/unknown placeholder \{salary:eur\}/)
      const notes = base.intro.replace('{n} leads', '{count} leads')
      expect(() => parseScenario({ ...base, intro: notes })).toThrow(/unknown placeholder/)
    })

    it('an intro without a goal card', () => {
      const intro = base.intro.replace('id: goal', 'id: target')
      expect(() => parseScenario({ ...base, intro })).toThrow(/card with id goal/)
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
