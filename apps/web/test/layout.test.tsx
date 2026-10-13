import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import {
  checkPlan,
  createGame,
  getView,
  type PlayerView,
  type WeekReport,
} from '@founder-mode/engine'
import { App } from '../src/App'
import { formatEuro } from '../src/format'
import { headlineStats } from '../src/components/Headline'
import { Scene } from '../src/components/Scene'
import { upcoming, worry } from '../src/components/Statement'
import { repeatPlan } from '../src/repeatPlan'
import { groupWeek, notableMoments } from '../src/screens/Results'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'
import { StoreProvider } from '../src/useGame'

type Store = ReturnType<typeof createGameStore>
type Layout = 'phone' | 'desk'

const html = (store: Store, layout: Layout = 'phone') =>
  renderToString(<App store={store} layout={layout} />).replace(/<!-- -->/g, '')
const text = (store: Store, layout: Layout = 'phone') =>
  html(store, layout)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')

function run(seed: string): Store {
  const store = createGameStore({ storage: memoryStorage(), makeSeed: () => seed })
  store.getState().startRun()
  while (store.getState().introStep !== null) store.getState().nextIntro()
  return store
}

function week(store: Store) {
  store.getState().endWeek()
  while (store.getState().report && store.getState().momentsSeen < 5) store.getState().nextMoment()
  store.getState().dismissReport()
}

describe('layouts', () => {
  it('phone: five tabs, no Team tab, the scene strip on the Inbox tab only', () => {
    const store = run('phone')
    const page = html(store)
    const tabs = [...page.matchAll(/<nav[^>]*aria-label="Main sections"[\s\S]*?<\/nav>/g)][0]![0]
    expect(tabs.match(/<button/g)).toHaveLength(5)
    for (const name of ['Inbox', 'Plan', 'Who pays', 'Market', 'Money']) {
      expect(tabs).toContain(name)
    }
    expect(tabs).not.toContain('Team')
    expect(page).not.toContain('Where you work')
    store.getState().setTab('inbox')
    expect(text(store)).toContain('Where you work Kitchen table')
  })

  it('desk: inbox left, scene with My week and corkboard centre, money right', () => {
    const store = run('desk')
    week(store)
    const page = text(store, 'desk')
    const at = (s: string) => page.indexOf(s)
    expect(at('On your desk')).toBeGreaterThan(-1)
    expect(at('Kitchen table')).toBeGreaterThan(at('On your desk'))
    expect(at('My week')).toBeGreaterThan(at('Kitchen table'))
    expect(at('Who might pay us')).toBeGreaterThan(at('My week'))
    expect(at('Company account')).toBeGreaterThan(at('Who might pay us'))
    expect(at('Coming up')).toBeGreaterThan(at('Company account'))
    // No bottom tab bar at the desk; the centre switches between My week and Market.
    expect(html(store, 'desk')).not.toContain('aria-label="Main sections"')
    store.getState().setTab('market')
    expect(text(store, 'desk')).toContain('What you have heard')
    expect(text(store, 'desk')).not.toContain('Talk to people')
  })

  it('desk: results and help take the centre alone', () => {
    const store = run('desk-results')
    store.getState().endWeek()
    const page = text(store, 'desk')
    expect(page).toContain('Next week')
    expect(page).not.toContain('On your desk')
    expect(page).not.toContain('End week')
  })

  it('selects the theme by uiStage', () => {
    const store = run('stage')
    expect(html(store)).toContain('data-stage="scrappy"')
    expect(html(store, 'desk')).toContain('data-stage="scrappy"')
  })

  it('draws every office stage, and names the people in the picture', () => {
    const store = run('scene')
    const pages = (
      ['kitchen_table', 'coworking_desk', 'trades_yard', 'van_garage', 'town_base'] as const
    ).map((stage) =>
      renderToString(
        <StoreProvider value={store}>
          <Scene stage={stage} />
        </StoreProvider>,
      ),
    )
    for (const page of pages) {
      // The chip names where the company really works, as the scenario calls it.
      expect(page).toContain('Kitchen table')
      expect(page).toContain('<svg')
      expect(page).toMatch(/You: rested, 0 h this week/)
    }
    expect(new Set(pages).size).toBe(5)
  })

  it('names an office stage as its scenario does, and draws one without a picture at a table', () => {
    const scenario = loadScenario('kantino')
    scenario.officeStages[0] = { ...scenario.officeStages[0]!, id: 'garage', name: 'Garage' }
    const store = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'garage',
      scenario: () => scenario,
    })
    store.getState().startRun()
    while (store.getState().introStep !== null) store.getState().nextIntro()
    const page = renderToString(
      <StoreProvider value={store}>
        <Scene />
      </StoreProvider>,
    )
    const table = renderToString(
      <StoreProvider value={store}>
        <Scene stage="kitchen_table" />
      </StoreProvider>,
    )
    expect(page).toContain('Garage')
    expect(page).toBe(table)
  })
})

