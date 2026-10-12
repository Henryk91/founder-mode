import { describe, expect, it } from 'vitest'
import { getView } from '../src/index'
import { Rng } from '../src/rng'
import { applyFinanceWeek, netChangeCents, noExtras, runwayWeeks } from '../src/systems/finance'
import type { GameState, Invoice, WeekLedger } from '../src/types'
import { newGame, plan } from './helpers'

/** A played week's ledger: only the money that moved matters to runway. */
const week = (w: number, money: Partial<WeekLedger> = {}): WeekLedger => ({
  week: w,
  revenueCents: 0,
  fixedCostsCents: 0,
  freelanceCents: 0,
  livingCostsCents: 67_500,
  founderDrawCents: 0,
  transferCents: 0,
  autoTransferCents: 0,
  adSpendCents: 0,
  otherCostsCents: 0,
  otherIncomeCents: 0,
  investmentCents: 0,
  cashEndCents: 0,
  savingsEndCents: 0,
  monthlyRevenueCents: 0,
  customers: 0,
  runwayWeeks: null,
  energyEnd: 80,
  hours: { learning: 0, building: 0, selling: 0, admin: 0, rest: 0 },
  ...money,
})

/** A game after `ledger` was played, with this cash and savings. */
const after = (ledger: WeekLedger[], cashCents: number, savingsCents = 0): GameState => {
  const s = newGame('runway')
  return {
    ...s,
    week: ledger.at(-1)!.week + 1,
    ledger: [...s.ledger, ...ledger],
    company: { ...s.company, cashCents },
    founder: { ...s.founder, savingsCents },
  }
}

describe('runway', () => {
  it("does not promise 188 weeks to a company with 2,125 EUR left (the player's week 34)", () => {
    // Weeks 31 to 34 in Kantino: living costs every week, fixed costs at the month end in week
    // 32, money received in weeks 32 to 34 that nearly covers it all; 45 EUR short in the month.
    const ledger = [
      week(31),
      week(32, { fixedCostsCents: 40_500, revenueCents: 135_000 }),
      week(33, { revenueCents: 126_000 }),
      week(34, { revenueCents: 45_000, founderDrawCents: 67_500 }),
    ]
    expect(ledger.reduce((t, l) => t + netChangeCents(l), 0)).toBe(-4_500)
    const s = after(ledger, 212_500)
    // 2,125 EUR at 45 EUR a month would be 188 weeks; the run has 26 left after week 34.
    expect(Math.floor((212_500 * 4) / 4_500)).toBe(188)
    expect(runwayWeeks(s)).toBe(26)
    expect(getView(s).company.runwayWeeks).toBe(26)
  })

  it('counts a written off invoice as nothing received', () => {
    const s0 = newGame('write-off')
    const invoice: Invoice = {
      id: 'invoice_1',
      customerId: 'customer_1',
      customerName: 'Wasserturm Studios',
      segmentId: 'coworking',
      amountCents: 45_000,
      issuedWeek: 8,
      dueWeek: 10,
      paidWeek: null,
      writtenOffWeek: null,
    }
    const s: GameState = {
      ...s0,
      week: 18,
      invoices: [invoice],
      hidden: { ...s0.hidden, payWeeks: { invoice_1: null } },
    }
    const r = applyFinanceWeek(s, plan(), noExtras(), new Rng(s.rng))
    expect(r.writtenOff.map((i) => i.id)).toEqual(['invoice_1'])
    expect(r.ledger.revenueCents).toBe(0)
    expect(netChangeCents(r.ledger)).toBe(-67_500)
  })

  it('keeps counting living costs once savings have run out and cash pays them', () => {
    const s0 = newGame('savings-out')
    const s = {
      ...s0,
      company: { ...s0.company, cashCents: 500_000 },
      founder: { ...s0.founder, savingsCents: 20_000 },
    }
    const r = applyFinanceWeek(s, plan(), noExtras(), new Rng(s.rng))
    expect(r.state.founder.savingsCents).toBe(0)
    expect(r.ledger.founderDrawCents).toBe(47_500)
    // The draw only moves money from the company to the founder: living costs count once.
    expect(netChangeCents(r.ledger)).toBe(-67_500)
    const ledger = [week(5), week(6), week(7), week(8, { fixedCostsCents: 40_500 })]
    // 3,105 EUR a month gone: 5,000 EUR lasts 6 weeks.
    expect(runwayWeeks(after(ledger, 500_000))).toBe(Math.floor((500_000 * 4) / 310_500))
  })

  it('says Covered (null) when the last four weeks received at least what they paid', () => {
    const ledger = [
      week(9),
      week(10, { revenueCents: 200_000 }),
      week(11),
      week(12, { fixedCostsCents: 40_500, revenueCents: 120_000 }),
    ]
    const s = after(ledger, 100_000)
    expect(runwayWeeks(s)).toBeNull()
    expect(getView(s).company.runwayWeeks).toBeNull()
  })

  it('never shows more weeks than are left, and none at the end', () => {
    const ledger = [week(57), week(58), week(59), week(60, { fixedCostsCents: 40_500 })]
    expect(runwayWeeks(after(ledger, 10_000_000))).toBe(0)
    const early = [week(1), week(2), week(3), week(4, { fixedCostsCents: 40_500 })]
    expect(runwayWeeks(after(early, 100_000_000))).toBe(56)
  })
})
