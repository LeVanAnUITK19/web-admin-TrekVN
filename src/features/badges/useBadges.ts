import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { IS_MOCK_MODE } from '@/constants'
import { mockBadges } from '@/mocks/badges'
import type { Badge, BadgeFormData } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'

type BadgeErrorResponse = { error?: { message?: string; details?: Record<string, unknown> } }

// eslint-disable-next-line prefer-const
let mockBadgeStore = [...mockBadges]
let nextId = mockBadgeStore.length + 1

async function fetchBadges(): Promise<Badge[]> {
  if (IS_MOCK_MODE) { await sleep(400); return mockBadgeStore }
  const res = await apiClient.get(ENDPOINTS.ADMIN_BADGES)
  return res.data.data
}

async function fetchBadge(id: string): Promise<Badge> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    const badge = mockBadgeStore.find((b) => b.id === id)
    if (!badge) throw new Error('Không tìm thấy huy hiệu')
    return badge
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_BADGE(id))
  return res.data.data
}

async function createBadge(data: BadgeFormData): Promise<Badge> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const badge: Badge = {
      ...data,
      id: `b${++nextId}`,
      name: data.name,
      description: data.description,
      iconUrl: data.iconUrl ?? '/icons/badge-default.svg',
      condition: { ...data.condition },
      status: data.status ?? 'ACTIVE',
      totalAwarded: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockBadgeStore.push(badge)
    return badge
  }
  const res = await apiClient.post(ENDPOINTS.ADMIN_BADGES, data)
  return res.data.data
}

async function updateBadge(id: string, data: Partial<BadgeFormData>): Promise<Badge> {

  if (IS_MOCK_MODE) {
    await sleep(500)
    const idx = mockBadgeStore.findIndex((b) => b.id === id)
    if (idx === -1) throw new Error('Không tìm thấy huy hiệu')
    mockBadgeStore[idx] = {
      ...mockBadgeStore[idx],
      ...data,
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.condition && { condition: { ...data.condition } }),
      ...(data.status && { status: data.status }),
      updatedAt: new Date().toISOString(),
    }
    return mockBadgeStore[idx]
  }

  const { status, ...updateData } = data
  let result: Badge | undefined
  if (Object.keys(updateData).length) {
    const res = await apiClient.patch(ENDPOINTS.ADMIN_BADGE(id), updateData)
    result = res.data.data
  }
  if (status !== undefined) {
    const res = await apiClient.patch(ENDPOINTS.ADMIN_BADGE_STATUS(id), {
      status: status === 'DISABLED' ? 'INACTIVE' : status,
    })
    result = res.data.data
  }
  if (!result) throw new Error('Không có thông tin huy hiệu cần cập nhật')
  return result
}

export function useBadges() {
  return useQuery({ queryKey: ['badges'], queryFn: fetchBadges, refetchInterval: 15000 })
}

export function useBadge(id: string) {
  return useQuery({
    queryKey: ['badge', id],
    queryFn: () => fetchBadge(id),
    enabled: !!id,
  })
}

export function useCreateBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBadge,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['badges'] })
      toast.success('Đã tạo huy hiệu')
    },
    onError: (err: Error) => {
      const errorData = isAxiosError<BadgeErrorResponse>(err) ? err.response?.data?.error : undefined;
      const message = errorData?.message || err.message || 'Không thể tạo huy hiệu';
      const details = errorData?.details;

      if (details && Object.keys(details).length > 0) {
        const detailList = Object.entries(details)
          .map(([field, msg]) => `• ${field}: ${msg}`)
          .join('\n');
        toast.error(`${message}\n\n${detailList}`, { duration: 8000 });
      } else {
        toast.error(message);
      }
    },
  })
}

export function useUpdateBadge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BadgeFormData> }) => updateBadge(id, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['badges'] })
      qc.invalidateQueries({ queryKey: ['badge', vars.id] })
      toast.success('Đã cập nhật huy hiệu')
    },
    onError: (err: Error) => {
      const errorMsg = (isAxiosError<BadgeErrorResponse>(err) ? err.response?.data?.error?.message : undefined) || err.message || 'Không thể cập nhật';
      toast.error(errorMsg);
    },
  })
}
