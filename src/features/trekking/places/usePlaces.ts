import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockPlaces } from '@/mocks/places'
import type { Place, PlaceListParams, PlaceFormData, PaginatedResponse } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'

// ─── Upload helpers ───────────────────────────────────────────────────────────

/**
 * Upload ảnh địa điểm (place.images) lên Cloudinary qua backend.
 * Gọi sau khi place đã được tạo để có placeId.
 * @returns mảng URL đã upload
 */
async function uploadPlaceImages(placeId: string, files: File[]): Promise<string[]> {
  if (!files.length) return []
  const formData = new FormData()
  files.forEach((f) => formData.append('images', f))
  const res = await apiClient.post(ENDPOINTS.ADMIN_PLACE_IMAGES(placeId), formData, {
    headers: { 'Content-Type': undefined },
  })
  return res.data.data.urls as string[]
}

/**
 * Upload ảnh bản đồ địa điểm lên Cloudinary qua backend.
 * @returns URL đã upload
 */
async function uploadPlaceMapImage(placeId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('image', file)
  const res = await apiClient.post(ENDPOINTS.ADMIN_PLACE_MAP_IMAGE(placeId), formData, {
    headers: { 'Content-Type': undefined },
  })
  return res.data.data.url as string
}

let mockPlaceStore = [...mockPlaces]
let nextId = mockPlaceStore.length + 1

async function fetchPlaces(params: PlaceListParams): Promise<PaginatedResponse<Place>> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockPlaceStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.province.toLowerCase().includes(q),
      )
    }
    if (params.province) result = result.filter((p) => p.province === params.province)
    if (params.difficulty) result = result.filter((p) => p.difficulty === params.difficulty)
    if (params.status) result = result.filter((p) => p.status === params.status)
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
  // Real: GET /admin/trekking/places
  const res = await apiClient.get(ENDPOINTS.ADMIN_PLACES, { params })
  return res.data.data
}

async function fetchPlace(id: string): Promise<Place> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const place = mockPlaceStore.find((p) => p.id === id)
    if (!place) throw new Error('Không tìm thấy địa điểm')
    return place
  }
  // Real: GET /admin/trekking/places/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_PLACE(id))
  // Backend response structure: { success: true, data: Place }
  const placeData = res.data.data || res.data

  // Map 'location' to 'coordinates' if needed for backward compatibility
  if (placeData.location && !placeData.coordinates) {
    placeData.coordinates = placeData.location
  }

  return placeData
}

async function createPlace(data: PlaceFormData): Promise<Place> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const place: Place = {
      id: `p${++nextId}`,
      name: data.name,
      provinceId: data.provinceId,
      province: data.provinceId, // Will be resolved by backend
      mien: data.mien,
      address: data.address,
      description: data.description,
      difficulty: data.difficulty,
      averageDurationMinutes: data.averageDurationMinutes,
      elevationMeters: data.elevationMeters,
      coordinates: { type: 'Point', coordinates: [data.longitude, data.latitude] },
      images: [],
      imageMapUrl: data.imageMapUrl,
      tags: data.tags || [],
      status: data.status ?? 'ACTIVE',
      dataOrigin: data.dataOrigin ?? 'MANUAL',
      externalRefs: data.externalRefs ?? null,
      lastVerifiedAt: data.lastVerifiedAt ?? null,
      offlineMap: data.offlineMap ?? { available: false, version: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockPlaceStore.push(place)
    return place
  }
  // Real: POST /admin/trekking/places
  const payload: Record<string, unknown> = {
    name: data.name,
    provinceId: data.provinceId,
    mien: data.mien,
    location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
    difficulty: data.difficulty,
    description: data.description,
    status: data.status ?? 'ACTIVE',
  }
  if (data.address) payload.address = data.address
  if (data.averageDurationMinutes !== undefined) payload.averageDurationMinutes = data.averageDurationMinutes
  if (data.elevationMeters !== undefined) payload.elevationMeters = data.elevationMeters
  if (data.tags && data.tags.length > 0) payload.tags = data.tags
  if (data.dataOrigin) payload.dataOrigin = data.dataOrigin
  if (data.externalRefs) payload.externalRefs = data.externalRefs
  if (data.lastVerifiedAt) payload.lastVerifiedAt = data.lastVerifiedAt
  if (data.offlineMap) payload.offlineMap = data.offlineMap

  const res = await apiClient.post(ENDPOINTS.ADMIN_PLACES, payload)
  const place: Place = res.data.data

  // Upload ảnh địa điểm sau khi có placeId
  const imageFiles = data.images ?? []
  if (imageFiles.length > 0) {
    try {
      await uploadPlaceImages(place.id, imageFiles)
    } catch (err) {
      console.error('[createPlace] Image upload failed (non-fatal):', err)
      toast.warning('Địa điểm đã tạo nhưng upload ảnh thất bại')
    }
  }

  // Upload ảnh bản đồ sau khi có placeId
  if (data.mapImageFile) {
    try {
      await uploadPlaceMapImage(place.id, data.mapImageFile)
    } catch (err) {
      console.error('[createPlace] Map image upload failed (non-fatal):', err)
      toast.warning('Địa điểm đã tạo nhưng upload ảnh bản đồ thất bại')
    }
  }

  return place
}

