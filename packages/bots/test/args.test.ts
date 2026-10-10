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
      jobs: expect.any(Number),
      parts: ['main', 'paired', 'inbox'],
      wideRuns: 1000,
    })
    expect(parseArgs(['--events']).events).toBe(true)
    expect(parseArgs(['--jobs', '4']).jobs).toBe(4)
    expect(parseArgs(['--events']).parts).toEqual(['main', 'paired', 'inbox', 'events'])
    expect(parseArgs(['--parts', 'main,inbox', '--wide-runs', '5000'])).toMatchObject({
      parts: ['main', 'inbox'],
      wideRuns: 5000,
      events: false,
    })
    expect(() => parseArgs(['--parts', 'main,everything'])).toThrow()
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
