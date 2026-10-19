import type { ScenarioId } from './ids'
import { parseScenario, type ScenarioSources } from './parse'
import type { GameMode, Scenario } from './schema'

/**
 * One scenario's files, loaded on demand (step 8): the web bundle keeps each scenario in its own
 * chunk, so the Start screen does not wait for all of them.
 */
export async function loadSourcesLazy(id: ScenarioId): Promise<ScenarioSources> {
  switch (id) {
    case 'kantino':
      return (await import('./sources/kantino')).sources
    case 'zollstock':
      return (await import('./sources/zollstock')).sources
    case 'gratwanderung':
      return (await import('./sources/gratwanderung')).sources
    case 'hinterhof':
      return (await import('./sources/hinterhof')).sources
    case 'seeblick':
      return (await import('./sources/seeblick')).sources
    case 'rueckenwind':
      return (await import('./sources/rueckenwind')).sources
    case 'tiefgang':
      return (await import('./sources/tiefgang')).sources
    case 'leinenlos':
      return (await import('./sources/leinenlos')).sources
    case 'ausgesperrt':
      return (await import('./sources/ausgesperrt')).sources
  }
}

/** A built in scenario parsed from files loaded on demand, for one mode. */
export async function loadScenarioLazy(id: ScenarioId, mode: GameMode): Promise<Scenario> {
  return parseScenario(await loadSourcesLazy(id), mode)
}
