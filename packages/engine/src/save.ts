import { createGame } from './create'
import { scenarioHash } from './hash'
import { clonePlan } from './plan'
import { respond } from './systems/inbox'
import { endWeek, shutDown } from './turn'
import type {
  ChannelId,
  GameState,
  OutreachHours,
  SaveFile,
  SaveProblem,
  Scenario,
  WeekReport,
} from './types'
import { ENGINE_VERSION } from './version'

export function toSave(state: GameState): SaveFile {
  return {
    engineVersion: state.engineVersion,
    scenarioId: state.scenarioId,
    scenarioHash: scenarioHash(state.scenario),
    ...(state.scenario.mode ? { mode: state.scenario.mode } : {}),
    seed: state.seed,
    actions: state.actionLog.map((a) =>
      a.type === 'endWeek' ? { ...a, plan: clonePlan(a.plan) } : { ...a },
    ),
  }
}

/**
 * Why a save cannot be replayed with this engine and scenario, or null when it can. A save
 * without a scenario hash predates the check and counts as made under other values.
 */
export function saveProblem(scenario: Scenario, save: SaveFile): SaveProblem | null {
  if (save.engineVersion !== ENGINE_VERSION) return 'engine_version'
  if (save.scenarioId !== scenario.id) return 'scenario_id'
  if ((save.mode ?? 'standard') !== (scenario.mode ?? 'standard')) return 'mode'
  if (save.scenarioHash !== scenarioHash(scenario)) return 'scenario_changed'
  return null
}

const PROBLEM_TEXT: Record<SaveProblem, (scenario: Scenario, save: SaveFile) => string> = {
  engine_version: (_, save) =>
    `Save is from engine ${save.engineVersion}, this is ${ENGINE_VERSION}`,
  scenario_id: (scenario, save) => `Save is for scenario ${save.scenarioId}, not ${scenario.id}`,
  mode: (scenario, save) =>
    `Save is for ${save.mode ?? 'standard'} mode, not ${scenario.mode ?? 'standard'}`,
  scenario_changed: (scenario, save) =>
    `Save was made with other values for scenario ${scenario.id} ` +
    `(hash ${save.scenarioHash ?? 'missing'}, now ${scenarioHash(scenario)}). ` +
    'Replaying it would give a different game.',
}

/**
 * Converts a save's action log to the current plan shape (plan 7): before engine 0.15.0 a plan
 * held one outreach channel per market, `{ channel, hours }`; now it holds hours per channel.
 * A save already in the current shape comes back unchanged. Never changes the engine version:
 * whether the converted log may be replayed is still `saveProblem`'s call.
 */
export function migrateSave(save: SaveFile): SaveFile {
  const old = (out: unknown): out is { channel: ChannelId; hours: number } =>
    typeof out === 'object' &&
    out !== null &&
    typeof (out as { channel?: unknown }).channel === 'string' &&
    typeof (out as { hours?: unknown }).hours === 'number'
  if (
    !save.actions.some(
      (a) => a.type === 'endWeek' && Object.values(a.plan.outreach ?? {}).some((o) => old(o)),
    )
  ) {
    return save
  }
  return {
    ...save,
    actions: save.actions.map((a) => {
      if (a.type !== 'endWeek') return a
      const outreach: Record<string, OutreachHours> = {}
      for (const [seg, out] of Object.entries(a.plan.outreach ?? {})) {
        outreach[seg] = old(out) ? { [out.channel]: out.hours } : { ...out }
      }
      return { ...a, plan: { ...a.plan, outreach } }
    }),
  }
}

/** Rebuilds a game by applying the saved actions to a fresh game with the same seed. */
export function replay(scenario: Scenario, input: SaveFile): GameState {
  return replayWithReports(scenario, input).state
}

/**
 * Plan 7 step 2b: rebuilds a game as `replay` does, and keeps every week's report on the way, so
 * the player can reopen earlier weeks. The reports are never stored in the save.
 */
export function replayWithReports(
  scenario: Scenario,
  input: SaveFile,
): { state: GameState; reports: WeekReport[] } {
  const save = migrateSave(input)
  const problem = saveProblem(scenario, save)
  if (problem) throw new Error(PROBLEM_TEXT[problem](scenario, save))
  let state = createGame(scenario, save.seed)
  const reports: WeekReport[] = []
  for (const action of save.actions) {
    if (action.week !== state.week) {
      throw new Error(`Save action for week ${action.week} does not match week ${state.week}`)
    }
    if (action.type === 'endWeek') {
      const r = endWeek(state, action.plan)
      state = r.state
      reports.push(r.report)
    } else if (action.type === 'respond') state = respond(state, action.messageId, action.choiceId)
    else state = shutDown(state)
  }
  return { state, reports }
}
