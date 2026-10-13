import { CONDITION_PATHS, EventSchema, loadScenario, parseCondition } from '@founder-mode/content'
import {
  type MessageView,
  conditionValue,
  createGame,
  endWeek,
  getView,
  respond,
  viewConditionValue,
} from '@founder-mode/engine'
import { describe, expect, it } from 'vitest'
import { STRATEGIES } from '../src/strategies'
import { fromConditions } from '../src/strategies/validateThenBuild'
import { tourismScenario } from '../../engine/test/tourism'

describe('the condition language (step 3)', () => {
  it('reads every path the same from the player view as from the game state', () => {
    const cases = [
      ['kantino', 'long', 'validate_then_build'],
      ['kantino', 'long', 'raise_on_traction'],
      ['kantino', 'standard', 'validate_then_build_hire'],
      ['zollstock', 'standard', 'random'],
      ['tourism', 'long', 'tourism_careful'],
    ] as const
    let checked = 0
    let sender = 0
    for (const [id, mode, strategyId] of cases) {
      const scenario = id === 'tourism' ? tourismScenario() : loadScenario(id, mode)
      const strategy = STRATEGIES.find((s) => s.id === strategyId)!
      for (let seed = 0; seed < 3; seed++) {
        let state = createGame(scenario, `cond-${seed}`)
        const player = strategy.create(scenario, `cond-${seed}`)
        while (state.status === 'running') {
          const view = getView(state)
          for (const path of CONDITION_PATHS) {
            if (path.startsWith('sender.')) continue
            expect(viewConditionValue(view, path), `${path} week ${state.week}`).toBe(
              conditionValue(state, path),
            )
            checked++
          }
          for (const m of state.inbox.filter((x) => x.status === 'open')) {
            const mv = view.inbox.find((x) => x.id === m.id)!
            for (const path of ['sender.overdue', 'sender.silent'] as const) {
              expect(viewConditionValue(view, path, mv), `${path} ${m.eventId}`).toBe(
                conditionValue(state, path, m),
              )
              sender++
            }
          }
          for (const a of player.respond?.(view) ?? [])
            state = respond(state, a.messageId, a.choiceId)
          const r = endWeek(state, player.plan(getView(state)))
          player.observe?.(r.report, getView(r.state))
          state = r.state
        }
      }
    }
    expect(checked).toBeGreaterThan(1000)
    expect(sender).toBeGreaterThan(100)
  })

  it('parses the new paths and keeps sender paths out of an event draw', () => {
    expect(parseCondition('sender.overdue == 1')).toEqual({
      path: 'sender.overdue',
      op: '==',
      value: 1,
    })
    expect(parseCondition('team.size >= 2')?.path).toBe('team.size')
    expect(parseCondition('sender.mood == 1')).toBeNull()
    const event = {
      id: 'x',
      area: 'sales',
      weight: 1,
      sender: 'Someone',
      text: 'Hello.',
      defaultChoice: 'a',
      choices: [
        { id: 'a', label: 'A', hours: 0 },
        { id: 'b', label: 'B', hours: 1 },
      ],
    }
    expect(() => EventSchema.parse({ ...event, when: ['sender.silent == 1'] })).toThrow(
      /only works in an effect/,
    )
    const withEffect = {
      ...event,
      choices: [
        event.choices[0],
        { ...event.choices[1], effects: [{ type: 'touchLead', when: ['sender.silent == 1'] }] },
      ],
    }
    expect(() => EventSchema.parse(withEffect)).toThrow(/needs a customer or lead/)
    expect(EventSchema.parse({ ...withEffect, from: 'lead' }).id).toBe('x')
  })
})

describe('the reader reads declared conditions (step 3)', () => {
  const long = loadScenario('kantino', 'long')
  const event = (id: string) => long.events.find((e) => e.id === id)!
  const base = getView(createGame(long, 'reader-conditions'))
  const message = (eventId: string, fromName = 'Nobody'): MessageView => ({
    id: 'm',
    eventId,
    week: 1,
    expiresWeek: 2,
    fromRole: 'x',
    fromName,
    look: 'letter',
    text: '',
    choices: [],
    answeredChoiceId: null,
  })

  it('takes the effort only in the situation the event names', () => {
    // A thin pipeline: a podcast brings a lead. A full one: it only costs hours.
    expect(fromConditions(event('podcast_invite'), base, message('podcast_invite'))).toBe('record')
    const lead = base.leads[0] ?? {
      id: 'l',
      name: 'L',
      segmentId: 'medical',
      stage: 'lead' as const,
      weeksInStage: 0,
      lastContactWeek: 1,
      silent: false,
      lostReason: null,
      canBookDemo: false,
      canFollowUp: true,
      source: 'outreach' as const,
      walkInFrom: null,
      channel: null,
      referredBy: null,
      foundBy: null,
    }
    const full = { ...base, leads: Array.from({ length: 9 }, (_, i) => ({ ...lead, id: `l${i}` })) }
    expect(fromConditions(event('podcast_invite'), full, message('podcast_invite'))).toBe('decline')
  })

  it('chases a debt only when the sender is overdue, and never with a customer at risk', () => {
    const e = event('debt_collector')
    expect(fromConditions(e, base, message('debt_collector', 'Acme'))).toBe(e.defaultChoice)
    const overdue = {
      ...base,
      invoices: [
        {
          id: 'i',
          customerName: 'Acme',
          segmentId: 'medical',
          amountCents: 1,
          issuedWeek: 1,
          dueWeek: 2,
          status: 'overdue' as const,
          overdueWeeks: 3,
          paidWeek: null,
          canChase: true,
        },
      ],
    }
    // The agency risks the customer; doing it yourself does not.
    expect(fromConditions(e, overdue, message('debt_collector', 'Acme'))).toBe('yourself')
  })
})
