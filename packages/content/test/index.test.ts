import { describe, expect, it } from 'vitest'
import { SCENARIO_IDS } from '../src/index'

describe('content', () => {
  it('lists the Kantino scenario', () => {
    expect(SCENARIO_IDS).toContain('kantino')
  })
})
