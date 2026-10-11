import { cn } from '@/lib/utils'

interface AgentProgressProps {
  value: number       // 0–100
  label?: string
  className?: string
  size?: 'sm' | 'md'
  variant?: 'default' | 'success' | 'error'
}

export function AgentProgress({
  value,
  label,
  className,
  size = 'md',
  variant = 'default',
}: AgentProgressProps) {
  const clamped = Math.max(0, Math.min(100, value))

  const trackCls = cn(
    'w-full rounded-full bg-muted overflow-hidden',
    size === 'sm' ? 'h-1.5' : 'h-2.5'
  )
  const fillCls = cn(
    'h-full rounded-full transition-all duration-500',
    variant === 'success' ? 'bg-green-500' :
    variant === 'error' ? 'bg-destructive' :
    'bg-primary'
  )

  return (
    <div className={cn('w-full', className)}>
      {label !== undefined && (
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>{label}</span>
          <span className="font-medium">{clamped}%</span>
        </div>
      )}
      <div className={trackCls}>
        <div className={fillCls} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  )
}

/** Small inline confidence bar */
interface ConfidenceBarProps {
  value: number   // 0–100
  className?: string
}

export function ConfidenceBar({ value, className }: ConfidenceBarProps) {
  const color =
    value >= 80 ? 'bg-green-500' :
    value >= 50 ? 'bg-amber-400' :
    'bg-red-400'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span
        className={cn(
          'text-xs font-medium tabular-nums w-8 text-right',
          value >= 80 ? 'text-green-700' :
          value >= 50 ? 'text-amber-700' :
          'text-red-600'
        )}
      >
        {value}%
      </span>
    </div>
  )
}
