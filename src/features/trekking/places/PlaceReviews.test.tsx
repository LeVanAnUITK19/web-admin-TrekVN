import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import apiClient from '@/services/api/client'
import { PlaceReviews } from './PlaceReviews'

vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.restoreAllMocks() })

it('loads review details and removes through the protected admin endpoint', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { total: 1, items: [{
    detailEvaluateId: 'r1', userId: 'u1', point: 4, content: 'Đường đẹp', isAnonymous: true,
    imagesUrl: [], videoUrl: [], editCount: 1, createdAt: '2026-10-11T00:00:00Z',
  }] } } })
  vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 })
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  render(<QueryClientProvider client={qc}><PlaceReviews placeId="p1" /></QueryClientProvider>)
  expect(await screen.findByText('Đường đẹp')).toBeTruthy()
  expect(screen.getByText(/Người dùng: u1/)).toBeTruthy()
  fireEvent.click(screen.getByText('Gỡ đánh giá'))
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/admin/trekking/places/p1/reviews/r1'))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['place', 'p1'] }))
  qc.clear()
})

it('keeps a review when removal is cancelled', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { total: 1, items: [{
    detailEvaluateId: 'r1', userId: 'u1', point: 5, imagesUrl: [], videoUrl: [], createdAt: '2026-10-11',
  }] } } })
  vi.spyOn(window, 'confirm').mockReturnValue(false)
  const qc = new QueryClient()
  render(<QueryClientProvider client={qc}><PlaceReviews placeId="p1" /></QueryClientProvider>)
  fireEvent.click(await screen.findByText('Gỡ đánh giá'))
  expect(apiClient.delete).not.toHaveBeenCalled()
  qc.clear()
})
