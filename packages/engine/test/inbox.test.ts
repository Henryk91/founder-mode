import { parseCondition, type Effect } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { endWeek, getView, replay, respond, toSave, validatePlan } from '../src/index'
import { conditionsHold } from '../src/systems/conditions'
import type { GameState, Invoice } from '../src/types'
import { kantino, newGame, plan } from './helpers'
import { customer, event, openLead, withEvents } from './helpers2'

const book = plan()
const cond = (text: string) => {
  const c = parseCondition(text)
  if (!c) throw new Error(`bad condition ${text}`)
  return c
}

/** A game that gets exactly one message from `ev`, in week 2. */
function withMessage(ev: ReturnType<typeof event>, setup: (s: GameState) => GameState = (s) => s) {
  const scenario = withEvents([ev], { maxPerWeek: 1 })
  const s0 = setup(newGame('inbox', scenario))
  return endWeek(s0, book).state
}

const effects = (choiceId: string, list: Effect[], from: 'none' | 'customer' | 'lead' = 'none') =>
  event({
    id: 'fx',
    from,
    defaultChoice: 'skip',
    text: from === 'none' ? 'Plain text.' : 'Hello from {name}.',
    choices: [
      { id: 'skip', label: 'Skip', hours: 0, effects: [] },
      { id: choiceId, label: 'Act', hours: 2, effects: list },
    ],
  })

describe('conditions', () => {
  it('parse the closed grammar and nothing else', () => {
    expect(parseCondition('customers.count >= 1')).toEqual({
      path: 'customers.count',
      op: '>=',
      value: 1,
    })
    expect(parseCondition('cashEur<=-5.5')).toEqual({ path: 'cashEur', op: '<=', value: -5.5 })
    for (const bad of [
      '',
      'week',
      'week >> 3',
      'nonsense > 1',
      'week > one',
      'week > 1 && week < 4',
      'process.exit() > 1',
    ]) {
      expect(parseCondition(bad)).toBeNull()
    }
  })

  it('are read from the state', () => {
    let s = newGame()
    expect(
      conditionsHold(s, [cond('week == 1'), cond('customers.count < 1'), cond('hasHire == 0')]),
    ).toBe(true)
    expect(conditionsHold(s, [cond('week >= 2')])).toBe(false)
    expect(conditionsHold(s, [])).toBe(true)
    const inv: Invoice = {
      id: 'invoice_1',
      customerId: 'c',
      customerName: 'C',
      segmentId: 'coworking',
      amountCents: 1,
      issuedWeek: 1,
      dueWeek: 2,
      paidWeek: null,
      writtenOffWeek: null,
    }
    s = {
      ...s,
      week: 5,
      customers: [customer('c')],
      invoices: [inv],
      leads: [openLead(1, 'coworking', { stage: 'demo' })],
    }
    expect(
      conditionsHold(s, [
        cond('customers.count >= 1'),
        cond('invoices.overdueDays >= 14'),
        cond('invoices.open == 1'),
        cond('leads.waitingForDemo == 1'),
        cond('monthlyRevenueEur == 300'),
        cond('cashEur == 10000'),
      ]),
    ).toBe(true)
  })
})

