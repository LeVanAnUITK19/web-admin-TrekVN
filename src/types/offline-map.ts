export type OfflineMapStatus = 'DRAFT' | 'PUBLISHED' | 'DEPRECATED'

export interface OfflineMapPackage {
  id: string
  name: string
  version: string
  description?: string
  /** Có thể null nếu chưa upload file — tránh crash khi .slice() */
  checksum?: string | null
  /** Present after publishing; null/undefined for DRAFT packages */
  downloadUrl?: string | null
  fileSizeBytes?: number | null
  status: OfflineMapStatus
  regionCode?: string | null
  createdAt: string
  updatedAt: string
  publishedAt?: string | null
}

export interface OfflineMapFormData {
  name: string
  version: string
  description?: string
  /** R2 object key của file bản đồ đã upload */
  objectKey?: string
  checksum?: string
  fileSizeBytes?: number
  regionCode?: string
  status?: OfflineMapStatus
}

/**
 * Embedded offlineMap subdocument trong TrekkingPlace.
 * Được Agent Map Builder cập nhật via PUT /places/:id/offline-map.
 */
export interface PlaceOfflineMapEntry {
  /** ID của TrekkingPlace */
  placeId: string
  placeName: string
  provinceId?: string
  address?: string
  status: string
  offlineMap: {
    available: boolean
    version: number
    objectKey?: string | null
    sizeBytes?: number | null
    checksum?: string | null
    minZoom?: number | null
    maxZoom?: number | null
    bounds?: {
      minLat: number
      minLon: number
      maxLat: number
      maxLon: number
    } | null
    downloadUrl?: string | null
  }
  updatedAt: string
  createdAt: string
}
