import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { ENGINE_VERSION, type SaveFile } from '@founder-mode/engine'
import { App } from '../src/App'
import { ErrorBoundary } from '../src/components/ErrorBoundary'
import {
  browserProfiles,
  browserStorage,
  memoryProfiles,
  memoryStorage,
  UNREADABLE,
  unreadableProfileKey,
  type RunRecord,
} from '../src/storage'
import { createGameStore, isNewerVersion } from '../src/store'

type Options = Parameters<typeof memoryStorage>[1]

const run: RunRecord = {
  seed: 'old-win',
  replay: false,
  ending: 'sustainable',
  weeks: 60,
  peakRevenueCents: 500_000,
}
const profileText = JSON.stringify({ current: null, lastSuggestion: null, runs: [run] })

function setup(initial: SaveFile | null = null, options: Options = {}, profileRaw = profileText) {
  const storage = memoryStorage(initial, options)
  const profiles = memoryProfiles({ raw: { kantino: profileRaw } })
  const store = createGameStore({ storage, makeSeed: () => 'save-test', profiles })
  return { storage, profiles, store, get: () => store.getState() }
}

/** A real save one week in. */
function aSave(): SaveFile {
  const { get, storage } = setup()
  get().startRun()
  get().endWeek()
  return storage.current()!
}

const text = (store: ReturnType<typeof setup>['store']) =>
  renderToString(<App store={store} layout="phone" />)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')

describe('saves that cannot be continued', () => {
  it('engine version changed: the restart notice, the save goes, best runs stay', () => {
    const t = setup({ ...aSave(), engineVersion: '0.0.1' })
    expect(t.get().hasSave).toBe(true)
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('incompatible')
    expect(t.storage.current()).toBeNull()
    expect(t.get().runs).toEqual([run])
    expect(text(t.store)).toContain('from an older version of the game')
    expect(text(t.store)).toContain('Your best runs are still here')
  })

  it('scenario content changed: its own notice, best runs stay', () => {
    const t = setup({ ...aSave(), scenarioHash: 'retuned' })
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('scenario_changed')
    expect(t.get().runs).toEqual([run])
    expect(text(t.store)).toContain('retuned since that save')
  })

  it('save from a newer version than this page: says reload, and keeps the save', () => {
    const newer = { ...aSave(), engineVersion: '99.0.0' }
    const t = setup(newer)
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('newer')
    expect(t.get().hasSave).toBe(false)
    expect(t.storage.current()).toEqual(newer)
    expect(text(t.store)).toContain('Reload the page to continue it')
    expect(t.get().runs).toEqual([run])
  })

  it('corrupted save, not JSON: offered, then a clear notice instead of a silent nothing', () => {
    const t = setup(null, { raw: { kantino: '{"engineVersion": "0.11' } })
    expect(t.get().hasSave).toBe(true)
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('broken')
    expect(t.get().view).toBeNull()
    expect(text(t.store)).toContain('That save could not be read')
    expect(t.get().runs).toEqual([run])
  })

  it('corrupted save, JSON of the wrong shape: the same notice', () => {
    const t = setup(null, { raw: { kantino: JSON.stringify({ seed: 3, actions: 'lots' }) } })
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('broken')
  })

  it('a save whose actions do not replay: the same notice', () => {
    const save = aSave()
    const t = setup({ ...save, actions: [{ type: 'shutDown', week: 9 }] })
    t.get().continueRun()
    expect(t.get().saveNotice).toBe('broken')
  })
})

describe('storage that does not work', () => {
  it('unavailable (a private window): said on the Start screen, and the game still plays', () => {
    const t = setup(null, { unavailable: true })
    expect(t.get().storageNotice).toBe('unavailable')
    expect(text(t.store)).toContain('not keeping anything for us')
    t.get().startRun()
    while (t.get().introStep !== null) t.get().nextIntro()
    t.get().endWeek()
    expect(t.get().view?.week).toBe(2)
  })

  it('full: said once in the run when a save fails, and can be put away', () => {
    const t = setup(null, { full: true })
    expect(t.get().storageNotice).toBeNull()
    t.get().startRun()
    expect(t.get().storageNotice).toBe('full')
    while (t.get().introStep !== null) t.get().nextIntro()
    expect(text(t.store)).toContain('would not take the last save')
    t.get().dismissStorageNotice()
    t.get().endWeek()
    expect(t.get().storageNotice).toBeNull()
  })
})

