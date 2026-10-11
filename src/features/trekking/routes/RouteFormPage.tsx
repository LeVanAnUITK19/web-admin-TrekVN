import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MapPin, Upload } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { ROUTES, DIFFICULTY_LABELS } from '@/constants'
import { cn } from '@/lib/utils'
import { usePlaces } from '@/features/trekking/places/usePlaces'
import { useCreateRoute, useUpdateRoute } from './useRoutes'
import RouteMapViewer from '@/components/map/RouteMapViewer'
import PathInputSection from '@/components/route/PathInputSection'
import type { TrekkingRoute, GeoLineString, GeoPoint } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Tên cung đường phải từ 2 ký tự'),
  placeId: z.string().min(1, 'Chọn địa điểm'),
  description: z.string().min(10, 'Mô tả phải từ 10 ký tự').max(2000),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD', 'EXPERT']),
  distance: z.coerce.number().min(0.1, 'Khoảng cách phải > 0'),
  estimatedDuration: z.coerce.number().min(1, 'Thời gian phải > 0'),
  elevationGain: z.coerce.number().min(0).optional(),
  maxElevation: z.coerce.number().min(0).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type FormData = z.infer<typeof schema>

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700 border-green-200',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  HARD: 'bg-orange-100 text-orange-700 border-orange-200',
  EXPERT: 'bg-red-100 text-red-700 border-red-200',
}

interface RouteFormPageProps {
  editRoute?: TrekkingRoute
}

