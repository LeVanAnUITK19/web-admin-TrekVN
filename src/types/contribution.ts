import type { GeoLineString, GeoPoint, Difficulty } from './trekking'

export type ContributionType = 'ROUTE_SUBMISSION' | 'PLACE_SUGGESTION'
export type ContributionStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export interface ContributorInfo {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface RouteSubmissionData {
  trekkingPlaceId?: string
  contributionKind?: 'ROUTE' | 'MARKERS'
  notes?: string
  markerCount?: number
  encodedPolyline?: string
  suggestedName: string
  suggestedDescription?: string
  distance?: number
  estimatedDuration?: number
  elevationGain?: number
  geometry?: GeoLineString
  sourceJourneyId?: string
  images?: string[]
  gpxUrl?: string
}

export interface PlaceSuggestionData {
  suggestedName: string
  province: string
  coordinates: GeoPoint
  description?: string
  difficulty?: Difficulty
  tags?: string[]
  images?: string[]
}

export interface Contribution {
  id: string
  type: ContributionType
  status: ContributionStatus
  contributor: ContributorInfo
  submittedAt: string
  updatedAt: string
  adminNote?: string
  reviewedBy?: string
  reviewedAt?: string
  resultingEntityId?: string
  routeSubmission?: RouteSubmissionData
  placeSuggestion?: PlaceSuggestionData
}

export interface ContributionListParams {
  contributionKind?: 'ROUTE' | 'MARKERS' | ''
  page?: number
  limit?: number
  type?: ContributionType | ''
  status?: ContributionStatus | ''
  province?: string
  search?: string
  dateFrom?: string
  dateTo?: string
}

export interface ReviewContributionPayload {
  /** Field name per API spec: trekking-service uses "decision" (not "action") */
  decision: 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION'
  adminNote?: string
  /** ID of the resulting route when decision = APPROVED */
  resultingRouteId?: string
}
