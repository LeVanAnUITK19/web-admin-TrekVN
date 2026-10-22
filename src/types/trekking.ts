export type Difficulty = 'EASY' | 'MODERATE' | 'HARD' | 'EXPERT'
export type PlaceStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED'
export type RouteStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED'
export type MilestoneType = 'START' | 'END' | 'WAYPOINT' | 'SUMMIT' | 'CAMP' | 'REST_POINT' | 'VIEWPOINT' | 'WATER_SOURCE'
export type MilestoneStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED'
export type DataOrigin = 'MANUAL' | 'USER_CONTRIBUTION' | 'AI_AGENT'

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface GeoPoint {
  type: 'Point'
  coordinates: [number, number] // [lng, lat]
}

export interface GeoLineString {
  type: 'LineString'
  coordinates: [number, number][]
}

export interface OfflineMapBounds {
  minLat: number
  minLon: number
  maxLat: number
  maxLon: number
}

export interface OfflineMap {
  available: boolean
  version: number
  objectKey?: string
  sizeBytes?: number
  checksum?: string
  minZoom?: number
  maxZoom?: number
  bounds?: OfflineMapBounds
}

export interface Place {
  id: string
  name: string
  provinceId?: string // Tỉnh ID theo chuẩn mới
  province: string // Tên tỉnh (legacy hoặc display)
  mien?: 'mien-bac' | 'mien-trung' | 'mien-nam' // Vùng miền
  description: string
  difficulty: Difficulty
  coordinates: GeoPoint
  location?: GeoPoint // Alias cho coordinates (API dùng location)
  address?: string
  averageDurationMinutes?: number
  elevationMeters?: number
  coverImage?: string
  images: string[]
  imageMapUrl?: string
  tags: string[]
  status: PlaceStatus
  dataOrigin?: DataOrigin
  externalRefs?: Record<string, unknown> | null
  lastVerifiedAt?: string | null
  offlineMap?: OfflineMap
  totalRoutes?: number
  ratingAverage?: number
  ratingCount?: number
  createdAt: string
  updatedAt: string
}

export interface PlaceFormData {
  name: string
  provinceId: string
  mien: 'mien-bac' | 'mien-trung' | 'mien-nam'
  description: string
  difficulty: Difficulty
  latitude: number
  longitude: number
  address?: string
  averageDurationMinutes?: number
  elevationMeters?: number
  tags: string[]
  /** File objects mới cần upload lên Cloudinary */
  images?: File[]
  /** File object cho ảnh bản đồ — thay thế imageMapUrl khi upload mới */
  mapImageFile?: File
  /** URL ảnh bản đồ hiện tại (chỉ dùng khi không có mapImageFile mới) */
  imageMapUrl?: string
  dataOrigin?: DataOrigin
  externalRefs?: Record<string, unknown> | null
  lastVerifiedAt?: string | null
  offlineMap?: OfflineMap
  status?: PlaceStatus
}

export interface TrekkingRoute {
  id: string
  name: string
  placeId: string
  placeName?: string
  province?: string
  description: string
  distance: number // km
  estimatedDuration: number // minutes
  elevationGain?: number // meters
  maxElevation?: number // meters
  difficulty: Difficulty
  imageUrl?: string // Route-specific image (ảnh riêng của route)
  geometry?: GeoLineString
  startLocation?: GeoPoint | null
  endLocation?: GeoPoint | null
  path?: GeoLineString | null
  coverImage?: string
  images: string[]
  status: RouteStatus
  totalMilestones?: number
  createdAt: string
  updatedAt: string
}

export interface RouteFormData {
  name: string
  placeId: string
  description: string
  distance: number
  estimatedDuration: number
  elevationGain?: number
  maxElevation?: number
  difficulty: Difficulty
  imageUrl?: string
  imageFile?: File
  startLocation?: GeoPoint | null
  endLocation?: GeoPoint | null
  path?: GeoLineString | null
  pathFile?: File // GPX/GeoJSON file
  images?: File[]
  status?: RouteStatus
}

export interface Milestone {
  id: string
  routeId: string
  routeName?: string
  name: string
  type: MilestoneType
  sequence: number
  coordinates: GeoPoint
  checkinRadius: number // meters
  description?: string
  images: string[]
  status: MilestoneStatus
  createdAt: string
  updatedAt: string
}

export interface MilestoneFormData {
  routeId: string
  name: string
  type: MilestoneType
  sequence: number
  latitude: number
  longitude: number
  checkinRadius: number
  description?: string
  status?: MilestoneStatus
}

export interface PlaceListParams {
  page?: number
  limit?: number
  search?: string
  province?: string
  mien?: 'mien-bac' | 'mien-trung' | 'mien-nam' | ''
  difficulty?: Difficulty | ''
  status?: PlaceStatus | ''
}

export interface RouteListParams {
  page?: number
  limit?: number
  search?: string
  placeId?: string
  difficulty?: Difficulty | ''
  status?: RouteStatus | ''
}

export interface MilestoneListParams {
  page?: number
  limit?: number
  routeId?: string
  status?: MilestoneStatus | ''
}
