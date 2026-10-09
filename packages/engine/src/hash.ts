import type { Scenario } from './types'

/** JSON with object keys sorted at every level, so key order in the YAML does not matter. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

/** FNV-1a over UTF-16 code units, 32 bit, from a given offset basis. */
function fnv1a(text: string, basis: number): number {
  let h = basis
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const cache = new WeakMap<Scenario, string>()

/**
 * A short fingerprint of everything in a scenario: numbers and texts. Two 32 bit FNV-1a hashes
 * with different bases, as 16 hex digits. A save made under other scenario values is refused,
 * because replaying it would quietly give a different game.
 */
export function scenarioHash(scenario: Scenario): string {
  const known = cache.get(scenario)
  if (known) return known
  const text = canonical(scenario)
  const hex = (n: number) => n.toString(16).padStart(8, '0')
  const hash = hex(fnv1a(text, 0x811c9dc5)) + hex(fnv1a(text, 0x01000193))
  cache.set(scenario, hash)
  return hash
}
