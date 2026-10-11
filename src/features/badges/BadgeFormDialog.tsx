import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { BADGE_CONDITION_LABELS } from '@/constants'
import { useCreateBadge, useUpdateBadge } from './useBadges'
import { cn } from '@/lib/utils'
import type { Badge } from '@/types'

const schema = z.object({
  code: z.string()
    .min(2, 'Mã phải từ 2 ký tự')
    .max(50, 'Mã tối đa 50 ký tự')
    .regex(/^[A-Z0-9_]+$/, 'Chỉ dùng chữ HOA, số và dấu _')
    .transform((v) => v.toUpperCase()),
  name: z.string().min(2, 'Tên phải từ 2 ký tự'),
  description: z.string().min(5, 'Mô tả phải từ 5 ký tự'),
  conditionType: z.enum([
    'CHECKIN_COUNT', 'JOURNEY_COUNT', 'PROVINCE_COUNT',
    'CONTRIBUTION_APPROVED', 'SPECIFIC_PLACE', 'ELEVATION_TOTAL', 'DISTANCE_TOTAL',
    'JOURNEY_COMPLETED_COUNT', 'SUMMIT_CHECKIN_COUNT', 'PROVINCE_VISITED_COUNT',
    'ALTITUDE_REACHED', 'PLACE_VISITED_COUNT', 'FIRST_JOURNEY',
  ]),
  conditionValue: z.coerce.number().positive('Ngưỡng phải > 0'),
  conditionPlaceId: z.string().optional(),
  distanceUnit: z.enum(['KILOMETERS', 'METERS']).default('KILOMETERS'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  badge?: Badge
}

export function BadgeFormDialog({ open, onOpenChange, badge }: Props) {
  const isEdit = !!badge
  const createMutation = useCreateBadge()
  const updateMutation = useUpdateBadge()
  const isSaving = createMutation.isPending || updateMutation.isPending

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      conditionType: 'CHECKIN_COUNT',
      conditionValue: 1,
      conditionPlaceId: '',
      distanceUnit: 'KILOMETERS',
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (badge) {
      reset({
        code: badge.code ?? '',
        name: badge.name,
        description: badge.description,
        conditionType: badge.condition.type,
        conditionValue: badge.condition.value ?? 1,
        conditionPlaceId: badge.condition.placeId ?? '',
        distanceUnit: badge.condition.unit ?? 'KILOMETERS',
        status: badge.status === 'DISABLED' ? 'INACTIVE' : badge.status,
      })
    } else {
      reset({ code: '', name: '', description: '', conditionType: 'CHECKIN_COUNT', conditionValue: 1, status: 'ACTIVE' })
    }
  }, [badge, reset])

  const conditionType = watch('conditionType')
  const onSubmit = async (data: FormData) => {
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
    }

    if (isEdit) {
      // update không gửi code
      const { code: _code, ...updatePayload } = payload
      void _code
      await updateMutation.mutateAsync({ id: badge!.id, data: updatePayload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none transition-colors',
      'focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive bg-destructive/5' : 'border-border bg-white',
    )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-sm p-5">

          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-base font-semibold">
              {isEdit ? 'Chỉnh sửa huy hiệu' : 'Thêm huy hiệu'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1 rounded hover:bg-muted text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">

            {/* Mã huy hiệu — chỉ hiện khi tạo mới */}
            {!isEdit && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
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
            )}

            {/* Tên */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Tên huy hiệu <span className="text-destructive">*</span>
              </label>
              <input
                {...register('name')}
                className={inputCls(!!errors.name)}
                placeholder="VD: Nhà thám hiểm"
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            {/* Mô tả */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mô tả</label>
              <textarea
                {...register('description')}
                rows={2}
                className={inputCls(!!errors.description)}
                placeholder="Mô tả ngắn về điều kiện đạt huy hiệu..."
              />
              {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            {/* Điều kiện — 2 cột */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Loại điều kiện</label>
                <select {...register('conditionType')} className={inputCls()}>
                  {Object.entries(BADGE_CONDITION_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ngưỡng</label>
                <input
                  {...register('conditionValue')}
                  type="number"
                  min="0.001"
                  step="any"
                  className={inputCls(!!errors.conditionValue)}
                  placeholder="VD: 10"
                />
                {errors.conditionValue && <p className="text-xs text-destructive mt-1">{errors.conditionValue.message}</p>}
              </div>
            </div>

            {/* Trạng thái */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Trạng thái</label>
              <select {...register('status')} className={inputCls()}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            </div>

            {/* Actions */}
            {conditionType === 'SPECIFIC_PLACE' && <label className="block text-sm">ID địa điểm *
            <input {...register('conditionPlaceId')} required pattern="[a-fA-F0-9]{24}" className={inputCls()} />
          </label>}
          {conditionType === 'DISTANCE_TOTAL' && <label className="block text-sm">Đơn vị quãng đường
            <select {...register('distanceUnit')} className={inputCls()}><option value="KILOMETERS">km</option><option value="METERS">m</option></select>
          </label>}
          <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors"
              >
                {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu' : 'Thêm'}
              </button>
            </div>
          </form>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
