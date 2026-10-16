import type { EndingId, GameMode, SaveFile, SuggestionId } from '@founder-mode/engine'

/**
 * Where a scenario's run of one mode lives: its save and its best runs. The 60 week game keeps
 * the scenario id, so its keys are those of every earlier version; long mode adds `.long`.
 */
export const slotOf = (scenarioId: string, mode: GameMode = 'standard'): string =>
  mode === 'standard' ? scenarioId : `${scenarioId}.${mode}`

/** The scenario and mode of a slot, the reverse of `slotOf`. */
export function parseSlot(slot: string): { scenarioId: string; mode: GameMode } {
  return slot.endsWith('.long')
    ? { scenarioId: slot.slice(0, -'.long'.length), mode: 'long' }
    : { scenarioId: slot, mode: 'standard' }
}

/** The slot a save file belongs to. */
export const slotOfSave = (file: SaveFile): string => slotOf(file.scenarioId, file.mode)

/** A stored save that is there but cannot be used as one: not JSON, or not shaped like a save. */
export const UNREADABLE = 'unreadable'

/**
 * Where the autosaves live, one per scenario and mode (`slotOf`), so each can be continued on its
 * own. Injected so tests and private windows need no browser storage.
 */
export type SaveStorage = {
  /** The save in a slot, null when there is none, or `UNREADABLE` when it is broken. */
  load(slot: string): SaveFile | typeof UNREADABLE | null
  /** Saves under the file's own slot. False when the browser would not store it. */
  save(file: SaveFile): boolean
  clear(slot: string): void
  /** Every slot with something stored in it, readable or not. */
  slots(): string[]
  /** False when this browser keeps nothing at all, as in some private windows. */
  available(): boolean
}

const SAVE_PREFIX = 'founder-mode.save.v1.'
const saveKey = (scenarioId: string) => `${SAVE_PREFIX}${scenarioId}`
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
    (f['mode'] === undefined || f['mode'] === 'long') &&
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
        window.localStorage.setItem(saveKey(slotOfSave(file)), JSON.stringify(file))
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
    slots() {
      try {
        const found = new Set<string>()
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key?.startsWith(SAVE_PREFIX)) found.add(key.slice(SAVE_PREFIX.length))
        }
        const legacy = window.localStorage.getItem(LEGACY_SAVE_KEY)
        const file = legacy === null ? null : readSave(legacy)
        if (file && file !== UNREADABLE) found.add(slotOfSave(file))
        return [...found]
      } catch {
        return []
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
  let last = initial ? slotOfSave(initial) : ''
  if (initial) files.set(slotOfSave(initial), JSON.stringify(initial))
  const read = (id: string) => {
    const raw = files.get(id)
    return raw === undefined ? null : readSave(raw)
  }
  return {
    load: (id) => read(id),
    save: (f) => {
      if (options.full || options.unavailable) return false
      files.set(slotOfSave(f), JSON.stringify(f))
      last = slotOfSave(f)
      return true
    },
    clear: (id) => {
      files.delete(id)
      last = id
    },
    slots: () => [...files.keys()],
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
  /** Long mode with funding: the founder's share at the end in basis points; absent before. */
  founderShareBp?: number
}

/** What the game remembers about one scenario in one mode across runs. Local to this browser. */
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

/**
 * What the Continue card shows about a save without replaying it: written with every autosave,
 * most recently played first. Saves from before these notes have none until the next week.
 */
export type SaveNote = { slot: string; week: number; maxWeeks: number; cashCents: number }

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
  /** The run length picked last on the Start screen. */
  lastMode(): string | null
  setLastMode(mode: string): void
  /** The category shown last on the Start screen. */
  lastCategory(): string | null
  setLastCategory(id: string): void
  /** Scenario ids, the one played most recently first. */
  recentScenarios(): string[]
  setRecentScenarios(ids: string[]): void
  /** Notes on the saves, the one played most recently first. */
  saveNotes(): SaveNote[]
  setSaveNotes(notes: SaveNote[]): void
}

const profileKey = (scenarioId: string) => `founder-mode.profile.v1.${scenarioId}`
/** Where best runs that could not be read are kept, in case they can be rescued. */
export const unreadableProfileKey = (scenarioId: string) =>
  `founder-mode.profile.v1.${scenarioId}.unreadable`
const SCENARIO_KEY = 'founder-mode.scenario.v1'
const MODE_KEY = 'founder-mode.mode.v1'
const CATEGORY_KEY = 'founder-mode.category.v1'
const RECENT_KEY = 'founder-mode.recent.v1'
const NOTES_KEY = 'founder-mode.saveNotes.v1'

const isNote = (n: unknown): n is SaveNote => {
  if (typeof n !== 'object' || n === null) return false
  const x = n as Record<string, unknown>
  return (
    typeof x['slot'] === 'string' &&
    typeof x['week'] === 'number' &&
    typeof x['maxWeeks'] === 'number' &&
    typeof x['cashCents'] === 'number'
  )
}

/** A stored list, keeping only the entries that pass `keep`; empty when it cannot be read. */
function readList<T>(raw: string | null, keep: (x: unknown) => x is T): T[] {
  if (raw === null) return []
  try {
    const list: unknown = JSON.parse(raw)
    return Array.isArray(list) ? list.filter(keep) : []
  } catch {
    return []
  }
}

const isString = (x: unknown): x is string => typeof x === 'string'

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
    lastMode() {
      try {
        return window.localStorage.getItem(MODE_KEY)
      } catch {
        return null
      }
    },
    setLastMode(mode) {
      try {
        window.localStorage.setItem(MODE_KEY, mode)
      } catch {
        // Next time the game opens on the 60 week game instead.
      }
    },
    lastCategory() {
      try {
        return window.localStorage.getItem(CATEGORY_KEY)
      } catch {
        return null
      }
    },
    setLastCategory(id) {
      try {
        window.localStorage.setItem(CATEGORY_KEY, id)
      } catch {
        // Next time the Start screen opens on the category of the company picked last.
      }
    },
    recentScenarios() {
      try {
        return readList(window.localStorage.getItem(RECENT_KEY), isString)
      } catch {
        return []
      }
    },
    setRecentScenarios(ids) {
      try {
        window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids))
      } catch {
        // The list keeps its content order instead.
      }
    },
    saveNotes() {
      try {
        return readList(window.localStorage.getItem(NOTES_KEY), isNote)
      } catch {
        return []
      }
    },
    setSaveNotes(notes) {
      try {
        window.localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
      } catch {
        // The Continue card shows the week only, read from the save itself.
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
  let pickedMode: string | null = null
  let category: string | null = null
  let recent: string[] = []
  let notes: SaveNote[] = []
  const storage: ProfileStorage & { aside(scenarioId: string): string | null } = {
    lastCategory: () => category,
    setLastCategory: (id) => {
      category = id
    },
    recentScenarios: () => recent,
    setRecentScenarios: (ids) => {
      recent = ids
    },
    saveNotes: () => notes,
    setSaveNotes: (list) => {
      notes = list
    },
    lastScenario: () => picked,
    setLastScenario: (id) => {
      picked = id
    },
    lastMode: () => pickedMode,
    setLastMode: (mode) => {
      pickedMode = mode
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
