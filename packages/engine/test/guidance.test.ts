import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import { selectFounderNote } from '../src/systems/guidance'
import type { GameState, Lead } from '../src/types'
import { informedPlan, newGame, play, plan } from './helpers'

const note = (s: GameState) => selectFounderNote(s)

const lead = (): Lead => ({
  id: 'lead_1',
  name: 'Testfirma',
  segmentId: 'coworking',
  stage: 'lead',
  source: 'outreach',
  stageSinceWeek: 1,
  lastContactWeek: 1,
  silentSinceWeek: null,
  lostReason: null,
})

describe('founder note rules', () => {
  it('is the first week note in week 1', () => {
    expect(note(newGame())).toMatchObject({ id: 'first_week', values: {} })
  })

  it('reports no evidence after a week with nothing done', () => {
    const s = play(newGame(), 1, () => plan())
    expect(note(s)).toEqual({
      id: 'no_evidence',
      template: s.scenario.founderNotes.no_evidence,
      values: { week: 2, living: 45_000 },
    })
  })

  it('counts interviews when there are some and nothing is built or sold', () => {
    const s = play(newGame(), 1, () => plan({ interviews: { coworking: 2, medical: 1 } }))
    expect(note(s)).toMatchObject({ id: 'only_interviews', values: { n: 3 } })
  })

  it('notices something shipped but no leads, with or without interviews', () => {
    const s = play(newGame(), 1, () => plan({ build: { basic_ordering: 40 } }))
    expect(note(s)).toMatchObject({ id: 'built_unseen' })
    const t = { ...s, knowledge: { ...s.knowledge, coworking: [{} as never] } }
    expect(note(t)).toMatchObject({ id: 'built_unseen' })
  })

  it('counts leads while there are no customers', () => {
    const s = { ...play(newGame(), 1, () => plan()), leads: [lead()] }
    expect(note(s)).toMatchObject({ id: 'leads_only', values: { n: 1 } })
  })

  it('says nothing once there is a customer, or after week 4', () => {
    const base = { ...play(newGame(), 1, () => plan()), leads: [lead()] }
    const withCustomer = {
      ...base,
      customers: [
        {
          id: 'customer_1',
          leadId: 'lead_1',
          name: 'x',
          segmentId: 'coworking',
          sinceWeek: 2,
          churnedWeek: null,
          priceCentsPerMonth: 30_000,
        },
      ],
    }
    expect(note(withCustomer)).toBeNull()
    expect(note({ ...newGame(), week: 5 })).toBeNull()
    expect(note({ ...newGame(), week: 4 })).not.toBeNull()
  })

  it('lets leads win over interviews', () => {
    const s = {
      ...play(newGame(), 1, () => plan({ interviews: { coworking: 2 } })),
      leads: [lead()],
    }
    expect(note(s)).toMatchObject({ id: 'leads_only' })
  })

  it('is part of the view, and describes rather than recommends', () => {
    const v = getView(play(newGame('note-view'), 2, informedPlan))
    expect(v.guidance.intro.map((c) => c.id)).toEqual(['you', 'idea', 'problem', 'goal'])
    expect(v.guidance.founderNote).not.toBeNull()
    expect(getView(play(newGame(), 5, informedPlan)).guidance.founderNote).toBeNull()
  })

  it('never depends on hidden demand', () => {
    for (let i = 0; i < 20; i++) {
      const a = newGame(`hidden-${i}`)
      const b = newGame(`other-${i}`)
      const run = (s: GameState) => endWeek(s, plan({ interviews: { coworking: 2 } })).state
      expect(getView(run(a)).guidance.founderNote?.id).toBe(
        getView(run(b)).guidance.founderNote?.id,
      )
    }
  })
})
