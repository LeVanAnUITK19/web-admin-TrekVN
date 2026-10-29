import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'
import apiClient from '@/services/api/client'
import { MapPreview } from './MapPreview'
import type { GeoPoint, OfflineMap, GeoLineString } from '@/types'

interface ApiMilestone {
  milestoneId: string
  trekkingRouteId: string
  name: string
  location: GeoPoint
  sequence: number
  type: string
}

export function RouteOfflineMapWithOverlays({
  routeId,
  routeName = 'Cung đường',
  placeId,
  routePath,
  className,
}: {
  routeId: string
  routeName?: string
  placeId: string
  routePath?: GeoLineString | null
  className?: string
}) {
  const [showMilestones, setShowMilestones] = useState(true)

  // Fetch offline map info from place
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

  // Fetch milestones for this route
  const { data: milestonesData } = useQuery({
    queryKey: ['route-milestones', routeId],
    enabled: !!routeId && showMilestones,
    queryFn: async (): Promise<Array<{ coordinates: GeoPoint; name: string; sequence: number }>> => {
      console.log('[RouteOfflineMapWithOverlays] Fetching milestones for routeId:', routeId)
      const milestonesRes = await apiClient.get(
        `/admin/trekking/routes/${routeId}/milestones`
      )
      console.log('[RouteOfflineMapWithOverlays] Milestones response:', milestonesRes.data)
      
      // Handle different response structures
      const rawMilestones = milestonesRes.data?.data?.data || milestonesRes.data?.data || milestonesRes.data || []
      console.log('[RouteOfflineMapWithOverlays] Raw milestones:', rawMilestones)
      
      const milestones = rawMilestones.map((raw: ApiMilestone) => ({
        coordinates: raw.location,
        name: raw.name,
        sequence: raw.sequence,
      }))
      console.log('[RouteOfflineMapWithOverlays] Mapped milestones:', milestones)
      return milestones
    },
  })

  if (!placeId) {
    return (
      <div className="p-10 text-center text-sm text-muted-foreground border rounded-lg">
        Địa điểm không xác định.
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
      {/* Control panel for toggling milestones */}
      <div className="absolute top-16 right-3 z-20 bg-white border border-border rounded-lg shadow-lg p-3 w-56">
        <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 p-2 rounded">
          <input
            type="checkbox"
            checked={showMilestones}
            onChange={(e) => setShowMilestones(e.target.checked)}
            className="w-4 h-4"
          />
          <MapPin className="w-4 h-4 text-red-600" />
          <span>Hiển thị cột mốc</span>
        </label>

        {showMilestones && milestonesData && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <p>✓ {milestonesData.length} cột mốc</p>
          </div>
        )}
      </div>

      <MapPreview
        placeId={placeId}
        checksum={offlineMapData.checksum ?? ''}
        fileName={offlineMapData.objectKey?.split('/').pop() ?? 'Bản đồ cung đường'}
        placeName={routeName}
        path={routePath}
        className={className}
        // Pass overlay data
        overlayMilestones={showMilestones ? milestonesData : undefined}
      />
    </div>
  )
}
