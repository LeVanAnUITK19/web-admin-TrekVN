/**
 * AI Agent API Service
 *
 * All calls follow the IS_MOCK_MODE pattern:
 *   IS_MOCK_MODE=true  → returns mock data with simulated latency
 *   IS_MOCK_MODE=false → calls real backend via apiClient
 *
 * Backend base: http://localhost:3000/api/v1  (through API Gateway)
 * Agent service port: 8000  (prefix /agent/*, /llm/*)
 */
import apiClient from './client'
import { ENDPOINTS } from './endpoints'
import { IS_MOCK_MODE, DEFAULT_PAGE_SIZE } from '@/constants'
import { sleep } from '@/lib/utils'
import {
  mockLLMProviders,
  mockConversations,
  mockConversationDetail,
  mockAgentTasks,
  mockAgentTaskDetail,
  mockPlaceCandidate,
  mockMapArtifact,
  mockMapBuildProgress,
} from '@/mocks'
import type {
  LLMProvidersResponse,
  Conversation,
  ConversationDetail,
  Message,
  SendMessageRequest,
  SendMessageResponse,
  AgentTask,
  AgentTaskDetail,
  AgentTaskListParams,
  PlaceCandidateResult,
  PlaceCandidateReviewRequest,
  MapArtifact,
  MapBuildProgress,
  MapBuilderFormData,
  PlaceBuilderFormData,
  // MapPublishResult, // Unused
  PendingApproval,
  ApprovalResult,
} from '@/types'
import type { PaginatedResponse } from '@/types'

// ─── LLM Providers ───────────────────────────────────────────────────────────

export async function getProviders(): Promise<LLMProvidersResponse> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return { providers: mockLLMProviders, defaultProvider: 'auto' }
  }
  // Real: GET /llm/providers
  const res = await apiClient.get(ENDPOINTS.AGENT_LLM_PROVIDERS)
  // Backend returns { providers: [{ id, name, available, models }], default }
  // Frontend type uses { id, name, label, description, status }
  const rawProviders: { id: string; name: string; available: boolean; models?: string[] }[] =
    res.data.data.providers ?? []

  // Always prepend the "Auto" virtual option
  const normalized = [
    {
      id: 'auto',
      name: 'Auto',
      label: 'Auto',
      description: 'Tự động chọn provider tốt nhất',
      status: 'available' as const,
    },
    ...rawProviders.map((p) => ({
      id: p.id,
      name: p.name,
      label: p.name,
      description: p.models?.length ? p.models.join(', ') : p.name,
      status: p.available ? ('available' as const) : ('unavailable' as const),
    })),
  ]

  return {
    providers: normalized,
    defaultProvider: res.data.data.default ?? 'auto',
  }
}

// ─── Conversations ────────────────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    return mockConversations
  }
  // Real: GET /agent/conversations  — returns paginated or array depending on backend
  const res = await apiClient.get(ENDPOINTS.AGENT_CONVERSATIONS)
  // Backend returns { items: [...], total, page, limit } wrapped in res.data.data
  const payload = res.data.data
  if (Array.isArray(payload)) return payload          // plain array
  if (Array.isArray(payload?.items)) {
    // Backend returns { items: [...], total, page, limit }
    // Each item has "conversationId" — normalize to "id"
    return payload.items.map((item: Record<string, unknown>) => ({
      ...item,
      id: item.id ?? item.conversationId,
    }))
  }
  if (Array.isArray(payload?.data)) return payload.data    // paginated { data: [...] }
  return []
}

