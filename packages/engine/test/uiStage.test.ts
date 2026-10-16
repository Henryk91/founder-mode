import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek } from '../src/index'
import { peopleWorking, reachesEstablished } from '../src/systems/uiStage'
import type { GameState, TeamMember } from '../src/types'
import { deepFreeze, plan } from './helpers'

// Plan 3, decision after review: the established look follows months covering all costs and a
// team of three, not an office stage.
let parsed: Scenario | null = null
const long = (): Scenario => (parsed ??= deepFreeze(loadScenario('kantino', 'long')))
const quiet = (): Scenario => {
  const s = long()
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}

const member = (id: string): TeamMember => ({
  id,
  name: `Person ${id}`,
  role: 'developer',
  offerWeek: 1,
  startWeek: 1,
  letGoWeek: null,
})

/** A long Kantino run after `weeks` weeks, every week so far paid well, with `hires` people. */
function run(weeks: number, hires: number): GameState {
  let s = createGame(quiet(), 'established')
  for (let w = 0; w < weeks; w++) s = endWeek(s, plan()).state
  return {
    ...s,
    ledger: s.ledger.map((l) => ({ ...l, revenueCents: 5_000_000 })),
    team: { ...s.team, members: Array.from({ length: hires }, (_, i) => member(`m${i}`)) },
  }
}

describe('the established UI stage (plan 3)', () => {
  it('needs six months covering all costs and three people, then switches once', () => {
    const months = long().establishedAt!.monthsCoveringAll
    const weeks = months * long().finance.weeksPerMonth
    expect(reachesEstablished(run(weeks, 1))).toBe(false)
    expect(reachesEstablished(run(weeks - long().finance.weeksPerMonth, 2))).toBe(false)
    const ready = run(weeks, 2)
    expect(peopleWorking(ready)).toBe(3)
    expect(reachesEstablished(ready)).toBe(true)
    const next = endWeek(ready, plan())
    expect(next.state.company.uiStage).toBe('established')
    expect(next.report.uiStageChanged).toBe(true)
    expect(next.report.entries).toContainEqual({ kind: 'ui_established' })
    // Never back, even when the team shrinks.
    const after = endWeek({ ...next.state, team: { ...next.state.team, members: [] } }, plan())
    expect(after.state.company.uiStage).toBe('established')
    expect(after.report.uiStageChanged).toBe(false)
  })

  it('counts staff on contracts at a tourism business, and never switches the 60 week game', () => {
    const s = createGame(loadScenario('gratwanderung'), 'contracts')
    const contract = (id: string) => ({
      id,
      roleId: 'hiking_leader',
      kind: 'permanent' as const,
      name: id,
      startWeek: 1,
      endWeek: null,
    })
    const staffed = { ...s, bookings: { ...s.bookings!, contracts: [contract('a'), contract('b')] } }
    expect(peopleWorking(staffed)).toBe(3)
    expect(loadScenario('kantino').establishedAt).toBeUndefined()
    expect(loadScenario('zollstock').establishedAt).toBeUndefined()
  })
})