describe('the inbox', () => {
  it('draws a message at the end of a week, for the next one', () => {
    const s = withMessage(event({ id: 'hello', text: 'Hello there.' }))
    expect(s.week).toBe(2)
    const view = getView(s).inbox
    expect(view).toHaveLength(1)
    expect(view[0]).toMatchObject({
      week: 2,
      expiresWeek: 3,
      fromName: 'Tester',
      text: 'Hello there.',
      answeredChoiceId: null,
    })
    expect(view[0]!.choices).toEqual([
      { id: 'skip', label: 'Skip', hours: 0, costCents: 0, monthlyCostCents: 0 },
      { id: 'act', label: 'Act', hours: 2, costCents: 0, monthlyCostCents: 0 },
    ])
  })

  it('shows what a choice certainly costs, in money, but never gains or odds', () => {
    const s = withMessage(
      effects('act', [
        { type: 'cash', amountCents: -40_000, chance: 1 },
        { type: 'cash', amountCents: -10_000, chance: 0.5 },
        { type: 'cash', amountCents: 90_000, chance: 0.4 },
        { type: 'fixedCost', id: 'sub', name: 'Sub', monthlyCents: 4_000, chance: 1 },
      ]),
    )
    const act = getView(s).inbox[0]!.choices.find((c) => c.id === 'act')!
    expect(act).toMatchObject({ costCents: 50_000, monthlyCostCents: 4_000 })
    expect(JSON.stringify(getView(s).inbox)).not.toContain('90000')
  })

  it('shows choices with hours and never any effect or chance', () => {
    const s = withMessage(effects('act', [{ type: 'cash', amountCents: 100_000, chance: 0.4 }]))
    const json = JSON.stringify(getView(s).inbox)
    expect(json).not.toContain('chance')
    expect(json).not.toContain('amountCents')
    expect(json).not.toContain('effects')
  })

  it('only draws events whose conditions hold', () => {
    const scenario = withEvents([event({ id: 'late', when: [cond('week >= 4')] })])
    let s = newGame('cond', scenario)
    const arrivals: number[] = []
    for (let i = 0; i < 6; i++) {
      s = endWeek(s, book).state
      if (s.inbox.some((m) => m.week === s.week)) arrivals.push(s.week)
    }
    expect(arrivals[0]).toBe(5)
  })

  it('never draws a once event twice and keeps repeatable ones apart by the cooldown', () => {
    const once = withEvents([event({ id: 'only', once: true })])
    let s = newGame('once', once)
    for (let i = 0; i < 10; i++) s = endWeek(s, book).state
    expect(s.inbox.filter((m) => m.eventId === 'only')).toHaveLength(1)

    const cool = withEvents([event({ id: 'again' })], { cooldownWeeks: 4 })
    s = newGame('cool', cool)
    for (let i = 0; i < 16; i++) s = endWeek(s, book).state
    const weeks = s.inbox.map((m) => m.week)
    for (let i = 1; i < weeks.length; i++)
      expect(weeks[i]! - weeks[i - 1]!).toBeGreaterThanOrEqual(4)
    expect(weeks.length).toBeGreaterThan(2)
  })

  it('draws at most maxPerWeek messages and keeps the open ones under the limit', () => {
    const many = Array.from({ length: 8 }, (_, i) => event({ id: `e${i}` }))
    const scenario = withEvents(many, { maxPerWeek: 3, openLimit: 4, openWeeks: 3 })
    let s = newGame('many', scenario)
    for (let i = 0; i < 12; i++) {
      s = endWeek(s, book).state
      expect(s.inbox.filter((m) => m.week === s.week).length).toBeLessThanOrEqual(3)
      expect(s.inbox.filter((m) => m.status === 'open').length).toBeLessThanOrEqual(4)
    }
    expect(s.inbox.length).toBeGreaterThan(5)
  })

  it('picks events by weight', () => {
    const scenario = withEvents(
      [event({ id: 'heavy', weight: 9 }), event({ id: 'light', weight: 1 })],
      {
        maxPerWeek: 1,
        openLimit: 100,
        openWeeks: 1,
      },
    )
    const counts = { heavy: 0, light: 0 }
    for (let i = 0; i < 40; i++) {
      let s = newGame(`w${i}`, scenario)
      for (let w = 0; w < 5; w++) {
        s = endWeek(s, book).state
        // Once is false, so both stay eligible.
      }
      for (const m of s.inbox) counts[m.eventId as 'heavy' | 'light']++
    }
    expect(counts.heavy).toBeGreaterThan(counts.light * 4)
  })

  it('needs a real customer or lead for those senders, and names them in the text', () => {
    const forCustomer = withEvents([event({ id: 'c', from: 'customer', text: 'Hi from {name}.' })])
    let s = endWeek(newGame('nocust', forCustomer), book).state
    expect(s.inbox).toHaveLength(0)
    const withCustomer = { ...newGame('cust', forCustomer), customers: [customer('customer_1')] }
    s = endWeek(withCustomer, book).state
    expect(s.inbox[0]).toMatchObject({
      targetId: 'customer_1',
      fromName: 'Kunde customer_1',
      text: 'Hi from Kunde customer_1.',
      fromRole: 'Tester',
    })
    const forLead = withEvents([event({ id: 'l', from: 'lead', text: 'Hi from {name}.' })])
    expect(endWeek(newGame('nolead', forLead), book).state.inbox).toHaveLength(0)
    const lost = {
      ...newGame('lost', forLead),
      leads: [openLead(1, 'coworking', { stage: 'lost' })],
    }
    expect(endWeek(lost, book).state.inbox).toHaveLength(0)
    const open = { ...newGame('lead', forLead), leads: [openLead(1, 'coworking')] }
    expect(endWeek(open, book).state.inbox[0]).toMatchObject({ targetId: 'lead_1' })
  })
})

