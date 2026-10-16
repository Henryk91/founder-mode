import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek } from '../src/index'
import { reachesEstablished } from '../src/systems/uiStage'
import type { GameState } from '../src/types'
import { deepFreeze, plan } from './helpers'

// Plan 3, after review: the established look follows months covering all costs, a move into
// stage 4 or (Kantino long) a closed round; not the team's size.
let parsed: Scenario | null = null
const long = (): Scenario => (parsed ??= deepFreeze(loadScenario('kantino', 'long')))
const quiet = (): Scenario => {
  const s = long()
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}

/** A long Kantino run after `weeks` weeks; with `paid`, every week so far paid well. */
function run(weeks: number, paid: boolean): GameState {
  const start = createGame(quiet(), 'established')
  // Rich enough to last the months without customers.
  let s = { ...start, company: { ...start.company, cashCents: 50_000_000 } }
  for (let w = 0; w < weeks; w++) s = endWeek(s, plan()).state
  return paid ? { ...s, ledger: s.ledger.map((l) => ({ ...l, revenueCents: 5_000_000 })) } : s
}

describe('the established UI stage (plan 3)', () => {
  const months = () => long().establishedAt!.monthsCoveringAll
  const weeksPerMonth = () => long().finance.weeksPerMonth

  it('needs the months covering all costs in a row, then switches once and never goes back', () => {
    expect(reachesEstablished(run((months() - 1) * weeksPerMonth(), true))).toBe(false)
    expect(reachesEstablished(run(months() * weeksPerMonth(), false))).toBe(false)
    const ready = run(months() * weeksPerMonth(), true)
    expect(reachesEstablished(ready)).toBe(true)
    const next = endWeek(ready, plan())
    expect(next.state.company.uiStage).toBe('established')
    expect(next.report.uiStageChanged).toBe(true)
    expect(next.report.entries).toContainEqual({ kind: 'ui_established' })
    // Never back, even after a month that did not cover the costs.
    const poor = { ...next.state, ledger: next.state.ledger.map((l) => ({ ...l, revenueCents: 0 })) }
    const after = endWeek(poor, plan())
    expect(after.state.company.uiStage).toBe('established')
    expect(after.report.uiStageChanged).toBe(false)
  })

  it('also counts a move into stage 4, and a closed funding round in Kantino long', () => {
    const s = run(2, false)
    expect(reachesEstablished(s)).toBe(false)
    expect(reachesEstablished({ ...s, company: { ...s.company, officeStage: 'courtyard_office' } })).toBe(false)
    expect(reachesEstablished({ ...s, company: { ...s.company, officeStage: 'office_floor' } })).toBe(true)
    expect(reachesEstablished({ ...s, company: { ...s.company, officeStage: 'front_desk' } })).toBe(true)
    const stake = { name: 'Angel', round: 'angel', amountCents: 10_000_000, shareBp: 1000, week: 2 }
    const funded = { ...s, funding: { ...s.funding, stakes: [stake] } } as unknown as GameState
    expect(reachesEstablished(funded)).toBe(true)
  })

  it('is set in every long mode and in no 60 week game', () => {
    for (const id of ['gratwanderung', 'hinterhof', 'seeblick'] as const) {
      expect(loadScenario(id).establishedAt).toMatchObject({ officeStage: 4 })
    }
    expect(long().establishedAt).toMatchObject({ officeStage: 4, funded: true })
    expect(loadScenario('kantino').establishedAt).toBeUndefined()
    expect(loadScenario('zollstock').establishedAt).toBeUndefined()
  })
})
