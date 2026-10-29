import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { PageHeader } from '@/components/common/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { communityError } from './useCommunity'
import { formatDateTime } from '@/lib/utils'

interface Group { conversationId: string; name: string; ownerId: string; memberCount: number; disabled: boolean; moderationReason: string | null; createdAt: string }
interface Report { _id: string; conversationId: string; senderId: string; reporterId: string; contentSnapshot: string; reason: string; status: 'OPEN' | 'RESOLVED' | 'DISMISSED'; resolution?: string; resolvedBy?: string; createdAt: string }
interface Page<T> { items: T[]; total: number; page: number; limit: number; totalPages: number }
interface Target { kind: 'groups' | 'message-reports'; id: string; action: 'enable' | 'disable' | 'REMOVE' | 'DISMISS'; name: string }
const base = '/admin/community'
const labels = { enable: 'Mở lại nhóm', disable: 'Tạm ngưng nhóm', REMOVE: 'Gỡ tin nhắn', DISMISS: 'Bỏ qua báo cáo' }
const reportStatuses = { OPEN: 'Chờ xử lý', RESOLVED: 'Đã gỡ tin', DISMISSED: 'Đã bỏ qua' }

function ActionDialog({ target, close }: { target: Target | null; close: () => void }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const qc = useQueryClient()
  const mutation = useMutation({ mutationFn: async () => {
    if (!target) return
    const path = `${base}/${target.kind}/${target.id}`
    await apiClient.patch(target.kind === 'groups' ? `${path}/${target.action}` : path,
      target.kind === 'groups' ? { reason: reason.trim() } : { action: target.action, reason: reason.trim() })
  }, onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['community-social-admin'] }); toast.success('Đã lưu xử lý kiểm duyệt'); close() } })
  return <Dialog.Root open={!!target} onOpenChange={(open) => { if (!open && !mutation.isPending) close() }}><Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-xl"
      onEscapeKeyDown={e => { if (mutation.isPending) e.preventDefault() }} onPointerDownOutside={e => { if (mutation.isPending) e.preventDefault() }}>
      <Dialog.Title className="text-lg font-semibold">{target ? labels[target.action] : ''}</Dialog.Title>
      <Dialog.Description className="text-sm mt-2 text-muted-foreground break-words">{target?.name}{target?.action === 'REMOVE' && ' · Tin nhắn bị gỡ không thể khôi phục.'}</Dialog.Description>
      <label className="block text-sm mt-5 mb-2" htmlFor="social-reason">Lý do xử lý</label>
      <textarea id="social-reason" maxLength={1000} rows={4} value={reason} disabled={mutation.isPending} onChange={e => setReason(e.target.value)} className="border rounded-md w-full p-3 text-sm" />
      {error && <p role="alert" className="text-destructive text-sm mt-2">{error}</p>}
      <div className="flex justify-end gap-3 mt-5"><button className="border px-4 py-2 rounded-md text-sm" disabled={mutation.isPending} onClick={close}>Hủy</button>
        <button className="bg-primary text-white px-4 py-2 rounded-md text-sm disabled:opacity-50" disabled={mutation.isPending} onClick={async () => {
          if (reason.trim().length < 3) { setError('Vui lòng nhập ít nhất 3 ký tự.'); return }
          setError(null); try { await mutation.mutateAsync() } catch (e) { setError(communityError(e)) }
        }}>{mutation.isPending ? 'Đang lưu…' : 'Xác nhận'}</button></div>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>
}

