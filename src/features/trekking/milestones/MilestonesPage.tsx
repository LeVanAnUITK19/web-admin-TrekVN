import { useState } from 'react'
import { Plus, Pencil, PowerOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { IS_MOCK_MODE, MILESTONE_TYPE_LABELS, ROUTES } from '@/constants'
import { useAllMilestones, useUpdateMilestone } from './useMilestones'
import { useAllRoutes } from '../routes/useRoutes'
import type { Milestone } from '@/types'

const MILESTONE_TYPE_ICONS: Record<string, string> = {
  START: '🟢',
  END: '🏁',
  WAYPOINT: '📍',
  SUMMIT: '⛰️',
  CAMP: '⛺',
  REST_POINT: '🛖',
  VIEWPOINT: '🔭',
  WATER_SOURCE: '💧',
}

export default function MilestonesPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAllMilestones()
  const routeCatalog = useAllRoutes()
  const milestones: Milestone[] = data ?? []
  const routeNames = new Map(routeCatalog.data?.map(route => [route.id, route.name]))
  const grouped = new Map<string, Milestone[]>()
  for (const milestone of milestones) {
    const group = grouped.get(milestone.routeId) ?? []
    group.push(milestone)
    grouped.set(milestone.routeId, group)
  }
  const groups = [...grouped].map(([routeId, items]) => ({
    routeId, name: routeNames.get(routeId) ?? items[0].routeName ?? routeId,
    items: [...items].sort((a, b) => a.sequence - b.sequence),
  })).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  const updateMutation = useUpdateMilestone()
  const [disableTarget, setDisableTarget] = useState<Milestone | null>(null)

  return (
    <div>
      <PageHeader
        title="Quản lý cột mốc"
        description="Quản lý các cột mốc theo từng cung đường"
        action={
          <button
            onClick={() => navigate(ROUTES.TREKKING_MILESTONES_CREATE)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm cột mốc
          </button>
        }
      />

      {routeCatalog.isError && <p className="mb-4 text-sm text-destructive">Không thể tải tên cung đường. <button type="button" onClick={() => routeCatalog.refetch()} className="underline">Thử lại</button></p>}

      <div className="space-y-4">
        {isLoading ? <div className="p-5"><TableSkeleton /></div>
          : isError ? <ErrorState retry={refetch} />
          : !milestones.length ? <EmptyState title="Không có cột mốc" />
          : (
            groups.map(group => <details key={group.routeId} open className="data-table-container">
              <summary className="cursor-pointer px-4 py-4 bg-muted/30 font-semibold">
                {group.name}
                <span className="ml-3 text-xs font-normal text-muted-foreground">{group.items.length} cột mốc</span>
              </summary>
            <div className="overflow-x-auto border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên cột mốc</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Loại</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thứ tự</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Bán kính (m)</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {group.items.map((m: Milestone, idx: number) => (
                    <tr key={m.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {MILESTONE_TYPE_ICONS[m.type]}
                          {MILESTONE_TYPE_LABELS[m.type] ?? m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{m.sequence}</td>
                      <td className="px-4 py-3 text-muted-foreground">{m.checkinRadius}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(ROUTES.TREKKING_MILESTONES_EDIT(m.id))}
                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {IS_MOCK_MODE && m.status !== 'DISABLED' && (
                            <button
                              onClick={() => setDisableTarget(m)}
                              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-red-50 rounded"
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
            </details>)
          )}
      </div>

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open) setDisableTarget(null) }}
        title="Vô hiệu hóa cột mốc"
        description={`Vô hiệu hóa cột mốc "${disableTarget?.name}"?`}
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
