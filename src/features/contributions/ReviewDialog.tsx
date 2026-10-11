import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { useReviewContribution } from './useContributions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ReviewAction = 'APPROVE' | 'REJECT' | 'NEEDS_REVISION'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const schema = z.object({
  adminNote: z.string().optional(),
}).superRefine((data, ctx) => {
  // Will be validated contextually
  void data; void ctx
})
type FormData = z.infer<typeof schema>

interface ReviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contributionId: string
  action: ReviewAction
  onSuccess: () => void
}

const ACTION_CONFIG: Record<ReviewAction, { title: string; description: string; icon: React.ElementType; color: string; confirmLabel: string; noteRequired: boolean }> = {
  APPROVE: {
    title: 'Duyệt đóng góp',
    description: 'Xác nhận duyệt đóng góp này. Người dùng sẽ được thông báo.',
    icon: CheckCircle2,
    color: 'text-success',
    confirmLabel: 'Duyệt',
    noteRequired: false,
  },
  REJECT: {
    title: 'Từ chối đóng góp',
    description: 'Từ chối đóng góp này. Vui lòng nhập lý do từ chối.',
    icon: XCircle,
    color: 'text-destructive',
    confirmLabel: 'Từ chối',
    noteRequired: true,
  },
  NEEDS_REVISION: {
    title: 'Yêu cầu chỉnh sửa',
    description: 'Gửi yêu cầu chỉnh sửa đến người dùng. Vui lòng nhập ghi chú.',
    icon: AlertCircle,
    color: 'text-warning',
    confirmLabel: 'Gửi yêu cầu',
    noteRequired: true,
  },
}

export function ReviewDialog({ open, onOpenChange, contributionId, action, onSuccess }: ReviewDialogProps) {
  const config = ACTION_CONFIG[action]
  const reviewMutation = useReviewContribution()
  const Icon = config.icon

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
    resolver: zodResolver(
      config.noteRequired
        ? z.object({ adminNote: z.string().min(5, 'Vui lòng nhập ghi chú (tối thiểu 5 ký tự)') })
        : z.object({ adminNote: z.string().optional() })
    ),
  })

  const onSubmit = async (data: FormData) => {
    // Map UI action → API decision field
    const decisionMap: Record<ReviewAction, 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      NEEDS_REVISION: 'NEEDS_REVISION',
    }
    await reviewMutation.mutateAsync({
      id: contributionId,
      payload: { decision: decisionMap[action], adminNote: data.adminNote },
    })
    const successMsg = { APPROVE: 'Đã duyệt đóng góp', REJECT: 'Đã từ chối đóng góp', NEEDS_REVISION: 'Đã gửi yêu cầu chỉnh sửa' }
    toast.success(successMsg[action])
    reset()
    onOpenChange(false)
    onSuccess()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-md p-6">
          <div className="flex items-start gap-3 mb-4">
            <Icon className={cn('w-6 h-6 flex-shrink-0 mt-0.5', config.color)} />
            <div>
              <Dialog.Title className="font-semibold text-foreground">{config.title}</Dialog.Title>
              <Dialog.Description className="text-sm text-muted-foreground mt-1">{config.description}</Dialog.Description>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="form-label block mb-1.5">
                Ghi chú Admin {config.noteRequired && <span className="text-destructive">*</span>}
              </label>
              <textarea
                {...register('adminNote')}
                rows={3}
                placeholder={config.noteRequired ? 'Nhập lý do...' : 'Không bắt buộc'}
                className={cn(
                  'w-full px-3 py-2 text-sm border rounded-md outline-none resize-none',
                  'focus:ring-2 focus:ring-primary/20 focus:border-primary',
                  errors.adminNote ? 'border-destructive' : 'border-border'
                )}
              />
              {errors.adminNote && <p className="form-error">{errors.adminNote.message}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => { reset(); onOpenChange(false) }}
                disabled={reviewMutation.isPending}
                className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={reviewMutation.isPending}
                className={cn(
                  'px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 transition-colors',
                  action === 'APPROVE' ? 'bg-success hover:bg-success/90' :
                  action === 'REJECT' ? 'bg-destructive hover:bg-destructive/90' :
                  'bg-warning hover:bg-warning/90'
                )}
              >
                {reviewMutation.isPending ? 'Đang xử lý...' : config.confirmLabel}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
