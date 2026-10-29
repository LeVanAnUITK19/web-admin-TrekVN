import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Eye, Save } from 'lucide-react'
import { toast } from 'sonner'
import { usePlaceMapAdmin, useUpdatePlaceOfflineMap, downloadPlaceMap } from './useOfflineMaps'
import { PageLoader } from '@/components/feedback/PageLoader'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PlaceOfflineMap } from '@/components/map/PlaceOfflineMap'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { adminError } from '@/lib/admin-error'

import { placeMapSchema } from './placeMapSchema'
type FormData = z.infer<typeof placeMapSchema>

export default function PlaceOfflineMapDetailPage() {
  const { placeId = '' } = useParams()
  const query = usePlaceMapAdmin(placeId)
  const mutation = useUpdatePlaceOfflineMap()
  const [draft, setDraft] = useState<FormData | null>(null)
  const [preview, setPreview] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const { register, reset, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(placeMapSchema) })
  useEffect(() => {
    if (!query.data) return
    const map = query.data.map
    reset({ available: map.available ?? false, version: map.version ?? 0, objectKey: map.objectKey ?? '', checksum: map.checksum ?? '',
      sizeBytes: map.sizeBytes ?? undefined, minZoom: map.minZoom ?? undefined, maxZoom: map.maxZoom ?? undefined,
      minLat: map.bounds?.minLat, minLon: map.bounds?.minLon, maxLat: map.bounds?.maxLat, maxLon: map.bounds?.maxLon })
  }, [query.data, reset])
  if (query.isLoading) return <PageLoader />
  if (query.isError || !query.data) return <ErrorState retry={query.refetch} />
  const { place, map } = query.data
  async function save() {
    if (!draft) return
    setError('')
    try {
      const { minLat, minLon, maxLat, maxLon, ...data } = draft
      await mutation.mutateAsync({ placeId, data: { ...data, sizeBytes: data.sizeBytes ?? null,
        minZoom: data.minZoom ?? null, maxZoom: data.maxZoom ?? null,
        bounds: minLat == null ? null : { minLat, minLon: minLon!, maxLat: maxLat!, maxLon: maxLon! } } })
      setDraft(null); setPreview(false)
    } catch (err) { setError(adminError(err)) }
  }
  const field = (name: keyof FormData, label: string, type = 'text') => <label className="block text-sm" key={name}>
    <span className="block mb-1.5 font-medium">{label}</span>
    <input {...register(name)} type={type} step={type === 'number' ? 'any' : undefined} className="w-full border rounded-md px-3 py-2" />
    {errors[name] && <span className="text-destructive text-xs">{errors[name]?.message}</span>}
  </label>
  return <div className="space-y-5">
    <Link to="/offline-maps?tab=places" className="text-sm text-primary">← Bản đồ địa điểm</Link>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-semibold">Bản đồ · {place.name}</h1><p className="text-sm text-muted-foreground mt-1">Quản lý phiên bản và quyền tải bản đồ của địa điểm.</p></div>
      <Link to={`/trekking/places/${placeId}`} className="text-sm text-primary underline">Xem địa điểm</Link>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[
      ['Trạng thái', map.available ? 'Đang cho tải xuống' : 'Chưa bật tải xuống'], ['Phiên bản', `v${map.version ?? 0}`],
      ['Dung lượng', map.sizeBytes ? formatFileSize(map.sizeBytes) : '—'], ['Cập nhật', formatDateTime(place.updatedAt)],
    ].map(([label, value]) => <div key={label} className="bg-white border rounded-lg p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="font-medium text-sm mt-2">{value}</p></div>)}</div>
    <div className="flex flex-wrap gap-3">
      {map.available && map.objectKey && <>
        <button onClick={() => setPreview(!preview)} className="border rounded-md px-3 py-2 text-sm inline-flex items-center gap-2"><Eye size={16} />{preview ? 'Đóng xem trước' : 'Xem trước bản đồ'}</button>
        <button disabled={downloading} onClick={async () => { setDownloading(true); try { await downloadPlaceMap(placeId) } catch { toast.error('Không tải được ZIP bản đồ. Vui lòng thử lại.') } finally { setDownloading(false) } }} className="border rounded-md px-3 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50"><Download size={16} />{downloading ? 'Đang tải…' : 'Tải ZIP'}</button>
      </>}
      <Link to={`/agent/map-builder?placeId=${placeId}`} className="text-sm border rounded-md px-3 py-2 text-primary">Tạo phiên bản bằng Map Builder</Link>
    </div>
    {preview && <PlaceOfflineMap placeId={placeId} placeName={place.name} />}
    <form onSubmit={handleSubmit(data => { setError(''); setDraft(data) })} className="bg-white border rounded-lg p-5 space-y-5">
      <h2 className="font-semibold">Cấu hình gói bản đồ</h2>
      <fieldset disabled={mutation.isPending} className="space-y-5">
        <label className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg"><input type="checkbox" {...register('available')} className="mt-1" /><span className="text-sm"><strong>Cho phép tải trên ứng dụng</strong><span className="block text-muted-foreground mt-1">Tắt để ngừng cung cấp bản đồ. File và thông tin phiên bản vẫn được giữ lại.</span></span></label>
        <div className="grid sm:grid-cols-2 gap-4">{field('version', 'Phiên bản', 'number')}{field('sizeBytes', 'Dung lượng (bytes)', 'number')}</div>
        {field('objectKey', 'Đường dẫn file trong kho bản đồ (Object Key)')}
        <p className="text-xs text-muted-foreground">Dùng file đã xuất bản bởi Map Builder hoặc đã tải lên kho lưu trữ. Cập nhật metadata không tự tải file lên.</p>
        {field('checksum', 'Checksum SHA256')}
        <div className="grid sm:grid-cols-2 gap-4">{field('minZoom', 'Min zoom', 'number')}{field('maxZoom', 'Max zoom', 'number')}</div>
        <h3 className="font-medium text-sm">Vùng bao phủ</h3>
        <div className="grid sm:grid-cols-2 gap-4">{field('minLat', 'Vĩ độ nhỏ nhất', 'number')}{field('maxLat', 'Vĩ độ lớn nhất', 'number')}{field('minLon', 'Kinh độ nhỏ nhất', 'number')}{field('maxLon', 'Kinh độ lớn nhất', 'number')}</div>
        <div className="flex justify-end"><button type="submit" className="inline-flex items-center gap-2 bg-primary text-white rounded-md px-4 py-2 text-sm"><Save size={16} />Lưu thay đổi</button></div>
      </fieldset>
    </form>
    <ConfirmDialog open={!!draft} onOpenChange={open => { if (!open && !mutation.isPending) setDraft(null) }}
      title="Cập nhật bản đồ địa điểm?" description={<>{draft?.available ? 'Người dùng sẽ tải được phiên bản bản đồ này trên ứng dụng.' : 'Người dùng sẽ không tải được bản đồ này cho đến khi bật lại.'}{error && <span role="alert" className="block text-destructive mt-2">{error}</span>}</>}
      onConfirm={save} isLoading={mutation.isPending} closeOnConfirm={false} confirmLabel="Lưu cấu hình" />
  </div>
}
