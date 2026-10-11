import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockRoutes } from '@/mocks/routes'
import type { TrekkingRoute, RouteListParams, RouteFormData, PaginatedResponse } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'

let mockRouteStore = [...mockRoutes]
let nextRouteId = mockRouteStore.length + 1

type ApiRoute = Omit<TrekkingRoute, 'id' | 'placeId' | 'distance' | 'estimatedDuration'> & {
  trekkingRouteId: string
  trekkingPlaceId: string
  distanceMeters?: number
  estimatedDurationMinutes: number
}

async function fetchRoutes(params: RouteListParams): Promise<PaginatedResponse<TrekkingRoute>> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockRouteStore]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter((r) => r.name.toLowerCase().includes(q))
    }
    if (params.placeId) result = result.filter((r) => r.placeId === params.placeId)
    if (params.difficulty) result = result.filter((r) => r.difficulty === params.difficulty)
    if (params.status) result = result.filter((r) => r.status === params.status)
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
  // Real: GET /admin/trekking/routes
  const res = await apiClient.get<{ data: PaginatedResponse<ApiRoute> }>(ENDPOINTS.ADMIN_ROUTES, { params })
  const response = res.data.data

  // Map backend field names to frontend
  return {
    ...response,
    data: response.data.map((raw) => ({
      id: raw.trekkingRouteId,
      placeId: raw.trekkingPlaceId,
      name: raw.name,
      description: raw.description,
      difficulty: raw.difficulty,
      distance: (raw.distanceMeters ?? 0) / 1000,
      estimatedDuration: raw.estimatedDurationMinutes,
      elevationGain: raw.elevationGain,
      maxElevation: raw.maxElevation,
      imageUrl: raw.imageUrl,
      startLocation: raw.startLocation,
      endLocation: raw.endLocation,
      path: raw.path,
      images: [],
      status: raw.status,
      totalMilestones: 0,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    }))
  }
}