async function updatePlace(id: string, data: Partial<PlaceFormData>): Promise<Place> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    const idx = mockPlaceStore.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Không tìm thấy địa điểm')
    const updated: Place = { ...mockPlaceStore[idx], updatedAt: new Date().toISOString() }
    if (data.name !== undefined) updated.name = data.name
    if (data.provinceId !== undefined) { updated.provinceId = data.provinceId; updated.province = data.provinceId }
    if (data.mien !== undefined) updated.mien = data.mien
    if (data.address !== undefined) updated.address = data.address
    if (data.description !== undefined) updated.description = data.description
    if (data.difficulty !== undefined) updated.difficulty = data.difficulty
    if (data.averageDurationMinutes !== undefined) updated.averageDurationMinutes = data.averageDurationMinutes
    if (data.elevationMeters !== undefined) updated.elevationMeters = data.elevationMeters
    if (data.latitude !== undefined && data.longitude !== undefined) {
      updated.coordinates = { type: 'Point', coordinates: [data.longitude, data.latitude] }
    }
    if (data.imageMapUrl !== undefined) updated.imageMapUrl = data.imageMapUrl
    if (data.tags !== undefined) updated.tags = data.tags
    if (data.dataOrigin !== undefined) updated.dataOrigin = data.dataOrigin
    if (data.externalRefs !== undefined) updated.externalRefs = data.externalRefs
    if (data.lastVerifiedAt !== undefined) updated.lastVerifiedAt = data.lastVerifiedAt
    if (data.offlineMap !== undefined) updated.offlineMap = data.offlineMap
    if (data.status !== undefined) updated.status = data.status
    mockPlaceStore[idx] = updated
    return updated
  }

  // Real: PUT /admin/trekking/places/:id
  const payload: Record<string, unknown> = {}
  if (data.name !== undefined) payload.name = data.name
  if (data.provinceId !== undefined) payload.provinceId = data.provinceId
  if (data.mien !== undefined) payload.mien = data.mien
  if (data.address !== undefined) payload.address = data.address
  if (data.description !== undefined) payload.description = data.description
  if (data.difficulty !== undefined) payload.difficulty = data.difficulty
  if (data.averageDurationMinutes !== undefined) payload.averageDurationMinutes = data.averageDurationMinutes
  if (data.elevationMeters !== undefined) payload.elevationMeters = data.elevationMeters
  if (data.latitude !== undefined && data.longitude !== undefined) {
    payload.location = { type: 'Point', coordinates: [data.longitude, data.latitude] }
  }
  if (data.tags !== undefined) payload.tags = data.tags
  if (data.dataOrigin !== undefined) payload.dataOrigin = data.dataOrigin
  if (data.externalRefs !== undefined) payload.externalRefs = data.externalRefs
  if (data.lastVerifiedAt !== undefined) payload.lastVerifiedAt = data.lastVerifiedAt
  if (data.offlineMap !== undefined) payload.offlineMap = data.offlineMap
  if (data.status !== undefined) payload.status = data.status

  const res = await apiClient.put(ENDPOINTS.ADMIN_PLACE(id), payload)
  const place: Place = res.data.data

  // Upload ảnh mới nếu có
  const imageFiles = data.images ?? []
  if (imageFiles.length > 0) {
    try {
      await uploadPlaceImages(id, imageFiles)
    } catch (err) {
      console.error('[updatePlace] Image upload failed (non-fatal):', err)
      toast.warning('Địa điểm đã cập nhật nhưng upload ảnh thất bại')
    }
  }

  // Upload ảnh bản đồ mới nếu có
  if (data.mapImageFile) {
    try {
      await uploadPlaceMapImage(id, data.mapImageFile)
    } catch (err) {
      console.error('[updatePlace] Map image upload failed (non-fatal):', err)
      toast.warning('Địa điểm đã cập nhật nhưng upload ảnh bản đồ thất bại')
    }
  }

  return place
}

