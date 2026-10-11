import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { createGame, getView, type LeadView } from '@founder-mode/engine'
import { lostText } from '../src/screens/Pipeline'
import { entryText } from '../src/screens/Results'

const view = getView(createGame(loadScenario('kantino'), 'price-words'))

const lost = (lostReason: LeadView['lostReason']): LeadView => ({
  id: 'lead_1',
  name: 'Kanzlei Rautenberg',
  segmentId: 'small_offices',
  stage: 'lost',
  weeksInStage: 0,
  lastContactWeek: 1,
  silent: false,
  lostReason,
  canBookDemo: false,
  canFollowUp: false,
  source: 'outreach',
  walkInFrom: null,
  channel: 'phone',
  referredBy: null,
})

describe('price in words', () => {
  it('says on the lost list when a trial ended over the price', () => {
    expect(lostText(lost('price'), 'scrappy')).toBe('Too expensive')
    expect(lostText(lost('declined'), 'scrappy')).toBe('Said no')
  })

  it('tells the week results why a trial said no and why a customer left', () => {
    const declined = entryText(
      {
        kind: 'lead_update',
        change: 'declined_price',
        leadId: 'lead_1',
        name: 'Kanzlei Rautenberg',
        segmentId: 'small_offices',
      },
      view,
    )
    expect(declined).toContain('Kanzlei Rautenberg')
    expect(declined).toContain('price')
    const churned = (overPrice: boolean) =>
      entryText(
        {
          kind: 'customer_churned',
          customerId: 'customer_1',
          name: 'Kanzlei Rautenberg',
          segmentId: 'small_offices',
          overPrice,
        },
        view,
      )
    expect(churned(true)).toContain('costs more')
    expect(churned(false)).toBe('Kanzlei Rautenberg cancelled.')
  })
})

describe('budget quotes', () => {
  it('fill in the rough figure in euros', async () => {
    const { budgetText } = await import('../src/screens/Market')
    expect(budgetText({ quote: 'We pay about {amount} a month.', amountCents: 200_000 })).toBe(
      'We pay about €2,000 a month.',
    )
  })
})
