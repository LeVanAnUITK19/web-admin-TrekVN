import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { CommunityAction, CommunityEntity } from '@/types'
import { communityError, useModerateCommunity } from './useCommunity'

export interface ModerationTarget { entity: CommunityEntity; id: string; action: CommunityAction; label: string }
const actionLabels = { hide: 'Ẩn', publish: 'Hiển thị lại', delete: 'Xóa' }

export function ModerationDialog({ target, onClose }: { target: ModerationTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const mutation = useModerateCommunity()
  useEffect(() => { setReason(''); setError(null) }, [target])
  async function confirm() {
    if (!target || mutation.isPending) return
    if (reason.trim().length < 3) { setError('Vui lòng nhập lý do có ít nhất 3 ký tự.'); return }
    setError(null)
    try { await mutation.mutateAsync({ ...target, reason: reason.trim() }); onClose() }
    catch (err) { setError(communityError(err)) }
  }
  return <Dialog.Root open={!!target} onOpenChange={(open) => { if (!open && !mutation.isPending) onClose() }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
      <Dialog.Content onEscapeKeyDown={(e) => { if (mutation.isPending) e.preventDefault() }}
        onPointerDownOutside={(e) => { if (mutation.isPending) e.preventDefault() }}
        className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl">
        <Dialog.Title className="text-lg font-semibold">{target ? actionLabels[target.action] : ''} {target?.entity === 'posts' ? 'bài viết' : 'bình luận'}</Dialog.Title>
        <Dialog.Description className="mt-2 text-sm text-muted-foreground break-words">
          {target?.label} — {target?.action === 'delete' ? 'Nội dung bị xóa không thể khôi phục.' : target?.action === 'hide' ? 'Nội dung sẽ được gỡ khỏi app. Bạn có thể hiển thị lại sau.' : 'Nội dung sẽ trở lại theo quyền riêng tư ban đầu.'}
        </Dialog.Description>
        <label htmlFor="moderation-reason" className="block text-sm font-medium mt-5 mb-2">Lý do kiểm duyệt <span className="text-destructive">*</span></label>
        <textarea id="moderation-reason" rows={3} maxLength={1000} value={reason} disabled={mutation.isPending}
          onChange={(e) => setReason(e.target.value)} className="w-full rounded-md border border-border p-3 text-sm focus:ring-2 focus:ring-primary/30" placeholder="Nêu rõ lý do để lưu vào lịch sử kiểm duyệt…" />
        {error && <p role="alert" className="text-sm text-destructive mt-2">{error}</p>}
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} disabled={mutation.isPending} className="px-4 py-2 border rounded-md text-sm disabled:opacity-50">Hủy</button>
          <button onClick={() => void confirm()} disabled={mutation.isPending}
            className={`px-4 py-2 rounded-md text-sm text-white disabled:opacity-50 ${target?.action === 'delete' ? 'bg-destructive' : 'bg-primary'}`}>
            {mutation.isPending ? 'Đang xử lý…' : 'Xác nhận'}</button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
