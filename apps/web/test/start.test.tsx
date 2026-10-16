import type { ScenarioAbout, ScenarioCategory, ScenarioId } from '@founder-mode/content'
import { loadScenario } from '@founder-mode/content'
import { renderToString } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/App'
import { categoryLayout, companiesIn, lengthTag } from '../src/startList'
import { browserProfiles, memoryProfiles, memoryStorage } from '../src/storage'
import { createGameStore, type StoreDeps } from '../src/store'

type Store = ReturnType<typeof createGameStore>

const html = (store: Store) =>
  renderToString(<App store={store} layout="phone" />)
    .replace(/<!-- -->/g, '')
    .replace(/&#x27;/g, "'")

const text = (store: Store) =>
  html(store)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

const store = (deps: Partial<StoreDeps> = {}) =>
  createGameStore({ storage: memoryStorage(), makeSeed: () => 'start', ...deps })

/** Plays a few weeks of a run and goes back to the Start screen, leaving it saved. */
function playAndLeave(s: Store, weeks: number) {
  while (s.getState().introStep !== null) s.getState().nextIntro()
  for (let i = 0; i < weeks; i++) {
    s.getState().endWeek()
    s.getState().dismissReport()
  }
  s.getState().leaveRun()
}

// Fixtures: any number of categories with any number of companies, all played as Kantino.
const fixture = (categoryCount: number, perCategory = 2) => {
  const categories: ScenarioCategory[] = Array.from({ length: categoryCount }, (_, i) => ({
    id: `c${i}`,
    name: `Category ${i}`,
    order: i,
  }))
  const catalogue: ScenarioAbout[] = categories.flatMap((c, i) =>
    Array.from({ length: perCategory }, (_, j) => ({
      id: `s${i}_${j}` as ScenarioId,
      name: `Company ${i}.${j}`,
      category: c.id,
      short: `Short line ${i}.${j}`,
      tags: [j % 2 ? 'Odd' : 'Even', 'Fixture'],
      lines: ['One.', 'Two.'],
      modes: ['standard'],
    })),
  )
  return {
    categories: () => categories,
    catalogue: () => catalogue,
    scenario: (id: ScenarioId) => ({ ...loadScenario('kantino'), id }),
  }
}

describe('the category layouts', () => {
  it('picks the layout from the number of categories', () => {
    expect([1, 2, 3, 4, 6, 7, 12].map(categoryLayout)).toEqual([
      'none',
      'tabs',
      'tabs',
      'chips',
      'chips',
      'grid',
      'grid',
    ])
  })

  it('shows two or three categories as a tab switch, the picked company’s category selected', () => {
    const page = html(store())
    expect(page).toMatch(/role="tablist" aria-label="Kind of business"[^>]*data-layout="tabs"/)
    expect(page).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>Startups</)
    expect(page).toMatch(/role="tab"[^>]*aria-selected="false" [^>]*tabindex="-1"[^>]*>Tourism</)
    expect(page).toContain('role="tabpanel"')
    const words = text(store())
    expect(words).toContain('Kantino Shared lunch orders for offices 60 or 104 weeks Software')
    expect(words).toContain('Zollstock Software for trade businesses 60 weeks Software')
    expect(words).not.toContain('Gratwanderung')
    expect(words).not.toContain('Coming later')
  })

  it('lists the tourism companies on the Tourism tab, each 104 weeks long', () => {
    const s = store()
    s.getState().selectCategory('tourism')
    const words = text(s)
    expect(words).toContain('Gratwanderung Guided mountain days, an hour south of Munich 104 weeks')
    expect(words).toContain('Hinterhof A tired restaurant in a Munich side street 104 weeks')
    expect(words).toContain('Seeblick Twelve rooms on a Bavarian lake, from 1994 104 weeks')
    expect(words).not.toContain('Kantino')
  })

  it('shows four to six categories as a row of chips', () => {
    for (const n of [4, 6]) {
      const page = html(store(fixture(n)))
      expect(page).toMatch(/role="tablist"[^>]*data-layout="chips"/)
      expect(page.match(/role="tab"/g)).toHaveLength(n)
      expect(page).toContain('Company 0.0')
      expect(page).not.toContain('Company 1.0')
    }
  })

  it('shows seven or more categories as a grid first, then the chosen list with a way back', () => {
    const s = store(fixture(8))
    let page = html(s)
    expect(page).not.toContain('role="tablist"')
    expect(page).not.toContain('Company 0.0')
    for (let i = 0; i < 8; i++) expect(page).toContain(`>Category ${i}</button>`)
    s.getState().selectCategory('c5')
    page = html(s)
    expect(page).toContain('All kinds of business')
    expect(page).toContain('Company 5.0')
    expect(page).not.toContain('>Category 4</button>')
    s.getState().selectCategory(null)
    expect(html(s)).toContain('>Category 4</button>')
  })

  it('shows no switch at all for a single category', () => {
    const page = html(store(fixture(1)))
    expect(page).not.toContain('role="tablist"')
    expect(page).toContain('Company 0.1')
  })

  it('adds a tag filter only above six companies in a category', () => {
    expect(html(store(fixture(2, 6)))).not.toContain('aria-label="Show only"')
    const page = html(store(fixture(2, 7)))
    expect(page).toContain('aria-label="Show only"')
    expect(page).toMatch(/aria-pressed="true"[^>]*>All</)
    for (const tag of ['60 weeks', 'Even', 'Odd', 'Fixture']) {
      expect(page).toMatch(new RegExp(`aria-pressed="false"[^>]*>${tag}<`))
    }
  })
})

