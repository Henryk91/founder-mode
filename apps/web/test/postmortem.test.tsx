import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { memoryProfiles, memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

type Store = ReturnType<typeof createGameStore>

const text = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  renderToString(<App store={store} layout={layout} />)
    .replace(/<!-- -->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

const html = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  renderToString(<App store={store} layout={layout} />)

function seeds(...list: string[]) {
  let i = 0
  return () => list[i++] ?? `seed-${i}`
}

/** Plays a run to its end: 20 h of phone outreach to coworking every week, nothing else. */
function playToEnd(store: Store) {
  while (store.getState().introStep !== null) store.getState().nextIntro()
  while (store.getState().view?.status === 'running') {
    store.getState().setOutreach('coworking', 'phone', 20)
    store.getState().endWeek()
    if (store.getState().view?.status === 'running') store.getState().dismissReport()
  }
  // Tap through the ending moment.
  while (store.getState().postMortem && html(store).includes('The run is over')) {
    store.getState().nextMoment()
  }
}

describe('post-mortem screen', () => {
  it('is only built once the run has ended', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'pm-a' })
    store.getState().startRun()
    expect(store.getState().postMortem).toBeNull()
    expect(text(store)).not.toContain('The polite trap')
    playToEnd(store)
    expect(store.getState().postMortem).not.toBeNull()
    expect(text(store)).toContain('The polite trap')
  })

  it('puts the lesson second and the sections in the agreed order', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'pm-b' })
    store.getState().startRun()
    playToEnd(store)
    const page = text(store)
    const order = [
      'What happened',
      'Next time',
      'The truth about the markets',
      'Misread signals',
      'Where the hours went',
      'Money',
      'Luck',
      'New run',
    ].map((h) => page.indexOf(h))
    expect(order.every((at) => at >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it('folds hours, money and luck into one line each on the phone, and shows them in full on the desk', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'pm-c' })
    store.getState().startRun()
    playToEnd(store)
    const phone = html(store, 'phone')
    expect(phone.match(/aria-expanded="false"/g)?.length).toBe(3)
    expect(phone).not.toContain('id="pm-hours-body"')
    const desk = html(store, 'desk')
    expect(desk).not.toContain('aria-expanded')
    for (const id of ['pm-hours', 'pm-money', 'pm-luck']) expect(desk).toContain(`id="${id}-body"`)
    expect(text(store, 'desk')).toContain('Learning')
  })

  it('names what ended the run and shows the final week in the chain', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'pm-d' })
    store.getState().startRun()
    playToEnd(store)
    const pm = store.getState().postMortem!
    const page = text(store)
    expect(page).toContain(`The money ran out in week ${pm.week}`)
    expect(page).toContain(`Week ${pm.week}`)
  })

  it('prefers a suggestion that was not shown after the previous run', () => {
    const profiles = memoryProfiles()
    const store = createGameStore({
      storage: memoryStorage(),
      makeSeed: seeds('pm-rotate'),
      profiles,
    })
    store.getState().startRun()
    playToEnd(store)
    const first = store.getState().suggestion!
    const list = store.getState().postMortem!.suggestions
    expect(list.length).toBeGreaterThan(1)
    expect(first).toBe(list[0])

    store.getState().sameMarketAgain()
    playToEnd(store)
    const second = store.getState().suggestion!
    expect(store.getState().postMortem!.suggestions).toEqual(list)
    expect(second).not.toBe(first)
    expect(second).toBe(list.find((id) => id !== first))
    expect(profiles.load('kantino').lastSuggestion).toBe(second)
  })

  it('keeps the suggestion it chose when the finished run is reloaded', () => {
    const storage = memoryStorage()
    const profiles = memoryProfiles()
    const store = createGameStore({ storage, makeSeed: () => 'pm-reload', profiles })
    store.getState().startRun()
    playToEnd(store)
    const chosen = store.getState().suggestion
    const again = createGameStore({ storage, makeSeed: () => 'x', profiles })
    again.getState().continueRun()
    expect(again.getState().suggestion).toBe(chosen)
    expect(profiles.load('kantino').runs).toHaveLength(1)
  })

  it('records runs, flags "Same market again" as a replay, and starts "New run" on a new seed', () => {
    const profiles = memoryProfiles()
    const store = createGameStore({
      storage: memoryStorage(),
      makeSeed: seeds('pm-first', 'pm-second'),
      profiles,
    })
    store.getState().startRun()
    playToEnd(store)
    store.getState().sameMarketAgain()
    expect(store.getState().view!.seed).toBe('pm-first')
    expect(store.getState().view!.status).toBe('running')
    playToEnd(store)
    store.getState().newRun()
    expect(store.getState().view!.seed).toBe('pm-second')
    const runs = profiles.load('kantino').runs
    expect(runs.map((r) => [r.seed, r.replay])).toEqual([
      ['pm-first', false],
      ['pm-first', true],
    ])
    expect(runs[0]!.ending).toBe('bankrupt')
  })
})

