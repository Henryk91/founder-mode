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
    expect(plan).toContain('Runway: 42 weeks')

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
    expect(seen[0]).toContain('€10,000')
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
      const text = label(`explain.${key}.text`, stage, { low: 30, weeks: 3 })
      expect(text.split('. ').length).toBe(2)
      expect(page).toContain(text.replace(/'/g, '&#x27;'))
    }
    store.getState().closeExplain()
    expect(html(store)).not.toContain('Got it')
    // The terms are tappable on screen.
    const page = html(store)
    expect(page).toContain('Runway: 42 weeks')
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
    expect(at('Company received')).toBeGreaterThan(at('The numbers'))
    expect(page).toContain('<blockquote')
    expect(page).not.toMatch(/[{}]/)
  })
})

describe('playtest fixes', () => {
  const fresh = (seed: string) => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => seed })
    begin(store)
    return store
  }

  it('shows living costs paid from savings and the savings left in the week report', () => {
    const store = fresh('living')
    store.getState().endWeek()
    const page = html(store)
    expect(page).toContain('Living costs from your savings')
    expect(page).toMatch(/Living costs from your savings<\/span><span[^>]*>€450</)
    expect(page).toMatch(/Your savings now<\/span><span[^>]*>€11,550</)
  })

  it('has a price control on the Money tab that applies from the next resolved week', () => {
    const store = fresh('price')
    store.getState().setTab('money')
    expect(html(store)).toContain('Price per customer')
    expect(html(store)).toContain('Now: €300 per month')
    store.getState().setPriceCents(45_000)
    expect(html(store)).toContain('From this week: €450 per month')
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(store.getState().view?.company.priceCentsPerMonth).toBe(45_000)
    expect(store.getState().plan.priceCentsPerMonth).toBeNull()
    expect(html(store)).toContain('Now: €450 per month')
  })

  it('keeps the outreach channel from week to week', () => {
    const store = fresh('channel')
    store.getState().setOutreach('coworking', 'in_person', 5)
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(store.getState().plan.outreach).toEqual({})
    const page = html(store)
    // The coworking row shows In person selected, the others the first channel.
    const pressed = [...page.matchAll(/aria-pressed="true"[^>]*>([^<]+)</g)]
      .map((m) => m[1])
      .filter((text) => text !== 'No test')
    expect(pressed).toEqual(['Cold email', 'In person', 'Cold email'])
  })
})

describe('energy', () => {
  it('warns when energy runs low and shows the burnout ending', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'tired' })
    begin(store)
    const overwork = () => {
      store.getState().setInterviews('coworking', 32)
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    overwork() // 80 to 52
    overwork() // 52 to 24
    expect(html(store)).toContain('Running on fumes. Below 30 everything you try works less well.')
    overwork() // 0, first week
    expect(html(store)).toContain('Empty. 2 more weeks at 0 and you burn out.')
    overwork()
    expect(html(store)).toContain('Empty. One more week at 0 and you burn out.')
    overwork()
    expect(store.getState().view?.ending).toBe('burnout')
    expect(html(store)).toContain('You ran on empty for too long.')
  })
})

/** Ends weeks with the books done until a message is in the inbox. */
function untilMessage(store: Store, maxWeeks = 30) {
  for (let i = 0; i < maxWeeks && store.getState().view!.inbox.length === 0; i++) {
    store.getState().setBookkeepingHours(2)
    store.getState().endWeek()
    store.getState().dismissReport()
  }
  expect(store.getState().view!.inbox.length).toBeGreaterThan(0)
}

