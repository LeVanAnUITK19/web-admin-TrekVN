import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Map, Info, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import { usePlace } from '@/features/trekking/places/usePlaces'
import { useUpdatePlaceOfflineMap } from './useOfflineMaps'
import { PageLoader } from '@/components/feedback/PageLoader'
import { ErrorState } from '@/components/feedback/ErrorState'
import { formatDateTime, formatFileSize } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { getProvinceNameById } from '@/constants'

const schema = z.object({
  available: z.boolean(),
  version: z.coerce.number().int().min(0, 'Phiên bản phải >= 0'),
  objectKey: z.string().optional().or(z.literal('')),
  sizeBytes: z.coerce.number().min(0).optional(),
  checksum: z.string().optional().or(z.literal('')),
  minZoom: z.coerce.number().int().min(0).max(22).optional(),
  maxZoom: z.coerce.number().int().min(0).max(22).optional(),
  minLat: z.coerce.number().min(-90).max(90).optional(),
  minLon: z.coerce.number().min(-180).max(180).optional(),
  maxLat: z.coerce.number().min(-90).max(90).optional(),
  maxLon: z.coerce.number().min(-180).max(180).optional(),
})
type FormData = z.infer<typeof schema>

export default function PlaceOfflineMapDetailPage() {
  const { placeId } = useParams<{ placeId: string }>()
  const navigate = useNavigate()
  const { data: place, isLoading, isError, refetch } = usePlace(placeId!)
  const updateMutation = useUpdatePlaceOfflineMap()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      available: false,
      version: 0,
      objectKey: '',
      sizeBytes: undefined,
      checksum: '',
      minZoom: undefined,
      maxZoom: undefined,
      minLat: undefined,
      minLon: undefined,
      maxLat: undefined,
      maxLon: undefined,
    },
  })

  useEffect(() => {
    if (place?.offlineMap) {
      const om = place.offlineMap
      reset({
        available: om.available ?? false,
        version: om.version ?? 0,
        objectKey: '',           // không hiển thị lại objectKey hiện có
        sizeBytes: om.sizeBytes ?? undefined,
        checksum: om.checksum ?? '',
        minZoom: om.minZoom ?? undefined,
        maxZoom: om.maxZoom ?? undefined,
        minLat: om.bounds?.minLat ?? undefined,
        minLon: om.bounds?.minLon ?? undefined,
        maxLat: om.bounds?.maxLat ?? undefined,
        maxLon: om.bounds?.maxLon ?? undefined,
      })
    }
  }, [place, reset])

  const onSubmit = async (data: FormData) => {
    const hasBounds =
      data.minLat != null &&
      data.minLon != null &&
      data.maxLat != null &&
      data.maxLon != null

    const payload = {
      available: data.available,
      version: data.version,
      ...(data.objectKey ? { objectKey: data.objectKey } : {}),
      ...(data.sizeBytes != null ? { sizeBytes: data.sizeBytes } : {}),
      ...(data.checksum ? { checksum: data.checksum } : { checksum: null }),
      ...(data.minZoom != null ? { minZoom: data.minZoom } : { minZoom: null }),
      ...(data.maxZoom != null ? { maxZoom: data.maxZoom } : { maxZoom: null }),
      bounds: hasBounds
        ? {
            minLat: data.minLat!,
            minLon: data.minLon!,
            maxLat: data.maxLat!,
            maxLon: data.maxLon!,
          }
        : null,
    }

    await updateMutation.mutateAsync({ placeId: placeId!, data: payload })
    refetch()
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  if (isLoading) return <PageLoader />
  if (isError || !place) return <ErrorState retry={refetch} />

  const om = place.offlineMap
  const provinceName = place.provinceId ? getProvinceNameById(place.provinceId) : place.province

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate('/offline-maps')} className="hover:text-primary">
          Bản đồ offline
        </button>
        <span>/</span>
        <button
          onClick={() => navigate('/offline-maps')}
          className="hover:text-primary"
        >
          Bản đồ địa điểm
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{place.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => navigate('/offline-maps')}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-foreground">{place.name}</h1>
            {om?.available ? (
              <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Bản đồ có sẵn
              </span>
            ) : (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Chưa có bản đồ
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {provinceName}
            {place.address ? ` · ${place.address}` : ''}
          </p>
        </div>
        <a
          href={`/trekking/places/${place.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Xem địa điểm
        </a>
      </div>

      {/* Thông tin hiện tại */}
      {om && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Trạng thái</p>
            <p className="text-sm font-semibold text-foreground">
              {om.available ? '✅ Có sẵn' : '❌ Không có'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Phiên bản</p>
            <p className="text-sm font-semibold font-mono text-foreground">v{om.version}</p>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Dung lượng</p>
            <p className="text-sm font-semibold text-foreground">
              {om.sizeBytes ? formatFileSize(om.sizeBytes) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Cập nhật</p>
            <p className="text-sm font-semibold text-foreground">{formatDateTime(place.updatedAt)}</p>
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 mb-6">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          Bản đồ này được <strong>Agent Map Builder</strong> tạo và gắn vào địa điểm.
          Bạn có thể cập nhật thủ công metadata (version, objectKey, bounds...) nếu cần.
          Object Key là path file trên R2 — download URL được server tự build khi runtime.
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left ─────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Map className="w-4 h-4 text-primary" /> Metadata bản đồ
              </h2>
              <div className="space-y-4">
                {/* Available toggle */}
                <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    {...register('available')}
                    className="h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Bản đồ có sẵn (available)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Bật để app Flutter cho phép người dùng tải bản đồ này
                    </p>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">
                      Phiên bản <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...register('version')}
                      type="number"
                      min="0"
                      className={inputCls(!!errors.version)}
                      placeholder="1"
                    />
                    {errors.version && <p className="form-error">{errors.version.message}</p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">Dung lượng (bytes)</label>
                    <input
                      {...register('sizeBytes')}
                      type="number"
                      min="0"
                      className={inputCls()}
                      placeholder="52428800"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label block mb-1">Object Key (R2)</label>
                  <input
                    {...register('objectKey')}
                    className={inputCls()}
                    placeholder="VD: maps/nui-ba-den/v1/nui-ba-den-v1.mbtiles"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Để trống nếu không đổi.{' '}
                    {om?.objectKey && (
                      <span className="text-green-600">Hiện tại: có objectKey</span>
                    )}
                  </p>
                </div>

                <div>
                  <label className="form-label block mb-1">Checksum (SHA256)</label>
                  <input
                    {...register('checksum')}
                    className={inputCls()}
                    placeholder="sha256:abc123..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">Min Zoom</label>
                    <input
                      {...register('minZoom')}
                      type="number"
                      min="0"
                      max="22"
                      className={inputCls()}
                      placeholder="10"
                    />
                  </div>
                  <div>
                    <label className="form-label block mb-1">Max Zoom</label>
                    <input
                      {...register('maxZoom')}
                      type="number"
                      min="0"
                      max="22"
                      className={inputCls()}
                      placeholder="17"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right ────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Bounds */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Giới hạn vùng (Bounds)</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Hình chữ nhật bao phủ vùng bản đồ. Để trống tất cả nếu không cần giới hạn.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label block mb-1 text-xs">Min Latitude</label>
                  <input
                    {...register('minLat')}
                    type="number"
                    step="0.0001"
                    className={inputCls()}
                    placeholder="10.3"
                  />
                </div>
                <div>
                  <label className="form-label block mb-1 text-xs">Min Longitude</label>
                  <input
                    {...register('minLon')}
                    type="number"
                    step="0.0001"
                    className={inputCls()}
                    placeholder="105.9"
                  />
                </div>
                <div>
                  <label className="form-label block mb-1 text-xs">Max Latitude</label>
                  <input
                    {...register('maxLat')}
                    type="number"
                    step="0.0001"
                    className={inputCls()}
                    placeholder="11.2"
                  />
                </div>
                <div>
                  <label className="form-label block mb-1 text-xs">Max Longitude</label>
                  <input
                    {...register('maxLon')}
                    type="number"
                    step="0.0001"
                    className={inputCls()}
                    placeholder="106.8"
                  />
                </div>
              </div>
            </div>

            {/* Thông tin địa điểm */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-3">Thông tin địa điểm</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">ID</span>
                  <code className="text-xs font-mono text-foreground">{place.id}</code>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Tỉnh/TP</span>
                  <span className="text-foreground font-medium">{provinceName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Độ khó</span>
                  <span className="text-foreground">{place.difficulty}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className="text-foreground">{place.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate('/offline-maps')}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {updateMutation.isPending && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  )
}
