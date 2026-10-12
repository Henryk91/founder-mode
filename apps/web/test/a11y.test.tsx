import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

type Store = ReturnType<typeof createGameStore>

const html = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  renderToString(<App store={store} layout={layout} />).replace(/<!-- -->/g, '')

function run(seed: string): Store {
  const store = createGameStore({ storage: memoryStorage(), makeSeed: () => seed })
  store.getState().startRun()
  while (store.getState().introStep !== null) store.getState().nextIntro()
  return store
}

describe('accessible names', () => {
  it('names every stepper button after what it changes', () => {
    const store = run('names')
    for (const s of ['talk', 'test', 'build', 'sell', 'rest'] as const) {
      store.getState().toggleSection(s)
    }
    const page = html(store)
    const segment = store.getState().view!.segments[0]!.name
    const feature = store.getState().view!.product.features.find((f) => !f.shipped)!.name
    expect(page).toContain(`aria-label="More interviews with ${segment}"`)
    expect(page).toContain(`aria-label="Fewer interviews with ${segment}"`)
    expect(page).toContain(`aria-label="More hours for ${segment}"`)
    expect(page).toContain(`aria-label="More pre-sale batches for ${segment}"`)
    expect(page).toContain(`aria-label="5 more hours on ${feature}"`)
    expect(page).toContain('aria-label="More rest hours"')
    expect(page).toContain(`role="group" aria-label="Hours for ${segment}"`)
    // No button is left with a bare "More" or "Less".
    expect(page).not.toMatch(/aria-label="(More|Less|Much more|Much less)"/)
  })

  it('names the money steppers by the amount they move', () => {
    const store = run('money')
    store.getState().setTab('money')
    const page = html(store)
    expect(page).toContain('aria-label="Raise the price by €10"')
    expect(page).toContain('aria-label="Lower the price by €100"')
    expect(page).toContain('aria-label="Move €100 more"')
  })

  it('reads headline changes as words, not arrows', () => {
    const store = run('arrows')
    for (let i = 0; i < 5; i++) {
      store.getState().endWeek()
      while (store.getState().report && store.getState().momentsSeen < 5) {
        store.getState().nextMoment()
      }
      store.getState().dismissReport()
    }
    const page = html(store)
    expect(page).toMatch(/<span aria-hidden="true">▼ €[\d,]+<\/span>/)
    expect(page).toMatch(/class="visually-hidden">down €[\d,]+ over the last 4 weeks/)
  })

  it('names repeated pipeline buttons after their lead', () => {
    const store = run('leads')
    for (let i = 0; i < 12 && !store.getState().view!.leads.some((l) => l.canFollowUp); i++) {
      const seg = store.getState().view!.segments[0]!.id
      store.getState().setOutreach(seg, 'phone', 20)
      store.getState().endWeek()
      while (store.getState().report && store.getState().momentsSeen < 5) {
        store.getState().nextMoment()
      }
      store.getState().dismissReport()
    }
    const lead = store.getState().view!.leads.find((l) => l.canFollowUp)!
    store.getState().setTab('pipeline')
    expect(html(store)).toContain(`aria-label="Follow up (1 h): ${lead.name}"`)
  })

  it('says why End week is off while the plan has a problem', () => {
    const store = run('blocked')
    expect(html(store)).toContain('>End week</button>')
    store.getState().setRestHours(200)
    expect(store.getState().issues.length).toBeGreaterThan(0)
    expect(html(store)).toMatch(/disabled=""[^>]*>Fix the plan first<\/button>/)
  })

  it('says build progress in words as well as figures', () => {
    const store = run('progress')
    store.getState().toggleSection('build')
    expect(html(store)).toMatch(/0 of \d+ h built/)
  })
})

describe('headings and landmarks', () => {
  it('has one h1 on every screen, the company name in the game', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'h1' })
    const count = (page: string) => page.match(/<h1\b/g)?.length ?? 0
    expect(count(html(store))).toBe(1)
    store.getState().startRun()
    expect(count(html(store))).toBe(1)
    while (store.getState().introStep !== null) store.getState().nextIntro()
    for (const layout of ['phone', 'desk'] as const) {
      const page = html(store, layout)
      expect(count(page)).toBe(1)
      expect(page).toMatch(/<h1[^>]*>Kantino<\/h1>/)
    }
    store.getState().endWeek()
    expect(count(html(store))).toBe(1)
    store.getState().askShutDown()
    store.getState().dismissReport()
    store.getState().askShutDown()
    store.getState().shutDown()
    expect(count(html(store))).toBe(1)
  })

  it('lets each desk column scroll by keyboard', () => {
    const page = html(run('desk'), 'desk')
    expect(page).toMatch(/<aside[^>]*aria-label="Inbox"[^>]*tabindex="0"/)
    expect(page).toMatch(/<main[^>]*tabindex="0"/)
    expect(page).toMatch(/<aside[^>]*aria-label="Money"[^>]*tabindex="0"/)
  })

  it('puts the phone scene strip in a named region', () => {
    const store = run('strip')
    store.getState().setTab('inbox')
    expect(html(store)).toMatch(/<section[^>]*aria-label="Where you work"/)
  })
})
