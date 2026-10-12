import { describe, expect, it } from 'vitest'
import {
  loadScenario,
  type Scenario,
  type ScenarioAbout,
  type ScenarioId,
} from '@founder-mode/content'
import { ENGINE_VERSION } from '@founder-mode/engine'
import { emptyProfile, memoryProfiles, memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const setup = (
  initial = null as Parameters<typeof memoryStorage>[0],
  scenario?: () => Scenario,
) => {
  const storage = memoryStorage(initial)
  const store = createGameStore({
    storage,
    makeSeed: () => 'seed-1',
    ...(scenario && { scenario }),
  })
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

  it('shows the intro cards for a new run, one after another, and never on Continue', () => {
    const first = setup()
    first.get().startRun()
    expect(first.get().introStep).toBe(0)
    first.get().nextIntro()
    first.get().nextIntro()
    first.get().prevIntro()
    expect(first.get().introStep).toBe(1)
    first.get().prevIntro()
    first.get().prevIntro()
    expect(first.get().introStep).toBe(0)
    for (let i = 0; i < 4; i++) first.get().nextIntro()
    expect(first.get().introStep).toBeNull()
    expect(first.get().view?.guidance.intro).toHaveLength(4)

    const second = setup(first.storage.current())
    second.get().continueRun()
    expect(second.get().introStep).toBeNull()
    expect(second.get().view?.week).toBe(1)
  })

  it('opens and closes help and explanations, and resets dismissed notes for a new run', () => {
    const { get } = setup()
    get().startRun()
    get().openExplain('energy')
    expect(get().explain).toBe('energy')
    get().openHelp()
    expect(get().helpOpen).toBe(true)
    expect(get().explain).toBeNull()
    get().closeHelp()
    expect(get().helpOpen).toBe(false)
    get().dismissNote('first_week')
    get().dismissNote('first_week')
    expect(get().dismissedNotes).toEqual(['first_week'])
    get().startRun('again')
    expect(get().dismissedNotes).toEqual([])
    expect(get().introStep).toBe(0)
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

  it('refuses a save made under other scenario values, with its own notice', () => {
    const first = setup()
    first.get().startRun()
    first.get().endWeek()
    const retuned = () => {
      const s = loadScenario('kantino')
      return { ...s, start: { ...s.start, cashCents: s.start.cashCents + 100 } }
    }
    const second = setup(first.storage.current(), retuned)
    second.get().continueRun()
    expect(second.get().view).toBeNull()
    expect(second.get().saveNotice).toBe('scenario_changed')
    expect(second.storage.current()).toBeNull()
  })

  it('refuses a save from before the scenario check', () => {
    const first = setup()
    first.get().startRun()
    const old = { ...first.storage.current()! }
    delete old.scenarioHash
    const second = setup(old)
    second.get().continueRun()
    expect(second.get().saveNotice).toBe('scenario_changed')
  })

  it('warns and drops a save that cannot be replayed', () => {
    const first = setup()
    first.get().startRun()
    const save = first.storage.current()!
    const bad = {
      ...save,
      actions: [{ type: 'endWeek' as const, week: 7, plan: first.get().plan }],
    }
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

describe('scenario picker', () => {
  // A second scenario with its own id, so per scenario state can be told apart.
  const other = 'kantino_two' as ScenarioId
  const catalogue = (): ScenarioAbout[] => [
    { id: 'kantino', name: 'Kantino', lines: ['a', 'b'], modes: ['standard'] },
    { id: other, name: 'Kantino Two', lines: ['c', 'd'], modes: ['standard'] },
  ]
  const load = (id: ScenarioId): Scenario => ({ ...loadScenario('kantino'), id, name: String(id) })
  const setupTwo = (storage = memoryStorage(), profiles = memoryProfiles()) => {
    const store = createGameStore({
      storage,
      profiles,
      makeSeed: () => 'pick',
      scenario: load,
      catalogue,
    })
    return { storage, profiles, store, get: () => store.getState() }
  }
  const finish = (get: () => ReturnType<ReturnType<typeof createGameStore>['getState']>) => {
    while (get().introStep !== null) get().nextIntro()
    while (get().view?.status === 'running') get().endWeek()
  }

  it('lists every scenario and starts on the first, or on the one picked last', () => {
    const { get, profiles } = setupTwo()
    expect(get().scenarios.map((x) => x.id)).toEqual(['kantino', other])
    expect(get().scenarioId).toBe('kantino')
    get().selectScenario(other)
    expect(setupTwo(memoryStorage(), profiles).get().scenarioId).toBe(other)
  })

  it('starts the picked scenario, and keeps a save per scenario for Continue', () => {
    const { get, storage } = setupTwo()
    get().selectScenario(other)
    get().startRun()
    expect(get().view?.scenarioId).toBe(other)
    get().endWeek()
    get().leaveRun()
    expect(storage.current(other)?.actions).toHaveLength(1)
    expect(storage.current('kantino')).toBeNull()
    get().selectScenario('kantino')
    expect(get().hasSave).toBe(false)
    get().selectScenario(other)
    expect(get().hasSave).toBe(true)
    get().continueRun()
    expect(get().view).toMatchObject({ scenarioId: other, week: 2 })
  })

  it('cannot switch scenario while a run is open', () => {
    const { get } = setupTwo()
    get().startRun()
    get().selectScenario(other)
    expect(get().scenarioId).toBe('kantino')
  })

  it('keeps best runs and the last suggestion per scenario', () => {
    const { get, profiles } = setupTwo()
    get().selectScenario(other)
    get().startRun()
    finish(get)
    const suggestion = get().suggestion
    expect(suggestion).not.toBeNull()
    get().leaveRun()
    expect(get().runs).toHaveLength(1)
    expect(profiles.load(other).lastSuggestion).toBe(suggestion)
    expect(profiles.load('kantino')).toEqual(emptyProfile())
    get().selectScenario('kantino')
    expect(get().runs).toEqual([])
    get().selectScenario(other)
    expect(get().runs).toHaveLength(1)
  })

  it('plays Same market again in the scenario of the finished run', () => {
    const { get } = setupTwo()
    get().selectScenario(other)
    get().startRun()
    finish(get)
    get().sameMarketAgain()
    expect(get().view).toMatchObject({ scenarioId: other, seed: 'pick', week: 1 })
  })
})