describe('phase 4 screens', () => {
  it('shows the new sections on the Plan tab', () => {
    const store = fresh('p4-plan')
    begin(store)
    const page = html(store)
    expect(page).toContain('Test the demand')
    expect(page).toContain('Landing page: Coworking spaces')
    expect(page).toContain('€200')
    expect(page).toContain('€500')
    expect(page).toContain('Pre-sale: Medical practices')
    expect(page).toContain('Open leads: 0. A batch needs 5.')
    expect(page).toContain('The books')
    expect(page).toContain('Open: 0 h. Planned this week: 0 h.')
    expect(page).not.toMatch(/[{}]/)
  })

  it('reports landing page results on the Market tab, a few weeks later', () => {
    const store = fresh('p4-landing')
    begin(store)
    store.getState().setLanding('coworking', 20_000)
    store.getState().endWeek()
    const first = html(store)
    expect(first).toContain('Ads for landing page tests cost €200.')
    store.getState().dismissReport()
    store.getState().setTab('market')
    expect(html(store)).toContain('Landing page test running. Result in week 3.')
    for (let i = 0; i < 2; i++) {
      store.getState().setBookkeepingHours(2)
      store.getState().endWeek()
      if (i === 1) expect(html(store)).toMatch(/Landing page test for Coworking spaces: \d+ of 133/)
      store.getState().dismissReport()
    }
    expect(html(store)).toMatch(/Week 3: \d+ of 133 visitors signed up \(€200 of ads\)/)
  })

  it('shows the inbox with hours on every choice, and counts open messages on its tab', () => {
    const store = fresh('p4-inbox')
    begin(store)
    expect(html(store)).not.toContain('Inbox (')
    store.getState().setTab('inbox')
    expect(html(store)).toContain('Nothing to answer')
    untilMessage(store)
    const n = store.getState().view!.inbox.length
    expect(html(store)).toContain(`Inbox (${n})`)
    store.getState().setTab('inbox')
    const page = html(store)
    for (const m of store.getState().view!.inbox) {
      expect(page).toContain(m.text.replace(/'/g, '&#x27;').replace(/"/g, '&quot;'))
      for (const c of m.choices) expect(page).toContain(c.label.replace(/'/g, '&#x27;'))
    }
    expect(page).not.toMatch(/chance|probab|%/i)
  })

  it('answers a message: its hours count at once and the answer is saved', () => {
    const storage = memoryStorage()
    const store = createGameStore({ storage, makeSeed: () => 'p4-answer' })
    begin(store)
    untilMessage(store)
    const message = store.getState().view!.inbox[0]!
    const choice = message.choices.find((c) => c.hours > 0) ?? message.choices[0]!
    store.getState().answer(message.id, choice.id)
    expect(store.getState().view!.committedHours).toBe(choice.hours)
    expect(store.getState().plannedHours).toBe(choice.hours)
    expect(storage.current()!.actions.at(-1)).toMatchObject({
      type: 'respond',
      choiceId: choice.id,
    })
    store.getState().setTab('inbox')
    expect(html(store)).toContain('It takes effect when you end the week.')
    // A continued run keeps the answer.
    const again = createGameStore({ storage, makeSeed: () => 'x' })
    again.getState().continueRun()
    expect(again.getState().view).toEqual(store.getState().view)
  })

  it('books a search on the Team tab and shows the candidates later', () => {
    const store = fresh('p4-team')
    begin(store)
    store.getState().setTab('team')
    const page = html(store)
    expect(page).toContain('Look for a Developer')
    expect(page).toContain('€4,200 per month')
    store.getState().setSearchRole('developer')
    expect(store.getState().plannedHours).toBe(6)
    expect(html(store)).toContain('Search booked (6 h). Tap to cancel.')
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(html(store)).toContain('Looking for a Developer. Candidates arrive in week 3.')
    for (let i = 0; i < 2; i++) {
      store.getState().setBookkeepingHours(2)
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const candidates = html(store)
    expect(candidates).toContain('Candidates')
    expect(candidates).toMatch(/Impression: (Weak|Solid|Strong|Outstanding)/)
    expect(candidates).toContain('Make an offer')
  })

  it('shows invoices on the Money tab, with a chase button when one is overdue', () => {
    const store = fresh('p4-money')
    begin(store)
    store.getState().setTab('money')
    expect(html(store)).toContain('No invoices yet.')
    expect(html(store)).toContain('Shut down the company')
  })
})

describe('shutting down', () => {
  it('asks first, and does nothing until the player says yes', () => {
    const storage = memoryStorage()
    const store = createGameStore({ storage, makeSeed: () => 'quit' })
    begin(store)
    store.getState().setTab('money')
    const page = html(store)
    expect(page).toContain('Shut down the company')
    expect(page).not.toContain('Yes, shut it down')

    // A stray call without the question being asked changes nothing.
    store.getState().shutDown()
    expect(store.getState().view!.status).toBe('running')

    store.getState().askShutDown()
    const asked = html(store)
    expect(asked).toContain('Shut down the company?')
    expect(asked).toContain('Yes, shut it down')
    expect(asked).toContain('No, keep going')

    store.getState().cancelShutDown()
    expect(html(store)).not.toContain('Yes, shut it down')
    store.getState().shutDown()
    expect(store.getState().view!.status).toBe('running')
    expect(storage.current()!.actions).toEqual([])
  })

  it('asking is forgotten when the player leaves the tab', () => {
    const store = fresh('quit-tab')
    begin(store)
    store.getState().setTab('money')
    store.getState().askShutDown()
    store.getState().setTab('plan')
    store.getState().setTab('money')
    expect(html(store)).not.toContain('Yes, shut it down')
  })

  it('ends the run with the shut down ending, saves it, and shows how it ended', () => {
    const storage = memoryStorage()
    const store = createGameStore({ storage, makeSeed: () => 'quit2' })
    begin(store)
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().setTab('money')
    store.getState().askShutDown()
    store.getState().shutDown()
    const view = store.getState().view!
    expect(view.status).toBe('ended')
    expect(view.ending).toBe('shut_down')
    expect(view.week).toBe(2)
    expect(storage.current()!.actions.at(-1)).toEqual({ type: 'shutDown', week: 2 })
    const page = html(store)
    expect(page).toContain('The run is over')
    expect(page).toContain('You closed the company on purpose.')
    expect(page).toContain('Back to start')
    expect(page).not.toContain('End week</button>')
    // Reloading shows the same ending.
    const again = createGameStore({ storage, makeSeed: () => 'x' })
    again.getState().continueRun()
    expect(again.getState().view!.ending).toBe('shut_down')
    expect(html(again)).toContain('You closed the company on purpose.')
    store.getState().leaveRun()
    expect(storage.current()).toBeNull()
  })
})
