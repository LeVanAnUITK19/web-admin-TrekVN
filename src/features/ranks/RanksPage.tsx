import { RankIcon } from '@/components/common/RankIcon'
import { useState } from 'react'
import { Pencil, TrendingUp, Lock, CheckCircle2, Info } from 'lucide-react'
import { PageHeader } from '@/components/common/PageHeader'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { RankEditDialog } from './RankEditDialog'
import { useRankDefinitions, useUpdateRankDefinition } from './useRanks'
import { formatNumber, cn } from '@/lib/utils'
import type { RankDefinition } from '@/types'

// ─── Display helpers ──────────────────────────────────────────────────────────


// Color gradient per level
const LEVEL_COLORS: Record<number, { bg: string; text: string; border: string; ring: string }> = {
  1:  { bg: 'bg-gray-50',    text: 'text-gray-600',   border: 'border-gray-200',  ring: 'ring-gray-300' },
  2:  { bg: 'bg-green-50',   text: 'text-green-700',  border: 'border-green-200', ring: 'ring-green-300' },
  3:  { bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200',  ring: 'ring-teal-300' },
  4:  { bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',  ring: 'ring-blue-300' },
  5:  { bg: 'bg-indigo-50',  text: 'text-indigo-700', border: 'border-indigo-200',ring: 'ring-indigo-300' },
  6:  { bg: 'bg-violet-50',  text: 'text-violet-700', border: 'border-violet-200',ring: 'ring-violet-300' },
  7:  { bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200',ring: 'ring-purple-300' },
  8:  { bg: 'bg-pink-50',    text: 'text-pink-700',   border: 'border-pink-200',  ring: 'ring-pink-300' },
  9:  { bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200',  ring: 'ring-rose-300' },
  10: { bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', ring: 'ring-amber-300' },
}

function ConditionBadge({ label, value, icon }: { label: string; value: number; icon: string }) {
  if (value === 0) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-white border border-border rounded-full px-2 py-0.5 text-muted-foreground">
      <span>{icon}</span>
      <span className="font-medium text-foreground">≥{formatNumber(value)}</span>
      <span>{label}</span>
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RanksPage() {
  const { data, isLoading, isError, refetch } = useRankDefinitions()
  const updateMutation = useUpdateRankDefinition()
  const [editTarget, setEditTarget] = useState<RankDefinition | null>(null)

  return (
    <div>
      <PageHeader
        title="Quản lý cấp rank"
        description="Cấu hình 10 cấp Trek XP và điều kiện thăng hạng"
      />

      {/* XP info banner */}
      <div className="mb-5 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex items-start gap-2">
        <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span className="font-semibold">Nguồn XP:</span>
          <span>Hành trình hoàn thành <strong>+150</strong></span>
          <span>1 km <strong>+5</strong></span>
          <span>100m độ cao <strong>+10</strong></span>
          <span>Check-in SUMMIT <strong>+50</strong></span>
          <span>Tỉnh mới <strong>+100</strong></span>
          <span>Địa điểm mới <strong>+50</strong></span>
          <span>Route duyệt <strong>+300</strong></span>
          <span>Place duyệt <strong>+200</strong></span>
        </div>
      </div>

      {/* Note */}
      <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-start gap-2">
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Lưu ý:</strong> Code và Level của mỗi rank không thể thay đổi sau khi khởi tạo (BR-40).
          Chỉnh sửa ngưỡng điều kiện có thể kích hoạt tính lại rank cho toàn bộ người dùng.
        </span>
      </div>

      {isLoading ? (
        <div className="p-5 bg-white rounded-lg border border-border">
          <TableSkeleton rows={10} />
        </div>
      ) : isError ? (
        <ErrorState retry={refetch} />
      ) : (
        <div className="space-y-3">
          {data?.map((rank) => {
            const colors = LEVEL_COLORS[rank.level] ?? LEVEL_COLORS[1]
            const isNewbie = rank.code === 'NEWBIE'

            return (
              <div
                key={rank.id}
                className={cn(
                  'bg-white rounded-lg border transition-all',
                  rank.status === 'INACTIVE' ? 'border-border opacity-60' : 'border-border hover:border-primary/30 hover:shadow-sm',
                )}
              >
                <div className="flex items-start gap-4 p-4">

                  {/* Level badge + icon */}
                  <div className={cn(
                    'flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center border',
                    colors.bg, colors.border,
                  )}>
                    <span className="text-2xl leading-none"><RankIcon code={rank.code} iconUrl={rank.iconUrl} /></span>
                    <span className={cn('text-xs font-bold mt-0.5', colors.text)}>Lv.{rank.level}</span>
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{rank.name}</h3>
                      <span className={cn(
                        'text-xs font-mono px-1.5 py-0.5 rounded font-medium',
                        colors.bg, colors.text, colors.border, 'border',
                      )}>
                        {rank.code}
                      </span>
                      {isNewbie && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3" /> Mặc định
                        </span>
                      )}
                      {rank.status === 'INACTIVE' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Đã tắt</span>
                      )}
                    </div>

                    {rank.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rank.description}</p>
                    )}

                    {/* Conditions row */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-1',
                        colors.bg, colors.text, colors.border, 'border',
                      )}>
                        ✨ {rank.minXp === 0 ? 'Bắt đầu' : `≥${formatNumber(rank.minXp)} XP`}
                      </span>
                      <ConditionBadge label="hành trình" value={rank.minCompletedJourneys} icon="🥾" />
                      <ConditionBadge label="tỉnh thành" value={rank.minVisitedProvinces} icon="🗺️" />
                      <ConditionBadge label="huy hiệu" value={rank.minBadgeCount} icon="🏅" />
                      {rank.minApprovedContributions > 0 && (
                        <ConditionBadge label="đóng góp duyệt" value={rank.minApprovedContributions} icon="✅" />
                      )}
                      {rank.minDistanceMeters > 0 && (
                        <ConditionBadge label="km" value={Math.round(rank.minDistanceMeters / 1000)} icon="📏" />
                      )}
                    </div>
                  </div>

                  {/* Right: toggle + edit */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Status toggle */}
                    {!isNewbie ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {rank.status === 'ACTIVE' ? 'Hoạt động' : 'Tắt'}
                        </span>
                        <button
                          onClick={() =>
                            updateMutation.mutate({
                              id: rank.id,
                              data: { status: rank.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
                            })
                          }
                          disabled={updateMutation.isPending}
                          aria-label="Bật/tắt rank"
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors flex items-center px-0.5 disabled:opacity-50',
                            rank.status === 'ACTIVE' ? 'bg-success' : 'bg-gray-300',
                          )}
                        >
                          <span className={cn(
                            'w-4 h-4 bg-white rounded-full shadow transition-transform',
                            rank.status === 'ACTIVE' ? 'translate-x-5' : 'translate-x-0',
                          )} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <span className="hidden sm:block">Hoạt động</span>
                      </div>
                    )}

                    {/* Edit button */}
                    <button
                      onClick={() => setEditTarget(rank)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-muted hover:border-primary/40 transition-colors"
                      title="Chỉnh sửa"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden sm:block">Chỉnh sửa</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <RankEditDialog rank={editTarget} onClose={() => setEditTarget(null)} />
    </div>
  )
}