describe('answering', () => {
  it('counts the hours at once and applies the effects when the week ends', () => {
    const s = withMessage(effects('act', [{ type: 'energy', delta: 20, chance: 1 }]))
    const answered = respond(s, 'message_1', 'act')
    expect(getView(answered).committedHours).toBe(2)
    expect(getView(answered).inbox[0]!.answeredChoiceId).toBe('act')
    expect(answered.founder.energy).toBe(s.founder.energy)
    expect(validatePlan(answered, plan({ restHours: 64 }))).toContainEqual({
      code: 'too_many_hours',
      plannedHours: 66,
      maxHours: 65,
    })
    const r = endWeek(answered, plan({ restHours: 5 }))
    expect(r.report.plannedHours).toBe(2 + 5)
    // 80 + 3 + 20 (message) + 7.5 rest, capped at 100; the answer took effect before the week's energy.
    expect(r.state.founder.energy).toBe(100)
    expect(r.report.entries).toContainEqual({
      kind: 'message_resolved',
      fromName: 'Tester',
      choiceLabel: 'Act',
      expired: false,
    })
    expect(r.state.inbox[0]).toMatchObject({ status: 'resolved', choiceId: 'act' })
    expect(getView(r.state).committedHours).toBe(0)
  })

  it('takes the default choice when nobody answers by the last week', () => {
    const ev = event({
      id: 'dflt',
      once: true,
      choices: [
        {
          id: 'skip',
          label: 'Skip',
          hours: 0,
          effects: [{ type: 'energy', delta: -10, chance: 1 }],
        },
        { id: 'act', label: 'Act', hours: 2, effects: [] },
      ],
    })
    let s = withMessage(ev)
    const energy0 = s.founder.energy
    s = endWeek(s, book).state
    // Week 2 is the first of two open weeks: nothing yet, and the message is still there.
    expect(s.inbox[0]!.status).toBe('open')
    expect(getView(s).inbox).toHaveLength(1)
    const last = endWeek(s, book)
    expect(last.state.inbox[0]).toMatchObject({ status: 'expired', choiceId: 'skip' })
    expect(last.report.entries).toContainEqual(
      expect.objectContaining({ kind: 'message_resolved', expired: true }),
    )
    expect(last.state.founder.energy).toBeLessThan(energy0)
    expect(getView(last.state).inbox).toEqual([])
  })

  it('refuses a message that is not open, a missing choice, or hours that do not fit', () => {
    const s = withMessage(effects('act', []))
    expect(() => respond(s, 'message_9', 'act')).toThrow()
    expect(() => respond(s, 'message_1', 'nope')).toThrow()
    const once = respond(s, 'message_1', 'act')
    expect(() => respond(once, 'message_1', 'skip')).toThrow()
    const busy = { ...s, founder: { ...s.founder, forcedHours: 64 } }
    expect(() => respond(busy, 'message_1', 'act')).toThrow()
    expect(respond(busy, 'message_1', 'skip').inbox[0]!.choiceId).toBe('skip')
  })

  it('does not mutate the state it was given', () => {
    const s = withMessage(effects('act', []))
    const frozen = JSON.stringify(s)
    respond(s, 'message_1', 'act')
    expect(JSON.stringify(s)).toBe(frozen)
  })

  it('is part of the save and replays exactly, with a shut down too', () => {
    const scenario = withEvents(
      [effects('act', [{ type: 'cash', amountCents: 5_000, chance: 1 }])],
      { maxPerWeek: 1 },
    )
    let s = endWeek(newGame('replay', scenario), book).state
    s = respond(s, 'message_1', 'act')
    s = endWeek(s, book).state
    expect(s.actionLog.map((a) => a.type)).toEqual(['endWeek', 'respond', 'endWeek'])
    expect(replay(scenario, toSave(s))).toEqual(s)
    expect(replay(scenario, JSON.parse(JSON.stringify(toSave(s))))).toEqual(s)
  })
})

