import { describe, expect, it } from 'vitest'
import { endWeek, getView, validatePlan } from '../src/index'
import { Rng } from '../src/rng'
import { issueInvoices } from '../src/systems/invoices'
import type { GameState, Invoice } from '../src/types'
import { newGame, plan, quietKantino } from './helpers'
import { customer } from './helpers2'

const quiet = (seed = 'inv') => newGame(seed, quietKantino())

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: 'invoice_1',
  customerId: 'customer_1',
  customerName: 'Kunde customer_1',
  segmentId: 'small_offices',
  amountCents: 30_000,
  issuedWeek: 4,
  dueWeek: 6,
  paidWeek: null,
  writtenOffWeek: null,
  ...over,
})

/** A game at `week` with one open invoice that is paid in `payWeek` (null: never). */
function withInvoice(week: number, payWeek: number | null, over: Partial<Invoice> = {}): GameState {
  const s = quiet(`inv-${week}-${payWeek}`)
  const inv = invoice(over)
  return {
    ...s,
    week,
    customers: [customer('customer_1')],
    invoices: [inv],
    hidden: { ...s.hidden, payWeeks: { [inv.id]: payWeek } },
  }
}

const book = plan()

describe('invoices', () => {
  it('are issued to every active customer at month end, due in 14 days', () => {
    let s = { ...quiet(), customers: [customer('customer_1', 'small_offices', 1)] }
    for (let i = 0; i < 4; i++) s = endWeek(s, book).state
    expect(s.invoices).toHaveLength(1)
    expect(s.invoices[0]).toMatchObject({ issuedWeek: 4, dueWeek: 6, amountCents: 30_000 })
  })

  it('pay late by the segment mean, uniformly from 0 to twice the mean, or never', () => {
    const lateness = (segmentId: string) => {
      const base = quiet(`late-${segmentId}`)
      const customers = Array.from({ length: 600 }, (_, i) => customer(`customer_${i}`, segmentId))
      const { state } = issueInvoices({ ...base, week: 4, customers }, new Rng(base.rng))
      const weeks = state.invoices
        .map((i) => state.hidden.payWeeks[i.id])
        .filter((w): w is number => w !== null && w !== undefined)
        .map((w) => w - 4)
      const never = 1 - weeks.length / state.invoices.length
      return { mean: weeks.reduce((a, b) => a + b, 0) / weeks.length, never }
    }
    const small = lateness('small_offices')
    const coworking = lateness('coworking')
    const medical = lateness('medical')
    expect(medical.mean).toBeGreaterThan(coworking.mean)
    expect(coworking.mean).toBeGreaterThan(small.mean)
    // Due after 2 weeks, plus on average mean/7 weeks (rounded up), plus about half a week.
    expect(small.mean).toBeGreaterThan(2.5)
    expect(small.mean).toBeLessThan(4)
    expect(medical.never).toBeGreaterThan(small.never)
    expect(small.never).toBeCloseTo(0.05, 1)
    expect(medical.never).toBeCloseTo(0.08, 1)
  })

  it('bring the money in only in the week they are paid, never before', () => {
    const s = withInvoice(7, 8)
    const early = endWeek(s, book)
    expect(early.report.ledger.revenueCents).toBe(0)
    expect(early.state.invoices[0]!.paidWeek).toBeNull()
    const paid = endWeek(early.state, book)
    expect(paid.report.ledger.revenueCents).toBe(30_000)
    expect(paid.report.entries).toContainEqual({
      kind: 'revenue',
      amountCents: 30_000,
      customers: 1,
    })
    expect(paid.state.invoices[0]!.paidWeek).toBe(8)
    // Week 8 is also a month end, so the fixed costs go out in the same week.
    expect(paid.state.company.cashCents).toBe(
      early.state.company.cashCents + 30_000 - paid.report.ledger.fixedCostsCents,
    )
  })

  it('show an unpaid invoice as overdue after its due week, never revealing a never payer', () => {
    const open = getView(withInvoice(6, 9))
    expect(open.invoices[0]).toMatchObject({ status: 'open', canChase: false, overdueWeeks: 0 })
    const late = getView(withInvoice(9, null))
    expect(late.invoices[0]).toMatchObject({ status: 'overdue', canChase: true, overdueWeeks: 3 })
    expect(late.receivablesCents).toBe(30_000)
    expect(JSON.stringify(late)).not.toContain('payWeek')
  })

  it('are chased only when overdue, and only once', () => {
    const s = withInvoice(9, 12)
    expect(validatePlan(s, plan({ chase: ['invoice_1'] }))).toEqual([])
    expect(validatePlan(s, plan({ chase: ['invoice_1', 'invoice_1'] }))).toEqual([
      { code: 'invalid_chase', invoiceId: 'invoice_1' },
    ])
    expect(validatePlan(s, plan({ chase: ['invoice_9'] }))).toEqual([
      { code: 'invalid_chase', invoiceId: 'invoice_9' },
    ])
    expect(validatePlan(withInvoice(5, 12), plan({ chase: ['invoice_1'] }))).toHaveLength(1)
    expect(endWeek(s, plan({ chase: ['invoice_1'] })).report.plannedHours).toBe(1)
  })

  it('get paid the following week about 30% of the time when chased', () => {
    let paidNext = 0
    let paidPlain = 0
    for (let i = 0; i < 400; i++) {
      const base = { ...withInvoice(9, 15), rng: newGame(`chase${i}`).rng }
      if (
        endWeek(endWeek(base, plan({ chase: ['invoice_1'] })).state, book).state.invoices[0]!
          .paidWeek === 10
      )
        paidNext++
      if (endWeek(endWeek(base, book).state, book).state.invoices[0]!.paidWeek === 10) paidPlain++
    }
    expect(paidPlain).toBe(0)
    expect(paidNext / 400).toBeCloseTo(0.3, 1)
  })

  it('are not helped by chasing when the customer never pays', () => {
    for (let i = 0; i < 40; i++) {
      const base = { ...withInvoice(9, null), rng: newGame(`never${i}`).rng }
      const r = endWeek(endWeek(base, plan({ chase: ['invoice_1'] })).state, book)
      expect(r.state.invoices[0]!.paidWeek).toBeNull()
    }
  })

  it('are written off 12 weeks after they were due', () => {
    let s = withInvoice(17, null)
    const before = endWeek(s, book)
    expect(before.state.invoices[0]!.writtenOffWeek).toBeNull()
    s = { ...before.state }
    const r = endWeek(s, book)
    expect(r.state.invoices[0]!.writtenOffWeek).toBe(18)
    expect(r.report.entries).toContainEqual({
      kind: 'invoice_written_off',
      amountCents: 30_000,
      name: 'Kunde customer_1',
    })
    expect(getView(r.state).invoices[0]!.status).toBe('written_off')
    expect(getView(r.state).receivablesCents).toBe(0)
  })
})