describe('the company rows', () => {
  it('derives the length tag from the modes', () => {
    expect(lengthTag(['standard'], 'scrappy')).toBe('60 weeks')
    expect(lengthTag(['long'], 'scrappy')).toBe('104 weeks')
    expect(lengthTag(['standard', 'long'], 'scrappy')).toBe('60 or 104 weeks')
  })

  it('lists recently played companies first, then the content order', () => {
    const { catalogue } = fixture(1, 4)
    const ids = (recent: string[]) => companiesIn(catalogue(), 'c0', recent).map((c) => c.id)
    expect(ids([])).toEqual(['s0_0', 's0_1', 's0_2', 's0_3'])
    expect(ids(['s0_2', 'elsewhere', 's0_3'])).toEqual(['s0_2', 's0_3', 's0_0', 's0_1'])
  })

  it('moves a played company to the top of its category', () => {
    const profiles = memoryProfiles()
    const s = store({ profiles })
    s.getState().openSheet('zollstock')
    s.getState().startRun()
    playAndLeave(s, 1)
    expect(text(s)).toMatch(/Zollstock .* Kantino /)
    // And on the next visit.
    expect(text(store({ profiles }))).toMatch(/Zollstock .* Kantino /)
  })
})

describe('the company sheet', () => {
  it('opens on a row with the full description, best runs, the seed and the way in', () => {
    const s = store()
    expect(html(s)).not.toContain('role="dialog"')
    s.getState().openSheet('zollstock')
    const page = html(s)
    expect(page).toMatch(/role="dialog" aria-modal="true"/)
    const words = text(s)
    expect(words).toContain(
      'Job plans, quotes and customer updates for trade businesses that run on paper and phone calls.',
    )
    expect(words).toContain('Your best runs No finished runs yet.')
    expect(words).toContain('More options: start from a seed Seed (optional)')
    expect(page).toMatch(/<details[^>]*>/)
    expect(page).not.toMatch(/<details[^>]* open/)
    expect(words).toContain('Start a new run')
    expect(page).toMatch(/data-company="zollstock" aria-haspopup="dialog" aria-expanded="true"/)
    s.getState().closeSheet()
    expect(html(s)).not.toContain('role="dialog"')
  })

  it('offers the length only where a scenario has both modes', () => {
    const s = store()
    for (const [id, offered] of [
      ['kantino', true],
      ['zollstock', false],
      ['gratwanderung', false],
      ['hinterhof', false],
      ['seeblick', false],
    ] as const) {
      s.getState().openSheet(id)
      expect([id, text(s).includes('How long?')]).toEqual([id, offered])
    }
  })

  it('keeps the new run waiting until the scenarios and screens are in', () => {
    const s = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'wait',
      catalogue: fixture(2).catalogue,
      categories: fixture(2).categories,
    })
    s.setState({ ready: false })
    s.getState().openSheet('s0_0' as ScenarioId)
    expect(html(s)).toMatch(/<button type="button" class="[^"]*" disabled="">Start a new run/)
  })
})

