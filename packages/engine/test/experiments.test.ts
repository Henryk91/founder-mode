import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import { Rng } from '../src/rng'
import { bucketFor, runInterviews } from '../src/systems/experiments'
import type { GameState } from '../src/types'
import { newGame, plan } from './helpers'

const segmentWithRole = (s: GameState, role: string) =>
  Object.entries(s.hidden.segments).find(([, h]) => h.roleId === role)![0]

describe('interviews', () => {
  it('maps observed values to buckets at the scenario thresholds', () => {
    const s = newGame()
    expect(bucketFor(s, -0.3)).toBe('not_a_problem')
    expect(bucketFor(s, 0.2)).toBe('mild')
    expect(bucketFor(s, 0.59)).toBe('noticeable')
    expect(bucketFor(s, 0.79)).toBe('painful')
    expect(bucketFor(s, 1.4)).toBe('urgent')
  })

  it('stores evidence, raises the skill, and logs the roll', () => {
    const s = newGame()
    const { state, report } = endWeek(s, plan({ interviews: { medical: 3 } }))
    expect(state.knowledge.medical).toHaveLength(3)
    expect(state.founder.skills.interviewing).toBeCloseTo(0.16)
    expect(state.eventLog).toHaveLength(3)
    expect(report.interviews).toHaveLength(3)
    expect(getView(state).segments.find((x) => x.id === 'medical')!.interviews).toHaveLength(3)
    for (const i of report.interviews) expect(i.quote.length).toBeGreaterThan(0)
  })

  it('caps the interviewing skill', () => {
    const s = newGame()
    // 0.10 + 35 x 0.02 would be 0.80; 36 interviews over two weeks must stop there.
    const week1 = endWeek(s, plan({ interviews: { coworking: 32 } })).state
    expect(week1.founder.skills.interviewing).toBeCloseTo(0.74)
    const week2 = endWeek(week1, plan({ interviews: { coworking: 4 } })).state
    expect(week2.founder.skills.interviewing).toBe(0.8)
  })

  it('only ever mentions must have features of that segment', () => {
    const s = newGame('mentions')
    const rng = new Rng(s.rng)
    const { outcomes } = runInterviews(s, plan({ interviews: { small_offices: 200 } }), rng)
    const mentioned = outcomes.map((o) => o.evidence.mentionedFeatureId).filter((x) => x !== null)
    expect(mentioned.length).toBeGreaterThan(0)
    for (const id of mentioned) expect(s.hidden.segments.small_offices!.mustHave).toContain(id)
  })

  it('makes the viable segment sound better than the trap on average, but the trap still sounds polite', () => {
    const s = newGame('signal')
    const viable = segmentWithRole(s, 'viable')
    const trap = segmentWithRole(s, 'trap')
    const { outcomes } = runInterviews(
      s,
      plan({ interviews: { [viable]: 300, [trap]: 300 } }),
      new Rng(s.rng),
    )
    const mean = (seg: string) => {
      const xs = outcomes.filter((o) => o.event.segmentId === seg).map((o) => o.event.observed)
      return xs.reduce((a, b) => a + b, 0) / xs.length
    }
    expect(mean(viable)).toBeGreaterThan(mean(trap) + 0.2)
    // Politeness lifts the trap above its true pain.
    expect(mean(trap)).toBeGreaterThan(s.hidden.segments[trap]!.pain)
  })

  it('does not touch the rng or state when no interviews are planned', () => {
    const s = newGame()
    const rng = new Rng(s.rng)
    const result = runInterviews(s, plan(), rng)
    expect(result.state).toBe(s)
    expect(rng.state()).toEqual(s.rng)
  })
})
