import {
  loadScenario,
  SCENARIO_IDS,
  scenarioCatalogue,
  type Scenario,
  type ScenarioAbout,
  type ScenarioId,
} from '@founder-mode/content'
import {
  ENGINE_VERSION,
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
  type SaveFile,
  type SuggestionId,
  type TeamRoleId,
  type FreelancePlan,
  type BookingsPlan,
  type FundingPlan,
  type GameMode,
  type TeamTask,
  type WeekPlan,
  type WeekReport,
} from '@founder-mode/engine'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { carryFreelance, repeatPlan } from './repeatPlan'
import {
  MAX_RUNS,
  memoryProfiles,
  slotOf,
  UNREADABLE,
  type ProfileStorage,
  type ProfileTrouble,
  type RunRecord,
  type SaveStorage,
} from './storage'

export type Tab = 'plan' | 'inbox' | 'market' | 'pipeline' | 'money'

/** The collapsible sections of the Plan tab. */
export type PlanSection =
  | 'talk'
  | 'test'
  | 'build'
  | 'sell'
  | 'demos'
  | 'roster'
  | 'guests'
  | 'prices'
  | 'team'
  | 'raise'
  | 'rest'

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
  | 'raise'
  | 'roster'
  | 'guests'
  | 'prices'
  | 'rest'

/**
 * Why Continue did not work: a save from an older engine, from a newer one (this page is out of
 * date), made with other scenario values, or one that could not be read or replayed.
 */
export type SaveNotice = 'incompatible' | 'newer' | 'scenario_changed' | 'broken' | null

/** The browser keeps nothing at all (some private windows), or would not take the last save. */
export type StorageNotice = 'unavailable' | 'full' | null

/** True when version `a` is later than `b`. Versions are dotted numbers, as `0.11.0`. */
export function isNewerVersion(a: string, b: string): boolean {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (Number.isNaN(x) || Number.isNaN(y)) return false
    if (x !== y) return x > y
  }
  return false
}

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
  /** Saving does not work in this browser. Shown on the Start screen and once in a run. */
  storageNotice: StorageNotice
  /** The best runs of the picked scenario could not be read, or could not be stored. */
  runsNotice: ProfileTrouble | null
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
  /** The run length picked on the Start screen, among the scenario's modes. */
  mode: GameMode
}