describe('headline numbers', () => {
  it('shows cash, runway, monthly revenue and customers on every screen', () => {
    const store = run('headline')
    for (const tab of ['plan', 'inbox', 'market', 'pipeline', 'money'] as const) {
      store.getState().setTab(tab)
      const page = text(store)
      for (const title of ['Cash', 'Runway', 'Revenue', 'Customers']) {
        expect(page, `${tab} ${title}`).toContain(title)
      }
    }
  })

  it("shows each number's change since last week, matching that week's results", () => {
    const store = run('changes')
    week(store)
    expect(headlineStats(store.getState().view!).every((s) => s.change === null)).toBe(true)
    for (let i = 0; i < 3; i++) week(store)
    const view = store.getState().view!
    const stats = headlineStats(view)
    expect(stats.every((s) => s.change !== null)).toBe(true)
    // Week 4 is a month end: cash falls by exactly what the week moved, here the fixed costs.
    const last = view.history.at(-1)!
    const before = view.history.at(-2)!
    const cash = stats.find((s) => s.id === 'cash')!
    expect(last.cashCents - before.cashCents).toBe(-view.company.monthlyFixedCostsCents)
    expect(cash.change!.text).toBe(`▼ ${formatEuro(view.company.monthlyFixedCostsCents)}`)
    expect(cash.change!.good).toBe(false)
    expect(stats.find((s) => s.id === 'customers')!.change!.text).toBe('no change')
    expect(text(store)).toContain('since last week')
  })
})

describe("the player's week 34 (Kantino, 60 weeks)", () => {
  // After week 34: 450 EUR received, 675 EUR of living costs paid from cash (savings gone).
  const base = getView(createGame(loadScenario('kantino'), 'week34'))
  const row = (week: number, cashCents: number) => ({
    week,
    cashCents,
    savingsCents: 0,
    monthlyRevenueCents: 343_000,
    customers: 7,
    runwayWeeks: 26,
    investmentCents: 0,
    bookingRevenueCents: 0,
    bookingCostsCents: 0,
  })
  const view = {
    ...base,
    week: 35,
    company: { ...base.company, cashCents: 212_500, runwayWeeks: 26 },
    founder: { ...base.founder, savingsCents: 0 },
    history: [row(30, 217_000), row(33, 235_000), row(34, 212_500)],
  }

  it("shows the week's own change and a runway that ends with the run", () => {
    const stats = headlineStats(view)
    expect(stats.find((s) => s.id === 'cash')!.change!.text).toBe('▼ €225')
    const runway = stats.find((s) => s.id === 'runway')!
    expect(runway.value).toBe('26 weeks')
    expect(runway.note).toBe('until week 60')
    expect(worry(view, view.company.uiStage)).toBe(
      'At this pace the money lasts to week 60, and not a week longer.',
    )
  })

  it('says Covered when the money is not shrinking', () => {
    const covered = { ...view, company: { ...view.company, runwayWeeks: null } }
    const runway = headlineStats(covered).find((s) => s.id === 'runway')!
    expect(runway.value).toBe('Covered')
    expect(runway.note).toBeNull()
  })
})

