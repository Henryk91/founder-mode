import type { GameMode, Scenario } from '@founder-mode/content'
import { SCENARIO_IDS, SCENARIO_MODES, type ScenarioId } from '@founder-mode/content/catalogue'
import { loadScenarioLazy } from '@founder-mode/content/lazy'

// The scenarios load after the first paint, each from its own chunk (step 8): the Start screen
// needs only the catalogue, so it does not wait for every scenario's files.

const cache = new Map<string, Scenario>()
const key = (id: ScenarioId, mode: GameMode) => `${id}|${mode}`
let loading: Promise<void> | null = null

/** Loads every scenario in every mode once; later calls share the same promise. */
export function preloadScenarios(): Promise<void> {
  loading ??= Promise.all(
    SCENARIO_IDS.flatMap((id) =>
      SCENARIO_MODES[id].map(async (mode) => {
        cache.set(key(id, mode), await loadScenarioLazy(id, mode))
      }),
    ),
  ).then(() => undefined)
  return loading
}

/** Whether every scenario is loaded, so a run can start or continue. */
export const scenariosLoaded = () =>
  SCENARIO_IDS.every((id) => SCENARIO_MODES[id].every((mode) => cache.has(key(id, mode))))

/** A loaded scenario. The Start screen only offers a run once all are loaded. */
export function cachedScenario(id: ScenarioId, mode: GameMode): Scenario {
  const scenario = cache.get(key(id, mode))
  if (!scenario) throw new Error(`scenario ${id} (${mode}) is not loaded yet`)
  return scenario
}
