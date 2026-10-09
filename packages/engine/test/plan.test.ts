import { describe, expect, it } from 'vitest'
import { endWeek, validatePlan } from '../src/index'
import { newGame, plan, play } from './helpers'

describe('validatePlan', () => {
  const state = newGame()

  it('accepts an empty plan', () => {
    expect(validatePlan(state, plan())).toEqual([])
  })

  it('accepts up to the maximum hours, interviews plus rest', () => {
    // 30 interviews x 2 h + 5 h rest = 65 h
    expect(validatePlan(state, plan({ interviews: { coworking: 30 }, restHours: 5 }))).toEqual([])
  })

  it('rejects more than the maximum hours', () => {
    expect(validatePlan(state, plan({ interviews: { coworking: 30 }, restHours: 6 }))).toEqual([
      { code: 'too_many_hours', plannedHours: 66, maxHours: 65 },
    ])
  })

  it('rejects unknown segments and invalid numbers', () => {
    const issues = validatePlan(
      state,
      plan({ interviews: { dentists: 1, medical: -1 }, restHours: 1.5 }),
    )
    expect(issues).toContainEqual({ code: 'unknown_segment', segmentId: 'dentists' })
    expect(issues).toContainEqual({ code: 'invalid_number', field: 'interviews.medical' })
    expect(issues).toContainEqual({ code: 'invalid_number', field: 'restHours' })
  })

  it('rejects transfers above savings', () => {
    expect(validatePlan(state, plan({ transferToCompanyCents: 1_200_001 }))).toEqual([
      { code: 'transfer_exceeds_savings', savingsCents: 950_000 },
    ])
  })

  it('accepts a positive whole price and rejects anything else', () => {
    expect(validatePlan(state, plan({ priceCentsPerMonth: 45_000 }))).toEqual([])
    for (const price of [0, -100, 12.5]) {
      expect(validatePlan(state, plan({ priceCentsPerMonth: price }))).toEqual([
        { code: 'invalid_price' },
      ])
    }
  })

  it('rejects any plan once the run has ended, and endWeek throws', () => {
    const ended = play(state, 200, () => plan())
    expect(ended.status).toBe('ended')
    expect(validatePlan(ended, plan())).toEqual([{ code: 'game_over' }])
    expect(() => endWeek(ended, plan())).toThrow(/game_over/)
  })
})