export async function getConversation(id: string): Promise<ConversationDetail> {
  if (IS_MOCK_MODE) {
    await sleep(350)
    if (id === mockConversationDetail.id) return mockConversationDetail
    const conv = mockConversations.find((c) => c.id === id)
    if (!conv) throw new Error('Không tìm thấy cuộc trò chuyện')
    return { ...conv, messages: [] }
  }
  // Real: GET /agent/conversations/:id  (returns conv doc, no messages embedded)
  // Then: GET /agent/conversations/:id/messages  (returns { items: [...] })
  const [convRes, msgsRes] = await Promise.all([
    apiClient.get(ENDPOINTS.AGENT_CONVERSATION(id)),
    apiClient.get(`${ENDPOINTS.AGENT_CONVERSATION(id)}/messages`).catch(() => null),
  ])
  const raw = convRes.data.data
  // Normalize field names: backend uses conversationId, messageId; frontend uses id
  const messages: Message[] = []
  if (msgsRes) {
    const msgPayload = msgsRes.data.data
    const rawMsgs: Record<string, unknown>[] = Array.isArray(msgPayload)
      ? msgPayload
      : Array.isArray(msgPayload?.items)
      ? msgPayload.items
      : []
    for (const m of rawMsgs) {
      const role = String(m.role ?? '').toLowerCase() as 'user' | 'assistant'
      if (role !== 'user' && role !== 'assistant') continue

      // Map pendingApprovals from message history (same structure as sendMessage v2 response)
      const rawApprovals = m.pendingApprovals
      const pendingApprovals: PendingApproval[] | undefined =
        Array.isArray(rawApprovals) && rawApprovals.length > 0
          ? (rawApprovals as PendingApproval[])
          : undefined

      messages.push({
        id: String(m.messageId ?? m.id ?? ''),
        role,
        contents: [{ type: 'text', text: String(m.content ?? '') }],
        timestamp: String(m.createdAt ?? new Date().toISOString()),
        metadata: m.llm
          ? {
              model: String((m.llm as Record<string, unknown>).model ?? ''),
              provider: String((m.llm as Record<string, unknown>).provider ?? ''),
              latencyMs: Number((m.llm as Record<string, unknown>).latencyMs ?? 0),
            }
          : undefined,
        pendingApprovals,
      })
    }
  }
  return {
    id: String(raw.conversationId ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    messageCount: Number(raw.messageCount ?? 0),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
    messages,
  }
}

export async function createConversation(title?: string): Promise<Conversation> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return {
      id: `conv-${Date.now()}`,
      title: title ?? 'Cuộc trò chuyện mới',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messageCount: 0,
    }
  }
  // Real: POST /agent/conversations
  // API returns { conversationId, adminId, title, status, messageCount, createdAt, updatedAt }
  const res = await apiClient.post(ENDPOINTS.AGENT_CONVERSATIONS, { title })
  const raw = res.data.data
  // Normalize: backend field is "conversationId", frontend type uses "id"
  return {
    id: raw.conversationId ?? raw.id,
    title: raw.title,
    messageCount: raw.messageCount ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  if (IS_MOCK_MODE) {
    await sleep(200)
    const conv = mockConversations.find((c) => c.id === id)
    if (!conv) throw new Error('Không tìm thấy cuộc trò chuyện')
    return { ...conv, title }
  }
  // Real: PATCH /agent/conversations/:id
  const res = await apiClient.patch(ENDPOINTS.AGENT_CONVERSATION(id), { title })
  const raw = res.data.data
  return {
    id: raw.conversationId ?? raw.id,
    title: raw.title,
    messageCount: raw.messageCount ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  }
}

export async function deleteConversation(id: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(200)
    return
  }
  // Real: DELETE /agent/conversations/:id
  await apiClient.delete(ENDPOINTS.AGENT_CONVERSATION(id))
}

