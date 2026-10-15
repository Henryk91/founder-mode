import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import {
  buildPostMortem,
  createGame,
  endWeek,
  getView,
  replay,
  respond,
  toSave,
  validatePlan,
} from '../src/index'
import type { GameState, TeamMember } from '../src/types'
import { deepFreeze, plan } from './helpers'

// Plan 3 (docs/office-stages.md): office stages 3 to 5 in long mode.
let parsed: Scenario | null = null
const long = (): Scenario => (parsed ??= deepFreeze(loadScenario('kantino', 'long')))
/** No drawn messages: only the office offers arrive (they are triggered, outside the draw). */
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

/** A rich long Kantino run with `n` people hired (no salaries: only desks matter here). */
function withTeam(seed: string, n: number): GameState {
  const s = createGame(quiet(), seed)
  return {
    ...s,
    company: { ...s.company, cashCents: 50_000_000 },
    team: { ...s.team, members: Array.from({ length: n }, (_, i) => member(`m${i + 1}`)) },
  }
}

const next = (s: GameState, p = plan()) => endWeek(s, p)
const offer = (s: GameState, eventId: string) =>
  s.inbox.find((m) => m.eventId === eventId && m.status === 'open')

describe('office stages: offers', () => {
  it('offers the courtyard office once someone works for you, never in the 60 week game', () => {
    const solo = next(createGame(quiet(), 'solo')).state
    expect(offer(solo, 'office_courtyard_offer')).toBeUndefined()
    const s = next(withTeam('team', 1)).state
    const m = offer(s, 'office_courtyard_offer')!
    expect(m).toBeDefined()
    // The card shows the one-off and the rent the move adds.
    const card = getView(s).inbox.find((x) => x.id === m.id)!
    const move = card.choices.find((c) => c.id === 'move')!
    expect(move.costCents).toBe(600_000)
    expect(move.monthlyCostCents).toBe(150_000)
    expect(card.text).toContain('6,000 EUR')
    expect(card.text).toContain('1,500 EUR a month')
    expect(loadScenario('kantino').events.some((e) => e.id === 'office_courtyard_offer')).toBe(
      false,
    )
  })

  it('comes back after twelve weeks when declined and the condition still holds', () => {
    let s = next(withTeam('again', 1)).state
    const first = offer(s, 'office_courtyard_offer')!
    for (let w = 0; w < 6; w++) s = next(s).state
    expect(s.inbox.find((m) => m.id === first.id)!.status).toBe('expired')
    expect(offer(s, 'office_courtyard_offer')).toBeUndefined()
    for (let w = 0; w < 6; w++) s = next(s).state
    expect(offer(s, 'office_courtyard_offer')).toBeDefined()
  })
})

describe('office stages: moving, desks and notice', () => {
  function moved(seed: string) {
    let s = next(withTeam(seed, 1)).state
    s = respond(s, offer(s, 'office_courtyard_offer')!.id, 'move')
    return s
  }

  it('pays the one-off, moves the rent now and the effects after the move', () => {
    const before = moved('move')
    const r = next(before)
    expect(r.report.entries).toContainEqual(
      expect.objectContaining({
        kind: 'office_accepted',
        costCents: 600_000,
        monthlyCents: 150_000,
      }),
    )
    expect(r.state.ledger.at(-1)!.otherCostsCents).toBeGreaterThanOrEqual(600_000)
    expect(r.state.company.fixedCosts.find((c) => c.id === 'office')?.monthlyCents).toBe(150_000)
    // Still at the old stage while moving, and the move takes 4 h of next week.
    expect(r.state.company.officeStage).toBe('kitchen_table')
    expect(r.state.founder.forcedHours).toBe(4)
    expect(getView(r.state).office.move).toEqual({
      name: 'Small office in a back courtyard',
      readyWeek: before.week + 2,
    })
    let s = r.state
    let movedIn = false
    for (let w = 0; w < 3 && !movedIn; w++) {
      const x = next(s)
      movedIn = x.report.entries.some((e) => e.kind === 'office_moved')
      s = x.state
    }
    expect(movedIn).toBe(true)
    expect(s.company.officeStage).toBe('courtyard_office')
    const view = getView(s).office
    expect(view).toMatchObject({ stage: 3, stages: 5, desks: 4, people: 2, desksFree: 2 })
    expect(s.modifiers.find((m) => m.source === 'office')?.energyPerWeek).toBe(1)
  })

  it('blocks a hire when every desk is used', () => {
    const s = withTeam('desks', 1)
    expect(getView(s).office.desksFree).toBe(0)
    expect(validatePlan(s, plan({ searchRole: 'developer' }))).toContainEqual({
      code: 'search_not_allowed',
    })
    expect(getView(s).team.canSearch).toBe(false)
  })

  it('gives notice: rent until it runs out, the deposit back, one stage down', () => {
    let s = moved('notice')
    for (let w = 0; w < 4; w++) s = next(s).state
    expect(s.company.officeStage).toBe('courtyard_office')
    expect(getView(s).office.canGiveNotice).toBe(true)
    const given = next(s, plan({ office: { notice: true } }))
    expect(given.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'office_notice', endWeek: s.week + 13 }),
    )
    s = given.state
    expect(validatePlan(s, plan({ office: { notice: true } }))).toContainEqual({
      code: 'invalid_office',
    })
    let left = null
    for (let w = 0; w < 14 && !left; w++) {
      const x = next(s)
      left = x.report.entries.find((e) => e.kind === 'office_left') ?? null
      s = x.state
    }
    expect(left).toMatchObject({ backTo: 'Coworking desk', depositCents: 450_000 })
    expect(s.company.officeStage).toBe('coworking_desk')
    expect(s.company.fixedCosts.find((c) => c.id === 'office')?.monthlyCents).toBe(37_500)
    const pm = buildPostMortem({ ...s, status: 'ended', ending: 'shut_down' })
    expect(pm.office).toHaveLength(1)
    expect(pm.office[0]).toMatchObject({
      place: 'Small office in a back courtyard',
      stage: 3,
      oneOffCents: 600_000,
      depositBackCents: 450_000,
      teamBefore: 1,
    })
    expect(pm.office[0]!.totalCents).toBe(
      pm.office[0]!.oneOffCents + pm.office[0]!.rentCents - 450_000,
    )
  })

  it('replays a run with a move the same way', () => {
    // The offer on a simple trigger, so the whole run is in the action log.
    const base = quiet()
    const scenario: Scenario = {
      ...base,
      events: base.events.map((e) =>
        e.id === 'office_courtyard_offer'
          ? { ...e, trigger: [{ path: 'week', op: '>=', value: 2 }] }
          : e,
      ),
    }
    let s = createGame(scenario, 'replay')
    s = next(next(s).state).state
    s = respond(s, offer(s, 'office_courtyard_offer')!.id, 'move')
    for (let w = 0; w < 5; w++) s = next(s).state
    expect(s.company.officeStage).toBe('courtyard_office')
    const again = replay(scenario, toSave(s))
    expect(again.company).toEqual(s.company)
    expect(again.rng).toEqual(s.rng)
  })
})

describe('office stages: the 60 week game', () => {
  it('has no desks, no offers and no notice', () => {
    const s = createGame(loadScenario('kantino'), 'std')
    const v = getView(s).office
    expect(v.desks).toBeNull()
    expect(v.canGiveNotice).toBe(false)
    expect(v.noticeWeeks).toBeNull()
  })
})
