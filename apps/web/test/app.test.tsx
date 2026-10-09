import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { label } from '../src/labels'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const html = (store: ReturnType<typeof createGameStore>) =>
  renderToString(<App store={store} />).replace(/<!-- -->/g, '')

type Store = ReturnType<typeof createGameStore>

/** Starts a run and clicks through the intro, like a player would. */
function begin(store: Store, seed?: string) {
  store.getState().startRun(seed)
  while (store.getState().introStep !== null) store.getState().nextIntro()
}

describe('app smoke test', () => {
  it('starts a run, ends 3 weeks, and reaches the results screen', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'smoke' })
    expect(html(store)).toContain('New run')
    expect(html(store)).not.toContain('Continue')

    begin(store)
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
      expect(results).toContain('You spoke to someone at Coworking spaces')
      expect(results).toContain('Next week')
      // Ending another week from the results screen would skip its report.
      expect(results).not.toContain('End week')
      store.getState().dismissReport()
    }
    expect(html(store)).toContain('Week 4 of 78')
  })

  it('renders every tab, with leads in the pipeline', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'tabs' })
    begin(store)
    store.getState().setOutreach('coworking', 'in_person', 40)
    store.getState().endWeek()
    store.getState().dismissReport()
    for (const tab of ['plan', 'market', 'pipeline', 'money'] as const) {
      store.getState().setTab(tab)
      expect(html(store).length).toBeGreaterThan(400)
    }
    store.getState().setTab('money')
    expect(html(store)).toContain('Move savings into the company')
    store.getState().setTab('market')
    expect(html(store)).toContain('No interviews yet. Plan some on the Plan tab')
  })

  it('shows the ending of a finished run and offers a way back', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'end' })
    begin(store)
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

const fresh = (seed = 'onboarding') =>
  createGameStore({ storage: memoryStorage(), makeSeed: () => seed })