export async function sendMessage(req: SendMessageRequest): Promise<SendMessageResponse> {
  if (IS_MOCK_MODE) {
    await sleep(1200)
    const userMsg = {
      id: `msg-user-${Date.now()}`,
      role: 'user' as const,
      contents: [{ type: 'text' as const, text: req.text }],
      timestamp: new Date().toISOString(),
    }
    const assistantMsg = {
      id: `msg-ai-${Date.now()}`,
      role: 'assistant' as const,
      contents: [
        {
          type: 'text' as const,
          text: 'Cảm ơn câu hỏi của bạn. Đây là phản hồi từ TrekViet AI dựa trên dữ liệu hệ thống...',
        },
      ],
      metadata: {
        model: 'UIT-LLM-v2',
        provider: 'UIT LLM',
        latencyMs: Math.floor(Math.random() * 600) + 400,
      },
      timestamp: new Date().toISOString(),
    }
    return { userMessage: userMsg, assistantMessage: assistantMsg }
  }
  // Real: POST /agent/conversations/:id/messages
  // API request body: { content: string, provider: string }
  // API response: { message: { id, role, content, createdAt }, llm: { provider, model, latencyMs } }
  const res = await apiClient.post(ENDPOINTS.AGENT_MESSAGES(req.conversationId), {
    content: req.text,      // API uses "content" not "text"
    provider: req.providerId,
  })
  const raw = res.data.data

  // Backend v2 returns: { userMessage: {...}, assistantMessage: {...}, llm: {...} }
  // Backend v1 returns: { message: {...}, llm: {...} }  (backward compatibility)

  let userMsg: Message
  let assistantMsg: Message

  if (raw.userMessage && raw.assistantMessage) {
    // v2 response - use directly
    userMsg = {
      id: String(raw.userMessage.id ?? `msg-user-${Date.now()}`),
      role: 'user',
      contents: [{ type: 'text', text: String(raw.userMessage.content ?? req.text) }],
      timestamp: String(raw.userMessage.createdAt ?? new Date().toISOString()),
    }

    // Normalize pendingApprovals if present
    const rawApprovals = raw.assistantMessage.pendingApprovals
    const pendingApprovals: PendingApproval[] | undefined =
      Array.isArray(rawApprovals) && rawApprovals.length > 0
        ? (rawApprovals as PendingApproval[])
        : undefined

    assistantMsg = {
      id: String(raw.assistantMessage.id ?? `msg-ai-${Date.now()}`),
      role: 'assistant',
      contents: [{ type: 'text', text: String(raw.assistantMessage.content ?? '') }],
      metadata: raw.llm
        ? {
            model: raw.llm.model,
            provider: raw.llm.provider,
            latencyMs: raw.llm.latencyMs,
          }
        : undefined,
      timestamp: String(raw.assistantMessage.createdAt ?? new Date().toISOString()),
      pendingApprovals,
    }
  } else {
    // v1 response - reconstruct user message locally (backward compatibility)
    userMsg = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      contents: [{ type: 'text', text: req.text }],
      timestamp: new Date().toISOString(),
    }
    assistantMsg = {
      id: String(raw.message?.id ?? `msg-ai-${Date.now()}`),
      role: 'assistant',
      contents: [{ type: 'text', text: String(raw.message?.content ?? '') }],
      metadata: raw.llm
        ? {
            model: raw.llm.model,
            provider: raw.llm.provider,
            latencyMs: raw.llm.latencyMs,
          }
        : undefined,
      timestamp: String(raw.message?.createdAt ?? new Date().toISOString()),
    }
  }

  return { userMessage: userMsg, assistantMessage: assistantMsg }
}

// ─── Agent Tasks ──────────────────────────────────────────────────────────────

export async function getAgentTasks(
  params: AgentTaskListParams,
): Promise<PaginatedResponse<AgentTask>> {
  if (IS_MOCK_MODE) {
    await sleep(400)
    let result = [...mockAgentTasks]
    const q = params.search?.toLowerCase()
    if (q) {
      result = result.filter(
        (t) =>
          t.jobId.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          (t.description ?? '').toLowerCase().includes(q),
      )
    }
    if (params.type) result = result.filter((t) => t.type === params.type)
    if (params.status) result = result.filter((t) => t.status === params.status)
    const total = result.length
    const page = params.page ?? 1
    const limit = params.limit ?? DEFAULT_PAGE_SIZE
    return {
      data: result.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }
  // Real: GET /agent/tasks
  const filters = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))
  const res = await apiClient.get(ENDPOINTS.AGENT_TASKS, { params: filters })
  return res.data.data
}

export async function getAgentTask(id: string): Promise<AgentTaskDetail> {
  if (IS_MOCK_MODE) {
    await sleep(350)
    if (id === mockAgentTaskDetail.id) return mockAgentTaskDetail
    const task = mockAgentTasks.find((t) => t.id === id || t.jobId === id)
    if (!task) throw new Error('Không tìm thấy tác vụ')
    return {
      ...task,
      steps: [{ label: 'Khởi tạo tác vụ', status: 'done', timestamp: task.createdAt }],
      logs: [{ timestamp: task.createdAt, level: 'info', message: `Khởi tạo tác vụ ${task.jobId}` }],
    }
  }
  // Real: GET /agent/tasks/:id
  const res = await apiClient.get(ENDPOINTS.AGENT_TASK(id))
  return res.data.data
}

// ─── Place Builder ────────────────────────────────────────────────────────────

