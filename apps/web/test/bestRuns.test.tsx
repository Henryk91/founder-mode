import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { bestRuns } from '../src/bestRuns'
import { emptyProfile, memoryProfiles, memoryStorage, type RunRecord } from '../src/storage'
import { createGameStore } from '../src/store'

const run = (over: Partial<RunRecord>): RunRecord => ({
  seed: 's',
  replay: false,
  ending: 'bankrupt',
  weeks: 20,
  peakRevenueCents: 0,
  ...over,
})

const text = (store: ReturnType<typeof createGameStore>) =>
  renderToString(<App store={store} layout="phone" />)
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

describe('best runs', () => {
  it('picks the longest run, the highest revenue and the wins, keeping replays apart', () => {
    const runs = [
      run({ seed: 'a', weeks: 31, peakRevenueCents: 90_000 }),
      run({ seed: 'b', weeks: 44, peakRevenueCents: 180_000 }),
      run({ seed: 'c', weeks: 60, ending: 'sustainable', peakRevenueCents: 360_000 }),
      run({ seed: 'd', weeks: 60, ending: 'still_searching', peakRevenueCents: 270_000 }),
      run({ seed: 'c', weeks: 60, ending: 'sustainable', peakRevenueCents: 500_000, replay: true }),
    ]
    const { ordinary, replays } = bestRuns(runs)
    expect(ordinary.longest?.seed).toBe('c')
    expect(ordinary.revenue?.seed).toBe('c')
    expect(ordinary.winCount).toBe(1)
    expect(ordinary.wins.map((r) => r.seed)).toEqual(['c'])
    expect(replays?.revenue?.peakRevenueCents).toBe(500_000)
    expect(bestRuns(runs.slice(0, 2)).replays).toBeNull()
  })

  it('shows them on the Start screen with each seed, from this scenario only', () => {
    const profiles = memoryProfiles()
    profiles.save('kantino', {
      ...emptyProfile(),
      runs: [
        run({ seed: 'long-one', weeks: 41 }),
        run({ seed: 'rich-one', weeks: 35, peakRevenueCents: 390_000 }),
      ],
    })
    profiles.save('other_scenario', {
      ...emptyProfile(),
      runs: [run({ seed: 'elsewhere', weeks: 59 })],
    })
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'x', profiles })
    const page = text(store)
    expect(page).toContain('Your best runs')
    expect(page).toContain('Longest survival 41 weeks long-one')
    expect(page).toContain('Highest monthly revenue €3,900 a month rich-one')
    expect(page).toContain('Wins 0')
    expect(page).not.toContain('elsewhere')
  })

  it('says so when there are no runs yet', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'x' })
    expect(text(store)).toContain('No finished runs yet.')
  })

  it('plays a best run again on its seed, recorded as a replay', () => {
    const profiles = memoryProfiles()
    profiles.save('kantino', { ...emptyProfile(), runs: [run({ seed: 'again', weeks: 41 })] })
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'x', profiles })
    store.getState().replaySeed('again')
    expect(store.getState().view!.seed).toBe('again')
    expect(profiles.load('kantino').current).toMatchObject({ seed: 'again', replay: true })
  })

  it('lists a finished run on the Start screen after leaving it', () => {
    const profiles = memoryProfiles()
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'listed', profiles })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    store.getState().askShutDown()
    store.getState().shutDown()
    store.getState().leaveRun()
    expect(store.getState().runs.map((r) => r.seed)).toEqual(['listed'])
    expect(text(store)).toContain('listed')
  })
})
