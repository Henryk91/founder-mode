import { loadScenario, scenarioModes, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import {
  createGame,
  endWeek,
  getView,
  replay,
  saveProblem,
  scenarioHash,
  toSave,
  validatePlan,
} from '../src/index'
import { profitableForMonths } from '../src/systems/finance'
import { hoursByActivity } from '../src/systems/founder'
import { marketFactor } from '../src/systems/sales'
import type { GameState, Lead } from '../src/types'
import { deepFreeze, plan } from './helpers'
import { openLead } from './helpers2'

let parsed: Scenario | null = null
const long = (): Scenario => (parsed ??= deepFreeze(loadScenario('kantino', 'long')))
/** Long Kantino with no inbox messages, for tests about other systems. */
const quietLong = (): Scenario => {
  const s = long()
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}

describe('long mode in the content', () => {
  it('leaves the 60 week scenarios exactly as they were', () => {
    // The fingerprints of engine 0.12.0, before the long block existed.
    expect(scenarioHash(loadScenario('kantino'))).toBe('d876a5eeff2a14cc')
    expect(scenarioHash(loadScenario('zollstock'))).toBe('0e43131861f8ed2e')
    expect(loadScenario('kantino').mode).toBeUndefined()
    expect('modes' in loadScenario('kantino')).toBe(false)
  })

  it('lays the long block over Kantino and nothing else', () => {
    const s = long()
    expect(s.mode).toBe('long')
    expect(s.maxWeeks).toBe(104)
    expect(s.win).toEqual({ profitableMonths: 3 })
    expect(s.founder.livingSteps).toEqual([{ week: 53, centsPerWeek: 74250 }])
    // Objects merge: the rest of the founder block is the 60 week one.
    expect(s.founder.energy).toEqual(loadScenario('kantino').founder.energy)
    expect(s.team.roles.developer).toMatchObject({ monthlyCents: 700000, weeklyHours: 40 })
    expect(s.team.roles.salesperson).toMatchObject({ monthlyCents: 605000, selling: 0.3 })
    expect(s.milestones.map((m) => m.id)).toContain('weeks_104')
    expect(scenarioHash(s)).not.toBe(scenarioHash(loadScenario('kantino')))
    expect(scenarioModes('kantino')).toEqual(['standard', 'long'])
    expect(scenarioModes('zollstock')).toEqual(['standard'])
    expect(() => loadScenario('zollstock', 'long')).toThrow(/no long mode/)
  })
})

describe('long mode in the engine', () => {
  it('runs 104 weeks and shows its mode', () => {
    const s = createGame(quietLong(), 'long-view')
    const view = getView(s)
    expect(view.mode).toBe('long')
    expect(view.maxWeeks).toBe(104)
    expect(view.founder.nextLivingStep).toEqual({ week: 53, centsPerWeek: 74250 })
    expect(getView(createGame(loadScenario('kantino'), 'x')).founder.nextLivingStep).toBeNull()
    expect(getView(createGame(loadScenario('kantino'), 'x')).mode).toBe('standard')
  })

  it('raises living costs in week 53, and says so', () => {
    let s: GameState = { ...createGame(quietLong(), 'living'), week: 52 }
    s = { ...s, company: { ...s.company, cashCents: 100_000_000 } }
    const w52 = endWeek(s, plan())
    expect(w52.report.ledger.livingCostsCents).toBe(67500)
    const w53 = endWeek(w52.state, plan())
    expect(w53.report.entries).toContainEqual({
      kind: 'living_costs_changed',
      fromCents: 67500,
      toCents: 74250,
    })
    expect(w53.report.ledger.livingCostsCents).toBe(74250)
    expect(getView(w53.state).founder.nextLivingStep).toBeNull()
    const w54 = endWeek(w53.state, plan())
    expect(w54.report.entries.some((e) => e.kind === 'living_costs_changed')).toBe(false)
  })

  it('wins only after three profitable months', () => {
    const s = createGame(quietLong(), 'win')
    const week = (w: number, revenueCents: number) => ({
      ...endWeek(createGame(quietLong(), 'w'), plan()).state.ledger[0]!,
      week: w,
      revenueCents,
      fixedCostsCents: w % 4 === 0 ? 40_500 : 0,
      livingCostsCents: 67_500,
    })
    const months = (ok: number[]) =>
      ok.flatMap((rev, m) => [1, 2, 3, 4].map((i) => week(m * 4 + i, i === 4 ? rev : 0)))
    const two = { ...s, ledger: months([0, 400_000, 400_000]), week: 104 }
    expect(profitableForMonths(two, 2)).toBe(true)
    expect(profitableForMonths(two, 3)).toBe(false)
  })

  it('finds fewer leads in a market as more of it has been found', () => {
    const s = createGame(quietLong(), 'saturation')
    const size = s.hidden.segments['coworking']!.size
    expect(marketFactor(s, 'coworking')).toBe(1)
    const many: Lead[] = Array.from({ length: Math.floor(size / 2) }, (_, i) =>
      openLead(i + 1, 'coworking'),
    )
    expect(marketFactor({ ...s, leads: many }, 'coworking')).toBeCloseTo(
      1 - Math.floor(size / 2) / size,
    )
    const all = Array.from({ length: size }, (_, i) => openLead(i + 1, 'coworking'))
    expect(marketFactor({ ...s, leads: all }, 'coworking')).toBe(0.3)
    // The 60 week game never saturates.
    const std = createGame(loadScenario('kantino'), 'saturation')
    expect(marketFactor({ ...std, leads: all }, 'coworking')).toBe(1)
  })
})

/** Searches, waits and hires the first candidate; returns the state after the offer. */
function hireOne(s: GameState, role: 'developer' | 'salesperson'): GameState {
  s = endWeek(s, plan({ searchRole: role })).state
  s = endWeek(s, plan()).state
  s = endWeek(s, plan()).state
  return endWeek(s, plan({ hire: s.team.candidates[0]!.id })).state
}

describe('several hires in long mode', () => {
  const rich = (seed: string): GameState => {
    const s = createGame(quietLong(), seed)
    return { ...s, company: { ...s.company, cashCents: 100_000_000 } }
  }

  it('allows four at once, with 2 h of founder time each once they work', () => {
    let s = rich('four')
    for (const role of ['developer', 'developer', 'salesperson', 'salesperson'] as const) {
      s = hireOne(s, role)
    }
    expect(s.team.members).toHaveLength(4)
    expect(getView(s).team.canSearch).toBe(false)
    expect(getView(s).team.hiresLeft).toBe(4)
    expect(validatePlan(s, plan({ searchRole: 'developer' }))).toEqual([
      { code: 'search_not_allowed' },
    ])
    for (let i = 0; i < 3; i++) s = endWeek(s, plan()).state
    expect(getView(s).team.members.every((m) => m.working)).toBe(true)
    expect(hoursByActivity(s, plan()).admin).toBe(8)
    expect(endWeek(s, plan()).report.plannedHours).toBe(8)
    // Letting one go makes room for one more.
    const gone = endWeek(s, plan({ letGo: s.team.members[0]!.id })).state
    expect(getView(gone).team.members).toHaveLength(3)
    expect(getView(gone).team.canSearch).toBe(true)
  })

  it('gives each member their own task, and two salespeople never hold the same demo', () => {
    let s = rich('tasks')
    s = hireOne(s, 'salesperson')
    s = hireOne(s, 'salesperson')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan()).state
    const [a, b] = s.team.members
    s = {
      ...s,
      leads: [1, 2, 3].map((i) => openLead(i, 'medical', { stage: 'demo' })),
    }
    const r = endWeek(
      s,
      plan({
        teamTasks: {
          [a!.id]: { kind: 'outreach', segmentId: 'coworking', channel: 'phone' },
          [b!.id]: { kind: 'outreach', segmentId: 'medical', channel: 'in_person' },
        },
      }),
    )
    const outputs = r.report.entries.filter((e) => e.kind === 'team_output')
    expect(outputs).toHaveLength(2)
    for (const id of ['lead_1', 'lead_2', 'lead_3']) {
      expect(r.state.leads.find((l) => l.id === id)!.stage).not.toBe('demo')
    }
    const found = r.state.leads.filter((l) => l.source === 'team')
    expect(found.every((l) => l.foundBy === a!.id || l.foundBy === b!.id)).toBe(true)
    expect(r.report.entries.some((e) => e.kind === 'new_leads' && e.segmentId === 'medical')).toBe(
      true,
    )
  })

  it('has two developers on one feature build no more than is left', () => {
    let s = rich('devs')
    s = hireOne(s, 'developer')
    s = hireOne(s, 'developer')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan()).state
    const [a, b] = s.team.members
    const task = { kind: 'build' as const, featureId: 'chat_integration' }
    const r = endWeek(s, plan({ teamTasks: { [a!.id]: task, [b!.id]: task } }))
    const f = r.state.product.features.find((x) => x.id === 'chat_integration')!
    expect(f.progressHours).toBe(20)
    expect(f.shippedWeek).not.toBeNull()
  })
})

describe('saves per mode', () => {
  it('records the mode, replays a long run, and refuses the other mode', () => {
    let s = createGame(quietLong(), 'save-long')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan({ interviews: { coworking: 2 } })).state
    const save = toSave(s)
    expect(save.mode).toBe('long')
    expect(replay(quietLong(), save)).toEqual(s)
    expect(saveProblem(loadScenario('kantino'), save)).toBe('mode')
    const standard = toSave(createGame(loadScenario('kantino'), 'std'))
    expect('mode' in standard).toBe(false)
    expect(saveProblem(long(), standard)).toBe('mode')
  })
})
