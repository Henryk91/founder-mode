import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const html = (store: ReturnType<typeof createGameStore>) =>
  renderToString(<App store={store} />).replace(/<!-- -->/g, '')

describe('app smoke test', () => {
  it('starts a run, ends 3 weeks, and reaches the results screen', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'smoke' })
    expect(html(store)).toContain('New run')
    expect(html(store)).not.toContain('Continue')

    store.getState().startRun()
    const plan = html(store)
    expect(plan).toContain('Week 1 of 78')
    expect(plan).toContain('End week')
    expect(plan).toContain('Talk to people')
    expect(plan).toContain('Runway: not enough history yet')

    for (let i = 0; i < 3; i++) {
      store.getState().setInterviews('coworking', 2)
      store.getState().endWeek()
      const results = html(store)
      expect(results).toContain(`Week ${i + 1}`)
      expect(results).toContain('Interview, Coworking spaces')
      expect(results).toContain('Next week')
      // Ending another week from the results screen would skip its report.
      expect(results).not.toContain('End week')
      store.getState().dismissReport()
    }
    expect(html(store)).toContain('Week 4 of 78')
  })

  it('renders every tab, with leads in the pipeline', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'tabs' })
    store.getState().startRun()
    store.getState().setOutreach('coworking', 'in_person', 40)
    store.getState().endWeek()
    store.getState().dismissReport()
    for (const tab of ['plan', 'market', 'pipeline', 'money'] as const) {
      store.getState().setTab(tab)
      expect(html(store).length).toBeGreaterThan(500)
    }
    store.getState().setTab('money')
    expect(html(store)).toContain('Move savings into the company')
    store.getState().setTab('market')
    expect(html(store)).toContain('No interviews yet.')
  })

  it('shows the ending of a finished run and offers a way back', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'end' })
    store.getState().startRun()
    while (store.getState().view?.status === 'running') {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const ended = html(store)
    expect(ended).toContain('The run is over')
    expect(ended).toContain('Back to start')
    expect(ended).not.toContain('End week</button>')
  })

  it('offers Continue when a save exists', () => {
    const storage = memoryStorage()
    createGameStore({ storage, makeSeed: () => 'x' })
      .getState()
      .startRun()
    expect(html(createGameStore({ storage, makeSeed: () => 'x' }))).toContain('Continue')
  })
})
