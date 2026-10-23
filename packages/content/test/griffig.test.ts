import { describe, expect, it } from 'vitest'
import { parseScenario } from '../src/parse'
import { loadScenario } from '../src/load'
import { loadScenarioLazy } from '../src/lazy'
import { sources } from '../src/sources/griffig'
import { scenarioCatalogue } from '../src/catalogue'

describe('Griffig content', () => {
  const s = parseScenario(sources, 'long')
  it('loads authored long-game content through catalogue,static and lazy paths', async () => {
    expect(scenarioCatalogue().find((s) => s.id === 'griffig')).toMatchObject({
      category: 'leisure',
      tags: ['Members', 'Build-out'],
      modes: ['long'],
    })
    expect(loadScenario('griffig', 'long')).toEqual(s)
    expect(await loadScenarioLazy('griffig', 'long')).toEqual(s)
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
  it('prices bouldering,all-area access and student agreements explicitly', () => {
    const b = s.bookings!,
      l = b.leisure!
    expect(b.products.boulder_area!.priceFactor).toBe(0.75)
    expect(b.segments.students!.price.peak).toBe(1600)
    expect(l.memberships!.student_monthly_membership).toMatchObject({
      priceCents: 5520,
      serves: ['students'],
    })
    expect(l.memberships!.monthly_membership!.serves).not.toContain('students')
    expect(b.products.student_monthly_membership!.requires).toBe('student_prices')
  })
  it('offers the internal mezzanine with real construction costs and no second lease', () => {
    expect(s.officeStages[1]).toMatchObject({
      id: 'climbing_mezzanine',
      oneOffCents: 4000000,
      monthlyCents: 0,
      moveWeeks: 6,
    })
    const offer = s.events.find((e) => e.id === 'mezzanine_offer')!
    expect(offer.choices.find((c) => c.id === 'move')!.effects).toContainEqual(
      expect.objectContaining({ type: 'officeMove', stage: 'climbing_mezzanine' }),
    )
  })
  it('keeps parties and courses in their real wall pool and allowed slots', () => {
    const b = s.bookings!,
      l = b.leisure!
    expect(b.products.birthday_parties!.capacityOf).toBe('kids_area')
    expect(b.products.kids_club!.capacityOf).toBe('kids_area')
    expect(b.products.belay_course!.capacityOf).toBe('rope_walls')
    expect(l.products.birthday_parties!.availableSlots).toEqual(['weekend'])
    expect(l.products.lead_course!.availableSlots).toEqual(['evening', 'weekend'])
  })
})