describe('plan tab', () => {
  it('starts with every section closed, each with a one line summary', () => {
    const store = run('closed')
    const page = text(store)
    expect(page).toContain('Talk to people none')
    expect(page).not.toContain('Each interview costs 2 h')
    store.getState().setInterviews('coworking', 3)
    expect(text(store)).toContain('Talk to people 3 interviews 6 h')
    store.getState().setOutreach('medical', 'phone', 5)
    expect(text(store)).toContain('Find customers Phone to Medical practices 5 h')
  })

  it('opens several sections at once, and closes them all for the next week', () => {
    const store = run('open')
    store.getState().toggleSection('talk')
    store.getState().toggleSection('rest')
    const page = text(store)
    expect(page).toContain('Medical practices')
    expect(page).toContain('Rest hours')
    expect(html(store)).toMatch(/aria-expanded="true"[\s\S]*aria-expanded="true"/)
    store.getState().toggleSection('talk')
    expect(text(store)).not.toContain('Small offices')
    week(store)
    expect(store.getState().openSections).toEqual([])
  })

  it('splits the hours bar by activity, with each part named in text', () => {
    const store = run('bar')
    store.getState().setInterviews('coworking', 2)
    store.getState().setBuild('basic_ordering', 10)
    store.getState().setOutreach('coworking', 'phone', 6)
    // The bar carries no text of its own, so it says in words what it shows.
    expect(html(store)).toMatch(/aria-label="Sales 6 h, Building 10 h, Learning 4 h, free \d+ h"/)
  })

  it('repeats last week on one tap, without one-off decisions', () => {
    const store = run('repeat')
    expect(text(store)).not.toContain('Same as last week')
    store.getState().setInterviews('medical', 2)
    store.getState().setOutreach('coworking', 'in_person', 8)
    store.getState().setRestHours(3)
    store.getState().setTransferCents(10_000)
    store.getState().setSearchRole('developer')
    week(store)
    expect(text(store)).toContain('Same as last week')
    store.getState().repeatLastWeek()
    const plan = store.getState().plan
    expect(plan.interviews).toEqual({ medical: 2 })
    expect(plan.outreach).toEqual({ coworking: { channel: 'in_person', hours: 8 } })
    expect(plan.restHours).toBe(3)
    expect(plan.transferToCompanyCents).toBe(0)
    expect(plan.searchRole).toBeNull()
    expect(store.getState().plannedHours).toBe(4 + 8 + 3)
  })

  it('does not repeat building a shipped feature or batches that are used up', () => {
    const store = run('repeat-clip')
    const view = store.getState().view!
    const feature = view.product.features[0]!
    const last = {
      ...store.getState().plan,
      build: { [feature.id]: feature.buildHours + 10 },
      presales: { medical: 9 },
      demos: ['lead_1'],
      chase: ['inv_1'],
    }
    const shipped: PlayerView = {
      ...view,
      product: {
        ...view.product,
        features: view.product.features.map((f) =>
          f.id === feature.id ? { ...f, shipped: true, remainingHours: 0 } : f,
        ),
      },
    }
    const plan = repeatPlan(last, shipped)
    expect(plan.build).toEqual({})
    expect(plan.presales).toEqual({ medical: view.costs.presaleMaxBatches })
    expect(plan.demos).toEqual([])
    expect(plan.chase).toEqual([])
  })

  it('has hiring as a Plan section', () => {
    const store = run('hiring')
    store.getState().toggleSection('team')
    expect(text(store)).toContain('Look for a Developer')
  })
})