export async function createPlaceJob(data: PlaceBuilderFormData): Promise<AgentTask> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    return {
      id: `task-${Date.now()}`,
      jobId: `PL-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      type: 'PLACE_BUILDER',
      name: `${data.placeName} (${data.operation})`,
      description: `Thu thập dữ liệu địa điểm: ${data.placeName}`,
      createdBy: 'admin01',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  // Real: POST /agent/place-jobs
  const res = await apiClient.post(ENDPOINTS.AGENT_PLACE_JOBS, data)
  const raw = res.data.data
  return {
    id: raw.jobId ?? raw.id,
    jobId: raw.jobId,
    type: 'PLACE_BUILDER',
    name: data.placeName,
    description: `Thu thập dữ liệu địa điểm: ${data.placeName}`,
    createdBy: 'admin',
    status: raw.status ?? 'QUEUED',
    createdAt: raw.createdAt ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? new Date().toISOString(),
  }
}

export async function getPlaceJob(jobId: string): Promise<Record<string, unknown>> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    // Simulate PENDING_REVIEW after a short time
    return {
      jobId,
      status: 'PENDING_REVIEW',
      candidateId: mockPlaceCandidate.id,
    }
  }
  // Real: GET /agent/place-jobs/:id
  const res = await apiClient.get(ENDPOINTS.AGENT_PLACE_JOB(jobId))
  return res.data.data
}

export async function getCandidate(candidateId: string): Promise<PlaceCandidateResult> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return { ...mockPlaceCandidate, id: candidateId }
  }
  // Real: GET /agent/candidates/:id
  const res = await apiClient.get(ENDPOINTS.AGENT_CANDIDATE(candidateId))
  return res.data.data
}

export async function reviewCandidate(
  candidateId: string,
  req: PlaceCandidateReviewRequest,
): Promise<PlaceCandidateResult> {
  if (IS_MOCK_MODE) {
    await sleep(600)
    const statusMap: Record<string, PlaceCandidateResult['status']> = {
      APPROVE: 'APPROVED',
      REJECT: 'REJECTED',
      REQUEST_REVISION: 'NEEDS_REVISION',
    }
    return {
      ...mockPlaceCandidate,
      id: candidateId,
      status: statusMap[req.action] ?? 'PENDING_REVIEW',
      rejectionReason: req.reason,
    }
  }
  // Real: POST /agent/candidates/:id/review
  const res = await apiClient.post(ENDPOINTS.AGENT_CANDIDATE_REVIEW(candidateId), req)
  return res.data.data
}

// ─── Map Builder ──────────────────────────────────────────────────────────────

export async function createMapJob(data: MapBuilderFormData): Promise<AgentTask> {
  if (IS_MOCK_MODE) {
    await sleep(500)
    return {
      id: `task-${Date.now()}`,
      jobId: `MP-${String(Math.floor(Math.random() * 90000) + 10000)}`,
      type: 'MAP_BUILDER',
      name: `${data.placeName} (BBOX: ${data.bbox.minLng.toFixed(2)}–${data.bbox.maxLng.toFixed(2)})`,
      description: `Tạo bản đồ offline cho ${data.placeName}`,
      createdBy: 'admin01',
      status: 'QUEUED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }
  // Real: POST /agent/map-builder/jobs
  // Backend schema (camelCase với alias):
  const res = await apiClient.post(ENDPOINTS.AGENT_MAP_JOBS, {
    trekkingPlaceId: data.placeId,
    placeName: data.placeName,
    publishTarget: { type: 'PLACE', targetId: data.placeId },
    bbox: {
      minLon: data.bbox.minLng,
      minLat: data.bbox.minLat,
      maxLon: data.bbox.maxLng,
      maxLat: data.bbox.maxLat,
    },
    minZoom: data.zoomMin ?? 10,
    maxZoom: data.zoomMax ?? 14,
  })

  // Backend response: { jobId, mapJobId, status }
  // Map to AgentTask format
  // QUAN TRỌNG: dùng jobId (MAP-xxx) làm id để poll đúng endpoint
  // mapJobId là UUID nội bộ, không dùng cho GET /map-jobs/:id
  const backendData = res.data.data
  return {
    id: backendData.jobId,          // MAP-20261007-XXXXXXXX — dùng để poll
    jobId: backendData.jobId,       // giữ nguyên để hiển thị
    type: 'MAP_BUILDER',
    name: `${data.placeName} (BBOX: ${data.bbox.minLng.toFixed(2)}–${data.bbox.maxLng.toFixed(2)})`,
    description: `Tạo bản đồ offline cho ${data.placeName}`,
    createdBy: 'admin',
    status: backendData.status || 'QUEUED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export async function getMapJob(taskId: string): Promise<MapBuildProgress> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    // Khi mock mode, trả thêm publish info để polling trong useMapPublish có thể hoạt động
    return {
      ...mockMapBuildProgress,
      jobId: taskId,
      // Cast để giả lập trạng thái PUBLISHED cho polling hook
      status: 'PUBLISHED',
      publish: {
        r2: { objectKey: `maps/mock-place/v1/mock-place-v1-flutter.zip` },
        productionOfflineMap: { updatedAt: new Date().toISOString() },
      },
      output: { fileSizeBytes: 19292160, metadata: { version: 1 } },
    } as unknown as MapBuildProgress
  }
  // Real: GET /agent/map-jobs/:id  (poll every 3–5s khi PROCESSING/PUBLISHING)
  const res = await apiClient.get(ENDPOINTS.AGENT_MAP_JOB(taskId))
  return res.data.data
}

export async function getMapArtifact(id: string): Promise<MapArtifact> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return mockMapArtifact
  }
  // Real: GET /agent/map-artifacts/:id
  const res = await apiClient.get(ENDPOINTS.AGENT_MAP_ARTIFACT(id))
  return res.data.data
}

export async function downloadMapArtifact(id: string): Promise<string> {
  if (IS_MOCK_MODE) {
    await sleep(200)
    return `#mock-download-${id}`
  }
  // Real: GET /agent/map-artifacts/:id/download  — returns { url: "signed-url" }
  const res = await apiClient.get(ENDPOINTS.AGENT_MAP_ARTIFACT_DOWNLOAD(id))
  return res.data.data.url
}

