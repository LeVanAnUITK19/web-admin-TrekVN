import { useState } from 'react'
import { Plus, MoreHorizontal, Pencil, PowerOff, ChevronDown, ChevronRight, Map as MapIcon } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { DIFFICULTY_LABELS, ROUTES } from '@/constants'
import { useAllRoutes, useUpdateRouteStatus } from './useRoutes'
import { usePlaces } from '../places/usePlaces'
import { RouteOfflineMapWithOverlays } from '@/components/map/RouteOfflineMapWithOverlays'
import type { TrekkingRoute } from '@/types'

export default function RoutesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TrekkingRoute['status'] | ''>('')
  const [difficultyFilter, setDifficultyFilter] = useState<TrekkingRoute['difficulty'] | ''>('')
  
  const { data: allRoutes, isLoading, isError, refetch } = useAllRoutes(statusFilter || undefined)
  const placesQuery = usePlaces({ page: 1, limit: 1000, status: 'ACTIVE' })
  
  const updateStatusMutation = useUpdateRouteStatus()
  const [disableTarget, setDisableTarget] = useState<TrekkingRoute | null>(null)
  const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())
  const [expandedRouteMap, setExpandedRouteMap] = useState<string | null>(null)

  // Filter routes
  const filteredRoutes = (allRoutes || []).filter(route => {
    if (search && !route.name.toLowerCase().includes(search.toLowerCase()) && 
        !(route.placeName?.toLowerCase().includes(search.toLowerCase()))) return false
    if (difficultyFilter && route.difficulty !== difficultyFilter) return false
    return true
  })

  // Group routes by place (only ACTIVE places)
  const activePlaceIds = new Set(placesQuery.data?.data.map(p => p.id) || [])
  const placeMap = new Map(placesQuery.data?.data.map(p => [p.id, p.name]) || [])
  const grouped = new Map<string, TrekkingRoute[]>()
  
  for (const route of filteredRoutes) {
    // Only show routes of ACTIVE places
    if (!activePlaceIds.has(route.placeId)) continue
    
    const group = grouped.get(route.placeId) || []
    group.push(route)
    grouped.set(route.placeId, group)
  }
  
  const groups = [...grouped].map(([placeId, routes]) => ({
    placeId,
    placeName: placeMap.get(placeId) || routes[0]?.placeName || placeId,
    routes: [...routes].sort((a, b) => a.name.localeCompare(b.name, 'vi')),
  })).sort((a, b) => a.placeName.localeCompare(b.placeName, 'vi'))

  const togglePlace = (placeId: string) => {
    setExpandedPlaces(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  const toggleRouteMap = (routeId: string) => {
    setExpandedRouteMap(prev => prev === routeId ? null : routeId)
  }

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
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm cung đường hoặc địa điểm..." className="w-64" />
        <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value as TrekkingRoute['difficulty'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none">
          <option value="">Tất cả độ khó</option>
          {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as TrekkingRoute['status'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none">
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Không hoạt động</option>
          <option value="DISABLED">Đã vô hiệu</option>
        </select>
        <button
          onClick={() => setExpandedPlaces(new Set(groups.map(g => g.placeId)))}
          className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
        >
          Mở rộng tất cả
        </button>
        <button
          onClick={() => setExpandedPlaces(new Set())}
          className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          Thu gọn tất cả
        </button>
      </div>

      {placesQuery.isError && (
        <p className="mb-4 text-sm text-destructive">
          Không thể tải tên địa điểm.{' '}
          <button type="button" onClick={() => placesQuery.refetch()} className="underline">
            Thử lại
          </button>
        </p>
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-5"><TableSkeleton /></div>
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : !filteredRoutes.length ? (
          <EmptyState title="Không có cung đường" />
        ) : (
          groups.map((group) => {
            const isExpanded = expandedPlaces.has(group.placeId)
            return (
              <div key={group.placeId} className="data-table-container overflow-hidden">
                <button
                  onClick={() => togglePlace(group.placeId)}
                  className="w-full px-4 py-4 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 font-semibold text-left flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <span className="text-foreground">{group.placeName}</span>
                    <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-0.5 rounded-full">
                      {group.routes.length} cung đường
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="overflow-x-auto border-t border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-12">#</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên cung đường</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Độ khó</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Chiều dài</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thời gian</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.routes.map((route, idx) => (
                          <>
                            <tr key={route.id} className="hover:bg-muted/20">
                              <td className="px-4 py-3 text-muted-foreground text-xs">{idx + 1}</td>
                              <td className="px-4 py-3">
                                <p className="font-medium text-foreground">{route.name}</p>
                                {route.description && (
                                  <p className="text-xs text-muted-foreground truncate max-w-md">
                                    {route.description}
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                  {DIFFICULTY_LABELS[route.difficulty] ?? route.difficulty}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{route.distance} km</td>
                              <td className="px-4 py-3 text-muted-foreground">
                                {route.estimatedDuration ? `${Math.floor(route.estimatedDuration / 60)}h ${route.estimatedDuration % 60}m` : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <StatusBadge status={route.status} />
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => toggleRouteMap(route.id)}
                                    className="p-1.5 rounded hover:bg-muted"
                                    title="Xem bản đồ với cột mốc"
                                    aria-label="Xem bản đồ với cột mốc"
                                  >
                                    <MapIcon className={`w-4 h-4 ${expandedRouteMap === route.id ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </button>
                                  <DropdownMenu.Root>
                                    <DropdownMenu.Trigger asChild>
                                      <button
                                        aria-label={`Thao tác của ${route.name}`}
                                        className="p-1.5 rounded hover:bg-muted"
                                      >
                                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                      </button>
                                    </DropdownMenu.Trigger>
                                    <DropdownMenu.Portal>
                                      <DropdownMenu.Content
                                        align="end"
                                        className="z-50 min-w-36 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
                                      >
                                        <DropdownMenu.Item
                                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none"
                                          onSelect={() => navigate(ROUTES.TREKKING_ROUTES_EDIT(route.id))}
                                        >
                                          <Pencil className="w-4 h-4" /> Chỉnh sửa
                                        </DropdownMenu.Item>
                                        {route.status !== 'DISABLED' && (
                                          <DropdownMenu.Item
                                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
                                            onSelect={() => setDisableTarget(route)}
                                          >
                                            <PowerOff className="w-4 h-4" /> Vô hiệu hóa
                                          </DropdownMenu.Item>
                                        )}
                                      </DropdownMenu.Content>
                                    </DropdownMenu.Portal>
                                  </DropdownMenu.Root>
                                </div>
                              </td>
                            </tr>
                            {/* Map row - shown when expanded */}
                            {expandedRouteMap === route.id && (
                              <tr key={`${route.id}-map`}>
                                <td colSpan={7} className="px-4 py-4 bg-muted/10">
                                  <RouteOfflineMapWithOverlays
                                    routeId={route.id}
                                    routeName={route.name}
                                    placeId={route.placeId}
                                    routePath={route.path}
                                  />
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })
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
