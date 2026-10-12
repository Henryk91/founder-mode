import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { memoryProfiles, memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const text = (store: ReturnType<typeof createGameStore>) =>
  renderToString(<App store={store} layout="phone" />)
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')

const play = (store: ReturnType<typeof createGameStore>, weeks: number) => {
  while (store.getState().introStep !== null) store.getState().nextIntro()
  for (let i = 0; i < weeks; i++) {
    store.getState().endWeek()
    store.getState().dismissReport()
  }
}

describe('long mode in the web app', () => {
  it('offers the run length for Kantino only, and plays 104 weeks', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'long-ui' })
    expect(store.getState().mode).toBe('standard')
    let page = text(store)
    expect(page).toContain('How long?')
    expect(page).toContain(
      '104 weeks A second year: rent goes up, markets run dry, and room for a team.',
    )
    store.getState().selectMode('long')
    expect(text(store)).toContain('Your best runs: Kantino, 104 weeks')
    // Zollstock has no long mode yet: picking it falls back to 60 weeks and hides the choice.
    store.getState().selectScenario('zollstock')
    expect(store.getState().mode).toBe('standard')
    expect(text(store)).not.toContain('How long?')
    store.getState().selectScenario('kantino')
    store.getState().selectMode('long')
    store.getState().startRun()
    play(store, 1)
    page = text(store)
    expect(page).toContain('Week 2 of 104')
    store.getState().toggleSection('team')
    expect(text(store)).toContain('nobody yet, up to 4 at once')
    expect(text(store)).toContain('Developer, full time €7,000 per month')
    expect(text(store)).toContain('Developer, part time €3,500 per month')
    store.getState().setSearchRole('developer', true)
    expect(store.getState().plan).toMatchObject({ searchRole: 'developer', searchPartTime: true })
    store.getState().setSearchRole('developer')
    expect('searchPartTime' in store.getState().plan).toBe(false)
  })

  it('keeps saves and best runs apart per mode', () => {
    const storage = memoryStorage()
    const profiles = memoryProfiles()
    const deps = { storage, profiles, makeSeed: () => 'apart' }
    const store = createGameStore(deps)
    store.getState().startRun('std-seed')
    play(store, 2)
    store.getState().leaveRun()
    store.getState().selectMode('long')
    expect(store.getState().hasSave).toBe(false)
    store.getState().startRun('long-seed')
    play(store, 1)
    expect(storage.current('kantino')?.seed).toBe('std-seed')
    expect(storage.current('kantino.long')?.seed).toBe('long-seed')
    expect(storage.current('kantino.long')?.mode).toBe('long')
    expect(storage.current('kantino')?.mode).toBeUndefined()

    // A new session opens on the mode picked last and continues each run in its own mode.
    const again = createGameStore(deps)
    expect(again.getState().mode).toBe('long')
    again.getState().continueRun()
    expect(again.getState().view?.maxWeeks).toBe(104)
    again.getState().leaveRun()
    again.getState().selectMode('standard')
    expect(again.getState().hasSave).toBe(true)
    again.getState().continueRun()
    expect(again.getState().view?.maxWeeks).toBe(60)
    expect(again.getState().view?.seed).toBe('std-seed')
  })

  it('shows when the rent goes up', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'rent' })
    store.getState().selectMode('long')
    store.getState().startRun()
    play(store, 1)
    store.getState().setTab('money')
    expect(text(store)).toContain('Your rent goes up: living costs €743 a week')
  })
})
