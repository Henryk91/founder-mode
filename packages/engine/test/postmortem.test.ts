import { describe, expect, it } from 'vitest'
import { buildPostMortem, getView, shutDown, type GameState } from '../src/index'
import { informedPlan, newGame, play, plan, quietKantino, richKantino } from './helpers'

/** A run that does nothing until the money runs out. */
const idleBankrupt = () => play(newGame('pm-idle', quietKantino()), 80, () => plan())

/** The segment with a given role in this run. */
const segmentWithRole = (s: GameState, role: string) =>
  Object.entries(s.hidden.segments).find(([, h]) => h.roleId === role)![0]

describe('post-mortem', () => {
  it('is refused while the run is still going', () => {
    expect(() => buildPostMortem(newGame())).toThrow(/ended/)
  })

  it('does not change the state it reads', () => {
    const s = idleBankrupt()
    const before = JSON.stringify(s)
    buildPostMortem(s)
    expect(JSON.stringify(s)).toBe(before)
  })

  it('names a cause and a chain that ends with the ending, for a run without customers', () => {
    const s = idleBankrupt()
    expect(s.ending).toBe('bankrupt')
    const pm = buildPostMortem(s)
    expect(pm.cause.id).toBe('bankrupt_no_customers')
    expect(pm.chain.at(-1)).toMatchObject({ kind: 'ending', ending: 'bankrupt', week: s.week })
    expect(pm.chain.some((c) => c.kind === 'savings_empty')).toBe(true)
    expect(pm.chain.filter((c) => c.week < s.week).length).toBeLessThanOrEqual(3)
    expect(pm.suggestions.at(-1)).toBe('sample_sizes')
  })

  it('reveals the truth of every market next to the evidence', () => {
    const s = play(newGame('pm-truth', quietKantino()), 80, (st) =>
      plan({ interviews: st.week <= 2 ? { small_offices: 3, coworking: 3, medical: 3 } : {} }),
    )
    const pm = buildPostMortem(s)
    expect(pm.markets.map((m) => m.segmentId)).toEqual(['small_offices', 'coworking', 'medical'])
    expect(new Set(pm.markets.map((m) => m.roleId))).toEqual(
      new Set(['viable', 'mediocre', 'trap']),
    )
    for (const m of pm.markets) {
      expect(m.interviews).toBe(6)
      expect(m.saidBucketId).not.toBeNull()
      expect(m.wtpCents % 1000).toBe(0)
      expect(m.mustHave.length).toBeGreaterThan(0)
    }
  })

  it('lists polite interviews in the trap as a misread that more interviews would not fix', () => {
    const base = newGame('pm-polite', quietKantino())
    const trap = segmentWithRole(base, 'trap')
    const s = play(base, 80, (st) => plan({ interviews: st.week <= 3 ? { [trap]: 5 } : {} }))
    const pm = buildPostMortem(s)
    const misread = pm.misreads.find((m) => m.kind === 'interviews_high' && m.segmentId === trap)
    expect(misread).toMatchObject({ cause: 'politeness', interviewsNeeded: null })
  })

  it('shows every step of the final week in the chain', () => {
    const s = play(newGame('pm-final', quietKantino()), 80, () => plan())
    const pm = buildPostMortem(s)
    const finalSteps = pm.chain.filter((c) => c.week === s.week)
    expect(finalSteps.at(-1)?.kind).toBe('ending')
  })

  it('counts hours by activity and they add up to the hours played', () => {
    const s = play(newGame('pm-hours', quietKantino()), 80, (st) =>
      plan({
        interviews: st.week <= 2 ? { coworking: 2 } : {},
        build: st.week <= 3 ? { basic_ordering: 10 } : {},
        restHours: 5,
      }),
    )
    const pm = buildPostMortem(s)
    expect(pm.hours.byActivity.learning).toBe(2 * 2 * s.scenario.experiments.interview.hours)
    expect(pm.hours.byActivity.building).toBe(30)
    expect(pm.hours.byActivity.rest).toBe(5 * s.ledger.length)
    const sum = Object.values(pm.hours.byActivity).reduce((a, b) => a + b, 0)
    expect(pm.hours.total).toBe(sum)
  })

  it('logs the odds of sales rolls, and luck compares them with what happened', () => {
    const s = play(newGame('pm-luck', richKantino()), 60, informedPlan)
    const odds = s.eventLog.filter((e) => e.kind === 'odds')
    expect(odds.some((o) => o.kind === 'odds' && o.odds === 'leads')).toBe(true)
    expect(odds.some((o) => o.kind === 'odds' && o.odds === 'demo')).toBe(true)
    for (const o of odds) {
      if (o.kind !== 'odds') continue
      expect(o.expected).toBeGreaterThanOrEqual(0)
      expect(o.observed).toBeGreaterThanOrEqual(0)
    }
    const pm = buildPostMortem(s)
    expect(pm.luck.items.length).toBeLessThanOrEqual(4)
    expect(Number.isFinite(pm.luck.netCustomers)).toBe(true)
  })

  it('names a shut down as the cause when the player closes the company', () => {
    const s = shutDown(play(newGame('pm-shut'), 5))
    const pm = buildPostMortem(s)
    expect(pm.cause.id).toBe('shut_down')
    expect(pm.chain.at(-1)).toMatchObject({ kind: 'ending', ending: 'shut_down' })
    expect(pm.cause.runwayWeeks).toBeGreaterThan(0)
  })

  it('never puts post-mortem data in the player view', () => {
    const s = idleBankrupt()
    const view = JSON.stringify(getView(s))
    expect(view).not.toContain('roleId')
    expect(view).not.toContain('wtpCents')
    expect(view).not.toContain('"odds"')
  })
})
