import { useUser } from './useUsers'
import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { X, Ban, CheckCircle, Mail, Calendar, MapPin, Navigation, Zap, TrendingUp, ChevronRight } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { UserXpAdjustmentDialog } from './UserXpAdjustmentDialog'
import { formatDateTime, formatNumber, getInitials } from '@/lib/utils'
import { IS_MOCK_MODE } from '@/constants'
import { sleep } from '@/lib/utils'
import { mockUserRankProfiles } from '@/mocks'
import apiClient from '@/services/api/client'
import { ENDPOINTS } from '@/services/api/endpoints'
import type { User, UserRankProfile } from '@/types'

interface UserDetailDrawerProps {
  user: User | null
  onClose: () => void
  onBlock: (user: User) => void
  onUnblock: (user: User) => void
}

const RANK_ICONS: Record<string, string> = {
  NEWBIE: '🌱', HIKER: '🥾', EXPLORER: '🧭', TREKKER: '🏔️',
  PATHFINDER: '🗺️', MOUNTAINEER: '⛰️', ADVENTURER: '🌋',
  ELITE_TREKKER: '🦅', TREK_MASTER: '👑', TREK_LEGEND: '🌟',
}

function useUserRankProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-rank-profile', userId],
    queryFn: async (): Promise<UserRankProfile | null> => {
      if (!userId) return null
      if (IS_MOCK_MODE) {
        await sleep(300)
        return mockUserRankProfiles.find((p) => p.userId === userId) ?? null
      }
      const res = await apiClient.get(ENDPOINTS.ADMIN_USER_RANK_PROFILE(userId))
      return res.data.data
    },
    enabled: !!userId,
    refetchInterval: 30000,
  })
}

export function UserDetailDrawer({ user: initialUser, onClose, onBlock, onUnblock }: UserDetailDrawerProps) {
  const { data: freshUser } = useUser(initialUser?.id ?? '')
  const user = freshUser ?? initialUser
  const [showXpDialog, setShowXpDialog] = useState(false)
  const { data: rankProfile } = useUserRankProfile(user?.id)

  // XP progress to next rank
  const xpProgress = rankProfile && rankProfile.nextRank
    ? Math.max(0, Math.min(100, Math.round(
        (((rankProfile.totalXp - (rankProfile.currentRankMinXp ?? 0)) /
         (rankProfile.nextRank.minXp - (rankProfile.currentRankMinXp ?? 0))) * 100)
      )))
    : 100

  return (
    <>
      <Dialog.Root open={!!user} onOpenChange={(open) => { if (!open) onClose() }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <Dialog.Title className="font-semibold text-foreground">Chi tiết người dùng</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </Dialog.Close>
            </div>

            {user && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Avatar & Name */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={user.status} />
                      <span className="text-xs text-muted-foreground">{user.role}</span>
                    </div>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-foreground">Tham gia: {formatDateTime(user.createdAt)}</span>
                  </div>
                  {user.lastLoginAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-foreground">Đăng nhập cuối: {formatDateTime(user.lastLoginAt)}</span>
                    </div>
                  )}
                </div>

                {/* Trekking stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox icon={Navigation} label="Hành trình" value={user.totalJourneys ?? '—'} />
                  <StatBox icon={MapPin} label="Check-in" value={user.totalCheckins ?? '—'} />
                  <StatBox icon={MapPin} label="Đóng góp" value={user.totalContributions ?? '—'} />
                </div>

                {/* ── Trek XP & Rank section ── */}
                {rankProfile ? (
                  <div className="rounded-lg border border-border overflow-hidden">
                    {/* Rank header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {RANK_ICONS[rankProfile.currentRankCode] ?? '🏅'}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{rankProfile.currentRankName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{rankProfile.currentRankCode} · Lv.{rankProfile.currentRankLevel}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{formatNumber(rankProfile.totalXp)}</p>
                        <p className="text-xs text-muted-foreground">Trek XP</p>
                      </div>
                    </div>

                    {/* XP Progress bar */}
                    {rankProfile.nextRank && (
                      <div className="px-4 py-2 bg-muted/20 border-b border-border">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Tiến độ lên <strong className="text-foreground">{rankProfile.nextRank.name}</strong></span>
                          <span>{formatNumber(rankProfile.totalXp)} / {formatNumber(rankProfile.nextRank.minXp)} XP</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${xpProgress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-border">
                      <MiniStat label="Hành trình HT" value={rankProfile.completedJourneyCount} />
                      <MiniStat label="Tỉnh đã ghé" value={rankProfile.visitedProvinceCount} />
                      <MiniStat label="Check-in xác minh" value={rankProfile.verifiedCheckinCount} />
                      <MiniStat label="Huy hiệu" value={rankProfile.badgeCount} />
                      <MiniStat label="Đóng góp duyệt" value={rankProfile.approvedContributionCount} />
                      <MiniStat
                        label="Quãng đường"
                        value={`${(rankProfile.totalDistanceMeters / 1000).toFixed(1)} km`}
                        raw
                      />
                    </div>
                  </div>
                ) : (
                  user.role === 'USER' && (
                    <div className="rounded-lg border border-border px-4 py-3 bg-muted/20 text-sm text-muted-foreground flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      <span>Đang tải thông tin rank...</span>
                    </div>
                  )
                )}

                {/* XP Adjustment shortcut */}
                {user.role === 'USER' && (
                  <button
                    onClick={() => setShowXpDialog(true)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted/30 transition-colors text-sm"
                  >
                    <span className="flex items-center gap-2 font-medium text-foreground">
                      <Zap className="w-4 h-4 text-warning" />
                      Điều chỉnh Trek XP thủ công
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}

                {user.bio && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Giới thiệu</p>
                    <p className="text-sm text-foreground">{user.bio}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            {user && user.role !== 'ADMIN' && (
              <div className="px-5 py-4 border-t border-border flex gap-3">
                {user.status !== 'BLOCKED' ? (
                  <button
                    onClick={() => { onBlock(user); onClose() }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md transition-colors"
                  >
                    <Ban className="w-4 h-4" /> Khóa tài khoản
                  </button>
                ) : (
                  <button
                    onClick={() => { onUnblock(user); onClose() }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-success hover:bg-success/90 rounded-md transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Mở khóa
                  </button>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* XP Adjustment dialog */}
      <UserXpAdjustmentDialog
        user={showXpDialog ? user : null}
        onClose={() => setShowXpDialog(false)}
      />
    </>
  )
}

function StatBox({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <p className="text-lg font-bold">{typeof value === 'number' ? formatNumber(value) : value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function MiniStat({ label, value, raw }: { label: string; value: number | string; raw?: boolean }) {
  return (
    <div className="px-3 py-2.5 text-center">
      <p className="text-sm font-semibold text-foreground">
        {raw ? value : formatNumber(value as number)}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
