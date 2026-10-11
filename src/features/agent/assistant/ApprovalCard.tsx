/**
 * ApprovalCard — thẻ xác nhận hiển thị trong chat khi agent đề xuất
 * tạo mới hoặc chỉnh sửa huy hiệu.
 *
 * Trạng thái:
 *  PENDING  → hiển thị nút "Phê duyệt" + "Từ chối"
 *  APPROVED → hiển thị badge xanh "Đã phê duyệt"
 *  REJECTED → hiển thị badge đỏ "Đã từ chối"
 *  FAILED   → hiển thị badge vàng "Lỗi"
 */
import { useState } from 'react'
import { Check, X, Shield, Loader2, ChevronDown, ChevronUp, Sparkles, Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PendingApproval, ApprovalStatus } from '@/types'

// Label mapping cho condition type
const CONDITION_LABELS: Record<string, string> = {
  CHECKIN_COUNT: '📍 Số lần check-in',
  JOURNEY_COUNT: '🥾 Số hành trình',
  PROVINCE_COUNT: '🗺️ Số tỉnh đã đi',
  CONTRIBUTION_APPROVED: '✅ Đóng góp được duyệt',
  SPECIFIC_PLACE: '📌 Địa điểm cụ thể',
  ELEVATION_TOTAL: '⛰️ Tổng độ cao (m)',
  DISTANCE_TOTAL: '📏 Tổng quãng đường (km)',
}

const RARITY_LABELS: Record<string, { label: string; cls: string }> = {
  COMMON: { label: 'Thông thường', cls: 'bg-slate-100 text-slate-700' },
  RARE: { label: 'Hiếm', cls: 'bg-blue-100 text-blue-700' },
  EPIC: { label: 'Sử thi', cls: 'bg-purple-100 text-purple-700' },
  LEGENDARY: { label: 'Huyền thoại', cls: 'bg-amber-100 text-amber-700' },
}

interface ApprovalCardProps {
  approval: PendingApproval
  /** Called when admin clicks Approve */
  onApprove: (approvalId: string) => Promise<void>
  /** Called when admin clicks Reject */
  onReject: (approvalId: string) => Promise<void>
  /** Override status (e.g. after admin acted locally before reload) */
  resolvedStatus?: ApprovalStatus
}

