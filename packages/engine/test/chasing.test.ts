import { describe, expect, it } from 'vitest'
import { endWeek, validatePlan } from '../src/index'
import { teamOutput } from '../src/systems/team'
import type { FreelancePlan, GameState, Invoice, TeamRoleId, WeekPlan } from '../src/types'
import { newGame, plan, quietKantino } from './helpers'

const quiet = (seed = 'chasing') => newGame(seed, quietKantino())

const fl = (overrides: Partial<FreelancePlan>): FreelancePlan => ({
  book: null,
  hoursPerWeek: null,
  end: false,
  build: null,
  outreach: null,
  ...overrides,
})

/** Hires the best candidate for `role` and plays until they work (week 6). */
function withMember(role: TeamRoleId, seed = 'chasing'): GameState {
  let s = endWeek(quiet(seed), plan({ searchRole: role })).state
  s = endWeek(endWeek(s, plan()).state, plan()).state
  const best = [...s.team.candidates].sort(
    (a, b) => s.hidden.teamSkills[b.id]! - s.hidden.teamSkills[a.id]!,
  )[0]!
  s = endWeek(s, plan({ hire: best.id })).state
  while (s.week < s.team.members[0]!.startWeek) s = endWeek(s, plan()).state
  return s
}

/** `n` overdue invoices that wait to be chased, the oldest first. */
function overdue(s: GameState, n: number): GameState {
  const invoices: Invoice[] = Array.from({ length: n }, (_, i) => ({
    id: `invoice_${i + 1}`,
    customerId: `customer_${i + 1}`,
    customerName: `Customer ${i + 1}`,
    segmentId: 'small_offices',
    amountCents: 45_000,
    issuedWeek: 1,
    dueWeek: s.week - 1,
    paidWeek: null,
    writtenOffWeek: null,
  }))
  return {
    ...s,
    invoices,
    hidden: {
      ...s.hidden,
      payWeeks: Object.fromEntries(invoices.map((i) => [i.id, null])),
      waitsForChase: invoices.map((i) => i.id),
    },
  }
}

const tasks = (s: GameState, task: WeekPlan['teamTasks'][string]): Partial<WeekPlan> => ({
  teamTasks: { [s.team.members[0]!.id]: task },
})

describe('chasing and admin by the team', () => {
  it('chases what the founder leaves, oldest first, one hour each, then sells', () => {
    const s = overdue(withMember('salesperson'), 5)
    const p = plan({
      chase: ['invoice_1'],
      ...tasks(s, { kind: 'outreach', segmentId: 'small_offices', channel: 'phone', admin: true }),
    })
    expect(validatePlan(s, p)).toEqual([])
    const [out] = teamOutput(s, p)
    expect(out!.chases).toEqual(['invoice_2', 'invoice_3', 'invoice_4', 'invoice_5'])
    expect(out!.outreach!.hours).toBe(out!.hours - 4 * s.scenario.finance.chaseHours)
    const r = endWeek(s, p)
    expect(r.report.entries).toContainEqual({ kind: 'team_chased', count: 4 })
    // Founder hours are only the founder's own chase.
    expect(r.report.plannedHours).toBe(s.scenario.finance.chaseHours)
  })

  it('lets a developer do only chasing and admin', () => {
    const s = overdue(withMember('developer'), 3)
    const p = plan(tasks(s, { kind: 'admin' }))
    expect(validatePlan(s, p)).toEqual([])
    const [out] = teamOutput(s, p)
    expect(out!.chases).toEqual(['invoice_1', 'invoice_2', 'invoice_3'])
    expect(out!.build).toEqual({})
  })

  it('gets chased invoices paid as often as the founder does', () => {
    let paidByTeam = 0
    let paidByFounder = 0
    for (let i = 0; i < 40; i++) {
      const s = overdue(withMember('salesperson', `odds${i}`), 6)
      const team = endWeek(endWeek(s, plan(tasks(s, { kind: 'admin' }))).state, plan()).state
      const ids = s.invoices.map((x) => x.id)
      const founder = endWeek(endWeek(s, plan({ chase: ids })).state, plan()).state
      paidByTeam += team.invoices.filter((x) => x.paidWeek !== null).length
      paidByFounder += founder.invoices.filter((x) => x.paidWeek !== null).length
    }
    // Same rolls in the same order: the founder's list first, then the team's.
    expect(paidByTeam).toBe(paidByFounder)
    expect(paidByTeam).toBeGreaterThan(0)
  })

  it('draws nothing extra when nobody is on chasing and admin', () => {
    const s = overdue(withMember('salesperson'), 4)
    const a = endWeek(
      s,
      plan(tasks(s, { kind: 'outreach', segmentId: 'small_offices', channel: 'phone' })),
    )
    expect(a.report.entries.some((e) => e.kind === 'team_chased')).toBe(false)
    expect(teamOutput(s, plan()).every((o) => o.chases.length === 0)).toBe(true)
  })

  it('lets the freelancer chase what the founder and the team leave, then work', () => {
    let s = endWeek(
      quiet(),
      plan({ freelance: fl({ book: { role: 'salesperson', hoursPerWeek: 20 } }) }),
    ).state
    s = endWeek(s, plan()).state
    s = overdue(s, 3)
    const p = plan({
      chase: ['invoice_1'],
      freelance: fl({ admin: true, outreach: { segmentId: 'small_offices', channel: 'phone' } }),
    })
    expect(validatePlan(s, p)).toEqual([])
    const r = endWeek(s, p)
    expect(r.report.entries).toContainEqual({ kind: 'team_chased', count: 2 })
    const out = r.report.entries.find((e) => e.kind === 'freelance_output')
    // 20 h booked, 0.9 of them work: 18 h, two of them chasing.
    expect(out).toEqual({
      kind: 'freelance_output',
      role: 'salesperson',
      hours: 18,
      onboarding: false,
    })
  })
})
