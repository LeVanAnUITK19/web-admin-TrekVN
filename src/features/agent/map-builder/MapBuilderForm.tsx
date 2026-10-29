import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePlace } from '@/features/trekking/places/usePlaces'
import { getProvinceNameById } from '@/constants'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RefreshCcw, ChevronRight, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BBoxInput } from './BBoxInput'
import type { MapBuilderFormData, MapDataLayer, MapScope } from '@/types'
import { BA_DEN_REFERENCE_BBOX, isBaDenName, isOutsideBaDenReference } from './mapRegion'

const bboxSchema = z.object({
  minLng: z.number({ invalid_type_error: 'Bắt buộc' }).min(-180).max(180),
  minLat: z.number({ invalid_type_error: 'Bắt buộc' }).min(-90).max(90),
  maxLng: z.number({ invalid_type_error: 'Bắt buộc' }).min(-180).max(180),
  maxLat: z.number({ invalid_type_error: 'Bắt buộc' }).min(-90).max(90),
}).refine((b) => b.maxLng > b.minLng, { message: 'Max Longitude phải lớn hơn Min', path: ['maxLng'] })
  .refine((b) => b.maxLat > b.minLat, { message: 'Max Latitude phải lớn hơn Min', path: ['maxLat'] })

const schema = z.object({
  placeName: z.string().min(2, 'Tên địa điểm phải từ 2 ký tự').max(200, 'Tên tối đa 200 ký tự'),
  locationHint: z.string().min(2, 'Tỉnh/khu vực phải từ 2 ký tự').max(100, 'Tối đa 100 ký tự'),
  placeId: z.string().optional(), // Optional - for linking to existing place
  scope: z.enum(['PLACE', 'ROUTE']),
  routeId: z.string().optional(),
  bbox: bboxSchema,
  zoomMin: z.coerce.number().int().min(1).max(22),
  zoomMax: z.coerce.number().int().min(1).max(22),
  layers: z.array(z.string()).min(1, 'Chọn ít nhất một lớp'),
}).refine((d) => d.zoomMax >= d.zoomMin, {
  message: 'Zoom max phải ≥ zoom min',
  path: ['zoomMax'],
})

type FormData = z.infer<typeof schema>

const LAYER_OPTIONS: { value: MapDataLayer; label: string }[] = [
  { value: 'ROADS', label: 'Đường' },
  { value: 'POI', label: 'POI' },
  { value: 'TERRAIN', label: 'Địa hình' },
  { value: 'CONTOUR', label: 'Contour' },
  { value: 'HILLSHADE', label: 'Hillshade' },
]

interface MapBuilderFormProps {
  onSubmit: (data: MapBuilderFormData) => void
  isLoading: boolean
}

