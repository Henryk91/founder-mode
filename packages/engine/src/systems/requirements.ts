import type { GameState } from '../types'

/** Content-declared market alternatives do not create physical places or grant skills. */
export function leisureAlternativeMet(s: GameState, required: string): boolean {
  const alternatives = s.scenario.bookings?.leisure?.alternatives?.[required]
  if (!alternatives) return false
  const ready = (id: string, seen: Set<string>): boolean => {
    if (seen.has(id) || !s.product.features.some((f) => f.id === id && f.shippedWeek !== null))
      return false
    const parent = s.scenario.bookings?.products[id]?.requires
    return !parent || ready(parent, new Set([...seen, id]))
  }
  return alternatives.some((id) => ready(id, new Set()))
}
