import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import type { GameState } from '../src/types'
import { newGame, play, plan, scriptedPlan } from './helpers'

// Keys that only exist on hidden or internal data. None may appear in what the UI receives.
const FORBIDDEN_KEYS = [
  'hidden',
  'rng',
  'roleId',
  'pain',
  'politeness',
  'wtpCents',
  'mustHave',
  'channelResponse',
  'paymentDelayDaysMean',
  'neverPaysShare',
  'size',
  'skills',
  'expected',
  'observed',
  'eventLog',
  'actionLog',
  'quoteIndex',
  'mentionBase',
  'mentionPerPain',
  'noiseSd',
]

function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => keysOf(v, out))
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k)
      keysOf(v, out)
    }
  }
  return out
}

function expectNoHidden(state: GameState, value: unknown) {
  const json = JSON.stringify(value)
  const keys = keysOf(JSON.parse(json))
  for (const k of FORBIDDEN_KEYS) expect(keys, `leaked key ${k}`).not.toContain(k)
  for (const h of Object.values(state.hidden.segments)) {
    expect(json).not.toContain(String(h.pain))
    expect(json).not.toContain(String(h.politeness))
  }
}

describe('hidden boundary', () => {
  it('the view of a new game contains no hidden data', () => {
    const s = newGame()
    expectNoHidden(s, getView(s))
  })

  it('views and week reports over a whole run contain no hidden data', () => {
    let s = newGame('boundary')
    for (let i = 0; i < 20; i++) {
      const r = endWeek(s, scriptedPlan(s))
      expectNoHidden(r.state, r.report)
      expectNoHidden(r.state, getView(r.state))
      s = r.state
    }
    expect(getView(s).segments.some((x) => x.interviews.length > 0)).toBe(true)
  })

  it('shows what the player observed', () => {
    const s = endWeek(newGame(), plan({ interviews: { coworking: 2 } })).state
    const v = getView(s)
    expect(v.week).toBe(2)
    expect(v.segments.map((x) => x.name)).toEqual([
      'Small offices',
      'Coworking spaces',
      'Medical practices',
    ])
    const interviews = v.segments.find((x) => x.id === 'coworking')!.interviews
    expect(interviews).toHaveLength(2)
    expect(interviews[0]!.bucketName.length).toBeGreaterThan(0)
    expect(v.company.monthlyFixedCostsCents).toBe(27_000)
    expect(v.history).toEqual([{ week: 1, cashCents: 1_500_000, savingsCents: 1_155_000 }])
  })

  it('is a plain serialisable object', () => {
    const v = getView(play(newGame(), 10))
    expect(JSON.parse(JSON.stringify(v))).toEqual(v)
  })

  it('remembers the outreach channel last picked for each segment', () => {
    let s = newGame()
    expect(getView(s).segments.every((x) => x.lastChannel === null)).toBe(true)
    s = endWeek(s, plan({ outreach: { coworking: { channel: 'in_person', hours: 10 } } })).state
    s = endWeek(s, plan({ outreach: { medical: { channel: 'phone', hours: 0 } } })).state
    s = endWeek(s, plan()).state
    const channel = (id: string) => getView(s).segments.find((x) => x.id === id)!.lastChannel
    expect(channel('coworking')).toBe('in_person')
    expect(channel('medical')).toBe('phone')
    expect(channel('small_offices')).toBeNull()
  })
})
