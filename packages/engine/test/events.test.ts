import { describe, expect, it } from 'vitest'
import { endWeek, getView, type GameState } from '../src/index'
import { emptyPlan } from '../src/index'
import { informedPlan, newGame, richKantino } from './helpers'

function playUntilMessage(start: GameState): GameState {
  let s = start
  for (let i = 0; i < 6 && s.inbox.length === 0; i++) s = endWeek(s, emptyPlan()).state
  return s
}

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

  it('never presents a chancy or conditional cost as a certain one, in any event', () => {
    const scenario = richKantino()
    let risky = 0
    let inContent = 0
    for (const event of scenario.events) {
      for (const choice of event.choices) {
        const cash = choice.effects.flatMap((e) =>
          e.type === 'cash' && e.amountCents < 0 ? [e] : [],
        )
        const sure = cash.filter((e) => e.chance >= 1 && e.when.length === 0)
        const maybe = cash.filter((e) => e.chance < 1 || e.when.length > 0)
        const s = newGame(`audit-${event.id}`, {
          ...scenario,
          events: [{ ...event, once: true, when: [], weight: 1_000_000 }],
        })
        const message = getView(playUntilMessage(s)).inbox.find((m) => m.eventId === event.id)
        if (maybe.length > 0) inContent++
        if (!message) continue
        const shown = message.choices.find((c) => c.id === choice.id)!
        expect(shown.costCents, `${event.id}/${choice.id}`).toBe(
          sure.reduce((n, e) => n - e.amountCents, 0),
        )
        expect(shown.possibleCostCents, `${event.id}/${choice.id}`).toBe(
          maybe.reduce((n, e) => n - e.amountCents, 0),
        )
        if (maybe.length > 0) risky++
      }
    }
    // Every risky choice in the content was reached, so none is skipped by the audit.
    expect(risky).toBeGreaterThan(0)
    expect(risky).toBe(inContent)
  })
})
