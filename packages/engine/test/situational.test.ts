import { parseCondition } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { endWeek, respond } from '../src/index'
import { conditionsHold } from '../src/systems/conditions'
import type { GameState } from '../src/types'
import { newGame, plan } from './helpers'
import { event, openLead, withEvents } from './helpers2'

const cond = (text: string) => parseCondition(text)!

/** A game with one lead-sender event whose answer brings a lead only if the sender went silent. */
function withSilentEvent(silent: boolean): GameState {
  const scenario = withEvents([
    event({
      id: 'quiet_lead',
      from: 'lead',
      choices: [
        { id: 'skip', label: 'Skip', hours: 0, effects: [] },
        {
          id: 'act',
          label: 'Act',
          hours: 2,
          effects: [
            {
              type: 'newLeads',
              count: 2,
              chance: 1,
              when: [cond('sender.silent == 1')],
            },
          ],
        },
      ],
    }),
  ])
  const s = newGame('situational', scenario)
  return {
    ...s,
    leads: [openLead(1, 'medical', silent ? { silentSinceWeek: 1 } : {})],
  }
}

describe('situational events (step 3)', () => {
  it('lets an effect depend on its sender, and only then', () => {
    for (const silent of [true, false]) {
      let s = withSilentEvent(silent)
      s = endWeek(s, plan()).state
      const m = s.inbox.find((x) => x.eventId === 'quiet_lead')!
      expect(m.targetId).toBe('lead_1')
      const leadsBefore = s.leads.length
      s = respond(s, m.id, 'act')
      s = endWeek(s, plan()).state
      expect(s.leads.length - leadsBefore >= (silent ? 2 : 0)).toBe(true)
      if (!silent) expect(s.leads.filter((l) => l.source === 'inbox')).toHaveLength(0)
    }
  })

  it('reads sender paths as 0 without a sender, and team and runway from what is visible', () => {
    const s = newGame('paths')
    expect(conditionsHold(s, [cond('sender.overdue == 0'), cond('sender.silent == 0')])).toBe(true)
    expect(conditionsHold(s, [cond('team.size == 0')])).toBe(true)
    expect(conditionsHold(s, [cond('runwayWeeks > 0')])).toBe(true)
  })

  it('stays deterministic: the same seed and answers give the same game', () => {
    const run = () => {
      let s = withSilentEvent(true)
      for (let w = 0; w < 4; w++) {
        const m = s.inbox.find((x) => x.status === 'open')
        if (m) s = respond(s, m.id, 'act')
        s = endWeek(s, plan()).state
      }
      return s
    }
    expect(run()).toEqual(run())
  })
})
