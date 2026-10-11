import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import apiClient from '@/services/api/client'
import JourneysPage from '@/features/journeys/JourneysPage'
import { useJourneys } from '@/features/journeys/useJourneys'

vi.mock('@/constants', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/constants')>(), IS_MOCK_MODE: false,
}))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn() } }))

const journey = {
  id: 'j1', userId: 'u1', trekkingPlaceId: 'p1', trekkingRouteId: 'r1',
  placeName: 'Núi Bà Đen', routeName: 'Đường Cột', name: 'Chuyến đi Bà Đen',
  status: 'PLANNED', plannedStartAt: '2026-10-10T00:00:00Z',
  statistics: null, checkinCount: 0, markerCount: 0, participantCount: 3,
  note: 'Mang nước', createdAt: '2026-10-09T00:00:00Z', updatedAt: '2026-10-09T00:00:00Z',
}
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}
beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async (path) => ({ data: { data: path.endsWith('/j1') ? journey : {
    data: [journey], total: 1, page: 1, limit: 20, totalPages: 1,
  } } }))
})
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks() })

describe('admin journeys', () => {
  it('loads planned journeys with missing statistics and opens populated details via the mounted API', async () => {
    const user = userEvent.setup()
    render(<JourneysPage />, { wrapper })
    await user.click(await screen.findByRole('button', { name: journey.name }))
    expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/journeys', { params: expect.any(Object) })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(await screen.findByText('Mang nước')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/journeys/j1')
    expect(screen.getAllByText('Dự kiến').length).toBeGreaterThan(0)
  })

  it('manual refresh reflects a mobile status change and filters use canonical statuses', async () => {
    const user = userEvent.setup()
    render(<JourneysPage />, { wrapper })
    await screen.findByRole('button', { name: journey.name })
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
      data: [{ ...journey, status: 'PAUSED' }], total: 1, page: 1, limit: 20, totalPages: 1,
    } } })
    await user.click(screen.getByRole('button', { name: 'Làm mới' }))
    await waitFor(() => expect(screen.getAllByText('Tạm dừng').length).toBe(2))
    await user.selectOptions(screen.getByLabelText('Trạng thái hành trình'), 'PAUSED')
    await waitFor(() => expect(apiClient.get).toHaveBeenLastCalledWith('/admin/trekking/journeys', {
      params: expect.objectContaining({ status: 'PAUSED', page: 1 }),
    }))
  })

  it('polls so mobile updates appear without reloading the admin page', async () => {
    const { result } = renderHook(() => useJourneys({ page: 1 }), { wrapper })
    await waitFor(() => expect(result.current.data?.data[0].status).toBe('PLANNED'))
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
      data: [{ ...journey, status: 'ACTIVE' }], total: 1, page: 1, limit: 20, totalPages: 1,
    } } })
    vi.useFakeTimers()
    // The interval is scheduled after query resolution; use a new mount under
    // fake time so its timer is controlled, then advance one polling interval.
    cleanup()
    const polled = renderHook(() => useJourneys({ page: 1 }), { wrapper })
    await act(async () => { await vi.advanceTimersByTimeAsync(20); })
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
      data: [{ ...journey, status: 'PAUSED' }], total: 1, page: 1, limit: 20, totalPages: 1,
    } } })
    await act(async () => { await vi.advanceTimersByTimeAsync(10_010); })
    expect(polled.result.current.data?.data[0].status).toBe('PAUSED')
  })
})
