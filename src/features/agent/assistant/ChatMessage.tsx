import { Bot, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import type { Message, MessageContent } from '@/types'
import { ApprovalCard } from './ApprovalCard'
import type { ApprovalStatus } from '@/types'

interface ChatMessageProps {
  message: Message
  userName?: string
  /** Map approvalId → resolved status (optimistic update after admin acts) */
  resolvedApprovals?: Record<string, ApprovalStatus>
  onApprove?: (approvalId: string) => Promise<void>
  onReject?: (approvalId: string) => Promise<void>
}

export function ChatMessage({
  message,
  userName = 'Admin',
  resolvedApprovals,
  onApprove,
  onReject,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const time = new Date(message.timestamp).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Ho_Chi_Minh',
  })

  const hasPendingApprovals =
    !isUser && (message.pendingApprovals?.length ?? 0) > 0 && onApprove && onReject

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold">
            {userName.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        {/* Name + time */}
        <div className={cn('flex items-center gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-xs font-medium text-foreground">
            {isUser ? userName : 'TrekViet AI'}
          </span>
          <span className="text-xs text-muted-foreground">{time}</span>
          {!isUser && message.metadata?.provider && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {message.metadata.provider}
              {message.metadata.latencyMs ? ` • ${message.metadata.latencyMs}ms` : ''}
            </span>
          )}
        </div>

        {/* Message blocks */}
        <div className={cn('flex flex-col gap-3 w-full', isUser ? 'items-end' : 'items-start')}>
          {message.contents.map((content, idx) => (
            <MessageBlock key={idx} content={content} isUser={isUser} />
          ))}

          {/* ── Approval cards (assistant only) ───────────────────────── */}
          {hasPendingApprovals &&
            message.pendingApprovals!.map((approval) => (
              <ApprovalCard
                key={approval.approvalId}
                approval={approval}
                resolvedStatus={resolvedApprovals?.[approval.approvalId]}
                onApprove={onApprove!}
                onReject={onReject!}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

interface MessageBlockProps {
  content: MessageContent
  isUser: boolean
}

function MessageBlock({ content, isUser }: MessageBlockProps) {
  switch (content.type) {
    case 'text':
      return (
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-full',
            isUser
              ? 'bg-primary/10 text-foreground rounded-tr-sm'
              : 'bg-white border border-border text-foreground rounded-tl-sm shadow-sm'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{content.text}</p>
        </div>
      )

    case 'stats':
      return (
        <div className="w-full">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {content.stats?.map((stat, i) => (
              <div key={i} className="bg-white border border-border rounded-lg p-3 shadow-sm">
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <div className={cn(
                    'flex items-center gap-1 mt-1 text-xs font-medium',
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-500' : 'text-muted-foreground'
                  )}>
                    {stat.changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> :
                     stat.changeType === 'negative' ? <TrendingDown className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    {stat.change}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )

    case 'chart':
      return (
        <div className="w-full bg-white border border-border rounded-lg p-4 shadow-sm">
          <div className="flex gap-6">
            {/* Line chart */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-3">Tổng quan người dùng</p>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={content.chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E2E8F0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {content.chartKeys?.map((key, i) => (
                    <Line
                      key={key}
                      type="monotone"
                      dataKey={key}
                      stroke={i === 0 ? '#287557' : '#3B82F6'}
                      strokeWidth={2}
                      dot={false}
                      name={key === 'users' ? 'Người dùng' : 'Check-in'}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Top list */}
            {content.topList && (
              <div className="w-44 flex-shrink-0">
                <p className="text-xs font-medium text-muted-foreground mb-3">
                  Top 5 tỉnh check-in nhiều nhất
                </p>
                <div className="space-y-1.5">
                  {content.topList.map((item) => (
                    <div key={item.rank} className="flex items-center gap-2">
                      <span className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        item.rank === 1 ? 'bg-amber-100 text-amber-700' :
                        item.rank === 2 ? 'bg-gray-100 text-gray-600' :
                        item.rank === 3 ? 'bg-orange-100 text-orange-700' :
                        'bg-muted text-muted-foreground'
                      )}>
                        {item.rank}
                      </span>
                      <span className="text-xs text-foreground flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )

    case 'recommendations':
      return (
        <div className="w-full bg-white border border-border rounded-lg p-4 shadow-sm">
          <p className="text-xs font-semibold text-foreground mb-3">Gợi ý cải tiến</p>
          <ul className="space-y-2">
            {content.recommendations?.map((rec, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )

    case 'table':
      return (
        <div className="w-full bg-white border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              {content.tableHeaders && (
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    {content.tableHeaders.map((h, i) => (
                      <th key={i} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-border">
                {content.tableRows?.map((row, ri) => (
                  <tr key={ri} className="hover:bg-muted/20">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-4 py-2.5 text-xs text-foreground whitespace-nowrap">
                        {String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )

    default:
      return null
  }
}

/** Thinking indicator shown while AI is generating response */
export function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-white border border-border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-xs text-muted-foreground">TrekViet AI đang suy nghĩ...</span>
        </div>
      </div>
    </div>
  )
}
