import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import apiClient from '@/services/api/client'
import { useCreateMilestone, useMilestone, useUpdateMilestone } from '@/features/trekking/milestones/useMilestones'
import MilestonesPage from '@/features/trekking/milestones/MilestonesPage'
import MilestoneFormPage from '@/features/trekking/milestones/MilestoneFormPage'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'

vi.mock('@/constants', async (original) => ({ ...await original<typeof import('@/constants')>(), IS_MOCK_MODE: false }))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/map/PlaceOfflineMap', () => ({ PlaceOfflineMap: (props: unknown) => <div data-testid="milestone-map">{JSON.stringify(props)}</div> }))

const raw = {
  milestoneId: 'm1', trekkingRouteId: 'r1', name: 'Cột điện 50', type: 'CHECKPOINT', sequence: 1,
  location: { type: 'Point', coordinates: [106.17, 11.38] }, checkinRadiusMeters: 50,
  createdAt: '2026-10-11T00:00:00Z', updatedAt: '2026-10-11T00:00:00Z',
}
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>
  </QueryClientProvider>
}
beforeEach(() => {
  vi.mocked(apiClient.post).mockResolvedValue({ data: { data: raw } })
  vi.mocked(apiClient.put).mockResolvedValue({ data: { data: raw } })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('groups milestones by route and sorts each route by sequence across pages', async () => {
  const second = { ...raw, milestoneId: 'm2', name: 'Điểm đầu', sequence: 0 }
  const other = { ...raw, milestoneId: 'm3', trekkingRouteId: 'r2', name: 'Điểm nghỉ' }
  vi.mocked(apiClient.get).mockImplementation(async (url, config) => ({ data: { data:
    url === '/admin/trekking/routes' ? {
      data: [{ trekkingRouteId: 'r1', name: 'Route A' }, { trekkingRouteId: 'r2', name: 'Route B' }], total: 2,
    } : { data: (config?.params as { page?: number } | undefined)?.page === 1 ? [raw] : [other, second], total: 3 },
  } }))
  render(<MilestonesPage />, { wrapper })
  await screen.findByText('Điểm nghỉ')
  const groups = document.querySelectorAll('details')
  expect(groups).toHaveLength(2)
  expect(groups[0]).toHaveTextContent('Route A')
  expect(groups[0]).toHaveTextContent(/Điểm đầu.*Cột điện 50/)
  expect(groups[0]).not.toHaveTextContent('Điểm nghỉ')
  expect(groups[1]).toHaveTextContent('Route B')
})

it('hides inactive routes and updates the selected place, path and typed milestone coordinates', async () => {
  const route = {
    trekkingRouteId: 'r1', trekkingPlaceId: 'p1', name: 'Route đang mở', status: 'ACTIVE',
    path: { type: 'LineString', coordinates: [[106.17, 11.38], [106.18, 11.39]] },
  }
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { data:
    url === '/admin/trekking/routes' ? {
      data: [route, { ...route, trekkingRouteId: 'r2', name: 'Route đã khóa', status: 'INACTIVE' }], total: 2,
    } : url === '/admin/trekking/routes/r1' ? route
      : url === '/admin/trekking/routes/r1/milestones' ? []
      : { name: 'Núi Bà Đen', location: { type: 'Point', coordinates: [106.16, 11.37] } },
  } }))
  render(<MilestoneFormPage />, { wrapper })
  await screen.findByRole('option', { name: 'Route đang mở' })
  expect(screen.queryByRole('option', { name: 'Route đã khóa' })).not.toBeInTheDocument()
  const user = userEvent.setup()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Cung đường' }), 'r1')
  await waitFor(() => expect(screen.getByTestId('milestone-map')).toHaveTextContent('Núi Bà Đen'))
  const latitude = screen.getByRole('spinbutton', { name: 'Vĩ độ' })
  const longitude = screen.getByRole('spinbutton', { name: 'Kinh độ' })
  await user.clear(latitude)
  expect(JSON.parse(screen.getByTestId('milestone-map').textContent!).milestone).toBeNull()
  await user.type(latitude, '11.40')
  await user.clear(longitude)
  await user.type(longitude, '106.19')
  await waitFor(() => expect(JSON.parse(screen.getByTestId('milestone-map').textContent!)).toMatchObject({
    placeId: 'p1', path: route.path,
    milestone: { type: 'Point', coordinates: [106.19, 11.4] },
    location: { type: 'Point', coordinates: [106.16, 11.37] },
  }))
  expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/routes', expect.objectContaining({ params: expect.objectContaining({ status: 'ACTIVE' }) }))
})

it.each([['WAYPOINT', 'CHECKPOINT'], ['END', 'FINISH'], ['WATER_SOURCE', 'WATER_POINT'], ['SUMMIT', 'SUMMIT']] as const)(
  'creation sends official type %s as %s and GeoJSON longitude before latitude', async (type, officialType) => {
    const { result } = renderHook(() => useCreateMilestone(), { wrapper })
    let saved
    await act(async () => {
      saved = await result.current.mutateAsync({ routeId: 'r1', name: raw.name, type, sequence: 1,
        latitude: 11.38, longitude: 106.17, checkinRadius: 50, description: 'Điểm nghỉ', status: 'ACTIVE' })
    })
    expect(apiClient.post).toHaveBeenCalledWith('/admin/trekking/routes/r1/milestones', {
      name: raw.name, type: officialType, sequence: 1, checkinRadiusMeters: 50,
      description: 'Điểm nghỉ', location: raw.location,
    })
    expect(saved).toMatchObject({ id: 'm1', routeId: 'r1', type: 'WAYPOINT', coordinates: raw.location, checkinRadius: 50 })
  },
)

