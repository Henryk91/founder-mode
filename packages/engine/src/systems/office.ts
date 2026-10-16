import type { ChannelId, OfficeStage } from '@founder-mode/content'
import type { Rng } from '../rng'
import type { GameState, Modifier, OfficeStay, ReportEntry, WeekPlan } from '../types'
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
    company: {
      ...state.company,
      officeStage: stage.id,
      fixedCosts,
      office: { ...state.company.office, sinceWeek: state.week },
    },
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

// ---------------------------------------------------------------------------
// Plan 3 (docs/office-stages.md): stages offered by the inbox, moving in, giving notice.

/** The stage the company works from now. */
export function currentStage(state: Pick<GameState, 'scenario' | 'company'>): OfficeStage {
  const stage = state.scenario.officeStages.find((o) => o.id === state.company.officeStage)
  return stage ?? state.scenario.officeStages[0]!
}

/** A stage's place in the scenario's list, from 1. */
export function stageNumber(state: Pick<GameState, 'scenario'>, id: string): number {
  return state.scenario.officeStages.findIndex((o) => o.id === id) + 1
}

/** People working at once here, the founder included; Infinity without a desk limit. */
export function desks(state: Pick<GameState, 'scenario' | 'company'>): number {
  return currentStage(state).desks ?? Infinity
}

/** Desks left: desks less the founder and everyone hired (working or starting). */
export function desksFree(state: Pick<GameState, 'scenario' | 'company' | 'team'>): number {
  const people = 1 + state.team.members.filter((m) => m.letGoWeek === null).length
  return desks(state) - people
}

/** A move or notice is under way. */
export const officeBusy = (state: Pick<GameState, 'company'>): boolean =>
  state.company.office.move !== null || state.company.office.notice !== null

/** The previous stage in the list, where notice takes the company; null at the first. */
function previousStage(state: GameState): OfficeStage | null {
  const i = stageNumber(state, state.company.officeStage) - 1
  return i > 0 ? state.scenario.officeStages[i - 1]! : null
}

/** Notice can be given: the scenario has office moves, a stage reached by an offer, nothing under way. */
export function canGiveNotice(state: GameState): boolean {
  if (!state.scenario.office || officeBusy(state)) return false
  const stay = state.company.office.stays.at(-1)
  return !!stay && stay.stage === state.company.officeStage && stay.leftWeek === null
}

/** Whether a plan's office part can be carried out. */
export function officePlanValid(state: GameState, plan: WeekPlan): boolean {
  if (!plan.office?.notice) return true
  return canGiveNotice(state)
}

/** Monthly revenue over the last four weeks, for the stays' before and after. */
function lastFourWeeksRevenue(state: GameState): number {
  return state.ledger.slice(-4).reduce((t, l) => t + l.revenueCents, 0)
}

/**
 * Accepting a stage's offer (effect `officeMove`, inbox step 2): its one-off is due now unless a
 * loan bought it, its rent replaces the old stage's from now, and the move completes after its
 * moving weeks. Nothing happens during another move or notice, or for the stage already in use.
 */
