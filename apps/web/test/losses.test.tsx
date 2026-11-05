import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { validateThenBuild } from '@founder-mode/bots/src/strategies/validateThenBuild'
import { createGame, endWeek, getView, respond, toSave, type SaveFile } from '@founder-mode/engine'
import { App } from '../src/App'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

/**
 * Plan 7 step 2: reasons for losses on screen. Lost leads and cancellations in the weekly results
 * with what they said or "No reason given" and Ask why; the Pipeline's lost list, newest first,
 * with customers who cancelled; the answer in the inbox; the post-mortem's lines.
 */
type Store = ReturnType<typeof createGameStore>
const html = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  renderToString(<App store={store} layout={layout} />).replace(/<!-- -->/g, '')
const text = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  html(store, layout)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

function begin(seed: string): Store {
  const store = createGameStore({ storage: memoryStorage(), makeSeed: () => seed })
  store.getState().startRun()
  while (store.getState().introStep !== null) store.getState().nextIntro()
  return store
}

/** Sells in person to coworking spaces and holds every demo until a loss can be asked about. */
function untilAskable(store: Store, weeks = 30): void {
  for (let w = 0; w < weeks; w++) {
    const s = store.getState()
    if (s.view!.losses.some((l) => l.canAsk) && s.report) return
    s.dismissReport()
    s.setOutreach('coworking', 'in_person', 20)
    for (const l of s.view!.leads.filter((x) => x.canBookDemo)) s.toggleDemo(l.id)
    s.endWeek()
  }
}

describe('plan 7: reasons for losses on screen', () => {
  it('shows a loss in the week with its reason, or no reason and Ask why', () => {
    const store = begin('loss-screen')
    untilAskable(store)
    const view = store.getState().view!
    const report = store.getState().report!
    const lossIds = report.entries.flatMap((e) => ('lossId' in e && e.lossId ? [e.lossId] : []))
    expect(lossIds.length).toBeGreaterThan(0)
    const page = text(store)
    for (const id of lossIds) {
      const loss = view.losses.find((l) => l.id === id)!
      if (loss.stated) expect(page).toContain(loss.stated.text)
      else if (loss.canAsk) {
        expect(page).toContain('No reason given.')
        expect(html(store)).toContain(`aria-label="Ask why (1 h): ${loss.name}"`)
      }
    }
    // The real cause never reaches the screen.
    expect(html(store)).not.toMatch(/lossCauses|missing_feature/)
  })

  it('books Ask why into the plan for an hour, and the answer arrives in the inbox', () => {
    const store = begin('loss-ask')
    untilAskable(store)
    const loss = store.getState().view!.losses.find((l) => l.canAsk)!
    store.getState().toggleAskWhy(loss.id)
    expect(store.getState().plan.askWhy).toEqual([loss.id])
    expect(store.getState().plannedHours).toBe(1)
    expect(text(store)).toContain('Asking why')
    // Taking it back frees the hour.
    store.getState().toggleAskWhy(loss.id)
    expect(store.getState().plan.askWhy).toBeUndefined()
    expect(store.getState().plannedHours).toBe(0)
    store.getState().toggleAskWhy(loss.id)
    store.getState().dismissReport()
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().setTab('inbox')
    const after = store.getState().view!.losses.find((l) => l.id === loss.id)!
    const heading = loss.kind === 'lead' ? `Why ${loss.name} said no` : `Why ${loss.name} left`
    const page = text(store)
    expect(page).toContain(heading)
    if (after.stated) expect(page).toContain(after.stated.text)
    else expect(page).toContain('They did not write back.')
  })

  it('lists every loss in the Pipeline, newest first, with Show all after 8', () => {
    const store = begin('loss-list')
    untilAskable(store, 40)
    for (let w = 0; w < 12; w++) {
      const s = store.getState()
      s.dismissReport()
      s.setOutreach('coworking', 'in_person', 25)
      for (const l of s.view!.leads.filter((x) => x.canBookDemo)) s.toggleDemo(l.id)
      s.endWeek()
    }
    store.getState().dismissReport()
    store.getState().setTab('pipeline')
    const losses = store.getState().view!.losses
    expect(losses.length).toBeGreaterThan(8)
    const page = html(store)
    const shown = [...page.matchAll(/data-loss="(loss_\d+)"/g)].map((m) => m[1])
    expect(shown).toEqual(losses.slice(0, 8).map((l) => l.id))
    expect(text(store)).toContain(`Show all ${losses.length}`)
    store.getState().setShowAllLost(true)
    const all = [...html(store).matchAll(/data-loss="(loss_\d+)"/g)].map((m) => m[1])
    expect(all).toEqual(losses.map((l) => l.id))
    // Newest first.
    const weeks = losses.map((l) => l.week)
    expect([...weeks].sort((a, b) => b - a)).toEqual(weeks)
  })

  it('shows customers who cancelled in the lost list, with how long they paid', () => {
    // The careful bot plays until a customer has left; the save is then continued on screen.
    const scenario = loadScenario('kantino')
    let file: SaveFile | null = null
    for (let i = 0; i < 40 && !file; i++) {
      const seed = `cancel-${i}`
      const player = validateThenBuild.create(scenario, seed)
      let state = createGame(scenario, seed)
      while (state.status === 'running' && state.week < 60) {
        for (const a of player.respond?.(getView(state)) ?? []) {
          state = respond(state, a.messageId, a.choiceId)
        }
        const r = endWeek(state, player.plan(getView(state)))
        player.observe?.(r.report, getView(r.state))
        state = r.state
        if (state.status === 'running' && (state.losses ?? []).some((l) => l.tag === 'cancelled')) {
          file = toSave(state)
          break
        }
      }
    }
    expect(file).not.toBeNull()
    const store = createGameStore({ storage: memoryStorage(file), makeSeed: () => 'x' })
    store.getState().continueRun('kantino')
    store.getState().setTab('pipeline')
    store.getState().setShowAllLost(true)
    const customer = store.getState().view!.losses.find((l) => l.tag === 'cancelled')!
    const page = text(store)
    expect(page).toContain(customer.name)
    expect(page).toMatch(new RegExp(`cancelled after ${customer.paidWeeks} weeks?`))
  })

  it('shows stated reasons against real causes in the post-mortem (R2)', () => {
    const store = begin('loss-pm')
    untilAskable(store)
    store.getState().dismissReport()
    store.getState().askShutDown()
    store.getState().shutDown()
    while (store.getState().postMortem && html(store).includes('The run is over')) {
      store.getState().nextMoment()
    }
    const pm = store.getState().postMortem!
    expect(pm.lossReasons!.length).toBeGreaterThan(0)
    const page = text(store, 'desk')
    expect(page).toContain('What lost customers told you')
    expect(page).toContain('Lost customers are your best research')
    for (const line of pm.lossReasons!) {
      expect(page).toMatch(
        new RegExp(`: ${line.losses} lost, ${line.losses - line.unsaid} of them said why`),
      )
    }
    expect(page).toMatch(
      /really (missed|did not need|found it too dear|had enough)|simply went silent/,
    )
  })
})
