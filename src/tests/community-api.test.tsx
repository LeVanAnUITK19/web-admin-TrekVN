import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import apiClient from '@/services/api/client'
import CommunityPage from '@/features/community/CommunityPage'
import { useModerateCommunity, usePosts } from '@/features/community/useCommunity'

// Even if a legacy module uses mock mode, Community must call its real API.
vi.mock('@/constants', async (original) => ({ ...await original<typeof import('@/constants')>(), IS_MOCK_MODE: true }))
vi.mock('@/services/api/client', () => ({ default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
const post = {
  postId: 'post-1', authorId: 'user-1', authorName: 'Ngọc Lan', authorAvatar: null,
  content: 'Chuyến trekking cuối tuần trên Fansipan', images: [], type: 'JOURNEY_SHARE', visibility: 'PRIVATE',
  journeyId: 'journey-1', trekkingPlaceId: 'place-1', reactionCount: 7, commentCount: 3,
  status: 'ACTIVE', createdAt: '2026-10-29T00:00:00Z', updatedAt: '2026-10-29T00:00:00Z',
}
const comment = {
  commentId: 'comment-1', authorId: 'user-2', authorName: 'Minh', authorAvatar: null,
  postId: 'post-1', content: 'Đường trơn sau mưa', likeCount: 2, status: 'HIDDEN',
  parentCommentId: 'root-1', rootCommentId: 'root-1', postStatus: 'ACTIVE', postContent: post.content,
  moderationReason: 'Cần kiểm tra', createdAt: post.createdAt, updatedAt: post.updatedAt,
}
function envelope(items: unknown[], params = {}) { return { data: { data: { items, total: items.length, page: 1, limit: 20, totalPages: 1, ...params } } } }
function wrapper({ children }: PropsWithChildren) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}>
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>{children}</MemoryRouter>
  </QueryClientProvider>
}
beforeEach(() => {
  vi.mocked(apiClient.get).mockImplementation(async (url) => url === '/admin/community/posts/post-1'
    ? { data: { data: { post, recentActions: [] } } }
    : envelope(url === '/admin/community/comments' ? [comment] : [post]))
  vi.mocked(apiClient.patch).mockResolvedValue({ data: { success: true } })
  vi.mocked(apiClient.delete).mockResolvedValue({ data: { success: true } })
})
afterEach(() => { cleanup(); vi.resetAllMocks() })

it('maps items/postId/counters from the actual community contract', async () => {
  const { result } = renderHook(() => usePosts({ page: 1, limit: 20 }), { wrapper })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(apiClient.get).toHaveBeenCalledWith('/admin/community/posts', expect.objectContaining({ params: { page: 1, limit: 20 } }))
  expect(result.current.data?.data[0]).toMatchObject({ id: 'post-1', author: { name: 'Ngọc Lan' }, likesCount: 7, commentsCount: 3, visibility: 'PRIVATE' })
})

it('only fetches the active tab, removes unrelated review mocks, and filters server data', async () => {
  render(<CommunityPage />, { wrapper })
  expect(await screen.findByText(post.content)).toBeInTheDocument()
  expect(apiClient.get).not.toHaveBeenCalledWith('/admin/community/comments', expect.anything())
  expect(screen.queryByRole('tab', { name: 'Đánh giá' })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox', { name: 'Trạng thái' }), { target: { value: 'HIDDEN' } })
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledWith('/admin/community/posts', expect.objectContaining({ params: expect.objectContaining({ status: 'HIDDEN', page: 1 }) })))
  fireEvent.mouseDown(screen.getByRole('tab', { name: 'Bình luận' }), { button: 0, ctrlKey: false })
  expect(await screen.findByText(comment.content)).toBeInTheDocument()
  expect(screen.getByText('Phản hồi bình luận')).toBeInTheDocument()
})

it('requires a moderation reason and sends a hidden/publish action with its captured entity', async () => {
  render(<CommunityPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: 'Ẩn post-1' }))
  const dialog = await screen.findByRole('dialog', { name: 'Ẩn bài viết' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('ít nhất 3 ký tự')
  expect(apiClient.patch).not.toHaveBeenCalled()
  fireEvent.change(within(dialog).getByLabelText(/Lý do kiểm duyệt/), { target: { value: '  Nội dung cần rà soát  ' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(apiClient.patch).toHaveBeenCalledWith('/admin/community/posts/post-1/hide', { reason: 'Nội dung cần rà soát' }))
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Ẩn bài viết' })).not.toBeInTheDocument())
})

it('keeps the reason and dialog on failed moderation and does not show fake success', async () => {
  vi.mocked(apiClient.patch).mockRejectedValue(new Error('Máy chủ chưa nhận được thao tác'))
  render(<CommunityPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: 'Ẩn post-1' }))
  const dialog = await screen.findByRole('dialog', { name: 'Ẩn bài viết' })
  fireEvent.change(within(dialog).getByLabelText(/Lý do kiểm duyệt/), { target: { value: 'Giữ bản nháp lý do' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Máy chủ chưa nhận được thao tác')
  expect(within(dialog).getByLabelText(/Lý do kiểm duyệt/)).toHaveValue('Giữ bản nháp lý do')
})

it('opens full post detail with comments scoped to the selected post', async () => {
  render(<CommunityPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: 'Xem post-1' }))
  const panel = await screen.findByRole('dialog', { name: 'Chi tiết bài viết' })
  expect(await within(panel).findByText('Đường trơn sau mưa')).toBeInTheDocument()
  expect(apiClient.get).toHaveBeenCalledWith('/admin/community/comments', expect.objectContaining({ params: { postId: 'post-1', page: 1, limit: 10 } }))
  expect(within(panel).getByText('journey-1')).toBeInTheDocument()
  expect(within(panel).getByText(/Cần kiểm tra/)).toBeInTheDocument()
})

it('surfaces API failures without substituting mock posts', async () => {
  vi.mocked(apiClient.get).mockRejectedValue(new Error('Service unavailable'))
  render(<CommunityPage />, { wrapper })
  expect(await screen.findByText('Không tải được nội dung cộng đồng')).toBeInTheDocument()
  expect(screen.queryByText('Ngọc Lan')).not.toBeInTheDocument()
})

it('cancelled deletion never calls the server', async () => {
  render(<CommunityPage />, { wrapper })
  fireEvent.click(await screen.findByRole('button', { name: 'Xóa post-1' }))
  const dialog = await screen.findByRole('dialog', { name: 'Xóa bài viết' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Hủy' }))
  expect(apiClient.delete).not.toHaveBeenCalled()
})

it('deletes comments with a JSON reason and supports publish', async () => {
  const { result } = renderHook(() => useModerateCommunity(), { wrapper })
  await act(async () => result.current.mutateAsync({ entity: 'comments', id: 'c1', action: 'delete', reason: 'Vi phạm quy định' }))
  expect(apiClient.delete).toHaveBeenCalledWith('/admin/community/comments/c1', { data: { reason: 'Vi phạm quy định' } })
  await act(async () => result.current.mutateAsync({ entity: 'posts', id: 'p1', action: 'publish', reason: 'Nội dung hợp lệ' }))
  expect(apiClient.patch).toHaveBeenCalledWith('/admin/community/posts/p1/publish', { reason: 'Nội dung hợp lệ' })
})