export type UiActions = {
  /** Picks the scenario on the Start screen. Does nothing while a run is open. */
  selectScenario(id: ScenarioId): void
  /** Picks the run length on the Start screen. Does nothing while a run is open. */
  selectMode(mode: GameMode): void
  startRun(seed?: string): void
  /** A new run with a new seed, straight from the post-mortem. */
  newRun(): void
  /** A new run on the seed of the finished one, flagged as a replay in the run record. */
  sameMarketAgain(): void
  /** A new run on a seed from the best runs, flagged as a replay. */
  replaySeed(seed: string): void
  continueRun(): void
  leaveRun(): void
  /** After the UI broke: back to the Start screen. Writes nothing, so the save stays as it was. */
  recover(): void
  /** Hides the storage warning for the rest of the run. */
  dismissStorageNotice(): void
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
  /** Starts a search in this role (part time where the role offers it), or cancels it with null. */
  setSearchRole(role: TeamRoleId | null, partTime?: boolean): void
  setHire(candidateId: string | null): void
  /** Lets this member go this week, or takes it back with null. */
  setLetGo(memberId: string | null): void
  /** What one team member does this week; null leaves them without a task. */
  setTeamTask(memberId: string, task: TeamTask | null): void
  /** Changes part of the freelancer plan: booking, hours, notice, or their task. */
  setFreelance(change: Partial<FreelancePlan>): void
  /** Changes part of the raising plan (long mode): a round, pitching, second looks, terms, update. */
  setFunding(change: Partial<FundingPlan>): void
  /** Changes part of the bookings plan (tourism): roster, prices, policy, channels. */
  setBookings(change: Partial<BookingsPlan>): void
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
  /** Loads a scenario by id, for a mode. The built in scenarios unless given. */
  scenario?: (id: ScenarioId, mode: GameMode) => Scenario
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
  /** The modes a scenario offers: the 60 week game, and long mode where it has one. */
  const modesOf = (id: ScenarioId): GameMode[] =>
    scenarios.find((x) => x.id === id)?.modes ?? ['standard']
  /** A mode the scenario has: the one asked for, else the 60 week game. */
  const modeFor = (id: ScenarioId, mode: string | null): GameMode =>
    modesOf(id).find((m) => m === mode) ?? 'standard'
  const firstMode = modeFor(firstId, profiles.lastMode())
  const firstSlot = slotOf(firstId, firstMode)
  /** A game's slot: its scenario and mode. */
  const slotOfGame = (state: GameState) => slotOf(state.scenarioId, state.scenario.mode)
  /** The game the post-mortem below belongs to, so it is built once per finished run. */
  let mortemOf: GameState | null = null
  let mortem: { postMortem: PostMortem; suggestion: SuggestionId } | null = null

  const firstRuns = profiles.load(firstSlot).runs
  const firstRunsNotice: ProfileTrouble | null = profiles.unreadable(firstSlot)
    ? 'unreadable'
    : null
  /** The storage warning was shown in this session, so a failing save does not repeat it. */
  let storageWarned = false

  const store = createStore<GameStore>((set, get) => {
    /** Writes the autosave; when the browser will not take it, says so once. */
    const persist = (file: SaveFile) => {
      if (deps.storage.save(file) || storageWarned) return
      storageWarned = true
      set({ storageNotice: deps.storage.available() ? 'full' : 'unavailable' })
    }
    /** Writes the best runs; when the browser will not take them, says so. */
    const keepRuns = (scenarioId: string, profile: Parameters<ProfileStorage['save']>[1]) => {
      if (!profiles.save(scenarioId, profile)) set({ runsNotice: 'unsaved' })
    }
    const runsTrouble = (scenarioId: string) =>
      profiles.unreadable(scenarioId) ? ('unreadable' as const) : null

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
      const slot = slotOfGame(state)
      const profile = profiles.load(slot)
      if (profiles.unreadable(slot)) set({ runsNotice: 'unreadable' })
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
            ...(postMortem.money.funding
              ? { founderShareBp: postMortem.money.funding.founderShareBp }
              : {}),
          },
        ].slice(-MAX_RUNS)
        keepRuns(slot, {
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

    const start = (
      seed: string,
      replay: boolean,
      scenarioId: ScenarioId = get().scenarioId,
      mode: GameMode = get().mode,
    ) => {
      const state = createGame(getScenario(scenarioId, mode), seed)
      profiles.setLastScenario(scenarioId)
      profiles.setLastMode(mode)
      persist(toSave(state))
      const slot = slotOfGame(state)
      const profile = profiles.load(slot)
      keepRuns(slot, {
        ...profile,
        current: { seed: state.seed, replay, suggestion: null },
      })
      begin(state)
      // The intro belongs to a new run only; Continue goes straight to the game.
      set({
        scenarioId,
        mode,
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
      hasSave: deps.storage.load(firstSlot) !== null,
      saveNotice: null,
      storageNotice: deps.storage.available() ? null : 'unavailable',
      runsNotice: firstRunsNotice,
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
      runs: firstRuns,
      scenarios,
      scenarioId: firstId,
      mode: firstMode,

      selectScenario(id) {
        if (game || !scenarios.some((x) => x.id === id)) return
        profiles.setLastScenario(id)
        const mode = modeFor(id, get().mode)
        const slot = slotOf(id, mode)
        set({
          scenarioId: id,
          mode,
          hasSave: deps.storage.load(slot) !== null,
          runs: profiles.load(slot).runs,
          runsNotice: runsTrouble(slot),
          saveNotice: null,
        })
      },
      selectMode(mode) {
        const id = get().scenarioId
        if (game || !modesOf(id).includes(mode)) return
        profiles.setLastMode(mode)
        const slot = slotOf(id, mode)
        set({
          mode,
          hasSave: deps.storage.load(slot) !== null,
          runs: profiles.load(slot).runs,
          runsNotice: runsTrouble(slot),
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
        start(game.seed, true, game.scenarioId as ScenarioId, game.scenario.mode ?? 'standard')
      },
      replaySeed(seed) {
        start(seed, true)
      },
      continueRun() {
        const id = get().scenarioId
        const mode = get().mode
        const slot = slotOf(id, mode)
        const file = deps.storage.load(slot)
        if (!file) {
          set({ hasSave: false })
          return
        }
        if (file === UNREADABLE) {
          deps.storage.clear(slot)
          set({ hasSave: false, saveNotice: 'broken' })
          return
        }
        const scenario = getScenario(id, mode)
        const problem = saveProblem(scenario, file)
        if (problem === 'engine_version' && isNewerVersion(file.engineVersion, ENGINE_VERSION)) {
          // This page is older than the save: a reload brings the version that can continue it,
          // so the save stays. Only a new run here would replace it, and the notice says so.
          set({ hasSave: false, saveNotice: 'newer' })
          return
        }
        if (problem) {
          // Plan section 4.14: warn and start fresh instead of replaying a different game.
          deps.storage.clear(slot)
          set({
            hasSave: false,
            saveNotice: problem === 'scenario_changed' ? 'scenario_changed' : 'incompatible',
          })
          return
        }
        try {
          begin(replay(scenario, file))
        } catch {
          deps.storage.clear(slot)
          set({ hasSave: false, saveNotice: 'broken' })
        }
      },

      leaveRun() {
        // Finished runs are not worth continuing, running ones stay saved.
        if (game?.status === 'ended') {
          const slot = slotOfGame(game)
          deps.storage.clear(slot)
          set({ hasSave: false })
          const profile = profiles.load(slot)
          keepRuns(slot, { ...profile, current: null })
        }
        game = null
        refresh({ report: null, tab: 'plan', introStep: null, helpOpen: false, explain: null })
      },

      recover() {
        game = null
        mortemOf = null
        mortem = null
        const slot = slotOf(get().scenarioId, get().mode)
        refresh({
          report: null,
          tab: 'plan',
          introStep: null,
          helpOpen: false,
          explain: null,
          postMortem: null,
          suggestion: null,
          hasSave: deps.storage.load(slot) !== null,
        })
      },

      dismissStorageNotice: () => set({ storageNotice: null }),

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
      setSearchRole: (role, partTime = false) =>
        editPlan((p) => {
          // Full time leaves the field out, so a 60 week plan keeps its old shape.
          const next: WeekPlan = { ...p, searchRole: role }
          delete next.searchPartTime
          if (role !== null && partTime) next.searchPartTime = true
          return next
        }),
      setHire: (candidateId) => editPlan((p) => ({ ...p, hire: candidateId })),
      setLetGo: (memberId) => editPlan((p) => ({ ...p, letGo: memberId })),
      setTeamTask: (memberId, task) =>
        editPlan((p) => {
          const teamTasks = { ...p.teamTasks }
          if (task) teamTasks[memberId] = task
          else delete teamTasks[memberId]
          return { ...p, teamTasks }
        }),
      setFreelance: (change) =>
        editPlan((p) => ({ ...p, freelance: { ...p.freelance, ...change } })),
      setFunding: (change) =>
        editPlan((p) => ({ ...p, funding: { ...(p.funding ?? noFunding()), ...change } })),
      setBookings: (change) =>
        editPlan((p) => ({ ...p, bookings: { ...(p.bookings ?? noBookings()), ...change } })),
      answer(messageId, choiceId) {
        if (!game || game.status !== 'running') return
        try {
          game = respond(game, messageId, choiceId)
        } catch {
          return
        }
        persist(toSave(game))
        refresh()
      },
      askShutDown: () => set({ shutDownAsked: true }),
      cancelShutDown: () => set({ shutDownAsked: false }),
      shutDown() {
        if (!game || game.status !== 'running' || !get().shutDownAsked) return
        game = shutDown(game)
        persist(toSave(game))
        refresh({ report: null, helpOpen: false, explain: null, shutDownAsked: false })
      },

      endWeek() {
        if (!game || game.status !== 'running') return
        const { plan } = get()
        if (checkPlan(game, plan).issues.length > 0) return
        const result = endWeek(game, plan)
        game = result.state
        persist(toSave(game))
        const next = emptyPlan()
        if (game.status === 'running') next.freelance = carryFreelance(plan, getView(game))
        refresh({
          plan: next,
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

/** A raising plan with nothing in it. */
export const noFunding = (): FundingPlan => ({
  start: null,
  pitchHours: 0,
  secondLooks: [],
  accept: null,
  decline: [],
  stop: false,
  update: null,
})

/** A bookings plan with nothing in it. */
export const noBookings = (): BookingsPlan => ({
  shifts: {},
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})
