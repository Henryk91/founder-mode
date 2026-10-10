import {
  loadScenario,
  SCENARIO_IDS,
  scenarioCatalogue,
  type Scenario,
  type ScenarioAbout,
  type ScenarioId,
} from '@founder-mode/content'
import {
  buildPostMortem,
  checkPlan,
  createGame,
  emptyPlan,
  endWeek,
  getView,
  replay,
  respond,
  saveProblem,
  shutDown,
  toSave,
  type ChannelId,
  type GameState,
  type PlanIssue,
  type PlayerView,
  type PostMortem,
  type SuggestionId,
  type TeamRoleId,
  type WeekPlan,
  type WeekReport,
} from '@founder-mode/engine'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { repeatPlan } from './repeatPlan'
import {
  MAX_RUNS,
  memoryProfiles,
  type ProfileStorage,
  type RunRecord,
  type SaveStorage,
} from './storage'

export type Tab = 'plan' | 'inbox' | 'market' | 'pipeline' | 'money'

/** The collapsible sections of the Plan tab. */
export type PlanSection = 'talk' | 'test' | 'build' | 'sell' | 'demos' | 'team' | 'rest'

export type ExplainKey =
  | 'runway'
  | 'cash'
  | 'energy'
  | 'hours'
  | 'talk'
  | 'test'
  | 'build'
  | 'sell'
  | 'demos'
  | 'hiring'
  | 'rest'

export type SaveNotice = 'incompatible' | 'scenario_changed' | 'broken' | null

/**
 * Everything the screens may read. No GameState, nothing hidden, with one exception: the
 * post-mortem, which reveals the truth on purpose and only exists once the run has ended.
 */
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
  /** True while the Money tab asks whether to really shut the company down. */
  shutDownAsked: boolean
  /** Plan sections the player opened this week. All start closed. */
  openSections: PlanSection[]
  /** True when there is a resolved week whose plan can be repeated. */
  canRepeat: boolean
  /** How many of the report's notable moments the player has already tapped through. */
  momentsSeen: number
  /** The post-mortem of a finished run, null while the run is going. */
  postMortem: PostMortem | null
  /** The one suggestion shown in the post-mortem, chosen once when the run ends. */
  suggestion: SuggestionId | null
  /** Finished runs of the chosen scenario on this device, for the best runs on the Start screen. */
  runs: RunRecord[]
  /** Every scenario that can be played, for the picker on the Start screen. */
  scenarios: ScenarioAbout[]
  /** The scenario picked on the Start screen: new runs, Continue and best runs are its own. */
  scenarioId: ScenarioId
}

export type UiActions = {
  /** Picks the scenario on the Start screen. Does nothing while a run is open. */
  selectScenario(id: ScenarioId): void
  startRun(seed?: string): void
  /** A new run with a new seed, straight from the post-mortem. */
  newRun(): void
  /** A new run on the seed of the finished one, flagged as a replay in the run record. */
  sameMarketAgain(): void
  /** A new run on a seed from the best runs, flagged as a replay. */
  replaySeed(seed: string): void
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
  /** Ad budget in cents for a landing page test, 0 for none. */
  setLanding(segmentId: string, budgetCents: number): void
  setPresales(segmentId: string, batches: number): void
  toggleChase(invoiceId: string): void
  toggleFollowUp(leadId: string): void
  setSearchRole(role: TeamRoleId | null): void
  setHire(candidateId: string | null): void
  setLetGo(letGo: boolean): void
  setTeamBuild(featureId: string | null): void
  setTeamOutreach(target: { segmentId: string; channel: ChannelId } | null): void
  /** Answers a message now: its hours count at once, its effects land when the week ends. */
  answer(messageId: string, choiceId: string): void
  /** First step of shutting down: shows the question. Nothing happens to the run yet. */
  askShutDown(): void
  cancelShutDown(): void
  /** Closes the company. Only works after `askShutDown`, so one stray tap cannot end a run. */
  shutDown(): void
  /** Null keeps the current price. */
  setPriceCents(cents: number | null): void
  endWeek(): void
  dismissReport(): void
  toggleSection(section: PlanSection): void
  /** Replaces the draft with last week's plan, minus whatever is no longer possible. */
  repeatLastWeek(): void
  nextMoment(): void
}

export type GameStore = UiState & UiActions

export type StoreDeps = {
  storage: SaveStorage
  makeSeed: () => string
  /** Loads a scenario by id. The built in scenarios unless given. */
  scenario?: (id: ScenarioId) => Scenario
  /** Best runs, the last suggestion and the last scenario picked. In memory unless given. */
  profiles?: ProfileStorage
  /** Scenarios offered on the Start screen. The built in ones unless given. */
  catalogue?: () => ScenarioAbout[]
}

