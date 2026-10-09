import { describe, expect, it } from 'vitest'
import { endWeek, getView } from '../src/index'
import {
  applyFinanceWeek,
  privateMoneyInCents,
  profitableForMonths,
  runwayWeeks,
} from '../src/systems/finance'
import type { GameState, WeekLedger } from '../src/types'
import { newGame, plan, play } from './helpers'

const withMoney = (s: GameState, cashCents: number, savingsCents: number, week = s.week) => ({
  ...s,
  week,
  company: { ...s.company, cashCents },
  founder: { ...s.founder, savingsCents },
})

describe('finance', () => {
  it('takes living costs from savings every week', () => {
    const { ledger, state } = applyFinanceWeek(newGame(), plan())
    expect(ledger.livingCostsCents).toBe(45_000)
    expect(state.founder.savingsCents).toBe(1_155_000)
    expect(state.company.cashCents).toBe(1_500_000)
  })

  it('charges fixed costs only at month end, every 4th week', () => {
    let s = newGame()
    const fixed: number[] = []
    for (let i = 0; i < 8; i++) {
      const r = endWeek(s, plan())
      fixed.push(r.report.ledger.fixedCostsCents)
      s = r.state
    }
    expect(fixed).toEqual([0, 0, 0, 27_000, 0, 0, 0, 27_000])
    expect(s.company.cashCents).toBe(1_500_000 - 2 * 27_000)
  })

  it('moves a planned transfer from savings into the company', () => {
    const { state, ledger } = applyFinanceWeek(newGame(), plan({ transferToCompanyCents: 200_000 }))
    expect(ledger.transferCents).toBe(200_000)
    expect(state.company.cashCents).toBe(1_700_000)
    expect(state.founder.savingsCents).toBe(1_200_000 - 200_000 - 45_000)
  })

  it('draws living costs from the company when savings run out', () => {
    const { state, ledger } = applyFinanceWeek(withMoney(newGame(), 100_000, 10_000), plan())
    expect(ledger.founderDrawCents).toBe(35_000)
    expect(state.founder.savingsCents).toBe(0)
    expect(state.company.cashCents).toBe(65_000)
  })

  it('covers negative company cash from savings automatically', () => {
    const { state, ledger } = applyFinanceWeek(withMoney(newGame(), 10_000, 100_000, 4), plan())
    // 10,000 - 27,000 fixed = -17,000, covered from savings left after living costs
    expect(ledger.autoTransferCents).toBe(17_000)
    expect(state.company.cashCents).toBe(0)
    expect(state.founder.savingsCents).toBe(100_000 - 45_000 - 17_000)
  })

  it('reports and logs every move between savings and company', () => {
    // Savings 50,000: transfer 20,000, living costs take the remaining 30,000 and the company
    // pays 15,000. Month end fixed costs of 27,000 push cash from 5,000 to -22,000, but savings
    // are empty, so there is no top up.
    const s = withMoney(newGame(), 0, 50_000, 4)
    const { state, report } = endWeek(s, plan({ transferToCompanyCents: 20_000 }))
    expect(report.entries).toEqual([
      { kind: 'savings_transfer', amountCents: 20_000 },
      { kind: 'founder_draw', amountCents: 15_000 },
    ])
    expect(state.eventLog).toEqual([
      { kind: 'savings_transfer', week: 4, amountCents: 20_000 },
      { kind: 'founder_draw', week: 4, amountCents: 15_000 },
    ])
  })

  it('reports and logs an automatic top up', () => {
    const { report, state } = endWeek(withMoney(newGame(), 10_000, 100_000, 4), plan())
    expect(report.entries).toEqual([{ kind: 'auto_top_up', amountCents: 17_000 }])
    expect(state.eventLog).toEqual([{ kind: 'auto_top_up', week: 4, amountCents: 17_000 }])
  })

  it('has no entries in a quiet week', () => {
    expect(endWeek(newGame(), plan()).report.entries).toEqual([])
  })

  it('totals the private money put in, manual and automatic, but not founder draws', () => {
    // Little cash and plenty of savings: cash runs dry first (top ups), then savings (draws).
    const s = play(withMoney(newGame('private'), 30_000, 700_000), 200, (x) =>
      plan({ transferToCompanyCents: x.week === 2 ? 10_000 : 0 }),
    )
    expect(s.ending).toBe('bankrupt')
    const sum = (kind: string) =>
      s.eventLog.reduce(
        (t, e) => (e.kind === kind && 'amountCents' in e ? t + e.amountCents : t),
        0,
      )
    expect(sum('savings_transfer')).toBe(10_000)
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
      for (const v of Object.values(l)) expect(Number.isInteger(v)).toBe(true)
    }
  })

  it('computes runway from the operating burn of the last 4 weeks', () => {
    const s = newGame()
    expect(runwayWeeks(s)).toBeNull()
    // Weeks 1 to 4: one month of fixed costs (27,000), no draws. Burn 6,750 a week.
    const after = play(s, 4, () => plan())
    expect(after.company.cashCents).toBe(1_473_000)
    expect(runwayWeeks(after)).toBe(Math.floor(1_473_000 / 6_750))
    expect(getView(after).company.runwayWeeks).toBe(218)
  })

  it('treats a month as profitable when revenue covers fixed and living costs', () => {
    const week = (w: number, revenueCents: number): WeekLedger => ({
      week: w,
      revenueCents,
      fixedCostsCents: w % 4 === 0 ? 27_000 : 0,
      livingCostsCents: 45_000,
      founderDrawCents: 0,
      transferCents: 0,
      autoTransferCents: 0,
      cashEndCents: 0,
      savingsEndCents: 0,
    })
    const base = newGame()
    const monthCost = 27_000 + 4 * 45_000 // 207,000
    const enough = Math.ceil(monthCost / 4)
    const ledger = Array.from({ length: 8 }, (_, i) => week(i + 1, enough))
    expect(profitableForMonths({ ...base, ledger }, 2)).toBe(true)
    const short = ledger.map((l, i) => (i === 0 ? { ...l, revenueCents: 0 } : l))
    expect(profitableForMonths({ ...base, ledger: short }, 2)).toBe(false)
    expect(profitableForMonths({ ...base, ledger: ledger.slice(1) }, 2)).toBe(false)
  })
})
