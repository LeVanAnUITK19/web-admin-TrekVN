import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import { ROUTES, BADGE_CONDITION_LABELS } from '@/constants'
import { cn } from '@/lib/utils'
import { useBadge, useCreateBadge, useUpdateBadge } from './useBadges'
import type { BadgeConditionType } from '@/types'

// ─── Schema ───────────────────────────────────────────────────────────────────
const createSchema = z.object({
  code: z.string()
    .min(2, 'Mã phải từ 2 ký tự')
    .max(50, 'Mã tối đa 50 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Chỉ dùng chữ HOA, số và dấu _')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(2, 'Tên phải từ 2 ký tự'),
  description: z.string().min(5, 'Mô tả phải từ 5 ký tự').max(500),
  conditionType: z.enum([
    'CHECKIN_COUNT', 'JOURNEY_COUNT', 'PROVINCE_COUNT',
    'CONTRIBUTION_APPROVED', 'SPECIFIC_PLACE', 'ELEVATION_TOTAL', 'DISTANCE_TOTAL',
    'JOURNEY_COMPLETED_COUNT', 'SUMMIT_CHECKIN_COUNT', 'PROVINCE_VISITED_COUNT',
    'ALTITUDE_REACHED', 'PLACE_VISITED_COUNT', 'FIRST_JOURNEY',
  ] as const),
  conditionValue: z.coerce.number().positive('Ngưỡng phải > 0'),
  conditionPlaceId: z.string().optional(),
  distanceUnit: z.enum(['KILOMETERS', 'METERS']).default('KILOMETERS'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
  rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']).default('COMMON'),
  iconUrl: z.union([z.string().url('URL ảnh không hợp lệ'), z.literal('')]).optional(),
})

// Edit schema - code không cần validate (read-only)
const editSchema = z.object({
  code: z.string().optional(), // code chỉ để hiển thị, không validate
  name: z.string().min(2, 'Tên phải từ 2 ký tự'),
  description: z.string().min(5, 'Mô tả phải từ 5 ký tự').max(500),
  conditionType: z.enum([
    'CHECKIN_COUNT', 'JOURNEY_COUNT', 'PROVINCE_COUNT',
    'CONTRIBUTION_APPROVED', 'SPECIFIC_PLACE', 'ELEVATION_TOTAL', 'DISTANCE_TOTAL',
    'JOURNEY_COMPLETED_COUNT', 'SUMMIT_CHECKIN_COUNT', 'PROVINCE_VISITED_COUNT',
    'ALTITUDE_REACHED', 'PLACE_VISITED_COUNT', 'FIRST_JOURNEY',
  ] as const),
  conditionValue: z.coerce.number().positive('Ngưỡng phải > 0'),
  conditionPlaceId: z.string().optional(),
  distanceUnit: z.enum(['KILOMETERS', 'METERS']).default('KILOMETERS'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
  rarity: z.enum(['COMMON', 'RARE', 'EPIC', 'LEGENDARY']).default('COMMON'),
  iconUrl: z.union([z.string().url('URL ảnh không hợp lệ'), z.literal('')]).optional(),
})

type FormData = z.infer<typeof createSchema>

// ─── Display helpers ──────────────────────────────────────────────────────────
const CONDITION_ICONS: Record<string, string> = {
  CHECKIN_COUNT: '📍', JOURNEY_COUNT: '🥾', PROVINCE_COUNT: '🗺️',
  CONTRIBUTION_APPROVED: '✅', SPECIFIC_PLACE: '📌',
  ELEVATION_TOTAL: '⛰️', DISTANCE_TOTAL: '📏',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function BadgeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isEdit = !!id

  const { data: editBadge } = useBadge(id || '')
  const createMutation = useCreateBadge()
  const updateMutation = useUpdateBadge()
  const isSaving = createMutation.isPending || updateMutation.isPending


  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema), // Dùng schema phù hợp
    defaultValues: {
      code: '',
      name: '',
      description: '',
      conditionType: 'CHECKIN_COUNT',
      conditionValue: 1,
      conditionPlaceId: '',
      distanceUnit: 'KILOMETERS',
      status: 'ACTIVE',
      rarity: 'COMMON',
      iconUrl: '',
    },
  })

  useEffect(() => {
    if (editBadge) {
      console.log('📝 Loading badge for edit:', editBadge)
      reset({
        code: editBadge.code || editBadge.id, // Ưu tiên code thật, fallback id
        name: editBadge.name,
        description: editBadge.description,
        conditionType: editBadge.condition.type as BadgeConditionType,
        conditionValue: editBadge.condition.value ?? 1,
        conditionPlaceId: editBadge.condition.placeId ?? '',
        distanceUnit: editBadge.condition.unit ?? 'KILOMETERS',
        status: editBadge.status === 'DISABLED' ? 'INACTIVE' : editBadge.status,
        rarity: editBadge.rarity ?? 'COMMON',
        iconUrl: editBadge.iconUrl ?? '',
      })
    }
  }, [editBadge, reset])

  // Debug: Log validation errors
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error('❌ Form validation errors:', errors)
      console.error('❌ Error details:', JSON.stringify(errors, null, 2))
    }
  }, [errors])

  const conditionType = watch('conditionType')
  const nameVal = watch('name') ?? ''
  const descVal = watch('description') ?? ''
  const needsThreshold = conditionType !== 'SPECIFIC_PLACE'

  const onSubmit = async (data: FormData) => {
    console.log('🚀 Form submitted with data:', data)

    try {
      const payload = {
        code: data.code,
        name: data.name,
        description: data.description,
        condition: {
          type: data.conditionType,
          value: data.conditionType === 'SPECIFIC_PLACE' ? 1 : data.conditionValue,
          ...(data.conditionType === 'SPECIFIC_PLACE' ? { placeId: data.conditionPlaceId } : {}),
          ...(data.conditionType === 'DISTANCE_TOTAL' ? { unit: data.distanceUnit } : {}),
        },
        status: data.status,
        rarity: data.rarity,
        iconUrl: data.iconUrl ?? '',
      }

      console.log('📦 Payload prepared:', payload)

      if (isEdit && id) {
        console.log('✏️ Updating badge with id:', id)
        // update không gửi code (code không thể đổi sau khi tạo)
        // status sẽ được xử lý riêng trong useBadges.ts
        const { code: _code, ...updatePayload } = payload
        void _code
        console.log('📤 Sending update payload:', updatePayload)
        await updateMutation.mutateAsync({ id, data: updatePayload })
        console.log('✅ Update successful')
      } else {
        console.log('➕ Creating new badge')
        await createMutation.mutateAsync(payload)
        console.log('✅ Create successful')
      }

      console.log('🔄 Navigating to badges list')
      navigate(ROUTES.BADGES)
    } catch (error) {
      console.error('❌ Form submission error:', error)
    }
  }

  const inputCls = (err?: boolean) => cn(
    'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors',
    err ? 'border-destructive bg-destructive/5' : 'border-border bg-white',
  )

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.BADGES)} className="hover:text-primary">
          Huy hiệu
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isEdit ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu mới'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(ROUTES.BADGES)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            {isEdit ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu mới'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? 'Cập nhật thông tin huy hiệu' : 'Tạo huy hiệu mới cho hệ thống gamification'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: main form ────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">
                {/* Code — chỉ khi tạo mới hoặc hiển thị read-only khi edit */}
                {!isEdit ? (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Mã huy hiệu <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...register('code')}
                      className={inputCls(!!errors.code)}
                      placeholder="VD: EXPLORER_10"
                      style={{ textTransform: 'uppercase' }}
                    />
                    {errors.code
                      ? <p className="text-xs text-destructive mt-1">{errors.code.message}</p>
                      : <p className="text-xs text-muted-foreground mt-1">Chữ HOA, số, dấu _ (không đổi sau khi tạo)</p>
                    }
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Mã huy hiệu
                    </label>
                    <div className="w-full px-3 py-2 text-sm border border-border rounded-md bg-gray-50 text-gray-600">
                      {editBadge?.code || editBadge?.id || '—'}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Không thể thay đổi sau khi tạo</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Tên huy hiệu <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className={inputCls(!!errors.name)}
                    placeholder="VD: Nhà thám hiểm mới"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Mô tả <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    maxLength={500}
                    className={inputCls(!!errors.description)}
                    placeholder="Mô tả điều kiện đạt huy hiệu..."
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description
                      ? <p className="text-xs text-destructive">{errors.description.message}</p>
                      : <span />}
                    <span className="text-xs text-muted-foreground">{descVal.length}/500</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-border p-5 space-y-3">
              <label className="block text-sm font-medium">Độ hiếm & XP khi nhận
                <select {...register('rarity')} className={inputCls()}>
                  <option value="COMMON">Thông thường · 50 XP</option><option value="RARE">Hiếm · 150 XP</option>
                  <option value="EPIC">Sử thi · 400 XP</option><option value="LEGENDARY">Huyền thoại · 1000 XP</option>
                </select>
              </label>
              <label className="block text-sm font-medium">URL biểu tượng
                <input {...register('iconUrl')} className={inputCls(!!errors.iconUrl)} placeholder="https://…" />
                {errors.iconUrl && <span className="text-destructive">{errors.iconUrl.message}</span>}
              </label>
            </div>

            {/* Điều kiện đạt huy hiệu */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Điều kiện đạt huy hiệu</h2>

              {/* Condition type grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(Object.entries(BADGE_CONDITION_LABELS) as [BadgeConditionType, string][]).map(([k, v]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setValue('conditionType', k)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-lg border text-sm transition-all text-left',
                      conditionType === k
                        ? 'border-primary bg-primary/10 text-primary font-medium'
                        : 'border-border hover:border-primary/40 text-muted-foreground',
                    )}
                  >
                    <span className="text-base flex-shrink-0">{CONDITION_ICONS[k]}</span>
                    <span className="leading-tight">{v}</span>
                  </button>
                ))}
              </div>

              {conditionType === 'SPECIFIC_PLACE' && <div>
                <label className="block text-sm font-medium mb-1">ID địa điểm *</label>
                <input {...register('conditionPlaceId')} required pattern="[a-fA-F0-9]{24}" placeholder="ID địa điểm (24 ký tự)" className={inputCls()} />
              </div>}
              {conditionType === 'DISTANCE_TOTAL' && <label className="block text-sm">Đơn vị quãng đường
                <select {...register('distanceUnit')} className={inputCls()}><option value="KILOMETERS">km</option><option value="METERS">m</option></select>
              </label>}
              {/* Value input */}
              {needsThreshold && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Ngưỡng điều kiện <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('conditionValue')}
                    type="number"
                    min="0.001"
                    step="any"
                    className={inputCls(!!errors.conditionValue)}
                    placeholder="VD: 10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Người dùng cần đạt ngưỡng này để nhận huy hiệu
                  </p>
                  {errors.conditionValue && (
                    <p className="text-xs text-destructive mt-1">{errors.conditionValue.message}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Right: preview, status ──────────────────────────────── */}
          <div className="space-y-5">

            {/* Preview card */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-3">Xem trước</h2>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3 border-2 border-primary bg-primary/10">
                  <span className="text-3xl">🏅</span>
                </div>
                <p className="font-semibold text-foreground">{nameVal || 'Tên huy hiệu'}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{descVal || 'Mô tả huy hiệu'}</p>

                {conditionType && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Sparkles className="w-3 h-3" />
                    <span>{CONDITION_ICONS[conditionType]} {BADGE_CONDITION_LABELS[conditionType]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Trạng thái */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-3">Trạng thái</h2>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <div className="flex gap-2">
                    {(['ACTIVE', 'INACTIVE'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => field.onChange(s)}
                        className={cn(
                          'flex-1 py-2 text-sm rounded-md border font-medium transition-all',
                          field.value === s
                            ? s === 'ACTIVE'
                              ? 'bg-success/10 border-success text-success'
                              : 'bg-gray-100 border-gray-400 text-gray-600'
                            : 'border-border text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        {s === 'ACTIVE' ? '✅ Hoạt động' : '⏸ Tạm tắt'}
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => {
              console.log('🚫 Cancel button clicked')
              navigate(ROUTES.BADGES)
            }}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving}
            onClick={() => console.log('💾 Submit button clicked, isSaving:', isSaving)}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors"
          >
            {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo huy hiệu'}
          </button>
        </div>
      </form>
    </div>
  )
}
