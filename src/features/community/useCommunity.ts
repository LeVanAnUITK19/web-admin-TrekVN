import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type {
  Post, Comment, CommunityListParams, PaginatedResponse, AdminPostDetail,
  CommunityAction, CommunityEntity, ModerationLog, PostStatus,
} from '@/types'

interface ModerationFields {
  status: PostStatus
  moderationReason?: string | null
  moderatedBy?: string | null
  moderatedAt?: string | null
}
interface PostDto extends ModerationFields {
  postId: string; authorId: string; authorName: string; authorAvatar: string | null
  content: string; images: string[]; type: Post['type']; visibility: Post['visibility']
  journeyId: string | null; trekkingPlaceId: string | null
  reactionCount: number; commentCount: number; createdAt: string; updatedAt: string
}
interface CommentDto extends ModerationFields {
  commentId: string; postId: string; authorId: string; authorName: string; authorAvatar: string | null
  content: string; likeCount: number; createdAt: string; updatedAt: string
  parentCommentId: string | null; rootCommentId: string | null; postContent: string; postStatus: PostStatus
}
interface PageDto<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }

export function communityError(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string }; message?: string }>(error)) {
    if (error.response?.status === 403) return 'Tài khoản không có quyền quản trị nội dung cộng đồng.'
    if (error.response?.status === 404) return 'Không tìm thấy nội dung hoặc API quản trị Community chưa được triển khai.'
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? 'Không kết nối được máy chủ. Vui lòng thử lại.'
  }
  return error instanceof Error ? error.message : 'Thao tác thất bại. Vui lòng thử lại.'
}
function mapPost(p: PostDto): Post {
  return {
    id: p.postId, title: p.content.slice(0, 90) || (p.status === 'DELETED' ? 'Bài viết đã xóa' : 'Bài viết chỉ có ảnh'),
    content: p.content, images: p.images,
    author: { id: p.authorId, name: p.authorName, avatarUrl: p.authorAvatar ?? undefined },
    status: p.status, likesCount: p.reactionCount, commentsCount: p.commentCount,
    type: p.type, visibility: p.visibility, journeyId: p.journeyId,
    placeId: p.trekkingPlaceId ?? undefined, createdAt: p.createdAt, updatedAt: p.updatedAt,
    moderationReason: p.moderationReason, moderatedBy: p.moderatedBy, moderatedAt: p.moderatedAt,
  }
}
function mapComment(c: CommentDto): Comment {
  return {
    id: c.commentId, postId: c.postId, content: c.content, postTitle: c.postContent,
    author: { id: c.authorId, name: c.authorName, avatarUrl: c.authorAvatar ?? undefined },
    status: c.status, likesCount: c.likeCount, createdAt: c.createdAt, updatedAt: c.updatedAt,
    parentCommentId: c.parentCommentId, rootCommentId: c.rootCommentId, postStatus: c.postStatus,
    moderationReason: c.moderationReason, moderatedBy: c.moderatedBy, moderatedAt: c.moderatedAt,
  }
}
function mapPage<T, U>(page: PageDto<T>, map: (item: T) => U): PaginatedResponse<U> {
  return { data: page.items.map(map), total: page.total, page: page.page, limit: page.limit, totalPages: page.totalPages }
}

// Community administration always uses the real API, including when another
// older module still has mock mode enabled. Failures are visible, not replaced.
export function usePosts(params: CommunityListParams, enabled = true) {
  return useQuery({ queryKey: ['community', 'posts', params], enabled, queryFn: async ({ signal }) => {
    const res = await apiClient.get<{ data: PageDto<PostDto> }>(ENDPOINTS.ADMIN_POSTS, { params, signal })
    return mapPage(res.data.data, mapPost)
  } })
}
export function useComments(params: CommunityListParams, enabled = true) {
  return useQuery({ queryKey: ['community', 'comments', params], enabled, queryFn: async ({ signal }) => {
    const res = await apiClient.get<{ data: PageDto<CommentDto> }>(ENDPOINTS.ADMIN_COMMENTS, { params, signal })
    return mapPage(res.data.data, mapComment)
  } })
}
export function usePostDetail(id: string | null) {
  return useQuery<AdminPostDetail>({ queryKey: ['community', 'detail', id], enabled: !!id, queryFn: async ({ signal }) => {
    const res = await apiClient.get<{ data: { post: PostDto; recentActions: ModerationLog[] } }>(ENDPOINTS.ADMIN_POST(id!), { signal })
    return { post: mapPost(res.data.data.post), recentActions: res.data.data.recentActions }
  } })
}
export function useModerateCommunity() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: async ({ entity, id, action, reason }: {
    entity: CommunityEntity; id: string; action: CommunityAction; reason: string
  }) => {
    const path = entity === 'posts' ? ENDPOINTS.ADMIN_POST(id) : ENDPOINTS.ADMIN_COMMENT(id)
    if (action === 'delete') await apiClient.delete(path, { data: { reason } })
    else await apiClient.patch(`${path}/${action}`, { reason })
  }, onSuccess: async (_, input) => {
    await qc.invalidateQueries({ queryKey: ['community'] })
    toast.success(input.action === 'hide' ? 'Đã ẩn nội dung' : input.action === 'publish' ? 'Đã hiển thị lại nội dung' : 'Đã xóa nội dung')
  } })
}
