import { describe, expect, it } from 'vitest'
import { buildPostMortem, endWeek, getView, type GameState } from '../src/index'
import { checkMilestones } from '../src/systems/milestones'
import { customer } from './helpers2'
import { newGame, play, plan, quietKantino, richKantino } from './helpers'

const reached = (s: GameState) => s.milestones.map((m) => m.id)

describe('milestones', () => {
  it('starts with none and shows the first one on the bar', () => {
    const view = getView(newGame())
    expect(view.milestones.reached).toEqual([])
    expect(view.milestones.next).toMatchObject({
      id: 'first_interview',
      unit: 'count',
      current: 0,
      target: 1,
    })
  })

  it('reaches the first interview once, reports it in that week, and moves the bar on', () => {
    const s0 = newGame('ms-interview', quietKantino())
    const first = endWeek(s0, plan({ interviews: { coworking: 2 } }))
    expect(first.report.milestones.map((m) => m.id)).toEqual(['first_interview'])
    expect(first.report.milestones[0]).toMatchObject({ name: 'First interview', week: 1 })
    const second = endWeek(first.state, plan({ interviews: { coworking: 2 } }))
    expect(second.report.milestones).toEqual([])
    expect(reached(second.state)).toEqual(['first_interview'])
    expect(getView(second.state).milestones.next?.id).toBe('first_deposit')
  })

  it("measures revenue milestones against the run's own monthly costs, from the scenario", () => {
    const s0 = newGame('ms-revenue', quietKantino())
    const s = {
      ...s0,
      milestones: [
        { id: 'first_interview', week: 1 },
        { id: 'first_deposit', week: 1 },
        { id: 'first_customer', week: 1 },
      ],
      customers: [customer('c1', 'coworking', 1)],
    }
    const next = getView(s).milestones.next!
    expect(next.id).toBe('covers_company_costs')
    expect(next.unit).toBe('cents')
    const fixed = s.company.fixedCosts.reduce((t, c) => t + c.monthlyCents, 0)
    expect(next.target).toBe(fixed)
    expect(next.current).toBe(Math.min(s.customers[0]!.priceCentsPerMonth, fixed))
  })

  it('counts survived weeks only when the week is over and did not end the run', () => {
    const rich = play(newGame('ms-weeks', richKantino()), 26, () => plan())
    expect(reached(rich)).toContain('weeks_26')
    expect(rich.milestones.find((m) => m.id === 'weeks_26')?.week).toBe(26)
    // A run that ends in week 26 has not survived it; one still going or that reached its end has.
    const at26 = play(newGame('ms-broke', richKantino()), 25, () => plan())
    const s26 = { ...at26, week: 26 }
    expect(checkMilestones({ ...s26, status: 'ended', ending: 'bankrupt' }).reached).toEqual([])
    expect(checkMilestones(s26).reached.map((m) => m.id)).toEqual(['weeks_26'])
  })

  it('keeps hires off the bar but still records them, and lists milestones in the post-mortem', () => {
    const s = play(newGame('ms-pm', quietKantino()), 80, (st) =>
      plan({ interviews: st.week === 1 ? { medical: 1 } : {} }),
    )
    const pm = buildPostMortem(s)
    expect(pm.milestones.map((m) => m.id)).toEqual(reached(s))
    expect(pm.milestones[0]).toMatchObject({ id: 'first_interview', name: 'First interview' })
    const bar = s.scenario.milestones.filter((m) => m.onBar).map((m) => m.id)
    expect(bar).not.toContain('first_hire')
  })
})
