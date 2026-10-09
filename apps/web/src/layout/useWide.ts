import { useSyncExternalStore } from 'react'

/** Width from which the desk layout replaces the phone layout, see docs/design/design.md. */
export const DESK_MIN_WIDTH = 900
const QUERY = `(min-width: ${DESK_MIN_WIDTH}px)`

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const list = window.matchMedia(QUERY)
  list.addEventListener('change', onChange)
  return () => list.removeEventListener('change', onChange)
}

const isWide = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches

/** True at desk width. Phone first: false wherever there is no window. */
export function useWide(): boolean {
  return useSyncExternalStore(subscribe, isWide, () => false)
}
