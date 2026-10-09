import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import type { GameState, TeamRoleId } from '../src/types'
import { newGame, plan, quietKantino } from './helpers'
import { openLead } from './helpers2'

const quiet = (seed = 'team') => newGame(seed, quietKantino())
const book = {}

/** Searches for `role`, waits for the candidates and hires the one with the best true skill. */
function hired(seed: string, role: TeamRoleId, pick: 'best' | 'worst' = 'best'): GameState {
  let s = endWeek(quiet(seed), plan({ searchRole: role, ...book })).state
  s = endWeek(s, plan(book)).state
  s = endWeek(s, plan(book)).state
  const sorted = [...s.team.candidates].sort(
    (a, b) => s.hidden.teamSkills[a.id]! - s.hidden.teamSkills[b.id]!,
  )
  const choice = pick === 'best' ? sorted.at(-1)! : sorted[0]!
  return endWeek(s, plan({ hire: choice.id, ...book })).state
}

describe('team search', () => {
  it('costs 6 h and produces 3 candidates after 2 weeks', () => {
    const s = quiet()
    const r = endWeek(s, plan({ searchRole: 'developer', ...book }))
    expect(r.report.plannedHours).toBe(6)
    expect(getView(r.state).team.search).toEqual({ role: 'developer', readyWeek: 3 })
    expect(getView(r.state).team.candidates).toEqual([])
    expect(getView(r.state).team.canSearch).toBe(false)
    const w2 = endWeek(r.state, plan(book))
    expect(getView(w2.state).team.candidates).toEqual([])
    const w3 = endWeek(w2.state, plan(book))
    const view = getView(w3.state).team
    expect(view.candidates).toHaveLength(3)
    expect(w3.report.entries).toContainEqual({
      kind: 'candidates_ready',
      role: 'developer',
      count: 3,
    })
    expect(view.search).toBeNull()
    for (const c of view.candidates) {
      expect(['Weak', 'Solid', 'Strong', 'Outstanding']).toContain(c.impression)
      expect(c.role).toBe('developer')
    }
    expect(new Set(view.candidates.map((c) => c.name)).size).toBe(3)
  })

  it('shows a noisy impression that follows the true skill on average', () => {
    const order = ['Weak', 'Solid', 'Strong', 'Outstanding']
    let corr = 0
    let n = 0
    for (let i = 0; i < 80; i++) {
      let s = endWeek(quiet(`imp${i}`), plan({ searchRole: 'salesperson', ...book })).state
      s = endWeek(endWeek(s, plan(book)).state, plan(book)).state
      for (const c of getView(s).team.candidates) {
        const skill = s.hidden.teamSkills[s.team.candidates.find((x) => x.name === c.name)!.id]!
        corr += (order.indexOf(c.impression) - 1.5) * (skill - 0.85)
        n++
      }
    }
    expect(corr / n).toBeGreaterThan(0.05)
  })

  it('never shows the true skill', () => {
    let s = endWeek(quiet(), plan({ searchRole: 'developer', ...book })).state
    s = endWeek(endWeek(s, plan(book)).state, plan(book)).state
    const json = JSON.stringify(getView(s))
    for (const c of s.team.candidates) expect(json).not.toContain(String(s.hidden.teamSkills[c.id]))
    expect(json).not.toContain('teamSkills')
  })

  it('allows one search at a time and no search after a hire', () => {
    const searching = endWeek(quiet(), plan({ searchRole: 'developer', ...book })).state
    expect(validatePlan(searching, plan({ searchRole: 'salesperson' }))).toEqual([
      { code: 'search_not_allowed' },
    ])
    expect(validatePlan(hired('once', 'developer'), plan({ searchRole: 'developer' }))).toEqual([
      { code: 'search_not_allowed' },
    ])
  })
})

