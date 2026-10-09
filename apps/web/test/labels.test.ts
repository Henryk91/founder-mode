import { describe, expect, it } from 'vitest'
import { label } from '../src/labels'

describe('labels', () => {
  it('returns the same plain label at every stage', () => {
    expect(label('app.title', 'scrappy')).toBe(label('app.title', 'organised'))
  })
})