describe('effects', () => {
  const run = (
    fx: Effect[],
    from: 'none' | 'customer' | 'lead' = 'none',
    setup?: (s: GameState) => GameState,
  ) => {
    const s = withMessage(effects('act', fx, from), setup)
    return endWeek(respond(s, s.inbox[0]!.id, 'act'), book)
  }
  const withCustomer = (s: GameState) => ({
    ...s,
    customers: [customer('customer_1', 'coworking')],
  })
  const withLead = (s: GameState) => ({
    ...s,
    leads: [openLead(1, 'coworking', { silentSinceWeek: 1 })],
  })

  it('moves money through the ledger', () => {
    const gain = run([{ type: 'cash', amountCents: 150_000, chance: 1 }])
    expect(gain.report.ledger.otherIncomeCents).toBe(150_000)
    expect(gain.report.entries).toContainEqual({ kind: 'cash_effect', amountCents: 150_000 })
    const loss = run([{ type: 'cash', amountCents: -40_000, chance: 1 }])
    expect(loss.report.ledger.otherCostsCents).toBe(40_000)
    expect(loss.state.company.cashCents).toBe(gain.state.company.cashCents - 150_000 - 40_000)
  })

  it('changes bugs and quality, and skills up to their caps', () => {
    const bugs = run([{ type: 'bugs', delta: 2, chance: 1 }])
    expect(bugs.state.product.bugs).toBe(2)
    expect(bugs.state.product.quality).toBe(64)
    expect(run([{ type: 'bugs', delta: -3, chance: 1 }]).state.product.bugs).toBe(0)
    expect(
      run([{ type: 'skill', skill: 'selling', delta: 0.05, chance: 1 }]).state.founder.skills
        .selling,
    ).toBeCloseTo(0.15)
    expect(
      run([{ type: 'skill', skill: 'interviewing', delta: 5, chance: 1 }]).state.founder.skills
        .interviewing,
    ).toBe(0.8)
  })

  it('takes hours out of next week, and adds a fixed cost once', () => {
    const lost = run([{ type: 'lostHours', hours: 6, chance: 1 }])
    expect(getView(lost.state).forcedHours).toBe(6)
    const cost = run([
      { type: 'fixedCost', id: 'sub', name: 'Subscription', monthlyCents: 4_000, chance: 1 },
      { type: 'fixedCost', id: 'sub', name: 'Subscription', monthlyCents: 4_000, chance: 1 },
    ])
    expect(cost.state.company.fixedCosts.filter((c) => c.id === 'sub')).toHaveLength(1)
  })

  it('adds leads in the sender segment, or a random one without a sender', () => {
    const referral = run([{ type: 'newLeads', count: 2, chance: 1 }], 'customer', withCustomer)
    expect(referral.state.leads).toHaveLength(2)
    expect(referral.state.leads.every((l) => l.segmentId === 'coworking')).toBe(true)
    expect(run([{ type: 'newLeads', count: 3, chance: 1 }]).state.leads).toHaveLength(3)
  })

  it('brings a silent lead back', () => {
    const r = run([{ type: 'touchLead', chance: 1 }], 'lead', withLead)
    expect(r.state.leads[0]!.silentSinceWeek).toBeNull()
  })

  it('sometimes pays an overdue invoice and sometimes loses the customer', () => {
    const setup = (s: GameState): GameState => ({
      ...withCustomer(s),
      week: 13,
      invoices: [
        {
          id: 'invoice_1',
          customerId: 'customer_1',
          customerName: 'Kunde customer_1',
          segmentId: 'coworking',
          amountCents: 30_000,
          issuedWeek: 4,
          dueWeek: 6,
          paidWeek: null,
          writtenOffWeek: null,
        },
      ],
      hidden: { ...s.hidden, payWeeks: { invoice_1: 30 } },
    })
    let paid = 0
    let churned = 0
    for (let i = 0; i < 100; i++) {
      const scenario = withEvents(
        [
          effects(
            'act',
            [
              { type: 'invoicePayChance', delta: 0.45, chance: 1 },
              { type: 'churnChance', delta: 0.35, chance: 1 },
            ],
            'customer',
          ),
        ],
        { maxPerWeek: 1 },
      )
      let s = setup(newGame(`pay${i}`, scenario))
      s = endWeek(s, book).state
      s = respond(s, s.inbox[0]!.id, 'act')
      s = endWeek(s, book).state
      if (s.hidden.payWeeks.invoice_1 === 15) paid++
      if (s.customers[0]!.churnedWeek !== null) churned++
    }
    expect(paid / 100).toBeCloseTo(0.45, 0)
    expect(churned / 100).toBeCloseTo(0.35, 0)
  })

  it('make an effect succeed only with its chance', () => {
    let hits = 0
    for (let i = 0; i < 200; i++) {
      const scenario = withEvents(
        [effects('act', [{ type: 'cash', amountCents: 1_000, chance: 0.4 }])],
        { maxPerWeek: 1 },
      )
      let s = endWeek(newGame(`ch${i}`, scenario), book).state
      s = respond(s, 'message_1', 'act')
      if (endWeek(s, book).report.ledger.otherIncomeCents > 0) hits++
    }
    expect(hits / 200).toBeCloseTo(0.4, 1)
  })
})

