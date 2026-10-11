import { RankIcon } from '@/components/common/RankIcon'
import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Save, Info } from 'lucide-react'
import { useUpdateRankDefinition } from './useRanks'
import { formatNumber, cn } from '@/lib/utils'
import type { RankDefinition } from '@/types'



interface FieldProps {
  label: string
  icon: string
  name: keyof FormState
  value: number
  onChange: (k: keyof FormState, v: number) => void
  hint?: string
  disabled?: boolean
}

function NumField({ label, icon, name, value, onChange, hint, disabled }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {icon} {label}
      </label>
      <input
        type="number"
        min={0}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(name, Math.max(0, Number(e.target.value)))}
        className={cn(
          'w-full px-3 py-2 text-sm border border-border rounded-md bg-white outline-none',
          'focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors',
          disabled && 'opacity-50 cursor-not-allowed bg-muted',
        )}
      />
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  )
}

interface FormState {
  name: string
  iconUrl: string
  description: string
  minXp: number
  minCompletedJourneys: number
  minVisitedProvinces: number
  minBadgeCount: number
  minApprovedContributions: number
  minDistanceMeters: number
}

interface Props {
  rank: RankDefinition | null
  onClose: () => void
}

export function RankEditDialog({ rank, onClose }: Props) {
  const updateMutation = useUpdateRankDefinition()
  const isNewbie = rank?.code === 'NEWBIE'

  const [form, setForm] = useState<FormState>({
    name: '', iconUrl: '', description: '',
    minXp: 0, minCompletedJourneys: 0, minVisitedProvinces: 0,
    minBadgeCount: 0, minApprovedContributions: 0, minDistanceMeters: 0,
  })

  useEffect(() => {
    if (rank) {
      setForm({
        name: rank.name,
        iconUrl: rank.iconUrl ?? '',
        description: rank.description ?? '',
        minXp: rank.minXp,
        minCompletedJourneys: rank.minCompletedJourneys,
        minVisitedProvinces: rank.minVisitedProvinces,
        minBadgeCount: rank.minBadgeCount,
        minApprovedContributions: rank.minApprovedContributions,
        minDistanceMeters: rank.minDistanceMeters,
      })
    }
  }, [rank])

  const setField = (k: keyof FormState, v: number | string) => {
    setForm((f) => ({ ...f, [k]: v }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rank) return
    await updateMutation.mutateAsync({
      id: rank.id,
      data: {
        name: form.name,
        iconUrl: form.iconUrl.trim(),
        description: form.description || undefined,
        minXp: Number(form.minXp),
        minCompletedJourneys: Number(form.minCompletedJourneys),
        minVisitedProvinces: Number(form.minVisitedProvinces),
        minBadgeCount: Number(form.minBadgeCount),
        minApprovedContributions: Number(form.minApprovedContributions),
        minDistanceMeters: Number(form.minDistanceMeters),
      },
    })
    onClose()
  }

  const fieldCls = 'w-full px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors'

  return (
    <Dialog.Root open={!!rank} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-shrink-0">
            <span className="text-2xl">{rank && <RankIcon code={rank.code} iconUrl={rank.iconUrl} />}</span>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="font-semibold text-foreground">
                Chỉnh sửa – {rank?.name}
              </Dialog.Title>
              <p className="text-xs text-muted-foreground">
                Lv.{rank?.level} · <span className="font-mono">{rank?.code}</span>
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          {rank && (
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="overflow-y-auto flex-1 p-5 space-y-5">

                {/* Tên & mô tả */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">URL icon</label>
                    <input type="url" className={fieldCls} value={form.iconUrl}
                      onChange={(e) => setField('iconUrl', e.target.value)} placeholder="https://..." />
                    <p className="mt-1 text-xs text-muted-foreground">Để trống để dùng icon mặc định của level. App sẽ dùng cùng icon này.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Tên hiển thị <span className="text-destructive">*</span>
                    </label>
                    <input
                      className={fieldCls}
                      value={form.name}
                      onChange={(e) => setField('name', e.target.value)}
                      required
                      placeholder="Tên rank"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">Mô tả</label>
                    <textarea
                      rows={2}
                      className={fieldCls}
                      value={form.description}
                      onChange={(e) => setField('description', e.target.value)}
                      placeholder="Mô tả ngắn về cấp rank này..."
                    />
                  </div>
                </div>

                {/* Điều kiện tối thiểu */}
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">
                    Điều kiện thăng hạng
                  </p>

                  {isNewbie ? (
                    <div className="flex items-center gap-2 p-3 bg-muted/40 rounded-lg text-xs text-muted-foreground">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>Rank <strong>NEWBIE</strong> là mặc định – không có điều kiện thăng hạng.</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <NumField
                          label="Trek XP tối thiểu"
                          icon="✨"
                          name="minXp"
                          value={form.minXp}
                          onChange={setField}
                          hint="Phải đạt đồng thời với tất cả điều kiện khác (BR-36)"
                        />
                      </div>
                      <NumField
                        label="Hành trình hoàn thành"
                        icon="🥾"
                        name="minCompletedJourneys"
                        value={form.minCompletedJourneys}
                        onChange={setField}
                      />
                      <NumField
                        label="Tỉnh thành đã ghé"
                        icon="🗺️"
                        name="minVisitedProvinces"
                        value={form.minVisitedProvinces}
                        onChange={setField}
                      />
                      <NumField
                        label="Huy hiệu đạt được"
                        icon="🏅"
                        name="minBadgeCount"
                        value={form.minBadgeCount}
                        onChange={setField}
                      />
                      <NumField
                        label="Đóng góp được duyệt"
                        icon="✅"
                        name="minApprovedContributions"
                        value={form.minApprovedContributions}
                        onChange={setField}
                        hint="0 = không yêu cầu"
                      />
                      <div className="col-span-2">
                        <NumField
                          label="Quãng đường tối thiểu (mét)"
                          icon="📏"
                          name="minDistanceMeters"
                          value={form.minDistanceMeters}
                          onChange={setField}
                          hint={form.minDistanceMeters > 0 ? `= ${formatNumber(Math.round(form.minDistanceMeters / 1000))} km` : '0 = không yêu cầu'}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Readonly info */}
                <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" />
                    <span className="font-medium">Không thể thay đổi:</span>
                  </div>
                  <div className="flex gap-4">
                    <span>Code: <strong className="text-foreground font-mono">{rank.code}</strong></span>
                    <span>Level: <strong className="text-foreground">Lv.{rank.level}</strong></span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending || !form.name.trim()}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