async function fetchRoute(id: string): Promise<TrekkingRoute> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const route = mockRouteStore.find((r) => r.id === id)
    if (!route) throw new Error('Không tìm thấy cung đường')
    return route
  }
  // Real: GET /admin/trekking/routes/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_ROUTE(id))
  const raw = res.data.data

  // Map backend field names to frontend
  return {
    id: raw.trekkingRouteId,
    placeId: raw.trekkingPlaceId,
    name: raw.name,
    description: raw.description,
    difficulty: raw.difficulty,
    distance: (raw.distanceMeters ?? 0) / 1000,
    estimatedDuration: raw.estimatedDurationMinutes,
    elevationGain: raw.elevationGain,
    maxElevation: raw.maxElevation,
    imageUrl: raw.imageUrl,
    startLocation: raw.startLocation,
    endLocation: raw.endLocation,
    path: raw.path,
    images: [],
    status: raw.status,
    totalMilestones: 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

async function createRoute(data: RouteFormData): Promise<TrekkingRoute> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const route: TrekkingRoute = {
      id: `r${++nextRouteId}`,
      name: data.name,
      placeId: data.placeId,
      description: data.description,
      difficulty: data.difficulty,
      distance: data.distance,
      estimatedDuration: data.estimatedDuration,
      elevationGain: data.elevationGain,
      maxElevation: data.maxElevation,
      imageUrl: data.imageUrl,
      startLocation: data.startLocation,
      endLocation: data.endLocation,
      path: data.path,
      images: [],
      status: data.status ?? 'ACTIVE',
      totalMilestones: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockRouteStore.push(route)
    return route
  }
  // Real: POST /admin/trekking/routes
  const res = await apiClient.post(ENDPOINTS.ADMIN_ROUTES, {
    trekkingPlaceId: data.placeId,
    name: data.name,
    description: data.description,
    difficulty: data.difficulty,
    distanceMeters: data.distance === undefined ? undefined : Math.round(data.distance * 1000),
    estimatedDurationMinutes: data.estimatedDuration,
    elevationGain: data.elevationGain,
    maxElevation: data.maxElevation,
    imageUrl: data.imageUrl,
    startLocation: data.startLocation,
    endLocation: data.endLocation,
    path: data.path,
    status: data.status ?? 'ACTIVE',
  })

  let raw = res.data.data

  // Upload image if provided
  if (data.imageFile) {
    raw = await uploadRouteImage(raw.trekkingRouteId, data.imageFile)
  }

  // Map backend field names to frontend
  return {
    id: raw.trekkingRouteId,
    placeId: raw.trekkingPlaceId,
    name: raw.name,
    description: raw.description,
    difficulty: raw.difficulty,
    distance: (raw.distanceMeters ?? 0) / 1000,
    estimatedDuration: raw.estimatedDurationMinutes,
    elevationGain: raw.elevationGain,
    maxElevation: raw.maxElevation,
    imageUrl: raw.imageUrl,
    startLocation: raw.startLocation,
    endLocation: raw.endLocation,
    path: raw.path,
    images: [],
    status: raw.status,
    totalMilestones: 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

async function updateRoute(id: string, data: Partial<RouteFormData>): Promise<TrekkingRoute> {
  if (data.status !== undefined && Object.keys(data).every((key) => key === 'status')) {
    return updateRouteStatus(id, data.status)
  }
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockRouteStore.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Không tìm thấy cung đường')
    mockRouteStore[idx] = {
      ...mockRouteStore[idx],
      ...(data as Partial<TrekkingRoute>),
      images: mockRouteStore[idx].images, // preserve existing images, never overwrite with File[]
      updatedAt: new Date().toISOString(),
    }
    return mockRouteStore[idx]
  }
  // Real: PUT /admin/trekking/routes/:id (full update)
  const res = await apiClient.put(ENDPOINTS.ADMIN_ROUTE(id), {
    trekkingPlaceId: data.placeId,
    name: data.name,
    description: data.description,
    difficulty: data.difficulty,
    distanceMeters: data.distance === undefined ? undefined : Math.round(data.distance * 1000),
    estimatedDurationMinutes: data.estimatedDuration,
    elevationGain: data.elevationGain,
    maxElevation: data.maxElevation,
    imageUrl: data.imageUrl,
    startLocation: data.startLocation,
    endLocation: data.endLocation,
    path: data.path,
  })

  let raw = res.data.data

  // Upload image if provided
  if (data.imageFile) {
    raw = await uploadRouteImage(id, data.imageFile)
  }

  // The content validator excludes status; update it through the dedicated API.
  if (data.status !== undefined && data.status !== raw.status) {
    const statusResponse = await apiClient.patch(ENDPOINTS.ADMIN_ROUTE_STATUS(id), { status: data.status })
    raw = statusResponse.data.data
  }

  // Map backend field names to frontend
  return {
    id: raw.trekkingRouteId,
    placeId: raw.trekkingPlaceId,
    name: raw.name,
    description: raw.description,
    difficulty: raw.difficulty,
    distance: (raw.distanceMeters ?? 0) / 1000,
    estimatedDuration: raw.estimatedDurationMinutes,
    elevationGain: raw.elevationGain,
    maxElevation: raw.maxElevation,
    imageUrl: raw.imageUrl,
    startLocation: raw.startLocation,
    endLocation: raw.endLocation,
    path: raw.path,
    images: [],
    status: raw.status,
    totalMilestones: 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

async function updateRouteStatus(id: string, status: TrekkingRoute['status']): Promise<TrekkingRoute> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const idx = mockRouteStore.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Không tìm thấy cung đường')
    mockRouteStore[idx] = { ...mockRouteStore[idx], status, updatedAt: new Date().toISOString() }
    return mockRouteStore[idx]
  }
  // Real: PATCH /admin/trekking/routes/:id/status
  const res = await apiClient.patch(ENDPOINTS.ADMIN_ROUTE_STATUS(id), { status })
  const raw = res.data.data

  // Map backend field names to frontend
  return {
    id: raw.trekkingRouteId,
    placeId: raw.trekkingPlaceId,
    name: raw.name,
    description: raw.description,
    difficulty: raw.difficulty,
    distance: (raw.distanceMeters ?? 0) / 1000,
    estimatedDuration: raw.estimatedDurationMinutes,
    elevationGain: raw.elevationGain,
    maxElevation: raw.maxElevation,
    imageUrl: raw.imageUrl,
    startLocation: raw.startLocation,
    endLocation: raw.endLocation,
    path: raw.path,
    images: [],
    status: raw.status,
    totalMilestones: 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

async function deleteRoute(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    mockRouteStore = mockRouteStore.filter((r) => r.id !== id)
    return
  }
  // Real: DELETE /admin/trekking/routes/:id  (soft-delete → INACTIVE)
  await apiClient.delete(ENDPOINTS.ADMIN_ROUTE(id))
}

async function uploadRouteImage(routeId: string, file: File): Promise<ApiRoute> {
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiClient.post<{ data: ApiRoute }>(ENDPOINTS.ADMIN_ROUTE_IMAGE(routeId), formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data.data
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useRoutes(params: RouteListParams) {
  return useQuery({
    queryKey: ['routes', params],
    queryFn: () => fetchRoutes(params),
    placeholderData: (p) => p,
  })
}

/** Complete catalog for selectors and route-group labels, beyond the first page. */
export function useAllRoutes(status?: RouteListParams['status']) {
  return useQuery({
    queryKey: ['routes', 'all', status],
    queryFn: async (): Promise<TrekkingRoute[]> => {
      const routes: TrekkingRoute[] = []
      for (let page = 1; ; page++) {
        const result = await fetchRoutes({ page, limit: 100, ...(status ? { status } : {}) })
        routes.push(...result.data)
        if (!result.data.length || routes.length >= result.total) return routes
      }
    },
  })
}

export function useRoute(id: string) {
  return useQuery({
    queryKey: ['route', id],
    queryFn: () => fetchRoute(id),
    enabled: !!id,
  })
}

export function useCreateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createRoute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] })
      toast.success('Đã tạo cung đường mới')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RouteFormData> }) =>
      updateRoute(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['route', vars.id] })
      toast.success('Đã cập nhật cung đường')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateRouteStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TrekkingRoute['status'] }) =>
      updateRouteStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['routes'] })
      qc.invalidateQueries({ queryKey: ['route', vars.id] })
      toast.success('Đã cập nhật trạng thái cung đường')
    },
    onError: (err: Error) => {
      const message = isAxiosError<{ message?: string }>(err)
        ? err.response?.data?.message
        : undefined
      toast.error(message || err.message)
    },
  })
}

export function useDeleteRoute() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteRoute,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes'] })
      toast.success('Đã xóa cung đường')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRouteFilters() {
  const [params, setParams] = useState<RouteListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
    difficulty: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setStatus: (status: RouteListParams['status']) =>
      setParams((p) => ({ ...p, status, page: 1 })),
    setDifficulty: (difficulty: RouteListParams['difficulty']) =>
      setParams((p) => ({ ...p, difficulty, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
