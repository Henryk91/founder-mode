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
  scenarioCatalogue,
  scenarioSources,
} from '../src/index'

/** Every text of a scenario's source files, shared events included. */
const allSources = (id: (typeof SCENARIO_IDS)[number]) => {
  const { scenario, features, interviewQuotes, companyNames, intro, events, sharedEvents } =
    scenarioSources(id)
  return [
    scenario,
    features,
    interviewQuotes,
    companyNames,
    intro,
    ...Object.values(events),
    ...Object.values(sharedEvents),
  ]
}

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

  it.each(SCENARIO_IDS)(
    '%s: every bucket of every segment has at least 10 distinct quotes',
    (id) => {
      const s = loadScenario(id)
      for (const seg of s.segments) {
        for (const b of s.experiments.interview.buckets) {
          const quotes = s.interviewQuotes[seg.id]?.[b.id] ?? []
          expect(quotes.length).toBeGreaterThanOrEqual(10)
          expect(new Set(quotes).size).toBe(quotes.length)
        }
      }
    },
  )

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

  it.each(SCENARIO_IDS)('%s: game text has no em dashes, in any file', (id) => {
    for (const text of allSources(id)) expect(text).not.toContain('—')
  })

  it.each(SCENARIO_IDS)(
    '%s: at least 400 company names per segment, none ending in a number',
    (id) => {
      const s = loadScenario(id)
      for (const seg of s.segments) {
        const names = companyNameCombinations(s.companyNames[seg.id]!)
        expect(names.length).toBeGreaterThanOrEqual(400)
        for (const name of names) expect(name).not.toMatch(/\d$/)
      }
    },
  )

  it.each(SCENARIO_IDS)(
    '%s: more distinctive name words per segment than a market ever has open leads',
    (id) => {
      // Bots peak at 36 open leads in one market; two open leads never share this word.
      const s = loadScenario(id)
      for (const seg of s.segments) {
        const parts = s.companyNames[seg.id]!
        const words = parts.distinct === 'second' ? parts.second : parts.first
        expect(new Set(words).size).toBe(words.length)
        expect(words.length).toBeGreaterThanOrEqual(45)
      }
    },
  )

  it('Zollstock matches the scenario spec', () => {
    const s = loadScenario('zollstock')
    expect(s.segments.map((x) => x.id)).toEqual(['small_crews', 'contractors', 'maintenance'])
    expect(s.features.map((f) => f.id)).toEqual([
      'job_board',
      'site_quotes',
      'customer_texts',
      'crew_dispatch',
      'material_lists',
      'recurring_jobs',
      'photo_reports',
      'client_marketplace',
    ])
    expect(s.sales.referral).toEqual({ chancePerFit: 0.11, chancePerBug: 0.01, demoBonus: 0.6 })
    expect(s.experiments.landing).toMatchObject({ signupBase: 0.01, signupPerPain: 0.08 })
    expect(s.start).toEqual(loadScenario('kantino').start)
    expect(s.officeStages[1]).toMatchObject({
      id: 'trades_yard',
      monthlyCents: 47_500,
      walkIns: { segment: 'small_crews', leadsPerWeek: 0.9 },
    })
    const yard = s.events.find((e) => e.id === 'trades_yard')!
    expect(yard.trigger).toEqual(
      loadScenario('kantino').events.find((e) => e.id === 'coworking_desk')!.trigger,
    )
    // Its own books and family event, under the ids the bots and the reader know.
    expect(s.events.find((e) => e.id === 'receipts_pile')!.text).toContain('plasterboard')
    expect(s.events.find((e) => e.id === 'family_lunch')!.text).toContain('dinner')
    const own = s.events.length - 66
    expect(own).toBe(43)
  })

  describe('scenarios do not borrow from each other', () => {
    /** Every string a player can read: ids, conditions and other keys the engine reads are left out. */
    const RULE_KEYS = new Set([
      'id',
      'area',
      'from',
      'look',
      'defaultChoice',
      'mustHave',
      'organisedAt',
      'path',
      'op',
      'type',
      'skill',
      'stage',
      'segment',
      'of',
      'covers',
      'kind',
      'distinct',
    ])
    const texts = (value: unknown, key = ''): string[] => {
      if (RULE_KEYS.has(key)) return []
      if (typeof value === 'string') return [value]
      if (Array.isArray(value)) return value.flatMap((v) => texts(v))
      if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) => texts(v, k))
      }
      return []
    }
    const readable = (id: 'kantino' | 'zollstock') => {
      const about = scenarioCatalogue().find((c) => c.id === id)!
      return [...texts(loadScenario(id)), about.name, ...about.lines].join('\n').toLowerCase()
    }
    const forbidden = (id: 'kantino' | 'zollstock', extra: string[]) => [
      loadScenario(id).name,
      ...loadScenario(id).features.map((f) => f.name),
      ...extra,
    ]

    it('no Zollstock text mentions lunch, Kantino or a Kantino feature', () => {
      const text = readable('zollstock')
      for (const word of forbidden('kantino', ['lunch'])) {
        expect([word, text.includes(word.toLowerCase())]).toEqual([word, false])
      }
    })

    it('no Kantino text mentions Zollstock or a Zollstock feature', () => {
      const text = readable('kantino')
      for (const word of forbidden('zollstock', [])) {
        expect([word, text.includes(word.toLowerCase())]).toEqual([word, false])
      }
    })
  })

  it('Kantino tells medical practices apart by surname', () => {
    expect(loadScenario('kantino').companyNames.medical?.distinct).toBe('second')
  })

  it('lists every scenario for the Start screen with its own name and two lines', () => {
    const catalogue = scenarioCatalogue()
    expect(catalogue.map((c) => c.id)).toEqual([...SCENARIO_IDS])
    for (const c of catalogue) {
      expect(c.name).toBe(loadScenario(c.id).name)
      expect(c.lines).toHaveLength(2)
      for (const line of c.lines) expect(line).not.toContain('—')
    }
  })

  describe('shared events', () => {
    const { sharedEvents } = scenarioSources('kantino')
    const shared = EVENT_AREAS.flatMap((area) => eventsIn(sharedEvents[area]) as { id: string }[])

    it.each(SCENARIO_IDS)('%s gets every shared event, in its area', (id) => {
      const s = loadScenario(id)
      for (const area of EVENT_AREAS) {
        for (const e of eventsIn(sharedEvents[area]) as { id: string }[]) {
          expect([e.id, s.events.find((x) => x.id === e.id)?.area]).toEqual([e.id, area])
        }
      }
    })

    it('name no scenario, market or feature', () => {
      const text = JSON.stringify(shared).toLowerCase()
      const words = SCENARIO_IDS.flatMap((id) => {
        const s = loadScenario(id)
        return [
          s.name,
          ...s.segments.flatMap((x) => [x.id, x.name]),
          ...s.features.flatMap((f) => [f.id, f.name]),
        ]
      })
      for (const word of [...words, 'lunch']) {
        expect([word, text.includes(word.toLowerCase())]).toEqual([word, false])
      }
    })

    it('are placed where a scenario puts them, and the rest follow its own events', () => {
      const base = scenarioSources('kantino')
      const own = eventsIn(base.events.team) as { id?: string; shared?: string }[]
      expect(own[0]).toEqual({ shared: 'team_plan' })
      const without = base.events.team.replace('  - shared: team_plan\n', '')
      const s = parseScenario({ ...base, events: { ...base.events, team: without } })
      const team = s.events.filter((e) => e.area === 'team').map((e) => e.id)
      expect(team.at(-1)).toBe('team_plan')
      expect(team).toHaveLength(own.length)
    })

    it('refuses an unknown or doubly placed shared event', () => {
      const base = scenarioSources('kantino')
      const unknown = base.events.team.replace('shared: team_plan', 'shared: team_yoga')
      expect(() => parseScenario({ ...base, events: { ...base.events, team: unknown } })).toThrow(
        /no shared team event team_yoga/,
      )
      const twice = base.events.team.replace('shared: raise_request', 'shared: team_plan')
      expect(() => parseScenario({ ...base, events: { ...base.events, team: twice } })).toThrow(
        /placed twice/,
      )
      const wrongArea = base.events.sales.replace('shared: slow_lead', 'shared: team_plan')
      expect(() =>
        parseScenario({ ...base, events: { ...base.events, sales: wrongArea } }),
      ).toThrow(/no shared sales event team_plan/)
    })
  })

  describe.each(SCENARIO_IDS)('%s events', (id) => {
    const s = loadScenario(id)
    const { events: files } = scenarioSources(id)

    it('has at least 105 events, at least 10 in every area', () => {
      expect(s.events.length).toBeGreaterThanOrEqual(105)
      for (const area of EVENT_AREAS) {
        expect(s.events.filter((e) => e.area === area).length).toBeGreaterThanOrEqual(10)
      }
    })

    it.each(EVENT_AREAS)('the %s file holds only events of its area or shared ones', (area) => {
      const list = eventsIn(files[area]) as { area?: string; shared?: string }[]
      for (const e of list) {
        if (e.shared === undefined) expect(e.area).toBe(area)
      }
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

    it('keeps the full milestone names, commas included, and organises at all costs or a hire', () => {
      const names = Object.fromEntries(s.milestones.map((m) => [m.id, m.name]))
      expect(names['covers_all_costs']).toBe('Monthly revenue covers all costs, you included')
      expect(names['covers_company_costs']).toBe('Monthly revenue covers company costs')
      expect(s.organisedAt).toEqual(['first_hire', 'covers_all_costs'])
    })

    it('gives every event a look, and uses all three', () => {
      const looks = new Set(s.events.map((e) => e.look))
      expect([...looks].sort()).toEqual(['letter', 'note', 'official'])
      expect(s.events.find((e) => e.id === 'receipts_pile')!.look).toBe('official')
      expect(s.events.find((e) => e.id === 'bad_sleep')!.look).toBe('note')
    })
  })

  describe('Kantino events', () => {
    const s = loadScenario('kantino')

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
        monthlyCents: 37_500,
        energyPerWeek: 0,
        channelFactors: {},
        walkIns: { segment: 'coworking', leadsPerWeek: 0.9 },
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
        'organisedAt: [first_hire, covers_all_costs]',
        'organisedAt: [first_unicorn]',
      )
      expect(() => parseScenario({ ...base, scenario })).toThrow(/unknown milestone first_unicorn/)
      const walk = base.scenario.replace(
        'walkIns: { segment: coworking',
        'walkIns: { segment: bakeries',
      )
      expect(() => parseScenario({ ...base, scenario: walk })).toThrow(/unknown segment bakeries/)
    })

    it('parses effect conditions into data', () => {
      const podcast = s.events.find((e) => e.id === 'podcast_invite')!
      const leads = podcast.choices[0]!.effects.find((fx) => fx.type === 'newLeads')!
      expect(leads.when).toEqual([{ path: 'leads.open', op: '<=', value: 8 }])
      expect(podcast.choices[0]!.effects.find((fx) => fx.type === 'energy')!.when).toEqual([])
    })
  })

  it.each(SCENARIO_IDS)('%s: four intro cards and a note for every rule, naming no role', (id) => {
    const s = loadScenario(id)
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