/** Authenticated ZIP download; preview reads tiles from these exact bytes. */
export async function getMapArtifactFile(id: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  if (IS_MOCK_MODE) throw new Error('Chế độ mock chưa có gói bản đồ offline để xem.')
  const res = await apiClient.get<ArrayBuffer>(ENDPOINTS.AGENT_MAP_ARTIFACT_FILE(id), {
    responseType: 'arraybuffer', signal, timeout: 120000,
  })
  return res.data
}

export async function approveMapJob(taskId: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(800)
    return // polling sẽ lấy kết quả
  }
  // Real: POST /agent/map-jobs/:id/approve
  // Backend trả ngay { jobId, status: "PUBLISHING" } — background task xử lý R2 upload
  // Polling do useMapPublish hook đảm nhiệm
  // Gửi body {} để tránh 422 (schema MapReviewActionRequest có note: Optional)
  await apiClient.post(ENDPOINTS.AGENT_MAP_JOB_APPROVE(taskId), {})
}

export async function rejectMapJob(taskId: string, note: string): Promise<void> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return
  }
  // Real: POST /agent/map-jobs/:id/reject  — body: { note } (NOT "reason")
  await apiClient.post(ENDPOINTS.AGENT_MAP_JOB_REJECT(taskId), { note })
}

// ─── Badge Approval Actions ───────────────────────────────────────────────────

/**
 * Admin approves a pending badge write action proposed by the agent.
 * This triggers the actual write to trekking-service.
 * POST /agent/conversations/:id/approve  { approvalId }
 */
export async function approvePendingAction(
  conversationId: string,
  approvalId: string,
): Promise<ApprovalResult> {
  if (IS_MOCK_MODE) {
    await sleep(800)
    return {
      approvalId,
      action: 'CREATE_BADGE',
      status: 'APPROVED',
      result: { badgeId: `mock-badge-${Date.now()}`, name: 'Mock Badge' },
    }
  }
  const res = await apiClient.post(
    `${ENDPOINTS.AGENT_CONVERSATION(conversationId)}/approve`,
    { approvalId },
  )
  return res.data.data as ApprovalResult
}

/**
 * Admin rejects a pending badge write action — no write is performed.
 * POST /agent/conversations/:id/reject  { approvalId, reason? }
 */
export async function rejectPendingAction(
  conversationId: string,
  approvalId: string,
  reason?: string,
): Promise<ApprovalResult> {
  if (IS_MOCK_MODE) {
    await sleep(300)
    return {
      approvalId,
      action: 'CREATE_BADGE',
      status: 'REJECTED',
      reason: reason ?? 'Admin từ chối',
    }
  }
  const res = await apiClient.post(
    `${ENDPOINTS.AGENT_CONVERSATION(conversationId)}/reject`,
    { approvalId, reason },
  )
  return res.data.data as ApprovalResult
}