describe('the Kantino events', () => {
  it('has at least 25 events, with weights, a free default, and no em dashes', () => {
    const s = kantino()
    expect(s.events.length).toBeGreaterThanOrEqual(25)
    for (const e of s.events) {
      expect(e.weight).toBeGreaterThan(0)
      expect(e.choices.find((c) => c.id === e.defaultChoice)!.hours).toBe(0)
      expect(JSON.stringify(e)).not.toContain('—')
    }
  })

  it('spreads over all six areas', () => {
    const areas = new Set(kantino().events.map((e) => e.area))
    expect([...areas].sort()).toEqual([
      'finance',
      'founder',
      'product',
      'sales',
      'team',
      'validation',
    ])
  })

  it('arrive during a normal run and never repeat inside the cooldown', () => {
    let total = 0
    for (let i = 0; i < 20; i++) {
      let s = newGame(`real${i}`)
      for (let w = 0; w < 40 && s.status === 'running'; w++)
        s = endWeek(s, plan({ interviews: { coworking: 1 } })).state
      const byEvent = new Map<string, number[]>()
      for (const m of s.inbox) byEvent.set(m.eventId, [...(byEvent.get(m.eventId) ?? []), m.week])
      for (const [id, weeks] of byEvent) {
        const ev = s.scenario.events.find((e) => e.id === id)!
        if (ev.once) expect(weeks).toHaveLength(1)
        for (let k = 1; k < weeks.length; k++)
          expect(weeks[k]! - weeks[k - 1]!).toBeGreaterThanOrEqual(
            ev.cooldownWeeks ?? s.scenario.inbox.cooldownWeeks,
          )
      }
      total += s.inbox.length
    }
    expect(total / 20).toBeGreaterThan(8)
  })
})