describe('results', () => {
  it('shows an ordinary week on one screen with no extra steps', () => {
    const store = run('ordinary')
    store.getState().endWeek()
    expect(notableMoments(store.getState().report!, store.getState().view!)).toEqual([])
    expect(text(store)).toContain('Next week')
  })

  it('gives only the first paying customer a full screen step; a hire and milestones go on the summary', () => {
    const store = run('moments')
    const view = store.getState().view!
    const report: WeekReport = {
      week: 9,
      plannedHours: 40,
      energyBefore: 80,
      energyAfter: 80,
      interviews: [],
      entries: [
        {
          kind: 'lead_update',
          change: 'won',
          leadId: 'l1',
          name: 'Werk Neun',
          segmentId: 'coworking',
        },
        { kind: 'hire_started', name: 'Aylin Demir', role: 'developer' },
      ],
      ledger: {
        week: 9,
        revenueCents: 0,
        fixedCostsCents: 0,
        freelanceCents: 0,
        livingCostsCents: 0,
        founderDrawCents: 0,
        transferCents: 0,
        autoTransferCents: 0,
        adSpendCents: 0,
        otherCostsCents: 0,
        otherIncomeCents: 0,
        investmentCents: 0,
        bookingRevenueCents: 0,
        bookingCostsCents: 0,
        loanInCents: 0,
        loanPrincipalCents: 0,
        loanInterestCents: 0,
        loanFeeCents: 0,
        cashEndCents: 0,
        savingsEndCents: 0,
        monthlyRevenueCents: 0,
        customers: 0,
        runwayWeeks: null,
        energyEnd: 80,
        hours: { learning: 0, building: 0, selling: 0, admin: 0, rest: 0 },
      },
      ending: null,
      milestones: [
        { id: 'first_customer', name: 'First paying customer', week: 9 },
        { id: 'first_hire', name: 'First hire', week: 9 },
      ],
      uiStageChanged: false,
    }
    const moments = notableMoments(report, view)
    expect(moments.map((m) => m.id)).toEqual(['first_customer'])
    expect(moments[0]!.text).toContain('Werk Neun will pay €450 every month.')
    const summary = groupWeek(report, view, 'scrappy')
      .flatMap(([, lines]) => lines)
      .map((l) => renderToString(<>{l.node}</>))
      .join(' ')
    expect(summary).toContain('Aylin Demir started work today.')
    // A second customer is no longer a moment.
    const weekEnd = (w: number, customers: number) => ({
      week: w,
      cashCents: 0,
      savingsCents: 0,
      monthlyRevenueCents: 0,
      customers,
      runwayWeeks: null,
      investmentCents: 0,
    })
    const later: PlayerView = { ...view, history: [weekEnd(7, 1), weekEnd(8, 2)] }
    expect(notableMoments(report, later)).toEqual([])
  })

  it('shows the ending as its own step, then the post-mortem', () => {
    const store = run('the-end')
    while (store.getState().view!.status === 'running') {
      store.getState().endWeek()
      if (store.getState().view!.status === 'running') store.getState().dismissReport()
    }
    const ending = text(store)
    expect(ending).toContain('The run is over')
    expect(ending).toContain('What happened')
    expect(ending).not.toContain('Same market again')
    store.getState().nextMoment()
    const after = text(store)
    expect(after).toContain('Same market again')
    expect(after).toContain('Next time')
  })
})

describe('money', () => {
  it('lists what is coming up, soonest first, starting with the month end', () => {
    const store = run('coming')
    store.getState().setLanding('coworking', 30_000)
    week(store)
    const items = upcoming(store.getState().view!)
    expect(items[0]!.text).toContain('Landing page result, Coworking spaces')
    expect(items.map((i) => i.week)).toEqual([...items.map((i) => i.week)].sort((a, b) => a - b))
    expect(items.some((i) => i.text.startsWith('Month end.'))).toBe(true)
  })

  it('writes the worry note from the runway', () => {
    const store = run('worry')
    const view = store.getState().view!
    expect(worry(view, 'scrappy')).toBe(
      `Week ${view.week + view.company.runwayWeeks!}: we are out of money.`,
    )
  })
})

describe('energy', () => {
  it('uses one 0 to 100 scale on the plan, in help and in the results', () => {
    const store = run('energy-scale')
    expect(text(store)).toContain('Energy 80 of 100')
    store.getState().openExplain('energy')
    expect(text(store)).toContain('Below 70 what you try starts to work less well, below 30')
    store.getState().closeExplain()
    store.getState().endWeek()
    expect(text(store)).toMatch(/Energy 80 to \d+\./)
  })
})

/** Every .tsx file under src. */
function sources(): { file: string; code: string }[] {
  const out: { file: string; code: string }[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (entry.name.endsWith('.tsx'))
        out.push({ file: path, code: readFileSync(path, 'utf8') })
    }
  }
  walk(join(__dirname, '../src'))
  return out
}

