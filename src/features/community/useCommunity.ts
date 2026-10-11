import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockPosts, mockComments, mockReviews } from '@/mocks/community'
import type { Post, Comment, Review, CommunityListParams } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'

// eslint-disable-next-line prefer-const
let mockPostStore = [...mockPosts]
// eslint-disable-next-line prefer-const
let mockCommentStore = [...mockComments]
// eslint-disable-next-line prefer-const
let mockReviewStore = [...mockReviews]

// ---- Posts ----
async function fetchPosts(params: CommunityListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockPostStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter((p) => p.title.toLowerCase().includes(q) || p.author.name.toLowerCase().includes(q))
    }
    if (params.status) result = result.filter((p) => p.status === params.status)
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return { data: result.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) }
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_POSTS, { params })
  return res.data.data
}

async function hidePost(id: string): Promise<Post> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockPostStore.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Không tìm thấy bài viết')
    mockPostStore[idx] = { ...mockPostStore[idx], status: 'HIDDEN' }
    return mockPostStore[idx]
  }
  const res = await apiClient.patch(ENDPOINTS.ADMIN_POST_HIDE(id))
  return res.data.data
}

async function deletePost(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockPostStore.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Không tìm thấy bài viết')
    mockPostStore[idx] = { ...mockPostStore[idx], status: 'DELETED' }
    return
  }
  await apiClient.delete(ENDPOINTS.ADMIN_POST(id))
}

// ---- Comments ----
async function fetchComments(params: CommunityListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockCommentStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter((c) => c.content.toLowerCase().includes(q) || c.author.name.toLowerCase().includes(q))
    }
    if (params.status) result = result.filter((c) => c.status === params.status)
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return { data: result.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) }
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_COMMENTS, { params })
  return res.data.data
}

async function hideComment(id: string): Promise<Comment> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockCommentStore.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Không tìm thấy bình luận')
    mockCommentStore[idx] = { ...mockCommentStore[idx], status: 'HIDDEN' }
    return mockCommentStore[idx]
  }
  const res = await apiClient.patch(ENDPOINTS.ADMIN_COMMENT_HIDE(id))
  return res.data.data
}

// ---- Reviews ----
async function fetchReviews(params: CommunityListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockReviewStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter((r) => r.content.toLowerCase().includes(q) || r.author.name.toLowerCase().includes(q))
    }
    if (params.status) result = result.filter((r) => r.status === params.status)
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return { data: result.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) }
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_REVIEWS, { params })
  return res.data.data
}

async function hideReview(id: string): Promise<Review> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockReviewStore.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Không tìm thấy đánh giá')
    mockReviewStore[idx] = { ...mockReviewStore[idx], status: 'HIDDEN' }
    return mockReviewStore[idx]
  }
  const res = await apiClient.patch(ENDPOINTS.ADMIN_REVIEW_HIDE(id))
  return res.data.data
}

// ---- Hooks ----
export function usePosts(params: CommunityListParams) {
  return useQuery({ queryKey: ['posts', params], queryFn: () => fetchPosts(params), placeholderData: (p) => p })
}

export function useHidePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hidePost,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); toast.success('Đã ẩn bài viết') },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePost,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['posts'] }); toast.success('Đã xóa bài viết') },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useComments(params: CommunityListParams) {
  return useQuery({ queryKey: ['comments', params], queryFn: () => fetchComments(params), placeholderData: (p) => p })
}

export function useHideComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hideComment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['comments'] }); toast.success('Đã ẩn bình luận') },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useReviews(params: CommunityListParams) {
  return useQuery({ queryKey: ['reviews', params], queryFn: () => fetchReviews(params), placeholderData: (p) => p })
}

export function useHideReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hideReview,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['reviews'] }); toast.success('Đã ẩn đánh giá') },
    onError: (err: Error) => toast.error(err.message),
  })
}
