import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, Navigation, MapPin, MessageSquare,
  CheckCircle2, Star, Award, TrendingUp
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { StatCard } from '@/components/common/StatCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { StatCardSkeleton, Skeleton } from '@/components/feedback/LoadingSkeleton'
import { ErrorState } from '@/components/feedback/ErrorState'
import { useDashboard } from './useDashboard'
import { ROUTES, CONTRIBUTION_TYPE_LABELS, RANK_CODE_LABELS, BADGE_RARITY_LABELS } from '@/constants'
import { formatRelativeTime, formatNumber, cn } from '@/lib/utils'

const PIE_COLORS = ['#287557', '#E7AD65', '#EF4444', '#64748B']

const RANGE_OPTIONS = [
  { value: '7d', label: '7 ngày qua' },
  { value: '30d', label: '30 ngày qua' },
  { value: '90d', label: '90 ngày qua' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [selectedRange, setSelectedRange] = useState('7d')
  const { data, isLoading, isError, refetch } = useDashboard(selectedRange)

  return (
    <div className="space-y-6">
      {!!data?.unavailableServices?.length && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Chưa lấy được dữ liệu từ: {data.unavailableServices.join(', ')}. Các chỉ số liên quan hiển thị —.
        </p>
      )}
      {/* Header with nature background */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark p-6 text-white shadow-card">
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Tổng quan hệ thống</h1>
              <p className="text-primary-light/90">
                Thống kê tổng quan và dữ liệu hoạt động TrekViệt
              </p>
            </div>
            <div className="text-sm text-primary-light/80">
              <div className="text-right">
                <div className="font-medium">Nhóm phát triển nhân AI</div>
                <div>Lấm tủm làm việc cùng nhau</div>
              </div>
            </div>
          </div>
        </div>
        {/* Decorative mountain silhouette */}
        <div className="absolute bottom-0 right-0 opacity-10">
          <svg width="400" height="120" viewBox="0 0 400 120" fill="currentColor">
            <path d="M0 120 L0 60 L100 20 L200 80 L300 30 L400 90 L400 120 Z" />
          </svg>
        </div>
      </div>

      {/* 8 KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : isError ? (
          <div className="col-span-full">
            <ErrorState retry={() => refetch()} description="Không thể tải thống kê dashboard" />
          </div>
        ) : data ? (
          <>
            <StatCard
              title="Người dùng"
              value={data.stats.totalUsers}
              icon={Users}
              iconColor="text-blue-600"
              iconBg="bg-blue-100"
              trend={data.stats.userGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.USERS)}
            />
            <StatCard
              title="Tổng Journey"
              value={data.stats.totalJourneys ?? '—'}
              icon={Navigation}
              iconColor="text-green-600"
              iconBg="bg-green-100"
              trend={data.stats.journeyGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.JOURNEYS)}
            />
            <StatCard
              title="Địa điểm"
              value={data.stats.totalPlaces ?? '—'}
              icon={MapPin}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              trend={data.stats.placeGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.TREKKING_PLACES)}
            />
            <StatCard
              title="Bài viết"
              value={data.stats.totalPosts ?? '—'}
              icon={MessageSquare}
              iconColor="text-pink-600"
              iconBg="bg-pink-100"
              trend={data.stats.postGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.COMMUNITY)}
            />
            <StatCard
              title="Check-in"
              value={data.stats.totalCheckins ?? '—'}
              icon={CheckCircle2}
              iconColor="text-teal-600"
              iconBg="bg-teal-100"
              trend={data.stats.checkinGrowthPercent}
              trendLabel="so với kỳ trước"
            />
            <StatCard
              title="Đóng góp chờ duyệt"
              value={data.stats.pendingContributions ?? '—'}
              icon={Star}
              iconColor="text-amber-600"
              iconBg="bg-amber-100"
              trend={data.stats.contributionGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.CONTRIBUTIONS)}
            />
            <StatCard
              title="Huy hiệu"
              value={data.stats.totalBadgeTypes ?? '—'}
              icon={Award}
              iconColor="text-orange-600"
              iconBg="bg-orange-100"
              trend={data.stats.badgeGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.BADGES)}
            />
            <StatCard
              title="Rank"
              value={data.stats.totalRanks}
              icon={TrendingUp}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-100"
              trend={data.stats.rankGrowthPercent}
              trendLabel="so với kỳ trước"
              onClick={() => navigate(ROUTES.RANKS)}
            />
          </>
        ) : null}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity Area Chart */}
        <div className="xl:col-span-2 bg-white rounded-lg border border-border p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Hoạt động người dùng</h3>
            <div className="flex gap-2">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedRange(option.value)}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded transition-colors',
                    selectedRange === option.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError ? (
            <ErrorState description="Không thể tải biểu đồ" className="py-8" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data?.activityChart ?? []}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#287557" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#287557" stopOpacity={0.06}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => {
                    const date = new Date(v)
                    return `${date.getDate()}/${date.getMonth() + 1}`
                  }}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      users: 'Người dùng mới',
                      checkins: 'Check-in',
                      journeys: 'Hành trình'
                    }
                    return [formatNumber(value as number), labels[name as string] ?? name]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#287557"
                  strokeWidth={2.5}
                  dot={false}
                  fill="url(#colorUsers)"
                  fillOpacity={1}
                  baseValue={0}
                />
                <Area type="monotone" dataKey="checkins" stroke="#0d9488" fill="#0d9488" fillOpacity={0.08} dot={false} />
                <Area type="monotone" dataKey="journeys" stroke="#6366f1" fill="#6366f1" fillOpacity={0.08} dot={false} />
                <Legend formatter={(value) => ({ users: 'Người dùng mới', checkins: 'Check-in', journeys: 'Hành trình' } as Record<string, string>)[value] ?? value} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Contribution Ratio Donut */}
        <div className="bg-white rounded-lg border border-border p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Tỷ lệ đóng góp</h3>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : isError || !data?.contributionRatio ? (
            <ErrorState description="Không thể tải biểu đồ" className="py-8" />
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Đã duyệt', value: data?.contributionRatio?.approved ?? 0 },
                      { name: 'Chờ duyệt', value: data?.contributionRatio?.pending ?? 0 },
                      { name: 'Từ chối', value: data?.contributionRatio?.rejected ?? 0 },
                      { name: 'Cần sửa', value: data?.contributionRatio?.needsRevision ?? 0 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {PIE_COLORS.map((color, i) => (
                      <Cell key={i} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center mt-2">
                <p className="text-3xl font-bold text-foreground">
                  {(data?.contributionRatio?.approved ?? 0) +
                    (data?.contributionRatio?.pending ?? 0) +
                    (data?.contributionRatio?.rejected ?? 0) +
                    (data?.contributionRatio?.needsRevision ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">Tổng đóng góp</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3 Widget Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top Rank Widget */}
        <div className="bg-white rounded-lg border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Top rank nổi bật</h3>
            <button
              onClick={() => navigate(ROUTES.USERS)}
              className="text-xs text-primary hover:underline"
            >
              Xem tất cả →
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <ErrorState description="Không thể tải dữ liệu" className="py-8" />
          ) : (
            <div className="divide-y divide-border">
              {data?.leaderboard.map((user, idx) => (
                <div key={user.userId} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      idx === 0 ? "bg-amber-100 text-amber-600" :
                      idx === 1 ? "bg-gray-100 text-gray-600" :
                      idx === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {RANK_CODE_LABELS[user.rankCode] || user.rankName} • {formatNumber(user.totalXp)} XP
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {user.badgeCount} huy hiệu
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Badges Widget */}
        <div className="bg-white rounded-lg border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Huy hiệu mới mở</h3>
            <button
              onClick={() => navigate(ROUTES.BADGES)}
              className="text-xs text-primary hover:underline"
            >
              Xem tất cả →
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <ErrorState description="Không thể tải dữ liệu" className="py-8" />
          ) : (
            <div className="divide-y divide-border">
              {data?.recentBadges.map((badge) => (
                <div key={badge.awardId ?? `${badge.badgeId}:${badge.userName}:${badge.earnedAt}`} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{badge.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{badge.userName}</span>
                        <span>•</span>
                        <span className={cn(
                          "font-medium",
                          badge.rarity === 'LEGENDARY' ? 'text-amber-600' :
                          badge.rarity === 'EPIC' ? 'text-purple-600' :
                          badge.rarity === 'RARE' ? 'text-blue-600' :
                          'text-gray-600'
                        )}>
                          {BADGE_RARITY_LABELS[badge.rarity] || badge.rarity}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeTime(badge.earnedAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Users Widget */}
        <div className="bg-white rounded-lg border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Người dùng hoạt động</h3>
            <button
              onClick={() => navigate(ROUTES.USERS)}
              className="text-xs text-primary hover:underline"
            >
              Xem tất cả →
            </button>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : isError ? (
            <ErrorState description="Không thể tải dữ liệu" className="py-8" />
          ) : (
            <div className="divide-y divide-border">
              {data?.activeUsers.map((user) => (
                <div key={user.userId} className="px-5 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Hoạt động {formatRelativeTime(user.lastActive)}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Contributions Table */}
      <div className="bg-white rounded-lg border border-border shadow-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Đóng góp mới nhất</h3>
          <button
            onClick={() => navigate(ROUTES.CONTRIBUTIONS)}
            className="text-xs text-primary hover:underline"
          >
            Xem tất cả →
          </button>
        </div>
        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : isError ? (
          <ErrorState description="Không thể tải danh sách đóng góp" className="py-8" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Mã</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Tiêu đề</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Người đóng góp</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Ngày gửi</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data?.recentContributions?.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground font-mono text-xs">#{item.id.slice(0, 6)}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-foreground truncate max-w-xs">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{CONTRIBUTION_TYPE_LABELS[item.type] ?? item.type}</div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{item.contributor}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatRelativeTime(item.submittedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => navigate(ROUTES.CONTRIBUTIONS)}
                        className="text-xs text-primary hover:underline"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
