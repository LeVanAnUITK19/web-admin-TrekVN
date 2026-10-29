import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import apiClient from '@/services/api/client'
import SocialAdmin from '@/features/community/SocialAdmin'
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), patch: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
const group = { conversationId: 'g1', name: 'Nhóm Tà Xùa', ownerId: 'user1', memberCount: 4, disabled: false, createdAt: '2026-10-29T00:00:00Z' }
const report = { _id: 'r1', contentSnapshot: 'Nội dung bị báo cáo', reason: 'Tin nhắn không phù hợp', senderId: 'user2', reporterId: 'user3', status: 'OPEN', createdAt: group.createdAt }
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SocialAdmin back={() => {}} /></QueryClientProvider>) }
beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async url => ({ data: { data: { items: url.endsWith('/groups') ? [group] : [report], total: 1, page: 1, limit: 20, totalPages: 1 } } }))
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })
it('loads group metadata and never requests direct chat history', async () => {
  mount(); expect(await screen.findByText('Nhóm Tà Xùa')).toBeInTheDocument()
  expect(apiClient.get).toHaveBeenCalledWith('/admin/community/groups', expect.objectContaining({ params: { page: 1, limit: 20 } }))
  expect(apiClient.get).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'true' } })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/admin/community/groups', expect.objectContaining({ params: expect.objectContaining({ disabled: 'true' }) })))
})
it('requires a reason and disables a group with the actual API', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Tạm ngưng' }))
  const d = await screen.findByRole('dialog', { name: 'Tạm ngưng nhóm' })
  fireEvent.click(within(d).getByText('Xác nhận')); expect(await within(d).findByRole('alert')).toHaveTextContent('3 ký tự')
  expect(apiClient.patch).not.toHaveBeenCalled()
  fireEvent.change(within(d).getByLabelText('Lý do xử lý'), { target: { value: 'Kiểm tra hoạt động nhóm' } })
  fireEvent.click(within(d).getByText('Xác nhận'))
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/admin/community/groups/g1/disable', { reason: 'Kiểm tra hoạt động nhóm' }))
})
it('shows reported evidence and resolves it without browsing a DM', async () => {
  mount(); fireEvent.click(screen.getByRole('tab', { name: 'Báo cáo tin nhắn' }))
  expect(await screen.findByText(report.contentSnapshot)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Gỡ tin' }))
  const d = await screen.findByRole('dialog', { name: 'Gỡ tin nhắn' })
  fireEvent.change(within(d).getByLabelText('Lý do xử lý'), { target: { value: 'Đã xác minh vi phạm' } }); fireEvent.click(within(d).getByText('Xác nhận'))
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/admin/community/message-reports/r1', { action: 'REMOVE', reason: 'Đã xác minh vi phạm' }))
  expect(vi.mocked(apiClient.get).mock.calls.every(([url]) => url === '/admin/community/groups' || url === '/admin/community/message-reports')).toBe(true)
})
it('keeps the reason and displays a server error on failed resolution', async () => {
  vi.mocked(apiClient.patch).mockRejectedValue(new Error('Máy chủ chưa lưu'))
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Tạm ngưng' }))
  const d = await screen.findByRole('dialog')
  fireEvent.change(within(d).getByLabelText('Lý do xử lý'), { target: { value: 'Giữ lại lý do' } }); fireEvent.click(within(d).getByText('Xác nhận'))
  expect(await within(d).findByRole('alert')).toHaveTextContent('Máy chủ chưa lưu')
  expect(within(d).getByLabelText('Lý do xử lý')).toHaveValue('Giữ lại lý do')
})
