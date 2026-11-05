import { describe, expect, it } from 'vitest'
import {
  endWeek,
  getView,
  migrateSave,
  replay,
  toSave,
  validatePlan,
  type GameState,
  type SaveFile,
  type WeekPlan,
} from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { effectiveHours, recentOutreach } from '../src/systems/sales'
import { kantino, newGame, plan, richKantino } from './helpers'

/** The founder's hours as they counted for finding leads in the week just played, per key. */
const counted = (s: GameState, key: string): number => {
  const last = s.outreachWindow?.at(-1)
  return last && last.week === s.week - 1 ? (last.hours[key] ?? 0) : 0
}

const KEY = 'coworking/in_person'
const out = (hours: number): Partial<WeekPlan> => ({
  outreach: { coworking: { in_person: hours } },
})

/** A random history of outreach on the coworking market's in person channel. */
function history(seed: string, weeks: number): GameState {
  const rng = new Rng(seedRng(seed))
  let s = newGame(seed, richKantino())
  for (let w = 0; w < weeks; w++) s = endWeek(s, plan(out(rng.int(0, 45)))).state
  return s
}

describe('plan 7: channel tiredness never punishes more work (M1)', () => {
  it('within a week: with the same history, more hours never count for less', () => {
    const { saturationHours, saturationWeeks, saturatedFactor } = kantino().sales
    const limit = saturationHours * saturationWeeks
    for (let i = 0; i < 40; i++) {
      const s = history(`within-${i}`, 1 + (i % 6))
      const before = recentOutreach(s).get(KEY) ?? 0
      let last = -1
      for (let h = 0; h <= 50; h += 5) {
        const engine = counted(endWeek(s, plan(out(h))).state, KEY)
        expect(engine).toBeCloseTo(effectiveHours(before, h, limit, saturatedFactor), 10)
        expect(engine).toBeGreaterThanOrEqual(last)
        last = engine
      }
    }
  })

  it('within a week: holds for the formula over many random histories', () => {
    const rng = new Rng(seedRng('formula'))
    for (let i = 0; i < 2000; i++) {
      const before = rng.next() * 80
      const limit = 12 + rng.next() * 60
      const factor = rng.next()
      const a = rng.next() * 60
      const b = a + rng.next() * 30
      expect(effectiveHours(before, b, limit, factor)).toBeGreaterThanOrEqual(
        effectiveHours(before, a, limit, factor),
      )
    }
  })

  it('steady state: more hours every week never count for fewer per week', () => {
    let last = -1
    for (let h = 0; h <= 50; h += 2) {
      let s = newGame(`steady-${h}`, richKantino())
      let sum = 0
      for (let w = 1; w <= 40; w++) {
        s = endWeek(s, plan(out(h))).state
        if (w > 20) sum += counted(s, KEY)
      }
      const perWeek = sum / 20
      expect(perWeek).toBeGreaterThanOrEqual(last - 1e-9)
      last = perWeek
    }
    // The spec's figures with the 60 week values: 12 at 12 h, 13 at 20 h. The window settles
    // slowly (it swings around the steady value and shrinks by about a sixth a week).
    const steady = (h: number) => {
      let s = newGame('steady', richKantino())
      for (let w = 0; w < 59; w++) s = endWeek(s, plan(out(h))).state
      return counted(s, KEY)
    }
    expect(steady(12)).toBeCloseTo(12, 5)
    expect(steady(20)).toBeCloseTo(13, 2)
    expect(steady(30)).toBeCloseTo(14.25, 2)
  })
})

