import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AxiosError, AxiosHeaders } from 'axios'
import type { PropsWithChildren } from 'react'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import RoutesPage from '@/features/trekking/routes/RoutesPage'
import { useUpdateRoute } from '@/features/trekking/routes/useRoutes'

vi.mock('@/constants', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/constants')>(),
  IS_MOCK_MODE: false,
}))
vi.mock('@/services/api/client', () => ({
  default: { get: vi.fn(), patch: vi.fn(), put: vi.fn() },
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const routeId = '6ac9b143db4d133bdac2499e'
const route = {
  trekkingRouteId: routeId,
  trekkingPlaceId: 'place-1',
  name: 'Đường cột điện',
  description: 'Đường lên đỉnh núi',
  difficulty: 'HARD',
  distanceMeters: 5000,
  estimatedDurationMinutes: 180,
  status: 'ACTIVE',
}

function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>
  </QueryClientProvider>
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockResolvedValue({ data: { data: {
    data: [route], total: 1, page: 1, limit: 20, totalPages: 1,
  } } })
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { data: { ...route, status: 'DISABLED' } } })
  vi.mocked(apiClient.put).mockResolvedValue({ data: { data: { ...route, name: 'Updated route' } } })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

async function openDisableDialog() {
  const user = userEvent.setup()
  render(<RoutesPage />, { wrapper })
  await user.click(await screen.findByRole('button', { name: `Thao tác của ${route.name}` }))
  await user.click(await screen.findByRole('menuitem', { name: 'Vô hiệu hóa' }))
  return { user, dialog: await screen.findByRole('alertdialog') }
}

describe('route status API wiring', () => {
  it('disable action PATCHes status and closes only after success', async () => {
    const { user, dialog } = await openDisableDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }))
    await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith(
      `/admin/trekking/routes/${routeId}/status`, { status: 'DISABLED' },
    ))
    expect(apiClient.put).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(toast.success).toHaveBeenCalled()
  })

  it('rejected status request shows backend error and allows retry', async () => {
    const error = new AxiosError('Request failed with status code 400', 'ERR_BAD_REQUEST', undefined, undefined, {
      data: { message: 'Trạng thái không hợp lệ' }, status: 400, statusText: 'Bad Request',
      headers: {}, config: { headers: new AxiosHeaders() },
    })
    vi.mocked(apiClient.patch).mockRejectedValueOnce(error)
    const { user, dialog } = await openDisableDialog()
    await user.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trạng thái không hợp lệ'))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(toast.success).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Vô hiệu hóa' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(apiClient.patch).toHaveBeenCalledTimes(2)
  })

  it('status-only updates never send an empty content PUT', async () => {
    const { result } = renderHook(() => useUpdateRoute(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: routeId, data: { status: 'DISABLED' } }) })
    expect(apiClient.patch).toHaveBeenCalledWith(`/admin/trekking/routes/${routeId}/status`, { status: 'DISABLED' })
    expect(apiClient.put).not.toHaveBeenCalled()
  })

  it('edit form updates content and status through separate endpoints', async () => {
    const { result } = renderHook(() => useUpdateRoute(), { wrapper })
    await act(async () => { await result.current.mutateAsync({ id: routeId, data: { name: 'Updated route', status: 'DISABLED' } }) })
    const [url, body] = vi.mocked(apiClient.put).mock.calls[0]
    expect(url).toBe(`/admin/trekking/routes/${routeId}`)
    expect(body).toMatchObject({ name: 'Updated route' })
    expect(body).not.toHaveProperty('status')
    expect(apiClient.patch).toHaveBeenCalledWith(`/admin/trekking/routes/${routeId}/status`, { status: 'DISABLED' })
    await waitFor(() => expect(result.current.data?.status).toBe('DISABLED'))
  })
})