export default function RouteFormPage({ editRoute }: RouteFormPageProps) {
  const navigate = useNavigate()
  const isEdit = !!editRoute
  const createMutation = useCreateRoute()
  const updateMutation = useUpdateRoute()
  const isSaving = createMutation.isPending || updateMutation.isPending
  const { data: placesData } = usePlaces({ page: 1, limit: 100 })

  // State for map and path
  const [path, setPath] = useState<GeoLineString | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      placeId: '',
      description: '',
      difficulty: 'MODERATE',
      distance: 0,
      estimatedDuration: 0,
      elevationGain: 0,
      maxElevation: 0,
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (editRoute) {
      reset({
        name: editRoute.name,
        placeId: editRoute.placeId,
        description: editRoute.description,
        difficulty: editRoute.difficulty,
        distance: editRoute.distance,
        estimatedDuration: editRoute.estimatedDuration,
        elevationGain: editRoute.elevationGain ?? 0,
        maxElevation: editRoute.maxElevation ?? 0,
        status: editRoute.status === 'DISABLED' ? 'INACTIVE' : editRoute.status,
      })

      // Load existing path and image
      setPath(editRoute.path ?? null)
      setImagePreview(editRoute.imageUrl || null)
      setImageFile(null)
    }
  }, [editRoute, reset])

  const selectedPlaceId = watch('placeId')
  const selectedDifficulty = watch('difficulty')
  const descValue = watch('description') ?? ''

  // Get selected place location for map
  const selectedPlace = placesData?.data?.find((p) => p.id === selectedPlaceId)
  const placeLocation: GeoPoint | null = selectedPlace?.location || selectedPlace?.coordinates || null

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      placeId: data.placeId,
      description: data.description,
      difficulty: data.difficulty,
      distance: data.distance,
      estimatedDuration: data.estimatedDuration,
      elevationGain: data.elevationGain,
      maxElevation: data.maxElevation,
      path,
      startLocation: path && path.coordinates.length >= 2 ? { type: 'Point' as const, coordinates: path.coordinates[0] } : null,
      endLocation: path && path.coordinates.length >= 2 ? { type: 'Point' as const, coordinates: path.coordinates[path.coordinates.length - 1] } : null,
      imageFile: imageFile || undefined,
      imageUrl: !imageFile ? imagePreview ?? '' : undefined,
      status: data.status as 'ACTIVE' | 'INACTIVE',
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: editRoute!.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    navigate(ROUTES.TREKKING_ROUTES)
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.TREKKING_ROUTES)} className="hover:text-primary">
          Cung đường
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isEdit ? 'Chỉnh sửa cung đường' : 'Thêm cung đường'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(ROUTES.TREKKING_ROUTES)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Chỉnh sửa cung đường' : 'Thêm cung đường'}
          </h1>
          <p className="text-sm text-muted-foreground">Tạo cung đường trekking mới</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left ── */}
          <div className="space-y-5">

            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">

                <div>
                  <label className="form-label block mb-1">
                    Tên cung đường <span className="text-destructive">*</span>
                  </label>
                  <input {...register('name')} className={inputCls(!!errors.name)} placeholder="Nhập tên cung đường" />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">
                    Chọn địa điểm <span className="text-destructive">*</span>
                  </label>
                  <select {...register('placeId', { onChange: () => setPath(null) })} className={inputCls(!!errors.placeId)}>
                    <option value="">Chọn địa điểm</option>
                    {placesData?.data?.map((p: { id: string; name: string; province: string }) => (
                      <option key={p.id} value={p.id}>{p.name} — {p.province}</option>
                    ))}
                  </select>
                  {errors.placeId && <p className="form-error">{errors.placeId.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">Mô tả</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    maxLength={2000}
                    className={inputCls(!!errors.description)}
                    placeholder="Nhập mô tả cung đường..."
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description
                      ? <p className="form-error">{errors.description.message}</p>
                      : <span />}
                    <span className="text-xs text-muted-foreground">{descValue.length}/2000</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Thông số kỹ thuật */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Thông số kỹ thuật</h2>
              <div className="space-y-4">

                <div>
                  <label className="form-label block mb-2">Độ khó</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setValue('difficulty', k as FormData['difficulty'])}
                        className={cn(
                          'px-3 py-1.5 text-xs font-medium rounded-md border transition-all',
                          selectedDifficulty === k
                            ? DIFFICULTY_COLORS[k]
                            : 'bg-white border-border text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">
                      Khoảng cách (km) <span className="text-destructive">*</span>
                    </label>
                    <input {...register('distance')} type="number" step="0.1" min="0" className={inputCls(!!errors.distance)} placeholder="0.0" />
                    {errors.distance && <p className="form-error">{errors.distance.message}</p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">
                      Thời gian dự kiến (phút) <span className="text-destructive">*</span>
                    </label>
                    <input {...register('estimatedDuration')} type="number" min="0" className={inputCls(!!errors.estimatedDuration)} placeholder="0" />
                    {errors.estimatedDuration && <p className="form-error">{errors.estimatedDuration.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">Độ cao leo (m)</label>
                    <input {...register('elevationGain')} type="number" min="0" className={inputCls()} placeholder="0" />
                  </div>
                  <div>
                    <label className="form-label block mb-1">Độ cao tối đa (m)</label>
                    <input {...register('maxElevation')} type="number" min="0" className={inputCls()} placeholder="0" />
                  </div>
                </div>

              </div>
            </div>

            {/* Trạng thái */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-3">Trạng thái</h2>
              <select {...register('status')} className={inputCls()}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>

          </div>

          {/* ── Right: Map & Track ── */}
          <div className="space-y-5">

            {/* Ảnh cung đường */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Ảnh cung đường</h2>

              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-full px-4 py-3 text-sm border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Click để tải ảnh lên</span>
              </button>

              {imagePreview && (
                <div className="mt-4 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null)
                      setImagePreview(null)
                      if (imageInputRef.current) imageInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-md text-xs hover:bg-destructive/90"
                  >
                    Xóa
                  </button>
                </div>
              )}
            </div>

            {/* Bản đồ */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Bản đồ và đường đi
              </h2>

              <RouteMapViewer
                placeId={selectedPlaceId}
                placeLocation={placeLocation}
                placeName={selectedPlace?.name}
                path={path}
                height="400px"
              />

              <p className="text-xs text-muted-foreground mt-3">
                {!selectedPlaceId && '⚠️ Chọn địa điểm để hiển thị bản đồ'}
                {selectedPlaceId && !path && '💡 Nhập path bên dưới để vẽ đường đi lên bản đồ'}
                {selectedPlaceId && path && `✓ Đường đi: ${path.coordinates.length} điểm`}
              </p>
              <p className="text-xs text-muted-foreground mt-2">Nền bản đồ dùng gói offline của địa điểm. Cung đường chỉ lưu ảnh riêng và path vẽ trên nền này.</p>
            </div>

            {/* Path Input */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Nhập đường đi (Path)</h2>

              <PathInputSection
                value={path}
                onChange={setPath}
                onError={(err) => console.error('Path error:', err)}
              />
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate(ROUTES.TREKKING_ROUTES)}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors">
            Hủy
          </button>
          <button type="submit" disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60">
            {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo cung đường'}
          </button>
        </div>
      </form>
    </div>
  )
}