describe('plan 7: several channels per market in one week', () => {
  it('finds leads on every channel planned, each with its own window', () => {
    let s = newGame('several', richKantino())
    const both: WeekPlan = plan({ outreach: { coworking: { phone: 10, in_person: 20 } } })
    expect(validatePlan(s, both)).toEqual([])
    const r = endWeek(s, both)
    const lines = r.report.entries.filter((e) => e.kind === 'new_leads')
    expect(lines.map((e) => e.kind === 'new_leads' && e.channel)).toEqual(['phone', 'in_person'])
    s = r.state
    expect(recentOutreach(s).get('coworking/phone')).toBe(10)
    expect(recentOutreach(s).get('coworking/in_person')).toBe(20)
    // A lead remembers the channel that found it.
    for (const l of s.leads) expect(['phone', 'in_person']).toContain(l.channel)
  })

  it('counts every channel in the founder hours and rejects unknown channels', () => {
    const s = newGame('hours')
    const bad = plan({ outreach: { coworking: { fax: 3 } as never } })
    expect(validatePlan(s, bad).map((i) => i.code)).toContain('invalid_channel')
    const many = plan({ outreach: { coworking: { phone: 40, in_person: 40 } } })
    expect(validatePlan(s, many).map((i) => i.code)).toContain('too_many_hours')
  })

  it('shows each channel as fresh, tiring or worn out for the coming week', () => {
    let s = newGame('words', richKantino())
    const word = (st: GameState, c: 'phone' | 'in_person' | 'cold_email') =>
      getView(st).segments.find((x) => x.id === 'coworking')!.channelTiredness[c]
    expect(word(s, 'in_person')).toBe('fresh')
    s = endWeek(s, plan({ outreach: { coworking: { phone: 10, in_person: 20 } } })).state
    // 36 h of budget over the window: 10 is under half, 20 over half.
    expect(word(s, 'phone')).toBe('fresh')
    expect(word(s, 'in_person')).toBe('tiring')
    expect(word(s, 'cold_email')).toBe('fresh')
    s = endWeek(s, plan({ outreach: { coworking: { in_person: 20 } } })).state
    expect(word(s, 'in_person')).toBe('worn_out')
    // Two quiet weeks later the window is empty again.
    s = endWeek(endWeek(s, plan()).state, plan()).state
    expect(word(s, 'in_person')).toBe('fresh')
  })
})

describe('plan 7: saves', () => {
  /** Plans of the shape before engine 0.15.0: one channel per market. */
  const oldPlan = (w: number) => ({
    ...plan({ interviews: w === 1 ? { coworking: 2 } : {} }),
    outreach: w > 1 ? { coworking: { channel: 'in_person', hours: 12 + w } } : {},
  })

  it('converts an old action log and replays it without errors', () => {
    const fresh = newGame('old-save', richKantino())
    const old: SaveFile = {
      ...toSave(fresh),
      actions: Array.from({ length: 10 }, (_, i) => ({
        type: 'endWeek' as const,
        week: i + 1,
        plan: oldPlan(i + 1) as unknown as WeekPlan,
      })),
    }
    const converted = migrateSave(old)
    for (const a of converted.actions) {
      if (a.type !== 'endWeek' || a.week === 1) continue
      expect(a.plan.outreach).toEqual({ coworking: { in_person: 12 + a.week } })
    }
    const replayed = replay(richKantino(), old)
    expect(replayed.week).toBe(11)
    // The same game as playing the converted plans directly.
    let s = fresh
    for (const a of converted.actions) if (a.type === 'endWeek') s = endWeek(s, a.plan).state
    expect(replayed).toEqual(s)
    // A save in the current shape is left alone.
    expect(migrateSave(converted)).toBe(converted)
  })

  it('still refuses a save from an earlier engine version', () => {
    const save = toSave(newGame())
    expect(() => replay(kantino(), { ...save, engineVersion: '0.14.0' })).toThrow(/engine/)
  })

  it('is deterministic with several channels a week', () => {
    const run = () => {
      let s = newGame('det7', richKantino())
      for (let w = 0; w < 12; w++) {
        s = endWeek(
          s,
          plan({
            outreach: { coworking: { phone: 8, in_person: 14 }, medical: { cold_email: 5 } },
          }),
        ).state
      }
      return s
    }
    const a = run()
    expect(run()).toEqual(a)
    expect(replay(richKantino(), toSave(a))).toEqual(a)
  })
})
