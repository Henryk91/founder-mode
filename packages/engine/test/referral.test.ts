import { describe, expect, it } from 'vitest'
import type { Scenario } from '@founder-mode/content'
import { buildPostMortem, endWeek, getView, shutDown, type GameState } from '../src/index'
import { applyReferrals, referralChance } from '../src/systems/sales'
import { customer } from './helpers2'
import { kantino, newGame, plan, quietKantino } from './helpers'
import { Rng } from '../src/rng'

/** Quiet Kantino with referrals switched on at the given values. */
function referring(chancePerFit: number, chancePerBug = 0, demoBonus = 0): Scenario {
  const s = quietKantino()
  return { ...s, sales: { ...s.sales, referral: { chancePerFit, chancePerBug, demoBonus } } }
}

/** A game in week 5 where every feature has shipped and `n` small offices pay since week 2. */
function withCustomers(scenario: Scenario, n: number, seed = 'ref'): GameState {
  const s = newGame(seed, scenario)
  return {
    ...s,
    week: 5,
    product: {
      ...s.product,
      features: s.product.features.map((f) => ({
        ...f,
        progressHours: scenario.features.find((x) => x.id === f.id)!.buildHours,
        shippedWeek: 1,
      })),
    },
    customers: Array.from({ length: n }, (_, i) => customer(`c${i + 1}`, 'small_offices', 2)),
  }
}

describe('referrals', () => {
  it('are off in Kantino: no chance, no roll, no lead', () => {
    const s = withCustomers(kantino(), 5)
    expect(kantino().sales.referral).toEqual({ chancePerFit: 0, chancePerBug: 0, demoBonus: 0 })
    expect(referralChance(s, 'small_offices')).toBe(0)
    const rng = new Rng(s.rng)
    const before = rng.state()
    const out = applyReferrals(s, rng)
    expect(out.state).toBe(s)
    expect(out.entries).toEqual([])
    expect(rng.state()).toEqual(before)
  })

  it('grow with fit and shrink with every open bug, never below zero', () => {
    const s = withCustomers(referring(0.08, 0.01), 1)
    const clean = referralChance({ ...s, product: { ...s.product, bugs: 0 } }, 'small_offices')
    const buggy = referralChance({ ...s, product: { ...s.product, bugs: 2 } }, 'small_offices')
    expect(clean).toBeGreaterThan(0)
    expect(clean).toBeLessThanOrEqual(0.08)
    // Two bugs take 0.02 off, and lower quality and with it fit a little more.
    expect(buggy).toBeLessThan(clean - 0.02 + 1e-12)
    expect(buggy).toBeGreaterThan(0)
    expect(referralChance({ ...s, product: { ...s.product, bugs: 50 } }, 'small_offices')).toBe(0)
    // Without the market's must haves there is no fit, so no referral.
    const bare = newGame('bare', referring(0.08))
    expect(referralChance(bare, 'small_offices')).toBe(0)
  })

  it('bring leads in the customer’s market, marked with who recommended them', () => {
    const s = withCustomers(referring(1), 3)
    const out = endWeek(s, plan()).state
    const referred = out.leads.filter((l) => l.source === 'referral')
    expect(referred.length).toBeGreaterThan(0)
    for (const l of referred) {
      expect(l.segmentId).toBe('small_offices')
      expect(l.referredBy).toMatch(/^c\d$/)
    }
    const view = getView(out).leads.find((l) => l.source === 'referral')!
    expect(view.referredBy).toMatch(/^Kunde c\d$/)
    const report = endWeek(s, plan()).report
    const entry = report.entries.find((e) => e.kind === 'referral_lead')
    expect(entry).toMatchObject({ kind: 'referral_lead', segmentId: 'small_offices' })
    expect(out.eventLog.some((e) => e.kind === 'odds' && e.odds === 'referrals')).toBe(true)
  })

  it('come only from customers paying since an earlier week, not churned ones', () => {
    const s = withCustomers(referring(1), 0)
    const fresh = { ...s, customers: [customer('new', 'small_offices', 5)] }
    const gone = { ...s, customers: [{ ...customer('gone', 'small_offices', 2), churnedWeek: 4 }] }
    expect(applyReferrals(fresh, new Rng(s.rng)).entries).toEqual([])
    expect(applyReferrals(gone, new Rng(s.rng)).entries).toEqual([])
  })

  it('make a referred lead keener to ask for a demo', () => {
    // Same seed, same leads; only the bonus differs, so referred leads ask for demos more often.
    const asked = (bonus: number) => {
      let total = 0
      for (let i = 0; i < 30; i++) {
        let s = withCustomers(referring(1, 0, bonus), 4, `bonus-${i}`)
        s = endWeek(s, plan()).state
        const next = endWeek(s, plan()).state
        total += next.leads.filter((l) => l.source === 'referral' && l.stage === 'demo').length
      }
      return total
    }
    expect(asked(3)).toBeGreaterThan(asked(0))
  })

  it('count as their own source in the post-mortem', () => {
    const s = endWeek(withCustomers(referring(1), 3), plan()).state
    const pm = buildPostMortem(shutDown(s))
    const row = pm.sources.find((x) => x.key === 'referral')
    expect(row?.leads).toBeGreaterThan(0)
  })
})