describe('static checks', () => {
  it('has no hardcoded words in JSX text or text attributes', () => {
    for (const { file, code } of sources()) {
      const jsxText = [...code.matchAll(/>\s*([A-Za-z][A-Za-z ,.'!?]{2,})\s*</g)].map((m) => m[1])
      expect(jsxText, file).toEqual([])
      const attrs = [
        ...code.matchAll(/\b(aria-label|title|alt|placeholder)="([^"]*[A-Za-z][^"]*)"/g),
      ]
      expect(
        attrs.map((m) => m[0]),
        file,
      ).toEqual([])
    }
  })

  it('gives every button a class with a touch target of at least 44 px', () => {
    const css = new Map<string, string>()
    const cssOf = (dir: string, rel: string) => {
      const path = join(dir, rel)
      if (!css.has(path)) css.set(path, readFileSync(path, 'utf8'))
      return css.get(path)!
    }
    /** min-height (or height) of a class in a CSS module, from its own rule. */
    const minHeight = (source: string, name: string) => {
      const rules = [...source.matchAll(new RegExp(`\\.${name}\\b[^{]*\\{([^}]*)\\}`, 'g'))]
      const px = rules.flatMap((r) =>
        [...r[1]!.matchAll(/(?:min-)?height:\s*(\d+)px/g)].map((v) => Number(v[1])),
      )
      // Heights in notebook lines, such as calc(2 * var(--line)), are 28 px each.
      const lines = rules.flatMap((r) =>
        [...r[1]!.matchAll(/(?:min-)?height:\s*calc\(\s*(\d+)\s*\*\s*var\(--line\)\)/g)].map(
          (v) => Number(v[1]) * 28,
        ),
      )
      // The notebook's own unit, var(--line), is 44 px.
      const unit = rules.flatMap((r) =>
        [...r[1]!.matchAll(/(?<![-\w])height:\s*var\(--line\)/g)].map(() => 44),
      )
      return Math.max(0, ...px, ...lines, ...unit)
    }
    let buttons = 0
    for (const { file, code } of sources()) {
      const dir = join(file, '..')
      const imports = new Map(
        [...code.matchAll(/import (\w+) from '(\.[^']+\.module\.css)'/g)].map((m) => [
          m[1]!,
          m[2]!,
        ]),
      )
      for (const match of code.matchAll(/<button\b/g)) {
        buttons++
        const tag = openingTag(code, match.index)
        const classes = [...tag.matchAll(/\b(\w+)\.(\w+)\b/g)].filter(([, alias]) =>
          imports.has(alias!),
        )
        const tallest = Math.max(
          0,
          ...classes.map(([, alias, name]) => minHeight(cssOf(dir, imports.get(alias!)!), name!)),
        )
        expect([file, tag.slice(0, 80), tallest >= 44]).toEqual([file, tag.slice(0, 80), true])
      }
    }
    expect(buttons).toBeGreaterThan(20)
  })
})

/** The opening tag starting at `start`, up to its closing `>` outside braces. */
function openingTag(code: string, start: number): string {
  let depth = 0
  for (let i = start + 1; i < code.length; i++) {
    const c = code[i]
    if (c === '{') depth++
    else if (c === '}') depth--
    else if (c === '>' && depth === 0 && code[i - 1] !== '=') return code.slice(start, i + 1)
  }
  return code.slice(start)
}

describe('planner header hours', () => {
  it('counts booked demos, follow ups, chasing and bug fixing in the h planned total', () => {
    const store = run('header-hours')
    const scenario = loadScenario('kantino')
    const base = createGame(scenario, 'header-hours-state')
    const lead = (i: number, stage: 'lead' | 'demo') => ({
      id: `lead_${i}`,
      name: `Firma ${i}`,
      segmentId: scenario.segments[0]!.id,
      stage,
      source: 'outreach' as const,
      stageSinceWeek: 1,
      lastContactWeek: 1,
      silentSinceWeek: null,
      lostReason: null,
    })
    const game = {
      ...base,
      week: 9,
      leads: [lead(1, 'demo'), lead(2, 'lead')],
      product: { ...base.product, bugs: 3 },
      invoices: [
        {
          id: 'invoice_1',
          customerId: 'customer_1',
          customerName: 'Kunde Eins',
          segmentId: scenario.segments[0]!.id,
          amountCents: 30_000,
          issuedWeek: 4,
          dueWeek: 6,
          paidWeek: null,
          writtenOffWeek: null,
        },
      ],
    }
    const plan = {
      ...store.getState().plan,
      demos: ['lead_1'],
      followUps: ['lead_2'],
      chase: ['invoice_1'],
      bugFixHours: 2,
    }
    const check = checkPlan(game, plan)
    expect(check.issues).toEqual([])
    const expected =
      scenario.sales.demoHours +
      scenario.sales.followUpHours +
      scenario.finance.chaseHours +
      plan.bugFixHours
    expect(expected).toBe(3 + 1 + 1 + 2)
    expect(check.plannedHours).toBe(expected)

    store.setState({ view: getView(game), plan, plannedHours: check.plannedHours })
    store.getState().setTab('plan')
    expect(text(store)).toContain(`${expected} of 50 h`)
  })
})
