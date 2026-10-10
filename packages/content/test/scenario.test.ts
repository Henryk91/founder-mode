import { describe, expect, it } from 'vitest'
import {
  companyNameCombinations,
  EVENT_AREAS,
  eventsIn,
  FOUNDER_NOTE_IDS,
  loadScenario,
  parseCondition,
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
    expect(s.start.cashCents).toBe(900_000)
    expect(s.maxWeeks).toBe(60)
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

  it('has the Phase 4 numbers of the scenario spec', () => {
    const s = loadScenario('kantino')
    expect(s.experiments.landing).toMatchObject({
      hours: 8,
      budgetsCents: [30_000, 75_000],
      centsPerVisitor: 225,
    })
    expect(s.experiments.presale).toMatchObject({ hoursPerBatch: 6, batchSize: 5, weeks: 1 })
    expect(s.finance.chaseBoost).toBe(0.3)
    expect(s.team.roles.developer.monthlyCents).toBe(390_000)
    expect(s.team.roles.salesperson.monthlyCents).toBe(330_000)
    expect(s.team).toMatchObject({
      searchHours: 6,
      searchWeeks: 2,
      candidates: 3,
      startWeeks: 2,
      severanceWeeks: 4,
    })
  })

  it('parses event conditions into data, not code', () => {
    const s = loadScenario('kantino')
    const late = s.events.find((e) => e.id === 'late_payer_first')!
    expect(late.when).toEqual([
      { path: 'customers.count', op: '>=', value: 1 },
      { path: 'invoices.overdueDays', op: '>=', value: 14 },
    ])
    expect(parseCondition('week >= 3')).toEqual({ path: 'week', op: '>=', value: 3 })
    expect(parseCondition('constructor.prototype > 1')).toBeNull()
  })

  it('game text has no em dashes, in any file', () => {
    const { scenario, features, interviewQuotes, companyNames, intro, events } =
      scenarioSources('kantino')
    const all = [scenario, features, interviewQuotes, companyNames, intro, ...Object.values(events)]
    for (const text of all) expect(text).not.toContain('—')
  })

  it('has at least 400 company names for every segment, none ending in a number', () => {
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      const names = companyNameCombinations(s.companyNames[seg.id]!)
      expect(names.length).toBeGreaterThanOrEqual(400)
      for (const name of names) expect(name).not.toMatch(/\d$/)
    }
  })

  it('has more distinctive name words per segment than a market ever has open leads', () => {
    // Bots peak at 36 open leads in one market; two open leads never share this word.
    const s = loadScenario('kantino')
    for (const seg of s.segments) {
      const parts = s.companyNames[seg.id]!
      const words = parts.distinct === 'second' ? parts.second : parts.first
      expect(new Set(words).size).toBe(words.length)
      expect(words.length).toBeGreaterThanOrEqual(45)
    }
    expect(s.companyNames.medical?.distinct).toBe('second')
  })

  describe('events', () => {
    const s = loadScenario('kantino')
    const { events: files } = scenarioSources('kantino')

    it('has at least 105 events, at least 10 in every area', () => {
      expect(s.events.length).toBeGreaterThanOrEqual(105)
      for (const area of EVENT_AREAS) {
        expect(s.events.filter((e) => e.area === area).length).toBeGreaterThanOrEqual(10)
      }
    })

    it.each(EVENT_AREAS)('the %s file holds only events of its area', (area) => {
      const list = eventsIn(files[area]) as { area: string }[]
      expect(list.length).toBeGreaterThanOrEqual(10)
      for (const e of list) expect(e.area).toBe(area)
    })

    it('arrives once each, except the books, which recur on purpose', () => {
      expect(s.events.filter((e) => !e.once).map((e) => e.id)).toEqual(['receipts_pile'])
    })

    it('keeps every message to 2 to 4 sentences', () => {
      for (const e of s.events) {
        const sentences = e.text.match(/[.!?]["”]?(?=\s|$)/g)?.length ?? 0
        expect([e.id, sentences >= 2 && sentences <= 4]).toEqual([e.id, true])
      }
    })

    it('names only amounts of money that a choice actually costs or pays', () => {
      const eur = (cents: number) => `${(Math.abs(cents) / 100).toLocaleString('en-GB')} EUR`
      for (const e of s.events) {
        const amounts = new Set(
          e.choices.flatMap((c) =>
            c.effects.flatMap((fx) =>
              fx.type === 'cash'
                ? [eur(fx.amountCents)]
                : fx.type === 'fixedCost'
                  ? [eur(fx.monthlyCents)]
                  : fx.type === 'moveOffice'
                    ? [eur(s.officeStages.find((o) => o.id === fx.stage)!.monthlyCents)]
                    : [],
            ),
          ),
        )
        for (const m of e.text.matchAll(/[\d,.]+ EUR/g)) {
          expect([e.id, amounts.has(m[0])]).toEqual([e.id, true])
        }
      }
    })

    it('offers the coworking desk once, for sure, from week 8 or after the first customer', () => {
      const desk = s.events.find((e) => e.id === 'coworking_desk')!
      expect(desk.once).toBe(true)
      expect(desk.trigger).toEqual([
        { path: 'week', op: '>=', value: 7 },
        { path: 'customers.won', op: '>=', value: 1 },
      ])
      const move = desk.choices.find((c) => c.id === 'move')!.effects[0]!
      expect(move).toMatchObject({ type: 'moveOffice', stage: 'coworking_desk' })
      expect(desk.choices.find((c) => c.id === desk.defaultChoice)!.effects).toEqual([])
      const stage = s.officeStages.find((o) => o.id === 'coworking_desk')!
      expect(stage).toMatchObject({
        monthlyCents: 22_500,
        energyPerWeek: 1,
        channelFactors: { in_person: 1.3, phone: 1.15, cold_email: 1.15 },
      })
      expect(s.officeStages[0]!.id).toBe('kitchen_table')
    })

    it('refuses a triggered event that is not once, an unknown office stage, or an unknown milestone', () => {
      const base = scenarioSources('kantino')
      const founder = base.events.founder.replace(
        'once: true\n    trigger:',
        'once: false\n    cooldownWeeks: 4\n    trigger:',
      )
      expect(() => parseScenario({ ...base, events: { ...base.events, founder } })).toThrow(
        /triggered event must be once/,
      )
      const moved = base.events.founder.replace('stage: coworking_desk', 'stage: penthouse')
      expect(() => parseScenario({ ...base, events: { ...base.events, founder: moved } })).toThrow(
        /unknown office stage penthouse/,
      )
      const scenario = base.scenario.replace(
        'organisedAt: [first_hire, covers_company_costs]',
        'organisedAt: [first_unicorn]',
      )
      expect(() => parseScenario({ ...base, scenario })).toThrow(/unknown milestone first_unicorn/)
    })

    it('gives every event a look, and uses all three', () => {
      const looks = new Set(s.events.map((e) => e.look))
      expect([...looks].sort()).toEqual(['letter', 'note', 'official'])
      expect(s.events.find((e) => e.id === 'receipts_pile')!.look).toBe('official')
      expect(s.events.find((e) => e.id === 'bad_sleep')!.look).toBe('note')
    })

    it('parses effect conditions into data', () => {
      const podcast = s.events.find((e) => e.id === 'podcast_invite')!
      const leads = podcast.choices[0]!.effects.find((fx) => fx.type === 'newLeads')!
      expect(leads.when).toEqual([{ path: 'leads.open', op: '<=', value: 8 }])
      expect(podcast.choices[0]!.effects.find((fx) => fx.type === 'energy')!.when).toEqual([])
    })
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
    /** The sources with the validation events file changed. */
    const withValidation = (edit: (text: string) => string) => ({
      ...base,
      events: { ...base.events, validation: edit(base.events.validation) },
    })

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

    it('an event condition outside the closed grammar', () => {
      for (const bad of ['week >= soon', 'moonPhase > 1', 'week >= 2 and cashEur > 3']) {
        const events = withValidation((t) => t.replace('week >= 2', bad))
        expect(() => parseScenario(events)).toThrow(/unknown condition/)
      }
    })

    it('an event whose default choice does not exist or costs hours', () => {
      const missing = withValidation((t) => t.replace('defaultChoice: pass', 'defaultChoice: nope'))
      expect(() => parseScenario(missing)).toThrow(/unknown default choice nope/)
      const costly = withValidation((t) => t.replace('defaultChoice: pass', 'defaultChoice: buy'))
      expect(() => parseScenario(costly)).toThrow(/must cost no hours/)
    })

    it('an effect type that does not exist', () => {
      const events = withValidation((t) =>
        t.replace('type: skill, skill: interviewing, delta: 0.03', 'type: teleport'),
      )
      expect(() => parseScenario(events)).toThrow()
    })

    it('a sender effect without that sender, and {name} without a sender', () => {
      const churn = withValidation((t) =>
        t.replace('type: skill, skill: interviewing, delta: 0.03', 'type: churnChance, delta: 0.3'),
      )
      expect(() => parseScenario(churn)).toThrow(/needs a customer sender/)
      const name = withValidation((t) =>
        t.replace('A market research firm', '{name} is a market research firm'),
      )
      expect(() => parseScenario(name)).toThrow(/needs a sender that is a customer/)
    })

    it('two events with the same id', () => {
      const events = withValidation((t) => t.replace('id: friend_of_friend', 'id: survey_offer'))
      expect(() => parseScenario(events)).toThrow(/duplicate event survey_offer/)
    })

    it('an effect condition outside the closed grammar', () => {
      const bad = withValidation((t) =>
        t.replace('when: [leads.open <= 8]', 'when: [leads.open <= lots]'),
      )
      expect(() => parseScenario(bad)).toThrow(/unknown condition/)
    })

    it('an event that may repeat without choosing to', () => {
      const repeats = withValidation((t) => t.replace('once: true', 'once: false'))
      expect(() => parseScenario(repeats)).toThrow(/recur on purpose/)
    })

    it('an event in the file of another area', () => {
      const moved = withValidation((t) => t.replace('area: validation', 'area: sales'))
      expect(() => parseScenario(moved)).toThrow(/is in the validation file but has area sales/)
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
