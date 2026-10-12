import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { profitableForMonths } from '../src/systems/finance'
import { freelanceEconomics } from '../src/systems/team'
import type { FreelancePlan, GameState, WeekLedger, WeekPlan } from '../src/types'
import { newGame, plan, quietKantino } from './helpers'

const quiet = (seed = 'freelance') => newGame(seed, quietKantino())

const fl = (overrides: Partial<FreelancePlan>): Partial<WeekPlan> => ({
  freelance: {
    book: null,
    hoursPerWeek: null,
    end: false,
    build: null,
    outreach: null,
    ...overrides,
  },
})

const next = (s: GameState, p: Partial<WeekPlan> = {}) => endWeek(s, plan(p))

/** Books a freelancer in week 1; they work from week 2. */
function booked(role: 'developer' | 'salesperson', hours = 20, seed?: string) {
  return next(quiet(seed), fl({ book: { role, hoursPerWeek: hours } }))
}

describe('freelancer booking', () => {
  it('starts next week, without a search, and shows in the team view', () => {
    const r = booked('developer')
    expect(r.report.plannedHours).toBe(0)
    expect(r.report.entries).toContainEqual({
      kind: 'freelance_booked',
      name: 'Arne Lindgren',
      role: 'developer',
      hoursPerWeek: 20,
      startWeek: 2,
    })
    expect(r.state.ledger.at(-1)!.freelanceCents).toBe(0)
    const view = getView(r.state).team.freelance
    expect(view.canBook).toBe(false)
    expect(view.current).toMatchObject({
      name: 'Arne Lindgren',
      role: 'developer',
      hoursPerWeek: 20,
      centsPerHour: 6800,
      centsPerWeek: 136_000,
      startWeek: 2,
      working: true,
      endWeek: null,
      workHoursThisWeek: 9,
    })
    expect(getView(r.state).company.freelanceCentsPerWeek).toBe(136_000)
  })

  it('bills every booked hour each week from the start, as a company cost', () => {
    const w1 = booked('developer')
    const w2 = next(w1.state)
    const ledger = w2.state.ledger.at(-1)!
    expect(ledger.freelanceCents).toBe(136_000)
    expect(w2.report.entries).toContainEqual({
      kind: 'freelance_bill',
      name: 'Arne Lindgren',
      amountCents: 136_000,
      hours: 20,
    })
    // Cash fell by the bill plus the living costs the company had to cover, if any.
    const before = w1.state.company.cashCents
    expect(before - w2.state.company.cashCents).toBe(136_000 + ledger.founderDrawCents)
  })

  it('works at half output in the first week, then at the output share', () => {
    const w1 = booked('developer')
    const w2 = next(w1.state, fl({ build: 'basic_ordering' }))
    expect(w2.report.entries).toContainEqual({
      kind: 'freelance_output',
      role: 'developer',
      hours: 9,
      onboarding: true,
    })
    const w3 = next(w2.state, fl({ build: 'basic_ordering' }))
    expect(w3.report.entries).toContainEqual({
      kind: 'freelance_output',
      role: 'developer',
      hours: 18,
      onboarding: false,
    })
    const progress = w3.state.product.features.find((f) => f.id === 'basic_ordering')!
    expect(progress.progressHours).toBe(27)
  })

  it('builds only what the founder leaves of a feature', () => {
    const w1 = booked('developer')
    let s = next(w1.state, fl({ build: 'chat_integration' })).state // 9 h
    const r = next(s, { build: { chat_integration: 5 }, ...fl({ build: 'chat_integration' }) })
    s = r.state
    const f = s.product.features.find((x) => x.id === 'chat_integration')!
    expect(f.progressHours).toBe(20)
    expect(f.shippedWeek).toBe(3)
    expect(r.report.entries).toContainEqual({
      kind: 'freelance_output',
      role: 'developer',
      hours: 6,
      onboarding: false,
    })
  })

  it('adds the extra bugs to every feature the freelancer worked on', () => {
    const w1 = booked('developer')
    const s = next(w1.state, fl({ build: 'chat_integration' })).state
    const r = next(s, { build: { chat_integration: 11 } })
    const shipped = r.report.entries.find((e) => e.kind === 'feature_shipped')
    expect(shipped).toMatchObject({ featureId: 'chat_integration', freelanceBugs: 1 })
    // Chat integration ships with 1 to 2 bugs of its own.
    expect(r.state.product.bugs).toBeGreaterThanOrEqual(2)
    expect(r.state.product.bugs).toBeLessThanOrEqual(3)
    expect(r.state.team.freelanceBugs).toBe(1)
  })

  it('does outreach as a salesperson, finds leads of its own source and holds no demos', () => {
    let s = booked('salesperson', 20, 'sales').state
    const outreach = { segmentId: 'coworking', channel: 'in_person' as const }
    for (let i = 0; i < 6; i++) s = next(s, fl({ outreach })).state
    const leads = s.leads.filter((l) => l.source === 'freelancer')
    expect(leads.length).toBeGreaterThan(0)
    expect(leads.every((l) => l.segmentId === 'coworking' && l.channel === 'in_person')).toBe(true)
    expect(s.team.freelancers[0]!.workedHours).toBe(9 + 5 * 18)
    // Nobody but the founder holds demos, and the founder held none.
    expect(s.leads.some((l) => l.stage === 'trial' || l.stage === 'paying')).toBe(false)
  })

  it('ends after one week of notice, billed, and can be booked again after that', () => {
    const w1 = booked('developer')
    const w2 = next(w1.state, fl({ end: true }))
    expect(w2.report.entries).toContainEqual({
      kind: 'freelance_notice',
      name: 'Arne Lindgren',
      lastWeek: 3,
    })
    // In their last week a new booking may start next week, without any overlap.
    expect(getView(w2.state).team.freelance.canBook).toBe(true)
    expect(
      validatePlan(w2.state, plan(fl({ book: { role: 'developer', hoursPerWeek: 10 } }))),
    ).toEqual([])
    expect(validatePlan(w1.state, plan(fl({ end: true, hoursPerWeek: 10 })))).toEqual([])
    expect(validatePlan(w2.state, plan(fl({ end: true })))).toEqual([{ code: 'invalid_freelance' }])
    const w3 = next(w2.state)
    expect(w3.state.ledger.at(-1)!.freelanceCents).toBe(136_000)
    expect(w3.report.entries).toContainEqual({ kind: 'freelance_ended', name: 'Arne Lindgren' })
    const view = getView(w3.state).team.freelance
    expect(view.current).toBeNull()
    expect(view.canBook).toBe(true)
    const w4 = next(w3.state, fl({ book: { role: 'salesperson', hoursPerWeek: 10 } }))
    expect(w4.state.ledger.at(-1)!.freelanceCents).toBe(0)
    expect(getView(w4.state).team.freelance.current).toMatchObject({
      name: 'Bettina Roos',
      role: 'salesperson',
      startWeek: 5,
      workHoursThisWeek: 4,
    })
  })

  it('changes hours from next week, without a new slow week', () => {
    const w1 = booked('developer')
    const w2 = next(w1.state, fl({ hoursPerWeek: 10, build: 'basic_ordering' }))
    expect(w2.state.ledger.at(-1)!.freelanceCents).toBe(136_000)
    expect(w2.report.entries).toContainEqual({
      kind: 'freelance_hours',
      name: 'Arne Lindgren',
      hoursPerWeek: 10,
      fromWeek: 3,
    })
    expect(getView(w2.state).team.freelance.current).toMatchObject({
      hoursPerWeek: 10,
      nextHours: null,
    })
    const w3 = next(w2.state, fl({ build: 'basic_ordering' }))
    expect(w3.state.ledger.at(-1)!.freelanceCents).toBe(68_000)
    expect(w3.report.entries).toContainEqual({
      kind: 'freelance_output',
      role: 'developer',
      hours: 9,
      onboarding: false,
    })
    // A second change later keeps the weeks in between at the first change.
    const w4 = next(w3.state, fl({ hoursPerWeek: 20 }))
    expect(w4.state.ledger.at(-1)!.freelanceCents).toBe(68_000)
    expect(next(w4.state).state.ledger.at(-1)!.freelanceCents).toBe(136_000)
  })

  it('refuses bookings, hours and notice that do not fit', () => {
    const s = quiet()
    const bad = (p: Partial<FreelancePlan>) => validatePlan(s, plan(fl(p)))
    expect(bad({ book: { role: 'developer', hoursPerWeek: 15 } })).toEqual([
      { code: 'invalid_freelance' },
    ])
    expect(bad({ end: true })).toEqual([{ code: 'invalid_freelance' }])
    expect(bad({ hoursPerWeek: 10 })).toEqual([{ code: 'invalid_freelance' }])
    expect(bad({ build: 'nothing' })).toEqual([{ code: 'invalid_freelance' }])
    expect(bad({ book: { role: 'developer', hoursPerWeek: 10 }, end: true })).toEqual([
      { code: 'invalid_freelance' },
    ])
    const w1 = booked('developer').state
    expect(validatePlan(w1, plan(fl({ book: { role: 'salesperson', hoursPerWeek: 10 } })))).toEqual(
      [{ code: 'invalid_freelance' }],
    )
    expect(validatePlan(w1, plan(fl({ hoursPerWeek: 20 })))).toEqual([])
  })

  it('does not count toward the one hire', () => {
    const w1 = booked('developer').state
    expect(getView(w1).team.canSearch).toBe(true)
    expect(validatePlan(w1, plan({ searchRole: 'salesperson' }))).toEqual([])
    expect(w1.milestones.some((m) => m.id === 'first_hire')).toBe(false)
  })
})

