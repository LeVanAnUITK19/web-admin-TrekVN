import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, renderHook, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import apiClient from '@/services/api/client'
import { useUpdateBadge } from './useBadges'

vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/constants', async importOriginal => ({ ...await importOriginal<typeof import('@/constants')>(), IS_MOCK_MODE: false }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('status-only toggles make one request and do not send an empty update', async () => {
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { data: { id: 'b1', status: 'INACTIVE' } } })
  const qc = new QueryClient()
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useUpdateBadge(), { wrapper })
  await act(async () => { await result.current.mutateAsync({ id: 'b1', data: { status: 'DISABLED' } }) })
  expect(apiClient.patch).toHaveBeenCalledTimes(1)
  expect(apiClient.patch).toHaveBeenCalledWith('/admin/badges/b1/status', { status: 'INACTIVE' })
  qc.clear()
})

it('condition edits preserve the selected unit and return the updated status', async () => {
  vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: { data: { id: 'b1', status: 'ACTIVE' } } })
    .mockResolvedValueOnce({ data: { data: { id: 'b1', status: 'INACTIVE' } } })
  const qc = new QueryClient()
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  const { result } = renderHook(() => useUpdateBadge(), { wrapper })
  const condition = { type: 'DISTANCE_TOTAL' as const, value: 5, unit: 'KILOMETERS' as const }
  let saved
  await act(async () => { saved = await result.current.mutateAsync({ id: 'b1', data: { condition, status: 'INACTIVE' } }) })
  expect(apiClient.patch).toHaveBeenNthCalledWith(1, '/admin/badges/b1', { condition })
  expect(saved).toMatchObject({ status: 'INACTIVE' })
  qc.clear()
})
