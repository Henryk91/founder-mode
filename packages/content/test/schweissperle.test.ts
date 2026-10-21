import { describe, expect, it } from 'vitest'
import { parseScenario } from '../src/parse'
import { sources } from '../src/sources/schweissperle'

describe('Schweißperle first-pass draft content', () => {
  const s = parseScenario(sources, 'long')
  const b = s.bookings!
  const l = b.leisure!
  it('provides a complete long-game draft with authored interviews and decisions', () => {
    expect(s.id).toBe('schweissperle')
    expect(s.maxWeeks).toBe(104)
    expect(s.intro.cards).toHaveLength(4)
    expect(s.events.length).toBeGreaterThanOrEqual(40)
    expect(s.features.every((f) => f.buildHours > 0)).toBe(true)
    for (const seg of s.segments)
      for (const bucket of s.experiments.interview.buckets)
        expect(s.interviewQuotes[seg.id]![bucket.id]).toHaveLength(10)
  })

  it('keeps monthly member budgets,owed packs and premium access in real units', () => {
    expect(l.wtpBasis).toBe('monthly')
    expect(l.respectSlotPreferences).toBe(true)
    expect(l.memberships!.annual_membership!.termWeeks).toBe(52)
    expect(l.memberships!.class_pack).toMatchObject({ visits: 10, validWeeks: 26 })
    expect(l.memberships!.premium_pack!.products).toEqual(['reformer_pilates'])
    expect(l.memberships!.monthly_membership!.products).not.toContain('reformer_pilates')
    expect(l.premiumNiche!.share.min).toBeLessThan(l.premiumNiche!.share.max)
    expect(l.foundingFollowing).toMatchObject({ count: { min: 30, max: 60 }, weeks: 4 })
  })

  it('makes room conversion,instructor coverage and the adjoining room physical limits', () => {
    expect(l.classStaffing).toBe(true)
    expect(l.instructorWorkload!.maxClasses).toBe(12)
    expect(l.products.strength_classes!.classPlacesWhen).toEqual({
      feature: 'reformer_pilates',
      places: 8,
    })
    expect(l.products.reformer_pilates!.room).toBe('studio')
    expect(l.products.annex_strength).toMatchObject({
      room: 'annex',
      availableStages: ['wider_class_shop'],
    })
    expect(l.products.annex_yoga!.room).toBe(l.products.annex_lunch!.room)
    expect(b.roles.yoga!.founderHours).toBeUndefined()
    expect(b.roles.pilates!.founderHours).toBeUndefined()
    expect(b.roles.spin!.founderHours).toBeGreaterThan(0)
    expect(b.roles.strength!.founderHours).toBeGreaterThan(0)
  })

  it('offers real bike supply and a real instructor departure while including showers in fit-out', () => {
    expect(b.assets!.spin_bikes!.buy!.product).toBe('spin_bikes')
    expect(b.assets!.spin_bikes!.lease).toMatchObject({ seasonCents: 1200000, minMonths: 12 })
    expect(
      s.events
        .find((e) => e.id === 'bike_terms')!
        .choices.some((c) => c.effects.some((fx) => fx.type === 'asset' && fx.option === 'lease')),
    ).toBe(true)
    expect(
      s.events.find((e) => e.id === 'her_own_place')!.choices.find((c) => c.id === 'leave')!
        .effects,
    ).toContainEqual(expect.objectContaining({ type: 'leisureInstructor', role: 'most_followed' }))
    expect(s.features.some((f) => f.id === 'showers')).toBe(false)
    expect(s.features.find((f) => f.id === 'fit_out')!.mention).toContain('showers')
    expect(l.aggregator!.name).toBe('Turnsaldo')
  })
})
