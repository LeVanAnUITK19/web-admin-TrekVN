import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockOfflineMaps } from '@/mocks/offline-maps'
import type { OfflineMapPackage, OfflineMapFormData, PlaceOfflineMapEntry, PaginatedResponse } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'

let mockStore = [...mockOfflineMaps]

interface OfflineMapListParams {
  page?: number
  limit?: number
  search?: string
  status?: OfflineMapPackage['status'] | ''
}

async function fetchOfflineMaps(params: OfflineMapListParams = {}): Promise<PaginatedResponse<OfflineMapPackage>> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter((m) => m.name.toLowerCase().includes(q))
    }
    if (params.status) result = result.filter((m) => m.status === params.status)
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return {
      data: result.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
  // Real: GET /admin/offline-maps  — returns paginated { data, total, page, limit, totalPages }
  const res = await apiClient.get(ENDPOINTS.ADMIN_OFFLINE_MAPS, { params })
  return res.data.data
}

async function fetchOfflineMap(id: string): Promise<OfflineMapPackage> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const m = mockStore.find((m) => m.id === id)
    if (!m) throw new Error('Không tìm thấy gói bản đồ')
    return m
  }
  // Real: GET /admin/offline-maps/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_OFFLINE_MAP(id))
  return res.data.data
}

async function createOfflineMap(data: OfflineMapFormData): Promise<OfflineMapPackage> {
  if (IS_MOCK_MODE) {
    await sleep(700)
    const map: OfflineMapPackage = {
      id: `om${Date.now()}`,
      name: data.name,
      version: data.version,
      description: data.description,
      checksum: data.checksum,
      downloadUrl: undefined, // DRAFT packages don't have a downloadUrl yet
      fileSizeBytes: data.fileSizeBytes,
      status: 'DRAFT',          // always starts as DRAFT per API spec
      regionCode: data.regionCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockStore.push(map)
    return map
  }
  // Real: POST /admin/offline-maps  → status = DRAFT
  const res = await apiClient.post(ENDPOINTS.ADMIN_OFFLINE_MAPS, {
    name: data.name,
    version: data.version,
    description: data.description,
    objectKey: data.objectKey,   // R2 object key
    checksum: data.checksum,
    fileSizeBytes: data.fileSizeBytes,
    regionCode: data.regionCode,
  })
  return res.data.data
}

async function updateOfflineMap(
  id: string,
  data: Partial<OfflineMapFormData>,
): Promise<OfflineMapPackage> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    const idx = mockStore.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Không tìm thấy gói bản đồ')
    mockStore[idx] = { ...mockStore[idx], ...data, updatedAt: new Date().toISOString() }
    return mockStore[idx]
  }
  // Real: PUT /admin/offline-maps/:id
  const res = await apiClient.put(ENDPOINTS.ADMIN_OFFLINE_MAP(id), data)
  return res.data.data
}

