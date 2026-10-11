import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/constants'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending'

const STATUS_VARIANTS: Record<string, BadgeVariant> = {
  ACTIVE: 'success',
  APPROVED: 'success',
  PUBLISHED: 'success',
  BLOCKED: 'danger',
  REJECTED: 'danger',
  DELETED: 'danger',
  INACTIVE: 'neutral',
  DISABLED: 'neutral',
  CANCELLED: 'neutral',
  DEPRECATED: 'neutral',
  PENDING_REVIEW: 'pending',
  DRAFT: 'info',
  NEEDS_REVISION: 'warning',
  HIDDEN: 'neutral',
  SUCCESS: 'success',
  FAILURE: 'danger',
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  pending: 'bg-orange-100 text-orange-700 border-orange-200',
}

interface StatusBadgeProps {
  status: string
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const variant = STATUS_VARIANTS[status] ?? 'neutral'
  const displayLabel = label ?? STATUS_LABELS[status] ?? status

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
