import { useState, useEffect, useRef, useCallback } from 'react'
import { Bot, MessageCircle, PanelLeftClose, PanelLeft } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/feedback/ErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { LLMProviderSelector } from './LLMProviderSelector'
import { ConversationList } from './ConversationList'
import { ChatMessage, ThinkingIndicator } from './ChatMessage'
import { ChatInput } from './ChatInput'
import {
  useLLMProviders,
  useConversations,
  useConversationDetail,
  useChat,
  useCreateConversation,
  useDeleteConversation,
  useRenameConversation,
  useProviderSelector,
} from './useAssistant'
import * as agentApi from '@/services/api/agentApi'
import type { Conversation, ApprovalStatus } from '@/types'

export default function AssistantPage() {
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  /**
   * Persistent approval status map: approvalId → resolved status.
   * Updated immediately when admin clicks Approve/Reject so the UI
   * reflects the action without waiting for a full message reload.
   * Persisted in localStorage to survive page refreshes.
   * _timestamp field is used for cleanup (not an approval status).
   */
  type ResolvedApprovalsMap = { [key: string]: ApprovalStatus | number | undefined; _timestamp?: number }

  const [resolvedApprovals, setResolvedApprovals] = useState<ResolvedApprovalsMap>(() => {
    // Load from localStorage on mount
    const stored = localStorage.getItem(`approvals_${activeConvId}`)
    return stored ? JSON.parse(stored) : {}
  })

  // ── Queries & mutations ───────────────────────────────────────────────────
  const { data: providersRes, isLoading: providersLoading } = useLLMProviders()
  const { data: conversations = [], isLoading: convsLoading, isError: convsError, refetch } = useConversations()

  const providers = providersRes?.providers ?? []
  const { selectedId, setSelectedId } = useProviderSelector(providers)

  const { localMessages, isThinking, mergeMessages, sendMessage, setLocalMessages } = useChat(
    activeConvId,
    selectedId
  )

  // Pass isThinking to enable polling when AI is processing
  const { data: convDetail, isLoading: detailLoading } = useConversationDetail(activeConvId, isThinking)

  const createMutation = useCreateConversation()
  const deleteMutation = useDeleteConversation()
  const renameMutation = useRenameConversation()

  // Reset local messages + resolved approvals when switching conversations
  useEffect(() => {
    setLocalMessages([])
    // Load resolved approvals from localStorage for the new conversation
    const stored = localStorage.getItem(`approvals_${activeConvId}`)
    setResolvedApprovals(stored ? JSON.parse(stored) : {})
  }, [activeConvId, setLocalMessages])

  // Cleanup old approval states from localStorage (older than 7 days)
  useEffect(() => {
    const cleanupOldApprovals = () => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('approvals_'))
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

      keys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          // If no timestamp or very old, clean up
          if (!data._timestamp || data._timestamp < sevenDaysAgo) {
            localStorage.removeItem(key)
          }
        } catch {
          localStorage.removeItem(key)
        }
      })
    }

    cleanupOldApprovals()
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages, isThinking, convDetail?.messages])

  // Seed active conv on first load
  useEffect(() => {
    if (conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id)
    }
  }, [conversations, activeConvId])

  // ── Derived messages ──────────────────────────────────────────────────────
  const serverMessages = convDetail?.messages ?? []
  // Filter out _timestamp from resolvedApprovals before passing to mergeMessages
  const approvalsOnly = Object.fromEntries(Object.entries(resolvedApprovals).filter(([key]) => key !== '_timestamp'))
  const allMessages = mergeMessages(serverMessages, approvalsOnly as Record<string, ApprovalStatus>)

  // ── Conversation handlers ─────────────────────────────────────────────────
  const handleNewConversation = async () => {
    const conv = await createMutation.mutateAsync()
    setActiveConvId(conv.id)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    await deleteMutation.mutateAsync(deleteTarget.id)
    if (activeConvId === deleteTarget.id) setActiveConvId(null)
    setDeleteTarget(null)
  }

  const handleRenameSubmit = async () => {
    if (!renameTarget || !renameValue.trim()) return
    await renameMutation.mutateAsync({ id: renameTarget.id, title: renameValue.trim() })
    setRenameTarget(null)
  }

  const openRename = (conv: Conversation) => {
    setRenameTarget(conv)
    setRenameValue(conv.title)
  }

  // ── Badge approval handlers ───────────────────────────────────────────────

  const handleApprove = useCallback(async (approvalId: string) => {
    if (!activeConvId) return
    // Optimistic update — show APPROVED immediately
    const newResolvedApprovals = {
      ...resolvedApprovals,
      [approvalId]: 'APPROVED' as ApprovalStatus,
      _timestamp: Date.now()
    }
    setResolvedApprovals(newResolvedApprovals)
    // Persist to localStorage
    localStorage.setItem(`approvals_${activeConvId}`, JSON.stringify(newResolvedApprovals))

    try {
      await agentApi.approvePendingAction(activeConvId, approvalId)
      toast.success('Huy hiệu đã được tạo/cập nhật thành công!')
    } catch (err) {
      // Revert on failure
      const reverted = { ...resolvedApprovals, [approvalId]: 'PENDING' as ApprovalStatus, _timestamp: Date.now() }
      setResolvedApprovals(reverted)
      localStorage.setItem(`approvals_${activeConvId}`, JSON.stringify(reverted))

      const msg =
        err instanceof Error ? err.message : 'Không thể thực hiện hành động. Vui lòng thử lại.'
      toast.error(msg)
    }
  }, [activeConvId, resolvedApprovals])

  const handleReject = useCallback(async (approvalId: string) => {
    if (!activeConvId) return
    // Optimistic update — show REJECTED immediately
    const newResolvedApprovals = {
      ...resolvedApprovals,
      [approvalId]: 'REJECTED' as ApprovalStatus,
      _timestamp: Date.now()
    }
    setResolvedApprovals(newResolvedApprovals)
    // Persist to localStorage
    localStorage.setItem(`approvals_${activeConvId}`, JSON.stringify(newResolvedApprovals))

    try {
      await agentApi.rejectPendingAction(activeConvId, approvalId)
      toast.info('Đã từ chối hành động.')
    } catch (err) {
      // Revert on failure
      const reverted = { ...resolvedApprovals, [approvalId]: 'PENDING' as ApprovalStatus, _timestamp: Date.now() }
      setResolvedApprovals(reverted)
      localStorage.setItem(`approvals_${activeConvId}`, JSON.stringify(reverted))

      const msg =
        err instanceof Error ? err.message : 'Không thể từ chối. Vui lòng thử lại.'
      toast.error(msg)
    }
  }, [activeConvId, resolvedApprovals])

  return (
    <div className="flex h-[calc(100vh-112px)] -mx-6 -mb-6 overflow-hidden rounded-b-lg">
      {/* ── Conversation Sidebar ───────────────────────────────────────────── */}
      <div
        className={cn(
          'flex-shrink-0 bg-white border-r border-border transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-64' : 'w-0'
        )}
      >
        <div className="w-64 h-full">
          {convsError ? (
            <ErrorState retry={refetch} />
          ) : (
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              isLoading={convsLoading}
              onSelect={setActiveConvId}
              onNew={handleNewConversation}
              onRename={openRename}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Chat header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors"
              title={sidebarOpen ? 'Ẩn danh sách' : 'Hiện danh sách'}
            >
              {sidebarOpen
                ? <PanelLeftClose className="w-4 h-4" />
                : <PanelLeft className="w-4 h-4" />
              }
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-foreground">Trợ lý AI TrekViệt</h1>
                <p className="text-xs text-muted-foreground">Hỏi đáp, phân tích dữ liệu, quản lý huy hiệu</p>
              </div>
            </div>
          </div>

          {/* Provider selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">Model:</span>
            <LLMProviderSelector
              providers={providers}
              selectedId={selectedId}
              onSelect={setSelectedId}
              isLoading={providersLoading}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {!activeConvId ? (
            <EmptyChat onNew={handleNewConversation} />
          ) : detailLoading && allMessages.length === 0 ? (
            <ChatSkeleton />
          ) : allMessages.length === 0 ? (
            <EmptyChat onNew={() => {}} isExisting />
          ) : (
            <>
              {allMessages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  resolvedApprovals={approvalsOnly as Record<string, ApprovalStatus>}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
              {isThinking && <ThinkingIndicator />}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={sendMessage}
          disabled={isThinking || !activeConvId}
          placeholder={activeConvId ? 'Hỏi tôi về TrekViệt...' : 'Chọn hoặc tạo cuộc trò chuyện để bắt đầu...'}
        />
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
        title="Xóa cuộc trò chuyện"
        description={`Bạn có chắc muốn xóa "${deleteTarget?.title}"? Hành động này không thể hoàn tác.`}
        confirmLabel="Xóa"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />

      {/* Rename Dialog */}
      <Dialog.Root open={!!renameTarget} onOpenChange={(o) => { if (!o) setRenameTarget(null) }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/40 z-50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="font-semibold text-foreground">Đổi tên cuộc trò chuyện</Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1.5 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
              </Dialog.Close>
            </div>
            <input
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit() }}
              className="w-full px-3 py-2 text-sm border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary mb-4"
              placeholder="Tên cuộc trò chuyện..."
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Dialog.Close asChild>
                <button className="px-4 py-2 text-sm border border-border rounded-md hover:bg-muted">Hủy</button>
              </Dialog.Close>
              <button
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim() || renameMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
              >
                {renameMutation.isPending ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

function EmptyChat({ onNew, isExisting }: { onNew: () => void; isExisting?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Bot className="w-8 h-8 text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">
        {isExisting ? 'Bắt đầu cuộc trò chuyện' : 'Trợ lý AI TrekViệt'}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        {isExisting
          ? 'Nhập câu hỏi bên dưới để bắt đầu.'
          : 'Tôi có thể giúp bạn phân tích dữ liệu, gợi ý và tạo huy hiệu, trả lời câu hỏi về TrekViệt.'}
      </p>
      {!isExisting && (
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Bắt đầu trò chuyện
        </button>
      )}
    </div>
  )
}

function ChatSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded animate-pulse w-24" />
            <div className="h-20 bg-muted rounded-2xl animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