async function publishOfflineMap(id: string): Promise<OfflineMapPackage> {
  if (IS_MOCK_MODE) {
    await sleep(800)
    const idx = mockStore.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Không tìm thấy gói bản đồ')
    if (mockStore[idx].status === 'PUBLISHED') {
      throw new Error('Gói bản đồ đã được publish.')
    }
    mockStore[idx] = {
      ...mockStore[idx],
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return mockStore[idx]
  }
  // Real: POST /admin/offline-maps/:id/publish  (NOT PATCH — changes status→PUBLISHED)
  const res = await apiClient.post(ENDPOINTS.ADMIN_OFFLINE_MAP_PUBLISH(id))
  return res.data.data
}

async function deleteOfflineMap(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    const map = mockStore.find((m) => m.id === id)
    if (!map) throw new Error('Không tìm thấy gói bản đồ')
    if (map.status === 'PUBLISHED') {
      throw new Error('Không thể xóa gói bản đồ đang PUBLISHED. Hãy DEPRECATED trước.')
    }
    mockStore = mockStore.filter((m) => m.id !== id)
    return
  }
  // Real: DELETE /admin/offline-maps/:id  — fails if PUBLISHED
  await apiClient.delete(ENDPOINTS.ADMIN_OFFLINE_MAP(id))
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useOfflineMaps(params: OfflineMapListParams = {}) {
  return useQuery({
    queryKey: ['offline-maps', params],
    queryFn: () => fetchOfflineMaps(params),
    placeholderData: (p) => p,
  })
}

export function useOfflineMap(id: string) {
  return useQuery({
    queryKey: ['offline-map', id],
    queryFn: () => fetchOfflineMap(id),
    enabled: !!id,
  })
}

export function useCreateOfflineMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOfflineMap,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offline-maps'] })
      toast.success('Đã tạo gói bản đồ mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateOfflineMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<OfflineMapFormData> }) =>
      updateOfflineMap(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['offline-maps'] })
      qc.invalidateQueries({ queryKey: ['offline-map', vars.id] })
      toast.success('Đã cập nhật gói bản đồ')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function usePublishOfflineMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => publishOfflineMap(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['offline-maps'] })
      qc.invalidateQueries({ queryKey: ['offline-map', id] })
      toast.success('Đã publish gói bản đồ')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteOfflineMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteOfflineMap(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offline-maps'] })
      toast.success('Đã xóa gói bản đồ')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useOfflineMapFilters() {
  const [params, setParams] = useState<OfflineMapListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setStatus: (status: OfflineMapListParams['status']) =>
      setParams((p) => ({ ...p, status, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}

// ─── Place Offline Maps (Agent Map Builder) ───────────────────────────────────

type ApiPlaceOfflineMap = {
  trekkingPlaceId?: string
  _id?: string
  id: string
  name: string
  provinceId?: string
  address?: string
  status: string
  offlineMap: PlaceOfflineMapEntry['offlineMap']
  updatedAt: string
  createdAt: string
}

async function fetchPlacesOfflineMaps(params: { search?: string; page?: number; limit?: number } = {}): Promise<PaginatedResponse<PlaceOfflineMapEntry>> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    // Mock: trả về danh sách rỗng (agent maps)
    return { data: [], total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 }
  }
  const res = await apiClient.get<{ data: PaginatedResponse<ApiPlaceOfflineMap> }>(ENDPOINTS.ADMIN_PLACES_OFFLINE_MAPS, { params })
  // Backend trả về TrekkingPlace docs, map sang PlaceOfflineMapEntry shape
  const raw = res.data.data
  const items: PlaceOfflineMapEntry[] = (raw.data ?? []).map((p) => ({
    placeId: p.trekkingPlaceId || p._id || p.id,
    placeName: p.name,
    provinceId: p.provinceId,
    address: p.address,
    status: p.status,
    offlineMap: {
      ...p.offlineMap,
      downloadUrl: p.offlineMap?.objectKey
        ? null // built by backend at runtime; we show objectKey for now
        : null,
    },
    updatedAt: p.updatedAt,
    createdAt: p.createdAt,
  }))
  return { data: items, total: raw.total, page: raw.page, limit: raw.limit, totalPages: raw.totalPages }
}

async function updatePlaceOfflineMap(
  placeId: string,
  data: {
    available: boolean
    version: number
    objectKey?: string
    sizeBytes?: number | null
    checksum?: string | null
    minZoom?: number | null
    maxZoom?: number | null
    bounds?: { minLat: number; minLon: number; maxLat: number; maxLon: number } | null
  },
) {
  const res = await apiClient.put(ENDPOINTS.ADMIN_PLACE_OFFLINE_MAP(placeId), data)
  return res.data.data
}

export function usePlacesOfflineMaps(params: { search?: string; page?: number; limit?: number } = {}) {
  return useQuery({
    queryKey: ['places-offline-maps', params],
    queryFn: () => fetchPlacesOfflineMaps(params),
    placeholderData: (p) => p,
  })
}

export function useUpdatePlaceOfflineMap() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ placeId, data }: { placeId: string; data: Parameters<typeof updatePlaceOfflineMap>[1] }) =>
      updatePlaceOfflineMap(placeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['places-offline-maps'] })
      toast.success('Đã cập nhật bản đồ địa điểm')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