export function MapBuilderForm({ onSubmit, isLoading }: MapBuilderFormProps) {
  const [params] = useSearchParams()
  const { data: selectedPlace } = usePlace(params.get('placeId') ?? '')
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      placeName: '',
      locationHint: '',
      placeId: '',
      scope: 'PLACE',
      routeId: '',
      bbox: { minLng: 0, minLat: 0, maxLng: 0, maxLat: 0 },
      zoomMin: 10,
      zoomMax: 14,
      layers: ['ROADS', 'POI', 'TERRAIN', 'CONTOUR', 'HILLSHADE'],
    },
  })

  useEffect(() => {
    if (!selectedPlace) return
    setValue('placeId', selectedPlace.id)
    setValue('placeName', selectedPlace.name)
    setValue('locationHint', selectedPlace.address || (selectedPlace.provinceId ? getProvinceNameById(selectedPlace.provinceId) : selectedPlace.province) || '')
    const bounds = selectedPlace.offlineMap?.bounds
    if (bounds) setValue('bbox', { minLng: bounds.minLon, minLat: bounds.minLat, maxLng: bounds.maxLon, maxLat: bounds.maxLat })
  }, [selectedPlace, setValue])

  const scope = watch('scope')
  const layers = watch('layers')
  const placeName = watch('placeName')
  const bbox = watch('bbox')
  const isBaDen = isBaDenName(placeName)

  const toggleLayer = (layer: MapDataLayer) => {
    const current = layers as MapDataLayer[]
    const next = current.includes(layer)
      ? current.filter((l) => l !== layer)
      : [...current, layer]
    setValue('layers', next, { shouldValidate: true })
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border'
    )

  const handleFormSubmit = (data: FormData) => {
    onSubmit({
      ...data,
      layers: data.layers as MapDataLayer[],
      scope: data.scope as MapScope,
      placeId: data.placeId?.trim() || '',
    })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 max-w-2xl">
      {/* Place name and location inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="form-label block mb-1">
            Tên địa điểm <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            {...register('placeName')}
            placeholder="VD: Núi Bà Đen"
            className={inputCls(!!errors.placeName)}
          />
          {errors.placeName && <p className="form-error">{errors.placeName.message}</p>}
          <p className="text-xs text-muted-foreground mt-1">Nhập tên núi hoặc địa điểm trekking</p>
        </div>

        <div>
          <label className="form-label block mb-1">
            Tỉnh/khu vực <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            {...register('locationHint')}
            placeholder="VD: Tây Ninh"
            className={inputCls(!!errors.locationHint)}
          />
          {errors.locationHint && <p className="form-error">{errors.locationHint.message}</p>}
          <p className="text-xs text-muted-foreground mt-1">Tỉnh/thành phố hoặc khu vực</p>
        </div>
      </div>

      {/* Place ID + warning */}
      <div>
        <label className="form-label block mb-1">
          Place ID <span className="text-xs text-muted-foreground">(tùy chọn — để trống nếu chưa có)</span>
        </label>
        <input
          type="text"
          {...register('placeId')}
          placeholder="VD: 507f1f77bcf86cd799439011 (MongoDB ObjectId của TrekkingPlace)"
          className={inputCls()}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Nếu để trống, bản đồ vẫn được upload lên R2 nhưng <strong>không tự động gán</strong> vào địa điểm.
          Admin cần gán thủ công sau qua trang Offline Maps.
        </p>
      </div>

      {/* Scope */}
      <div>
        <label className="form-label block mb-2">Phạm vi bản đồ</label>
        <div className="flex gap-4">
          {(['PLACE', 'ROUTE'] as const).map((s) => (
            <label key={s} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={s}
                {...register('scope')}
                className="accent-primary"
              />
              <span className="text-sm text-foreground">
                {s === 'PLACE' ? 'Bản đồ địa điểm' : 'Bản đồ cung đường'}
              </span>
            </label>
          ))}
        </div>
        {scope === 'ROUTE' && (
          <div className="mt-3">
            <label className="form-label block mb-1">Chọn cung đường</label>
            <select {...register('routeId')} className={inputCls()}>
              <option value="">Chọn cung đường...</option>
              <option value="route-taxua">Cung đường Tà Xùa</option>
              <option value="route-fansipan">Cung đường Fansipan</option>
            </select>
          </div>
        )}
      </div>

      {/* BBOX */}
      <div className="bg-muted/30 rounded-lg p-4 border border-border">
        {isBaDen && (
          <button
            type="button"
            className="mb-3 text-sm text-primary hover:underline"
            onClick={() => setValue('bbox', BA_DEN_REFERENCE_BBOX, { shouldValidate: true })}
          >
            Dùng vùng Bà Đen theo gói mẫu
          </button>
        )}
        {bbox.maxLng > bbox.minLng && bbox.maxLat > bbox.minLat && isOutsideBaDenReference(placeName, bbox) && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-3 mb-3">
            BBOX này không chứa vùng Bà Đen trong gói mẫu. Bản đồ được cắt theo tọa độ, nên hãy kiểm tra vùng cắt hoặc dùng nút chọn vùng mẫu ở trên.
          </p>
        )}
        <Controller
          control={control}
          name="bbox"
          render={({ field, fieldState }) => (
            <BBoxInput
              value={field.value}
              onChange={field.onChange}
              errors={{
                minLng: fieldState.error?.message,
                maxLng: (errors.bbox as Record<string, { message?: string }>)?.maxLng?.message,
                maxLat: (errors.bbox as Record<string, { message?: string }>)?.maxLat?.message,
              }}
            />
          )}
        />
      </div>

      {/* Map config */}
      <div>
        <label className="form-label block mb-3">Cấu hình bản đồ</label>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Zoom min</label>
            <input
              type="number"
              {...register('zoomMin')}
              min={1} max={22}
              className={inputCls(!!errors.zoomMin)}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Zoom max</label>
            <input
              type="number"
              {...register('zoomMax')}
              min={1} max={22}
              className={inputCls(!!errors.zoomMax)}
            />
            {errors.zoomMax && <p className="form-error">{errors.zoomMax.message}</p>}
          </div>
        </div>

        {/* Layers */}
        <label className="text-xs text-muted-foreground block mb-2">Loại dữ liệu</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {LAYER_OPTIONS.map(({ value, label }) => {
            const selected = (layers as string[]).includes(value)
            return (
              <button
                key={value}
                type="button"
                onClick={() => toggleLayer(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  selected
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {selected && <span className="text-xs">✓</span>}
                {label}
              </button>
            )
          })}
        </div>
        {errors.layers && <p className="form-error">{errors.layers.message}</p>}

        {/* Size estimate */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Ước tính dung lượng: ~15–30 MB (tuỳ BBOX và zoom)
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
        >
          <RefreshCcw className="w-4 h-4" /> Đặt lại
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Đang tạo...' : (
            <>Bắt đầu tạo bản đồ <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </form>
  )
}
