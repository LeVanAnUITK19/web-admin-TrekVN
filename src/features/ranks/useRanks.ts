import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { IS_MOCK_MODE } from '@/constants'
import { sleep } from '@/lib/utils'
import { mockRankDefinitions } from '@/mocks'
import type { RankDefinition, RankDefinitionFormData } from '@/types'

// ─── Fetch list ───────────────────────────────────────────────────────────────
export function useRankDefinitions() {
  return useQuery({
    queryKey: ['rank-definitions'],
    queryFn: async (): Promise<RankDefinition[]> => {
      if (IS_MOCK_MODE) {
        await sleep(400)
        return [...mockRankDefinitions].sort((a, b) => a.level - b.level)
      }
      const res = await apiClient.get(ENDPOINTS.ADMIN_RANKS)
      return res.data.data
    },
  })
}

// ─── Update (toggle status or edit fields) ────────────────────────────────────
export function useUpdateRankDefinition() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<RankDefinitionFormData>
    }): Promise<RankDefinition> => {
      if (IS_MOCK_MODE) {
        await sleep(300)
        const rank = mockRankDefinitions.find((r) => r.id === id)
        if (!rank) throw new Error('Không tìm thấy rank')
        return { ...rank, ...data, updatedAt: new Date().toISOString() }
      }
      const res = await apiClient.patch(ENDPOINTS.ADMIN_RANK(id), data)
      return res.data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rank-definitions'] })
      toast.success('Đã cập nhật cấp rank')
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })
}
