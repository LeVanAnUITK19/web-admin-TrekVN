import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import apiClient from '@/services/api/client'
import OfflineMapsPage from '@/features/offline-maps/OfflineMapsPage'
import PlaceOfflineMapDetailPage from '@/features/offline-maps/PlaceOfflineMapDetailPage'
import ReviewsPage from '@/features/reviews/ReviewsPage'
import { placeMapSchema } from '@/features/offline-maps/placeMapSchema'

vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/map/PlaceOfflineMap', () => ({ PlaceOfflineMap: () => <div>Bản đồ xem trước</div> }))
vi.mock('@/constants', async original => ({ ...await original<typeof import('@/constants')>(), IS_MOCK_MODE: true }))
const map = { available: true, version: 3, objectKey: 'maps/a.zip', checksum: 'abc', sizeBytes: null, minZoom: null, maxZoom: null, bounds: null }
const review = { detailEvaluateId: 'r1', trekkingPlaceId: 'p1', placeName: 'Núi A', userId: 'trekker', point: 4, content: 'Một hành trình đẹp', imagesUrl: [], videoUrl: [], deleted: false, editCount: 0, createdAt: '2026-10-29', updatedAt: '2026-10-29' }
const envelope = (data: unknown) => ({ data: { data } })
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, limit: 20, totalPages: 1 })
function app(element: React.ReactNode, path = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={qc}><MemoryRouter initialEntries={[path]}><Routes><Route path="/offline-maps/place/:placeId" element={element} /><Route path="*" element={element} /></Routes></MemoryRouter></QueryClientProvider>)
  return qc
}
beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async url => {
    if (String(url).endsWith('/places-offline-maps')) return envelope({ data: [{ trekkingPlaceId: 'p1', name: 'Núi A', offlineMap: map }], total: 1, page: 1, limit: 20, totalPages: 1 })
    if (String(url).endsWith('/offline-map')) return envelope(map)
    if (String(url).endsWith('/places/p1')) return envelope({ name: 'Núi A', updatedAt: '2026-10-29' })
    if (String(url).endsWith('/reviews')) return envelope(page([review]))
    return envelope({ data: [{ trekkingPlaceId: 'p1', name: 'Núi A' }] })
  })
  vi.mocked(apiClient.put).mockResolvedValue(envelope({}))
  vi.mocked(apiClient.delete).mockResolvedValue({ status: 204 })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('opens place maps by default, reads real API in mock mode and sends availability filter', async () => {
  app(<OfflineMapsPage />)
  expect(await screen.findByText('Núi A')).toBeTruthy()
  expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/places-offline-maps', expect.objectContaining({ params: expect.objectContaining({ available: 'all' }) }))
  expect(apiClient.get).not.toHaveBeenCalledWith('/admin/trekking/offline-maps', expect.anything())
  fireEvent.change(screen.getByLabelText('Trạng thái bản đồ'), { target: { value: 'false' } })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/places-offline-maps', expect.objectContaining({ params: expect.objectContaining({ available: 'false', page: 1 }) })))
  expect(screen.getByRole('link', { name: /Quản lý/ }).getAttribute('href')).toBe('/offline-maps/place/p1')
})

it('loads raw map metadata and saves disabled map without losing the object key or coercing empty fields to zero', async () => {
  app(<PlaceOfflineMapDetailPage />, '/offline-maps/place/p1')
  const key = await screen.findByLabelText('Đường dẫn file trong kho bản đồ (Object Key)')
  expect((key as HTMLInputElement).value).toBe('maps/a.zip')
  fireEvent.click(screen.getByRole('checkbox'))
  fireEvent.click(screen.getByText('Lưu thay đổi'))
  expect(apiClient.put).not.toHaveBeenCalled()
  fireEvent.click(await screen.findByText('Lưu cấu hình'))
  await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/admin/trekking/places/p1/offline-map', expect.objectContaining({ available: false, objectKey: 'maps/a.zip', minZoom: null, maxZoom: null, bounds: null, sizeBytes: null })))
})

it('rejects incomplete bounds and enabling maps without a file', () => {
  const draft = { available: false, version: 1, objectKey: '', checksum: '', minLat: '', minLon: '', maxLat: '', maxLon: '', minZoom: '', maxZoom: '' }
  expect(placeMapSchema.parse(draft).minLat).toBeUndefined()
  expect(placeMapSchema.safeParse({ ...draft, minLat: 10 }).success).toBe(false)
  expect(placeMapSchema.safeParse({ ...draft, available: true }).success).toBe(false)
  expect(placeMapSchema.safeParse({ ...draft, minZoom: 15, maxZoom: 10 }).success).toBe(false)
})

it('keeps failed map update confirmation open and shows the API error', async () => {
  vi.mocked(apiClient.put).mockRejectedValue(new Error('Không lưu được cấu hình'))
  app(<PlaceOfflineMapDetailPage />, '/offline-maps/place/p1')
  await screen.findByLabelText('Phiên bản')
  fireEvent.click(screen.getByText('Lưu thay đổi')); fireEvent.click(await screen.findByText('Lưu cấu hình'))
  expect(await screen.findByRole('alert')).toHaveTextContent('Không lưu được cấu hình')
  expect(screen.getByRole('alertdialog')).toBeTruthy()
})

it('filters reviews on the server, shows details and cancels removal without calling DELETE', async () => {
  app(<ReviewsPage />)
  expect(await screen.findByText('Một hành trình đẹp')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Số sao'), { target: { value: '1' } })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/admin/trekking/reviews', expect.objectContaining({ params: expect.objectContaining({ point: '1', status: 'ACTIVE' }) })))
  fireEvent.click(await screen.findByRole('button', { name: 'Xem đánh giá r1' }))
  expect(await screen.findByRole('dialog')).toHaveTextContent('Chi tiết đánh giá')
  fireEvent.click(screen.getByText('Đóng'))
  fireEvent.click(screen.getByRole('button', { name: 'Gỡ đánh giá r1' })); fireEvent.click(await screen.findByText('Hủy'))
  expect(apiClient.delete).not.toHaveBeenCalled()
})

it('removes reviews through the place endpoint and refreshes ratings and listings', async () => {
  const qc = app(<ReviewsPage />)
  const invalidate = vi.spyOn(qc, 'invalidateQueries')
  fireEvent.click(await screen.findByRole('button', { name: 'Gỡ đánh giá r1' }))
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Gỡ đánh giá' }))
  await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/admin/trekking/places/p1/reviews/r1'))
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['places'] }))
})

it('shows errors instead of fake reviews when the server is unavailable', async () => {
  vi.mocked(apiClient.get).mockRejectedValue(new Error('offline'))
  app(<ReviewsPage />)
  expect(await screen.findAllByText(/Thử lại/)).not.toHaveLength(0)
  expect(screen.queryByText('Một hành trình đẹp')).toBeNull()
})
