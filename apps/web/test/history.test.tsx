import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  loadScenario,
  SCENARIO_IDS,
  scenarioModes,
  type GameMode,
  type ScenarioId,
} from '@founder-mode/content'
import { STRATEGIES } from '@founder-mode/bots/src/strategies'
import { playsIn } from '@founder-mode/bots/src/strategy'
import {
  createGame,
  endWeek,
  getView,
  respond,
  toSave,
  type ReportEntry,
  type SaveFile,
  type WeekReport,
} from '@founder-mode/engine'
import { App } from '../src/App'
import { ENTRY_HOMES } from '../src/entryHomes'
import { entryText } from '../src/screens/Results'
import { memoryStorage } from '../src/storage'
import { createGameStore } from '../src/store'

/**
 * Plan 7 step 2b, target H1: nothing in the weekly report is lost. Every kind of report line has
 * a home that keeps it, or is reachable through Help's Past weeks, which reopens every earlier
 * week. Lines a decision depends on have a home of their own. A continued save brings its past
 * weeks back.
 */
type Store = ReturnType<typeof createGameStore>
const html = (store: Store) =>
  renderToString(<App store={store} layout="phone" />).replace(/<!-- -->/g, '')
const text = (store: Store) =>
  html(store)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

const KINDS = Object.keys(ENTRY_HOMES) as ReportEntry['kind'][]

/** A store continuing a week 1 game of a scenario, for its names and words. */
function storeFor(id: ScenarioId, mode: GameMode): Store {
  const file = toSave(createGame(loadScenario(id, mode), 'history'))
  const store = createGameStore({ storage: memoryStorage(file), makeSeed: () => 'x' })
  store.getState().continueRun(id, mode)
  // One quiet week, so there is a report to copy.
  store.getState().endWeek()
  store.getState().dismissReport()
  return store
}

/** One real line of each kind the bots produce, with the scenario it came from. */
const samples = new Map<string, { entry: ReportEntry; id: ScenarioId; mode: GameMode }>()
/** Kinds no bot run here produces: a line written by hand, in a scenario that has them. */
const MADE: { entry: ReportEntry; id: ScenarioId; mode: GameMode }[] = [
  { entry: { kind: 'savings_transfer', amountCents: 100_000 }, id: 'kantino', mode: 'standard' },
  {
    entry: {
      kind: 'freelance_booked',
      name: 'Arne Lindgren',
      role: 'developer',
      hoursPerWeek: 10,
      startWeek: 3,
    },
    id: 'kantino',
    mode: 'standard',
  },
  {
    entry: { kind: 'freelance_hours', name: 'Arne Lindgren', hoursPerWeek: 20, fromWeek: 5 },
    id: 'kantino',
    mode: 'standard',
  },
  {
    entry: { kind: 'freelance_notice', name: 'Arne Lindgren', lastWeek: 6 },
    id: 'kantino',
    mode: 'standard',
  },
  { entry: { kind: 'freelance_ended', name: 'Arne Lindgren' }, id: 'kantino', mode: 'standard' },
  {
    entry: { kind: 'freelance_output', role: 'developer', hours: 9, onboarding: false },
    id: 'kantino',
    mode: 'standard',
  },
  {
    entry: { kind: 'freelance_bill', name: 'Arne Lindgren', amountCents: 68_000, hours: 10 },
    id: 'kantino',
    mode: 'standard',
  },
  {
    entry: { kind: 'funding_milestone', met: true, monthlyCents: 500_000 },
    id: 'kantino',
    mode: 'long',
  },
  {
    entry: { kind: 'office_notice', place: 'Shared office', endWeek: 30 },
    id: 'kantino',
    mode: 'long',
  },
  {
    entry: {
      kind: 'office_left',
      place: 'Shared office',
      backTo: 'Kitchen table',
      depositCents: 150_000,
    },
    id: 'kantino',
    mode: 'long',
  },
  { entry: { kind: 'loan_repaid', name: 'Hausbank' }, id: 'leinenlos', mode: 'long' },
  {
    entry: {
      kind: 'voucher_result',
      segmentId: 'tourists',
      prospects: 20,
      sold: 3,
      amountCents: 30_000,
    },
    id: 'gratwanderung',
    mode: 'long',
  },
  {
    entry: { kind: 'vouchers_redeemed', vouchers: 2, units: 4, valueCents: 20_000 },
    id: 'gratwanderung',
    mode: 'long',
  },
  {
    entry: { kind: 'walk_in_leads', segmentId: 'coworking', count: 2, place: 'Coworking desk' },
    id: 'kantino',
    mode: 'long',
  },
  {
    entry: { kind: 'asset_repaired', assetId: 'boat', costCents: 40_000 },
    id: 'tiefgang',
    mode: 'long',
  },
  { entry: { kind: 'round_stopped', round: 'angel' }, id: 'kantino', mode: 'long' },
  {
    entry: { kind: 'terms_withdrawn', name: 'Seedwerk', reason: 'runway' },
    id: 'kantino',
    mode: 'long',
  },
  {
    entry: { kind: 'deposits_refunded', amountCents: 25_500, bookings: 1 },
    id: 'leinenlos',
    mode: 'long',
  },
  { entry: { kind: 'friction', groups: 2 }, id: 'leinenlos', mode: 'long' },
  {
    entry: { kind: 'cruise_cancelled', week: 30, cabins: 4, moved: true, costCents: 50_000 },
    id: 'leinenlos',
    mode: 'long',
  },
  {
    entry: {
      kind: 'permit_refused',
      featureId: 'x',
      name: 'Night dives',
      refundCents: 0,
      feeCents: 20_000,
    },
    id: 'tiefgang',
    mode: 'long',
  },
]

