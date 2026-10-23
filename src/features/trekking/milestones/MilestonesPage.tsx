import { useState } from 'react'
import { Plus, Pencil, PowerOff, ChevronDown, ChevronRight, Mountain } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { IS_MOCK_MODE, MILESTONE_TYPE_LABELS, ROUTES } from '@/constants'
import { useAllMilestones, useUpdateMilestone } from './useMilestones'
import { useAllRoutes } from '../routes/useRoutes'
import { usePlaces } from '../places/usePlaces'
import type { Milestone, TrekkingRoute } from '@/types'

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
  const routesQuery = useAllRoutes()
  const placesQuery = usePlaces({ page: 1, limit: 1000, status: 'ACTIVE' })
  
  const [search, setSearch] = useState('')
  const [expandedPlaces, setExpandedPlaces] = useState<Set<string>>(new Set())
  const [expandedRoutes, setExpandedRoutes] = useState<Set<string>>(new Set())
  const updateMutation = useUpdateMilestone()
  const [disableTarget, setDisableTarget] = useState<Milestone | null>(null)

  const milestones: Milestone[] = data ?? []
  
  // Filter milestones by search
  const filteredMilestones = search
    ? milestones.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
    : milestones

  // Build hierarchy: Place -> Routes -> Milestones (only ACTIVE places and ACTIVE routes)
  const activePlaceIds = new Set(placesQuery.data?.data.map(p => p.id) || [])
  const placeMap = new Map(placesQuery.data?.data.map(p => [p.id, p.name]) || [])
  const routeMap = new Map<string, TrekkingRoute>()
  const activeRouteIds = new Set<string>()
  
  routesQuery.data?.forEach(r => {
    routeMap.set(r.id, r)
    // Only consider routes that are ACTIVE and belong to ACTIVE places
    if (r.status === 'ACTIVE' && activePlaceIds.has(r.placeId)) {
      activeRouteIds.add(r.id)
    }
  })

  // Group milestones by route, then by place (filter by ACTIVE routes only)
  const routeGroups = new Map<string, Milestone[]>()
  for (const milestone of filteredMilestones) {
    // Skip milestones from non-ACTIVE routes
    if (!activeRouteIds.has(milestone.routeId)) continue
    
    const group = routeGroups.get(milestone.routeId) || []
    group.push(milestone)
    routeGroups.set(milestone.routeId, group)
  }

  const placeGroups = new Map<string, Map<string, Milestone[]>>()
  for (const [routeId, milesList] of routeGroups) {
    const route = routeMap.get(routeId)
    const placeId = route?.placeId || 'unknown'
    
    // Skip if place is not ACTIVE
    if (!activePlaceIds.has(placeId)) continue
    
    if (!placeGroups.has(placeId)) {
      placeGroups.set(placeId, new Map())
    }
    placeGroups.get(placeId)!.set(routeId, milesList.sort((a, b) => a.sequence - b.sequence))
  }

  const hierarchy = [...placeGroups].map(([placeId, routes]) => ({
    placeId,
    placeName: placeMap.get(placeId) || placeId,
    routes: [...routes].map(([routeId, milesList]) => ({
      routeId,
      routeName: routeMap.get(routeId)?.name || milesList[0]?.routeName || routeId,
      milestones: milesList,
    })).sort((a, b) => a.routeName.localeCompare(b.routeName, 'vi')),
  })).sort((a, b) => a.placeName.localeCompare(b.placeName, 'vi'))

  const togglePlace = (placeId: string) => {
    setExpandedPlaces(prev => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

  const toggleRoute = (routeId: string) => {
    setExpandedRoutes(prev => {
      const next = new Set(prev)
      if (next.has(routeId)) next.delete(routeId)
      else next.add(routeId)
      return next
    })
  }

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

      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput 
          value={search} 
          onChange={setSearch} 
          placeholder="Tìm cột mốc..." 
          className="w-64" 
        />
        <button
          onClick={() => {
            setExpandedPlaces(new Set(hierarchy.map(h => h.placeId)))
            setExpandedRoutes(new Set(hierarchy.flatMap(h => h.routes.map(r => r.routeId))))
          }}
          className="px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-md transition-colors"
        >
          Mở rộng tất cả
        </button>
        <button
          onClick={() => {
            setExpandedPlaces(new Set())
            setExpandedRoutes(new Set())
          }}
          className="px-3 py-2 text-sm text-muted-foreground hover:bg-muted rounded-md transition-colors"
        >
          Thu gọn tất cả
        </button>
      </div>

      {routesQuery.isError && (
        <p className="mb-4 text-sm text-destructive">
          Không thể tải tên cung đường.{' '}
          <button type="button" onClick={() => routesQuery.refetch()} className="underline">
            Thử lại
          </button>
        </p>
      )}
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
        ) : !filteredMilestones.length ? (
          <EmptyState title="Không có cột mốc" />
        ) : (
          hierarchy.map(place => {
            const isPlaceExpanded = expandedPlaces.has(place.placeId)
            const totalMilestones = place.routes.reduce((sum, r) => sum + r.milestones.length, 0)
            
            return (
              <div key={place.placeId} className="border border-border rounded-lg overflow-hidden">
                {/* Place Header */}
                <button
                  onClick={() => togglePlace(place.placeId)}
                  className="w-full px-4 py-4 bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/15 font-semibold text-left flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isPlaceExpanded ? (
                      <ChevronDown className="w-5 h-5 text-primary" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    )}
                    <Mountain className="w-5 h-5 text-primary" />
                    <span className="text-foreground">{place.placeName}</span>
                    <span className="text-xs font-normal text-muted-foreground bg-white px-2 py-0.5 rounded-full">
                      {place.routes.length} cung đường • {totalMilestones} cột mốc
                    </span>
                  </div>
                </button>

                {/* Routes */}
                {isPlaceExpanded && (
                  <div className="border-t border-border">
                    {place.routes.map((routeGroup, routeIdx) => {
                      const isRouteExpanded = expandedRoutes.has(routeGroup.routeId)
                      
                      return (
                        <div key={routeGroup.routeId} className={routeIdx > 0 ? 'border-t border-border' : ''}>
                          {/* Route Header */}
                          <button
                            onClick={() => toggleRoute(routeGroup.routeId)}
                            className="w-full px-6 py-3 bg-muted/30 hover:bg-muted/50 text-left flex items-center justify-between group transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              {isRouteExpanded ? (
                                <ChevronDown className="w-4 h-4 text-primary" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              )}
                              <span className="font-medium text-sm">{routeGroup.routeName}</span>
                              <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full">
                                {routeGroup.milestones.length} cột mốc
                              </span>
                            </div>
                          </button>

                          {/* Milestones Table */}
                          {isRouteExpanded && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="bg-muted/20 border-b border-border">
                                    <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground w-12">#</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên cột mốc</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Loại</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thứ tự</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Bán kính (m)</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {routeGroup.milestones.map((m: Milestone, idx: number) => (
                                    <tr key={m.id} className="hover:bg-muted/10">
                                      <td className="px-6 py-3 text-muted-foreground text-xs">{idx + 1}</td>
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
                          )}
                        </div>
                      )
                    })}
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
