export const ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/auth/login',
  AUTH_LOGOUT: '/auth/logout',
  AUTH_ME: '/auth/me',
  AUTH_REFRESH: '/auth/refresh',

  // Dashboard
  ADMIN_DASHBOARD: '/admin/dashboard',

  // Users
  ADMIN_USERS: '/admin/users',
  ADMIN_USER: (id: string) => `/admin/users/${id}`,
  ADMIN_USER_BLOCK: (id: string) => `/admin/users/${id}/block`,
  ADMIN_USER_UNBLOCK: (id: string) => `/admin/users/${id}/unblock`,
  ADMIN_USER_RANK_PROFILE: (id: string) => `/admin/users/${id}/rank-profile`,
  ADMIN_USER_XP_ADJUSTMENT: (id: string) => `/admin/users/${id}/xp-adjustments`,
  ADMIN_USER_XP_TRANSACTIONS: (id: string) => `/admin/users/${id}/xp-transactions`,
  ADMIN_USER_RANK_HISTORY: (id: string) => `/admin/users/${id}/rank-history`,

  // Places  (→ trekking-service, prefix /admin/trekking/)
  ADMIN_PLACES: '/admin/trekking/places',
  ADMIN_PLACE: (id: string) => `/admin/trekking/places/${id}`,
  ADMIN_PLACE_STATUS: (id: string) => `/admin/trekking/places/${id}/status`,
  /** POST multipart/form-data; field "images" (max 10 files) */
  ADMIN_PLACE_IMAGES: (id: string) => `/admin/trekking/places/${id}/images`,
  /** POST multipart/form-data; field "image" (single file) */
  ADMIN_PLACE_MAP_IMAGE: (id: string) => `/admin/trekking/places/${id}/map-image`,

  // Routes  (→ trekking-service, prefix /admin/trekking/)
  ADMIN_ROUTES: '/admin/trekking/routes',
  ADMIN_ROUTE: (id: string) => `/admin/trekking/routes/${id}`,
  ADMIN_ROUTE_STATUS: (id: string) => `/admin/trekking/routes/${id}/status`,
  /** POST multipart/form-data; field "image" (single file) */
  ADMIN_ROUTE_IMAGE: (id: string) => `/admin/trekking/routes/${id}/image`,
  /** Milestones nested under a specific route */
  ADMIN_ROUTE_MILESTONES: (routeId: string) => `/admin/trekking/routes/${routeId}/milestones`,
  ADMIN_ROUTE_MILESTONE: (routeId: string, milestoneId: string) =>
    `/admin/trekking/routes/${routeId}/milestones/${milestoneId}`,

  // Milestones  (flat endpoints — no routeId required for GET/PUT/DELETE)
  ADMIN_MILESTONES: '/admin/trekking/milestones',
  ADMIN_MILESTONE: (id: string) => `/admin/trekking/milestones/${id}`,

  // Contributions
  ADMIN_CONTRIBUTIONS: '/admin/contributions',
  ADMIN_CONTRIBUTION: (id: string) => `/admin/contributions/${id}`,
  ADMIN_CONTRIBUTION_REVIEW: (id: string) => `/admin/contributions/${id}/review`,
  /** Journey Markers đính kèm trong route submission (FR-ADM-21) */
  ADMIN_CONTRIBUTION_MARKERS: (submissionId: string) =>
    `/admin/contributions/${submissionId}/markers`,
  ADMIN_CONTRIBUTION_MARKER_REVIEW: (submissionId: string, markerId: string) =>
    `/admin/contributions/${submissionId}/markers/${markerId}/review`,

  // Community
  ADMIN_POSTS: '/admin/posts',
  ADMIN_POST: (id: string) => `/admin/posts/${id}`,
  ADMIN_POST_HIDE: (id: string) => `/admin/posts/${id}/hide`,
  ADMIN_COMMENTS: '/admin/comments',
  ADMIN_COMMENT: (id: string) => `/admin/comments/${id}`,
  ADMIN_COMMENT_HIDE: (id: string) => `/admin/comments/${id}/hide`,
  ADMIN_REVIEWS: '/admin/reviews',
  ADMIN_REVIEW: (id: string) => `/admin/reviews/${id}`,
  ADMIN_REVIEW_HIDE: (id: string) => `/admin/reviews/${id}/hide`,

  // Badges  (→ trekking-service, prefix /admin/badges)
  ADMIN_BADGES: '/admin/badges',
  ADMIN_BADGE: (id: string) => `/admin/badges/${id}`,
  ADMIN_BADGE_STATUS: (id: string) => `/admin/badges/${id}/status`,

  // Offline Maps  (→ trekking-service, prefix /admin/trekking/offline-maps)
  ADMIN_OFFLINE_MAPS: '/admin/trekking/offline-maps',
  ADMIN_OFFLINE_MAP: (id: string) => `/admin/trekking/offline-maps/${id}`,
  /** POST — publish a DRAFT package (sets status→PUBLISHED) */
  ADMIN_OFFLINE_MAP_PUBLISH: (id: string) => `/admin/trekking/offline-maps/${id}/publish`,
  /** GET — list places có offlineMap.available = true (từ Agent Map Builder) */
  ADMIN_PLACES_OFFLINE_MAPS: '/admin/trekking/places-offline-maps',
  /** PUT — cập nhật embedded offlineMap của một place */
  ADMIN_PLACE_OFFLINE_MAP: (id: string) => `/admin/trekking/places/${id}/offline-map`,

  // Journeys  (→ trekking-service, read-only)
  ADMIN_JOURNEYS: '/admin/trekking/journeys',
  ADMIN_JOURNEY: (id: string) => `/admin/trekking/journeys/${id}`,

  // Audit Logs
  ADMIN_AUDIT_LOGS: '/admin/audit-logs',

  // ── Gamification – Rank & XP ─────────────────────────────────────────────
  /** GET list / (no POST – ranks are seeded, not created via UI) */
  ADMIN_RANKS: '/admin/ranks',
  /** GET detail + PATCH update (status, name, thresholds) */
  ADMIN_RANK: (id: string) => `/admin/ranks/${id}`,

  // ── AI Agent ────────────────────────────────────────────
  // All agent endpoints go through API Gateway → agent-service (port 8000)
  // Gateway proxies: /api/v1/agent/* → agent-service /api/v1/agent/*
  //                 /api/v1/llm/* → agent-service /api/v1/llm/*
  // Paths must match agent-service FastAPI routes exactly.

  AGENT_LLM_PROVIDERS: '/llm/providers',

  // Assistant conversations & messages (spec-aligned paths under /agent)
  AGENT_CONVERSATIONS: '/agent/conversations',
  AGENT_CONVERSATION: (id: string) => `/agent/conversations/${id}`,
  AGENT_MESSAGES: (conversationId: string) =>
    `/agent/conversations/${conversationId}/messages`,

  // Agent Tasks (unified view across all workflows)
  AGENT_TASKS: '/agent/tasks',
  AGENT_TASK: (id: string) => `/agent/tasks/${id}`,

  // Place Builder
  AGENT_PLACE_JOBS: '/agent/place-jobs',
  AGENT_PLACE_JOB: (id: string) => `/agent/place-jobs/${id}`,
  AGENT_CANDIDATES: '/agent/candidates',
  AGENT_CANDIDATE: (id: string) => `/agent/candidates/${id}`,
  /** Backend: POST /agent/candidates/:id/review with { action: "approve"|"reject" } */
  AGENT_CANDIDATE_REVIEW: (id: string) => `/agent/candidates/${id}/review`,

  // Map Builder
  AGENT_MAP_JOBS: '/agent/map-jobs',
  AGENT_MAP_JOB: (id: string) => `/agent/map-jobs/${id}`,
  AGENT_MAP_JOB_APPROVE: (id: string) => `/agent/map-jobs/${id}/approve`,
  AGENT_MAP_JOB_REJECT: (id: string) => `/agent/map-jobs/${id}/reject`,
  /** Download artifact — GET /agent/map-artifacts/:id/download */
  AGENT_MAP_ARTIFACT: (id: string) => `/agent/map-artifacts/${id}`,
  AGENT_MAP_ARTIFACT_DOWNLOAD: (id: string) => `/agent/map-artifacts/${id}/download`,
  AGENT_MAP_ARTIFACT_FILE: (id: string) => `/agent/map-artifacts/${id}/file`,
} as const
