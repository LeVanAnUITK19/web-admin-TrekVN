import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import apiClient from '@/services/api/client'
import { getAgentTasks } from '@/services/api/agentApi'
import AgentTasksPage from '@/features/agent/tasks/AgentTasksPage'
import AgentTaskDetailPage from '@/features/agent/tasks/AgentTaskDetailPage'

vi.mock('@/constants', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/constants')>(), IS_MOCK_MODE: false,
}))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn() } }))

const task = { id: 'map-uuid', jobId: 'MAP-1', type: 'MAP_BUILDER', name: 'Núi Bà Đen',
  status: 'PUBLISHED', createdBy: 'admin', createdAt: '2026-10-11T00:00:00Z', resultRef: 'map-uuid', steps: [], logs: [] }

function show(path = '/agent/tasks') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path="/agent/tasks" element={<AgentTasksPage />} />
      <Route path="/agent/tasks/:jobId" element={<AgentTaskDetailPage />} />
      <Route path="/agent/map-builder/:jobId" element={<p>Trang quản lý bản đồ</p>} />
    </Routes>
  </MemoryRouter></QueryClientProvider>)
  return client
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async (url) => ({ data: { data:
    url === '/agent/tasks' ? { data: [task], total: 25, page: 1, limit: 10, totalPages: 3 } : task,
  } }))
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('agent task history', () => {
  it('omits empty filters from all-tasks request', async () => {
    await getAgentTasks({ page: 1, limit: 10, type: '', status: '', search: '', from: '', to: '' })
    expect(apiClient.get).toHaveBeenCalledWith('/agent/tasks', { params: { page: 1, limit: 10 } })
  })

  it('opens detail by task id and management by job id', async () => {
    const user = userEvent.setup()
    const client = show()
    await user.click(await screen.findByRole('button', { name: 'MAP-1' }))
    expect(await screen.findByText('Quay lại danh sách')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/agent/tasks/map-uuid')
    await user.click(screen.getByRole('button', { name: 'Mở trang quản lý' }))
    expect(await screen.findByText('Trang quản lý bản đồ')).toBeInTheDocument()
    client.clear()
  })

  it('keeps tab and type dropdown synchronized', async () => {
    const user = userEvent.setup()
    const client = show()
    await screen.findByRole('button', { name: 'MAP-1' })
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'MAP_BUILDER')
    expect(screen.getByRole('tab', { name: /Tạo bản đồ/ })).toHaveAttribute('data-state', 'active')
    await user.click(screen.getByRole('tab', { name: /Tất cả/ }))
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('')
    await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/agent/tasks', { params: { page: 1, limit: 10, type: 'MAP_BUILDER' } }))
    client.clear()
  })

  it('renders historical place results without broken management links', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { data: { ...task, type: 'PLACE_BUILDER', result: { name: 'Historical mountain' } } } })
    const user = userEvent.setup()
    const client = show('/agent/tasks/old-place')
    expect(await screen.findByText('Tạo địa điểm (lịch sử)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mở trang quản lý' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Kết quả' }))
    expect(await screen.findByText(/Historical mountain/)).toBeInTheDocument()
    client.clear()
  })
})
