// ============================================================
// Trek XP & User Ranking Types
// Matches DB v3.1: rank_definitions, user_rank_profiles,
//                   xp_transactions, rank_history
// ============================================================

// ----------------------------------------------------------
// Rank Definition (auth_db.rank_definitions)
// ----------------------------------------------------------
export type RankCode =
  | 'NEWBIE'
  | 'HIKER'
  | 'EXPLORER'
  | 'TREKKER'
  | 'PATHFINDER'
  | 'MOUNTAINEER'
  | 'ADVENTURER'
  | 'ELITE_TREKKER'
  | 'TREK_MASTER'
  | 'TREK_LEGEND'

export type RankDefinitionStatus = 'ACTIVE' | 'INACTIVE'

export interface RankDefinition {
  id: string
  code: RankCode
  name: string
  description?: string
  /** Thứ tự cấp 1 → 10 */
  level: number
  minXp: number
  minCompletedJourneys: number
  minVisitedProvinces: number
  minBadgeCount: number
  /** Mét, mặc định 0 nếu chưa bật */
  minDistanceMeters: number
  /** Mặc định 0 nếu chưa bật */
  minApprovedContributions: number
  iconUrl?: string
  status: RankDefinitionStatus
  createdAt: string
  updatedAt: string
}

export interface RankDefinitionFormData {
  code: RankCode
  name: string
  description?: string
  level: number
  minXp: number
  minCompletedJourneys: number
  minVisitedProvinces: number
  minBadgeCount: number
  minDistanceMeters?: number
  minApprovedContributions?: number
  iconUrl?: string
  status: RankDefinitionStatus
}

// ----------------------------------------------------------
// User Rank Profile (auth_db.user_rank_profiles)
// ----------------------------------------------------------
export interface UserRankProfile {
  id: string
  userId: string
  currentRankId: string
  currentRankCode: RankCode
  currentRankName: string
  currentRankLevel: number
  currentRankMinXp?: number
  totalXp: number
  completedJourneyCount: number
  totalDistanceMeters: number
  totalElevationGain: number
  verifiedCheckinCount: number
  visitedProvinceCount: number
  visitedPlaceCount: number
  badgeCount: number
  approvedContributionCount: number
  lastCalculatedAt?: string
  /** Next rank info for progress display */
  nextRank?: {
    code: RankCode
    name: string
    level: number
    minXp: number
    minCompletedJourneys: number
    minVisitedProvinces: number
    minBadgeCount: number
  }
  createdAt: string
  updatedAt: string
}

// ----------------------------------------------------------
// XP Transaction (auth_db.xp_transactions)
// ----------------------------------------------------------
export type XpTransactionType = 'EARN' | 'REVERSAL' | 'ADMIN_ADJUSTMENT'

export type XpSourceType =
  | 'JOURNEY_COMPLETED'
  | 'JOURNEY_DISTANCE'
  | 'JOURNEY_ELEVATION'
  | 'MILESTONE_CHECKIN'
  | 'PROVINCE_VISITED'
  | 'PLACE_VISITED'
  | 'BADGE_EARNED'
  | 'ROUTE_APPROVED'
  | 'PLACE_APPROVED'
  | 'ADMIN_ADJUSTMENT'

export interface XpTransaction {
  id: string
  userId: string
  transactionType: XpTransactionType
  sourceType: XpSourceType
  sourceId?: string
  xpAmount: number
  description?: string
  idempotencyKey: string
  createdAt: string
}

export interface XpTransactionListParams {
  page?: number
  limit?: number
  userId?: string
  transactionType?: XpTransactionType | ''
  sourceType?: XpSourceType | ''
  dateFrom?: string
  dateTo?: string
}

/** Payload khi Admin tạo ADMIN_ADJUSTMENT */
export interface XpAdjustmentPayload {
  xpAmount: number      // Có thể âm (trừ XP)
  reason: string        // Bắt buộc theo FR-ADM-23
  description?: string
}

// ----------------------------------------------------------
// Rank History (auth_db.rank_history)
// ----------------------------------------------------------
export type RankChangeType = 'PROMOTION' | 'DEMOTION' | 'RECALCULATION'

export interface RankHistory {
  id: string
  userId: string
  previousRankId?: string
  previousRankCode?: RankCode
  previousRankName?: string
  newRankId: string
  newRankCode: RankCode
  newRankName: string
  xpAtChange: number
  changeType: RankChangeType
  changedAt: string
  createdAt: string
}

// ----------------------------------------------------------
// Journey Marker (for Contribution detail review – FR-ADM-21)
// ----------------------------------------------------------
export type JourneyMarkerType =
  | 'VIEWPOINT'
  | 'REST_POINT'
  | 'WATER_POINT'
  | 'DANGER'
  | 'INTERSECTION'
  | 'CAMP'
  | 'PHOTO_SPOT'
  | 'LANDMARK'
  | 'SUMMIT'
  | 'OTHER'

export type SubmittedMarkerReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/** Snapshot marker gắn với route_submission (route_submission_markers) */
export interface SubmittedMarker {
  id: string
  routeSubmissionId: string
  sourceJourneyMarkerId?: string
  name: string
  type: JourneyMarkerType
  description?: string
  /** GeoJSON Point */
  location: { type: 'Point'; coordinates: [number, number] }
  altitude?: number
  images?: string[]
  sequence?: number
  reviewStatus: SubmittedMarkerReviewStatus
  adminNote?: string
  resultingMilestoneId?: string
  createdAt: string
  updatedAt: string
}
