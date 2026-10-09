import { describe, expect, it } from 'vitest'
import { endWeek } from '../src/index'
import { informedPlan, newGame, richKantino } from './helpers'

describe('the scenario inbox over a whole run', () => {
  it('never brings the same event twice in 60 weeks, except events that recur on purpose', () => {
    const scenario = richKantino()
    const recurring = new Set(scenario.events.filter((e) => !e.once).map((e) => e.id))
    for (let run = 0; run < 12; run++) {
      let s = newGame(`no-repeat-${run}`, scenario)
      while (s.status === 'running') s = endWeek(s, informedPlan(s)).state
      expect(s.week).toBeGreaterThanOrEqual(scenario.maxWeeks)
      const ids = s.drawnEvents.map((d) => d.eventId).filter((id) => !recurring.has(id))
      expect(ids.length).toBeGreaterThan(30)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
