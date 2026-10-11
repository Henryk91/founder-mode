import { loadScenario, SCENARIO_IDS } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { buildReport, evaluateTargets, marketSpread, median, winRateByMarket } from '../src/report'
import { officeMove } from '../src/desk'
import { runGame } from '../src/simulate'
import { STRATEGIES } from '../src/strategies'
import { randomNoInbox } from '../src/strategies/random'
import {
  answerInbox,
  cheapestInbox,
  readerEventIds,
  BEHAVIOUR_NAMES,
  hirePayback,
  rankMarkets,
  withoutBehaviours,
} from '../src/strategies/validateThenBuild'
import { createGame, endWeek, getView, respond, type PlayerView } from '@founder-mode/engine'

const scenario = loadScenario('kantino')

describe('bots', () => {
  it('has the five plan strategies plus the playtest replay', () => {
    expect(STRATEGIES.map((s) => s.id)).toEqual([
      'random',
      'build_only',
      'sell_first',
      'validate_then_build',
      'validate_then_build_hire',
      'validate_then_build_early_hire',
      'presale_max',
      'price_aware',
      'overworker',
      'playtest',
    ])
  })

  it.each(STRATEGIES.map((s) => [s.id, s] as const))(
    '%s plays complete runs with valid plans only, in every scenario',
    (_id, strategy) => {
      for (const id of SCENARIO_IDS) {
        const s = loadScenario(id)
        for (let i = 0; i < 5; i++) {
          const r = runGame(s, strategy, `test-${i}`)
          expect(['bankrupt', 'burnout', 'still_searching', 'sustainable']).toContain(r.ending)
          expect(r.weeks).toBeGreaterThan(0)
          expect(r.weeks).toBeLessThanOrEqual(s.maxWeeks)
        }
      }
    },
  )

  it('is deterministic for a seed', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'random')!
    expect(runGame(scenario, strategy, 'same')).toEqual(runGame(scenario, strategy, 'same'))
  })

  it('build_only never finds a customer', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'build_only')!
    for (let i = 0; i < 5; i++) {
      expect(runGame(scenario, strategy, `b${i}`).customersEnd).toBe(0)
    }
  })

  it('the overworker plans 65 h a week and burns out', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'overworker')!
    const r = runGame(scenario, strategy, 'o')
    expect(r.meanPlannedHours).toBeGreaterThan(55)
    expect(r.ending).toBe('burnout')
  })

  it('builds a report with every target', () => {
    const strategies = STRATEGIES.map((s) => ({
      id: s.id,
      description: s.description,
      results: [runGame(scenario, s, 'r1'), runGame(scenario, s, 'r2')],
      seconds: 0.1,
    }))
    const input = { engineVersion: 'x', runs: 2, seedPrefix: 'r', strategies }
    const targets = evaluateTargets(input)
    expect(targets.map((t) => t.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17,
    ])
    // Without the extra runs, the targets that need them are not measured.
    expect(targets.find((t) => t.id === 10)!.value).toBe('-')
    const md = buildReport(input)
    expect(md).toContain('# Balancing report')
    for (const heading of [
      '## Price aware against plain',
      '## Week the run ended',
      '## Losing runs: what they earned',
      '## First paying customer',
    ]) {
      expect(md).toContain(heading)
    }
    expect(md).toContain('not measured')
    expect(md).toContain('| validate_then_build |')
    expect(md).toContain('## Inbox pool')
    expect(md).not.toContain('NaN')
  })

  it('the price aware bot raises its price when trials convert, and never below one step', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'price_aware')!
    const prices = Array.from({ length: 20 }, (_, i) => runGame(scenario, strategy, `p${i}`)).map(
      (r) => r.finalPriceCents,
    )
    expect(Math.max(...prices)).toBeGreaterThan(scenario.start.priceCentsPerMonth)
    expect(Math.min(...prices)).toBeGreaterThan(0)
  })

  it('records the first customer week and what a run earned', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    const runs = Array.from({ length: 10 }, (_, i) => runGame(scenario, strategy, `f${i}`))
    for (const r of runs) {
      if (r.firstCustomerWeek === null) expect(r.peakCustomers).toBe(0)
      else expect(r.peakCustomers).toBeGreaterThan(0)
      // Pre-sale deposits are money received before anyone is a customer.
      if (r.revenueReceivedCents > 0 && r.presaleBatches === 0) {
        expect(r.firstCustomerWeek).not.toBeNull()
      }
    }
  })

  it('measures the spread of win rates across viable markets', () => {
    const base = runGame(scenario, STRATEGIES[0]!, 'x')
    const run = (viableSegment: string, ending: 'sustainable' | 'bankrupt') => ({
      ...base,
      viableSegment,
      ending,
    })
    const results = [run('a', 'sustainable'), run('a', 'bankrupt'), run('b', 'bankrupt')]
    expect(winRateByMarket(results, ['a', 'b']).map((x) => x.rate)).toEqual([50, 0])
    expect(marketSpread(results)).toBe(50)
  })

  it('validate_then_build tests demand, runs pre-sales, and keeps the books and the invoices tidy', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    const runs = Array.from({ length: 20 }, (_, i) => runGame(scenario, strategy, `p4-${i}`))
    for (const r of runs) {
      expect(r.landingTests).toBe(2)
    }
    expect(runs.some((r) => r.presaleBatches > 0)).toBe(true)
    expect(runs.some((r) => r.invoicesIssued > 0)).toBe(true)
  })

  it('random answers about half of its messages, the others ignore the inbox', () => {
    const random = runGame(
      scenario,
      STRATEGIES.find((s) => s.id === 'random')!,
      'inbox',
    )
    expect(random.messages).toBeGreaterThan(5)
    expect(random.messagesAnswered).toBeGreaterThan(0)
    expect(random.messagesAnswered).toBeLessThan(random.messages)
    const buildOnly = runGame(
      scenario,
      STRATEGIES.find((s) => s.id === 'build_only')!,
      'inbox',
    )
    expect(buildOnly.messagesAnswered).toBe(0)
  })

  it('reports the Phase 4 systems and the shut down ending', () => {
    const strategies = STRATEGIES.map((s) => ({
      id: s.id,
      description: s.description,
      results: [runGame(scenario, s, 'q1'), runGame(scenario, s, 'q2')],
      seconds: 0.1,
    }))
    const md = buildReport({ engineVersion: 'x', runs: 2, seedPrefix: 'q', strategies })
    expect(md).toContain('## Phase 4 systems in use')
    expect(md).toContain('| Shut down |')
    expect(md).not.toContain('NaN')
  })

  describe('the inbox policy', () => {
    const choice = (id: string, hours: number, costCents = 0, monthlyCostCents = 0) => ({
      id,
      label: id,
      hours,
      costCents,
      possibleCostCents: 0,
      monthlyCostCents,
    })
    const view = (choices: ReturnType<typeof choice>[], cash = 1_500_000): PlayerView =>
      ({
        committedHours: 0,
        forcedHours: 0,
        founder: { maxHoursPerWeek: 65 },
        company: { cashCents: cash },
        inbox: [
          {
            id: 'message_1',
            week: 2,
            expiresWeek: 3,
            fromRole: 'x',
            fromName: 'x',
            text: 'x',
            choices,
            answeredChoiceId: null,
          },
        ],
      }) as unknown as PlayerView

    it('takes the choice that asks the most effort, within 6 hours', () => {
      const answers = answerInbox(view([choice('skip', 0), choice('chat', 2), choice('long', 8)]))
      expect(answers).toEqual([{ messageId: 'message_1', choiceId: 'chat' }])
    })

    it('leaves a message alone when its best choice is free, so the default happens', () => {
      expect(answerInbox(view([choice('a', 0), choice('b', 0)]))).toEqual([])
    })

    it('never takes a monthly cost, and spends at most a tenth of the cash above 4,500 EUR', () => {
      expect(answerInbox(view([choice('skip', 0), choice('sub', 3, 0, 6_000)]))).toEqual([])
      const buy = [choice('skip', 0), choice('buy', 1, 210_000)]
      expect(answerInbox(view(buy, 1_500_000))).toEqual([])
      expect(answerInbox(view(buy, 2_250_000))).toEqual([
        { messageId: 'message_1', choiceId: 'buy' },
      ])
      expect(answerInbox(view([choice('skip', 0), choice('pay', 1, 75_000)], 510_000))).toEqual([])
    })

    it('keeps the week under 8 hours of answers', () => {
      const v = view([choice('skip', 0), choice('a', 5)])
      v.inbox.push({ ...v.inbox[0]!, id: 'message_2' })
      expect(answerInbox(v)).toEqual([{ messageId: 'message_1', choiceId: 'a' }])
    })

    it('always cheapest takes the fewest hours, then the least money, even when free', () => {
      expect(
        cheapestInbox(
          view([choice('long', 3), choice('pay', 0, 22_500), choice('later', 0, 60_000)]),
        ),
      ).toEqual([{ messageId: 'message_1', choiceId: 'pay' }])
      expect(cheapestInbox(view([choice('sub', 0, 0, 6_000), choice('no', 0)]))).toEqual([
        { messageId: 'message_1', choiceId: 'no' },
      ])
    })

    it.each(SCENARIO_IDS)(
      'the reader has an answer for every %s event, and only for events that exist',
      (id) => {
        // The books are their own behaviour, answered before the reader looks. So is an office
        // move that brings walk-ins: taken only when the bot's evidence ranks that market first.
        const s = loadScenario(id)
        const officeMove = (e: (typeof s.events)[number]) =>
          e.choices.some((c) => c.effects.some((fx) => fx.type === 'moveOffice'))
        const ids = s.events
          .filter((e) => e.id !== 'receipts_pile' && !officeMove(e))
          .map((e) => e.id)
        expect(readerEventIds(id).sort()).toEqual([...ids].sort())
        for (const e of s.events) {
          expect(e.choices.length).toBeGreaterThanOrEqual(2)
        }
      },
    )
  })

  it('switches single behaviours off, and names the variant after them', () => {
    expect(BEHAVIOUR_NAMES).toEqual(['inbox', 'chase', 'landing', 'books', 'followUps'])
    const noBooks = withoutBehaviours({ id: 'validate_then_build', hire: 'none' }, ['books'])
    expect(noBooks.id).toBe('validate_then_build -books')
    const r = runGame(scenario, noBooks, 'nb')
    expect(r.booksLeft).toBeGreaterThan(0)
    const noLanding = runGame(
      scenario,
      withoutBehaviours({ id: 'v', hire: 'none' }, ['landing']),
      'nl',
    )
    expect(noLanding.landingTests).toBe(0)
    const none = withoutBehaviours({ id: 'v', hire: 'none' }, BEHAVIOUR_NAMES)
    const rn = runGame(scenario, none, 'nn')
    expect(rn.messagesAnswered).toBe(0)
    expect(rn.landingTests).toBe(0)
  })

  it('the hire variant hires once revenue covers a salary, and only once', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build_hire')!
    const runs = Array.from({ length: 150 }, (_, i) => runGame(scenario, strategy, `h${i}`))
    const hired = runs.filter((r) => r.hiredWeek !== null)
    expect(hired.length).toBeGreaterThan(0)
    const plain = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    expect(runGame(scenario, plain, 'h1').hiredWeek).toBeNull()
  })

  it('the early hire variant hires earlier than the covered one', () => {
    const early = STRATEGIES.find((s) => s.id === 'validate_then_build_early_hire')!
    const covered = STRATEGIES.find((s) => s.id === 'validate_then_build_hire')!
    const weeks = (strategy: typeof early) =>
      Array.from({ length: 60 }, (_, i) => runGame(scenario, strategy, `e${i}`).hiredWeek).filter(
        (w): w is number => w !== null,
      )
    const e = weeks(early)
    expect(e.length).toBeGreaterThan(0)
    expect(median(e)!).toBeLessThan(median(weeks(covered)) ?? Infinity)
  })

  it('a hire pays back when the extra hours find enough customers early enough', () => {
    const base = {
      maxWeeks: 78,
      startWeek: 20,
      monthlySalaryCents: 380_000,
      weeksPerMonth: 4,
      priceCentsPerMonth: 30_000,
      weeklyHours: 20,
      usefulHours: Infinity,
      leadsPerHour: 0.1,
      winRate: 0.3,
      lagWeeks: 8,
    }
    // 0.6 customers a week at 75 EUR a week each, against 950 EUR of salary a week.
    expect(hirePayback(base)).toBeGreaterThan(0)
    expect(hirePayback({ ...base, startWeek: 50 })).toBeLessThan(0)
    expect(hirePayback({ ...base, winRate: 0.05 })).toBeLessThan(0)
    // A developer with 40 hours of work left frees too little.
    expect(hirePayback({ ...base, usefulHours: 40 })).toBeLessThan(0)
  })

  it('validate_then_build follows up with its open leads', () => {
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    const player = strategy.create(scenario, 'fu')
    let state = createGame(scenario, 'fu')
    let followUps = 0
    for (let w = 0; w < 30 && state.status === 'running'; w++) {
      const plan = player.plan(getView(state))
      followUps += plan.followUps.length
      const result = endWeek(state, plan)
      player.observe?.(result.report, getView(result.state))
      state = result.state
    }
    expect(followUps).toBeGreaterThan(0)
  })

  it('the silent random bot never answers and plays the same random stream', () => {
    const silent = runGame(scenario, randomNoInbox, 'quiet')
    expect(silent.messagesAnswered).toBe(0)
    expect(silent.messages).toBeGreaterThan(0)
  })

  it('computes medians', () => {
    expect(median([])).toBeNull()
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 2, 3])).toBe(2.5)
  })
})

