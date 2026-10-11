import { useState } from 'react'
import { Plus, Pencil, PowerOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useBadges, useUpdateBadge } from './useBadges'
import {
  BADGE_CONDITION_LABELS, ROUTES,
} from '@/constants'
import { formatNumber, cn } from '@/lib/utils'
import type { Badge } from '@/types'

const CONDITION_ICONS: Record<string, string> = {
  CHECKIN_COUNT: '📍', JOURNEY_COUNT: '🥾', PROVINCE_COUNT: '🗺️',
  CONTRIBUTION_APPROVED: '✅', SPECIFIC_PLACE: '📌',
  ELEVATION_TOTAL: '⛰️', DISTANCE_TOTAL: '📏',
}

export default function BadgesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useBadges()
  const updateMutation = useUpdateBadge()
  const [disableTarget, setDisableTarget] = useState<Badge | null>(null)

  return (
    <div>
      <PageHeader
        title="Quản lý huy hiệu"
        description="Tạo và quản lý hệ thống huy hiệu TrekViệt"
        action={
          <button
            onClick={() => navigate(ROUTES.BADGES_CREATE)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md"
          >
            <Plus className="w-4 h-4" /> Thêm huy hiệu
          </button>
        }
      />

      <div className="data-table-container">
        {isLoading ? (
          <div className="p-5"><TableSkeleton rows={5} /></div>
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : !data?.length ? (
          <EmptyState title="Chưa có huy hiệu nào" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Huy hiệu</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Điều kiện</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Đã trao</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.map((badge, idx) => (
                  <tr
                    key={badge.id}
                    className={cn('hover:bg-muted/20 transition-colors', badge.status === 'DISABLED' && 'opacity-50')}
                  >
                    <td className="px-4 py-3 text-xs text-muted-foreground">{idx + 1}</td>

                    {/* Name + description */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 border bg-primary/10 border-primary">
                          {badge.iconUrl && !badge.iconUrl.startsWith('/icons')
                            ? <img src={badge.iconUrl} alt="" className="w-7 h-7 object-contain" />
                            : '🏅'}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{badge.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">
                            {badge.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Condition */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-sm text-foreground">
                        <span>{CONDITION_ICONS[badge.condition.type]}</span>
                        <span>{BADGE_CONDITION_LABELS[badge.condition.type] ?? badge.condition.type}</span>
                      </span>
                      {badge.condition.value !== undefined && (
                        <p className="text-xs text-muted-foreground mt-0.5">≥ {formatNumber(badge.condition.value)} {badge.condition.type === 'DISTANCE_TOTAL' ? (badge.condition.unit === 'METERS' ? 'm' : 'km') : ['ELEVATION_TOTAL', 'ALTITUDE_REACHED'].includes(badge.condition.type) ? 'm' : ''}</p>
                      )}
                      {badge.condition.placeId && (
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{badge.condition.placeId}</p>
                      )}
                    </td>

                    {/* Total awarded */}
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      {formatNumber(badge.totalAwarded ?? 0)}
                    </td>

                    {/* Status + toggle */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={badge.status} />
                        {badge.status !== 'DISABLED' && (
                          <button
                            onClick={() =>
                              updateMutation.mutate({
                                id: badge.id,
                                data: { status: badge.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                              })
                            }
                            disabled={updateMutation.isPending}
                            className={cn(
                              'w-9 h-5 rounded-full transition-colors flex items-center px-0.5 disabled:opacity-50',
                              badge.status === 'ACTIVE' ? 'bg-success' : 'bg-gray-300',
                            )}
                          >
                            <span
                              className={cn(
                                'w-4 h-4 bg-white rounded-full shadow transition-transform',
                                badge.status === 'ACTIVE' ? 'translate-x-4' : 'translate-x-0',
                              )}
                            />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(ROUTES.BADGES_EDIT(badge.id))}
                          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {badge.status !== 'DISABLED' && (
                          <button
                            onClick={() => setDisableTarget(badge)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded transition-colors"
                            title="Vô hiệu hóa"
                          >
                            <PowerOff className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open) setDisableTarget(null) }}
        title="Vô hiệu hóa huy hiệu"
        description={`Vô hiệu hóa huy hiệu "${disableTarget?.name}"? Người dùng sẽ không thể đạt huy hiệu này nữa.`}
        confirmLabel="Vô hiệu hóa"
        variant="danger"
        onConfirm={async () => {
          if (disableTarget) {
            await updateMutation.mutateAsync({ id: disableTarget.id, data: { status: 'INACTIVE' } })
            setDisableTarget(null)
          }
        }}
        isLoading={updateMutation.isPending}
      />
    </div>
  )
}
