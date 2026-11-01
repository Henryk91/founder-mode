import type { FeatureId, GameState, GearLine, ReportEntry } from '../types'

// Plan 6 (docs/plan6-features.md section 5): gear that wears out with use and is replaced by
// choice. Everything here runs only for products with a `wear` block.

/** A product's gear is worn out: it served its lifetime in units since it was new. */
export function isWorn(state: Pick<GameState, 'scenario' | 'bookings'>, id: FeatureId): boolean {
  const wear = state.scenario.bookings?.products[id]?.wear
  if (!wear) return false
  return (state.bookings?.wear?.[id]?.uses ?? 0) >= wear.lifeUses
}

/** The share of a product's capacity that still works: less once its gear is worn. */
export function wearFactor(state: Pick<GameState, 'scenario' | 'bookings'>, id: FeatureId): number {
  const wear = state.scenario.bookings?.products[id]?.wear
  return wear && isWorn(state, id) ? wear.wornCapacity : 1
}

/** The review penalty from guests served on worn gear, by their share of the week's guests. */
export function wornPenalty(
  state: Pick<GameState, 'scenario' | 'bookings'>,
  served: readonly { productId: FeatureId; units: number }[],
): number {
  const total = served.reduce((t, x) => t + x.units, 0)
  if (total === 0) return 0
  let penalty = 0
  for (const x of served) {
    const wear = state.scenario.bookings?.products[x.productId]?.wear
    if (wear && isWorn(state, x.productId)) penalty += (wear.wornReview * x.units) / total
  }
  return penalty
}

/** Units served this week add to each worn-out product's uses; a report line when it wears out. */
export function addUses(
  state: GameState,
  served: readonly { productId: FeatureId; units: number }[],
): { state: GameState; entries: ReportEntry[] } {
  const cfg = state.scenario.bookings
  const b = state.bookings
  if (!cfg || !b) return { state, entries: [] }
  const wear = { ...(b.wear ?? {}) }
  const entries: ReportEntry[] = []
  let changed = false
  for (const x of served) {
    const w = cfg.products[x.productId]?.wear
    if (!w || x.units === 0) continue
    const was = wear[x.productId] ?? { uses: 0, replacements: 0, wornWeeks: 0 }
    const uses = was.uses + x.units
    wear[x.productId] = { ...was, uses }
    changed = true
    if (was.uses < w.lifeUses && uses >= w.lifeUses)
      entries.push({ kind: 'gear_worn', productId: x.productId })
  }
  // Weeks spent on worn gear, for the post-mortem.
  for (const [id, w] of Object.entries(wear)) {
    if (isWorn({ ...state, bookings: { ...b, wear } }, id)) {
      wear[id] = { ...w, wornWeeks: w.wornWeeks + 1 }
      changed = true
    }
  }
  return changed ? { state: { ...state, bookings: { ...b, wear } }, entries } : { state, entries }
}

/** An inbox answer: worn gear replaced at its replacement cost, new again. */
export function replaceWorn(
  state: GameState,
  id: FeatureId,
): { state: GameState; costCents: number; entries: ReportEntry[] } {
  const w = state.scenario.bookings?.products[id]?.wear
  const b = state.bookings
  if (!w || !b || !isWorn(state, id)) return { state, costCents: 0, entries: [] }
  const was = b.wear![id]!
  return {
    state: {
      ...state,
      bookings: {
        ...b,
        wear: { ...b.wear, [id]: { ...was, uses: 0, replacements: was.replacements + 1 } },
      },
    },
    costCents: w.replaceCents,
    entries: [{ kind: 'gear_replaced', productId: id, costCents: w.replaceCents }],
  }
}

/** The post-mortem's gear lines: uses, replacements and weeks worn, per product that wears. */
export function gearLines(state: GameState): GearLine[] | undefined {
  const cfg = state.scenario.bookings
  if (!cfg || !Object.values(cfg.products).some((p) => p.wear)) return undefined
  return Object.entries(cfg.products).flatMap(([id, p]) => {
    if (!p.wear) return []
    const w = state.bookings?.wear?.[id]
    if (!w) return []
    return [
      {
        productId: id,
        uses: w.uses,
        lifeUses: p.wear.lifeUses,
        replacements: w.replacements,
        replaceCents: p.wear.replaceCents,
        wornWeeks: w.wornWeeks,
      },
    ]
  })
}
