import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { mockAuditLogs } from '@/mocks/audit-logs'
import type { AuditLog, AuditLogListParams } from '@/types'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import { sleep } from '@/lib/utils'

async function fetchAuditLogs(params: AuditLogListParams) {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockAuditLogs]
    if (params.action) result = result.filter((l) => l.action === params.action)
    if (params.entityType) result = result.filter((l) => l.entityType === params.entityType)
    if (params.result) result = result.filter((l) => l.result === params.result)
    // Sort by timestamp desc
    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return { data: result.slice((page - 1) * limit, page * limit), total, page, limit, totalPages: Math.ceil(total / limit) }
  }
  const res = await apiClient.get(ENDPOINTS.ADMIN_AUDIT_LOGS, { params })
  return res.data.data
}

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({ queryKey: ['audit-logs', params], queryFn: () => fetchAuditLogs(params), placeholderData: (p) => p })
}

export function useAuditLogFilters() {
  const [params, setParams] = useState<AuditLogListParams>({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    action: '',
    entityType: '',
    result: '',
  })
  return {
    params,
    setAction: (action: AuditLogListParams['action']) => setParams((p) => ({ ...p, action, page: 1 })),
    setEntityType: (entityType: AuditLogListParams['entityType']) => setParams((p) => ({ ...p, entityType, page: 1 })),
    setResult: (result: AuditLogListParams['result']) => setParams((p) => ({ ...p, result, page: 1 })),
    setPage: (page: number) => setParams((p) => ({ ...p, page })),
  }
}

// Explicit export for types used by the page
export type { AuditLog }