describe('the Continue card', () => {
  it('is not there without a save', () => {
    const page = text(store())
    expect(page).not.toContain('Continue')
    expect(page).not.toContain('Other saved games')
  })

  it('shows the one save with its company, week and cash', () => {
    const s = store()
    s.getState().startRun()
    playAndLeave(s, 2)
    const cash = s.getState().saves[0]!.cashCents!
    const page = text(s)
    expect(page).toContain(
      `Continue: Kantino Week 3 of 60 · €${(cash / 100).toLocaleString('en-GB')} in the bank Continue`,
    )
    expect(page).not.toContain('Other saved games')
  })

  it('shows the game played last, and the others behind a link, each continuing its own', () => {
    const storage = memoryStorage()
    const profiles = memoryProfiles()
    const s = store({ storage, profiles })
    s.getState().startRun()
    playAndLeave(s, 1)
    s.getState().openSheet('kantino')
    s.getState().selectMode('long')
    s.getState().startRun()
    playAndLeave(s, 3)
    s.getState().openSheet('gratwanderung')
    s.getState().startRun()
    playAndLeave(s, 2)
    expect(s.getState().saves.map((x) => [x.scenarioId, x.mode, x.week])).toEqual([
      ['gratwanderung', 'long', 3],
      ['kantino', 'long', 4],
      ['kantino', 'standard', 2],
    ])
    const page = text(s)
    expect(page).toContain('Continue: Gratwanderung Week 3 of 104')
    expect(page).toContain('Other saved games')
    expect(page).not.toContain('Week 4 of 104')

    // Continuing an older one makes it the latest.
    s.getState().continueRun('kantino', 'standard')
    expect(s.getState().view).toMatchObject({ scenarioId: 'kantino', mode: 'standard', week: 2 })
    s.getState().leaveRun()
    expect(s.getState().saves[0]).toMatchObject({ scenarioId: 'kantino', mode: 'standard' })
    // A new session reads the same order.
    expect(
      store({ storage, profiles })
        .getState()
        .saves.map((x) => x.scenarioId),
    ).toEqual(['kantino', 'gratwanderung', 'kantino'])
  })

  it('still offers a save from before the notes, with the week read from the save', () => {
    const storage = memoryStorage()
    const s = store({ storage })
    s.getState().startRun()
    playAndLeave(s, 4)
    // A fresh profile: no notes, as on a device that saved before this version.
    const page = text(store({ storage }))
    expect(page).toContain('Continue: Kantino Week 5 Continue')
    expect(page).not.toContain('in the bank')
  })

  it('drops a finished run, and a save that cannot be read', () => {
    const storage = memoryStorage(null, { raw: { zollstock: 'not json' } })
    const s = store({ storage })
    expect(s.getState().saves.map((x) => x.scenarioId)).toEqual(['zollstock'])
    s.getState().continueRun('zollstock', 'standard')
    expect(s.getState().saveNotice).toBe('broken')
    expect(s.getState().saves).toEqual([])
    expect(text(s)).not.toContain('Continue:')
  })
})

describe('the remembered category', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('opens on the category chosen last', () => {
    const profiles = memoryProfiles()
    store({ profiles }).getState().selectCategory('tourism')
    const again = store({ profiles })
    expect(again.getState().category).toBe('tourism')
    expect(text(again)).toContain('Seeblick')
  })

  it('lands on the played company’s category after Choose another company', () => {
    const profiles = memoryProfiles()
    const s = store({ profiles })
    expect(s.getState().category).toBe('startups')
    s.getState().openSheet('hinterhof')
    s.getState().startRun()
    while (s.getState().introStep !== null) s.getState().nextIntro()
    s.getState().askShutDown()
    s.getState().shutDown()
    expect(text(s)).toContain('Choose another company')
    s.getState().leaveRun()
    expect(s.getState().category).toBe('tourism')
    expect(html(s)).toMatch(/aria-selected="true"[^>]*>Tourism</)
    expect(profiles.lastCategory()).toBe('tourism')
  })

  it('works when the browser keeps nothing', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError')
    }
    vi.stubGlobal('window', {
      localStorage: { getItem: blocked, setItem: blocked, removeItem: blocked, key: blocked },
    })
    const profiles = browserProfiles()
    expect(profiles.lastCategory()).toBeNull()
    expect(() => profiles.setLastCategory('tourism')).not.toThrow()
    expect(profiles.recentScenarios()).toEqual([])
    expect(profiles.saveNotes()).toEqual([])
    vi.unstubAllGlobals()
    const s = store({ profiles })
    s.getState().selectCategory('tourism')
    expect(s.getState().category).toBe('tourism')
  })

  it('keeps its own value per browser', () => {
    const stored = new Map<string, string>()
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (k: string) => stored.get(k) ?? null,
        setItem: (k: string, v: string) => stored.set(k, v),
        removeItem: (k: string) => stored.delete(k),
      },
    })
    browserProfiles().setLastCategory('tourism')
    expect(browserProfiles().lastCategory()).toBe('tourism')
  })
})
