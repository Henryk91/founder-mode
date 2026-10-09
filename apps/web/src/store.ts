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

export type ExplainKey = 'runway' | 'cash' | 'energy' | 'hours'

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
  /** Index of the intro card on screen, or null when no intro is showing. */
  introStep: number | null
  helpOpen: boolean
  explain: ExplainKey | null
  /** Ids of founder's notes the player dismissed in this run. */
  dismissedNotes: string[]
}

export type UiActions = {
  startRun(seed?: string): void
  continueRun(): void
  leaveRun(): void
  nextIntro(): void
  prevIntro(): void
  openHelp(): void
  closeHelp(): void
  openExplain(key: ExplainKey): void
  closeExplain(): void
  dismissNote(id: string): void
  setTab(tab: Tab): void
  setInterviews(segmentId: string, count: number): void
  setBuild(featureId: string, hours: number): void
  setBugFixHours(hours: number): void
  setOutreach(segmentId: string, channel: ChannelId, hours: number): void
  toggleDemo(leadId: string): void
  setRestHours(hours: number): void
  setTransferCents(cents: number): void
  /** Null keeps the current price. */
  setPriceCents(cents: number | null): void
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
      refresh({
        plan: emptyPlan(),
        report: null,
        tab: 'plan',
        saveNotice: null,
        introStep: null,
        helpOpen: false,
        explain: null,
        dismissedNotes: [],
      })
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
      introStep: null,
      helpOpen: false,
      explain: null,
      dismissedNotes: [],

      startRun(seed) {
        const state = createGame(getScenario(), seed?.trim() || deps.makeSeed())
        deps.storage.save(toSave(state))
        begin(state)
        // The intro belongs to a new run only; Continue goes straight to the game.
        set({ hasSave: true, introStep: getView(state).guidance.intro.length > 0 ? 0 : null })
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
        refresh({ report: null, tab: 'plan', introStep: null, helpOpen: false, explain: null })
      },

      setTab: (tab) => set({ tab }),

      nextIntro() {
        const { introStep, view } = get()
        if (introStep === null) return
        const last = (view?.guidance.intro.length ?? 0) - 1
        set({ introStep: introStep >= last ? null : introStep + 1 })
      },
      prevIntro: () =>
        set((s) => ({ introStep: s.introStep === null ? null : Math.max(0, s.introStep - 1) })),
      openHelp: () => set({ helpOpen: true, explain: null }),
      closeHelp: () => set({ helpOpen: false }),
      openExplain: (key) => set({ explain: key }),
      closeExplain: () => set({ explain: null }),
      dismissNote: (id) =>
        set((s) =>
          s.dismissedNotes.includes(id) ? s : { dismissedNotes: [...s.dismissedNotes, id] },
        ),

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
      setPriceCents: (cents) => editPlan((p) => ({ ...p, priceCentsPerMonth: cents })),

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
