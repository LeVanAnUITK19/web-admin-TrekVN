import { cn } from '@/lib/utils'
import type { AgentTaskStatus } from '@/types'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending' | 'purple'

const STATUS_VARIANTS: Record<AgentTaskStatus, BadgeVariant> = {
  QUEUED: 'neutral',
  PROCESSING: 'info',
  PENDING_REVIEW: 'pending',
  APPROVED: 'warning',
  REJECTED: 'danger',
  PUBLISHING: 'purple',
  PUBLISHED: 'success',
  SUCCESS: 'success',
  FAILED: 'danger',
  CANCELLED: 'neutral',
}

export const AGENT_STATUS_LABELS: Record<AgentTaskStatus, string> = { // eslint-disable-line react-refresh/only-export-components
  QUEUED: 'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  PENDING_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  PUBLISHING: 'Đang xuất bản',
  PUBLISHED: 'Đã xuất bản',
  SUCCESS: 'Hoàn thành',
  FAILED: 'Thất bại',
  CANCELLED: 'Đã hủy',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
}

interface AgentStatusBadgeProps {
  status: AgentTaskStatus | string
  label?: string
  className?: string
}

export function AgentStatusBadge({ status, label, className }: AgentStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status as AgentTaskStatus] ?? 'neutral'
  const displayLabel = label ?? AGENT_STATUS_LABELS[status as AgentTaskStatus] ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        VARIANT_CLASSES[variant],
        className
      )}
    >
      {displayLabel}
    </span>
  )
}
