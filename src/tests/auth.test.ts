import { describe, it, expect, beforeEach } from 'vitest'

// Unit tests for auth token helpers (pure functions, no React)
import { storeToken, getStoredToken, clearToken } from '@/services/api/client'

describe('auth token storage', () => {
  beforeEach(() => {
    clearToken()
  })

  it('stores token in sessionStorage by default', () => {
    storeToken('test_token_123', false)
    expect(getStoredToken()).toBe('test_token_123')
  })

  it('stores token in localStorage when persistent', () => {
    storeToken('persistent_token', true)
    expect(getStoredToken()).toBe('persistent_token')
  })

  it('returns null after clearing', () => {
    storeToken('some_token')
    clearToken()
    expect(getStoredToken()).toBeNull()
  })

  it('replaces the session token when switching to persistent storage', () => {
    storeToken('old-session')
    storeToken('new-persistent', true)
    expect(getStoredToken()).toBe('new-persistent')
    expect(sessionStorage.getItem('trekviet_access_token')).toBeNull()
  })

  it('removes a previous persistent token when remember me is disabled', () => {
    storeToken('old-persistent', true)
    storeToken('new-session')
    expect(getStoredToken()).toBe('new-session')
    expect(localStorage.getItem('trekviet_access_token')).toBeNull()
  })
})
