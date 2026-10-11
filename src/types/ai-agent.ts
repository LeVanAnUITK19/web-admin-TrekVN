// ============================================================
// AI Agent â€“ Frontend Types
// ============================================================

// ----------------------------------------------------------
// LLM Provider
// ----------------------------------------------------------
export type LLMProviderStatus = 'available' | 'unavailable' | 'disabled'

export interface LLMProvider {
  id: string
  name: string
  label: string
  description: string
  status: LLMProviderStatus
}

export interface LLMProvidersResponse {
  providers: LLMProvider[]
  defaultProvider: string
}

// ----------------------------------------------------------
// AI Assistant â€“ Conversations & Messages
// ----------------------------------------------------------
export type MessageRole = 'user' | 'assistant'

export type MessageContentType =
  | 'text'
  | 'stats'
  | 'chart'
  | 'recommendations'
  | 'table'

export interface MessageStatCard {
  label: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
}

export interface MessageChartData {
  date: string
  [key: string]: string | number
}

export interface MessageContent {
  type: MessageContentType
  text?: string
  stats?: MessageStatCard[]
  chartData?: MessageChartData[]
  chartKeys?: string[]
  recommendations?: string[]
  tableHeaders?: string[]
  tableRows?: (string | number)[][]
  topList?: { rank: number; name: string; count: number }[]
}

export interface MessageMetadata {
  model?: string
  provider?: string
  latencyMs?: number
  tokenCount?: number
}

export interface Message {
  id: string
  role: MessageRole
  contents: MessageContent[]
  metadata?: MessageMetadata
  timestamp: string
  /** Pending badge write approvals proposed in this message */
  pendingApprovals?: PendingApproval[]
}

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
}

export interface ConversationDetail extends Conversation {
  messages: Message[]
}

export interface SendMessageRequest {
  conversationId: string
  text: string
  providerId?: string
}

export interface SendMessageResponse {
  userMessage: Message
  assistantMessage: Message
}

// ----------------------------------------------------------
// Badge Approval (agent-proposed badge writes)
// ----------------------------------------------------------

export type ApprovalAction = 'CREATE_BADGE' | 'UPDATE_BADGE'
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED' | 'EXPIRED'

/** Display data embedded in the chat message from the backend */
export interface BadgeApprovalDisplay {
  action: ApprovalAction
  // CREATE_BADGE fields
  code?: string
  name?: string
  description?: string
  conditionType?: string
  conditionLabel?: string
  conditionValue?: number
  rarity?: string
  status?: string
  reason?: string
  // UPDATE_BADGE fields
  badge_id?: string
  badge_name_hint?: string
  changes?: string[]
  fields_payload?: Record<string, unknown>
}

/** Pending approval card returned with an assistant message */
export interface PendingApproval {
  approvalId: string
  action: ApprovalAction
  display: BadgeApprovalDisplay
  status: ApprovalStatus
}

/** Result returned after admin approves or rejects */
export interface ApprovalResult {
  approvalId: string
  action: ApprovalAction
  status: 'APPROVED' | 'REJECTED'
  result?: Record<string, unknown>
  reason?: string
}

// ----------------------------------------------------------
// Agent Task
// ----------------------------------------------------------
export type AgentTaskType = 'PLACE_BUILDER' | 'MAP_BUILDER' | 'ASSISTANT'

export type AgentTaskStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHING'
  | 'PUBLISHED'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'

export interface AgentTask {
  id: string
  jobId: string
  type: AgentTaskType
  name: string
  description?: string
  createdBy: string
  status: AgentTaskStatus
  createdAt: string
  updatedAt: string
  completedAt?: string
  executionTimeMs?: number
  errorMessage?: string
  /** Reference to the result entity (candidateId or mapJobId) */
  resultRef?: string
}

export interface AgentTaskListParams {
  page?: number
  limit?: number
  search?: string
  type?: AgentTaskType | ''
  status?: AgentTaskStatus | ''
  from?: string
  to?: string
}

export interface AgentTaskStep {
  label: string
  status: 'done' | 'active' | 'pending' | 'error'
  timestamp?: string
  message?: string
}

export interface AgentTaskDetail extends AgentTask {
  steps: AgentTaskStep[]
  logs: AgentTaskLog[]
  result?: PlaceCandidateResult | MapArtifact | Record<string, unknown>
  metadata?: Record<string, string | number | boolean>
}

export interface AgentTaskLog {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  message: string
}

// ----------------------------------------------------------
// Map Builder
// ----------------------------------------------------------
export type MapScope = 'PLACE' | 'ROUTE'

export type MapDataLayer = 'ROADS' | 'POI' | 'TERRAIN' | 'CONTOUR' | 'HILLSHADE'

export interface MapBBox {
  minLng: number
  minLat: number
  maxLng: number
  maxLat: number
}

export interface MapBuilderFormData {
  placeId: string
  placeName: string
  scope: MapScope
  routeId?: string
  bbox: MapBBox
  zoomMin: number
  zoomMax: number
  layers: MapDataLayer[]
}

export interface MapArtifact {
  id: string
  taskId: string
  fileName: string
  sizeBytes: number
  checksum: string
  version: number
  bbox: MapBBox
  zoomMin: number
  zoomMax: number
  layers: MapDataLayer[]
  scope: MapScope
  placeId: string
  placeName: string
  createdAt: string
  downloadUrl?: string
  /** Present after publishing */
  r2ObjectKey?: string
  publishedAt?: string
}

export interface MapPublishInfo {
  taskId: string
  artifactId: string
  placeId: string
  placeName: string
  r2BucketPath: string
  scope: MapScope
}

export interface MapPublishResult {
  objectKey: string
  version: number
  sizeBytes: number
  publishedAt: string
}

export interface MapBuildProgress {
  jobId: string
  placeName: string
  status: AgentTaskStatus
  progressPercent: number
  elapsedMs: number
  bbox: MapBBox
  zoomMin: number
  zoomMax: number
  steps: AgentTaskStep[]
  errorMessage?: string
}

// Legacy place-builder contracts retained for reading historical tasks.
export interface PlaceBuilderFormData {
  placeName: string
  locationHint?: string
  operation: 'CREATE' | 'UPDATE'
  targetPlaceId?: string
}
export interface PlaceCandidateReviewRequest {
  action: 'APPROVE' | 'REJECT' | 'REQUEST_REVISION'
  reason?: string
}
export interface PlaceCandidateResult {
  id: string
  taskId: string
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION' | 'PROCESSING' | 'FAILED'
  createdAt: string
  rejectionReason?: string
  data: Record<string, unknown>
  sources: Record<string, unknown>[]
  fieldConfidences: Record<string, unknown>[]
  overallConfidence: number
  duplicates: Record<string, unknown>[]
}
