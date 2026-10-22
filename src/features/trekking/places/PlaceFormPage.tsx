import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, X, MapPin, Image as ImageIcon, Map } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ROUTES, PROVINCE_OPTIONS, DIFFICULTY_LABELS } from '@/constants'
import { cn } from '@/lib/utils'
import { useCreatePlace, useUpdatePlace } from './usePlaces'
import type { Place } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Tên địa điểm phải từ 2 ký tự').max(200, 'Tên tối đa 200 ký tự'),
  provinceId: z.string().min(1, 'Chọn tỉnh/thành phố'),
  mien: z.enum(['mien-bac', 'mien-trung', 'mien-nam'], { required_error: 'Chọn vùng miền' }),
  address: z.string().max(500, 'Địa chỉ tối đa 500 ký tự').optional(),
  description: z.string().min(10, 'Mô tả phải từ 10 ký tự').max(5000, 'Mô tả tối đa 5000 ký tự'),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD', 'EXPERT']),
  averageDurationMinutes: z.coerce.number().min(0, 'Thời gian phải >= 0').optional(),
  elevationMeters: z.coerce.number().min(0, 'Độ cao phải >= 0').optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  tags: z.string().optional(),
  dataOrigin: z.enum(['MANUAL', 'USER_CONTRIBUTION', 'AI_AGENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type FormData = z.infer<typeof schema>

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700 border-green-200',
  MODERATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  HARD: 'bg-orange-100 text-orange-700 border-orange-200',
  EXPERT: 'bg-red-100 text-red-700 border-red-200',
}

interface PlaceFormPageProps {
  editPlace?: Place
}

export default function PlaceFormPage({ editPlace }: PlaceFormPageProps) {
  const navigate = useNavigate()
  const isEdit = !!editPlace
  const createMutation = useCreatePlace()
  const updateMutation = useUpdatePlace()
  const isSaving = createMutation.isPending || updateMutation.isPending

  // ── Ảnh địa điểm ──────────────────────────────────────────────────────────
  const [imageFiles, setImageFiles] = useState<{ file: File; preview: string }[]>([])
  // Ảnh cũ đã có sẵn trên server (khi edit)
  const [existingImages, setExistingImages] = useState<string[]>([])
  const imageRef = useRef<HTMLInputElement>(null)

  // ── Ảnh bản đồ ────────────────────────────────────────────────────────────
  const [mapImageFile, setMapImageFile] = useState<{ file: File; preview: string } | null>(null)
  // URL ảnh bản đồ đã có sẵn (khi edit)
  const [existingMapImageUrl, setExistingMapImageUrl] = useState<string>('')
  const mapImageRef = useRef<HTMLInputElement>(null)

  // ── Tọa độ ────────────────────────────────────────────────────────────────
  const [coordSearch, setCoordSearch] = useState('')

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
      provinceId: '',
      mien: 'mien-bac',
      address: '',
      description: '',
      difficulty: 'EASY',
      averageDurationMinutes: undefined,
      elevationMeters: undefined,
      latitude: 14,
      longitude: 108,
      tags: '',
      dataOrigin: 'MANUAL',
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (editPlace) {
      reset({
        name: editPlace.name,
        provinceId: editPlace.provinceId || editPlace.province,
        mien: editPlace.mien || 'mien-bac',
        address: editPlace.address || '',
        description: editPlace.description,
        difficulty: editPlace.difficulty,
        averageDurationMinutes: editPlace.averageDurationMinutes,
        elevationMeters: editPlace.elevationMeters,
        latitude: editPlace.coordinates.coordinates[1],
        longitude: editPlace.coordinates.coordinates[0],
        tags: editPlace.tags.join(', '),
        dataOrigin: editPlace.dataOrigin || 'MANUAL',
        status: editPlace.status === 'DISABLED' ? 'INACTIVE' : editPlace.status,
      })
      // Load ảnh hiện có
      setExistingImages(editPlace.images || [])
      setExistingMapImageUrl(editPlace.imageMapUrl || '')
    }
  }, [editPlace, reset])

  const descValue = watch('description') ?? ''
  const selectedDifficulty = watch('difficulty')
  const lat = watch('latitude')
  const lng = watch('longitude')

  // ── Handlers: ảnh địa điểm ────────────────────────────────────────────────
  const handleImageAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const newFiles = files.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setImageFiles((prev) => [...prev, ...newFiles])
    e.target.value = ''
  }

  const removeNewImage = (idx: number) => {
    setImageFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  const removeExistingImage = (url: string) => {
    setExistingImages((prev) => prev.filter((u) => u !== url))
  }

  // ── Handlers: ảnh bản đồ ──────────────────────────────────────────────────
  const handleMapImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (mapImageFile) URL.revokeObjectURL(mapImageFile.preview)
    setMapImageFile({ file, preview: URL.createObjectURL(file) })
    e.target.value = ''
  }

  const removeMapImage = () => {
    if (mapImageFile) URL.revokeObjectURL(mapImageFile.preview)
    setMapImageFile(null)
    setExistingMapImageUrl('')
  }

  // ── Tọa độ ────────────────────────────────────────────────────────────────
  const handleLocate = () => {
    if (coordSearch.includes(',')) {
      const [latStr, lngStr] = coordSearch.split(',').map((s) => s.trim())
      const parsedLat = parseFloat(latStr)
      const parsedLng = parseFloat(lngStr)
      if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
        setValue('latitude', parsedLat)
        setValue('longitude', parsedLng)
      }
    }
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      provinceId: data.provinceId,
      mien: data.mien,
      address: data.address,
      description: data.description,
      difficulty: data.difficulty,
      averageDurationMinutes: data.averageDurationMinutes,
      elevationMeters: data.elevationMeters,
      latitude: data.latitude,
      longitude: data.longitude,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      dataOrigin: data.dataOrigin || 'MANUAL',
      status: data.status,
      // Truyền File objects để usePlaces.ts upload lên Cloudinary
      images: imageFiles.map((f) => f.file),
      mapImageFile: mapImageFile?.file,
    }

    if (isEdit) {
      await updateMutation.mutateAsync({ id: editPlace!.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    navigate(ROUTES.TREKKING_PLACES)
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  const totalImages = existingImages.length + imageFiles.length

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.TREKKING_PLACES)} className="hover:text-primary">
          Địa điểm
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(ROUTES.TREKKING_PLACES)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Đang sửa: ${editPlace?.name}` : 'Tạo địa điểm trekking mới'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ─── Cột trái ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label block mb-1">
                    Tên địa điểm <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className={inputCls(!!errors.name)}
                    placeholder="VD: Đỉnh Fanxipan"
                  />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">
                    Tỉnh/Thành phố <span className="text-destructive">*</span>
                  </label>
                  <select {...register('provinceId')} className={inputCls(!!errors.provinceId)}>
                    <option value="">Chọn tỉnh/thành</option>
                    {PROVINCE_OPTIONS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {errors.provinceId && <p className="form-error">{errors.provinceId.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">
                    Vùng miền <span className="text-destructive">*</span>
                  </label>
                  <select {...register('mien')} className={inputCls(!!errors.mien)}>
                    <option value="">Chọn vùng miền</option>
                    <option value="mien-bac">Miền Bắc</option>
                    <option value="mien-trung">Miền Trung</option>
                    <option value="mien-nam">Miền Nam</option>
                  </select>
                  {errors.mien && <p className="form-error">{errors.mien.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">Địa chỉ</label>
                  <input
                    {...register('address')}
                    className={inputCls(!!errors.address)}
                    placeholder="VD: Sa Pa, Lào Cai"
                  />
                  {errors.address && <p className="form-error">{errors.address.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">Mô tả</label>
                  <textarea
                    {...register('description')}
                    rows={4}
                    maxLength={5000}
                    className={inputCls(!!errors.description)}
                    placeholder="Nhập mô tả địa điểm..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.description ? (
                      <p className="form-error">{errors.description.message}</p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-muted-foreground">{descValue.length}/5000</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">Thời gian trung bình (phút)</label>
                    <input
                      {...register('averageDurationMinutes')}
                      type="number"
                      min="0"
                      className={inputCls(!!errors.averageDurationMinutes)}
                      placeholder="VD: 180"
                    />
                    {errors.averageDurationMinutes && (
                      <p className="form-error">{errors.averageDurationMinutes.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="form-label block mb-1">Độ cao (mét)</label>
                    <input
                      {...register('elevationMeters')}
                      type="number"
                      min="0"
                      className={inputCls(!!errors.elevationMeters)}
                      placeholder="VD: 3143"
                    />
                    {errors.elevationMeters && (
                      <p className="form-error">{errors.elevationMeters.message}</p>
                    )}
                  </div>
                </div>

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

                <div>
                  <label className="form-label block mb-1">Tags</label>
                  <input
                    {...register('tags')}
                    className={inputCls()}
                    placeholder="Nhập tags, phân cách bằng dấu phẩy..."
                  />
                  {watch('tags') && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {watch('tags')!
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .map((tag, i) => (
                          <span
                            key={i}
                            className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="form-label block mb-1">Nguồn dữ liệu</label>
                  <select {...register('dataOrigin')} className={inputCls()}>
                    <option value="MANUAL">Thủ công</option>
                    <option value="USER_CONTRIBUTION">Đóng góp người dùng</option>
                    <option value="AI_AGENT">AI Agent</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Ảnh địa điểm ──────────────────────────────────────────── */}
            <div className="bg-white rounded-lg border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-foreground">Ảnh địa điểm</h2>
                <span className="text-xs text-muted-foreground">{totalImages}/20 ảnh</span>
              </div>

              {/* Drop zone — chỉ hiện khi còn chỗ */}
              {totalImages < 20 && (
                <div
                  onClick={() => imageRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors mb-3"
                >
                  <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
                  <p className="text-sm font-medium text-foreground">Kéo thả hoặc chọn ảnh</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, WebP — tối đa 10MB mỗi ảnh</p>
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleImageAdd}
                  />
                </div>
              )}

              {/* Grid ảnh */}
              {totalImages > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {/* Ảnh đã có sẵn */}
                  {existingImages.map((url) => (
                    <div key={url} className="relative group aspect-video">
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-black/40 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Đã lưu
                      </div>
                    </div>
                  ))}
                  {/* Ảnh mới chọn */}
                  {imageFiles.map((img, idx) => (
                    <div key={idx} className="relative group aspect-video">
                      <img
                        src={img.preview}
                        alt=""
                        className="w-full h-full object-cover rounded-md border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(idx)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-primary/70 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        Mới
                      </div>
                    </div>
                  ))}
                  {/* Nút thêm thêm */}
                  {totalImages < 20 && (
                    <button
                      type="button"
                      onClick={() => imageRef.current?.click()}
                      className="aspect-video border-2 border-dashed border-border rounded-md flex items-center justify-center hover:border-primary/50 transition-colors text-muted-foreground text-xs"
                    >
                      + Thêm
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Ảnh bản đồ ────────────────────────────────────────────── */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-1">Ảnh bản đồ địa điểm</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Hình ảnh sơ đồ / bản đồ khu vực hiển thị trong app (1 ảnh)
              </p>

              {/* Hiển thị ảnh bản đồ hiện tại hoặc ảnh mới chọn */}
              {(mapImageFile || existingMapImageUrl) ? (
                <div className="relative group rounded-lg overflow-hidden border border-border">
                  <img
                    src={mapImageFile?.preview ?? existingMapImageUrl}
                    alt="Bản đồ địa điểm"
                    className="w-full max-h-48 object-contain bg-slate-50"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    type="button"
                    onClick={removeMapImage}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {mapImageFile && (
                    <div className="absolute bottom-2 left-2 bg-primary/80 text-white text-xs px-2 py-0.5 rounded">
                      Ảnh mới — chưa lưu
                    </div>
                  )}
                  {!mapImageFile && existingMapImageUrl && (
                    <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded">
                      Ảnh hiện tại
                    </div>
                  )}
                  {/* Nút đổi ảnh */}
                  <button
                    type="button"
                    onClick={() => mapImageRef.current?.click()}
                    className="absolute bottom-2 right-2 px-2 py-1 text-xs bg-white border border-border rounded shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted"
                  >
                    Đổi ảnh
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => mapImageRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  <Map className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium text-foreground">Chọn ảnh bản đồ</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — tối đa 10MB</p>
                </div>
              )}

              <input
                ref={mapImageRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleMapImageChange}
              />

              {/* Nút chọn ảnh (khi chưa có ảnh) */}
              {!(mapImageFile || existingMapImageUrl) && (
                <button
                  type="button"
                  onClick={() => mapImageRef.current?.click()}
                  className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-sm text-primary border border-primary/30 rounded-md hover:bg-primary/5 transition-colors"
                >
                  <ImageIcon className="w-4 h-4" /> Chọn ảnh bản đồ
                </button>
              )}
            </div>
          </div>

          {/* ─── Cột phải ─────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Vị trí trên bản đồ */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Vị trí trên bản đồ</h2>

              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={coordSearch}
                    onChange={(e) => setCoordSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleLocate())}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Nhập tọa độ: lat, lng"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLocate}
                  className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  Áp dụng
                </button>
              </div>

              {/* Map placeholder */}
              <div className="relative w-full h-52 bg-slate-100 rounded-lg overflow-hidden border border-border mb-4">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <MapPin className="w-6 h-6 mx-auto mb-1 text-primary" />
                    <p className="text-xs font-mono">
                      {lat != null ? Number(lat).toFixed(4) : '—'}, {lng != null ? Number(lng).toFixed(4) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="form-label block mb-2">
                  Tọa độ <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Vĩ độ (Latitude)</label>
                    <input
                      {...register('latitude')}
                      type="number"
                      step="0.000001"
                      className={inputCls(!!errors.latitude)}
                      placeholder="11.0036"
                    />
                    {errors.latitude && <p className="form-error">{errors.latitude.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Kinh độ (Longitude)</label>
                    <input
                      {...register('longitude')}
                      type="number"
                      step="0.000001"
                      className={inputCls(!!errors.longitude)}
                      placeholder="108.4495"
                    />
                    {errors.longitude && <p className="form-error">{errors.longitude.message}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Trạng thái */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Trạng thái</h2>
              <select {...register('status')} className={inputCls()}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>

            {/* Preview tóm tắt khi edit */}
            {isEdit && existingImages.length > 0 && (
              <div className="bg-white rounded-lg border border-border p-5">
                <h2 className="font-semibold text-foreground mb-3">Ảnh hiện tại</h2>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.slice(0, 6).map((url, i) => (
                    <div key={i} className="aspect-video relative group rounded overflow-hidden border border-border">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeExistingImage(url)}
                        className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {existingImages.length > 6 && (
                  <p className="text-xs text-muted-foreground mt-2">+{existingImages.length - 6} ảnh nữa</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(ROUTES.TREKKING_PLACES)}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {isSaving && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo địa điểm'}
          </button>
        </div>
      </form>
    </div>
  )
}
