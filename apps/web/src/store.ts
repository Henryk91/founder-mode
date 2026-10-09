import { loadScenario, type Scenario } from '@founder-mode/content'
import {
  checkPlan,
  createGame,
  emptyPlan,
  endWeek,
  getView,
  isCompatibleSave,
  replay,
  toSave,
  type ChannelId,
  type GameState,
  type PlanIssue,
  type PlayerView,
  type WeekPlan,
  type WeekReport,
} from '@founder-mode/engine'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { SaveStorage } from './storage'

export type Tab = 'plan' | 'market' | 'pipeline' | 'money'

export type SaveNotice = 'incompatible' | 'broken' | null

/** Everything the screens may read. No GameState, nothing hidden. */
export type UiState = {
  view: PlayerView | null
  plan: WeekPlan
  plannedHours: number
  issues: PlanIssue[]
  /** The week that just resolved, shown on the results screen until dismissed. */
  report: WeekReport | null
  tab: Tab
  hasSave: boolean
  saveNotice: SaveNotice
}

export type UiActions = {
  startRun(seed?: string): void
  continueRun(): void
  leaveRun(): void
  setTab(tab: Tab): void
  setInterviews(segmentId: string, count: number): void
  setBuild(featureId: string, hours: number): void
  setBugFixHours(hours: number): void
  setOutreach(segmentId: string, channel: ChannelId, hours: number): void
  toggleDemo(leadId: string): void
  setRestHours(hours: number): void
  setTransferCents(cents: number): void
  endWeek(): void
  dismissReport(): void
}

export type GameStore = UiState & UiActions

export type StoreDeps = {
  storage: SaveStorage
  makeSeed: () => string
  scenario?: () => Scenario
}

/**
 * Thin Zustand store around the engine. The GameState lives in this closure only; screens
 * subscribe to `view` and the plan draft. The autosave is written after every resolved week.
 */
export function createGameStore(deps: StoreDeps): StoreApi<GameStore> {
  const getScenario = deps.scenario ?? (() => loadScenario('kantino'))
  let game: GameState | null = null

  const initialSave = deps.storage.load()

  const store = createStore<GameStore>((set, get) => {
    const refresh = (patch: Partial<UiState> = {}) => {
      if (!game) {
        set({ view: null, plan: emptyPlan(), plannedHours: 0, issues: [], report: null, ...patch })
        return
      }
      const plan = patch.plan ?? get().plan
      const check = checkPlan(game, plan)
      set({
        view: getView(game),
        plan,
        plannedHours: check.plannedHours,
        issues: check.issues,
        ...patch,
      })
    }

    const editPlan = (change: (plan: WeekPlan) => WeekPlan) => {
      if (!game) return
      refresh({ plan: change(get().plan) })
    }

    const begin = (state: GameState) => {
      game = state
      refresh({ plan: emptyPlan(), report: null, tab: 'plan', saveNotice: null })
    }

    return {
      view: null,
      plan: emptyPlan(),
      plannedHours: 0,
      issues: [],
      report: null,
      tab: 'plan',
      hasSave: initialSave !== null,
      saveNotice: null,

      startRun(seed) {
        const state = createGame(getScenario(), seed?.trim() || deps.makeSeed())
        deps.storage.save(toSave(state))
        begin(state)
        set({ hasSave: true })
      },

      continueRun() {
        const file = deps.storage.load()
        if (!file) {
          set({ hasSave: false })
          return
        }
        if (!isCompatibleSave(file)) {
          // Plan section 4.14: warn and start fresh instead of replaying a different engine.
          deps.storage.clear()
          set({ hasSave: false, saveNotice: 'incompatible' })
          return
        }
        try {
          begin(replay(getScenario(), file))
        } catch {
          deps.storage.clear()
          set({ hasSave: false, saveNotice: 'broken' })
        }
      },

      leaveRun() {
        // Finished runs are not worth continuing, running ones stay saved.
        if (game?.status === 'ended') {
          deps.storage.clear()
          set({ hasSave: false })
        }
        game = null
        refresh({ report: null, tab: 'plan' })
      },

      setTab: (tab) => set({ tab }),

      setInterviews: (segmentId, count) =>
        editPlan((p) => ({ ...p, interviews: { ...p.interviews, [segmentId]: count } })),
      setBuild: (featureId, hours) =>
        editPlan((p) => ({ ...p, build: { ...p.build, [featureId]: hours } })),
      setBugFixHours: (hours) => editPlan((p) => ({ ...p, bugFixHours: hours })),
      setOutreach: (segmentId, channel, hours) =>
        editPlan((p) => ({ ...p, outreach: { ...p.outreach, [segmentId]: { channel, hours } } })),
      toggleDemo: (leadId) =>
        editPlan((p) => ({
          ...p,
          demos: p.demos.includes(leadId)
            ? p.demos.filter((d) => d !== leadId)
            : [...p.demos, leadId],
        })),
      setRestHours: (hours) => editPlan((p) => ({ ...p, restHours: hours })),
      setTransferCents: (cents) => editPlan((p) => ({ ...p, transferToCompanyCents: cents })),

      endWeek() {
        if (!game || game.status !== 'running') return
        const { plan } = get()
        if (checkPlan(game, plan).issues.length > 0) return
        const result = endWeek(game, plan)
        game = result.state
        deps.storage.save(toSave(game))
        refresh({ plan: emptyPlan(), report: result.report })
      },

      dismissReport: () => set({ report: null }),
    }
  })

  return store
}