describe('milestones on screen', () => {
  it('shows the next milestone on the phone Inbox tab and on the desk, and a reached one on the results', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'ms-ui' })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    store.getState().setTab('inbox')
    expect(text(store, 'phone')).toContain('Next milestone: First interview')
    expect(text(store, 'phone')).toContain('0 / 1')
    store.getState().setTab('plan')
    expect(text(store, 'phone')).not.toContain('Next milestone')
    expect(text(store, 'desk')).toContain('Next milestone: First interview')

    store.getState().setInterviews('coworking', 2)
    store.getState().endWeek()
    const results = text(store)
    expect(results).toContain('Milestone reached')
    expect(results).toContain('First interview')
    expect(results).not.toContain('The run is over')
    store.getState().dismissReport()
    expect(text(store, 'desk')).toContain('Next milestone: First deposit')
  })

  it('lists the milestones reached in the post-mortem', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'ms-pm' })
    store.getState().startRun()
    store.getState().setInterviews('medical', 1)
    playToEnd(store)
    const page = text(store)
    expect(page).toContain('Milestones')
    expect(page).toContain('Week 1: First interview')
  })
})

describe('coworking desk and organised stage', () => {
  it('offers the desk in week 8 and switches the scene once it is taken', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'desk-ui' })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    for (let w = 1; w < 8; w++) {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const offer = store.getState().view!.inbox.find((m) => m.eventId === 'coworking_desk')!
    expect(offer).toBeDefined()
    expect(text(store, 'desk')).toContain('Kitchen table')
    store.getState().answer(offer.id, 'move')
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(store.getState().view!.company.officeStage.id).toBe('coworking_desk')
    expect(text(store, 'desk')).toContain('Coworking desk')
    expect(html(store, 'desk')).not.toContain('>Kitchen table<')
  })

  it('shows the organised pipeline with the demo to trial number, and announces it once', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'organised-ui' })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    store.getState().setTab('pipeline')
    expect(text(store)).toContain('Who might pay us')
    expect(text(store)).not.toContain('Demo to trial')
    const view = store.getState().view!
    store.setState({
      view: {
        ...view,
        company: { ...view.company, uiStage: 'organised' },
        funnel: { demosHeld: 10, trialsFromDemos: 4 },
      },
    })
    const page = text(store)
    expect(page).toContain('Sales pipeline')
    expect(page).toContain('Demo to trial: 40% (4 of 10 demos)')
    expect(html(store)).toContain('data-stage="organised"')

    store.getState().endWeek()
    const report = store.getState().report!
    store.setState({ report: { ...report, uiStageChanged: true } })
    expect(text(store)).toContain('Getting organised')
    store.setState({ report: { ...report, uiStageChanged: false } })
    expect(text(store)).not.toContain('Getting organised')
  })
})

describe('walk-in leads', () => {
  it('names walk-ins on the lead card, in the results and in the post-mortem', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'walk-in-ui' })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    for (let w = 1; w < 8; w++) {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const offer = store.getState().view!.inbox.find((m) => m.eventId === 'coworking_desk')!
    expect(offer.text).toContain('coworking spaces')
    store.getState().answer(offer.id, 'move')
    let results = ''
    for (let w = 0; w < 10 && !results.includes('walked up to you'); w++) {
      store.getState().endWeek()
      results = text(store)
      store.getState().dismissReport()
    }
    expect(results).toMatch(/walked up to you at the coworking desk/)
    store.getState().setTab('pipeline')
    expect(text(store)).toContain('Walked in at the coworking desk')
    playToEnd(store)
    const pm = store.getState().postMortem!
    const desk = pm.walkIns.find((w) => w.place === 'Coworking desk')!
    expect(desk.leads).toBeGreaterThan(0)
    expect(text(store)).toMatch(/Walk-ins \d+ leads? from the coworking desk, \d+ became customers/)
  })
})

describe('weak landing signal', () => {
  /** Runs one landing test in the first market in week 1, then shuts the company down. */
  function landingThenShutDown(scenarioId: 'kantino' | 'zollstock') {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'weak-landing' })
    store.getState().selectScenario(scenarioId)
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    const view = store.getState().view!
    const first = view.segments[0]!.id
    store.getState().setLanding(first, 30_000)
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().askShutDown()
    store.getState().shutDown()
    while (store.getState().postMortem && html(store).includes('The run is over')) {
      store.getState().nextMoment()
    }
    return store
  }

  it('is named in Zollstock, for the market that had a landing test only', () => {
    const page = text(landingThenShutDown('zollstock'))
    expect(page).toContain('Landing test')
    expect(page.match(/people rarely answer adverts/g)).toHaveLength(1)
  })

  it('is not named in Kantino, where landing tests are not weak by design', () => {
    const page = text(landingThenShutDown('kantino'))
    expect(page).not.toContain('About that test')
  })
})
