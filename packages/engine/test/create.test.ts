import { describe, expect, it } from 'vitest'
import { createGame } from '../src/index'
import { kantino } from './helpers'

describe('createGame', () => {
  const scenario = kantino()

  it('sets the starting values from the scenario', () => {
    const s = createGame(scenario, 'start')
    expect(s.week).toBe(1)
    expect(s.status).toBe('running')
    expect(s.company.cashCents).toBe(1_500_000)
    expect(s.founder.savingsCents).toBe(1_200_000)
    expect(s.founder.energy).toBe(80)
    expect(s.company.uiStage).toBe('scrappy')
    expect(Object.keys(s.knowledge)).toEqual(['small_offices', 'coworking', 'medical'])
  })

  it('gives every run exactly one viable, one mediocre, and one trap segment', () => {
    for (let i = 0; i < 50; i++) {
      const roles = Object.values(createGame(scenario, `roles-${i}`).hidden.segments).map(
        (h) => h.roleId,
      )
      expect(roles.sort()).toEqual(['mediocre', 'trap', 'viable'])
    }
  })

  it('puts the trap in every segment across seeds', () => {
    const trapSegments = new Set<string>()
    for (let i = 0; i < 60; i++) {
      const hidden = createGame(scenario, `trap-${i}`).hidden.segments
      for (const [id, h] of Object.entries(hidden)) if (h.roleId === 'trap') trapSegments.add(id)
    }
    expect([...trapSegments].sort()).toEqual(['coworking', 'medical', 'small_offices'])
  })

  it('draws hidden values inside their scenario ranges', () => {
    for (let i = 0; i < 30; i++) {
      const s = createGame(scenario, `ranges-${i}`)
      for (const seg of scenario.segments) {
        const h = s.hidden.segments[seg.id]!
        const role = scenario.roles.find((r) => r.id === h.roleId)!
        expect(h.size).toBeGreaterThanOrEqual(seg.size.min)
        expect(h.size).toBeLessThanOrEqual(seg.size.max)
        expect(Number.isInteger(h.wtpCents)).toBe(true)
        expect(h.wtpCents).toBeGreaterThanOrEqual(seg.wtpCents.min)
        expect(h.wtpCents).toBeLessThanOrEqual(seg.wtpCents.max)
        expect(h.pain).toBeGreaterThanOrEqual(role.pain.min)
        expect(h.pain).toBeLessThanOrEqual(role.pain.max)
        expect(h.politeness).toBeGreaterThanOrEqual(role.politeness.min)
        expect(h.politeness).toBeLessThanOrEqual(role.politeness.max)
        expect(h.mustHave).toEqual(seg.mustHave)
        for (const [ch, r] of Object.entries(seg.channelResponse)) {
          const v = h.channelResponse[ch as keyof typeof h.channelResponse]
          expect(v).toBeGreaterThanOrEqual(r.min)
          expect(v).toBeLessThanOrEqual(r.max)
        }
      }
    }
  })

  it('does not mutate the scenario', () => {
    const before = JSON.stringify(scenario)
    createGame(scenario, 'pure')
    expect(JSON.stringify(scenario)).toBe(before)
  })
})
