import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { createGame, getView } from '@founder-mode/engine'
import { thingsThatNeedYou } from '../src/screens/Inbox'
import { entryText } from '../src/screens/Results'
import { priceSteps } from '../src/steps'
import { label, voiceOf } from '../src/labels'

const view = getView(createGame(loadScenario('kantino'), 'screens-words'))

describe('Plan 8 batch 1 screens', () => {
  it('K6: demos booked in the plan no longer need you', () => {
    const lead = {
      id: 'lead_1',
      name: 'Kanzlei Rautenberg',
      segmentId: 'small_offices',
      stage: 'demo' as const,
      weeksInStage: 0,
      lastContactWeek: 1,
      silent: false,
      lostReason: null,
      canBookDemo: true,
      canFollowUp: false,
      source: 'outreach' as const,
      walkInFrom: null,
      channel: 'phone' as const,
      referredBy: null,
      foundBy: null,
      deposit: null,
    }
    const v = { ...view, leads: [lead] }
    const text = (booked: string[]) =>
      thingsThatNeedYou(v, 10, 'scrappy', booked).map((n) => n.text)
    expect(text([]).some((t) => t.includes('demo'))).toBe(true)
    expect(text(['lead_1']).some((t) => t.includes('demo'))).toBe(false)
  })

  it('finding 9: deposits of new bookings are not "paid on the day"', () => {
    const text = entryText(
      {
        kind: 'guests_served',
        units: 2,
        revenueCents: 347_000,
        newDepositsCents: 100_000,
        commissionCents: 0,
      },
      view,
    )
    expect(text).toContain('2 guests served')
    expect(text).toContain('€2,470')
    expect(text).toContain('Deposits for new bookings came in as well: €1,000')
  })

  it('K7: the report names an accepted offer and its start week', () => {
    const text = entryText(
      { kind: 'hire_agreed', name: 'Aylin Demir', role: 'developer', startWeek: 11 },
      view,
    )
    expect(text).toBe('Aylin Demir accepted your offer and starts in week 11.')
  })

  it('S-02: steps scale with the amount', () => {
    expect(priceSteps(500_000).step).toBeGreaterThanOrEqual(10_000)
    expect(priceSteps(8_500).step).toBeLessThan(priceSteps(500_000).step)
    expect(label('inbox.ignored', 'scrappy', { choice: 'Pay', cost: '€600' })).toContain('€600')
  })
})

describe('Plan 8 batch 1: roster preview with hires', () => {
  it('H-05: a contract signed in the plan counts towards what the roster covers', async () => {
    const { coverage } = await import('../src/components/TourismPlan')
    const { noBookings } = await import('../src/store')
    const game = getView(createGame(loadScenario('hinterhof'), 'h05'))
    const b = game.bookings!
    const role = b.roles.find((r) => r.contracts.length > 0 && r.kind === 'kitchen')!
    const product = Object.keys(role.units).find((id) => (role.units[id] ?? 0) > 0)!
    const fake = {
      ...b,
      products: b.products.map((p) =>
        p.id === product ? { ...p, shipped: true, capacity: 500 } : p,
      ),
      thisWeek: [{ productId: product, booked: 10 }],
    }
    const base = noBookings()
    const without = coverage(fake, base)[0]!
    const withHire = coverage(fake, {
      ...base,
      hire: [{ roleId: role.id, kind: role.contracts[0]!.kind }],
    })[0]!
    expect(withHire.kitchen).toBeGreaterThan(without.kitchen)
  })
})

describe('Plan 8 batch 2 wording', () => {
  it('R-06: a strict policy cancellation says how much was kept', () => {
    const text = entryText(
      { kind: 'bookings_cancelled', units: 7, kept: true, keptCents: 210_000 },
      view,
    )
    expect(text).toContain('7 guests cancelled and paid anyway')
    expect(text).toContain('€2,100 kept')
  })

  it('finding 14: the lease says what is paid when', () => {
    const text = label('asset.terms.lease', 'scrappy', {
      season: '€110,000',
      months: 'May to October',
      min: 6,
      upfront: '€16,500',
      crew: '€1,800',
    })
    expect(text).toContain('€16,500 is paid when you sign')
    expect(text).toContain('€1,800 a week used')
  })

  it('finding 15: the tourism notice names no sales pipeline', () => {
    const tourism = getView(createGame(loadScenario('hinterhof'), 'words'))
    const voice = voiceOf({ scenarioId: tourism.scenarioId, company: { uiStage: 'organised' } })
    const text = label('results.organised.text', voice)
    expect(text).not.toMatch(/pipeline|demo|trial/i)
    expect(label('results.organised.text', 'organised')).toContain(
      'Who pays tab is now called Pipeline',
    )
  })
})