describe('freelancer and randomness', () => {
  it('adds no random draws when it has nothing to do: only money differs', () => {
    let a = quiet('draws')
    let b = next(a, fl({ book: { role: 'developer', hoursPerWeek: 10 } })).state
    a = next(a).state
    for (let i = 0; i < 8; i++) {
      const p = { interviews: { small_offices: 2, coworking: 1 } }
      a = next(a, p).state
      b = next(b, p).state
    }
    expect(b.rng).toEqual(a.rng)
    expect(b.knowledge).toEqual(a.knowledge)
    expect(a.company.cashCents - b.company.cashCents).toBe(8 * 68_000)
  })
})

describe('freelancer money', () => {
  it('counts the bill in the win test', () => {
    const month = (from: number, freelanceCents: number): WeekLedger[] =>
      [0, 1, 2, 3].map((i) => ({
        ...next(quiet()).state.ledger[0]!,
        week: from + i,
        revenueCents: 120_000,
        fixedCostsCents: i === 3 ? 40_500 : 0,
        freelanceCents,
        livingCostsCents: 67_500,
      }))
    const base = next(quiet()).state
    const ledger = [...month(1, 0), ...month(5, 0)]
    expect(profitableForMonths({ ...base, ledger }, 2)).toBe(true)
    const billed = [...month(1, 0), ...month(5, 68_000)]
    expect(profitableForMonths({ ...base, ledger: billed }, 2)).toBe(false)
  })

  it('reports cost and work in the post-mortem economics', () => {
    let s = booked('developer').state
    s = next(s, fl({ build: 'basic_ordering' })).state
    s = next(s, fl({ build: 'basic_ordering', end: true })).state
    s = next(s, fl({ build: 'basic_ordering' })).state
    expect(freelanceEconomics(s)).toEqual({
      roles: ['developer'],
      costCents: 3 * 136_000,
      weeks: 3,
      buildHours: 9 + 18 + 13,
      outreachHours: 0,
      leadsFound: 0,
      customersGained: 0,
      extraBugs: 1,
    })
  })
})
