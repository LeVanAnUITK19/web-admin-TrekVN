import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import apiClient from '@/services/api/client'
import ContributionsPage from '@/features/contributions/ContributionsPage'
import { SubmittedMarkersPanel } from '@/features/contributions/SubmittedMarkersPanel'
import { ContributionDetail } from '@/features/contributions/ContributionDetail'
vi.mock('@/constants', async (original) => ({ ...await original<typeof import('@/constants')>(), IS_MOCK_MODE: false }))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn() } }))
vi.mock('@/components/map/PlaceOfflineMap', () => ({ PlaceOfflineMap: () => <div>Bản đồ hành trình</div> }))
afterEach(() => { cleanup(); vi.clearAllMocks() })

it('shows the recorded GPS route in the admin review map', async () => {
  const contribution = { id: 'submission', type: 'ROUTE_SUBMISSION', status: 'PENDING_REVIEW',
    contributor: { id: 'user', name: 'Trekker', email: '' }, submittedAt: '2026-10-11T00:00:00Z',
    routeSubmission: { suggestedName: 'Recorded route', trekkingPlaceId: 'place',
      encodedPolyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@', markerCount: 0 } }
  vi.mocked(apiClient.get).mockImplementation(async (path) => ({ data: { data:
    path.endsWith('/markers') ? [] : contribution,
  } }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><ContributionDetail contributionId="submission" onReviewed={() => {}} /></QueryClientProvider>)
  expect(await screen.findByText('Đường GPS người dùng đã đi · 3 điểm')).toBeInTheDocument()
  expect(screen.getByText('Bản đồ hành trình')).toBeInTheDocument()
})
it('renders submitted routes and their snapshot markers from the real admin response', async () => {
  const contribution = { id: 'submission', type: 'ROUTE_SUBMISSION', status: 'PENDING_REVIEW',
    contributor: { id: 'user', name: 'Người trekking', email: 'user@example.com' },
    submittedAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z',
    routeSubmission: { suggestedName: 'Cung đường thử', sourceJourneyId: 'journey', distance: 5, contributionKind: 'MARKERS', markerCount: 1, notes: 'Đường trơn khi mưa' } }
  vi.mocked(apiClient.get).mockImplementation(async (path) => ({ data: { data:
    path.endsWith('/markers') ? [{ id: 'snapshot', name: 'Suối gần đỉnh', type: 'WATER_POINT', sequence: 1,
      location: { type: 'Point', coordinates: [108, 12] }, images: [], reviewStatus: 'PENDING' }]
      : path.endsWith('/submission') ? contribution
        : { data: [contribution], total: 1, page: 1, limit: 20, totalPages: 1 },
  } }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><ContributionsPage /></QueryClientProvider>)
  await userEvent.click(await screen.findByText('Cung đường thử'))
  expect(await screen.findByText('Suối gần đỉnh')).toBeInTheDocument()
  expect(screen.getAllByText('Người trekking').length).toBeGreaterThan(0)
  expect(apiClient.get).toHaveBeenCalledWith('/admin/contributions/submission/markers')
  expect(screen.getByText('Đường trơn khi mưa')).toBeInTheDocument()
  expect(screen.getAllByText('Đóng góp cột mốc').length).toBeGreaterThan(0)
});

it('shows a marker loading error instead of claiming there are no submitted markers', async () => {
  vi.mocked(apiClient.get).mockRejectedValue(new Error('service unavailable'))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><SubmittedMarkersPanel routeSubmissionId="failed" /></QueryClientProvider>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được cột mốc')
  expect(screen.queryByText('Người dùng không đính kèm cột mốc trong đóng góp này.')).not.toBeInTheDocument()
});
