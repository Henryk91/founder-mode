import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import { Rng } from '../src/rng'
import {
  applyFinanceWeek as applyFinance,
  noExtras,
  privateMoneyInCents,
  profitableForMonths,
  runwayWeeks,
} from '../src/systems/finance'
import type { GameState, WeekLedger, WeekPlan } from '../src/types'
import { newGame, plan, play, quietKantino } from './helpers'

const withMoney = (s: GameState, cashCents: number, savingsCents: number, week = s.week) => ({
  ...s,
  week,
  company: { ...s.company, cashCents },
  founder: { ...s.founder, savingsCents },
})

const applyFinanceWeek = (s: GameState, p: WeekPlan) =>
  applyFinance(s, p, noExtras(), new Rng(s.rng))

describe('finance', () => {
  it('takes living costs from savings every week', () => {
    const { ledger, state } = applyFinanceWeek(newGame(), plan())
    expect(ledger.livingCostsCents).toBe(67_500)
    expect(state.founder.savingsCents).toBe(1_357_500)
    expect(state.company.cashCents).toBe(900_000)
  })

  it('charges fixed costs only at month end, every 4th week', () => {
    let s = newGame('fixed', quietKantino())
    const fixed: number[] = []
    for (let i = 0; i < 8; i++) {
      const r = endWeek(s, plan())
      fixed.push(r.report.ledger.fixedCostsCents)
      s = r.state
    }
    expect(fixed).toEqual([0, 0, 0, 40_500, 0, 0, 0, 40_500])
    expect(s.company.cashCents).toBe(900_000 - 2 * 40_500)
  })

  it('moves a planned transfer from savings into the company', () => {
    const { state, ledger } = applyFinanceWeek(newGame(), plan({ transferToCompanyCents: 300_000 }))
    expect(ledger.transferCents).toBe(300_000)
    expect(state.company.cashCents).toBe(1_200_000)
    expect(state.founder.savingsCents).toBe(1_425_000 - 300_000 - 67_500)
  })

  it('draws living costs from the company when savings run out', () => {
    const { state, ledger } = applyFinanceWeek(withMoney(newGame(), 150_000, 15_000), plan())
    expect(ledger.founderDrawCents).toBe(52_500)
    expect(state.founder.savingsCents).toBe(0)
    expect(state.company.cashCents).toBe(97_500)
  })

  it('covers negative company cash from savings automatically', () => {
    const { state, ledger } = applyFinanceWeek(withMoney(newGame(), 15_000, 150_000, 4), plan())
    // 10,000 - 27,000 fixed = -17,000, covered from savings left after living costs
    expect(ledger.autoTransferCents).toBe(25_500)
    expect(state.company.cashCents).toBe(0)
    expect(state.founder.savingsCents).toBe(150_000 - 67_500 - 25_500)
  })

  it('reports and logs every move between savings and company', () => {
    // Savings 50,000: transfer 20,000, living costs take the remaining 30,000 and the company
    // pays 15,000. Month end fixed costs of 27,000 push cash from 5,000 to -22,000, but savings
    // are empty, so there is no top up.
    const s = withMoney(newGame(), 0, 75_000, 4)
    const { state, report } = endWeek(s, plan({ transferToCompanyCents: 30_000 }))
    expect(report.entries).toEqual([
      { kind: 'savings_transfer', amountCents: 30_000 },
      { kind: 'founder_draw', amountCents: 22_500 },
    ])
    expect(state.eventLog).toEqual([
      { kind: 'savings_transfer', week: 4, amountCents: 30_000 },
      { kind: 'founder_draw', week: 4, amountCents: 22_500 },
    ])
  })

  it('reports and logs an automatic top up', () => {
    const { report, state } = endWeek(withMoney(newGame(), 15_000, 150_000, 4), plan())
    expect(report.entries).toEqual([{ kind: 'auto_top_up', amountCents: 25_500 }])
    expect(state.eventLog).toEqual([{ kind: 'auto_top_up', week: 4, amountCents: 25_500 }])
  })

  it('has no entries in a quiet week', () => {
    expect(endWeek(newGame(), plan()).report.entries).toEqual([])
  })

  it('totals the private money put in, manual and automatic, but not founder draws', () => {
    // Little cash and plenty of savings: cash runs dry first (top ups), then savings (draws).
    const s = play(withMoney(newGame('private', quietKantino()), 45_000, 1_050_000), 200, (x) =>
      plan({ transferToCompanyCents: x.week === 2 ? 15_000 : 0 }),
    )
    expect(s.ending).toBe('bankrupt')
    const sum = (kind: string) =>
      s.eventLog.reduce(
        (t, e) => (e.kind === kind && 'amountCents' in e ? t + e.amountCents : t),
        0,
      )
    expect(sum('savings_transfer')).toBe(15_000)
    expect(sum('auto_top_up')).toBeGreaterThan(0)
    expect(sum('founder_draw')).toBeGreaterThan(0)
    expect(privateMoneyInCents(s)).toBe(sum('savings_transfer') + sum('auto_top_up'))
    // Every ledger amount is mirrored in the event log.
    const ledgerTotal = s.ledger.reduce((t, l) => t + l.transferCents + l.autoTransferCents, 0)
    expect(privateMoneyInCents(s)).toBe(ledgerTotal)
  })

  it('keeps all money in integer cents', () => {
    const s = play(newGame(), 40)
    for (const l of s.ledger) {
      for (const [k, v] of Object.entries(l)) {
        if (k.endsWith('Cents')) expect(Number.isInteger(v)).toBe(true)
      }
    }
  })

  it('estimates runway from known costs before a month has been played', () => {
    const s = newGame()
    // 6,000 cash + 9,500 savings. Per month: 270 fixed + 4 * 450 living = 2,070.
    expect(runwayWeeks(s)).toBe(Math.floor((2_325_000 * 4) / 310_500))
    expect(getView(s).company.runwayWeeks).toBe(29)
    const withCustomer = {
      ...s,
      customers: [
        {
          id: 'customer_1',
          leadId: 'lead_1',
          name: 'X',
          segmentId: 'coworking',
          sinceWeek: 1,
          churnedWeek: null,
          priceCentsPerMonth: 450_000,
        },
      ],
    }
    expect(runwayWeeks(withCustomer)).toBeNull()
  })

  it('computes runway on cash plus savings from the net change of the last 4 weeks', () => {
    // Weeks 1 to 4: 270 fixed costs and 4 * 450 living costs from savings.
    const after = play(newGame(), 4, () => plan())
    expect(after.company.cashCents).toBe(859_500)
    expect(after.founder.savingsCents).toBe(1_155_000)
    expect(runwayWeeks(after)).toBe(Math.floor(((859_500 + 1_155_000) * 4) / 310_500))
    expect(getView(after).company.runwayWeeks).toBe(25)
  })

  it('is not changed by moving savings into the company', () => {
    const plain = play(newGame(), 5, () => plan())
    const moved = play(newGame(), 5, (s) =>
      plan({ transferToCompanyCents: s.week === 5 ? 750_000 : 0 }),
    )
    expect(runwayWeeks(moved)).toBe(runwayWeeks(plain))
  })

  it('treats a month as profitable when revenue covers fixed and living costs', () => {
    const week = (w: number, revenueCents: number): WeekLedger => ({
      week: w,
      revenueCents,
      fixedCostsCents: w % 4 === 0 ? 40_500 : 0,
      livingCostsCents: 67_500,
      founderDrawCents: 0,
      transferCents: 0,
      autoTransferCents: 0,
      adSpendCents: 0,
      otherCostsCents: 0,
      otherIncomeCents: 0,
      cashEndCents: 0,
      savingsEndCents: 0,
      monthlyRevenueCents: 0,
      customers: 0,
      runwayWeeks: null,
      energyEnd: 80,
      hours: { learning: 0, building: 0, selling: 0, admin: 0, rest: 0 },
    })
    const base = newGame()
    const monthCost = 40_500 + 4 * 67_500 // 207,000
    const enough = Math.ceil(monthCost / 4)
    const ledger = Array.from({ length: 8 }, (_, i) => week(i + 1, enough))
    expect(profitableForMonths({ ...base, ledger }, 2)).toBe(true)
    const short = ledger.map((l, i) => (i === 0 ? { ...l, revenueCents: 0 } : l))
    expect(profitableForMonths({ ...base, ledger: short }, 2)).toBe(false)
    expect(profitableForMonths({ ...base, ledger: ledger.slice(1) }, 2)).toBe(false)
  })
})
