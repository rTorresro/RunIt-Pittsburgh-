import { describe, expect, it } from 'vitest'
import { formatPosition } from './time.js'

describe('formatPosition', () => {
  it('formats ordinal values', () => {
    expect(formatPosition(0)).toBe('1st')
    expect(formatPosition(1)).toBe('2nd')
    expect(formatPosition(2)).toBe('3rd')
    expect(formatPosition(3)).toBe('4th')
    expect(formatPosition(10)).toBe('11th')
  })
})
