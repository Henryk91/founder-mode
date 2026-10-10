import type { EndingId, SaveFile, SuggestionId } from '@founder-mode/engine'

/**
 * Where the autosaves live, one per scenario, so each scenario can be continued on its own.
 * Injected so tests and private windows need no browser storage.
 */
export type SaveStorage = {
  load(scenarioId: string): SaveFile | null
  /** Saves under the file's own scenario. */
  save(file: SaveFile): void
  clear(scenarioId: string): void
}

const saveKey = (scenarioId: string) => `founder-mode.save.v1.${scenarioId}`
/** Before there was more than one scenario, the one autosave lived here. */
const LEGACY_SAVE_KEY = 'founder-mode.save.v1'

// Every access is wrapped: storage can be missing, full, or blocked (private windows).
export function browserStorage(): SaveStorage {
  const read = (key: string): SaveFile | null => {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as SaveFile) : null
  }
  return {
    load(scenarioId) {
      try {
        const file = read(saveKey(scenarioId))
        if (file) return file
        // A save from before scenarios had their own keys moves to its scenario's key.
        const legacy = read(LEGACY_SAVE_KEY)
        if (legacy?.scenarioId !== scenarioId) return null
        window.localStorage.setItem(saveKey(scenarioId), JSON.stringify(legacy))
        window.localStorage.removeItem(LEGACY_SAVE_KEY)
        return legacy
      } catch {
        return null
      }
    },
    save(file) {
      try {
        window.localStorage.setItem(saveKey(file.scenarioId), JSON.stringify(file))
      } catch {
        // The run continues, it just cannot be continued later.
      }
    },
    clear(scenarioId) {
      try {
        window.localStorage.removeItem(saveKey(scenarioId))
      } catch {
        // Nothing to do.
      }
    },
  }
}

/**
 * Saves in memory, per scenario. `current()` reads the scenario saved or cleared last (at first
 * the initial file's), or the one named.
 */
export function memoryStorage(initial: SaveFile | null = null): SaveStorage & {
  current(scenarioId?: string): SaveFile | null
} {
  const files = new Map<string, string>()
  let last = initial?.scenarioId ?? ''
  if (initial) files.set(initial.scenarioId, JSON.stringify(initial))
  const read = (id: string) => {
    const raw = files.get(id)
    return raw ? (JSON.parse(raw) as SaveFile) : null
  }
  return {
    load: (id) => read(id),
    save: (f) => {
      files.set(f.scenarioId, JSON.stringify(f))
      last = f.scenarioId
    },
    clear: (id) => {
      files.delete(id)
      last = id
    },
    current: (id) => read(id ?? last),
  }
}

/** One finished run, kept for the best runs on the Start screen. */
export type RunRecord = {
  seed: string
  /** Started with "Same market again": listed apart from ordinary runs. */
  replay: boolean
  ending: EndingId
  weeks: number
  peakRevenueCents: number
}

/** What the game remembers about one scenario across runs. Local to this browser. */
export type Profile = {
  /** The run being played, from its start until it is left. */
  current: { seed: string; replay: boolean; suggestion: SuggestionId | null } | null
  /** The post-mortem suggestion shown after the previous run. */
  lastSuggestion: SuggestionId | null
  /** Finished runs, oldest first, at most `MAX_RUNS`. */
  runs: RunRecord[]
}

export const MAX_RUNS = 200

export const emptyProfile = (): Profile => ({ current: null, lastSuggestion: null, runs: [] })

export type ProfileStorage = {
  load(scenarioId: string): Profile
  save(scenarioId: string, profile: Profile): void
  /** The scenario picked last on the Start screen, so the game opens on it next time. */
  lastScenario(): string | null
  setLastScenario(scenarioId: string): void
}

const profileKey = (scenarioId: string) => `founder-mode.profile.v1.${scenarioId}`
const SCENARIO_KEY = 'founder-mode.scenario.v1'

export function browserProfiles(): ProfileStorage {
  return {
    load(scenarioId) {
      try {
        const raw = window.localStorage.getItem(profileKey(scenarioId))
        return raw
          ? { ...emptyProfile(), ...(JSON.parse(raw) as Partial<Profile>) }
          : emptyProfile()
      } catch {
        return emptyProfile()
      }
    },
    save(scenarioId, profile) {
      try {
        window.localStorage.setItem(profileKey(scenarioId), JSON.stringify(profile))
      } catch {
        // Best runs are a convenience; the game works without them.
      }
    },
    lastScenario() {
      try {
        return window.localStorage.getItem(SCENARIO_KEY)
      } catch {
        return null
      }
    },
    setLastScenario(scenarioId) {
      try {
        window.localStorage.setItem(SCENARIO_KEY, scenarioId)
      } catch {
        // Next time the game opens on the first scenario instead.
      }
    },
  }
}

export function memoryProfiles(): ProfileStorage {
  const all = new Map<string, string>()
  let picked: string | null = null
  return {
    lastScenario: () => picked,
    setLastScenario: (id) => {
      picked = id
    },
    load: (id) => {
      const raw = all.get(id)
      return raw ? (JSON.parse(raw) as Profile) : emptyProfile()
    },
    save: (id, profile) => {
      all.set(id, JSON.stringify(profile))
    },
  }
}
