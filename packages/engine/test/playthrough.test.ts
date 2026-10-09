import { describe, expect, it } from 'vitest'
import { endWeek, getView, replay, toSave, validatePlan, type GameState } from '../src/index'
import { deepFreeze, informedPlan, kantino, newGame, play } from './helpers'

const FORBIDDEN_KEYS = ['hidden', 'rng', 'pain', 'wtpCents', 'mustHave', 'channelResponse']

function expectClean(state: GameState, value: unknown) {
  const json = JSON.stringify(value)
  for (const k of FORBIDDEN_KEYS) expect(json).not.toContain(`"${k}"`)
  for (const h of Object.values(state.hidden.segments)) {
    expect(json).not.toContain(String(h.pain))
    expect(json).not.toContain(String(h.wtpCents))
  }
}

describe('a full run with product and sales', () => {
  it('wins customers and revenue, replays exactly, and never mutates its input', () => {
    let s = deepFreeze(newGame('phase-2-run'))
    let revenue = 0
    while (s.status === 'running') {
      const p = informedPlan(s)
      expect(validatePlan(s, p)).toEqual([])
      const r = endWeek(s, p)
      revenue += r.report.ledger.revenueCents
      expectClean(r.state, r.report)
      expectClean(r.state, getView(r.state))
      s = deepFreeze(r.state)
    }
    expect(s.week).toBe(78)
    expect(s.customers.length).toBeGreaterThan(0)
    expect(revenue).toBeGreaterThan(0)
    expect(s.leads.some((l) => l.stage === 'paying')).toBe(true)
    expect(replay(kantino(), toSave(s))).toEqual(s)
    expect(replay(kantino(), JSON.parse(JSON.stringify(toSave(s))))).toEqual(s)
  })

  it('keeps cash, savings, hours and product invariants over many runs', () => {
    for (let run = 0; run < 60; run++) {
      let s = newGame(`inv-${run}`)
      while (s.status === 'running') {
        const before = s
        const r = endWeek(s, informedPlan(s))
        s = r.state
        const l = r.report.ledger
        expect(s.company.cashCents).toBe(
          before.company.cashCents +
            l.revenueCents -
            l.fixedCostsCents -
            l.founderDrawCents +
            l.transferCents +
            l.autoTransferCents,
        )
        expect(r.report.plannedHours).toBeLessThanOrEqual(s.founder.maxHoursPerWeek)
        expect(s.product.bugs).toBeGreaterThanOrEqual(0)
        expect(s.product.quality).toBeGreaterThanOrEqual(0)
        expect(s.product.quality).toBeLessThanOrEqual(100)
        expect(Number.isFinite(s.founder.skills.selling)).toBe(true)
        expect(s.founder.skills.selling).toBeLessThanOrEqual(0.8 + 1e-9)
        for (const f of s.product.features) {
          const def = s.scenario.features.find((x) => x.id === f.id)!
          expect(f.progressHours).toBeLessThanOrEqual(def.buildHours)
        }
        expect(new Set(s.leads.map((x) => x.id)).size).toBe(s.leads.length)
        expect(new Set(s.leads.map((x) => x.name)).size).toBe(s.leads.length)
        for (const c of s.customers) expect(Number.isInteger(c.sinceWeek)).toBe(true)
      }
    }
  })

  it('does not convert anything for a founder who never builds', () => {
    const s = play(newGame('no-build'), 40, (x) => ({
      ...informedPlan(x),
      build: {},
      outreach: { small_offices: { channel: 'cold_email', hours: 30 } },
      demos: x.leads
        .filter((l) => l.stage === 'demo' && l.silentSinceWeek === null)
        .slice(0, 5)
        .map((l) => l.id),
    }))
    expect(s.customers).toEqual([])
    expect(s.leads.length).toBeGreaterThan(0)
  })
})
