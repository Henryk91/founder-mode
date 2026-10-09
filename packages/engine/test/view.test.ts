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
  'payWeeks',
  'teamSkills',
  'trueSkill',
  'experiments',
  'effects',
  'chance',
  'p',
  'trials',
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

  it('contains no hidden data through searches, hires, experiments, invoices and messages', () => {
    let s = newGame('boundary-all')
    const seg = s.scenario.segments.map((x) => x.id)
    for (let i = 0; i < 40 && s.status === 'running'; i++) {
      const v = getView(s)
      const p = plan({
        interviews: i < 3 ? { [seg[i % 3]!]: 2 } : {},
        landing: i === 1 ? { [seg[0]!]: 30_000 } : {},
        outreach: { [seg[1]!]: { channel: 'in_person', hours: 20 } },
        searchRole: i === 2 ? 'developer' : null,
        hire: v.team.candidates[0]?.id ?? null,
        chase: v.invoices
          .filter((x) => x.canChase)
          .map((x) => x.id)
          .slice(0, 2),
        demos: v.leads
          .filter((l) => l.canBookDemo)
          .map((l) => l.id)
          .slice(0, 3),
      })
      const r = endWeek(s, p)
      expectNoHidden(r.state, r.report)
      expectNoHidden(r.state, getView(r.state))
      s = r.state
    }
    expect(s.team.members.length + s.team.candidates.length).toBeGreaterThan(0)
    expect(s.inbox.length).toBeGreaterThan(0)
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
    expect(v.company.monthlyFixedCostsCents).toBe(40_500)
    expect(v.history).toEqual([
      {
        week: 1,
        cashCents: 900_000,
        savingsCents: 1_357_500,
        monthlyRevenueCents: 0,
        customers: 0,
        runwayWeeks: v.company.runwayWeeks,
      },
    ])
  })

  it('records revenue, customers and runway at the end of every week, after churn', () => {
    const s = play(newGame(), 30, scriptedPlan)
    const v = getView(s)
    const last = v.history.at(-1)!
    expect(last.customers).toBe(v.customers.length)
    expect(last.monthlyRevenueCents).toBe(v.monthlyRevenueCents)
    expect(last.runwayWeeks).toBe(v.company.runwayWeeks)
  })

  it('names the next month end and how each message looks', () => {
    expect(getView(newGame()).company.nextMonthEndWeek).toBe(4)
    const s = play(newGame(), 4)
    expect(getView(s).company.nextMonthEndWeek).toBe(8)
    const looks = ['letter', 'note', 'official']
    for (const m of getView(play(newGame(), 20)).inbox) expect(looks).toContain(m.look)
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
