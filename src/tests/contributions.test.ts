import { describe, it, expect } from 'vitest'
import { mockContributions } from '@/mocks/contributions'

describe('mockContributions', () => {
  it('has at least one PENDING_REVIEW contribution', () => {
    const pending = mockContributions.filter((c) => c.status === 'PENDING_REVIEW')
    expect(pending.length).toBeGreaterThan(0)
  })

  it('has both ROUTE_SUBMISSION and PLACE_SUGGESTION types', () => {
    const types = new Set(mockContributions.map((c) => c.type))
    expect(types.has('ROUTE_SUBMISSION')).toBe(true)
    expect(types.has('PLACE_SUGGESTION')).toBe(true)
  })

  it('all contributions have a contributor with name and email', () => {
    mockContributions.forEach((c) => {
      expect(c.contributor.name).toBeTruthy()
      expect(c.contributor.email).toBeTruthy()
    })
  })

  it('ROUTE_SUBMISSION entries have routeSubmission data', () => {
    const routes = mockContributions.filter((c) => c.type === 'ROUTE_SUBMISSION')
    routes.forEach((c) => {
      expect(c.routeSubmission).toBeDefined()
      expect(c.routeSubmission?.suggestedName).toBeTruthy()
    })
  })

  it('PLACE_SUGGESTION entries have placeSuggestion data', () => {
    const places = mockContributions.filter((c) => c.type === 'PLACE_SUGGESTION')
    places.forEach((c) => {
      expect(c.placeSuggestion).toBeDefined()
      expect(c.placeSuggestion?.suggestedName).toBeTruthy()
    })
  })
})
