import { useNavigate } from 'react-router-dom'
import {
  Plus, MoreHorizontal, Eye,
  MapPin, Map, Calendar, ChevronDown,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Tabs from '@radix-ui/react-tabs'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { Pagination } from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { AgentStatusBadge, AGENT_STATUS_LABELS } from '@/components/agent/AgentStatusBadge'
import { ROUTES } from '@/constants'
import { useAgentTasks, useAgentTaskFilters, useAgentTaskCounts } from './useAgentTasks'
import { cn } from '@/lib/utils'
import type { AgentTask, AgentTaskType, AgentTaskStatus } from '@/types'

const TASK_TYPE_LABELS: Record<AgentTaskType, string> = {
  PLACE_BUILDER: 'Tạo địa điểm (lịch sử)',
  MAP_BUILDER: 'Tạo bản đồ',
  ASSISTANT: 'Trợ lý AI',
}

const ALL_STATUSES: AgentTaskStatus[] = [
  'QUEUED', 'PROCESSING', 'PENDING_REVIEW', 'APPROVED',
  'REJECTED', 'PUBLISHING', 'PUBLISHED', 'SUCCESS', 'FAILED', 'CANCELLED',
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function AgentTasksPage() {
  const navigate = useNavigate()
  const { params, setSearch, setType, setStatus, setFrom, setTo, setPage } = useAgentTaskFilters()

  const activeTab = params.type || 'all'

  // Fetch dynamic tab counts
  const counts = useAgentTaskCounts()

  const TAB_CONFIG: { value: string; label: string; count: number; type?: AgentTaskType }[] = [
    { value: 'all', label: 'Tất cả', count: counts.all },
    { value: 'PLACE_BUILDER', label: 'Tạo địa điểm', count: counts.PLACE_BUILDER, type: 'PLACE_BUILDER' },
    { value: 'MAP_BUILDER', label: 'Tạo bản đồ', count: counts.MAP_BUILDER, type: 'MAP_BUILDER' },
    { value: 'ASSISTANT', label: 'Trợ lý AI', count: counts.ASSISTANT, type: 'ASSISTANT' },
  ]

  // Sync tab → type filter
  const handleTabChange = (tab: string) => {
    const cfg = TAB_CONFIG.find((t) => t.value === tab)
    setType(cfg?.type ?? '')
  }

  const { data, isLoading, isError, refetch } = useAgentTasks(params)

  const inputCls = 'px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

  return (
    <div>
      <PageHeader
        title="Tác vụ Agent"
        description="Quản lý và theo dõi tất cả tác vụ của AI Agent"
        action={<CreateTaskButton navigate={navigate} />}
      />

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
        <div className="bg-white rounded-lg border border-border shadow-card mb-4">
          <Tabs.List className="flex border-b border-border overflow-x-auto">
            {TAB_CONFIG.map((tab) => (
              <Tabs.Trigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap outline-none',
                  activeTab === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span className={cn(
                  'text-xs rounded-full px-2 py-0.5 font-medium',
                  activeTab === tab.value
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* Filters */}
          <div className="p-4 flex flex-wrap gap-3">
            <SearchInput
              value={params.search ?? ''}
              onChange={setSearch}
              placeholder="Tìm theo tên, ID, mô tả..."
              className="w-64"
            />
            <select
              value={params.type ?? ''}
              onChange={(e) => setType(e.target.value as AgentTaskType | '')}
              className={inputCls}
            >
              <option value="">Loại tác vụ: Tất cả</option>
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={params.status ?? ''}
              onChange={(e) => setStatus(e.target.value as AgentTaskStatus | '')}
              className={inputCls}
            >
              <option value="">Trạng thái: Tất cả</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{AGENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {/* Date range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="date"
                value={params.from ?? ''}
                onChange={(e) => setFrom(e.target.value)}
                className={inputCls}
                title="Từ ngày"
              />
              <span className="text-muted-foreground text-sm">–</span>
              <input
                type="date"
                value={params.to ?? ''}
                onChange={(e) => setTo(e.target.value)}
                className={inputCls}
                title="Đến ngày"
              />
            </div>
          </div>
        </div>

        {/* Table for all tabs */}
        {TAB_CONFIG.map((tab) => (
          <Tabs.Content key={tab.value} value={tab.value} className="outline-none">
            <div className="data-table-container">
              {isLoading ? (
                <div className="p-5"><TableSkeleton /></div>
              ) : isError ? (
                <ErrorState retry={refetch} />
              ) : !data?.data?.length ? (
                <EmptyState title="Chưa có tác vụ Agent" description="Tạo tác vụ mới để bắt đầu." />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8">#</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">ID</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Loại tác vụ</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Tên / Mô tả</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Người tạo</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Đã tạo</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {data.data.map((task: AgentTask, idx: number) => (
                          <AgentTaskRow
                            key={task.id}
                            task={task}
                            index={(params.page! - 1) * params.limit! + idx + 1}
                            onView={() => navigate(ROUTES.AGENT_TASKS_DETAIL(task.id))}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination
                    page={data.page}
                    totalPages={data.totalPages}
                    total={data.total}
                    limit={data.limit}
                    onPageChange={setPage}
                  />
                </>
              )}
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </div>
  )
}

// ── Row ───────────────────────────────────────────────────────────────────────

function AgentTaskRow({
  task,
  index,
  onView,
}: {
  task: AgentTask
  index: number
  onView: () => void
}) {
  const typeLabel = TASK_TYPE_LABELS[task.type] ?? task.type
  const TypeIcon = task.type === 'MAP_BUILDER' ? Map : undefined

  return (
    <tr className="hover:bg-muted/20 transition-colors">
      <td className="px-4 py-3 text-muted-foreground text-xs">{index}</td>
      <td className="px-4 py-3">
        <button
          onClick={onView}
          className="text-xs font-mono font-medium text-primary hover:underline"
        >
          {task.jobId}
        </button>
      </td>
      <td className="px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {TypeIcon && <TypeIcon className="w-3.5 h-3.5 flex-shrink-0" />}
          {typeLabel}
        </span>
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="font-medium text-foreground text-sm truncate">{task.name}</p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs text-muted-foreground">{task.createdBy}</span>
      </td>
      <td className="px-4 py-3">
        <AgentStatusBadge status={task.status} />
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
        {formatDate(task.createdAt)}
      </td>
      <td className="px-4 py-3">
        <TaskRowMenu task={task} onView={onView} />
      </td>
    </tr>
  )
}

// ── Row dropdown menu ─────────────────────────────────────────────────────────

function TaskRowMenu({ task, onView }: { task: AgentTask; onView: () => void }) {
  const navigate = useNavigate()
  const canOpenManage = task.type === 'MAP_BUILDER'

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button aria-label={`Thao tác của ${task.jobId}`} className="p-1.5 rounded hover:bg-muted">
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 min-w-44 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none"
            onSelect={onView}
          >
            <Eye className="w-4 h-4" /> Xem chi tiết
          </DropdownMenu.Item>
          {canOpenManage && (
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none text-muted-foreground"
              onSelect={() => navigate(ROUTES.AGENT_MAP_BUILDER_JOB(task.jobId))}
            >
              <MapPin className="w-4 h-4" /> Mở trang quản lý
            </DropdownMenu.Item>
          )}

        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ── Create task dropdown button ────────────────────────────────────────────────

function CreateTaskButton({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors">
          <Plus className="w-4 h-4" />
          Tạo tác vụ mới
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
        >
          <DropdownMenu.Item
            className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted outline-none"
            onSelect={() => navigate(ROUTES.AGENT_MAP_BUILDER)}
          >
            <Map className="w-4 h-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">Tạo bản đồ</p>
              <p className="text-xs text-muted-foreground">Build bản đồ offline từ OSM</p>
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
