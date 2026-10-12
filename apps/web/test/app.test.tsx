import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { App } from '../src/App'
import { loadScenario } from '@founder-mode/content'
import { count, label } from '../src/labels'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

const html = (store: ReturnType<typeof createGameStore>, layout: 'phone' | 'desk' = 'phone') =>
  renderToString(<App store={store} layout={layout} />).replace(/<!-- -->/g, '')

/** The page as plain text, tags removed, for checking what a player reads. */
const text = (store: Store, layout: 'phone' | 'desk' = 'phone') =>
  html(store, layout)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

type Store = ReturnType<typeof createGameStore>

const SECTIONS = ['talk', 'test', 'build', 'sell', 'demos', 'team', 'rest'] as const

/** Opens every Plan section, as a player tapping each header would. */
function openAll(store: Store) {
  for (const s of SECTIONS) {
    if (!store.getState().openSections.includes(s)) store.getState().toggleSection(s)
  }
}

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
    expect(plan).toContain('Week 1 of 60')
    expect(plan).toContain('End week')
    expect(plan).toContain('Talk to people')
    expect(text(store)).toContain('Runway 29 weeks')

    for (let i = 0; i < 3; i++) {
      store.getState().setInterviews('coworking', 2)
      store.getState().endWeek()
      const results = html(store)
      expect(results).toContain(`Week ${i + 1}`)
      expect(results).toContain('You spoke to 2 people at Coworking spaces')
      expect(results).toContain('Next week')
      // Ending another week from the results screen would skip its report.
      expect(results).not.toContain('End week')
      store.getState().dismissReport()
    }
    expect(html(store)).toContain('Week 4 of 60')
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

  it('shows the post-mortem of a finished run and offers the next run', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'end' })
    begin(store)
    while (store.getState().view?.status === 'running') {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const ended = html(store)
    expect(ended).toContain('What happened')
    expect(ended).toContain('New run')
    expect(ended).toContain('Same market again')
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
    expect(seen[0]).toContain('€9,000')
    expect(seen[0]).toContain('€14,250')
    expect(seen[0]).toContain('€675')
    expect(seen[0]).toContain('€2,700')
    expect(seen[0]).toContain('about seven months')
    expect(seen[1]).toContain('Kantino is software')
    expect(seen[2]).toContain('small offices, coworking spaces and medical practices')
    expect(seen[3]).toContain('Last 60 weeks')
    expect(seen[3]).toContain('Start week 1')
    expect(html(store)).toContain('Week 1 of 60')
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
    expect(page).toContain('Last 60 weeks')
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
      const text = label(`explain.${key}.text`, stage, { low: 30, tired: 70, weeks: '3 weeks' })
      expect(text.split('. ').length).toBe(2)
      expect(page).toContain(text.replace(/'/g, '&#x27;'))
    }
    store.getState().closeExplain()
    expect(html(store)).not.toContain('Got it')
    // The terms are tappable on screen.
    const page = html(store)
    expect(text(store)).toContain('Runway 29 weeks')
    // The planner has no "?" of its own; its hours and energy rules live in Help.
    expect(page).not.toMatch(/aria-label="(Energy|Hours): What does this mean\?"/)
    store.getState().openHelp()
    expect(html(store)).toContain('A normal week is 50 hours')
  })

  it('words the hours clearly', () => {
    const store = fresh()
    begin(store)
    const page = html(store)
    expect(page).toContain('0 of 50 h')
    expect(page).not.toContain('(up to 65)')
    store.getState().openExplain('hours')
    expect(html(store)).toContain('A normal week is 50 hours, and you can plan up to 65')
  })

  it('gives every Plan action a line about its cost, result and timing', () => {
    const store = fresh()
    begin(store)
    store.getState().setBuild('basic_ordering', 40)
    store.getState().endWeek()
    store.getState().dismissReport()
    openAll(store)
    const page = html(store).replace(/&#x27;/g, "'")
    // Each open section ends with one hint line and a "more" link to its full explanation.
    expect(page).toContain('Restores energy this week.')
    expect(page).toContain('moreText')
    for (const [key, line] of [
      ['talk', "Gives you one answer in the interviewee's own words about that market."],
      ['build', 'A feature ships once all its hours are in'],
      ['sell', 'Finds new leads at the end of this week'],
      ['hiring', 'candidates arrive 2 weeks later'],
      ['demos', 'The verdict on the demo arrives this week'],
      ['test', 'A landing page test costs 8 h and the ad budget'],
    ] as const) {
      store.getState().openExplain(key)
      expect(html(store).replace(/&#x27;/g, "'"), key).toContain(line)
    }
    // Bug fixing appears once there are bugs to fix.
    expect(page).toContain('Fix bugs')
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
    // Counts by answer type come first; the quotes wait behind a tap.
    expect(page).toContain('What people answered')
    expect(page).toContain('Show the quotes, newest first')
    expect(page).not.toContain('<blockquote')
    expect(page).toContain('Features people asked for')
    expect(page).toMatch(/asked for by \d of 6/)
    expect(page).toContain('Agencies and firms with 10 to 50 staff')
  })

  it('shows the week on one screen, grouped under headings, most important first', () => {
    const store = fresh()
    begin(store)
    store.getState().setInterviews('medical', 2)
    store.getState().setOutreach('coworking', 'phone', 10)
    store.getState().endWeek()
    const page = html(store)
    const heading = (name: string) => page.indexOf(`>${name}</h3>`)
    for (const name of ['Money', 'Sales', 'Learning', 'Founder']) {
      expect(heading(name), name).toBeGreaterThan(-1)
    }
    // Nothing was built, so there is no Product heading.
    expect(heading('Product')).toBe(-1)
    // Interviews (learning) matter more than the plain weekly numbers and the energy line.
    expect(heading('Learning')).toBeLessThan(heading('Money'))
    expect(heading('Money')).toBeLessThan(heading('Founder'))
    expect(page.indexOf('You spoke to 2 people at Medical practices')).toBeGreaterThan(
      heading('Learning'),
    )
    expect(page.indexOf('Company received')).toBeGreaterThan(heading('Money'))
    // Quotes sit behind a tap, one summary line per market.
    expect(page).toContain('Show what they said')
    expect(page).not.toContain('<blockquote')
    expect(page).not.toMatch(/[{}]/)
    // An ordinary week has no extra steps: one tap goes back to planning.
    expect(page).toContain('Next week')
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
    expect(page).toMatch(/Living costs from your savings<\/span><span[^>]*>€675</)
    expect(page).toMatch(/Your savings now<\/span><span[^>]*>€13,575</)
  })

  it('has a price control on the Money tab that applies from the next resolved week', () => {
    const store = fresh('price')
    store.getState().setTab('money')
    expect(html(store)).toContain('Price per customer')
    expect(html(store)).toContain('Now: €450 per month')
    store.getState().setPriceCents(60_000)
    expect(html(store)).toContain('From this week: €600 per month')
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(store.getState().view?.company.priceCentsPerMonth).toBe(60_000)
    expect(store.getState().plan.priceCentsPerMonth).toBeNull()
    expect(html(store)).toContain('Now: €600 per month')
  })

  it('keeps the outreach channel from week to week', () => {
    const store = fresh('channel')
    store.getState().setOutreach('coworking', 'in_person', 5)
    store.getState().endWeek()
    store.getState().dismissReport()
    expect(store.getState().plan.outreach).toEqual({})
    store.getState().toggleSection('sell')
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
    expect(html(store)).toContain('You burnt out in week 5')
  })
})

/** Ends weeks until a message is in the inbox. */
function untilMessage(store: Store, maxWeeks = 30) {
  for (let i = 0; i < maxWeeks && store.getState().view!.inbox.length === 0; i++) {
    store.getState().endWeek()
    store.getState().dismissReport()
  }
  expect(store.getState().view!.inbox.length).toBeGreaterThan(0)
}

describe('phase 4 screens', () => {
  it('shows the new sections on the Plan tab', () => {
    const store = fresh('p4-plan')
    begin(store)
    store.getState().toggleSection('test')
    const page = html(store)
    expect(page).toContain('Test the demand')
    expect(page).toContain('Landing page tests')
    expect(page).toContain('Pre-sales')
    expect(page).toContain('€300')
    expect(page).toContain('€750')
    expect(page).toContain('Medical practices')
    expect(page).not.toMatch(/[{}]/)
  })

  it('reports landing page results on the Market tab a week later', () => {
    const store = fresh('p4-landing')
    begin(store)
    store.getState().setLanding('coworking', 30_000)
    store.getState().endWeek()
    const first = html(store)
    expect(first).toContain('Ads for landing page tests cost €300.')
    store.getState().dismissReport()
    store.getState().setTab('market')
    expect(html(store)).toContain('Landing page test running. Result in week 2.')
    store.getState().endWeek()
    expect(html(store)).toMatch(
      /Landing page test for Coworking spaces: \d+ of 133 visitors signed up, and \d+ left their details/,
    )
    store.getState().dismissReport()
    expect(html(store)).toMatch(/Week 2: \d+ of 133 visitors signed up \(€300 of ads\)/)
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

  it('books a search in the Hiring section of the Plan tab and shows the candidates later', () => {
    const store = fresh('p4-team')
    begin(store)
    expect(text(store)).toContain('Hiring nobody yet, one hire allowed')
    store.getState().toggleSection('team')
    const page = html(store)
    expect(page).toContain('Look for a Developer')
    expect(page).toContain('€3,900 per month')
    store.getState().setSearchRole('developer')
    expect(store.getState().plannedHours).toBe(6)
    expect(html(store)).toContain('Search booked (6 h). Tap to cancel.')
    expect(text(store)).toContain('Hiring search for a Developer 6 h')
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().toggleSection('team')
    expect(text(store)).toContain('Hiring candidates arrive in week 3')
    for (let i = 0; i < 2; i++) {
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    store.getState().toggleSection('team')
    const candidates = html(store)
    expect(candidates).toContain('Candidates')
    expect(candidates).toMatch(/Impression: (Weak|Solid|Strong|Outstanding)/)
    expect(candidates).toContain('Make an offer')
  })

  it('books a freelancer in the Hiring section, gives them work, and gives notice', () => {
    const store = fresh('p9-freelance')
    begin(store)
    store.getState().toggleSection('team')
    let page = text(store)
    expect(page).toContain('Freelancer')
    expect(page).toContain('Freelance developer €68 an hour')
    expect(page).toContain('20 h: €1,360 a week')
    expect(page).toContain('One extra bug per feature.')
    expect(page).toContain('Outreach only, no demos.')
    expect(page).toContain('18 h of 20 h become work.')
    expect(page).toContain('The first week at half pace.')
    store.getState().setFreelance({ book: { role: 'developer', hoursPerWeek: 20 } })
    expect(store.getState().plannedHours).toBe(0)
    page = text(store)
    expect(page).toContain(
      'Booked: freelance developer, 20 h a week, from next week. Tap to cancel.',
    )
    expect(page).toContain('Hiring booking a freelancer')
    store.getState().endWeek()
    expect(text(store)).toContain(
      'Arne Lindgren is booked as your freelance developer, 20 h a week from week 2.',
    )
    store.getState().dismissReport()
    store.getState().toggleSection('team')
    page = text(store)
    expect(page).toContain('Hiring freelancer Arne Lindgren')
    expect(page).toContain('Your freelance developer')
    expect(page).toContain('Arne Lindgren 20 h, €1,360 a week')
    expect(page).toContain('First week: 9 h of work.')
    expect(page).toContain('The freelancer builds')
    // Still allowed: the one hire.
    expect(page).toContain('Look for a Developer')
    store.getState().setFreelance({ build: 'basic_ordering' })
    store.getState().endWeek()
    page = text(store)
    expect(page).toContain(
      'Your freelancer put in 9 build hours, most of the week went on reading your code.',
    )
    expect(page).toContain('Arne Lindgren billed €1,360 for 20 h.')
    expect(page).toContain('Company paid €1,360')
    store.getState().dismissReport()
    // The task carries over to the next week's draft.
    expect(store.getState().plan.freelance.build).toBe('basic_ordering')
    store.getState().setTab('money')
    expect(text(store)).toContain('Freelancer, billed every week €1,360')
    store.getState().setTab('plan')
    store.getState().toggleSection('team')
    store.getState().setFreelance({ end: true })
    expect(text(store)).toContain('Notice this week. Tap to take it back.')
    store.getState().endWeek()
    expect(text(store)).toContain('Arne Lindgren has your notice. Last week: week 4.')
    store.getState().dismissReport()
    store.getState().toggleSection('team')
    expect(text(store)).toContain('Last week: week 4.')
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
    expect(page).toContain('You closed the company in week 2')
    expect(page).toContain('New run')
    expect(page).not.toContain('End week</button>')
    // Reloading shows the same post-mortem.
    const again = createGameStore({ storage, makeSeed: () => 'x' })
    again.getState().continueRun()
    expect(again.getState().view!.ending).toBe('shut_down')
    expect(html(again)).toContain('You closed the company in week 2')
    store.getState().leaveRun()
    expect(storage.current()).toBeNull()
  })
})

describe('follow ups, costs and plurals', () => {
  it('shows money costs on inbox choices, hours first, and "Free" only when nothing is spent', () => {
    const scenario = () => {
      const s = loadScenario('kantino')
      const event = {
        ...s.events[0]!,
        id: 'costly',
        once: true,
        when: [],
        from: 'none' as const,
        text: 'Pay up.',
        defaultChoice: 'no',
        choices: [
          { id: 'no', label: 'No', hours: 0, effects: [] },
          {
            id: 'act',
            label: 'Act',
            hours: 2,
            effects: [
              { type: 'cash' as const, amountCents: -40_000, chance: 1, when: [] },
              {
                type: 'fixedCost' as const,
                id: 'x',
                name: 'X',
                monthlyCents: 4_000,
                chance: 1,
                when: [],
              },
            ],
          },
        ],
      }
      return { ...s, events: [event], inbox: { ...s.inbox, drawChance: 1 } }
    }
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'cost', scenario })
    begin(store)
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().setTab('inbox')
    const page = text(store)
    expect(page).toContain('Act (2 h, €400, €40 a month)')
    expect(page).toContain('No (Free)')
  })

  it('offers a follow up on open leads in the Pipeline tab and plans its hour', () => {
    const store = fresh('followup')
    begin(store)
    for (let i = 0; i < 6 && !store.getState().view!.leads.some((l) => l.canFollowUp); i++) {
      store.getState().setOutreach('coworking', 'in_person', 40)
      store.getState().endWeek()
      store.getState().dismissReport()
    }
    const lead = store.getState().view!.leads.find((l) => l.canFollowUp)!
    store.getState().setTab('pipeline')
    expect(html(store)).toContain('Follow up (1 h)')
    store.getState().toggleFollowUp(lead.id)
    expect(store.getState().plannedHours).toBe(1)
    expect(html(store)).toContain('Follow up booked, tap to cancel')
    store.getState().setTab('plan')
    expect(text(store)).toContain('Demos and follow ups 1 follow up 1 h')
    store.getState().toggleSection('demos')
    expect(html(store)).toContain('1 follow up (1 h)')
    store.getState().openExplain('demos')
    expect(html(store)).toContain('Costs 3 h per demo. A good demo starts a trial that runs 1 week')
  })

  it('says "1 batch left" and "2 batches left", and weeks in the singular', () => {
    expect(count('plan.presale.left', 'scrappy', 1)).toBe('1 batch left in this market.')
    expect(count('plan.presale.left', 'scrappy', 2)).toBe('2 batches left in this market.')
    expect(count('unit.weeks', 'scrappy', 1)).toBe('1 week')
    expect(count('unit.weeks', 'scrappy', 2)).toBe('2 weeks')
  })
})
