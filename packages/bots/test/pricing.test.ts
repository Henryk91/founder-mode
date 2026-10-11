import { loadScenario } from '@founder-mode/content'
import { createGame, getView, type PlayerView, type WeekReport } from '@founder-mode/engine'
import { describe, expect, it } from 'vitest'
import { FixedPrice, PriceRecipe, PriceSearch } from '../src/pricing'

const base = getView(createGame(loadScenario('kantino'), 'pricing'))
const MARKET = 'coworking'

/** A view with `n` leads in trial in the market, and a report that ends them as given. */
function week(
  week: number,
  ends: ('won' | 'declined_price' | 'declined')[],
  churnOverPrice = false,
): { view: PlayerView; report: WeekReport } {
  const leads = ends.map((_, i) => ({
    ...({} as PlayerView['leads'][number]),
    id: `lead_${week}_${i}`,
    name: `Lead ${i}`,
    segmentId: MARKET,
    stage: 'trial' as const,
  }))
  const entries: WeekReport['entries'] = ends.map((change, i) => ({
    kind: 'lead_update',
    change,
    leadId: `lead_${week}_${i}`,
    name: `Lead ${i}`,
    segmentId: MARKET,
  }))
  if (churnOverPrice)
    entries.push({
      kind: 'customer_churned',
      customerId: 'customer_1',
      name: 'Old Customer',
      segmentId: MARKET,
      overPrice: true,
    })
  return {
    view: { ...base, week, leads },
    report: { ...({} as WeekReport), week, entries },
  }
}

describe('pricers', () => {
  it('search: raises after a clean window, lowers when half said no over the price', () => {
    const p = new PriceSearch({ stepShare: 0.2, window: 3, tooMany: 0.5 })
    const start = p.price(base)
    const w1 = week(3, ['won', 'won', 'won'])
    p.observe(w1.view, w1.report, MARKET)
    expect(p.price(base)).toBe(Math.round((start * 1.2) / 1000) * 1000)
    const w2 = week(4, ['won', 'declined_price', 'declined_price'])
    p.observe(w2.view, w2.report, MARKET)
    expect(p.price(base)).toBe(start)
  })

  it('search: keeps the price after a window with a single no over the price', () => {
    const p = new PriceSearch({ stepShare: 0.2, window: 3, tooMany: 0.5 })
    const start = p.price(base)
    const w = week(3, ['won', 'won', 'declined_price'])
    p.observe(w.view, w.report, MARKET)
    expect(p.price(base)).toBe(start)
  })

  it('search: plain nos and other markets do not count, a cancellation over the price lowers', () => {
    const p = new PriceSearch({ stepShare: 0.2, window: 3, tooMany: 0.5 })
    const start = p.price(base)
    const w = week(3, ['declined', 'declined', 'declined'])
    p.observe(w.view, w.report, MARKET)
    p.observe(w.view, w.report, 'medical')
    expect(p.price(base)).toBe(start)
    const c = week(4, [], true)
    p.observe(c.view, c.report, MARKET)
    expect(p.price(base)).toBeLessThan(start)
  })

  it('search: tries a ceiling again only after two clean windows below it', () => {
    const p = new PriceSearch({ stepShare: 0.2, window: 3, tooMany: 0.5 })
    const start = p.price(base)
    const clean = (w: number) => week(w, ['won', 'won', 'won'])
    let w = clean(3)
    p.observe(w.view, w.report, MARKET)
    const high = p.price(base)
    w = week(4, ['declined_price', 'declined_price', 'won'])
    p.observe(w.view, w.report, MARKET)
    expect(p.price(base)).toBe(start)
    w = clean(5)
    p.observe(w.view, w.report, MARKET)
    expect(p.price(base)).toBe(start)
    w = clean(6)
    p.observe(w.view, w.report, MARKET)
    expect(p.price(base)).toBe(high)
  })

  it('recipe: a step every few weeks until the first too expensive, then one back for good', () => {
    const r = new PriceRecipe(0.2, 3)
    const start = base.company.priceCentsPerMonth
    expect(r.price({ ...base, week: 1 })).toBe(start)
    const first = r.price({ ...base, week: 3 })
    expect(first).toBe(Math.round((start * 1.2) / 1000) * 1000)
    expect(r.price({ ...base, week: 5 })).toBe(first)
    const second = r.price({ ...base, week: 6 })
    expect(second).toBeGreaterThan(first)
    const w = week(6, ['declined_price'])
    r.observe(w.view, w.report)
    expect(r.price({ ...base, week: 7 })).toBe(first)
    expect(r.price({ ...base, week: 40 })).toBe(first)
  })

  it('fixed: a multiple of the default from the first week', () => {
    expect(new FixedPrice(2).price(base)).toBe(base.company.priceCentsPerMonth * 2)
  })
})
