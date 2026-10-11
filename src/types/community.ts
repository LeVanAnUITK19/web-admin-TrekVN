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
}
