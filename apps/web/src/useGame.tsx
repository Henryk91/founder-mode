import { createContext, useContext, useSyncExternalStore } from 'react'
import type { StoreApi } from 'zustand/vanilla'
import type { GameStore } from './store'

const StoreContext = createContext<StoreApi<GameStore> | null>(null)

export const StoreProvider = StoreContext.Provider

/**
 * Subscribes to the game store. Selectors only ever see `UiState`, never the engine state, and
 * must return primitives or parts of the state, so the result is stable between renders.
 * The server snapshot reads the live state too, so tests can render with `react-dom/server`.
 */
export function useGame<T>(selector: (state: GameStore) => T): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useGame needs a StoreProvider')
  const read = () => selector(store.getState())
  return useSyncExternalStore(store.subscribe, read, read)
}
