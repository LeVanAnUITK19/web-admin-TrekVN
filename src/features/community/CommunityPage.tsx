import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { EyeOff, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import {
  usePosts, useHidePost, useDeletePost,
  useComments, useHideComment,
  useReviews, useHideReview,
} from './useCommunity'
import { formatDateTime, truncate } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE } from '@/constants'
import type { Post, Comment, Review } from '@/types'

type TabValue = 'posts' | 'comments' | 'reviews'

export default function CommunityPage() {
  const [tab, setTab] = useState<TabValue>('posts')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const params = { page, limit: DEFAULT_PAGE_SIZE, search }

  const postsQuery = usePosts(params)
  const commentsQuery = useComments(params)
  const reviewsQuery = useReviews(params)

  const hidePost = useHidePost()
  const deletePost = useDeletePost()
  const hideComment = useHideComment()
  const hideReview = useHideReview()

  const [confirm, setConfirm] = useState<{ action: 'hide' | 'delete'; id: string; label: string } | null>(null)

  const handleConfirm = async () => {
    if (!confirm) return
    if (confirm.action === 'hide') {
      if (tab === 'posts') await hidePost.mutateAsync(confirm.id)
      else if (tab === 'comments') await hideComment.mutateAsync(confirm.id)
      else await hideReview.mutateAsync(confirm.id)
    } else {
      if (tab === 'posts') await deletePost.mutateAsync(confirm.id)
    }
    setConfirm(null)
  }

  const isLoading =
    tab === 'posts' ? postsQuery.isLoading :
    tab === 'comments' ? commentsQuery.isLoading :
    reviewsQuery.isLoading
  const isError =
    tab === 'posts' ? postsQuery.isError :
    tab === 'comments' ? commentsQuery.isError :
    reviewsQuery.isError
  const refetch =
    tab === 'posts' ? postsQuery.refetch :
    tab === 'comments' ? commentsQuery.refetch :
    reviewsQuery.refetch

  return (
    <div>
      <PageHeader title="Quản lý bài viết cộng đồng" description="Kiểm duyệt và quản lý nội dung cộng đồng" />

      <Tabs.Root value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); setSearch('') }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Tabs.List className="flex border-b border-border gap-1">
            {[
              { value: 'posts', label: 'Bài viết' },
              { value: 'comments', label: 'Bình luận' },
              { value: 'reviews', label: 'Đánh giá' },
            ].map((t) => (
              <Tabs.Trigger
                key={t.value}
                value={t.value}
                className="px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px data-[state=active]:border-primary data-[state=active]:text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground hover:text-foreground"
              >
                {t.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Tìm kiếm..."
            className="w-64"
          />
        </div>

        {/* Posts Tab */}
        <Tabs.Content value="posts">
          {isLoading ? <div className="data-table-container p-5"><TableSkeleton /></div>
            : isError ? <ErrorState retry={refetch} />
            : !postsQuery.data?.data?.length ? <div className="data-table-container"><EmptyState title="Không có bài viết" /></div>
            : (
              <div className="data-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        {['Nội dung', 'Tác giả', 'Ngày đăng', 'Trạng thái', ''].map((col) => (
                          <th key={col} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(postsQuery.data?.data ?? []).map((post: Post) => (
                        <tr key={post.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 max-w-xs">
                            <p className="font-medium text-foreground text-sm">{truncate(post.title, 50)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{truncate(post.content, 80)}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{post.author.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(post.createdAt)}</td>
                          <td className="px-4 py-3"><StatusBadge status={post.status} /></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {post.status === 'ACTIVE' && (
                                <button
                                  onClick={() => setConfirm({ action: 'hide', id: post.id, label: post.title })}
                                  className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded"
                                  title="Ẩn bài viết"
                                >
                                  <EyeOff className="w-4 h-4" />
                                </button>
                              )}
                              {post.status !== 'DELETED' && (
                                <button
                                  onClick={() => setConfirm({ action: 'delete', id: post.id, label: post.title })}
                                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded"
                                  title="Xóa bài viết"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {postsQuery.data && (
                  <Pagination
                    page={postsQuery.data.page} totalPages={postsQuery.data.totalPages}
                    total={postsQuery.data.total} limit={postsQuery.data.limit} onPageChange={setPage}
                  />
                )}
              </div>
            )}
        </Tabs.Content>

        {/* Comments Tab */}
        <Tabs.Content value="comments">
          {isLoading ? <div className="data-table-container p-5"><TableSkeleton /></div>
            : isError ? <ErrorState retry={refetch} />
            : !commentsQuery.data?.data?.length ? <div className="data-table-container"><EmptyState title="Không có bình luận" /></div>
            : (
              <div className="data-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        {['Nội dung', 'Tác giả', 'Bài viết', 'Ngày đăng', 'Trạng thái', ''].map((col) => (
                          <th key={col} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(commentsQuery.data?.data ?? []).map((comment: Comment) => (
                        <tr key={comment.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 max-w-xs text-sm text-foreground">{truncate(comment.content, 80)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{comment.author.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{truncate(comment.postTitle ?? '-', 40)}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(comment.createdAt)}</td>
                          <td className="px-4 py-3"><StatusBadge status={comment.status} /></td>
                          <td className="px-4 py-3">
                            {comment.status === 'ACTIVE' && (
                              <button
                                onClick={() => setConfirm({ action: 'hide', id: comment.id, label: 'bình luận này' })}
                                className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {commentsQuery.data && (
                  <Pagination
                    page={commentsQuery.data.page} totalPages={commentsQuery.data.totalPages}
                    total={commentsQuery.data.total} limit={commentsQuery.data.limit} onPageChange={setPage}
                  />
                )}
              </div>
            )}
        </Tabs.Content>

        {/* Reviews Tab */}
        <Tabs.Content value="reviews">
          {isLoading ? <div className="data-table-container p-5"><TableSkeleton /></div>
            : isError ? <ErrorState retry={refetch} />
            : !reviewsQuery.data?.data?.length ? <div className="data-table-container"><EmptyState title="Không có đánh giá" /></div>
            : (
              <div className="data-table-container">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        {['Nội dung', 'Tác giả', 'Địa điểm', 'Rating', 'Trạng thái', ''].map((col) => (
                          <th key={col} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {(reviewsQuery.data?.data ?? []).map((review: Review) => (
                        <tr key={review.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 max-w-xs text-sm text-foreground">{truncate(review.content, 80)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{review.author.name}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{review.placeName ?? '-'}</td>
                          <td className="px-4 py-3 text-sm">{'⭐'.repeat(review.rating)}</td>
                          <td className="px-4 py-3"><StatusBadge status={review.status} /></td>
                          <td className="px-4 py-3">
                            {review.status === 'ACTIVE' && (
                              <button
                                onClick={() => setConfirm({ action: 'hide', id: review.id, label: 'đánh giá này' })}
                                className="p-1.5 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 rounded"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {reviewsQuery.data && (
                  <Pagination
                    page={reviewsQuery.data.page} totalPages={reviewsQuery.data.totalPages}
                    total={reviewsQuery.data.total} limit={reviewsQuery.data.limit} onPageChange={setPage}
                  />
                )}
              </div>
            )}
        </Tabs.Content>
      </Tabs.Root>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => { if (!open) setConfirm(null) }}
        title={confirm?.action === 'delete' ? 'Xóa nội dung' : 'Ẩn nội dung'}
        description={
          confirm?.action === 'delete'
            ? `Bạn có chắc muốn xóa "${confirm?.label}"? Hành động này không thể hoàn tác.`
            : `Ẩn "${confirm?.label}"? Nội dung sẽ không hiển thị với người dùng.`
        }
        confirmLabel={confirm?.action === 'delete' ? 'Xóa' : 'Ẩn'}
        variant={confirm?.action === 'delete' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
        isLoading={hidePost.isPending || deletePost.isPending || hideComment.isPending || hideReview.isPending}
      />
    </div>
  )
}
