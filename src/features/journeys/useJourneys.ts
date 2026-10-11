import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import type { PaginatedResponse } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JourneyStatistics {
  distanceMeters: number
  durationSeconds: number
  elevationGain: number
  maxAltitude: number
  averageSpeed: number
}

export interface Journey {
  id: string
  userId: string
  trekkingPlaceId: string
  placeName: string | null
  trekkingRouteId: string
  routeName: string | null
  provinceId: string
  name: string
  status: 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
  note?: string
  participantCount?: number
  plannedStartAt?: string
  plannedEndAt?: string
  startedAt?: string
  completedAt?: string
  statistics: JourneyStatistics | null
  checkinCount: number
  markerCount: number
  createdAt: string
  updatedAt: string
}

export interface JourneyListParams {
  page?: number
  limit?: number
  search?: string
  userId?: string
  status?: Journey['status'] | ''
}

// ─── Mock data (minimal — journeys are read-only, no heavy mock needed) ───────

const MOCK_JOURNEYS: Journey[] = [
  {
    id: 'j1',
    userId: 'u1',
    trekkingPlaceId: 'p1',
    placeName: 'Fansipan',
    trekkingRouteId: 'r1',
    routeName: 'Cung chính',
    provinceId: 'prov-lao-cai',
    name: 'Hành trình tháng 10',
    status: 'COMPLETED',
    startedAt: '2026-10-01T06:00:00Z',
    completedAt: '2026-10-01T14:00:00Z',
    statistics: {
      distanceMeters: 19000,
      durationSeconds: 28800,
      elevationGain: 1800,
      maxAltitude: 3143,
      averageSpeed: 2.3,
    },
    checkinCount: 5,
    markerCount: 3,
    createdAt: '2026-10-01T06:00:00Z',
    updatedAt: '2026-10-01T14:00:00Z',
  },
  {
    id: 'j2',
    userId: 'u2',
    trekkingPlaceId: 'p2',
    placeName: 'Núi Bà Đen',
    trekkingRouteId: 'r2',
    routeName: 'Cung leo núi',
    provinceId: 'prov-tay-ninh',
    name: 'Chinh phục Bà Đen',
    status: 'COMPLETED',
    startedAt: '2026-09-15T05:30:00Z',
    completedAt: '2026-09-15T11:30:00Z',
    statistics: {
      distanceMeters: 8500,
      durationSeconds: 21600,
      elevationGain: 850,
      maxAltitude: 986,
      averageSpeed: 1.4,
    },
    checkinCount: 4,
    markerCount: 2,
    createdAt: '2026-09-15T05:30:00Z',
    updatedAt: '2026-09-15T11:30:00Z',
  },
]

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchJourneys(
  params: JourneyListParams,
): Promise<PaginatedResponse<Journey>> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    let result = [...MOCK_JOURNEYS]
    if (params.search) {
      const q = params.search.toLowerCase()
      result = result.filter(
        (j) =>
          j.name.toLowerCase().includes(q) ||
          j.placeName?.toLowerCase().includes(q) ||
          j.userId.toLowerCase().includes(q),
      )
    }
    if (params.userId) result = result.filter((j) => j.userId === params.userId)
    if (params.status) result = result.filter((j) => j.status === params.status)
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
  // Read-only management; refresh reflects writes made by the mobile owner.
  const res = await apiClient.get(ENDPOINTS.ADMIN_JOURNEYS, { params })
  return res.data.data
}

async function fetchJourney(id: string): Promise<Journey> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const j = MOCK_JOURNEYS.find((j) => j.id === id)
    if (!j) throw new Error('Không tìm thấy hành trình')
    return j
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_JOURNEY(id))
  return res.data.data
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useJourneys(params: JourneyListParams) {
  return useQuery({
    queryKey: ['journeys', params],
    queryFn: () => fetchJourneys(params),
    placeholderData: (p) => p,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useJourney(id: string) {
  return useQuery({
    queryKey: ['journey', id],
    queryFn: () => fetchJourney(id),
    enabled: !!id,
    staleTime: 0,
    refetchInterval: 10_000,
    refetchOnWindowFocus: 'always',
  })
}

export function useJourneyFilters() {
  const [params, setParams] = useState<JourneyListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    search: '',
    status: '',
  })
  return {
    params,
    setSearch: (search: string) => setParams((p) => ({ ...p, search, page: 1 })),
    setStatus: (status: JourneyListParams['status']) =>
      setParams((p) => ({ ...p, status, page: 1 })),
    setUserId: (userId: string) => setParams((p) => ({ ...p, userId, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}
