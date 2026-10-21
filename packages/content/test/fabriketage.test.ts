import { describe, expect, it } from 'vitest'
import { loadScenario, scenarioCatalogue } from '../src/index'

describe('Fabriketage first-pass content', () => {
  const s = loadScenario('fabriketage', 'long')
  const b = s.bookings!
  const l = b.leisure!
  it('offers a long leisure game with complete interviews and authored events', () => {
    expect(s.maxWeeks).toBe(104)
    expect(s.intro.cards).toHaveLength(4)
    expect(s.events.length).toBeGreaterThanOrEqual(40)
    expect(scenarioCatalogue().find((x) => x.id === s.id)).toMatchObject({
      category: 'leisure',
      tags: ['Events', 'Bookings'],
      modes: ['long'],
    })
    for (const seg of s.segments)
      for (const bucket of s.experiments.interview.buckets)
        expect(s.interviewQuotes[seg.id]![bucket.id]).toHaveLength(10)
  })
  it('shares one hall, closes it for insulation and charges only extra weekday resets', () => {
    expect(Object.keys(l.products)).toEqual(['fit_out'])
    for (const id of ['conference_package', 'wedding_package', 'late_events'])
      expect(b.products[id]!.capacityOf).toBe('fit_out')
    expect(l.buildOut!.fit_out!.weeks).toBe(10)
    expect(l.buildOut!.sound_insulation!.closes).toEqual(['fit_out'])
    expect(l.slotUpgrades!.split_days).toEqual({
      product: 'fit_out',
      slot: 'weekday',
      additional: 4,
      unitCostCents: 40000,
    })
  })
  it('makes furniture hire, late requests, refunds and catering real configured choices', () => {
    expect(b.assets!.dinner_furniture!.share).toMatchObject({ capacity: 1, unitCents: 90000 })
    expect(
      s.events
        .find((e) => e.id === 'dinner_furniture')!
        .choices.some((c) => c.effects.some((e) => e.type === 'asset' && e.option === 'share')),
    ).toBe(true)
    expect(b.products.late_events!.ownDemand).toBeGreaterThan(0)
    expect(b.products.late_events!.requires).toBe('late_licence')
    expect(l.strictKeepsDeposit).toBe(true)
    expect(l.extras!.caterer_list!.segments.weddings).toMatchObject({
      grossCents: 400000,
      revenueShare: 0.1,
    })
    expect(l.permits!.roof_terrace!.refundCents).toBeLessThan(b.products.roof_terrace!.oneOffCents)
    expect(l.noise!.restrictAt).toBe(4)
  })
  it('offers conference breakout rooms without creating a second event hall', () => {
    expect(b.products.lower_floor).toBeUndefined()
    expect(s.officeStages[1]).toMatchObject({
      oneOffCents: 3500000,
      monthlyCents: 550000,
      segmentFactors: { companies: 1.45 },
    })
    expect(s.events.find((e) => e.id === 'breakout_floor')!.text).toContain(
      'not create a second independently bookable',
    )
  })
})
