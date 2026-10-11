import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockMilestones } from '@/mocks/milestones'
import type { Milestone, MilestoneFormData } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'
import { useState } from 'react'

let mockMilestoneStore = [...mockMilestones]
let nextId = mockMilestoneStore.length + 1

interface ApiMilestone {
  milestoneId: string
  trekkingRouteId: string
  name: string
  type: string
  sequence: number
  location: Milestone['coordinates']
  checkinRadiusMeters?: number
  description?: string
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

function fromApiMilestone(raw: ApiMilestone): Milestone {
  const types: Record<string, Milestone['type']> = {
    FINISH: 'END', CHECKPOINT: 'WAYPOINT', WATER_POINT: 'WATER_SOURCE',
  }
  return {
    id: raw.milestoneId,
    routeId: raw.trekkingRouteId,
    name: raw.name,
    type: types[raw.type] ?? raw.type as Milestone['type'],
    sequence: raw.sequence,
    coordinates: raw.location,
    checkinRadius: raw.checkinRadiusMeters ?? 50,
    description: raw.description,
    images: raw.imageUrl ? [raw.imageUrl] : [],
    status: 'ACTIVE',
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

function toApiMilestone(data: Partial<MilestoneFormData>) {
  const types: Record<string, string> = {
    END: 'FINISH', WAYPOINT: 'CHECKPOINT', WATER_SOURCE: 'WATER_POINT',
  }
  if ((data.latitude === undefined) !== (data.longitude === undefined)) {
    throw new Error('Cần nhập đủ vĩ độ và kinh độ của cột mốc.')
  }
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.type !== undefined && { type: types[data.type] ?? data.type }),
    ...(data.sequence !== undefined && { sequence: data.sequence }),
    ...(data.checkinRadius !== undefined && { checkinRadiusMeters: data.checkinRadius }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.latitude !== undefined && data.longitude !== undefined && {
      location: { type: 'Point', coordinates: [data.longitude, data.latitude] },
    }),
  }
}

interface MilestoneListParams {
  routeId?: string
  page?: number
  limit?: number
}

async function fetchMilestones(params: MilestoneListParams = {}) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockMilestoneStore]
    if (params.routeId) result = result.filter((m) => m.routeId === params.routeId)
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
  // Real: GET /admin/milestones?routeId=xxx  (flat endpoint with optional filter)
  const res = await apiClient.get(ENDPOINTS.ADMIN_MILESTONES, { params })
  const response = res.data.data
  return { ...response, data: response.data.map(fromApiMilestone) }
}

async function fetchMilestone(id: string): Promise<Milestone> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const m = mockMilestoneStore.find((m) => m.id === id)
    if (!m) throw new Error('Không tìm thấy cột mốc')
    return m
  }
  // Real: GET /admin/milestones/:id
  const res = await apiClient.get(ENDPOINTS.ADMIN_MILESTONE(id))
  return fromApiMilestone(res.data.data)
}

async function createMilestone(data: MilestoneFormData): Promise<Milestone> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const m: Milestone = {
      id: `m${++nextId}`,
      routeId: data.routeId,
      name: data.name,
      type: data.type,
      sequence: data.sequence,
      coordinates: { type: 'Point', coordinates: [data.longitude, data.latitude] },
      checkinRadius: data.checkinRadius,
      description: data.description,
      images: [],
      status: data.status ?? 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockMilestoneStore.push(m)
    return m
  }
  // Real: POST /admin/trekking/routes/:routeId/milestones  (nested create)
  const res = await apiClient.post(ENDPOINTS.ADMIN_ROUTE_MILESTONES(data.routeId), toApiMilestone(data))
  return fromApiMilestone(res.data.data)
}

async function updateMilestone(id: string, data: Partial<MilestoneFormData>): Promise<Milestone> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    const idx = mockMilestoneStore.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Không tìm thấy cột mốc')
    mockMilestoneStore[idx] = {
      ...mockMilestoneStore[idx],
      ...data,
      updatedAt: new Date().toISOString(),
    }
    return mockMilestoneStore[idx]
  }
  // Real: PUT /admin/milestones/:id  (flat update, no routeId needed)
  const res = await apiClient.put(ENDPOINTS.ADMIN_MILESTONE(id), toApiMilestone(data))
  return fromApiMilestone(res.data.data)
}

async function deleteMilestone(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    mockMilestoneStore = mockMilestoneStore.filter((m) => m.id !== id)
    return
  }
  // Real: DELETE /admin/milestones/:id
  await apiClient.delete(ENDPOINTS.ADMIN_MILESTONE(id))
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useMilestones(params: MilestoneListParams = {}) {
  return useQuery({
    queryKey: ['milestones', params],
    queryFn: () => fetchMilestones(params),
    placeholderData: (p) => p,
  })
}

export function useAllMilestones() {
  return useQuery({
    queryKey: ['milestones', 'all'],
    queryFn: async () => {
      const milestones: Milestone[] = []
      for (let page = 1; ; page++) {
        const result = await fetchMilestones({ page, limit: 100 })
        milestones.push(...result.data)
        if (!result.data.length || milestones.length >= result.total) return milestones
      }
    },
  })
}

export function useMilestone(id: string) {
  return useQuery({
    queryKey: ['milestone', id],
    queryFn: () => fetchMilestone(id),
    enabled: !!id,
  })
}

export function useRouteMilestoneSequences(routeId: string) {
  return useQuery({
    queryKey: ['milestones', 'sequences', routeId],
    enabled: !!routeId,
    queryFn: async (): Promise<number[]> => {
      if (IS_MOCK_MODE) return mockMilestoneStore.filter((m) => m.routeId === routeId).map((m) => m.sequence)
      const res = await apiClient.get(ENDPOINTS.ADMIN_ROUTE_MILESTONES(routeId))
      return (res.data.data as ApiMilestone[]).map((m) => m.sequence)
    },
  })
}

export function milestoneErrorMessage(err: unknown): string {
  const error = err as Error & { response?: { data?: { error?: { message?: string } } } }
  return error.response?.data?.error?.message ?? error.message ?? 'Không thể lưu cột mốc. Vui lòng thử lại.'
}

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createMilestone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] })
      toast.success('Đã tạo cột mốc mới')
    },
    onError: (err: Error) => toast.error(milestoneErrorMessage(err)),
  })
}

export function useUpdateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MilestoneFormData> }) =>
      updateMilestone(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['milestones'] })
      qc.invalidateQueries({ queryKey: ['milestone', vars.id] })
      toast.success('Đã cập nhật cột mốc')
    },
    onError: (err: Error) => toast.error(milestoneErrorMessage(err)),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteMilestone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones'] })
      toast.success('Đã xóa cột mốc')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useMilestoneFilters() {
  const [params, setParams] = useState<MilestoneListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
  })
  return {
    params,
    setRouteId: (routeId: string) => setParams((p) => ({ ...p, routeId, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