describe('best runs are never lost silently', () => {
  it('unreadable best runs: a notice, and the old text is kept aside, not overwritten', () => {
    const broken = '{"runs": [{"seed": 1}]}'
    const t = setup(null, {}, broken)
    expect(t.get().runsNotice).toBe('unreadable')
    expect(text(t.store)).toContain('Your best runs could not be read')
    t.get().startRun()
    t.get().askShutDown()
    t.get().shutDown()
    expect(t.get().postMortem).not.toBeNull()
    expect(t.profiles.aside('kantino')).toBe(broken)
  })

  it('best runs the browser will not store: said after the run', () => {
    const storage = memoryStorage()
    const profiles = memoryProfiles({ full: true })
    const store = createGameStore({ storage, makeSeed: () => 'full', profiles })
    store.getState().startRun()
    store.getState().askShutDown()
    store.getState().shutDown()
    expect(store.getState().runsNotice).toBe('unsaved')
  })
})

describe('when the UI breaks', () => {
  it('recover goes back to the start and writes nothing', () => {
    const t = setup()
    t.get().startRun()
    t.get().endWeek()
    const before = JSON.stringify(t.storage.current())
    t.get().recover()
    expect(t.get().view).toBeNull()
    expect(t.get().hasSave).toBe(true)
    expect(JSON.stringify(t.storage.current())).toBe(before)
  })

  it('the error boundary shows a way back instead of a blank page', () => {
    const t = setup()
    const boundary = new ErrorBoundary({ store: t.store, children: null })
    boundary.state = ErrorBoundary.getDerivedStateFromError()
    const page = renderToString(<>{boundary.render()}</>)
    expect(page).toContain('Something broke')
    expect(page).toContain('Your save is untouched')
    expect(page).toContain('Try again')
    expect(page).toContain('Back to the start')
  })
})

describe('versions', () => {
  it('compares dotted versions as numbers', () => {
    expect(isNewerVersion('0.12.0', '0.11.0')).toBe(true)
    expect(isNewerVersion('0.11.10', '0.11.9')).toBe(true)
    expect(isNewerVersion('0.11.0', '0.11.0')).toBe(false)
    expect(isNewerVersion('0.9.0', ENGINE_VERSION)).toBe(false)
    expect(isNewerVersion('nonsense', '0.11.0')).toBe(false)
  })
})

describe('browser storage', () => {
  /** A stand in for `window.localStorage`, optionally full or blocked. */
  function fakeWindow(mode: 'ok' | 'full' | 'blocked' = 'ok') {
    const items = new Map<string, string>()
    const localStorage = {
      getItem: (k: string) => {
        if (mode === 'blocked') throw new Error('SecurityError')
        return items.get(k) ?? null
      },
      setItem: (k: string, v: string) => {
        if (mode !== 'ok') throw new Error('QuotaExceededError')
        items.set(k, v)
      },
      removeItem: (k: string) => {
        if (mode === 'blocked') throw new Error('SecurityError')
        items.delete(k)
      },
    }
    ;(globalThis as { window?: unknown }).window = { localStorage }
    return items
  }
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
  })

  it('tells an unreadable save from no save', () => {
    const items = fakeWindow()
    items.set('founder-mode.save.v1.kantino', 'garbage')
    const s = browserStorage()
    expect(s.load('kantino')).toBe(UNREADABLE)
    expect(s.load('zollstock')).toBeNull()
  })

  it('reports a save the browser would not take, and storage that is blocked', () => {
    fakeWindow('full')
    expect(browserStorage().save(aSave())).toBe(false)
    fakeWindow('blocked')
    expect(browserStorage().available()).toBe(false)
    expect(browserStorage().load('kantino')).toBeNull()
  })

  it('keeps unreadable best runs aside before anything can overwrite them', () => {
    const items = fakeWindow()
    items.set('founder-mode.profile.v1.kantino', 'not json')
    const p = browserProfiles()
    expect(p.load('kantino').runs).toEqual([])
    expect(p.unreadable('kantino')).toBe(true)
    p.save('kantino', { current: null, lastSuggestion: null, runs: [] })
    p.load('kantino')
    expect(items.get(unreadableProfileKey('kantino'))).toBe('not json')
  })
})
