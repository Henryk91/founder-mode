import type { SaveFile } from '@founder-mode/engine'

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
