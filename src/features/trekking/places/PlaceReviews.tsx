import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'

interface PlaceReview {
  detailEvaluateId: string
  userId: string
  displayName?: string
  point: number
  content?: string
  isAnonymous: boolean
  imagesUrl: string[]
  videoUrl: string[]
  editCount?: number
  createdAt: string
  updatedAt: string
}

export function PlaceReviews({ placeId }: { placeId: string }) {
  const [page, setPage] = useState(1)
  const qc = useQueryClient()
  const endpoint = `${ENDPOINTS.ADMIN_PLACES}/${placeId}/reviews`
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['place-reviews', placeId, page],
    queryFn: async () => {
      const response = await apiClient.get(endpoint, { params: { page, limit: 10 } })
      return response.data.data as { items: PlaceReview[]; total: number }
    },
  })
  const remove = useMutation({
    mutationFn: (reviewId: string) => apiClient.delete(`${endpoint}/${reviewId}`),
    onSuccess: async () => {
      toast.success('Đã gỡ đánh giá')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['place-reviews', placeId] }),
        qc.invalidateQueries({ queryKey: ['place', placeId] }),
        qc.invalidateQueries({ queryKey: ['places'] }),
      ])
    },
    onError: () => toast.error('Không thể gỡ đánh giá. Vui lòng thử lại.'),
  })
  return <section className="bg-white rounded-lg border border-border p-6">
    <h2 className="text-lg font-semibold mb-4">Đánh giá & bình luận địa điểm ({data?.total ?? 0})</h2>
    {isLoading && <p>Đang tải đánh giá…</p>}
    {isError && <button onClick={() => refetch()}>Không tải được đánh giá · Thử lại</button>}
    {data?.items.length === 0 && <p>Chưa có đánh giá trên trang này.</p>}
    {data?.items.map(review => <article key={review.detailEvaluateId} className="border-b py-4 space-y-2">
      <div className="flex justify-between gap-3">
        <div>
          <p className="font-medium">{review.displayName ?? 'Trekker'} · {review.point}/5 ⭐</p>
          <p className="text-xs text-muted-foreground">Người dùng: {review.userId} {review.isAnonymous && '(Ẩn danh công khai)'}</p>
          <p className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString('vi-VN')} · Đã sửa: {review.editCount ?? 0}/1</p>
        </div>
        <button disabled={remove.isPending} className="text-red-600 disabled:opacity-50"
          onClick={() => { if (window.confirm('Gỡ đánh giá này khỏi địa điểm?')) remove.mutate(review.detailEvaluateId) }}>Gỡ đánh giá</button>
      </div>
      <p className="whitespace-pre-wrap">{review.content}</p>
      <div className="flex flex-wrap gap-2">
        {review.imagesUrl.map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh đánh giá" className="w-24 h-24 object-cover rounded" /></a>)}
        {review.videoUrl.map((url, index) => <video key={index} src={url} controls className="w-48" />)}
      </div>
    </article>)}
    <div className="flex items-center gap-4 mt-4">
      <button disabled={page === 1 || isLoading || remove.isPending} onClick={() => setPage(page - 1)}>Trang trước</button>
      <span>Trang {page}</span>
      <button disabled={!data || page * 10 >= data.total || isLoading || remove.isPending} onClick={() => setPage(page + 1)}>Trang sau</button>
    </div>
  </section>
}
