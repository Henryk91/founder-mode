import type { ContractKind } from '@founder-mode/content'
import type { GameState, ReportEntry, StaffContract, WeekPlan } from '../types'

// Plan 2 step 1b: staff on contracts. Permanent and part time staff work every week and are paid
// whether busy or not; notice keeps them (and their pay) for a few weeks more. A seasonal contract
// runs through its months and cannot be ended early. No random numbers are drawn here.

const WEEKS_PER_YEAR = 52

/** The kinds in the order the screen lists them (as in the content schema). */
export const CONTRACT_KINDS: readonly ContractKind[] = ['permanent', 'part_time', 'seasonal']

function monthAt(state: Pick<GameState, 'scenario'>, week: number): number {
  const start = state.scenario.bookings?.startWeekOfYear ?? 1
  const woy = ((start - 1 + week - 1) % WEEKS_PER_YEAR) + 1
  return Math.min(12, Math.floor(((woy - 1) * 12) / WEEKS_PER_YEAR) + 1)
}

export function contractConfig(
  state: Pick<GameState, 'scenario'>,
  roleId: string,
  kind: ContractKind,
) {
  return state.scenario.bookings?.roles[roleId]?.contracts?.[kind]
}

/** A contract works (and is paid) in a week: started, not ended, and in its months. */
export function contractWorks(
  state: Pick<GameState, 'scenario'>,
  c: StaffContract,
  week: number,
): boolean {
  if (week < c.startWeek || (c.endWeek !== null && week > c.endWeek)) return false
  const months = contractConfig(state, c.roleId, c.kind)?.months
  return !months || months.includes(monthAt(state, week))
}

/** The last week of the season run a seasonal contract signed in `week` covers. */
export function seasonEnd(
  state: Pick<GameState, 'scenario'>,
  months: readonly number[],
  week: number,
): number {
  let w = week
  // To the season's start (or now, if it is in season), then to its last week.
  while (!months.includes(monthAt(state, w)) && w < week + WEEKS_PER_YEAR) w++
  while (months.includes(monthAt(state, w + 1)) && w < week + 2 * WEEKS_PER_YEAR) w++
  return w
}

/** Contracts still running (signed and not past their end). */
export const runningContracts = (state: Pick<GameState, 'bookings' | 'week'>): StaffContract[] =>
  (state.bookings?.contracts ?? []).filter((c) => c.endWeek === null || c.endWeek >= state.week)

/** Whether the contract part of a plan can be carried out. */
export function contractsValid(state: GameState, plan: WeekPlan): boolean {
  const p = plan.bookings
  if (!p) return true
  const running = runningContracts(state)
  const added: Record<string, number> = {}
  for (const h of p.hire ?? []) {
    const c = contractConfig(state, h.roleId, h.kind)
    if (!c) return false
    const key = `${h.roleId}|${h.kind}`
    added[key] = (added[key] ?? 0) + 1
    const have = running.filter((x) => x.roleId === h.roleId && x.kind === h.kind).length
    if (have + added[key]! > c.max) return false
  }
  for (const id of p.endContracts ?? []) {
    const c = running.find((x) => x.id === id)
    if (!c || c.endWeek !== null) return false
    if (contractConfig(state, c.roleId, c.kind)?.noticeWeeks === undefined) return false
  }
  return new Set(p.endContracts ?? []).size === (p.endContracts ?? []).length
}

export type ContractsWeek = {
  state: GameState
  entries: ReportEntry[]
  /** Contract shifts per role this week, before any booked shift. */
  shifts: Record<string, number>
  /** Review quality the week's contract staff bring, before sharing over all shifts. */
  qualityShifts: number
  wagesCents: number
}

/**
 * The week's contracts: new ones signed, notice given, then who works this week and what they
 * cost. Signed contracts start this week; a seasonal one waits for its months.
 */
export function applyContracts(input: GameState, plan: WeekPlan): ContractsWeek {
  const out: ContractsWeek = {
    state: input,
    entries: [],
    shifts: {},
    qualityShifts: 0,
    wagesCents: 0,
  }
  const cfg = input.scenario.bookings
  const b = input.bookings
  if (!cfg || !b) return out
  const p = plan.bookings
  const contracts = [...(b.contracts ?? [])]
  const names = input.scenario.team.candidateNames
  for (const h of p?.hire ?? []) {
    const c = contractConfig(input, h.roleId, h.kind)
    if (!c) continue
    const name = names[contracts.length % Math.max(1, names.length)] ?? `Staff ${contracts.length}`
    contracts.push({
      id: `contract_${contracts.length + 1}`,
      roleId: h.roleId,
      kind: h.kind,
      name,
      startWeek: input.week,
      endWeek: c.months ? seasonEnd(input, c.months, input.week) : null,
    })
    out.entries.push({ kind: 'contract_signed', roleId: h.roleId, contractKind: h.kind, name })
  }
  for (const id of p?.endContracts ?? []) {
    const i = contracts.findIndex((x) => x.id === id)
    const x = contracts[i]
    const notice = x ? contractConfig(input, x.roleId, x.kind)?.noticeWeeks : undefined
    if (!x || notice === undefined) continue
    contracts[i] = { ...x, endWeek: input.week + notice }
    out.entries.push({
      kind: 'contract_ended',
      roleId: x.roleId,
      contractKind: x.kind,
      name: x.name,
    })
  }
  let working = 0
  for (const x of contracts) {
    if (!contractWorks(input, x, input.week)) continue
    const c = contractConfig(input, x.roleId, x.kind)!
    out.shifts[x.roleId] = (out.shifts[x.roleId] ?? 0) + c.shifts
    out.qualityShifts += c.quality * c.shifts
    out.wagesCents += c.centsPerWeek
    working++
  }
  if (working > 0)
    out.entries.push({ kind: 'contracts_paid', contracts: working, amountCents: out.wagesCents })
  if (contracts.length > 0 || b.contracts) {
    out.state = { ...input, bookings: { ...b, contracts } }
  }
  return out
}
