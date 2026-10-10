import { describe, expect, it } from 'vitest'
import { endWeek, getView, respond, type GameState } from '../src/index'
import { applyFounderWeek } from '../src/systems/founder'
import { channelFactor, energyPerWeek, moveOffice } from '../src/systems/office'
import { customer } from './helpers2'
import { kantino, newGame, play, plan, quietKantino } from './helpers'

const deskOffers = (s: GameState) => s.inbox.filter((m) => m.eventId === 'coworking_desk')

/** Quiet Kantino, but the coworking desk offer still arrives: only the random draw is off. */
const quiet = () => quietKantino()

describe('office stages', () => {
  it('starts at the kitchen table with no rent and no lasting effects', () => {
    const s = newGame()
    expect(s.company.officeStage).toBe('kitchen_table')
    expect(s.modifiers).toEqual([])
    expect(s.company.fixedCosts.some((c) => c.id === 'office')).toBe(false)
    expect(getView(s).company.officeStage).toEqual({ id: 'kitchen_table', name: 'Kitchen table' })
  })

  it('offers the coworking desk for sure, once, for week 8', () => {
    const s = play(newGame('desk-week', quiet()), 7, () => plan())
    expect(s.week).toBe(8)
    expect(deskOffers(s)).toHaveLength(1)
    expect(deskOffers(s)[0]!.week).toBe(8)
    const later = play(s, 6, () => plan())
    expect(deskOffers(later)).toHaveLength(1)
  })

  it('offers it earlier once the first customer has signed', () => {
    const s0 = newGame('desk-customer', quiet())
    const s = { ...s0, week: 3, customers: [customer('c1', 'coworking', 2)] }
    const next = endWeek(s, plan()).state
    expect(deskOffers(next)).toHaveLength(1)
    expect(deskOffers(next)[0]!.week).toBe(4)
  })

  it('shows the rent the move adds on the choice, and none for staying', () => {
    const s = play(newGame('desk-cost', quiet()), 7, () => plan())
    const offer = getView(s).inbox.find((m) => m.eventId === 'coworking_desk')!
    const move = offer.choices.find((c) => c.id === 'move')!
    const stay = offer.choices.find((c) => c.id === 'stay')!
    expect(move.monthlyCostCents).toBe(37_500)
    expect(stay.monthlyCostCents).toBe(0)
  })

  it('moves on accepting: rent and walk-in leads from the scenario, nothing else', () => {
    const s = play(newGame('desk-move', quiet()), 7, () => plan())
    const offer = deskOffers(s)[0]!
    const moved = endWeek(respond(s, offer.id, 'move'), plan()).state
    expect(moved.company.officeStage).toBe('coworking_desk')
    expect(moved.company.fixedCosts.find((c) => c.id === 'office')).toMatchObject({
      name: 'Coworking desk',
      monthlyCents: 37_500,
    })
    expect(moved.modifiers).toEqual([
      {
        id: 'coworking_desk',
        source: 'office',
        energyPerWeek: 0,
        channelFactors: {},
        walkIns: { segmentId: 'coworking', leadsPerWeek: 0.9 },
      },
    ])
    expect(energyPerWeek(moved)).toBe(0)
    expect(channelFactor(moved, 'in_person')).toBe(1)
    expect(getView(moved).company.officeStage.name).toBe('Coworking desk')
  })

  it('keeps the kitchen table when the offer is declined or left to expire', () => {
    const s = play(newGame('desk-stay', quiet()), 7, () => plan())
    const stayed = play(s, 4, () => plan())
    expect(stayed.company.officeStage).toBe('kitchen_table')
    expect(stayed.modifiers).toEqual([])
    expect(stayed.company.fixedCosts.some((c) => c.id === 'office')).toBe(false)
  })

  it('adds the energy of lasting modifiers every week, overtime or not', () => {
    const founder = newGame().founder
    const scenario = kantino()
    const base = applyFounderWeek({ ...founder, energy: 50 }, scenario, 60, 0)
    const desk = applyFounderWeek({ ...founder, energy: 50 }, scenario, 60, 0, 1)
    expect(desk.energy - base.energy).toBe(1)
  })

  it('brings walk-in leads from its market, recorded with their source and office', () => {
    const desk = moveOffice(newGame('walk-ins', quiet()), 'coworking_desk')
    const after = play(desk, 20, () => plan())
    const walkIns = after.leads.filter((l) => l.source === 'walk_in')
    // 0.9 a week: the whole part (0) plus one with chance 0.9, over 20 weeks.
    expect(walkIns.length).toBeGreaterThanOrEqual(12)
    expect(walkIns.length).toBeLessThanOrEqual(20)
    expect(
      walkIns.every((l) => l.segmentId === 'coworking' && l.walkInFrom === 'coworking_desk'),
    ).toBe(true)
    const odds = after.eventLog.filter((e) => e.kind === 'odds' && e.odds === 'walk_ins')
    expect(odds.reduce((t, e) => t + (e.kind === 'odds' ? e.observed : 0), 0)).toBe(walkIns.length)
    const lead = getView(after).leads.find((l) => l.source === 'walk_in')!
    expect(lead.walkInFrom).toBe('Coworking desk')
  })

  it('names the walk-ins in the week they arrive', () => {
    let s = moveOffice(newGame('walk-in-report', quiet()), 'coworking_desk')
    let entry
    for (let i = 0; i < 10 && !entry; i++) {
      const out = endWeek(s, plan())
      entry = out.report.entries.find((e) => e.kind === 'walk_in_leads')
      s = out.state
    }
    expect(entry).toMatchObject({
      kind: 'walk_in_leads',
      segmentId: 'coworking',
      place: 'Coworking desk',
    })
  })

  it('draws nothing for walk-ins without an office that brings them', () => {
    const a = play(newGame('no-walk-ins', quiet()), 10, () => plan())
    expect(a.leads.some((l) => l.source === 'walk_in')).toBe(false)
    expect(a.eventLog.some((e) => e.kind === 'odds' && e.odds === 'walk_ins')).toBe(false)
  })
})

