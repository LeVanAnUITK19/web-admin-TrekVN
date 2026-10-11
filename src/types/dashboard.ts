export interface DashboardStats {
  totalUsers: number
  userGrowthPercent?: number
  totalJourneys: number | null
  journeyGrowthPercent?: number
  totalPlaces: number | null
  placeGrowthPercent?: number
  totalPosts: number | null
  postGrowthPercent?: number
  totalCheckins: number | null
  checkinGrowthPercent?: number
  pendingContributions: number | null
  contributionGrowthPercent?: number
  totalBadgeTypes: number | null
  badgeGrowthPercent?: number
  totalRanks: number
  rankGrowthPercent?: number
}

export interface ActivityDataPoint {
  date: string
  users: number
  checkins: number | null
  journeys: number | null
}

export interface ContributionRatioData {
  approved: number
  pending: number
  rejected: number
  needsRevision: number
}

export interface LeaderboardUser {
  userId: string
  name: string
  avatarUrl: string | null
  rankName: string
  rankCode: string
  totalXp: number
  badgeCount: number
}

export interface RecentBadge {
  awardId?: string
  badgeId: string
  name: string
  iconUrl: string
  rarity: string
  userName: string
  earnedAt: string
}

export interface ActiveUser {
  userId: string
  name: string
  avatarUrl: string | null
  lastActive: string
}

export interface DashboardData {
  stats: DashboardStats
  activityChart: ActivityDataPoint[]
  contributionRatio: ContributionRatioData | null
  unavailableServices?: string[]
  leaderboard: LeaderboardUser[]
  recentBadges: RecentBadge[]
  activeUsers: ActiveUser[]
  recentContributions: RecentContribution[]
}

export interface RecentContribution {
  id: string
  type: string
  title: string
  contributor: string
  submittedAt: string
  status: string
}
