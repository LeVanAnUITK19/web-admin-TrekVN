import { useState } from 'react'
import { Plus, MoreHorizontal, Pencil, PowerOff } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { DIFFICULTY_LABELS, ROUTES } from '@/constants'
import { useRoutes, useUpdateRouteStatus, useRouteFilters } from './useRoutes'
import type { TrekkingRoute } from '@/types'

export default function RoutesPage() {
  const navigate = useNavigate()
  const { params, setSearch, setStatus, setDifficulty, setPage } = useRouteFilters()
  const { data, isLoading, isError, refetch } = useRoutes(params)
  const updateStatusMutation = useUpdateRouteStatus()
  const [disableTarget, setDisableTarget] = useState<TrekkingRoute | null>(null)

  return (
    <div>
      <PageHeader
        title="Quản lý cung đường"
        description="Duyệt và quản lý các cung đường trekking"
        action={
          <button
            onClick={() => navigate(ROUTES.TREKKING_ROUTES_CREATE)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm cung đường
          </button>
        }
      />
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput value={params.search ?? ''} onChange={setSearch} placeholder="Tìm cung đường..." className="w-64" />
        <select value={params.difficulty ?? ''} onChange={(e) => setDifficulty(e.target.value as TrekkingRoute['difficulty'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none">
          <option value="">Tất cả độ khó</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={params.status ?? ''} onChange={(e) => setStatus(e.target.value as TrekkingRoute['status'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="DISABLED">Đã vô hiệu</option>
        </select>
      </div>

      <div className="data-table-container">
        {isLoading ? <div className="p-5"><TableSkeleton /></div>
          : isError ? <ErrorState retry={refetch} />
          : !data?.data?.length ? <EmptyState title="Không có cung đường" />
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">#</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên cung đường</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tỉnh/TP</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Độ khó</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Chiều dài</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.data.map((route: TrekkingRoute, idx: number) => (
                      <tr key={route.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{(params.page! - 1) * params.limit! + idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{route.name}</p>
                          <p className="text-xs text-muted-foreground">{route.placeName}</p>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{route.province ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm">{route.distance} km</td>
                        <td className="px-4 py-3"><StatusBadge status={route.status} /></td>
                        <td className="px-4 py-3">
                          <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                              <button aria-label={`Thao tác của ${route.name}`} className="p-1.5 rounded hover:bg-muted"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                              <DropdownMenu.Content align="end" className="z-50 min-w-36 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm">
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none"
                                  onSelect={() => navigate(ROUTES.TREKKING_ROUTES_EDIT(route.id))}
                                >
                                  <Pencil className="w-4 h-4" /> Chỉnh sửa
                                </DropdownMenu.Item>
                                {route.status !== 'DISABLED' && (
                                  <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
                                    onSelect={() => setDisableTarget(route)}>
                                    <PowerOff className="w-4 h-4" /> Vô hiệu hóa
                                  </DropdownMenu.Item>
                                )}
                              </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                          </DropdownMenu.Root>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={data.page} totalPages={data.totalPages} total={data.total} limit={data.limit} onPageChange={setPage} />
            </>
          )}
      </div>

      <ConfirmDialog
        open={!!disableTarget}
        onOpenChange={(open) => { if (!open) setDisableTarget(null) }}
        title="Vô hiệu hóa cung đường"
        description={`Vô hiệu hóa cung đường "${disableTarget?.name}"?`}
        confirmLabel="Vô hiệu hóa" variant="danger"
        closeOnConfirm={false}
        onConfirm={async () => {
          if (!disableTarget || updateStatusMutation.isPending) return
          try {
            await updateStatusMutation.mutateAsync({ id: disableTarget.id, status: 'DISABLED' })
            setDisableTarget(null)
          } catch {
            // The mutation shows the API error; keep the dialog open for retry.
          }
        }}
        isLoading={updateStatusMutation.isPending}
      />
    </div>
  )
}
