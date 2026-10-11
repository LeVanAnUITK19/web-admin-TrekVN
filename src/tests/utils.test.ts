import { describe, it, expect } from 'vitest'
import { formatNumber, truncate, getInitials, buildQueryString } from '@/lib/utils'

describe('formatNumber', () => {
  it('formats integers with Vietnamese locale', () => {
    expect(formatNumber(12548)).toBe('12.548')
  })
  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('truncate', () => {
  it('returns original string if within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })
  it('truncates and appends ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...')
  })
})

describe('getInitials', () => {
  it('returns two uppercase initials', () => {
    expect(getInitials('Nguyễn Văn An')).toBe('NV')
  })
  it('handles single word', () => {
    expect(getInitials('Admin')).toBe('A')
  })
})

describe('buildQueryString', () => {
  it('builds query string from params', () => {
    const qs = buildQueryString({ page: 1, limit: 10, search: 'test' })
    expect(qs).toContain('page=1')
    expect(qs).toContain('limit=10')
    expect(qs).toContain('search=test')
  })
  it('omits undefined and empty string values', () => {
    const qs = buildQueryString({ page: 1, search: '', status: undefined })
    expect(qs).toContain('page=1')
    expect(qs).not.toContain('search')
    expect(qs).not.toContain('status')
  })
  it('returns empty string when all values filtered', () => {
    expect(buildQueryString({ a: undefined, b: '' })).toBe('')
  })
})
