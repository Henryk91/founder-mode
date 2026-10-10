import { describe, expect, it } from 'vitest'
import type { LeadView } from '@founder-mode/engine'
import { leadSource } from '../src/screens/Pipeline'
import { sourceName } from '../src/screens/PostMortem'

const lead = (over: Partial<LeadView>): LeadView => ({
  id: 'lead_1',
  name: 'Elektro Brandl',
  segmentId: 'small_crews',
  stage: 'lead',
  weeksInStage: 0,
  lastContactWeek: 1,
  silent: false,
  lostReason: null,
  canBookDemo: false,
  canFollowUp: true,
  source: 'outreach',
  walkInFrom: null,
  channel: null,
  referredBy: null,
  ...over,
})

describe('lead sources', () => {
  it('say on the card how every lead was found', () => {
    expect(leadSource(lead({ channel: 'in_person' }), 'scrappy')).toBe('Met in person')
    expect(leadSource(lead({ channel: 'cold_email' }), 'scrappy')).toBe('Answered a cold email')
    expect(leadSource(lead({ source: 'landing' }), 'scrappy')).toBe('Signed up on a landing page')
    expect(leadSource(lead({ source: 'presale' }), 'scrappy')).toBe('Said yes to a pre-sale')
    expect(leadSource(lead({ source: 'inbox' }), 'scrappy')).toBe('Came through a message')
    expect(leadSource(lead({ source: 'team', channel: 'phone' }), 'scrappy')).toBe(
      'Found by your salesperson',
    )
    expect(
      leadSource(lead({ source: 'walk_in', walkInFrom: 'Desk in a trades yard' }), 'scrappy'),
    ).toBe('Walked in at the desk in a trades yard')
    expect(leadSource(lead({ source: 'referral', referredBy: 'Sanitär Huber' }), 'scrappy')).toBe(
      'Recommended by Sanitär Huber',
    )
  })

  it('name every post-mortem source, referrals as their own', () => {
    expect(sourceName('outreach:phone', 'scrappy')).toBe('Phone')
    expect(sourceName('team:in_person', 'scrappy')).toBe('Your salesperson, in person')
    expect(sourceName('referral', 'scrappy')).toBe('Recommendations')
    expect(sourceName('walk_in', 'scrappy')).toBe('Walk-ins')
    expect(sourceName('landing', 'scrappy')).toBe('Landing tests')
  })
})