describe('a hire', () => {
  it('starts 4 weeks after the offer, and the salary is a fixed cost from then on', () => {
    let s = hired('start', 'developer')
    expect(s.week).toBe(5)
    expect(getView(s).team.member).toMatchObject({
      roleName: 'Developer',
      startWeek: 8,
      working: false,
    })
    expect(s.company.fixedCosts).toHaveLength(2)
    for (let i = 0; i < 2; i++) s = endWeek(s, plan(book)).state
    expect(s.week).toBe(7)
    expect(s.company.fixedCosts).toHaveLength(2)
    s = endWeek(s, plan(book)).state
    const start = endWeek(s, plan(book))
    expect(start.state.company.fixedCosts).toHaveLength(3)
    expect(start.state.company.fixedCosts.at(-1)!.monthlyCents).toBe(420_000)
    expect(start.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'hire_started', role: 'developer' }),
    )
    expect(getView(start.state).company.monthlyFixedCostsCents).toBe(27_000 + 420_000)
    expect(hasOne(start.state)).toBe(true)
  })

  it('has a developer build 30 h x true skill on the chosen feature', () => {
    let s = hired('dev', 'developer')
    const skill = s.hidden.teamSkills[s.team.members[0]!.id]!
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(book)).state
    expect(s.week).toBe(8)
    const r = endWeek(s, plan({ teamBuild: 'basic_ordering', ...book }))
    const built = Math.floor(30 * skill)
    expect(r.report.entries).toContainEqual({
      kind: 'team_output',
      role: 'developer',
      hours: built,
    })
    const f = r.state.product.features.find((x) => x.id === 'basic_ordering')!
    expect(f.progressHours).toBe(built)
    // Without a feature to work on the hours are lost.
    expect(
      endWeek(r.state, plan(book)).state.product.features.find((x) => x.id === 'basic_ordering')!
        .progressHours,
    ).toBe(built)
  })

  it('never builds more than is left of a feature, and stops once it has shipped', () => {
    let s = hired('dev2', 'developer')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(book)).state
    const def = s.scenario.features.find((f) => f.id === 'basic_ordering')!
    let guard = 0
    while (
      !s.product.features.find((f) => f.id === 'basic_ordering')!.shippedWeek &&
      guard++ < 10
    ) {
      s = endWeek(s, plan({ teamBuild: 'basic_ordering', ...book })).state
    }
    const f = s.product.features.find((x) => x.id === 'basic_ordering')!
    expect(f.progressHours).toBe(def.buildHours)
    expect(f.shippedWeek).not.toBeNull()
  })

  it('has a salesperson hold demos first and then do outreach', () => {
    let s = hired('sales', 'salesperson')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(book)).state
    const skill = s.hidden.teamSkills[s.team.members[0]!.id]!
    const capacity = Math.floor(25 * skill)
    s = {
      ...s,
      leads: [openLead(1, 'medical', { stage: 'demo' }), openLead(2, 'medical', { stage: 'demo' })],
    }
    const r = endWeek(
      s,
      plan({ teamOutreach: { segmentId: 'coworking', channel: 'phone' }, ...book }),
    )
    // Both demos were held, so neither lead is waiting for one any more.
    for (const id of ['lead_1', 'lead_2']) {
      const lead = r.state.leads.find((l) => l.id === id)!
      expect(lead.stage === 'demo').toBe(false)
      expect(lead.lastContactWeek).toBe(8)
    }
    // The founder's demo skill is not trained by the salesperson's demos.
    expect(r.state.founder.skills.selling).toBe(s.founder.skills.selling)
    const outreach = r.report.entries.find(
      (e) => e.kind === 'new_leads' && e.segmentId === 'coworking',
    )
    expect(outreach).toBeDefined()
    expect(capacity).toBeGreaterThan(2 * 3)
    // The founder's own hours stay free.
    expect(r.report.plannedHours).toBe(0)
  })

  it('costs one month of salary to let go, and only one hire is ever allowed', () => {
    let s = hired('letgo', 'developer')
    for (let i = 0; i < 3; i++) s = endWeek(s, plan(book)).state
    const before = s.company.cashCents
    const r = endWeek(s, plan({ letGo: true, ...book }))
    expect(r.report.entries).toContainEqual({
      kind: 'member_let_go',
      name: s.team.members[0]!.name,
      costCents: 420_000,
    })
    expect(r.report.ledger.otherCostsCents).toBe(420_000)
    expect(r.state.company.cashCents).toBe(
      before - 420_000 - r.report.ledger.fixedCostsCents - r.report.ledger.founderDrawCents,
    )
    expect(r.state.company.fixedCosts).toHaveLength(2)
    expect(getView(r.state).team.member).toBeNull()
    expect(getView(r.state).team.hadHire).toBe(true)
    expect(getView(r.state).team.canSearch).toBe(false)
    expect(validatePlan(r.state, plan({ letGo: true }))).toEqual([{ code: 'let_go_not_allowed' }])
  })

  it('can be let go before the start, without a salary ever being paid', () => {
    const s = hired('early', 'developer')
    const r = endWeek(s, plan({ letGo: true, ...book }))
    expect(r.state.company.fixedCosts).toHaveLength(2)
    let t = r.state
    for (let i = 0; i < 5; i++) t = endWeek(t, plan(book)).state
    expect(t.company.fixedCosts).toHaveLength(2)
  })

  it('rejects an offer to someone who is not a candidate', () => {
    const s = quiet()
    expect(validatePlan(s, plan({ hire: 'candidate_9_9' }))).toEqual([
      { code: 'invalid_hire', candidateId: 'candidate_9_9' },
    ])
    expect(validatePlan(s, plan({ teamBuild: 'nonsense' }))).toEqual([
      { code: 'invalid_team_work' },
    ])
  })
})

const hasOne = (s: GameState) => getView(s).team.member?.working === true
