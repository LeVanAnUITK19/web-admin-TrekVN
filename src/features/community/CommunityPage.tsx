import { useEffect, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { Eye, EyeOff, Trash2, RotateCcw, RefreshCw, MessageSquare, Image as ImageIcon, Lock, Globe, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { usePosts, useComments, usePostDetail, communityError } from './useCommunity'
import { ModerationDialog, type ModerationTarget } from './ModerationDialog'
import SocialAdmin from './SocialAdmin'
import { formatDateTime, truncate } from '@/lib/utils'
import { DEFAULT_PAGE_SIZE, ROUTES } from '@/constants'
import type { Post, Comment, CommunityListParams, CommunityEntity, PostStatus } from '@/types'

const types: Record<string, string> = { NORMAL: 'Bài viết', JOURNEY_SHARE: 'Hành trình', BADGE_SHARE: 'Chia sẻ thành tích' }
const statusLabels = { ACTIVE: 'Đang hiển thị', HIDDEN: 'Đã ẩn', DELETED: 'Đã xóa' }
const inputClass = 'rounded-md border border-border bg-white px-3 py-2 text-sm w-full min-w-0 focus:ring-2 focus:ring-primary/30'

function Author({ author }: { author: Post['author'] }) {
  return <div className="flex gap-2 items-center min-w-[120px]">
    {author.avatarUrl ? <img src={author.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
      : <span className="w-8 h-8 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">{author.name.slice(0, 1)}</span>}
    <div><p className="font-medium">{author.name}</p><p className="text-xs text-muted-foreground font-mono break-all" title={author.id}>{truncate(author.id, 14)}</p></div>
  </div>
}
function Actions({ item, entity, choose }: { item: Post | Comment; entity: CommunityEntity; choose: (t: ModerationTarget) => void }) {
  const blocked = item.status === 'DELETED' || (entity === 'comments' && (item as Comment).postStatus === 'DELETED')
  if (item.status === 'DELETED') return <span className="text-xs text-muted-foreground">Đã kết thúc</span>
  return <div className="flex gap-1">
    {!blocked && <button title={item.status === 'ACTIVE' ? 'Ẩn nội dung' : 'Hiển thị lại'} aria-label={`${item.status === 'ACTIVE' ? 'Ẩn' : 'Hiển thị lại'} ${item.id}`}
      className="rounded p-2 hover:bg-amber-50 text-amber-700" onClick={() => choose({ entity, id: item.id, action: item.status === 'ACTIVE' ? 'hide' : 'publish', label: truncate(item.content || item.id, 90) })}>
      {item.status === 'ACTIVE' ? <EyeOff size={16} /> : <RotateCcw size={16} />}</button>}
    <button title="Xóa nội dung" aria-label={`Xóa ${item.id}`} className="rounded p-2 hover:bg-red-50 text-destructive"
      onClick={() => choose({ entity, id: item.id, action: 'delete', label: truncate(item.content || item.id, 90) })}><Trash2 size={16} /></button>
  </div>
}

function PostDetail({ id, onClose, choose }: { id: string | null; onClose: () => void; choose: (t: ModerationTarget) => void }) {
  const detail = usePostDetail(id)
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [id])
  const comments = useComments({ postId: id ?? undefined, page, limit: 10 }, !!id)
  const p = detail.data?.post
  return <Dialog.Root open={!!id} onOpenChange={(open) => { if (!open) onClose() }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
      <Dialog.Content className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-3xl bg-white shadow-xl overflow-y-auto p-5 sm:p-7">
        <div className="flex justify-between gap-4 mb-2"><Dialog.Title className="text-lg font-semibold">Chi tiết bài viết</Dialog.Title>
          <Dialog.Close aria-label="Đóng chi tiết" className="p-1"><X size={20} /></Dialog.Close></div>
        <Dialog.Description className="text-xs text-muted-foreground break-all mb-5">{id}</Dialog.Description>
        {detail.isPending ? <TableSkeleton /> : detail.isError ? <ErrorState description={communityError(detail.error)} retry={() => void detail.refetch()} /> : p && <>
          <div className="flex justify-between gap-3 flex-wrap"><Author author={p.author} /><StatusBadge status={p.status} label={statusLabels[p.status]} /></div>
          <div className="flex gap-3 flex-wrap text-xs text-muted-foreground mt-4">
            <span>{p.visibility === 'PRIVATE' ? 'Chỉ mình tác giả' : 'Công khai'}</span><span>{types[p.type ?? 'NORMAL']}</span><span>{formatDateTime(p.createdAt)}</span>
          </div>
          <p className="whitespace-pre-wrap break-words mt-5 text-sm leading-6">{p.content || (p.status === 'DELETED' ? 'Nội dung đã bị xóa.' : 'Bài viết chỉ có ảnh.')}</p>
          {p.images.length > 0 && <div className="grid grid-cols-2 gap-2 mt-4">{p.images.map((url, i) => <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer">
            <img src={url} alt={`Ảnh bài viết ${i + 1}`} loading="lazy" className="rounded-lg border w-full h-44 object-cover" /></a>)}</div>}
          {(p.placeId || p.journeyId) && <dl className="text-xs bg-muted/40 rounded-lg p-3 mt-4 space-y-2 break-all">
            {p.placeId && <div><dt className="text-muted-foreground">Địa điểm</dt><dd>{p.placeId}</dd></div>}
            {p.journeyId && <div><dt className="text-muted-foreground">Hành trình</dt><dd>{p.journeyId}</dd></div>}
          </dl>}
          {p.moderationReason && <p className="text-sm border-l-2 border-amber-400 pl-3 mt-4">Lý do gần nhất: {p.moderationReason}</p>}
          <div className="flex justify-between items-center mt-5 pb-5 border-b"><span className="text-sm text-muted-foreground">{p.likesCount} lượt thích · {p.commentsCount} bình luận đang hiển thị</span>
            <Actions item={p} entity="posts" choose={choose} /></div>
          <h3 className="font-semibold mt-6 mb-3">Bình luận trong bài viết</h3>
          {comments.isPending ? <TableSkeleton /> : comments.isError ? <ErrorState description={communityError(comments.error)} retry={() => void comments.refetch()} />
            : !comments.data?.data.length ? <p className="text-sm text-muted-foreground">Chưa có bình luận.</p>
            : <div className="divide-y">{comments.data.data.map(c => <article key={c.id} className="py-4">
              <div className="flex justify-between gap-3"><Author author={c.author} /><Actions item={c} entity="comments" choose={choose} /></div>
              <p className="whitespace-pre-wrap break-words text-sm mt-2">{c.content || 'Bình luận đã xóa.'}</p>
              <div className="flex flex-wrap gap-2 mt-2"><StatusBadge status={c.status} label={statusLabels[c.status]} />
                {c.parentCommentId && <span className="text-xs text-muted-foreground">Phản hồi bình luận {truncate(c.parentCommentId, 12)}</span>}</div>
              {c.moderationReason && <p className="text-xs text-muted-foreground mt-2">Lý do: {c.moderationReason}</p>}
            </article>)}</div>}
          {!!comments.data?.total && <Pagination {...comments.data} onPageChange={setPage} />}
          <h3 className="font-semibold mt-6 mb-3">Lịch sử kiểm duyệt gần nhất</h3>
          {!detail.data?.recentActions.length ? <p className="text-sm text-muted-foreground">Chưa có thao tác kiểm duyệt.</p> :
            <ol className="space-y-3">{detail.data.recentActions.map(log => <li key={log.logId} className="bg-muted/40 p-3 rounded-lg text-xs">
              <p className="font-medium">{statusLabels[log.beforeStatus]} → {statusLabels[log.afterStatus]} · {log.entityType === 'POST' ? 'Bài viết' : 'Bình luận'}</p>
              <p className="whitespace-pre-wrap break-words mt-1">{log.reason}</p><p className="text-muted-foreground mt-1 break-all">{formatDateTime(log.createdAt)} · Admin {log.adminId}</p>
            </li>)}</ol>}
        </>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}

export default function CommunityPage() {
  const [social, setSocial] = useState(false)
  const [tab, setTab] = useState<CommunityEntity>('posts')
  const [search, setSearch] = useState(''), [debounced, setDebounced] = useState('')
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(''), [visibility, setVisibility] = useState(''), [type, setType] = useState('')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [target, setTarget] = useState<ModerationTarget | null>(null)
  useEffect(() => { const timer = setTimeout(() => { setDebounced(search.trim()); setPage(1) }, 350); return () => clearTimeout(timer) }, [search])
  const params: CommunityListParams = { page, limit: DEFAULT_PAGE_SIZE,
    ...(debounced ? { search: debounced } : {}), ...(status ? { status } : {}),
    ...(tab === 'posts' && visibility ? { visibility: visibility as Post['visibility'] } : {}),
    ...(tab === 'posts' && type ? { type: type as Post['type'] } : {}),
  }
  const posts = usePosts(params, !social && tab === 'posts'), comments = useComments(params, !social && tab === 'comments')
  const query = tab === 'posts' ? posts : comments
  const data = query.data
  useEffect(() => {
    if (data && page > 1 && page > data.totalPages) setPage(Math.max(1, data.totalPages))
  }, [data, page])
  function reset() { setSearch(''); setDebounced(''); setStatus(''); setVisibility(''); setType(''); setPage(1) }

  if (social) return <SocialAdmin back={() => setSocial(false)} />
  return <div>
    <div className="flex justify-end mb-3"><button onClick={() => setSocial(true)} className="border rounded-md px-4 py-2 text-sm text-primary bg-white">Nhóm & báo cáo tin nhắn</button></div>
    <PageHeader title="Quản lý bài viết cộng đồng" description="Theo dõi bài viết, xem ngữ cảnh và kiểm duyệt nội dung trên app." />
    <div className="flex items-center justify-between gap-3 mb-5">
      <Tabs.Root value={tab} onValueChange={(value) => { setTab(value as CommunityEntity); reset() }}>
        <Tabs.List aria-label="Nội dung cộng đồng" className="inline-flex bg-muted rounded-lg p-1">
          <Tabs.Trigger value="posts" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Bài viết</Tabs.Trigger>
          <Tabs.Trigger value="comments" className="px-4 py-2 text-sm rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">Bình luận</Tabs.Trigger>
        </Tabs.List>
      </Tabs.Root>
      <button onClick={() => void query.refetch()} disabled={query.isFetching} className="inline-flex gap-2 items-center text-sm border rounded-md px-3 py-2 disabled:opacity-50"><RefreshCw size={15} />Làm mới</button>
    </div>
    <div className="border rounded-xl bg-white p-4 mb-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm nội dung hoặc ID…" className="lg:col-span-1" />
        <label className="sr-only" htmlFor="community-status">Trạng thái</label>
        <select id="community-status" aria-label="Trạng thái" className={inputClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Tất cả trạng thái</option>{Object.entries(statusLabels).map(([v, label]) => <option value={v} key={v}>{label}</option>)}</select>
        {tab === 'posts' && <>
          <select aria-label="Quyền riêng tư" className={inputClass} value={visibility} onChange={(e) => { setVisibility(e.target.value); setPage(1) }}><option value="">Tất cả quyền riêng tư</option><option value="PUBLIC">Công khai</option><option value="PRIVATE">Chỉ mình tác giả</option></select>
          <select aria-label="Loại bài viết" className={inputClass} value={type} onChange={(e) => { setType(e.target.value); setPage(1) }}><option value="">Tất cả loại bài</option>{Object.entries(types).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>
        </>}
      </div>
      <div className="flex justify-between gap-3 mt-3 text-xs text-muted-foreground"><span>{data ? `${data.total} ${tab === 'posts' ? 'bài viết' : 'bình luận'} phù hợp` : 'Đang lấy dữ liệu từ cộng đồng…'}</span>
        {(search || status || visibility || type) && <button className="text-primary" onClick={reset}>Xóa bộ lọc</button>}</div>
    </div>
    {query.isPending ? <div className="data-table-container p-5"><TableSkeleton /></div>
      : query.isError ? <ErrorState title="Không tải được nội dung cộng đồng" description={communityError(query.error)} retry={() => void query.refetch()} />
      : !data?.data.length ? <div className="data-table-container"><EmptyState title={tab === 'posts' ? 'Không có bài viết phù hợp' : 'Không có bình luận phù hợp'} description="Thử thay đổi bộ lọc hoặc tải lại danh sách." /></div>
      : <div className="data-table-container">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-muted/50 border-b">
          {['Nội dung', 'Tác giả', tab === 'posts' ? 'Phạm vi' : 'Bài viết', 'Tương tác', 'Ngày đăng', 'Kiểm duyệt', 'Thao tác'].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{label}</th>)}
        </tr></thead><tbody className="divide-y">{data.data.map(item => <tr key={item.id} className="hover:bg-muted/20 align-top">
          <td className="p-4 min-w-[240px] max-w-sm"><button className="font-medium text-left hover:text-primary line-clamp-2 break-words" onClick={() => setDetailId(tab === 'posts' ? item.id : (item as Comment).postId)}>
            {item.content ? truncate(item.content, 130) : item.status === 'DELETED' ? 'Nội dung đã xóa' : 'Bài viết chỉ có ảnh'}</button>
            <p className="text-xs text-muted-foreground mt-2 flex gap-2 items-center">{tab === 'posts' ? <>{types[(item as Post).type ?? 'NORMAL']}{(item as Post).images.length > 0 && <span className="flex gap-1 items-center"><ImageIcon size={12} />{(item as Post).images.length} ảnh</span>}</> : (item as Comment).parentCommentId ? 'Phản hồi bình luận' : 'Bình luận gốc'}</p>
          </td>
          <td className="p-4"><Author author={item.author} /></td>
          <td className="p-4 min-w-[130px]">{tab === 'posts' ? <span className="inline-flex gap-1 text-xs items-center">{(item as Post).visibility === 'PRIVATE' ? <><Lock size={13} />Chỉ mình tác giả</> : <><Globe size={13} />Công khai</>}</span>
            : <button className="text-xs text-primary text-left line-clamp-2" onClick={() => setDetailId((item as Comment).postId)}>{(item as Comment).postTitle || 'Bài viết đã xóa'}</button>}</td>
          <td className="p-4 text-xs whitespace-nowrap">{item.likesCount} lượt thích{tab === 'posts' && <span className="flex items-center gap-1 mt-1 text-muted-foreground"><MessageSquare size={12} />{(item as Post).commentsCount} bình luận</span>}</td>
          <td className="p-4 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(item.createdAt)}</td>
          <td className="p-4 min-w-[130px]"><StatusBadge status={item.status} label={statusLabels[item.status as PostStatus]} />{item.moderationReason && <p title={item.moderationReason} className="mt-2 text-xs text-muted-foreground max-w-[170px] line-clamp-2">{item.moderationReason}</p>}</td>
          <td className="p-4"><div className="flex"><button title="Xem chi tiết bài viết" aria-label={`Xem ${item.id}`} className="p-2 rounded hover:bg-muted" onClick={() => setDetailId(tab === 'posts' ? item.id : (item as Comment).postId)}><Eye size={16} /></button><Actions item={item} entity={tab} choose={setTarget} /></div></td>
        </tr>)}</tbody></table></div>
        <Pagination {...data} onPageChange={setPage} />
      </div>}
    <p className="mt-4 text-xs text-muted-foreground">Điểm đánh giá thuộc <Link className="text-primary underline" to={ROUTES.TREKKING_PLACES}>địa điểm trekking</Link>. Quản trị viên không chỉnh sửa nội dung thay tác giả.</p>
    <PostDetail id={detailId} onClose={() => setDetailId(null)} choose={setTarget} />
    <ModerationDialog target={target} onClose={() => setTarget(null)} />
  </div>
}