it('editing fetches the milestone ID and returns usable coordinates for the form', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { ...raw, type: 'FINISH' } } })
  const { result } = renderHook(() => useMilestone('m1'), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/milestones/m1')
  expect(result.current.data).toMatchObject({ id: 'm1', routeId: 'r1', type: 'END', coordinates: raw.location })
})

it('partial updates preserve omitted coordinates and allow clearing the description', async () => {
  const { result } = renderHook(() => useUpdateMilestone(), { wrapper })
  await act(async () => { await result.current.mutateAsync({ id: 'm1', data: { description: '' } }) })
  expect(apiClient.put).toHaveBeenCalledWith('/admin/trekking/milestones/m1', { description: '' })
})

it('the table displays a paginated backend milestone instead of claiming the route is empty', async () => {
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: { data: {
    data: url === '/admin/trekking/routes' ? [{ trekkingRouteId: 'r1', name: 'Đường CD' }] : [raw],
    total: 1, page: 1, limit: 20, totalPages: 1,
  } } }))
  render(<MilestonesPage />, { wrapper })
  expect(await screen.findByText(raw.name)).toBeInTheDocument()
  expect(screen.queryByText('Không có cột mốc')).not.toBeInTheDocument()
  expect(screen.getByText(/Điểm trung gian/)).toBeInTheDocument()
  expect(screen.getByText('50')).toBeInTheDocument()
  expect(screen.queryByTitle('Vô hiệu hóa')).not.toBeInTheDocument()
})

it('the edit form saves an existing milestone with its locked route and clears its note', async () => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { data: [{
    trekkingRouteId: 'r1', trekkingPlaceId: 'p1', name: 'Đường CD', difficulty: 'HARD', status: 'ACTIVE',
  }], total: 1, page: 1, limit: 100, totalPages: 1 } } })
  render(<MilestoneFormPage editMilestone={{
    id: 'm1', routeId: 'r1', name: raw.name, type: 'WAYPOINT', sequence: 1,
    coordinates: { type: 'Point', coordinates: [106.17, 11.38] }, checkinRadius: 50,
    description: 'Ghi chú cũ', images: [], status: 'ACTIVE', createdAt: raw.createdAt, updatedAt: raw.updatedAt,
  }} />, { wrapper })
  await screen.findByRole('option', { name: 'Đường CD' })
  const user = userEvent.setup()
  await user.clear(screen.getByPlaceholderText('Nhập mô tả cột mốc...'))
  await user.click(screen.getByRole('button', { name: /Lưu/ }))
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/admin/trekking/milestones/m1', {
    name: raw.name, type: 'CHECKPOINT', sequence: 1, checkinRadiusMeters: 50, description: '', location: raw.location,
  }))
  expect(apiClient.post).not.toHaveBeenCalled()
})

it('a new milestone suggests the next route sequence and blocks an occupied sequence', async () => {
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { data:
    url === '/admin/trekking/routes/r1/milestones' ? [raw] : {
      data: [{ trekkingRouteId: 'r1', trekkingPlaceId: 'p1', name: 'Đường CD', difficulty: 'HARD', status: 'ACTIVE' }],
      total: 1, page: 1, limit: 100, totalPages: 1,
    },
  } }))
  render(<MilestoneFormPage />, { wrapper })
  const option = await screen.findByRole('option', { name: 'Đường CD' })
  const user = userEvent.setup()
  await user.selectOptions(option.closest('select')!, 'r1')
  await waitFor(() => expect(screen.getByPlaceholderText('1')).toHaveValue(2))
  await user.type(screen.getByPlaceholderText('Nhập tên cột mốc'), 'Điểm cuối')
  await user.clear(screen.getByPlaceholderText('1'))
  await user.type(screen.getByPlaceholderText('1'), '1')
  await user.click(screen.getByRole('button', { name: 'Tạo cột mốc' }))
  expect(await screen.findByText(/Thứ tự 1 đã có cột mốc/)).toBeInTheDocument()
  expect(apiClient.post).not.toHaveBeenCalled()
  await user.clear(screen.getByPlaceholderText('1'))
  await user.type(screen.getByPlaceholderText('1'), '2')
  await user.click(screen.getByRole('button', { name: 'Tạo cột mốc' }))
  await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(
    '/admin/trekking/routes/r1/milestones', expect.objectContaining({ sequence: 2 }),
  ))
})

it('a concurrent sequence conflict displays the backend explanation and keeps the form', async () => {
  const message = 'Thứ tự 2 đã có cột mốc trong cung đường này. Hãy chọn thứ tự khác.'
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { data:
    url === '/admin/trekking/routes/r1/milestones' ? [raw] : {
      data: [{ trekkingRouteId: 'r1', trekkingPlaceId: 'p1', name: 'Đường CD', difficulty: 'HARD', status: 'ACTIVE' }],
      total: 1, page: 1, limit: 100, totalPages: 1,
    },
  } }))
  vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error('Request failed with status code 409'), {
    response: { data: { error: { code: 'MILESTONE_SEQUENCE_CONFLICT', message } } },
  }))
  render(<MilestoneFormPage />, { wrapper })
  const option = await screen.findByRole('option', { name: 'Đường CD' })
  const user = userEvent.setup()
  await user.selectOptions(option.closest('select')!, 'r1')
  await waitFor(() => expect(screen.getByPlaceholderText('1')).toHaveValue(2))
  await user.type(screen.getByPlaceholderText('Nhập tên cột mốc'), 'Điểm cuối')
  await user.click(screen.getByRole('button', { name: 'Tạo cột mốc' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(message)
  expect(toast.error).toHaveBeenCalledWith(message)
  expect(screen.getByPlaceholderText('Nhập tên cột mốc')).toHaveValue('Điểm cuối')
})
