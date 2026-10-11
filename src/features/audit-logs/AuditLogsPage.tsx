import { PageHeader } from '@/components/common/PageHeader'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import type { AuditLog } from '@/types'
import { useAuditLogs, useAuditLogFilters } from './useAuditLogs'
import { formatDateTime } from '@/lib/utils'

const ACTION_OPTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'BLOCK', 'UNBLOCK',
  'APPROVE', 'REJECT', 'HIDE', 'PUBLISH', 'DISABLE', 'LOGIN', 'LOGOUT',
]

const ENTITY_OPTIONS = [
  'USER', 'PLACE', 'ROUTE', 'MILESTONE', 'CONTRIBUTION',
  'POST', 'COMMENT', 'REVIEW', 'BADGE', 'OFFLINE_MAP',
]

export default function AuditLogsPage() {
  const { params, setAction, setEntityType, setResult, setPage } = useAuditLogFilters()
  const { data, isLoading, isError, refetch } = useAuditLogs(params)

  return (
    <div>
      <PageHeader
        title="Nhật ký hệ thống"
        description="Theo dõi lịch sử thao tác của Admin trên hệ thống"
      />

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={params.action ?? ''}
          onChange={(e) => setAction(e.target.value as never)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none"
        >
          <option value="">Tất cả hành động</option>
          {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={params.entityType ?? ''}
          onChange={(e) => setEntityType(e.target.value as never)}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none"
        >
          <option value="">Tất cả loại entity</option>
          {ENTITY_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={params.result ?? ''}
          onChange={(e) => setResult(e.target.value as 'SUCCESS' | 'FAILURE' | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none"
        >
          <option value="">Tất cả kết quả</option>
          <option value="SUCCESS">Thành công</option>
          <option value="FAILURE">Thất bại</option>
        </select>
      </div>

      <div className="data-table-container">
        {isLoading ? <div className="p-5"><TableSkeleton /></div>
          : isError ? <ErrorState retry={refetch} />
          : !data?.data?.length ? <EmptyState title="Không có nhật ký" />
          : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thời gian</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Admin</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Hành động</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Entity Type</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Entity ID</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tóm tắt</th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.data.map((log: AuditLog) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-foreground">{log.adminName}</p>
                          <p className="text-xs text-muted-foreground">{log.adminEmail}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.entityType}</td>
                        <td className="px-4 py-3">
                          <code className="text-xs font-mono text-muted-foreground">{log.entityId}</code>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          {log.afterSummary && (
                            <p className="text-xs text-muted-foreground truncate">
                              {Object.entries(log.afterSummary)
                                .filter(([k]) => !['passwordHash', 'token', 'secret'].includes(k))
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={log.result} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={data.page} totalPages={data.totalPages}
                total={data.total} limit={data.limit} onPageChange={setPage}
              />
            </>
          )}
      </div>
    </div>
  )
}