async function updatePlaceStatus(id: string, status: Place['status']): Promise<Place> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const idx = mockPlaceStore.findIndex((p) => p.id === id)
    if (idx === -1) throw new Error('Không tìm thấy địa điểm')
    mockPlaceStore[idx] = { ...mockPlaceStore[idx], status, updatedAt: new Date().toISOString() }
    return mockPlaceStore[idx]
  }
  // Real: PATCH /admin/trekking/places/:id/status
  const res = await apiClient.patch(ENDPOINTS.ADMIN_PLACE_STATUS(id), { status })
  return res.data.data
}

async function deletePlace(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    mockPlaceStore = mockPlaceStore.filter((p) => p.id !== id)
    return
  }
  // Real: DELETE /admin/trekking/places/:id  (soft-delete → INACTIVE)
  await apiClient.delete(ENDPOINTS.ADMIN_PLACE(id))
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
// NOTE: Backend tự động ghi Audit Log cho tất cả actions (CREATE, UPDATE, DELETE, DISABLE)
// khi admin thực hiện thao tác trên Place. Không cần gọi API audit log riêng từ frontend.
// Tham khảo: docs/api-backend.md - Section 12. Audit Logs

export function usePlaces(params: PlaceListParams) {
  return useQuery({
    queryKey: ['places', params],
    queryFn: () => fetchPlaces(params),
    placeholderData: (p) => p,
  })
}

export function usePlace(id: string) {
  return useQuery({
    queryKey: ['place', id],
    queryFn: () => fetchPlace(id),
    enabled: !!id,
    retry: 1,
  })
}

export function useCreatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPlace,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['places'] })
      toast.success('Đã thêm địa điểm')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PlaceFormData> }) =>
      updatePlace(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['places'] })
      qc.invalidateQueries({ queryKey: ['place', vars.id] })
      toast.success('Đã cập nhật địa điểm')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdatePlaceStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Place['status'] }) =>
      updatePlaceStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['places'] })
      qc.invalidateQueries({ queryKey: ['place', vars.id] })
      toast.success('Đã cập nhật trạng thái địa điểm')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeletePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deletePlace,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['places'] })
      toast.success('Đã xóa địa điểm')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function usePlaceFilters() {
  const [params, setParams] = useState<PlaceListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
    difficulty: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setStatus: (status: PlaceListParams['status']) =>
      setParams((p) => ({ ...p, status, page: 1 })),
    setDifficulty: (difficulty: PlaceListParams['difficulty']) =>
      setParams((p) => ({ ...p, difficulty, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
