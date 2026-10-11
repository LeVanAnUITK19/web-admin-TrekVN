import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import apiClient, { clearToken, getStoredToken, storeToken } from '@/services/api/client'

function unauthorized(config: InternalAxiosRequestConfig): never {
  throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    status: 401, statusText: 'Unauthorized', data: {}, headers: new AxiosHeaders(), config,
  })
}

const adapter: AxiosAdapter = async config => {
  if (config.headers.Authorization !== 'Bearer fresh') unauthorized(config)
  return { status: 200, statusText: 'OK', data: { ok: true }, headers: new AxiosHeaders(), config }
}

describe('API token refresh', () => {
  beforeEach(() => {
    clearToken()
    storeToken('expired', true)
    vi.stubGlobal('window', { location: { href: '/dashboard' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => { clearToken(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('shares one refresh across concurrent 401s and retries both with the new token', async () => {
    let complete!: (value: { data: { data: { accessToken: string } } }) => void
    const refresh = vi.spyOn(axios, 'post').mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
    const outcomes = Promise.all([apiClient.get('/one', { adapter }), apiClient.get('/two', { adapter })])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    complete({ data: { data: { accessToken: 'fresh' } } })
    expect((await outcomes).map(response => response.status)).toEqual([200, 200])
    expect(getStoredToken()).toBe('fresh')
    expect(localStorage.getItem('trekviet_access_token')).toBe('fresh')
    expect(refresh).toHaveBeenCalledWith(expect.stringContaining('/auth/refresh'), {}, {
      withCredentials: true, timeout: 15000,
    })
  })

  it('rejects every waiting request and clears the session if refresh fails', async () => {
    let fail!: (reason: Error) => void
    const refresh = vi.spyOn(axios, 'post').mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    const outcomes = Promise.allSettled([apiClient.get('/one', { adapter }), apiClient.get('/two', { adapter })])
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
    fail(new Error('Refresh expired'))
    expect((await outcomes).map(result => result.status)).toEqual(['rejected', 'rejected'])
    expect(getStoredToken()).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  it('does not refresh a rejected login', async () => {
    const refresh = vi.spyOn(axios, 'post')
    await expect(apiClient.post('/auth/login', {}, { adapter: async config => unauthorized(config) })).rejects.toMatchObject({ response: { status: 401 } })
    expect(refresh).not.toHaveBeenCalled()
  })

  it('retries each waiting request at most once if its refreshed token is still rejected', async () => {
    const refresh = vi.spyOn(axios, 'post').mockResolvedValue({ data: { data: { accessToken: 'fresh' } } })
    const outcomes = await Promise.allSettled([
      apiClient.get('/one', { adapter: async config => unauthorized(config) }),
      apiClient.get('/two', { adapter: async config => unauthorized(config) }),
    ])
    expect(outcomes.map(result => result.status)).toEqual(['rejected', 'rejected'])
    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