beforeAll(() => {
  const bots = ['validate_then_build', 'tourism_careful', 'raise_on_traction', 'tourism_overborrow']
  for (const id of SCENARIO_IDS)
    for (const mode of scenarioModes(id)) {
      const scenario = loadScenario(id, mode)
      for (const strategy of STRATEGIES.filter(
        (s) => bots.includes(s.id) && playsIn(s, scenario),
      )) {
        const player = strategy.create(scenario, 'kinds-1')
        let state = createGame(scenario, 'kinds-1')
        while (state.status === 'running') {
          for (const a of player.respond?.(getView(state)) ?? []) {
            state = respond(state, a.messageId, a.choiceId)
          }
          const r = endWeek(state, player.plan(getView(state)))
          player.observe?.(r.report, getView(r.state))
          state = r.state
          for (const e of r.report.entries) {
            if (!samples.has(e.kind)) samples.set(e.kind, { entry: e, id, mode })
          }
        }
      }
    }
  for (const m of MADE) if (!samples.has(m.entry.kind)) samples.set(m.entry.kind, m)
}, 120_000)

describe('plan 7 H1: every report line has a home or is in Past weeks', () => {
  it.each(KINDS)('%s', (kind) => {
    const home = ENTRY_HOMES[kind]
    // A line a decision depends on keeps a home of its own.
    if (home.decides) expect(home.home).not.toBe('past weeks')
    const sample = samples.get(kind)
    expect(sample, `no line of kind ${kind} to show`).toBeDefined()
    const store = storeFor(sample!.id, sample!.mode)
    const view = store.getState().view!
    const report: WeekReport = {
      ...store.getState().pastReports[0]!,
      week: 1,
      entries: [sample!.entry],
    }
    store.setState({ pastReports: [report], helpOpen: true, pastWeek: 1 })
    expect(squash(text(store))).toContain(squash(entryText(sample!.entry, view)))
  })
})

describe('plan 7: Past weeks', () => {
  let file: SaveFile
  let reports: WeekReport[]
  beforeAll(() => {
    const scenario = loadScenario('kantino')
    const player = STRATEGIES.find((s) => s.id === 'validate_then_build')!.create(scenario, 'past')
    let state = createGame(scenario, 'past')
    reports = []
    while (state.status === 'running' && state.week <= 20) {
      for (const a of player.respond?.(getView(state)) ?? []) {
        state = respond(state, a.messageId, a.choiceId)
      }
      const r = endWeek(state, player.plan(getView(state)))
      player.observe?.(r.report, getView(r.state))
      state = r.state
      reports.push(r.report)
    }
    file = toSave(state)
  })

  it('brings back every earlier week when a save is continued, and never stores them', () => {
    const store = createGameStore({ storage: memoryStorage(file), makeSeed: () => 'x' })
    store.getState().continueRun('kantino')
    expect(store.getState().pastReports).toEqual(reports)
    expect(JSON.stringify(file)).not.toContain('"entries"')
    store.getState().openHelp()
    const page = text(store)
    expect(page).toContain('Past weeks')
    for (const r of reports) expect(page).toContain(`Week ${r.week}`)
    store.getState().openPastWeek(7)
    const week7 = text(store)
    expect(week7).toContain('Week 7')
    expect(week7).toContain('Back to help')
    store.getState().openPastWeek(null)
    expect(text(store)).toContain('Past weeks')
  })

  it('adds each new week as it is played, and starts empty in a new run', () => {
    const store = createGameStore({ storage: memoryStorage(), makeSeed: () => 'fresh' })
    store.getState().startRun()
    expect(store.getState().pastReports).toEqual([])
    while (store.getState().introStep !== null) store.getState().nextIntro()
    store.getState().endWeek()
    store.getState().dismissReport()
    store.getState().endWeek()
    expect(store.getState().pastReports.map((r) => r.week)).toEqual([1, 2])
  })
})
