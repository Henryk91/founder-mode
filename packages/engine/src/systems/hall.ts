import type { GameState, LeisurePlan, LeisureState, WeekPlan } from '../types'
import { applyContracts, contractConfig, contractWorks } from './contracts'
import { stageInEffect } from './bookings'

export function initHall(scenario: GameState['scenario']): LeisureState['hall'] | undefined {
  const c = scenario.bookings?.leisure
  if (!c?.hall) return undefined
  return {
    week: 0,
    requestedHours: Object.fromEntries(c.slots.map((s) => [s.id, s.hours])),
    openHours: {},
    deskHours: 0,
    paidSettingHours: {},
  }
}

/** Already working contracts; hall-enabled applyBookings signs this week's contracts first. */
function shifts(s: GameState, plan: WeekPlan, role: string): number {
  const contracted = (s.bookings?.contracts ?? [])
    .filter((c) => c.roleId === role && contractWorks(s, c, s.week))
    .reduce((n, c) => n + (contractConfig(s, role, c.kind)?.shifts ?? 0), 0)
  return (plan.bookings?.shifts[role] ?? 0) + (plan.bookings?.founderShifts[role] ?? 0) + contracted
}

export function hallValid(s: GameState, plan: WeekPlan): boolean {
  const cfg = s.scenario.bookings?.leisure,
    h = cfg?.hall,
    p = plan.bookings?.leisure
  if (!h) return !p?.openHours && !p?.paidSettingHours
  for (const [id, n] of Object.entries(p?.openHours ?? {})) {
    const max = cfg.slots.find((slot) => slot.id === id)?.hours
    if (max === undefined || !Number.isFinite(n) || n < 0 || n > max) return false
  }
  let allocated = 0
  for (const [id, n] of Object.entries(p?.paidSettingHours ?? {})) {
    if (
      !h.setting ||
      !cfg.freshness?.[id] ||
      !Number.isInteger(n) ||
      n < 0 ||
      !s.product.features.some((f) => f.id === id && f.shippedWeek !== null)
    )
      return false
    allocated += n
  }
  if (h.setting) {
    const signed = applyContracts(s, plan).state
    const capacity = shifts(signed, plan, h.setting.role) * h.setting.hoursPerShift
    if (allocated > capacity) return false
  }
  return true
}

export function beginHall(s: GameState, plan: WeekPlan): LeisureState['hall'] | undefined {
  const c = s.scenario.bookings?.leisure,
    h = c?.hall
  if (!h) return undefined
  const requested = {
    ...s.bookings?.leisure?.hall?.requestedHours,
    ...plan.bookings?.leisure?.openHours,
  }
  let remaining = shifts(s, plan, h.desk.role) * h.desk.hoursPerShift
  const deskHours = remaining
  const openHours = Object.fromEntries(
    c.slots.map((slot) => {
      const hours = Math.min(remaining, requested[slot.id] ?? slot.hours)
      remaining -= hours
      return [slot.id, hours]
    }),
  )
  return {
    week: s.week,
    requestedHours: requested,
    openHours,
    deskHours,
    paidSettingHours: { ...plan.bookings?.leisure?.paidSettingHours },
  }
}

/** A reset closes only its stated hours in the reset week. */
export function hallHours(s: GameState, id: string, slot: string, week: number): number {
  const c = s.scenario.bookings?.leisure
  if (!c?.hall) return 0
  const hall = s.bookings?.leisure?.hall
  const hours =
    (hall?.week === week ? hall.openHours[slot] : hall?.requestedHours[slot]) ??
    c.slots.find((x) => x.id === slot)?.hours ??
    0
  const reset =
    s.bookings?.leisure?.freshness[id]?.lastRefreshWeek === week
      ? (c.freshness?.[id]?.refresh.closedHours?.[slot] ?? 0)
      : 0
  return Math.max(0, hours - reset)
}

export function hallCapacity(
  s: GameState,
  id: string,
  slot: string,
  week: number,
  comfort = false,
): number | undefined {
  const c = s.scenario.bookings?.leisure,
    p = c?.products[id]?.simultaneous
  if (!c?.hall || !p) return undefined
  const factor = comfort ? (c.hall.comfortByStage?.[stageInEffect(s).id] ?? 1) : 1
  const people = comfort ? Math.min(p.hard, p.comfort * factor) : p.hard
  return Math.floor((people * hallHours(s, id, slot, week)) / c.hall.visitHours)
}

export function hallView(s: GameState) {
  const h = s.scenario.bookings?.leisure?.hall,
    actual = s.bookings?.leisure?.hall
  if (!h || !actual) return undefined
  return {
    ...actual,
    requestedHours: { ...actual.requestedHours },
    openHours: { ...actual.openHours },
    paidSettingHours: { ...actual.paidSettingHours },
    visitHours: h.visitHours,
    deskRoleId: h.desk.role,
    deskHoursPerShift: h.desk.hoursPerShift,
    ...(h.setting
      ? { settingRoleId: h.setting.role, settingHoursPerShift: h.setting.hoursPerShift }
      : {}),
  }
}

export function cloneHallPlan(p: LeisurePlan): Partial<LeisurePlan> {
  return {
    ...(p.openHours ? { openHours: { ...p.openHours } } : {}),
    ...(p.paidSettingHours ? { paidSettingHours: { ...p.paidSettingHours } } : {}),
  }
}
