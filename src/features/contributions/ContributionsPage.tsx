import { useState } from 'react'
import { RefreshCw, Flag } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { PageHeader } from '@/components/common/PageHeader'
import { ContributionDetail } from './ContributionDetail'
import { useContributions, useContributionFilters } from './useContributions'
import { CONTRIBUTION_TYPE_LABELS } from '@/constants'
import { formatRelativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Contribution, ContributionType, ContributionStatus } from '@/types'

const STATUS_TABS: { label: string; value: ContributionStatus | '' }[] = [
  { label: 'Tất cả', value: '' },
  { label: 'Chờ duyệt', value: 'PENDING_REVIEW' },
  { label: 'Đã duyệt', value: 'APPROVED' },
  { label: 'Từ chối', value: 'REJECTED' },
  { label: 'Cần sửa', value: 'NEEDS_REVISION' },
]

export default function ContributionsPage() {
  const { params, setSearch, setType, setStatus, setPage } = useContributionFilters()
  const { data, isLoading, isError, isFetching, refetch } = useContributions(params)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleReviewed = () => {
    refetch()
    // Keep selection to show updated status
  }

  return (
    <div>
      <PageHeader
        title="Duyệt đóng góp từ người dùng"
        description="Duyệt cung đường, cột mốc đính kèm và địa điểm người dùng gửi từ app"
        action={<button onClick={() => refetch()} disabled={isFetching} className="flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm disabled:opacity-50"><RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />Làm mới</button>}
      />
      <div className="mb-4 rounded-lg border border-border bg-white px-4 py-3 text-sm">
        <span className="font-semibold">{data?.total ?? '—'} đóng góp</span>
        <span className="ml-3 text-muted-foreground">Tự cập nhật mỗi 15 giây. Cột mốc đính kèm nằm trong chi tiết cung đường.</span>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 h-[calc(100vh-200px)]">
        {/* Left: List */}
        <div className="flex flex-col w-full xl:w-1/2 min-h-0">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <SearchInput
              value={params.search ?? ''}
              onChange={setSearch}
              placeholder="Tìm kiếm đóng góp..."
              className="w-56"
            />
            <select
              value={params.contributionKind === 'MARKERS' ? 'MARKERS' : params.type ?? ''}
              onChange={(e) => e.target.value === 'MARKERS' ? setType('ROUTE_SUBMISSION', 'MARKERS') : setType(e.target.value as ContributionType | '', e.target.value === 'ROUTE_SUBMISSION' ? 'ROUTE' : '')}
              className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Tất cả loại</option>
              <option value="ROUTE_SUBMISSION">Đề xuất cung đường</option>
              <option value="MARKERS">Đóng góp cột mốc</option>
              <option value="PLACE_SUGGESTION">Gợi ý địa điểm</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex gap-1 mb-3 border-b border-border overflow-x-auto shrink-0">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  'px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
                  params.status === tab.value
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="data-table-container flex-1 overflow-hidden flex flex-col">
            {isLoading ? (
              <div className="p-5"><TableSkeleton rows={4} /></div>
            ) : isError ? (
              <ErrorState retry={refetch} />
            ) : !data?.data?.length ? (
              <EmptyState title="Chưa có đóng góp phù hợp" description="Chỉ hiển thị dữ liệu người dùng đã gửi tới server. Thử chọn Tất cả hoặc làm mới danh sách." />
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-border">
                  {data.data.map((item: Contribution) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={cn(
                        'w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors',
                        selectedId === item.id && 'bg-primary/5 border-l-2 border-l-primary'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.routeSubmission?.suggestedName ?? item.placeSuggestion?.suggestedName ?? `#${item.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.routeSubmission?.contributionKind === 'MARKERS' ? 'Đóng góp cột mốc' : CONTRIBUTION_TYPE_LABELS[item.type] ?? item.type} • {item.contributor.name}
                          </p>
                          {item.routeSubmission && <p className="mt-2 flex items-center gap-1 text-xs text-primary"><Flag className="h-3 w-3" />{item.routeSubmission.markerCount ?? 0} cột mốc đính kèm{item.routeSubmission.distance ? ` · ${item.routeSubmission.distance.toFixed(1)} km` : ''}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <StatusBadge status={item.status} />
                          <span className="text-xs text-muted-foreground">{formatRelativeTime(item.submittedAt)}</span>
                        </div>
                      </div>
                    </button>
                  ))}
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
        </div>

        {/* Right: Detail Panel */}
        {selectedId && (
          <div className="xl:flex-1 bg-white rounded-lg border border-border shadow-card overflow-hidden flex flex-col">
            <ContributionDetail
              contributionId={selectedId}
              onReviewed={handleReviewed}
            />
          </div>
        )}

        {!selectedId && (
          <div className="hidden xl:flex xl:flex-1 bg-white rounded-lg border border-border items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">Chọn một đóng góp để xem chi tiết</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