/**
 * Thin Zustand store around the engine. The GameState lives in this closure only; screens
 * subscribe to `view` and the plan draft. The autosave is written after every resolved week.
 */
export function createGameStore(deps: StoreDeps): StoreApi<GameStore> {
  const getScenario = deps.scenario ?? loadScenario
  let game: GameState | null = null
  const profiles = deps.profiles ?? memoryProfiles()
  const scenarios = (deps.catalogue ?? scenarioCatalogue)()
  const picked = profiles.lastScenario()
  const firstId: ScenarioId =
    scenarios.find((x) => x.id === picked)?.id ?? scenarios[0]?.id ?? SCENARIO_IDS[0]
  /** The game the post-mortem below belongs to, so it is built once per finished run. */
  let mortemOf: GameState | null = null
  let mortem: { postMortem: PostMortem; suggestion: SuggestionId } | null = null

  const store = createStore<GameStore>((set, get) => {
    const refresh = (patch: Partial<UiState> = {}) => {
      if (!game) {
        set({ view: null, plan: emptyPlan(), plannedHours: 0, issues: [], report: null, ...patch })
        return
      }
      const plan = patch.plan ?? get().plan
      const check = checkPlan(game, plan)
      const ended = game.status === 'ended' ? finish(game) : null
      set({
        postMortem: ended?.postMortem ?? null,
        suggestion: ended?.suggestion ?? null,
        view: getView(game),
        plan,
        plannedHours: check.plannedHours,
        issues: check.issues,
        canRepeat: lastPlan() !== null,
        ...patch,
      })
    }

    /** The plan of the last resolved week, from the action log. */
    const lastPlan = (): WeekPlan | null => {
      const log = game?.actionLog ?? []
      for (let i = log.length - 1; i >= 0; i--) {
        const action = log[i]!
        if (action.type === 'endWeek') return action.plan
      }
      return null
    }

    /**
     * Builds the post-mortem of a finished run. The first time, it also picks the suggestion (the
     * first that was not shown after the previous run) and records the run for the best runs.
     */
    const finish = (state: GameState) => {
      if (mortemOf === state && mortem) return mortem
      const postMortem = buildPostMortem(state)
      const profile = profiles.load(state.scenarioId)
      const current = profile.current?.seed === state.seed ? profile.current : null
      let suggestion = current?.suggestion ?? null
      if (suggestion === null) {
        suggestion =
          postMortem.suggestions.find((id) => id !== profile.lastSuggestion) ??
          postMortem.suggestions[0]!
        const runs = [
          ...profile.runs,
          {
            seed: state.seed,
            replay: current?.replay ?? false,
            ending: postMortem.ending,
            weeks: postMortem.week,
            peakRevenueCents: postMortem.cause.peakRevenueCents,
          },
        ].slice(-MAX_RUNS)
        profiles.save(state.scenarioId, {
          current: { seed: state.seed, replay: current?.replay ?? false, suggestion },
          lastSuggestion: suggestion,
          runs,
        })
        set({ runs })
      }
      mortemOf = state
      mortem = { postMortem, suggestion }
      return mortem
    }

    const editPlan = (change: (plan: WeekPlan) => WeekPlan) => {
      if (!game) return
      refresh({ plan: change(get().plan) })
    }

    const start = (seed: string, replay: boolean, scenarioId: ScenarioId = get().scenarioId) => {
      const state = createGame(getScenario(scenarioId), seed)
      profiles.setLastScenario(scenarioId)
      deps.storage.save(toSave(state))
      const profile = profiles.load(state.scenarioId)
      profiles.save(state.scenarioId, {
        ...profile,
        current: { seed: state.seed, replay, suggestion: null },
      })
      begin(state)
      // The intro belongs to a new run only; Continue goes straight to the game.
      set({
        scenarioId,
        hasSave: true,
        introStep: getView(state).guidance.intro.length > 0 ? 0 : null,
      })
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
        shutDownAsked: false,
        openSections: [],
        momentsSeen: 0,
      })
    }

    return {
      view: null,
      plan: emptyPlan(),
      plannedHours: 0,
      issues: [],
      report: null,
      tab: 'plan',
      hasSave: deps.storage.load(firstId) !== null,
      saveNotice: null,
      introStep: null,
      helpOpen: false,
      explain: null,
      dismissedNotes: [],
      shutDownAsked: false,
      openSections: [],
      canRepeat: false,
      momentsSeen: 0,
      postMortem: null,
      suggestion: null,
      runs: profiles.load(firstId).runs,
      scenarios,
      scenarioId: firstId,

      selectScenario(id) {
        if (game || !scenarios.some((x) => x.id === id)) return
        profiles.setLastScenario(id)
        set({
          scenarioId: id,
          hasSave: deps.storage.load(id) !== null,
          runs: profiles.load(id).runs,
          saveNotice: null,
        })
      },
      startRun(seed) {
        start(seed?.trim() || deps.makeSeed(), false)
      },
      newRun() {
        start(deps.makeSeed(), false)
      },
      sameMarketAgain() {
        if (!game || game.status !== 'ended') return
        start(game.seed, true, game.scenarioId as ScenarioId)
      },
      replaySeed(seed) {
        start(seed, true)
      },
      continueRun() {
        const id = get().scenarioId
        const file = deps.storage.load(id)
        if (!file) {
          set({ hasSave: false })
          return
        }
        const scenario = getScenario(id)
        const problem = saveProblem(scenario, file)
        if (problem) {
          // Plan section 4.14: warn and start fresh instead of replaying a different game.
          deps.storage.clear(id)
          set({
            hasSave: false,
            saveNotice: problem === 'scenario_changed' ? 'scenario_changed' : 'incompatible',
          })
          return
        }
        try {
          begin(replay(scenario, file))
        } catch {
          deps.storage.clear(id)
          set({ hasSave: false, saveNotice: 'broken' })
        }
      },

      leaveRun() {
        // Finished runs are not worth continuing, running ones stay saved.
        if (game?.status === 'ended') {
          deps.storage.clear(game.scenarioId)
          set({ hasSave: false })
          const profile = profiles.load(game.scenarioId)
          profiles.save(game.scenarioId, { ...profile, current: null })
        }
        game = null
        refresh({ report: null, tab: 'plan', introStep: null, helpOpen: false, explain: null })
      },

      setTab: (tab) => set({ tab, shutDownAsked: false }),

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
      setLanding: (segmentId, budgetCents) =>
        editPlan((p) => ({ ...p, landing: { ...p.landing, [segmentId]: budgetCents } })),
      setPresales: (segmentId, batches) =>
        editPlan((p) => ({ ...p, presales: { ...p.presales, [segmentId]: batches } })),
      toggleFollowUp: (leadId) =>
        editPlan((p) => ({
          ...p,
          followUps: p.followUps.includes(leadId)
            ? p.followUps.filter((id) => id !== leadId)
            : [...p.followUps, leadId],
        })),
      toggleChase: (invoiceId) =>
        editPlan((p) => ({
          ...p,
          chase: p.chase.includes(invoiceId)
            ? p.chase.filter((id) => id !== invoiceId)
            : [...p.chase, invoiceId],
        })),
      setSearchRole: (role) => editPlan((p) => ({ ...p, searchRole: role })),
      setHire: (candidateId) => editPlan((p) => ({ ...p, hire: candidateId })),
      setLetGo: (letGo) => editPlan((p) => ({ ...p, letGo })),
      setTeamBuild: (featureId) => editPlan((p) => ({ ...p, teamBuild: featureId })),
      setTeamOutreach: (target) => editPlan((p) => ({ ...p, teamOutreach: target })),
      answer(messageId, choiceId) {
        if (!game || game.status !== 'running') return
        try {
          game = respond(game, messageId, choiceId)
        } catch {
          return
        }
        deps.storage.save(toSave(game))
        refresh()
      },
      askShutDown: () => set({ shutDownAsked: true }),
      cancelShutDown: () => set({ shutDownAsked: false }),
      shutDown() {
        if (!game || game.status !== 'running' || !get().shutDownAsked) return
        game = shutDown(game)
        deps.storage.save(toSave(game))
        refresh({ report: null, helpOpen: false, explain: null, shutDownAsked: false })
      },

      endWeek() {
        if (!game || game.status !== 'running') return
        const { plan } = get()
        if (checkPlan(game, plan).issues.length > 0) return
        const result = endWeek(game, plan)
        game = result.state
        deps.storage.save(toSave(game))
        refresh({
          plan: emptyPlan(),
          report: result.report,
          shutDownAsked: false,
          openSections: [],
          momentsSeen: 0,
        })
      },

      dismissReport: () => set({ report: null, momentsSeen: 0 }),
      toggleSection: (section) =>
        set((s) => ({
          openSections: s.openSections.includes(section)
            ? s.openSections.filter((x) => x !== section)
            : [...s.openSections, section],
        })),
      repeatLastWeek() {
        const last = lastPlan()
        const view = get().view
        if (!last || !view) return
        refresh({ plan: repeatPlan(last, view) })
      },
      nextMoment: () => set((s) => ({ momentsSeen: s.momentsSeen + 1 })),
    }
  })

  return store
}
