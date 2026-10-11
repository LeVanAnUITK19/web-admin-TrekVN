import { useQuery } from '@tanstack/react-query'
import { IS_MOCK_MODE } from '@/constants'
import { mockDashboardData } from '@/mocks/dashboard'
import type { DashboardData } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'

async function fetchDashboard(range: string = '7d'): Promise<DashboardData> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    return mockDashboardData
  }
  const res = await apiClient.get<{ data: DashboardData }>(
    `${ENDPOINTS.ADMIN_DASHBOARD}?range=${range}`
  )
  return res.data.data
}

export function useDashboard(range: string = '7d') {
  return useQuery({
    queryKey: ['dashboard', range],
    queryFn: () => fetchDashboard(range),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
