import type { EndingId, SaveFile, SuggestionId } from '@founder-mode/engine'

/** Where the autosave lives. Injected so tests and private windows need no browser storage. */
export type SaveStorage = {
  load(): SaveFile | null
  save(file: SaveFile): void
  clear(): void
}

const KEY = 'founder-mode.save.v1'

// Every access is wrapped: storage can be missing, full, or blocked (private windows).
export function browserStorage(): SaveStorage {
  return {
    load() {
      try {
        const raw = window.localStorage.getItem(KEY)
        return raw ? (JSON.parse(raw) as SaveFile) : null
      } catch {
        return null
      }
    },
    save(file) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify(file))
      } catch {
        // The run continues, it just cannot be continued later.
      }
    },
    clear() {
      try {
        window.localStorage.removeItem(KEY)
      } catch {
        // Nothing to do.
      }
    },
  }
}

export function memoryStorage(initial: SaveFile | null = null): SaveStorage & {
  current(): SaveFile | null
} {
  let file = initial
  return {
    load: () => (file ? (JSON.parse(JSON.stringify(file)) as SaveFile) : null),
    save: (f) => {
      file = JSON.parse(JSON.stringify(f)) as SaveFile
    },
    clear: () => {
      file = null
    },
    current: () => file,
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
}

const profileKey = (scenarioId: string) => `founder-mode.profile.v1.${scenarioId}`

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
  }
}

export function memoryProfiles(): ProfileStorage {
  const all = new Map<string, string>()
  return {
    load: (id) => {
      const raw = all.get(id)
      return raw ? (JSON.parse(raw) as Profile) : emptyProfile()
    },
    save: (id, profile) => {
      all.set(id, JSON.stringify(profile))
    },
  }
}
