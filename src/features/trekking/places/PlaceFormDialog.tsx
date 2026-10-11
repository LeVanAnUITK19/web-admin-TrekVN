import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { PROVINCE_OPTIONS, DIFFICULTY_LABELS } from '@/constants'
import { useCreatePlace, useUpdatePlace } from './usePlaces'
import { cn } from '@/lib/utils'
import type { Place } from '@/types'

const schema = z.object({
  name: z.string().min(2, 'Tên phải từ 2 ký tự').max(200, 'Tên tối đa 200 ký tự'),
  provinceId: z.string().min(1, 'Chọn tỉnh/thành'),
  address: z.string().max(500, 'Địa chỉ tối đa 500 ký tự').optional(),
  description: z.string().min(10, 'Mô tả phải từ 10 ký tự').max(5000, 'Mô tả tối đa 5000 ký tự'),
  difficulty: z.enum(['EASY', 'MODERATE', 'HARD', 'EXPERT']),
  averageDurationMinutes: z.coerce.number().min(0, 'Thời gian phải >= 0').optional(),
  elevationMeters: z.coerce.number().min(0, 'Độ cao phải >= 0').optional(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  imageMapUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
  tags: z.string().optional(),
  dataOrigin: z.enum(['MANUAL', 'USER_CONTRIBUTION', 'AI_AGENT']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
})
type FormData = z.infer<typeof schema>

interface PlaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  place?: Place
}

export function PlaceFormDialog({ open, onOpenChange, place }: PlaceFormDialogProps) {
  const isEdit = !!place
  const createMutation = useCreatePlace()
  const updateMutation = useUpdatePlace()
  const isSaving = createMutation.isPending || updateMutation.isPending

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '', provinceId: '', address: '', description: '', difficulty: 'EASY',
      averageDurationMinutes: undefined, elevationMeters: undefined,
      latitude: 14, longitude: 108, imageMapUrl: '', tags: '', dataOrigin: 'MANUAL', status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (place) {
      reset({
        name: place.name,
        provinceId: place.provinceId || place.province, // fallback for old data
        address: place.address || '',
        description: place.description,
        difficulty: place.difficulty,
        averageDurationMinutes: place.averageDurationMinutes,
        elevationMeters: place.elevationMeters,
        latitude: place.coordinates.coordinates[1],
        longitude: place.coordinates.coordinates[0],
        imageMapUrl: place.imageMapUrl || '',
        tags: place.tags.join(', '),
        dataOrigin: place.dataOrigin || 'MANUAL',
        status: place.status === 'DISABLED' ? 'INACTIVE' : place.status,
      })
    } else {
      reset({ name: '', provinceId: '', address: '', description: '', difficulty: 'EASY',
        averageDurationMinutes: undefined, elevationMeters: undefined,
        latitude: 14, longitude: 108, imageMapUrl: '', tags: '', dataOrigin: 'MANUAL', status: 'ACTIVE' })
    }
  }, [place, reset])

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      provinceId: data.provinceId,
      address: data.address,
      description: data.description,
      difficulty: data.difficulty,
      averageDurationMinutes: data.averageDurationMinutes,
      elevationMeters: data.elevationMeters,
      latitude: data.latitude,
      longitude: data.longitude,
      imageMapUrl: data.imageMapUrl,
      tags: data.tags ? data.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      dataOrigin: data.dataOrigin || 'MANUAL',
      status: data.status ?? 'ACTIVE',
    }
    if (isEdit) {
      await updateMutation.mutateAsync({ id: place!.id, data: payload })
    } else {
      await createMutation.mutateAsync(payload)
    }
    onOpenChange(false)
  }

  const field = (label: string, error?: string, children: React.ReactNode = null) => (
    <div>
      <label className="form-label block mb-1">{label}</label>
      {children}
      {error && <p className="form-error">{error}</p>}
    </div>
  )

  const inputCls = (hasErr?: boolean) => cn(
    'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
    hasErr ? 'border-destructive' : 'border-border'
  )

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-semibold">{isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm mới'}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </Dialog.Close>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-5 space-y-4">
            {field('Tên địa điểm', errors.name?.message,
              <input {...register('name')} className={inputCls(!!errors.name)} placeholder="VD: Đỉnh Fanxipan" />
            )}
            {field('Tỉnh/Thành phố', errors.provinceId?.message,
              <select {...register('provinceId')} className={inputCls(!!errors.provinceId)}>
                <option value="">Chọn tỉnh/thành</option>
                {PROVINCE_OPTIONS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {field('Địa chỉ', errors.address?.message,
              <input {...register('address')} className={inputCls(!!errors.address)} placeholder="VD: Sa Pa, Lào Cai" />
            )}
            {field('Mô tả', errors.description?.message,
              <textarea {...register('description')} rows={3} maxLength={5000} className={inputCls(!!errors.description)} placeholder="Mô tả địa điểm..." />
            )}
            {field('Độ khó', errors.difficulty?.message,
              <select {...register('difficulty')} className={inputCls(!!errors.difficulty)}>
                {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            )}
            <div className="grid grid-cols-2 gap-3">
              {field('Thời gian TB (phút)', errors.averageDurationMinutes?.message,
                <input {...register('averageDurationMinutes')} type="number" min="0" className={inputCls(!!errors.averageDurationMinutes)} placeholder="180" />
              )}
              {field('Độ cao (mét)', errors.elevationMeters?.message,
                <input {...register('elevationMeters')} type="number" min="0" className={inputCls(!!errors.elevationMeters)} placeholder="3143" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field('Vĩ độ (Latitude)', errors.latitude?.message,
                <input {...register('latitude')} type="number" step="0.0001" className={inputCls(!!errors.latitude)} placeholder="VD: 22.3035" />
              )}
              {field('Kinh độ (Longitude)', errors.longitude?.message,
                <input {...register('longitude')} type="number" step="0.0001" className={inputCls(!!errors.longitude)} placeholder="VD: 103.7764" />
              )}
            </div>
            {field('URL bản đồ hình ảnh', errors.imageMapUrl?.message,
              <input {...register('imageMapUrl')} type="url" className={inputCls(!!errors.imageMapUrl)} placeholder="https://example.com/map.jpg" />
            )}
            {field('Tags', undefined,
              <input {...register('tags')} className={inputCls()} placeholder="Phân cách bằng dấu phẩy" />
            )}
            {field('Nguồn dữ liệu', undefined,
              <select {...register('dataOrigin')} className={inputCls()}>
                <option value="MANUAL">Thủ công</option>
                <option value="USER_CONTRIBUTION">Đóng góp người dùng</option>
                <option value="AI_AGENT">AI Agent</option>
              </select>
            )}
            {field('Trạng thái', undefined,
              <select {...register('status')} className={inputCls()}>
                <option value="ACTIVE">Hoạt động</option>
                <option value="INACTIVE">Không hoạt động</option>
              </select>
            )}
          </form>
          <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted">Hủy</button>
            <button type="submit" form="" onClick={handleSubmit(onSubmit)} disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60">
              {isSaving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Thêm địa điểm'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
