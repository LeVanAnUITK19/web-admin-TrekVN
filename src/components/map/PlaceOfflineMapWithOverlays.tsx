import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Route, MapPin, Layers } from 'lucide-react'
import apiClient from '@/services/api/client'
import { MapPreview } from './MapPreview'
import type { GeoPoint, OfflineMap, TrekkingRoute, Milestone, GeoLineString } from '@/types'

interface ApiRoute {
  trekkingRouteId: string
  trekkingPlaceId: string
  name: string
  path?: GeoLineString | null
  status: string
}

interface ApiMilestone {
  milestoneId: string
  trekkingRouteId: string
  name: string
  location: GeoPoint
  sequence: number
  type: string
}

export function PlaceOfflineMapWithOverlays({
  placeId,
  placeName = 'Địa điểm',
  location,
  className,
}: {
  placeId: string
  placeName?: string
  location?: GeoPoint | null
  className?: string
}) {
  const [showRoutes, setShowRoutes] = useState(false)
  const [showMilestones, setShowMilestones] = useState(false)

  // Fetch offline map info
  const {
    data: offlineMapData,
    isLoading: isMapLoading,
    isError: isMapError,
    refetch: refetchMap,
  } = useQuery({
    queryKey: ['place-offline-preview', placeId],
    enabled: !!placeId,
    queryFn: async (): Promise<OfflineMap & { downloadUrl?: string }> =>
      (await apiClient.get(`/admin/trekking/places/${placeId}/offline-map`)).data.data,
  })

  // Fetch routes for this place
  const { data: routesData } = useQuery({
    queryKey: ['place-routes', placeId],
    enabled: !!placeId && showRoutes,
    queryFn: async (): Promise<Array<{ path: GeoLineString; name: string }>> => {
      const res = await apiClient.get<{ data: { data: ApiRoute[] } }>('/admin/trekking/routes', {
        params: { placeId, status: 'ACTIVE', limit: 100 },
      })
      return res.data.data.data
        .filter((r) => r.path && r.path.coordinates.length > 0)
        .map((r) => ({
          path: r.path!,
          name: r.name,
        }))
    },
  })

  // Fetch all milestones for routes of this place
  const { data: milestonesData } = useQuery({
    queryKey: ['place-milestones', placeId],
    enabled: !!placeId && showMilestones,
    queryFn: async (): Promise<Array<{ coordinates: GeoPoint; name: string; sequence: number }>> => {
      // First get all routes for this place
      const routesRes = await apiClient.get<{ data: { data: ApiRoute[] } }>('/admin/trekking/routes', {
        params: { placeId, status: 'ACTIVE', limit: 100 },
      })
      const routes = routesRes.data.data.data

      // Then fetch milestones for all routes
      const allMilestones: Array<{ coordinates: GeoPoint; name: string; sequence: number }> = []
      for (const route of routes) {
        try {
          const milestonesRes = await apiClient.get<{ data: { data: ApiMilestone[] } }>(
            `/admin/trekking/routes/${route.trekkingRouteId}/milestones`
          )
          const milestones = milestonesRes.data.data.data.map((raw) => ({
            coordinates: raw.location,
            name: raw.name,
            sequence: raw.sequence,
          }))
          allMilestones.push(...milestones)
        } catch (error) {
          console.warn(`Failed to fetch milestones for route ${route.trekkingRouteId}:`, error)
        }
      }
      return allMilestones
    },
  })

  if (!placeId) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground border rounded-lg">
        Chọn địa điểm để mở bản đồ offline.
      </div>
    )
  }

  if (isMapLoading) {
    return (
      <div role="status" className="p-10 text-center text-sm">
        Đang đọc gói bản đồ của địa điểm…
      </div>
    )
  }

  if (isMapError || !offlineMapData?.available || !offlineMapData.downloadUrl) {
    return (
      <div className="p-10 text-center text-sm border rounded-lg space-y-2">
        <p>
          {isMapError
            ? 'Không thể tải thông tin bản đồ offline.'
            : 'Địa điểm chưa có gói bản đồ offline đã xuất bản.'}
        </p>
        <button type="button" onClick={() => void refetchMap()} className="text-primary">
          Tải lại
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Control panel for toggling overlays */}
      <div className="absolute top-16 right-3 z-20 bg-white border border-border rounded-lg shadow-lg p-3 w-56">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Hiển thị trên bản đồ</p>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
            <input
              type="checkbox"
              checked={showRoutes}
              onChange={(e) => setShowRoutes(e.target.checked)}
              className="w-4 h-4"
            />
            <Route className="w-4 h-4 text-blue-600" />
            <span>Tất cả cung đường</span>
          </label>

          <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
            <input
              type="checkbox"
              checked={showMilestones}
              onChange={(e) => setShowMilestones(e.target.checked)}
              className="w-4 h-4"
            />
            <MapPin className="w-4 h-4 text-red-600" />
            <span>Tất cả cột mốc</span>
          </label>
        </div>

        {(showRoutes || showMilestones) && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            {showRoutes && routesData && (
              <p>✓ {routesData.length} cung đường</p>
            )}
            {showMilestones && milestonesData && (
              <p>✓ {milestonesData.length} cột mốc</p>
            )}
          </div>
        )}
      </div>

      <MapPreview
        placeId={placeId}
        checksum={offlineMapData.checksum ?? ''}
        fileName={offlineMapData.objectKey?.split('/').pop() ?? 'Bản đồ địa điểm'}
        placeName={placeName}
        location={location}
        className={className}
        // Pass overlay data
        overlayRoutes={showRoutes ? routesData : undefined}
        overlayMilestones={showMilestones ? milestonesData : undefined}
      />
    </div>
  )
}
