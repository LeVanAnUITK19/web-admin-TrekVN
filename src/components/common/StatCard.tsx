import { cn, formatNumber } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: number
  trendLabel?: string
  onClick?: () => void
  className?: string
}

export function StatCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  trend,
  trendLabel,
  onClick,
  className,
}: StatCardProps) {
  const formattedValue = typeof value === 'number' ? formatNumber(value) : value

  return (
    <div
      className={cn(
        'stat-card flex items-start gap-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className={cn('flex-shrink-0 p-3 rounded-lg', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{formattedValue}</p>
        {trend !== undefined && (
          <div className={cn(
            'flex items-center gap-1 mt-1 text-xs font-medium',
            trend >= 0 ? 'text-green-600' : 'text-red-600'
          )}>
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(trend)}% {trendLabel ?? 'so với tháng trước'}</span>
          </div>
        )}
      </div>
    </div>
  )
}
