import type { EndingId, SaveFile, SuggestionId } from '@founder-mode/engine'

/** A stored save that is there but cannot be used as one: not JSON, or not shaped like a save. */
export const UNREADABLE = 'unreadable'

/**
 * Where the autosaves live, one per scenario, so each scenario can be continued on its own.
 * Injected so tests and private windows need no browser storage.
 */
export type SaveStorage = {
  /** The save, null when there is none, or `UNREADABLE` when one is there but broken. */
  load(scenarioId: string): SaveFile | typeof UNREADABLE | null
  /** Saves under the file's own scenario. False when the browser would not store it. */
  save(file: SaveFile): boolean
  clear(scenarioId: string): void
  /** False when this browser keeps nothing at all, as in some private windows. */
  available(): boolean
}

const saveKey = (scenarioId: string) => `founder-mode.save.v1.${scenarioId}`
/** Before there was more than one scenario, the one autosave lived here. */
const LEGACY_SAVE_KEY = 'founder-mode.save.v1'
const PROBE_KEY = 'founder-mode.probe'

/** True when `x` has the shape of a save file. What is in it is the engine's to check. */
export function isSaveFile(x: unknown): x is SaveFile {
  if (typeof x !== 'object' || x === null) return false
  const f = x as Record<string, unknown>
  return (
    typeof f['engineVersion'] === 'string' &&
    typeof f['scenarioId'] === 'string' &&
    typeof f['seed'] === 'string' &&
    (f['scenarioHash'] === undefined || typeof f['scenarioHash'] === 'string') &&
    Array.isArray(f['actions']) &&
    f['actions'].every(
      (a) =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as { type?: unknown }).type === 'string' &&
        typeof (a as { week?: unknown }).week === 'number',
    )
  )
}

/** Parses stored text into a save, or `UNREADABLE`. */
export function readSave(raw: string): SaveFile | typeof UNREADABLE {
  try {
    const file: unknown = JSON.parse(raw)
    return isSaveFile(file) ? file : UNREADABLE
  } catch {
    return UNREADABLE
  }
}

/** Whether this browser lets us store anything at all. */
function canStore(): boolean {
  try {
    window.localStorage.setItem(PROBE_KEY, '1')
    window.localStorage.removeItem(PROBE_KEY)
    return true
  } catch {
    return false
  }
}

// Every access is wrapped: storage can be missing, full, or blocked (private windows).
export function browserStorage(): SaveStorage {
  const read = (key: string) => {
    const raw = window.localStorage.getItem(key)
    return raw === null ? null : readSave(raw)
  }
  return {
    load(scenarioId) {
      try {
        const file = read(saveKey(scenarioId))
        if (file) return file
        // A save from before scenarios had their own keys moves to its scenario's key.
        const legacy = read(LEGACY_SAVE_KEY)
        if (legacy === null || legacy === UNREADABLE || legacy.scenarioId !== scenarioId) {
          return null
        }
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
        return true
      } catch {
        // The run continues, it just cannot be continued later. The store says so.
        return false
      }
    },
    clear(scenarioId) {
      try {
        window.localStorage.removeItem(saveKey(scenarioId))
      } catch {
        // Nothing to do.
      }
    },
    available: canStore,
  }
}

/**
 * Saves in memory, per scenario. `current()` reads the scenario saved or cleared last (at first
 * the initial file's), or the one named. `raw` puts any text where a save would be, and `full`
 * makes every save fail, to stand in for broken or full browser storage in tests.
 */
