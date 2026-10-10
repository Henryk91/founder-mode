import { describe, expect, it } from 'vitest'
import { parseArgs } from '../src/args'

describe('parseArgs', () => {
  it('reads runs and seed prefix', () => {
    expect(parseArgs(['--runs', '1000', '--seed-prefix', 'test'])).toEqual({
      runs: 1000,
      seedPrefix: 'test',
      out: 'docs/balancing.md',
      only: [],
      events: false,
      scenario: null,
      desk: false,
    })
    expect(parseArgs(['--events']).events).toBe(true)
  })

  it('reads the scenario to run', () => {
    expect(parseArgs(['--scenario', 'kantino']).scenario).toBe('kantino')
    expect(parseArgs(['--desk']).desk).toBe(true)
  })

  it('reads the output path and a strategy filter', () => {
    expect(parseArgs(['--out', '-', '--only', 'random,playtest'])).toMatchObject({
      out: '-',
      only: ['random', 'playtest'],
    })
  })

  it('rejects a non numeric run count', () => {
    expect(() => parseArgs(['--runs', 'lots'])).toThrow()
  })
})
