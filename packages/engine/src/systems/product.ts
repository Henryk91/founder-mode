import type { Rng } from '../rng'
import type { GameState, ProductState, ReportEntry, WeekPlan } from '../types'

export function initialProduct(state: Pick<GameState, 'scenario'>): ProductState {
  const { scenario } = state
  return {
    features: scenario.features.map((f) => ({ id: f.id, progressHours: 0, shippedWeek: null })),
    quality: scenario.product.startQuality,
    bugs: 0,
    fixProgressHours: 0,
  }
}

export function qualityFor(state: Pick<GameState, 'scenario'>, bugs: number): number {
  const { startQuality, qualityPerBug } = state.scenario.product
  return Math.max(0, startQuality - qualityPerBug * bugs)
}

/** Hours that still fit into bug fixing before there is nothing left to fix. */
export function maxBugFixHours(state: GameState): number {
  return Math.max(
    0,
    state.product.bugs * state.scenario.product.fixHoursPerBug - state.product.fixProgressHours,
  )
}

/**
 * Product step (plan section 4.6). Bug fixing first, so the plan was validated against the bugs
 * the player could see. Then build hours go into features in scenario order; a finished feature
 * ships and adds bugs. Quality follows the bug count.
 */
export function applyProduct(
  state: GameState,
  plan: WeekPlan,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const { scenario } = state
  const entries: ReportEntry[] = []
  let bugs = state.product.bugs
  let fixProgress = state.product.fixProgressHours

  fixProgress += plan.bugFixHours
  const perBug = scenario.product.fixHoursPerBug
  const fixed = Math.min(bugs, Math.floor(fixProgress / perBug))
  bugs -= fixed
  fixProgress = bugs === 0 ? 0 : fixProgress - fixed * perBug
  if (fixed > 0) entries.push({ kind: 'bugs_fixed', count: fixed })

  const features = state.product.features.map((f) => {
    const hours = plan.build[f.id] ?? 0
    if (hours === 0 || f.shippedWeek !== null) return f
    const def = scenario.features.find((x) => x.id === f.id)
    if (!def) throw new Error(`Unknown feature ${f.id}`)
    const progressHours = f.progressHours + hours
    if (progressHours < def.buildHours) return { ...f, progressHours }
    const bugsAdded = rng.int(def.bugsOnShip.min, def.bugsOnShip.max)
    bugs += bugsAdded
    entries.push({ kind: 'feature_shipped', featureId: f.id, name: def.name, bugsAdded })
    return { ...f, progressHours: def.buildHours, shippedWeek: state.week }
  })

  return {
    state: {
      ...state,
      product: { features, bugs, fixProgressHours: fixProgress, quality: qualityFor(state, bugs) },
    },
    entries,
  }
}
