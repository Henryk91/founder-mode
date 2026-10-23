import type { GameState, LeisureState } from '../types'
import { contractConfig, contractWorks } from './contracts'

/** Founder first,then named contracts;anonymous per-class cover is a pool of people. */
export function classWorkload(
  s: GameState,
  founderShifts: Record<string, number>,
  classesByRole: Record<string, number>,
): { loads: NonNullable<LeisureState['instructorLoads']>; penalty: number } | null {
  const cfg = s.scenario.bookings?.leisure?.instructorWorkload
  if (!cfg) return null
  const loads: NonNullable<LeisureState['instructorLoads']> = []
  let founder = 0
  for (const role of Object.keys(classesByRole).sort()) {
    let remaining = classesByRole[role] ?? 0
    const own = Math.min(remaining, founderShifts[role] ?? 0)
    founder += own
    remaining -= own
    for (const contract of s.bookings?.contracts ?? []) {
      if (contract.roleId !== role || !contractWorks(s, contract, s.week)) continue
      const n = Math.min(remaining, contractConfig(s, role, contract.kind)?.shifts ?? 0)
      if (n > 0) loads.push({ id: contract.id, kind: 'contract', name: contract.name, classes: n })
      remaining -= n
    }
  }
  if (founder > 0) loads.unshift({ id: 'founder', kind: 'founder', classes: founder })
  const excess = loads.reduce((sum, load) => sum + Math.max(0, load.classes - cfg.maxClasses), 0)
  const total = Object.values(classesByRole).reduce((sum, n) => sum + n, 0)
  return { loads, penalty: total > 0 ? (excess / total) * cfg.penaltyPerOverloadedClass : 0 }
}