export function memoryStorage(
  initial: SaveFile | null = null,
  options: { raw?: Record<string, string>; full?: boolean; unavailable?: boolean } = {},
): SaveStorage & {
  current(scenarioId?: string): SaveFile | null
} {
  const files = new Map<string, string>(Object.entries(options.raw ?? {}))
  let last = initial?.scenarioId ?? ''
  if (initial) files.set(initial.scenarioId, JSON.stringify(initial))
  const read = (id: string) => {
    const raw = files.get(id)
    return raw === undefined ? null : readSave(raw)
  }
  return {
    load: (id) => read(id),
    save: (f) => {
      if (options.full || options.unavailable) return false
      files.set(f.scenarioId, JSON.stringify(f))
      last = f.scenarioId
      return true
    },
    clear: (id) => {
      files.delete(id)
      last = id
    },
    available: () => !options.unavailable,
    current: (id) => {
      const f = read(id ?? last)
      return f === UNREADABLE ? null : f
    },
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

/** What went wrong with the best runs: could not be read, or could not be stored. */
export type ProfileTrouble = 'unreadable' | 'unsaved'

export type ProfileStorage = {
  load(scenarioId: string): Profile
  /** False when the browser would not store it. */
  save(scenarioId: string, profile: Profile): boolean
  /**
   * Set when a load found stored best runs it could not read. They are copied aside first, so the
   * next save cannot quietly wipe them.
   */
  unreadable(scenarioId: string): boolean
  /** The scenario picked last on the Start screen, so the game opens on it next time. */
  lastScenario(): string | null
  setLastScenario(scenarioId: string): void
}

const profileKey = (scenarioId: string) => `founder-mode.profile.v1.${scenarioId}`
/** Where best runs that could not be read are kept, in case they can be rescued. */
export const unreadableProfileKey = (scenarioId: string) =>
  `founder-mode.profile.v1.${scenarioId}.unreadable`
const SCENARIO_KEY = 'founder-mode.scenario.v1'

const isRun = (r: unknown): r is RunRecord => {
  if (typeof r !== 'object' || r === null) return false
  const x = r as Record<string, unknown>
  return (
    typeof x['seed'] === 'string' &&
    typeof x['replay'] === 'boolean' &&
    typeof x['ending'] === 'string' &&
    typeof x['weeks'] === 'number' &&
    typeof x['peakRevenueCents'] === 'number'
  )
}

/**
 * Reads stored best runs. Null when they cannot be read in full: a run that is not a run makes the
 * whole list suspect, and keeping only part of it would lose the rest without a word.
 */
export function readProfile(raw: string): Profile | null {
  try {
    const p: unknown = JSON.parse(raw)
    if (typeof p !== 'object' || p === null) return null
    const { runs, ...rest } = p as Partial<Profile>
    if (runs !== undefined && !(Array.isArray(runs) && runs.every(isRun))) return null
    return { ...emptyProfile(), ...rest, runs: runs ?? [] }
  } catch {
    return null
  }
}

export function browserProfiles(): ProfileStorage {
  const broken = new Set<string>()
  return {
    load(scenarioId) {
      try {
        const raw = window.localStorage.getItem(profileKey(scenarioId))
        if (raw === null) return emptyProfile()
        const profile = readProfile(raw)
        if (profile) return profile
        broken.add(scenarioId)
        // Keep the first unreadable copy: a later one would be the empty list saved over it.
        if (window.localStorage.getItem(unreadableProfileKey(scenarioId)) === null) {
          window.localStorage.setItem(unreadableProfileKey(scenarioId), raw)
        }
        return emptyProfile()
      } catch {
        return emptyProfile()
      }
    },
    save(scenarioId, profile) {
      try {
        window.localStorage.setItem(profileKey(scenarioId), JSON.stringify(profile))
        return true
      } catch {
        // Best runs are a convenience; the game works without them. The store says so.
        return false
      }
    },
    unreadable: (scenarioId) => broken.has(scenarioId),
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

/** Best runs in memory. `raw` stands in for stored text, `full` makes every save fail. */
export function memoryProfiles(options: { raw?: Record<string, string>; full?: boolean } = {}) {
  const all = new Map<string, string>(Object.entries(options.raw ?? {}))
  const broken = new Set<string>()
  const aside = new Map<string, string>()
  let picked: string | null = null
  const storage: ProfileStorage & { aside(scenarioId: string): string | null } = {
    lastScenario: () => picked,
    setLastScenario: (id) => {
      picked = id
    },
    load: (id) => {
      const raw = all.get(id)
      if (raw === undefined) return emptyProfile()
      const profile = readProfile(raw)
      if (profile) return profile
      broken.add(id)
      if (!aside.has(id)) aside.set(id, raw)
      return emptyProfile()
    },
    save: (id, profile) => {
      if (options.full) return false
      all.set(id, JSON.stringify(profile))
      return true
    },
    unreadable: (id) => broken.has(id),
    aside: (id) => aside.get(id) ?? null,
  }
  return storage
}
