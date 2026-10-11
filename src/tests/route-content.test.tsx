import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import apiClient from '@/services/api/client'
import { useCreateRoute, useUpdateRoute } from '@/features/trekking/routes/useRoutes'

vi.mock('@/constants', async (importOriginal) => ({ ...await importOriginal<typeof import('@/constants')>(), IS_MOCK_MODE: false }))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const raw = { trekkingRouteId: 'r', trekkingPlaceId: 'p', name: 'Cột điện', description: 'Leo lên đỉnh',
  difficulty: 'HARD', distanceMeters: 3250, estimatedDurationMinutes: 200, maxElevation: 986, status: 'ACTIVE' }
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>{children}</QueryClientProvider>
}
beforeEach(() => { vi.mocked(apiClient.get).mockResolvedValue({ data: { data: raw } }) })
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('creation sends metres, saves route photo separately, and returns the uploaded URL', async () => {
  const photo = new File(['photo'], 'route.jpg', { type: 'image/jpeg' })
  const path = { type: 'LineString' as const, coordinates: [[106.16, 11.38], [106.17, 11.39]] as [number, number][] }
  vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { data: raw } })
    .mockResolvedValueOnce({ data: { data: { ...raw, path, imageUrl: 'https://cdn.example/route.jpg' } } })
  const { result } = renderHook(() => useCreateRoute(), { wrapper })
  let saved
  await act(async () => { saved = await result.current.mutateAsync({ name: raw.name, placeId: 'p', description: raw.description,
    difficulty: 'HARD', distance: 3.25, estimatedDuration: 200, maxElevation: 986, path, imageFile: photo }) })
  expect(apiClient.post).toHaveBeenNthCalledWith(1, '/admin/trekking/routes', expect.objectContaining({
    distanceMeters: 3250, maxElevation: 986, path, trekkingPlaceId: 'p',
  }))
  const upload = vi.mocked(apiClient.post).mock.calls[1]
  expect(upload[0]).toBe('/admin/trekking/routes/r/image')
  expect((upload[1] as FormData).get('image')).toBe(photo)
  expect(saved).toMatchObject({ distance: 3.25, maxElevation: 986, imageUrl: 'https://cdn.example/route.jpg', path })
})

it('editing removes photo and path explicitly and preserves correct kilometre display', async () => {
  vi.mocked(apiClient.put).mockResolvedValueOnce({ data: { data: { ...raw, imageUrl: '', path: null } } })
  const { result } = renderHook(() => useUpdateRoute(), { wrapper })
  let saved
  await act(async () => { saved = await result.current.mutateAsync({ id: 'r', data: {
    distance: 3.25, imageUrl: '', path: null, startLocation: null, endLocation: null,
  } }) })
  expect(apiClient.put).toHaveBeenCalledWith('/admin/trekking/routes/r', expect.objectContaining({
    distanceMeters: 3250, imageUrl: '', path: null, startLocation: null, endLocation: null,
  }))
  expect(saved).toMatchObject({ distance: 3.25, imageUrl: '', path: null })
})