export default function SocialAdmin({ back }: { back: () => void }) {
  const [tab, setTab] = useState<'groups' | 'message-reports'>('groups')
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [target, setTarget] = useState<Target | null>(null)
  const query = useQuery({ queryKey: ['community-social-admin', tab, page, filter], queryFn: async ({ signal }) => {
    const result = await apiClient.get<{ data: Page<Group | Report> }>(`${base}/${tab}`, { signal, params: {
      page, limit: 20, ...(filter ? tab === 'groups' ? { disabled: filter } : { status: filter } : {}),
    } })
    return result.data.data
  } })
  return <div>
    <button onClick={back} className="text-primary text-sm mb-4">← Bài viết và bình luận</button>
    <PageHeader title="Nhóm và báo cáo tin nhắn" description="Quản lý trạng thái nhóm và xử lý nội dung được thành viên báo cáo." />
    <div className="bg-primary/5 rounded-lg p-4 text-sm mb-5">Chỉ hiển thị tin nhắn đã được báo cáo. Nội dung hội thoại riêng và lịch sử chat đầy đủ không có trong màn quản trị.</div>
    <div className="flex flex-wrap gap-3 mb-4">
      <div role="tablist" aria-label="Quản trị nhắn tin" className="inline-flex bg-muted rounded-lg p-1">
        {(['groups', 'message-reports'] as const).map(value => <button role="tab" aria-selected={tab === value} key={value} className={`px-4 py-2 rounded-md text-sm ${tab === value ? 'bg-white shadow-sm' : ''}`}
          onClick={() => { setTab(value); setPage(1); setFilter('') }}>{value === 'groups' ? 'Nhóm trò chuyện' : 'Báo cáo tin nhắn'}</button>)}
      </div>
      <select aria-label="Bộ lọc quản trị nhắn tin" value={filter} onChange={e => { setFilter(e.target.value); setPage(1) }} className="border rounded-md p-2 text-sm bg-white">
        <option value="">Tất cả trạng thái</option>{tab === 'groups' ? <><option value="false">Đang hoạt động</option><option value="true">Đang tạm ngưng</option></> : Object.entries(reportStatuses).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      <button disabled={query.isFetching} onClick={() => void query.refetch()} className="border rounded-md px-3 text-sm">Làm mới</button>
    </div>
    {query.isPending ? <p className="p-8">Đang tải…</p> : query.isError ? <div role="alert" className="p-5 border rounded-lg text-destructive">{communityError(query.error)}</div>
      : !query.data.items.length ? <p className="p-8 border rounded-lg bg-white">Không có dữ liệu phù hợp.</p> : <div className="border rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50 border-b"><tr>
          {(tab === 'groups' ? ['Nhóm', 'Chủ nhóm', 'Thành viên', 'Trạng thái', 'Thao tác'] : ['Nội dung được báo cáo', 'Lý do / người báo cáo', 'Trạng thái', 'Thao tác']).map(t => <th key={t} className="text-left p-4 whitespace-nowrap">{t}</th>)}
        </tr></thead><tbody className="divide-y">
          {query.data.items.map(item => tab === 'groups' ? (() => { const g = item as Group; return <tr key={g.conversationId}>
            <td className="p-4 min-w-[200px]"><p className="font-medium break-words">{g.name}</p><p className="text-xs text-muted-foreground mt-1">{formatDateTime(g.createdAt)}</p><p className="text-xs font-mono mt-1">{g.conversationId}</p></td>
            <td className="p-4 text-xs font-mono">{g.ownerId}</td><td className="p-4">{g.memberCount}/50</td>
            <td className="p-4"><span className={`text-xs rounded-full px-2 py-1 ${g.disabled ? 'bg-amber-100 text-amber-900' : 'bg-green-100 text-green-800'}`}>{g.disabled ? 'Tạm ngưng' : 'Hoạt động'}</span><p className="mt-2 text-xs text-muted-foreground max-w-xs break-words">{g.moderationReason}</p></td>
            <td className="p-4"><button className="text-primary whitespace-nowrap" onClick={() => setTarget({ kind: 'groups', id: g.conversationId, action: g.disabled ? 'enable' : 'disable', name: g.name })}>{g.disabled ? 'Mở lại' : 'Tạm ngưng'}</button></td>
          </tr> })() : (() => { const r = item as Report; return <tr key={r._id}>
            <td className="p-4 min-w-[250px] max-w-md"><p className="whitespace-pre-wrap break-words">{r.contentSnapshot}</p><p className="text-xs text-muted-foreground mt-2 break-all">Người gửi: {r.senderId}</p><p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p></td>
            <td className="p-4 min-w-[200px] max-w-sm"><p className="whitespace-pre-wrap break-words">{r.reason}</p><p className="text-xs text-muted-foreground mt-2 break-all">{r.reporterId}</p></td>
            <td className="p-4 min-w-[130px]"><span className="text-xs font-medium">{reportStatuses[r.status]}</span>{r.resolution && <p className="text-xs text-muted-foreground mt-2 break-words">{r.resolution}</p>}</td>
            <td className="p-4">{r.status === 'OPEN' ? <div className="flex gap-3 whitespace-nowrap"><button className="text-destructive" onClick={() => setTarget({ kind: 'message-reports', id: r._id, action: 'REMOVE', name: 'Gỡ nội dung tin nhắn được báo cáo' })}>Gỡ tin</button><button className="text-primary" onClick={() => setTarget({ kind: 'message-reports', id: r._id, action: 'DISMISS', name: 'Báo cáo không vi phạm' })}>Bỏ qua</button></div> : 'Đã xử lý'}</td>
          </tr> })())}
        </tbody></table></div><Pagination {...query.data} onPageChange={setPage} />
      </div>}
    {target && <ActionDialog target={target} close={() => setTarget(null)} />}
  </div>
}
