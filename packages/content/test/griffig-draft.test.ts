import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseScenario, type ScenarioSources } from '../src/parse'
import { EVENT_AREAS } from '../src/schema'
import { scenarioCatalogue } from '../src/catalogue'

const root = resolve(import.meta.dirname, '../src/scenarios/griffig')
const read = (p: string) => readFileSync(resolve(root, p), 'utf8')
const sources: ScenarioSources = {
  scenario: read('scenario.yaml'),
  features: read('features.yaml'),
  interviewQuotes: read('messages/interview_quotes.yaml'),
  companyNames: read('messages/company_names.yaml'),
  intro: read('messages/intro.yaml'),
  events: Object.fromEntries(
    EVENT_AREAS.map((a) => [a, read(`messages/events/${a}.yaml`)]),
  ) as ScenarioSources['events'],
  sharedEvents: Object.fromEntries(
    EVENT_AREAS.map((a) => [a, 'events: []']),
  ) as ScenarioSources['sharedEvents'],
  longEvents: 'events: []',
  officeEvents: read('messages/events/office.yaml'),
}
describe('unregistered Griffig content', () => {
  const s = parseScenario(sources, 'long')
  it('provides authored long-game content without entering the catalogue', () => {
    expect(scenarioCatalogue().some((s) => String(s.id) === 'griffig')).toBe(false)
    expect(s.maxWeeks).toBe(104)
    expect(s.events.length).toBeGreaterThanOrEqual(40)
    expect(s.intro.cards).toHaveLength(4)
    for (const segment of s.segments)
      for (const bucket of s.experiments.interview.buckets)
        expect(s.interviewQuotes[segment.id]![bucket.id]).toHaveLength(10)
    expect(() => parseScenario(sources)).toThrow('no standard mode')
  })
  it('keeps safety,staffed hours and earned qualifications in distinct units', () => {
    const b = s.bookings!,
      l = b.leisure!
    expect(l.hall!.visitHours).toBe(2)
    expect(l.products.boulder_area!.simultaneous).toEqual({ hard: 140, comfort: 80 })
    expect(l.hall!.comfortByStage!.climbing_mezzanine).toBe(1.15)
    expect(b.products.rope_walls!.needsLevel).toBe('belay')
    expect(b.products.lead_course!.needsLevel).toBe('belay')
    expect(l.qualifications!.courseMembership).toEqual({ belay_course: 0.35, lead_course: 0.5 })
    expect(l.qualifications!.levels.lead!.requires).toEqual(['belay'])
    expect(l.freshness!.rope_walls!.refresh).toMatchObject({
      hours: 25,
      closedHours: { midday: 4 },
    })
    expect(b.roles.desk!.units).toEqual({})
  })
  it('charges real party places,weekly club visits and staffed café throughput', () => {
    const b = s.bookings!,
      l = b.leisure!
    expect(b.products.birthday_parties!.requestSize).toEqual({ min: 10, max: 10 })
    expect(
      Math.round(b.segments.families!.price.peak * b.products.birthday_parties!.priceFactor!) * 10,
    ).toBe(19900)
    expect(l.memberships!.kids_club).toMatchObject({
      priceCents: 5500,
      visitsPerWeek: 1,
      products: ['kids_club'],
    })
    expect(l.memberships!.visit_card).toMatchObject({ visits: 10, validWeeks: 52 })
    expect(l.extras!.cafe_counter!.staffing).toEqual({ role: 'cafe_staff', unitsPerShift: 50 })
    expect(l.aggregator).toMatchObject({ capPerMonth: 4, noticeWeeks: 13 })
    expect(l.opening).toEqual({
      areas: ['boulder_area', 'rope_walls', 'kids_area'],
      requires: ['basic_fit_out'],
    })
  })
})