export function acceptOffice(
  state: GameState,
  stageId: string,
): { state: GameState; costCents: number; entries: ReportEntry[] } {
  const stage = state.scenario.officeStages.find((o) => o.id === stageId)
  if (!stage) throw new Error(`Unknown office stage ${stageId}`)
  if (officeBusy(state) || state.company.officeStage === stageId) {
    return { state, costCents: 0, entries: [] }
  }
  const office = state.company.office
  const prepaid = office.prepaid.includes(stageId)
  const costCents = prepaid ? 0 : (stage.oneOffCents ?? 0)
  const fixedCosts = state.company.fixedCosts.filter((c) => c.id !== OFFICE_COST)
  if (stage.monthlyCents > 0) {
    fixedCosts.push({ id: OFFICE_COST, name: stage.name, monthlyCents: stage.monthlyCents })
  }
  const stay: OfficeStay = {
    stage: stageId,
    acceptedWeek: state.week,
    movedWeek: null,
    leftWeek: null,
    oneOffCents: stage.oneOffCents ?? 0,
    depositBackCents: 0,
    revenueBeforeCents: lastFourWeeksRevenue(state),
    teamBefore: state.team.members.filter((m) => m.letGoWeek === null).length,
  }
  return {
    state: {
      ...state,
      company: {
        ...state.company,
        fixedCosts,
        office: {
          ...office,
          prepaid: office.prepaid.filter((x) => x !== stageId),
          move: {
            stage: stageId,
            startWeek: state.week,
            readyWeek: state.week + (stage.moveWeeks ?? 2),
          },
          stays: [...office.stays, stay],
        },
      },
    },
    costCents,
    entries: [
      {
        kind: 'office_accepted',
        place: stage.name,
        costCents,
        monthlyCents: stage.monthlyCents,
        readyWeek: state.week + (stage.moveWeeks ?? 2),
      },
    ],
  }
}

/**
 * Plan 3, each week after the inbox: a move completes in its ready week (the stage's effects); notice given this week starts; notice that
 * runs out takes the company back one stage with the deposit. The move takes founder hours next
 * week while it lasts.
 */
export function applyOfficeWeek(
  input: GameState,
  plan: WeekPlan,
): { state: GameState; entries: ReportEntry[]; incomeCents: number; forcedHours: number } {
  const cfg = input.scenario.office
  const out = { state: input, entries: [] as ReportEntry[], incomeCents: 0, forcedHours: 0 }
  if (!cfg) return out
  let state = input
  const week = state.week
  const office = () => state.company.office
  const setOffice = (change: Partial<GameState['company']['office']>) => {
    state = { ...state, company: { ...state.company, office: { ...office(), ...change } } }
  }
  const stays = (f: (s: OfficeStay) => OfficeStay) =>
    office().stays.map((s, i, all) => (i === all.length - 1 ? f(s) : s))

  const move = office().move
  if (move && week >= move.readyWeek) {
    // The rent moved at acceptance; moveOffice keeps it and lays the new stage's effects.
    state = moveOffice(state, move.stage)
    setOffice({ move: null, stays: stays((s) => ({ ...s, movedWeek: week })) })
    const stage = currentStage(state)
    out.entries.push({
      kind: 'office_moved',
      place: stage.name,
      stage: stageNumber(state, stage.id),
    })
  } else if (move) {
    out.forcedHours += cfg.moveHoursPerWeek
  }

  if (plan.office?.notice && canGiveNotice(state)) {
    setOffice({ notice: { endWeek: week + cfg.noticeWeeks } })
    out.entries.push({
      kind: 'office_notice',
      place: currentStage(state).name,
      endWeek: week + cfg.noticeWeeks,
    })
  } else {
    const notice = office().notice
    if (notice && week >= notice.endWeek) {
      const left = currentStage(state)
      const back = previousStage(state)
      if (back) state = moveOffice(state, back.id)
      out.incomeCents += left.depositCents ?? 0
      setOffice({
        notice: null,
        stays: office().stays.map((s) =>
          s.stage === left.id && s.leftWeek === null
            ? { ...s, leftWeek: week, depositBackCents: left.depositCents ?? 0 }
            : s,
        ),
      })
      out.entries.push({
        kind: 'office_left',
        place: left.name,
        backTo: back?.name ?? left.name,
        depositCents: left.depositCents ?? 0,
      })
    }
  }
  out.state = state
  return out
}

/** A loan bought this stage's fit-out (plan 3): accepting its offer costs nothing more. */
export function prepayOffice(state: GameState, stageId: string): GameState {
  const office = state.company.office
  if (office.prepaid.includes(stageId)) return state
  return {
    ...state,
    company: { ...state.company, office: { ...office, prepaid: [...office.prepaid, stageId] } },
  }
}
