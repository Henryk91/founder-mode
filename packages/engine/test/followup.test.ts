import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { Rng, seedRng } from '../src/rng'
import { newGame, plan, quietKantino } from './helpers'
import { openLead, withPain } from './helpers2'

const quiet = (seed: string) => withPain(newGame(seed, quietKantino()), 'coworking', 0.7)
const withLeads = (seed: string, leads = [openLead(1, 'coworking')]) => ({
  ...quiet(seed),
  leads,
})

describe('follow up', () => {
  it('costs 1 h per lead and only works on open leads', () => {
    const s = withLeads('fu', [
      openLead(1, 'coworking'),
      openLead(2, 'coworking', { stage: 'trial' }),
      openLead(3, 'coworking', { stage: 'lost' }),
      openLead(4, 'coworking', { stage: 'demo' }),
    ])
    expect(validatePlan(s, plan({ followUps: ['lead_1', 'lead_4'] }))).toEqual([])
    for (const id of ['lead_2', 'lead_3', 'lead_9']) {
      expect(validatePlan(s, plan({ followUps: [id] }))).toEqual([
        { code: 'invalid_follow_up', leadId: id },
      ])
    }
    expect(validatePlan(s, plan({ followUps: ['lead_1', 'lead_1'] }))).toHaveLength(1)
    expect(
      endWeek(s, plan({ followUps: ['lead_1', 'lead_4'], bookkeepingHours: 2 })).report
        .plannedHours,
    ).toBe(4)
    const view = getView(s)
    expect(view.leads.map((l) => l.canFollowUp)).toEqual([true, false, false, true])
    expect(view.costs.followUpHours).toBe(1)
  })

  it('brings a silent lead back and keeps it from going silent again this week', () => {
    for (let i = 0; i < 40; i++) {
      const s = withLeads(`silent${i}`, [openLead(1, 'coworking', { silentSinceWeek: 1 })])
      const r = endWeek(s, plan({ followUps: ['lead_1'], bookkeepingHours: 2 }))
      expect(r.state.leads[0]!.silentSinceWeek).toBeNull()
      expect(r.state.leads[0]!.lastContactWeek).toBe(1)
    }
    // Without it, a silent lead stays silent.
    const idle = endWeek(
      withLeads('idle', [openLead(1, 'coworking', { silentSinceWeek: 1 })]),
      plan({ bookkeepingHours: 2 }),
    )
    expect(idle.state.leads[0]!.silentSinceWeek).toBe(1)
  })

  it('rescues a lead that was about to be lost for silence', () => {
    const s = { ...withLeads('lost', [openLead(1, 'coworking', { silentSinceWeek: 1 })]), week: 5 }
    const r = endWeek(s, plan({ followUps: ['lead_1'] }))
    expect(r.state.leads[0]!.stage === 'lost').toBe(false)
    const without = endWeek(s, plan())
    expect(without.state.leads[0]!.lostReason).toBe('silent')
  })

  it('makes a lead somewhat more likely to ask for a demo', () => {
    const asked = (follow: boolean) => {
      let n = 0
      for (let i = 0; i < 1500; i++) {
        const s = { ...withLeads('x'), rng: seedRng(`demo${i}`) }
        const r = endWeek(s, plan({ followUps: follow ? ['lead_1'] : [] }))
        if (r.state.leads[0]!.stage === 'demo') n++
      }
      return n / 1500
    }
    const base = asked(false)
    const boosted = asked(true)
    const cfg = quiet('c').scenario.sales
    // pain 0.7: 0.18 x (0.4 + 0.42) = 0.148, plus 0.05
    expect(base).toBeCloseTo(
      cfg.leadToDemoBase * (cfg.leadToDemoOffset + cfg.leadToDemoPerPain * 0.7),
      1,
    )
    expect(boosted - base).toBeGreaterThan(0.02)
    expect(boosted - base).toBeLessThan(0.09)
    void Rng
  })
})