describe('organised stage', () => {
  it('turns organised once revenue covers all costs, once, and says so in that week', () => {
    const s0 = newGame('organise', quiet())
    const fixed = s0.company.fixedCosts.reduce((t, c) => t + c.monthlyCents, 0)
    const living = s0.founder.livingCostCentsPerWeek * s0.scenario.finance.weeksPerMonth
    const paying = (total: number) => ({
      ...s0,
      customers: [
        { ...customer('c1', 'coworking', 1), priceCentsPerMonth: Math.ceil(total / 2) },
        { ...customer('c2', 'coworking', 1), priceCentsPerMonth: Math.ceil(total / 2) },
      ],
    })
    // Company costs alone are not enough any more.
    const companyOnly = endWeek(paying(fixed), plan())
    expect(companyOnly.report.milestones.map((m) => m.id)).toContain('covers_company_costs')
    expect(companyOnly.state.company.uiStage).toBe('scrappy')
    expect(companyOnly.report.uiStageChanged).toBe(false)

    const first = endWeek(paying(fixed + living), plan())
    expect(first.state.company.uiStage).toBe('organised')
    expect(first.report.uiStageChanged).toBe(true)
    expect(first.report.milestones.map((m) => m.id)).toContain('covers_all_costs')
    const second = endWeek(first.state, plan())
    expect(second.report.uiStageChanged).toBe(false)
    expect(second.state.company.uiStage).toBe('organised')
  })

  it('turns organised when the first hire starts, before revenue covers anything', () => {
    const s0 = newGame('organise-hire', quiet())
    const member = {
      id: 'm1',
      name: 'Aylin Demir',
      role: 'developer' as const,
      offerWeek: 1,
      startWeek: 1,
      letGoWeek: null,
    }
    const out = endWeek({ ...s0, team: { ...s0.team, members: [member] } }, plan())
    expect(out.report.milestones.map((m) => m.id)).toContain('first_hire')
    expect(out.state.company.uiStage).toBe('organised')
  })

  it('stays scrappy while no organising milestone is reached', () => {
    const s = play(newGame('scrappy', quiet()), 10, () => plan({ interviews: { medical: 1 } }))
    expect(s.company.uiStage).toBe('scrappy')
  })

  it('counts demos held and the trials they became in the view', () => {
    const s = newGame('funnel')
    const withLog: GameState = {
      ...s,
      eventLog: [
        {
          kind: 'odds',
          odds: 'demo',
          week: 3,
          segmentId: 'coworking',
          eventId: null,
          tries: 4,
          expected: 1.2,
          observed: 2,
          unitCents: 0,
        },
        {
          kind: 'odds',
          odds: 'demo',
          week: 4,
          segmentId: 'medical',
          eventId: null,
          tries: 1,
          expected: 0.3,
          observed: 0,
          unitCents: 0,
        },
      ],
    }
    expect(getView(withLog).funnel).toEqual({ demosHeld: 5, trialsFromDemos: 2 })
  })
})
