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
      parts: ['main', 'paired', 'inbox', 'price', 'freelance'],
      wideRuns: 1000,
      freelance: [],
    })
    expect(parseArgs(['--events']).events).toBe(true)
    expect(parseArgs(['--jobs', '4']).jobs).toBe(4)
    expect(parseArgs(['--events']).parts).toEqual([
      'main',
      'paired',
      'inbox',
      'price',
      'freelance',
      'events',
    ])
    expect(parseArgs(['--freelance', 'developer:20:0,salesperson:10::8']).freelance).toEqual([
      { role: 'developer', hours: 20, eurPerHour: 0, weeks: null },
      { role: 'salesperson', hours: 10, eurPerHour: null, weeks: 8 },
    ])
    expect(() => parseArgs(['--freelance', 'designer:20'])).toThrow()
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