describe('onboarding', () => {
  it('shows four intro cards with the scenario numbers filled in, then the game', () => {
    const store = fresh()
    store.getState().startRun()
    const seen: string[] = []
    for (let i = 0; i < 4; i++) {
      const page = html(store)
      seen.push(page)
      expect(page).toContain(`Card ${i + 1} of 4`)
      expect(page).not.toMatch(/[{}]/)
      expect(page).not.toContain('End week')
      if (i < 3) expect(page).toContain('Next')
      store.getState().nextIntro()
    }
    expect(seen[0]).toContain('You are a founder in Munich')
    expect(seen[0]).toContain('€15,000')
    expect(seen[0]).toContain('€12,000')
    expect(seen[0]).toContain('€450')
    expect(seen[1]).toContain('Kantino is software')
    expect(seen[2]).toContain('small offices, coworking spaces and medical practices')
    expect(seen[3]).toContain('Last 78 weeks')
    expect(seen[3]).toContain('Start week 1')
    expect(html(store)).toContain('Week 1 of 78')
  })

  it('does not say which market is viable, whatever the seed', () => {
    for (const seed of ['a', 'b', 'c', 'd']) {
      const store = fresh(seed)
      store.getState().startRun()
      for (let i = 0; i < 4; i++) {
        expect(html(store).toLowerCase()).not.toMatch(/viable|trap|best market|good market/)
        store.getState().nextIntro()
      }
    }
  })

  it('shows the founder note in week 1, and it can be dismissed', () => {
    const store = fresh()
    begin(store)
    expect(html(store)).toContain('Founder&#x27;s note')
    expect(html(store)).toContain('No customers, no product, no evidence')
    store.getState().dismissNote('first_week')
    expect(html(store)).not.toContain('No customers, no product, no evidence')
  })

  it('moves the note with the situation and stops after week 4', () => {
    const store = fresh()
    begin(store)
    store.getState().setInterviews('coworking', 2)
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(html(store)).toContain('You have 2 interviews behind you')
    for (let i = 0; i < 3; i++) {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    expect(store.getState().view?.week).toBe(5)
    expect(html(store)).not.toContain('Founder&#x27;s note')
  })

  it('opens help with the goal and how a week works, and closes it again', () => {
    const store = fresh()
    begin(store)
    expect(html(store)).toContain('Help')
    store.getState().openHelp()
    const page = html(store)
    expect(page).toContain('The goal')
    expect(page).toContain('Last 78 weeks')
    expect(page).toContain('How a week works')
    expect(page).toContain('Back to the game')
    store.getState().closeHelp()
    expect(html(store)).toContain('Talk to people')
  })

  it('explains Runway, Cash, Energy and hours in two sentences each', () => {
    const store = fresh()
    begin(store)
    const stage = 'scrappy'
    for (const key of ['runway', 'cash', 'energy', 'hours'] as const) {
      store.getState().openExplain(key)
      const page = html(store)
      expect(page).toContain('Got it')
      const text = label(`explain.${key}.text`, stage)
      expect(text.split('. ').length).toBe(2)
      expect(page).toContain(text.replace(/'/g, '&#x27;'))
    }
    store.getState().closeExplain()
    expect(html(store)).not.toContain('Got it')
    // The terms are tappable on screen.
    const page = html(store)
    expect(page).toContain('Runway: not enough history yet')
    expect(page).toMatch(/aria-label="Energy: What does this mean\?"/)
    expect(page).toMatch(/aria-label="Hours: What does this mean\?"/)
  })

  it('words the hours clearly', () => {
    const store = fresh()
    begin(store)
    const page = html(store)
    expect(page).toContain('A normal week is 50 h. Up to 65 h is possible and costs energy.')
    expect(page).toContain('0 h planned of a normal 50 h week')
    expect(page).not.toContain('(up to 65)')
  })

  it('gives every Plan action a line about its cost, result and timing', () => {
    const store = fresh()
    begin(store)
    store.getState().setBuild('basic_ordering', 40)
    store.getState().endWeek()
    store.getState().dismissReport()
    const page = html(store).replace(/&#x27;/g, "'")
    for (const line of [
      'Costs 2 h each. Gives you one answer in the interviewee',
      'Costs the hours shown. A feature ships once all its hours are in',
      'Costs the hours you set, on one channel per market. Finds new leads at the end of this week',
      'Costs 3 h per demo. A good demo starts a 2 week trial',
      'Costs the hours you set. Restores energy this week.',
    ]) {
      expect(page, line).toContain(line)
    }
    // Bug fixing appears once there are bugs to fix.
    expect(page).toContain('Costs 4 h per bug. Removes one bug')
  })

  it('has an empty state on every tab that says what fills it', () => {
    const store = fresh()
    begin(store)
    store.getState().setTab('market')
    expect(html(store)).toContain(
      'No interviews yet. Plan some on the Plan tab and the answers collect here.',
    )
    store.getState().setTab('pipeline')
    expect(html(store)).toContain('Leads appear here once you spend outreach hours on the Plan tab')
    store.getState().setTab('money')
    expect(html(store)).toContain('A line appears here after every week you end.')
  })

  it('shows the market with description, sample size, quotes and what people asked for', () => {
    const store = fresh('market-notes')
    begin(store)
    store.getState().setInterviews('coworking', 6)
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().setTab('market')
    const page = html(store)
    expect(page).toContain('Shared workspaces with many small tenants')
    expect(page).toContain('Based on 6 interviews.')
    expect(page).toContain('Features people asked for')
    expect(page).toMatch(/asked for by \d of 6/)
    expect(page).toContain('Agencies and firms with 10 to 50 staff')
  })

  it('tells the week as an account before the numbers', () => {
    const store = fresh()
    begin(store)
    store.getState().setInterviews('medical', 2)
    store.getState().setOutreach('coworking', 'phone', 10)
    store.getState().endWeek()
    const page = html(store)
    const at = (text: string) => page.indexOf(text)
    expect(at('What happened')).toBeGreaterThan(-1)
    expect(at('You spoke to someone at Medical practices')).toBeGreaterThan(at('What happened'))
    expect(at('The numbers')).toBeGreaterThan(at('You spoke to someone at Medical practices'))
    expect(at('Received')).toBeGreaterThan(at('The numbers'))
    expect(page).toContain('<blockquote')
    expect(page).not.toMatch(/[{}]/)
  })
})
