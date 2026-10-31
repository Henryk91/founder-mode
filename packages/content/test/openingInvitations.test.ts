import { describe, expect, it } from 'vitest'
import { loadScenario, parseScenario, scenarioSources } from '../src/index'

describe('opening invitation content', () => {
  it.each(['schweissperle', 'griffig'] as const)(
    'quotes and defers the five %s preparation audiences',
    (id) => {
      const scenario = loadScenario(id, 'long')
      const cards = scenario.events.filter((e) =>
        e.choices.some((c) => c.label === 'Pay for the opening-planning session'),
      )
      expect(cards).toHaveLength(5)
      for (const card of cards) {
        const guests = card.choices.flatMap((c) => c.effects).filter((fx) => fx.type === 'guests')
        expect(guests).toHaveLength(1)
        expect(guests[0]!.onOpening).toBe(true)
        expect(card.text).toContain(
          `${guests[0]!.count} invitations, sent for your first full week after opening`,
        )
      }
    },
  )

  it('rejects deferred invitations without a leisure opening', () => {
    const source = scenarioSources('kantino')
    const sales = `events:
  - id: opening_contacts
    area: sales
    weight: 1
    once: true
    when: []
    from: none
    sender: The organiser
    look: letter
    text: Prepare opening invitations.
    defaultChoice: wait
    choices:
      - id: prepare
        label: Prepare
        hours: 1
        effects:
          - type: guests
            count: 1
            onOpening: true
      - id: wait
        label: Wait
        hours: 0
        effects: []
`
    expect(() => parseScenario(source)).not.toThrow()
    expect(() => parseScenario({ ...source, events: { ...source.events, sales } })).toThrow(
      /opening invitations need a leisure opening/,
    )
  })

  it('rejects a deferred audience naming an unknown booking segment', () => {
    const source = scenarioSources('schweissperle')
    const product = source.events.product.replace(
      "onOpening: true\n            segment: 'yoga_crowd'",
      "onOpening: true\n            segment: 'missing_segment'",
    )
    expect(product).not.toBe(source.events.product)
    expect(() =>
      parseScenario({ ...source, events: { ...source.events, product } }, 'long'),
    ).toThrow(/unknown booking segment missing_segment/)
  })
})
