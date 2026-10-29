import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, RefreshCw, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState } from '@/components/feedback/ErrorState'
import { EmptyState } from '@/components/feedback/EmptyState'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { adminError } from '@/lib/admin-error'
import { formatDateTime } from '@/lib/utils'
import * as Dialog from '@radix-ui/react-dialog'

interface PlaceReview {
  detailEvaluateId: string; trekkingPlaceId: string | null; placeName: string; userId: string
  point: number; content?: string; isAnonymous: boolean; imagesUrl: string[]; videoUrl: string[]
  createdAt: string; updatedAt: string; deleted: boolean; removedBy?: string; editCount: number
}
export default function ReviewsPage() {
  const [params, setParams] = useSearchParams()
  const placeId = params.get('placeId') || ''
  const [placeSearch, setPlaceSearch] = useState('')
  const [search, setSearch] = useState('')
  const [point, setPoint] = useState('')
  const [status, setStatus] = useState('ACTIVE')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<PlaceReview | null>(null)
  const [removeTarget, setRemoveTarget] = useState<PlaceReview | null>(null)
  const [error, setError] = useState('')
  const qc = useQueryClient()
  const places = useQuery({ queryKey: ['review-place-options', placeSearch], queryFn: async ({ signal }) =>
    (await apiClient.get('/admin/trekking/places', { params: { search: placeSearch, page: 1, limit: 100 }, signal })).data.data.data as { trekkingPlaceId?: string; id?: string; _id?: string; name: string }[] })
  const query = useQuery({ queryKey: ['admin-place-reviews', { placeId, search, point, status, page }], queryFn: async ({ signal }) =>
    (await apiClient.get('/admin/trekking/reviews', { params: { ...(placeId && { placeId }), ...(search && { search }), ...(point && { point }), status, page, limit: 20 }, signal })).data.data as { items: PlaceReview[]; total: number; page: number; limit: number; totalPages: number } })
  const remove = useMutation({ mutationFn: (review: PlaceReview) => apiClient.delete(`/admin/trekking/places/${review.trekkingPlaceId}/reviews/${review.detailEvaluateId}`),
    onSuccess: async () => {
      setRemoveTarget(null); setSelected(null); toast.success('Đã gỡ đánh giá và cập nhật điểm địa điểm')
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1)
      await Promise.all([['admin-place-reviews'], ['place-reviews'], ['places'], ['place']].map(queryKey => qc.invalidateQueries({ queryKey })))
    }, onError: err => setError(adminError(err)) })
  return <div className="space-y-5">
    <PageHeader title="Đánh giá địa điểm" description="Xem phản hồi của trekker và gỡ nội dung không phù hợp. Điểm địa điểm được tính lại sau khi gỡ." />
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <div className="flex flex-wrap gap-3">
        <SearchInput value={search} onChange={value => { setSearch(value); setPage(1) }} placeholder="Tìm nội dung, người dùng, địa điểm…" className="w-full sm:w-80" />
        <select aria-label="Số sao" value={point} onChange={e => { setPoint(e.target.value); setPage(1) }} className="border rounded-md px-3 py-2 text-sm"><option value="">Tất cả số sao</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}</select>
        <select aria-label="Trạng thái đánh giá" value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="border rounded-md px-3 py-2 text-sm"><option value="ACTIVE">Đang hiển thị</option><option value="DELETED">Đã gỡ</option><option value="ALL">Tất cả trạng thái</option></select>
        <button onClick={() => void query.refetch()} disabled={query.isFetching} className="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm"><RefreshCw size={16} />Làm mới</button>
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <SearchInput value={placeSearch} onChange={setPlaceSearch} placeholder="Tìm địa điểm để lọc…" className="w-full sm:w-60" />
        <select aria-label="Địa điểm đánh giá" value={placeId} onChange={e => { setParams(e.target.value ? { placeId: e.target.value } : {}); setPage(1) }} className="border rounded-md px-3 py-2 text-sm max-w-full"><option value="">Tất cả địa điểm</option>
          {placeId && !places.data?.some(p => (p.trekkingPlaceId || p.id || p._id) === placeId) && <option value={placeId}>Địa điểm đang chọn ({placeId})</option>}
          {places.data?.map(p => <option key={p.trekkingPlaceId || p.id || p._id} value={p.trekkingPlaceId || p.id || p._id}>{p.name}</option>)}
        </select>
        {places.isError && <button onClick={() => void places.refetch()} className="text-sm text-destructive">Không tải được bộ lọc địa điểm · Thử lại</button>}
      </div>
    </div>
    <div className="data-table-container">
      {query.isLoading ? <div className="p-5"><TableSkeleton rows={5} /></div> : query.isError ? <ErrorState retry={query.refetch} /> : !query.data?.items.length ? <EmptyState title="Không tìm thấy đánh giá" description="Thử thay đổi từ khóa, địa điểm hoặc bộ lọc." /> : <>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr>{['Địa điểm / Người dùng', 'Đánh giá', 'Nội dung', 'Trạng thái', 'Ngày đăng', 'Thao tác'].map(label => <th key={label} className="px-4 py-3 text-left whitespace-nowrap font-medium text-muted-foreground">{label}</th>)}</tr></thead>
          <tbody className="divide-y">{query.data.items.map(review => <tr key={review.detailEvaluateId} className="hover:bg-muted/20">
            <td className="px-4 py-4 min-w-48"><Link to={`/trekking/places/${review.trekkingPlaceId}`} className="font-medium text-primary">{review.placeName}</Link><p className="text-xs text-muted-foreground mt-1 break-all">{review.userId}</p>{review.isAnonymous && <p className="text-xs text-muted-foreground">Ẩn danh trên ứng dụng</p>}</td>
            <td className="px-4 py-4"><span className="inline-flex items-center gap-1 font-medium whitespace-nowrap"><Star size={15} className="text-amber-500 fill-amber-500" />{review.point}/5</span></td>
            <td className="px-4 py-4 min-w-52 max-w-sm"><p className="line-clamp-3 whitespace-pre-wrap break-words">{review.content || 'Không có lời nhận xét'}</p><p className="text-xs text-muted-foreground mt-1">{review.imagesUrl.length} ảnh · {review.videoUrl.length} video</p></td>
            <td className="px-4 py-4"><span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${review.deleted ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>{review.deleted ? 'Đã gỡ' : 'Đang hiển thị'}</span></td>
            <td className="px-4 py-4 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(review.createdAt)}</td>
            <td className="px-4 py-4"><div className="flex gap-2"><button aria-label={`Xem đánh giá ${review.detailEvaluateId}`} onClick={() => setSelected(review)} className="p-2 hover:bg-muted rounded"><Eye size={17} /></button>{!review.deleted && <button aria-label={`Gỡ đánh giá ${review.detailEvaluateId}`} disabled={remove.isPending} onClick={() => { setError(''); setRemoveTarget(review) }} className="p-2 text-destructive hover:bg-red-50 rounded"><Trash2 size={17} /></button>}</div></td>
          </tr>)}</tbody>
        </table></div>
        <Pagination page={query.data.page} totalPages={query.data.totalPages} total={query.data.total} limit={query.data.limit} onPageChange={setPage} />
      </>}
    </div>
    <Dialog.Root open={!!selected} onOpenChange={open => { if (!open) setSelected(null) }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" /><Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-xl p-6 w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] overflow-y-auto">
      <Dialog.Title className="font-semibold text-lg">Chi tiết đánh giá · {selected?.placeName}</Dialog.Title><Dialog.Description className="text-sm text-muted-foreground mt-2">{selected?.point}/5 sao · {selected?.deleted ? 'Đã gỡ' : 'Đang hiển thị'} · Đã sửa {selected?.editCount ?? 0} lần</Dialog.Description>
      <p className="whitespace-pre-wrap break-words my-4">{selected?.content || 'Không có lời nhận xét'}</p>
      <div className="grid grid-cols-2 gap-3">{selected?.imagesUrl.map((url, i) => <a href={url} target="_blank" rel="noreferrer" key={url}><img src={url} alt={`Ảnh đánh giá ${i + 1}`} className="rounded-lg w-full aspect-square object-cover" /></a>)}</div>
      {selected?.videoUrl.map(url => <video key={url} src={url} controls className="w-full mt-3 rounded-lg" />)}
      <p className="text-xs text-muted-foreground mt-4 break-all">Người dùng: {selected?.userId}{selected?.removedBy && ` · Gỡ bởi: ${selected.removedBy}`}</p>
      <Dialog.Close className="mt-5 px-4 py-2 border rounded-md text-sm">Đóng</Dialog.Close>
    </Dialog.Content></Dialog.Portal></Dialog.Root>
    <ConfirmDialog open={!!removeTarget} onOpenChange={open => { if (!open && !remove.isPending) setRemoveTarget(null) }} title="Gỡ đánh giá địa điểm?" confirmLabel="Gỡ đánh giá" variant="danger" closeOnConfirm={false} isLoading={remove.isPending}
      description={<>Đánh giá sẽ được gỡ khỏi ứng dụng và không còn tính vào điểm trung bình. Bản ghi được giữ trong danh sách đã gỡ.{error && <span role="alert" className="text-destructive block mt-2">{error}</span>}</>}
      onConfirm={() => { if (removeTarget) remove.mutate(removeTarget) }} />
  </div>
}
