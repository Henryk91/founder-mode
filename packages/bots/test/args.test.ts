import { describe, expect, it } from 'vitest'
import { parseArgs } from '../src/args'

describe('parseArgs', () => {
  it('reads runs and seed prefix', () => {
    expect(parseArgs(['--runs', '1000', '--seed-prefix', 'test'])).toEqual({
      runs: 1000,
      seedPrefix: 'test',
    })
  })

  it('rejects a non numeric run count', () => {
    expect(() => parseArgs(['--runs', 'lots'])).toThrow()
  })
})
