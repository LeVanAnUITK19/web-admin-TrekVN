import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MapPin } from 'lucide-react'
import { useState, useEffect, useRef, useMemo } from 'react'
import { IS_MOCK_MODE, ROUTES, MILESTONE_TYPE_LABELS } from '@/constants'
import { cn } from '@/lib/utils'
import { useAllRoutes, useRoute } from '@/features/trekking/routes/useRoutes'
import { usePlace } from '@/features/trekking/places/usePlaces'
import { PlaceOfflineMap } from '@/components/map/PlaceOfflineMap'
import { useCreateMilestone, useUpdateMilestone, useRouteMilestoneSequences, milestoneErrorMessage } from './useMilestones'
import type { GeoPoint, Milestone, MilestoneType } from '@/types'

const schema = z.object({
  routeId: z.string().min(1, 'Chọn cung đường'),
  name: z.string().min(2, 'Tên cột mốc từ 2 ký tự'),
  type: z.enum(['START', 'END', 'WAYPOINT', 'SUMMIT', 'CAMP', 'REST_POINT', 'VIEWPOINT', 'WATER_SOURCE']),
  sequence: z.coerce.number().int('Thứ tự phải là số nguyên').min(1, 'Thứ tự phải ≥ 1'),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  checkinRadius: z.coerce.number().int('Bán kính phải là số nguyên').min(10, 'Bán kính tối thiểu 10m'),
  description: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type FormData = z.infer<typeof schema>

const MILESTONE_TYPE_ICONS: Record<string, string> = {
  START: '🟢', END: '🏁', WAYPOINT: '📍', SUMMIT: '⛰️',
  CAMP: '⛺', REST_POINT: '🛖', VIEWPOINT: '🔭', WATER_SOURCE: '💧',
}

interface MilestoneFormPageProps {
  editMilestone?: Milestone
}

export default function MilestoneFormPage({ editMilestone }: MilestoneFormPageProps) {
  const navigate = useNavigate()
  const isEdit = !!editMilestone
  const createMutation = useCreateMilestone()
  const updateMutation = useUpdateMilestone()
  const isSaving = createMutation.isPending || updateMutation.isPending
  const [coordSearch, setCoordSearch] = useState('')
  const routes = useAllRoutes(isEdit ? undefined : 'ACTIVE')

  const { register, handleSubmit, reset, watch, setValue, setError, clearErrors, formState: { errors, dirtyFields } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      routeId: '', name: '', type: 'WAYPOINT', sequence: 1,
      latitude: 14, longitude: 108, checkinRadius: 50, description: '', status: 'ACTIVE',
    },
  })

  const selectedRouteId = watch('routeId')
  const routeDetail = useRoute(selectedRouteId)
  const selectedRoute = routeDetail.data?.id === selectedRouteId
    ? routeDetail.data
    : routes.data?.find(route => route.id === selectedRouteId)
  const place = usePlace(selectedRoute?.placeId ?? '')
  const selectableRoutes = routes.data?.filter(route => isEdit || route.status === 'ACTIVE') ?? []
  const sequences = useRouteMilestoneSequences(isEdit ? '' : selectedRouteId)
  const initializedRoute = useRef('')
  useEffect(() => {
    if (!selectedRouteId) initializedRoute.current = ''
    if (!isEdit && sequences.data && initializedRoute.current !== selectedRouteId) {
      setValue('sequence', Math.max(0, ...sequences.data) + 1)
      clearErrors('sequence')
      initializedRoute.current = selectedRouteId
    }
  }, [isEdit, selectedRouteId, sequences.data, setValue, clearErrors])

  useEffect(() => {
    if (editMilestone) {
      reset({
        routeId: editMilestone.routeId,
        name: editMilestone.name,
        type: editMilestone.type,
        sequence: editMilestone.sequence,
        latitude: editMilestone.coordinates.coordinates[1],
        longitude: editMilestone.coordinates.coordinates[0],
        checkinRadius: editMilestone.checkinRadius,
        description: editMilestone.description ?? '',
        status: editMilestone.status === 'DISABLED' ? 'INACTIVE' : editMilestone.status,
      })
    }
  }, [editMilestone, reset])

  const selectedType = watch('type')
  const descValue = watch('description') ?? ''
  const lat = watch('latitude')
  const lng = watch('longitude')
  const suggestedPoint = selectedRoute?.startLocation?.coordinates ?? selectedRoute?.path?.coordinates?.[0] ?? place.data?.coordinates?.coordinates
  useEffect(() => {
    if (isEdit || dirtyFields.latitude || dirtyFields.longitude || !suggestedPoint) return
    setValue('latitude', suggestedPoint[1])
    setValue('longitude', suggestedPoint[0])
  }, [isEdit, dirtyFields.latitude, dirtyFields.longitude, suggestedPoint, setValue])
  const milestonePoint = useMemo<GeoPoint | null>(() => {
    const latitude = Number(lat), longitude = Number(lng)
    if (String(lat).trim() === '' || String(lng).trim() === '' ||
        !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null
    return { type: 'Point', coordinates: [longitude, latitude] }
  }, [lat, lng])

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  const handleLocate = () => {
    if (coordSearch.split(',').length === 2 && coordSearch.split(',').every(value => value.trim() !== '')) {
      const [latStr, lngStr] = coordSearch.split(',').map((s) => s.trim())
      const latNum = Number(latStr)
      const lngNum = Number(lngStr)
      if (Number.isFinite(latNum) && Number.isFinite(lngNum) &&
          latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
        setValue('latitude', latNum, { shouldValidate: true, shouldDirty: true })
        setValue('longitude', lngNum, { shouldValidate: true, shouldDirty: true })
        clearErrors('root')
        return
      }
    }
    setError('root', { message: 'Nhập tọa độ dạng vĩ độ, kinh độ hợp lệ.' })
  }

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('root', { message: 'Trình duyệt không hỗ trợ lấy vị trí hiện tại.' })
      return
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setValue('latitude', coords.latitude, { shouldValidate: true, shouldDirty: true })
      setValue('longitude', coords.longitude, { shouldValidate: true, shouldDirty: true })
      clearErrors('root')
    }, () => setError('root', { message: 'Không thể lấy vị trí. Hãy cho phép truy cập vị trí hoặc nhập tọa độ.' }))
  }

  const onSubmit = async (data: FormData) => {
    if (isSaving) return
    clearErrors('root')
    if (!isEdit && (!selectableRoutes.some(route => route.id === data.routeId) || selectedRoute?.status !== 'ACTIVE')) {
      setError('routeId', { message: 'Chọn cung đường đang hoạt động để thêm cột mốc.' })
      return
    }
    if (!isEdit && sequences.data?.includes(data.sequence)) {
      setError('sequence', { message: `Thứ tự ${data.sequence} đã có cột mốc trong cung đường này. Hãy chọn thứ tự khác.` })
      return
    }
    const payload = {
      routeId: data.routeId,
      name: data.name,
      type: data.type,
      sequence: data.sequence,
      latitude: data.latitude,
      longitude: data.longitude,
      checkinRadius: data.checkinRadius,
      description: data.description ?? '',
      status: data.status as 'ACTIVE' | 'INACTIVE',
    }
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: editMilestone!.id, data: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      navigate(ROUTES.TREKKING_MILESTONES)
    } catch (err) {
      setError('root', { message: milestoneErrorMessage(err) })
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.TREKKING_MILESTONES)} className="hover:text-primary">Cung đường</button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? 'Chỉnh sửa cột mốc' : 'Thêm cột mốc'}</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(ROUTES.TREKKING_MILESTONES)} className="p-2 rounded-md hover:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">{isEdit ? 'Chỉnh sửa cột mốc' : 'Thêm cột mốc'}</h1>
          <p className="text-sm text-muted-foreground">Tạo cột mốc mới trong cung đường</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── Left ── */}
          <div className="space-y-5">

            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">

                <div>
                  <label className="form-label block mb-1">Tiêu đề <span className="text-destructive">*</span></label>
                  <input {...register('name')} className={inputCls(!!errors.name)} placeholder="Nhập tên cột mốc" />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="form-label block mb-1">Loại cột mốc <span className="text-destructive">*</span></label>
                  <select {...register('type')} className={inputCls(!!errors.type)}>
                    {Object.entries(MILESTONE_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{MILESTONE_TYPE_ICONS[k]} {v}</option>
                    ))}
                  </select>
                </div>

                {/* Type icon grid */}
                <div className="grid grid-cols-4 gap-2">
                  {Object.entries(MILESTONE_TYPE_LABELS).map(([k, v]) => (
                    <button
                      key={k} type="button"
                      onClick={() => setValue('type', k as MilestoneType)}
                      className={cn(
                        'flex flex-col items-center p-2 rounded-lg border text-xs transition-all',
                        selectedType === k
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/40 text-muted-foreground',
                      )}
                    >
                      <span className="text-lg mb-0.5">{MILESTONE_TYPE_ICONS[k]}</span>
                      <span className="leading-tight text-center text-[10px]">{v.split(' ').slice(0, 2).join(' ')}</span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">Thứ tự hiển thị <span className="text-destructive">*</span></label>
                    <input {...register('sequence')} type="number" min="1" className={inputCls(!!errors.sequence)} placeholder="1" />
                    {errors.sequence && <p className="form-error">{errors.sequence.message}</p>}
                    {!isEdit && selectedRouteId && sequences.isFetching && <p className="text-xs text-muted-foreground">Đang lấy thứ tự cột mốc…</p>}
                    {!isEdit && sequences.error && <p className="form-error">Không thể lấy thứ tự cột mốc. <button type="button" onClick={() => sequences.refetch()}>Thử lại</button></p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">Bán kính check-in (m) <span className="text-destructive">*</span></label>
                    <input {...register('checkinRadius')} type="number" min="10" className={inputCls(!!errors.checkinRadius)} placeholder="50" />
                    {errors.checkinRadius && <p className="form-error">{errors.checkinRadius.message}</p>}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Khoảng cách tối đa (mét) để người dùng check-in tại cột mốc này</p>

                <div>
                  <label className="form-label block mb-1">Mô tả</label>
                  <textarea {...register('description')} rows={3} maxLength={500} className={inputCls()} placeholder="Nhập mô tả cột mốc..." />
                  <p className="text-xs text-muted-foreground text-right mt-1">{descValue.length}/500</p>
                </div>

              </div>
            </div>

            {/* Cung đường */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-3">Thuộc cung đường</h2>
              <select {...register('routeId')} aria-label="Cung đường" disabled={isEdit || routes.isLoading} className={inputCls(!!errors.routeId)}>
                <option value="">Chọn cung đường</option>
                {isEdit && editMilestone && !selectableRoutes.some(route => route.id === editMilestone.routeId) &&
                  <option value={editMilestone.routeId}>{editMilestone.routeName ?? editMilestone.routeId}</option>}
                {selectableRoutes.map(r => (
                  <option key={r.id} value={r.id}>{r.name}{r.province ? ` — ${r.province}` : ''}</option>
                ))}
              </select>
              {errors.routeId && <p className="form-error">{errors.routeId.message}</p>}
              {routes.isError && <p className="form-error">Không thể tải cung đường. <button type="button" onClick={() => routes.refetch()}>Thử lại</button></p>}
              {!isEdit && routes.isSuccess && !selectableRoutes.length && <p className="text-sm text-muted-foreground mt-2">Chưa có cung đường đang hoạt động.</p>}
            </div>

            {/* Trạng thái */}
            {IS_MOCK_MODE && <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-3">Trạng thái</h2>
              <select {...register('status')} className={inputCls()}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>}

          </div>

          {/* ── Right: Map ── */}
          <div className="space-y-5">
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Vị trí trên bản đồ</h2>

              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text" value={coordSearch} onChange={(e) => setCoordSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Vĩ độ, kinh độ (ví dụ: 11.38, 106.17)"
                  />
                </div>
                <button type="button" onClick={handleLocate}
                  className="px-3 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90">
                  Định vị
                </button>
              </div>

              <div className="mb-4 space-y-2">
                {!selectedRouteId ? <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">Chọn cung đường để xem bản đồ địa điểm và tuyến đường.</p>
                  : selectedRoute?.placeId ? <>
                    <p className="text-sm font-medium">{place.data?.name ?? 'Địa điểm'} · {selectedRoute.name}</p>
                    <PlaceOfflineMap
                      placeId={selectedRoute.placeId}
                      placeName={place.data?.name ?? selectedRoute.name}
                      location={place.data?.coordinates ?? place.data?.location}
                      path={selectedRoute.path}
                      milestone={milestonePoint}
                    />
                    <p className="text-xs text-muted-foreground">Tuyến màu cam · Điểm bắt đầu/địa điểm màu xanh lá · Điểm cuối màu đỏ · Cột mốc đang nhập màu xanh dương.</p>
                    {routeDetail.isError && <p className="form-error">Không thể tải chi tiết cung đường. <button type="button" onClick={() => routeDetail.refetch()}>Thử lại</button></p>}
                    {place.isError && <p className="form-error">Không thể tải vị trí địa điểm. <button type="button" onClick={() => place.refetch()}>Thử lại</button></p>}
                    {!routeDetail.isLoading && !selectedRoute.path?.coordinates?.length && <p className="text-xs text-muted-foreground">Cung đường chưa có dữ liệu tuyến trên bản đồ.</p>}
                  </> : <p className="text-sm text-muted-foreground">{routeDetail.isLoading ? 'Đang tải cung đường…' : 'Không thể tải bản đồ của cung đường này.'}</p>}
                {selectedRouteId && !milestonePoint && <p className="form-error">Nhập đủ vĩ độ và kinh độ hợp lệ để hiển thị cột mốc.</p>}
              </div>

              <div>
                <label className="form-label block mb-2">Tọa độ <span className="text-destructive">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Latitude</label>
                    <input {...register('latitude', { valueAsNumber: true })} aria-label="Vĩ độ" type="number" step="any" min="-90" max="90" className={inputCls(!!errors.latitude)} placeholder="11.9536" />
                    {errors.latitude && <p className="form-error">{errors.latitude.message}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Longitude</label>
                    <input {...register('longitude', { valueAsNumber: true })} aria-label="Kinh độ" type="number" step="any" min="-180" max="180" className={inputCls(!!errors.longitude)} placeholder="108.4463" />
                    {errors.longitude && <p className="form-error">{errors.longitude.message}</p>}
                  </div>
                </div>
                <button type="button" onClick={handleCurrentLocation}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-sm text-primary border border-primary/30 rounded-md hover:bg-primary/5">
                  <MapPin className="w-4 h-4" /> Lấy vị trí hiện tại
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        {errors.root && <p role="alert" className="form-error mt-4">{errors.root.message}</p>}
        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={() => navigate(ROUTES.TREKKING_MILESTONES)}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted">Hủy</button>
          <button type="submit" disabled={isSaving || (!isEdit && !!selectedRouteId && (sequences.isFetching || !sequences.data))}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60">
            {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo cột mốc'}
          </button>
        </div>
      </form>
    </div>
  )
}
