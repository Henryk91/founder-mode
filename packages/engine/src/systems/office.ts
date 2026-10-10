import type { ChannelId } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { GameState, Modifier, ReportEntry } from '../types'
import { OddsTally } from './odds'
import { addLeads } from './sales'

/** The fixed cost id an office stage's rent goes under. */
const OFFICE_COST = 'office'

/** A stage's lasting effects as a modifier, or none when it has no effect. */
function officeModifier(state: GameState, stageId: string): Modifier[] {
  const stage = state.scenario.officeStages.find((o) => o.id === stageId)
  if (!stage) throw new Error(`Unknown office stage ${stageId}`)
  const factors = stage.channelFactors
  const walkIns = stage.walkIns
    ? { segmentId: stage.walkIns.segment, leadsPerWeek: stage.walkIns.leadsPerWeek }
    : null
  if (stage.energyPerWeek === 0 && Object.keys(factors).length === 0 && !walkIns) return []
  return [
    {
      id: stage.id,
      source: 'office',
      energyPerWeek: stage.energyPerWeek,
      channelFactors: factors,
      walkIns,
    },
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

/**
 * Leads that walk in at the office this week, from each modifier's market: the mean rate rounded
 * at random (the whole part, plus one more with the fraction's chance). They are open leads like
 * any other, recorded with source `walk_in` and the office they came from. No draw without one.
 */
export function applyWalkIns(
  state: GameState,
  rng: Rng,
): { state: GameState; entries: ReportEntry[] } {
  const entries: ReportEntry[] = []
  const odds = new OddsTally(state.week)
  let out = state
  for (const m of state.modifiers) {
    if (!m.walkIns) continue
    const { segmentId, leadsPerWeek } = m.walkIns
    const whole = Math.floor(leadsPerWeek)
    const count = whole + (rng.chance(leadsPerWeek - whole) ? 1 : 0)
    odds.count('walk_ins', segmentId, leadsPerWeek, count)
    if (count === 0) continue
    const before = out.leads.length
    out = addLeads(out, segmentId, count, rng, 'walk_in')
    out = {
      ...out,
      leads: out.leads.map((l, i) => (i >= before ? { ...l, walkInFrom: m.id } : l)),
    }
    const place = state.scenario.officeStages.find((o) => o.id === m.id)?.name ?? m.id
    entries.push({ kind: 'walk_in_leads', segmentId, count, place })
  }
  const events = odds.events()
  if (events.length === 0) return { state: out, entries }
  return { state: { ...out, eventLog: [...out.eventLog, ...events] }, entries }
}
