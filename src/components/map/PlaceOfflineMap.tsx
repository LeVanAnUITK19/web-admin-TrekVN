import { useQuery } from '@tanstack/react-query'
import apiClient from '@/services/api/client'
import { MapPreview } from './MapPreview'
import type { GeoLineString, GeoPoint, OfflineMap } from '@/types'

export function PlaceOfflineMap({ placeId, placeName = 'Địa điểm', path, location, milestone, className }: {
  placeId: string; placeName?: string; path?: GeoLineString | null; location?: GeoPoint | null; milestone?: GeoPoint | null; className?: string
}) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['place-offline-preview', placeId], enabled: !!placeId,
    queryFn: async (): Promise<OfflineMap & { downloadUrl?: string }> =>
      (await apiClient.get(`/admin/trekking/places/${placeId}/offline-map`)).data.data,
  })
  if (!placeId) return <div className="p-10 text-center text-sm text-muted-foreground border rounded-lg">Chọn địa điểm để mở bản đồ offline.</div>
  if (isLoading) return <div role="status" className="p-10 text-center text-sm">Đang đọc gói bản đồ của địa điểm…</div>
  if (isError || !data?.available || !data.downloadUrl) return <div className="p-10 text-center text-sm border rounded-lg space-y-2">
    <p>{isError ? 'Không thể tải thông tin bản đồ offline.' : 'Địa điểm chưa có gói bản đồ offline đã xuất bản.'}</p>
    <button type="button" onClick={() => void refetch()} className="text-primary">Tải lại</button>
  </div>
  return <MapPreview placeId={placeId} checksum={data.checksum ?? ''}
    fileName={data.objectKey?.split('/').pop() ?? 'Bản đồ địa điểm'} placeName={placeName}
    path={path} location={location} milestone={milestone} className={className} />
}
