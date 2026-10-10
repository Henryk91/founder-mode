import type { ChannelId } from '@founder-mode/content'
import type { GameState, Modifier } from '../types'

/** The fixed cost id an office stage's rent goes under. */
const OFFICE_COST = 'office'

/** A stage's lasting effects as a modifier, or none when it has no effect. */
function officeModifier(state: GameState, stageId: string): Modifier[] {
  const stage = state.scenario.officeStages.find((o) => o.id === stageId)
  if (!stage) throw new Error(`Unknown office stage ${stageId}`)
  const factors = stage.channelFactors
  if (stage.energyPerWeek === 0 && Object.keys(factors).length === 0) return []
  return [
    { id: stage.id, source: 'office', energyPerWeek: stage.energyPerWeek, channelFactors: factors },
  ]
}

/**
 * Moves the company to an office stage: its rent replaces the old stage's under one fixed cost,
 * and its lasting effects replace the old stage's modifier. Other modifiers stay.
 */
export function moveOffice(state: GameState, stageId: string): GameState {
  const stage = state.scenario.officeStages.find((o) => o.id === stageId)
  if (!stage) throw new Error(`Unknown office stage ${stageId}`)
  const fixedCosts = state.company.fixedCosts.filter((c) => c.id !== OFFICE_COST)
  if (stage.monthlyCents > 0) {
    fixedCosts.push({ id: OFFICE_COST, name: stage.name, monthlyCents: stage.monthlyCents })
  }
  return {
    ...state,
    company: { ...state.company, officeStage: stage.id, fixedCosts },
    modifiers: [
      ...state.modifiers.filter((m) => m.source !== 'office'),
      ...officeModifier(state, stage.id),
    ],
  }
}

/** Energy every week from lasting modifiers. */
export function energyPerWeek(state: Pick<GameState, 'modifiers'>): number {
  return state.modifiers.reduce((t, m) => t + m.energyPerWeek, 0)
}

/** Outreach response factor for a channel from lasting modifiers. */
export function channelFactor(state: Pick<GameState, 'modifiers'>, channel: ChannelId): number {
  return state.modifiers.reduce((t, m) => t * (m.channelFactors[channel] ?? 1), 1)
}
