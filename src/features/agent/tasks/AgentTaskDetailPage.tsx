import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ExternalLink, Clock, User, Tag } from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { AgentStatusBadge, AGENT_STATUS_LABELS } from '@/components/agent/AgentStatusBadge'
import { AgentProgressSteps } from '@/components/agent/AgentStepper'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { getAgentTask } from '@/services/api/agentApi'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'
import type { AgentTaskDetail, AgentTaskLog } from '@/types'

const TASK_TYPE_LABELS: Record<string, string> = {
  PLACE_BUILDER: 'Tạo địa điểm (lịch sử)',
  MAP_BUILDER: 'Tạo bản đồ',
  ASSISTANT: 'Trợ lý AI',
}

function formatMs(ms?: number): string {
  if (!ms) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m === 0) return `${s} giây`
  return `${m} phút ${rem} giây`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

const LOG_LEVEL_CLS: Record<AgentTaskLog['level'], string> = {
  info: 'text-muted-foreground',
  warn: 'text-amber-700',
  error: 'text-red-600 font-medium',
}

export default function AgentTaskDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()

  const { data: task, isLoading, isError, refetch } = useQuery<AgentTaskDetail>({
    queryKey: ['agent-task-detail', jobId],
    queryFn: () => getAgentTask(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => ['QUEUED', 'PROCESSING', 'PUBLISHING'].includes(query.state.data?.status ?? '') ? 5000 : false,
  })

  if (isLoading) return <div className="p-6"><TableSkeleton /></div>
  if (isError || !task) return <ErrorState retry={refetch} />

  const resultRef = task.resultRef
  const isMapTask = task.type === 'MAP_BUILDER'

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => navigate(ROUTES.AGENT_TASKS)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      <PageHeader
        title={task.jobId}
        description={task.name}
        action={
          <div className="flex items-center gap-2">
            <AgentStatusBadge status={task.status} />
            {isMapTask && (
              <button
                onClick={() => {
                  navigate(ROUTES.AGENT_MAP_BUILDER_JOB(task.jobId))
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Mở trang quản lý
              </button>
            )}
          </div>
        }
      />

      {/* Tabs */}
      <Tabs.Root defaultValue="overview">
        <div className="bg-white border border-border rounded-lg shadow-card">
          <Tabs.List className="flex border-b border-border">
            {[
              { value: 'overview', label: 'Tổng quan' },
              { value: 'progress', label: 'Tiến trình' },
              { value: 'result', label: 'Kết quả' },
              { value: 'logs', label: 'Nhật ký (Logs)' },
            ].map(({ value, label }) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className={cn(
                  'px-5 py-3 text-sm font-medium border-b-2 transition-colors outline-none',
                  'data-[state=active]:border-primary data-[state=active]:text-primary',
                  'data-[state=inactive]:border-transparent data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground'
                )}
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* ── Overview ─────────────────────────────────────────────── */}
          <Tabs.Content value="overview" className="p-6 outline-none">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl">
              {[
                { icon: Tag, label: 'Loại tác vụ', value: TASK_TYPE_LABELS[task.type] ?? task.type },
                { icon: Tag, label: 'Tên', value: task.name },
                ...(task.metadata?.region ? [{ icon: Tag, label: 'Khu vực', value: String(task.metadata.region) }] : []),
                ...(task.metadata?.sources ? [{ icon: Tag, label: 'Nguồn dữ liệu', value: String(task.metadata.sources) }] : []),
                { icon: Tag, label: 'Trạng thái', value: AGENT_STATUS_LABELS[task.status as keyof typeof AGENT_STATUS_LABELS] ?? task.status },
                { icon: Clock, label: 'Thời gian thực thi', value: formatMs(task.executionTimeMs) },
                { icon: User, label: 'Người tạo', value: task.createdBy },
                { icon: Clock, label: 'Thời gian tạo', value: formatDate(task.createdAt) },
                ...(task.completedAt
                  ? [{ icon: Clock, label: 'Hoàn thành lúc', value: formatDate(task.completedAt) }]
                  : []
                ),
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">{label}</p>
                    <p className="text-sm text-foreground mt-0.5">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {task.errorMessage && (
              <div className="mt-5 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl">
                <p className="text-sm font-medium text-red-800 mb-1">Thông tin lỗi</p>
                <p className="text-sm text-red-700">{task.errorMessage}</p>
              </div>
            )}
          </Tabs.Content>

          {/* ── Progress ──────────────────────────────────────────────── */}
          <Tabs.Content value="progress" className="p-6 outline-none">
            {task.steps && task.steps.length > 0 ? (
              <div className="max-w-sm">
                <AgentProgressSteps steps={task.steps} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không có dữ liệu tiến trình.</p>
            )}
          </Tabs.Content>

          {/* ── Result ────────────────────────────────────────────────── */}
          <Tabs.Content value="result" className="p-6 outline-none">
            {isMapTask && resultRef ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground">
                  Kết quả tác vụ bản đồ offline.
                </p>
                <div className="bg-muted/40 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Map Job ID</p>
                    <code className="text-sm font-mono text-foreground">{resultRef}</code>
                  </div>
                  <Link
                    to={ROUTES.AGENT_MAP_BUILDER_JOB(task.jobId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary border border-primary/30 rounded-md hover:bg-primary/5"
                  >
                    <ExternalLink className="w-4 h-4" /> Xem kết quả
                  </Link>
                </div>
              </div>
            ) : task.result ? (
              <pre className="text-xs whitespace-pre-wrap break-words bg-muted/40 rounded-lg p-4">{JSON.stringify(task.result, null, 2)}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                {task.status === 'PROCESSING' ? 'Tác vụ đang xử lý...' : 'Không có kết quả.'}
              </p>
            )}
          </Tabs.Content>

          {/* ── Logs ──────────────────────────────────────────────────── */}
          <Tabs.Content value="logs" className="outline-none">
            {task.logs && task.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-40 whitespace-nowrap">
                        Thời gian
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-16">
                        Level
                      </th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">
                        Sự kiện
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {task.logs.map((log, idx) => (
                      <tr key={idx} className="hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                            hour: '2-digit', minute: '2-digit', second: '2-digit',
                          })}
                        </td>
                        <td className={cn('px-4 py-2 uppercase font-semibold', LOG_LEVEL_CLS[log.level])}>
                          {log.level}
                        </td>
                        <td className={cn('px-4 py-2', LOG_LEVEL_CLS[log.level])}>
                          {log.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-muted-foreground">Không có log.</p>
              </div>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  )
}