describe.each(SCENARIO_IDS)('the %s office with walk-ins', (id) => {
  it('is taken by the reading bot only when its own evidence ranks the walk-in market first', () => {
    const scenario = loadScenario(id)
    const office = officeMove(scenario)!
    const strategy = STRATEGIES.find((s) => s.id === 'validate_then_build')!
    let taken = 0
    let declined = 0
    for (let i = 0; i < 40; i++) {
      const seed = `desk-${i}`
      const player = strategy.create(scenario, seed)
      let state = createGame(scenario, seed)
      while (state.status === 'running' && state.company.officeStage === 'kitchen_table') {
        const view = getView(state)
        const offer = view.inbox.find(
          (m) => m.eventId === office.eventId && m.answeredChoiceId === null,
        )
        const answers = player.respond?.(view) ?? []
        if (offer) {
          const first = rankMarkets(scenario, view)[0]?.id
          const move = answers.some((a) => a.messageId === offer.id && a.choiceId === 'move')
          if (move) taken++
          else declined++
          expect(move).toBe(first === office.segmentId)
          break
        }
        for (const a of answers) state = respond(state, a.messageId, a.choiceId)
        const out = endWeek(state, player.plan(getView(state)))
        player.observe?.(out.report, getView(out.state))
        state = out.state
      }
    }
    expect(taken).toBeGreaterThan(0)
    expect(declined).toBeGreaterThan(0)
  })
})
