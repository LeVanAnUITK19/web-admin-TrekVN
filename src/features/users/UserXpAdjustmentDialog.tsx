/**
 * UserXpAdjustmentDialog
 * Admin tạo ADMIN_ADJUSTMENT XP cho user (FR-ADM-23, BR-39)
 * - Bắt buộc nhập lý do
 * - Hỗ trợ XP dương (cộng) và âm (trừ)
 * - Có Audit Log ở backend
 */
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Zap, AlertTriangle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { IS_MOCK_MODE } from '@/constants'
import { sleep } from '@/lib/utils'
import type { User, XpAdjustmentPayload } from '@/types'

interface UserXpAdjustmentDialogProps {
  user: User | null
  onClose: () => void
}

export function UserXpAdjustmentDialog({ user, onClose }: UserXpAdjustmentDialogProps) {
  const qc = useQueryClient()
  const [xpAmount, setXpAmount] = useState<string>('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: async (payload: XpAdjustmentPayload) => {
      if (IS_MOCK_MODE) {
        await sleep(600)
        // Mock: simulate success
        return { success: true }
      }
      const res = await apiClient.post(
        ENDPOINTS.ADMIN_USER_XP_ADJUSTMENT(user!.id),
        payload
      )
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-rank-profile', user?.id] })
      toast.success(`Đã điều chỉnh XP cho ${user?.name}`)
      handleClose()
    },
    onError: () => toast.error('Điều chỉnh XP thất bại'),
  })

  const handleClose = () => {
    setXpAmount('')
    setReason('')
    setDescription('')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseInt(xpAmount, 10)
    if (isNaN(amount) || amount === 0) {
      toast.error('Vui lòng nhập số XP hợp lệ (khác 0)')
      return
    }
    if (!reason.trim()) {
      toast.error('Vui lòng nhập lý do điều chỉnh')
      return
    }
    mutation.mutate({ xpAmount: amount, reason: reason.trim(), description: description.trim() || undefined })
  }

  const parsedAmount = parseInt(xpAmount, 10)
  const isNegative = !isNaN(parsedAmount) && parsedAmount < 0

  const fieldClass =
    'w-full px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <Dialog.Root open={!!user} onOpenChange={(open) => { if (!open) handleClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Dialog.Title className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              Điều chỉnh Trek XP
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {user && (
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* User info */}
              <div className="bg-muted/40 rounded-lg px-3 py-2 text-sm">
                <p className="font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>
                  Thao tác này sẽ tạo một XP Transaction loại <strong>ADMIN_ADJUSTMENT</strong> và
                  được ghi vào Audit Log. Không thể xóa lịch sử giao dịch.
                </span>
              </div>

              {/* XP Amount */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Số XP điều chỉnh <span className="text-destructive">*</span>
                  <span className="font-normal ml-1">(dương = cộng, âm = trừ)</span>
                </label>
                <input
                  type="number"
                  placeholder="Ví dụ: 500 hoặc -200"
                  className={fieldClass}
                  value={xpAmount}
                  onChange={(e) => setXpAmount(e.target.value)}
                  required
                />
                {!isNaN(parsedAmount) && parsedAmount !== 0 && (
                  <p className={`text-xs mt-1 font-medium ${isNegative ? 'text-destructive' : 'text-success'}`}>
                    {isNegative ? `▼ Trừ ${Math.abs(parsedAmount)} XP` : `▲ Cộng ${parsedAmount} XP`}
                  </p>
                )}
              </div>

              {/* Reason – bắt buộc theo FR-ADM-23 */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Lý do điều chỉnh <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Phát hiện check-in không hợp lệ tháng 9"
                  className={fieldClass}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={200}
                  required
                />
                <p className="text-xs text-muted-foreground mt-0.5 text-right">{reason.length}/200</p>
              </div>

              {/* Description – tùy chọn */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mô tả chi tiết (tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm nếu cần..."
                  className={fieldClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending || !xpAmount || !reason.trim()}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-60 transition-colors ${
                    isNegative
                      ? 'bg-destructive hover:bg-destructive/90'
                      : 'bg-primary hover:bg-primary/90'
                  }`}
                >
                  {mutation.isPending ? 'Đang xử lý...' : 'Xác nhận điều chỉnh'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