export function ApprovalCard({
  approval,
  onApprove,
  onReject,
  resolvedStatus,
}: ApprovalCardProps) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [expanded, setExpanded] = useState(true)

  const status = resolvedStatus ?? approval.status
  const { display, action, approvalId } = approval
  const isCreate = action === 'CREATE_BADGE'

  const handleApprove = async () => {
    setLoading('approve')
    try {
      await onApprove(approvalId)
    } finally {
      setLoading(null)
    }
  }

  const handleReject = async () => {
    setLoading('reject')
    try {
      await onReject(approvalId)
    } finally {
      setLoading(null)
    }
  }

  // ── Status badge ────────────────────────────────────────────────────────
  const statusConfig: Record<ApprovalStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: 'Chờ phê duyệt',
      cls: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Shield className="w-3 h-3" />,
    },
    APPROVED: {
      label: 'Đã phê duyệt',
      cls: 'bg-green-50 text-green-700 border-green-200',
      icon: <Check className="w-3 h-3" />,
    },
    REJECTED: {
      label: 'Đã từ chối',
      cls: 'bg-red-50 text-red-700 border-red-200',
      icon: <X className="w-3 h-3" />,
    },
    FAILED: {
      label: 'Lỗi thực thi',
      cls: 'bg-orange-50 text-orange-700 border-orange-200',
      icon: <X className="w-3 h-3" />,
    },
    EXPIRED: {
      label: 'Đã hết hạn',
      cls: 'bg-slate-50 text-slate-500 border-slate-200',
      icon: <X className="w-3 h-3" />,
    },
  }

  const sc = statusConfig[status] ?? statusConfig.PENDING

  return (
    <div
      className={cn(
        'w-full rounded-xl border-2 overflow-hidden transition-all',
        status === 'PENDING'
          ? 'border-amber-200 bg-amber-50/40'
          : status === 'APPROVED'
          ? 'border-green-200 bg-green-50/30'
          : 'border-slate-200 bg-slate-50/30',
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center',
              isCreate ? 'bg-primary/10 text-primary' : 'bg-violet-100 text-violet-600',
            )}
          >
            {isCreate ? <Sparkles className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              {isCreate ? 'Đề xuất tạo huy hiệu mới' : 'Đề xuất chỉnh sửa huy hiệu'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isCreate
                ? `"${display.name ?? '—'}"`
                : `ID: ${display.badge_id ?? '—'} · ${display.badge_name_hint ?? ''}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
              sc.cls,
            )}
          >
            {sc.icon}
            {sc.label}
          </span>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="p-1 rounded hover:bg-black/5 text-muted-foreground"
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Details (collapsible) ───────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {isCreate ? (
            // CREATE_BADGE details
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <DetailRow label="Mã (code)" value={<code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{display.code ?? '—'}</code>} />
              <DetailRow label="Tên huy hiệu" value={display.name ?? '—'} />
              <DetailRow
                label="Điều kiện"
                value={
                  (CONDITION_LABELS[display.conditionType ?? ''] ?? display.conditionType ?? '—') +
                  (display.conditionValue ? ` ≥ ${display.conditionValue}` : '')
                }
              />
              <DetailRow
                label="Mô tả"
                value={display.description ?? '—'}
                fullWidth
                muted
              />
              <DetailRow
                label="Độ hiếm"
                value={
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      RARITY_LABELS[display.rarity ?? 'COMMON']?.cls ?? 'bg-slate-100 text-slate-700',
                    )}
                  >
                    {RARITY_LABELS[display.rarity ?? 'COMMON']?.label ?? display.rarity}
                  </span>
                }
              />
              <DetailRow
                label="Trạng thái"
                value={
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      display.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {display.status === 'ACTIVE' ? 'Kích hoạt' : 'Ẩn'}
                  </span>
                }
              />
            </div>
          ) : (
            // UPDATE_BADGE details
            <div className="space-y-2">
              {(display.changes ?? []).length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Thay đổi:</p>
                  <ul className="space-y-1">
                    {(display.changes ?? []).map((change, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className="text-foreground">{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Không có thay đổi được liệt kê.</p>
              )}
            </div>
          )}

          {/* AI reasoning */}
          {display.reason && display.reason !== 'Không có lý do bổ sung' && (
            <div className="pt-2 border-t border-inherit">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Lý do đề xuất:</p>
              <p className="text-xs text-foreground/70 italic">{display.reason}</p>
            </div>
          )}

          {/* Action buttons — only for PENDING */}
          {status === 'PENDING' && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-inherit">
              <button
                onClick={handleReject}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition-colors"
              >
                {loading === 'reject' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                Từ chối
              </button>
              <button
                onClick={handleApprove}
                disabled={loading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 transition-colors"
              >
                {loading === 'approve' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Phê duyệt
              </button>
            </div>
          )}

          {/* Result banner after approval */}
          {status === 'APPROVED' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-700">
                {isCreate
                  ? 'Huy hiệu đã được tạo thành công.'
                  : 'Huy hiệu đã được cập nhật thành công.'}
              </p>
            </div>
          )}

          {status === 'REJECTED' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
              <X className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">Hành động đã bị từ chối.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface DetailRowProps {
  label: string
  value: React.ReactNode
  fullWidth?: boolean
  muted?: boolean
}

function DetailRow({ label, value, fullWidth, muted }: DetailRowProps) {
  return (
    <div className={cn('flex flex-col gap-0.5', fullWidth && 'col-span-2')}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', muted && 'font-normal text-foreground/80')}>
        {value}
      </span>
    </div>
  )
}
