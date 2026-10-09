import { describe, expect, it } from 'vitest'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const setup = (initial = null as Parameters<typeof memoryStorage>[0]) => {
  const storage = memoryStorage(initial)
  const store = createGameStore({ storage, makeSeed: () => 'seed-1' })
  return { storage, store, get: () => store.getState() }
}

describe('game store', () => {
  it('starts with no run and no save', () => {
    const { get } = setup()
    expect(get().view).toBeNull()
    expect(get().hasSave).toBe(false)
  })

  it('starts a run, saves it at once, and shows week 1', () => {
    const { get, storage } = setup()
    get().startRun()
    expect(get().view?.week).toBe(1)
    expect(get().view?.seed).toBe('seed-1')
    expect(storage.current()?.actions).toEqual([])
    expect(get().hasSave).toBe(true)
  })

  it('uses a typed seed when given one', () => {
    const { get } = setup()
    get().startRun('  my seed ')
    expect(get().view?.seed).toBe('my seed')
  })

  it('tracks planned hours and blocks a plan above the weekly maximum', () => {
    const { get } = setup()
    get().startRun()
    get().setInterviews('coworking', 3)
    expect(get().plannedHours).toBe(6)
    expect(get().issues).toEqual([])
    get().setRestHours(70)
    expect(get().issues.map((i) => i.code)).toContain('too_many_hours')
    get().endWeek()
    expect(get().view?.week).toBe(1)
    expect(get().report).toBeNull()
  })

  it('ends 3 weeks, autosaves each one, and clears the plan after every week', () => {
    const { get, storage } = setup()
    get().startRun()
    for (let week = 1; week <= 3; week++) {
      get().setInterviews('small_offices', 1)
      get().endWeek()
      expect(get().report?.week).toBe(week)
      expect(get().view?.week).toBe(week + 1)
      expect(storage.current()?.actions).toHaveLength(week)
      expect(get().plannedHours).toBe(0)
      get().dismissReport()
      expect(get().report).toBeNull()
    }
    expect(get().view?.segments.find((s) => s.id === 'small_offices')?.interviews).toHaveLength(3)
  })

  it('continues a saved run in a fresh store at the same point', () => {
    const first = setup()
    first.get().startRun()
    first.get().setBuild('basic_ordering', 10)
    first.get().endWeek()
    const second = setup(first.storage.current())
    expect(second.get().hasSave).toBe(true)
    second.get().continueRun()
    expect(second.get().view).toEqual(first.get().view)
  })

  it('warns and drops a save from another engine version', () => {
    const first = setup()
    first.get().startRun()
    const old = { ...first.storage.current()!, engineVersion: '0.0.1' }
    expect(old.engineVersion).not.toBe(ENGINE_VERSION)
    const second = setup(old)
    second.get().continueRun()
    expect(second.get().view).toBeNull()
    expect(second.get().saveNotice).toBe('incompatible')
    expect(second.get().hasSave).toBe(false)
    expect(second.storage.current()).toBeNull()
  })

  it('warns and drops a save that cannot be replayed', () => {
    const first = setup()
    first.get().startRun()
    const bad = { ...first.storage.current()!, scenarioId: 'other' }
    const second = setup(bad)
    second.get().continueRun()
    expect(second.get().saveNotice).toBe('broken')
    expect(second.storage.current()).toBeNull()
  })

  it('books demos, outreach, build and bug fix hours through the plan', () => {
    const { get } = setup()
    get().startRun()
    get().setOutreach('small_offices', 'cold_email', 20)
    get().setBuild('basic_ordering', 25)
    expect(get().plannedHours).toBe(45)
    expect(get().plan.outreach.small_offices).toEqual({ channel: 'cold_email', hours: 20 })
    get().toggleDemo('lead_1')
    expect(get().issues.map((i) => i.code)).toContain('invalid_demo')
    get().toggleDemo('lead_1')
    expect(get().issues).toEqual([])
  })

  it('plays a whole run to an ending, then clears the save when leaving', () => {
    const { get, storage } = setup()
    get().startRun()
    let weeks = 0
    while (get().view?.status === 'running') {
      get().endWeek()
      get().dismissReport()
      weeks++
      expect(weeks).toBeLessThanOrEqual(78)
    }
    expect(get().view?.ending).toBe('bankrupt')
    expect(storage.current()?.actions).toHaveLength(weeks)
    get().leaveRun()
    expect(get().view).toBeNull()
    expect(get().hasSave).toBe(false)
    expect(storage.current()).toBeNull()
  })

  it('keeps a running save when leaving mid run', () => {
    const { get, storage } = setup()
    get().startRun()
    get().leaveRun()
    expect(get().view).toBeNull()
    expect(storage.current()).not.toBeNull()
  })

  it('exposes no hidden data to the UI', () => {
    const { get } = setup()
    get().startRun()
    get().setInterviews('coworking', 4)
    get().endWeek()
    const { view, plan, report, issues } = get()
    const json = JSON.stringify({ view, plan, report, issues })
    for (const key of [
      'hidden',
      'rng',
      'pain',
      'politeness',
      'wtpCents',
      'mustHave',
      'channelResponse',
    ]) {
      expect(json).not.toContain(`"${key}"`)
    }
    expect(Object.keys(get())).not.toContain('game')
  })
})
