export type PostStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'
export type CommentStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'
export type ReviewStatus = 'ACTIVE' | 'HIDDEN' | 'DELETED'

export interface AuthorInfo {
  id: string
  name: string
  avatarUrl?: string
}

export interface Post {
  id: string
  title: string
  content: string
  author: AuthorInfo
  images: string[]
  status: PostStatus
  likesCount: number
  commentsCount: number
  createdAt: string
  updatedAt: string
  placeId?: string
  placeName?: string
  type?: 'NORMAL' | 'JOURNEY_SHARE' | 'BADGE_SHARE'
  visibility?: 'PUBLIC' | 'PRIVATE'
  journeyId?: string | null
  moderationReason?: string | null
  moderatedBy?: string | null
  moderatedAt?: string | null
}

export interface Comment {
  id: string
  content: string
  author: AuthorInfo
  postId: string
  postTitle?: string
  status: CommentStatus
  likesCount: number
  createdAt: string
  updatedAt: string
  parentCommentId?: string | null
  rootCommentId?: string | null
  postStatus?: PostStatus
  moderationReason?: string | null
  moderatedBy?: string | null
  moderatedAt?: string | null
}

export interface Review {
  id: string
  content: string
  rating: number
  author: AuthorInfo
  placeId: string
  placeName?: string
  status: ReviewStatus
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface CommunityListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  authorId?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  type?: 'NORMAL' | 'JOURNEY_SHARE' | 'BADGE_SHARE'
  postId?: string
}

export interface ModerationLog {
  logId: string
  adminId: string
  entityType: 'POST' | 'COMMENT'
  entityId: string
  action: 'HIDE' | 'PUBLISH' | 'DELETE'
  reason: string
  beforeStatus: PostStatus
  afterStatus: PostStatus
  createdAt: string
}
export interface AdminPostDetail {
  post: Post
  recentActions: ModerationLog[]
}
export type CommunityAction = 'hide' | 'publish' | 'delete'
export type CommunityEntity = 'posts' | 'comments'
