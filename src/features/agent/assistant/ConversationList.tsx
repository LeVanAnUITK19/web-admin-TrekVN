import { useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Archive, Trash2, Search, MessageCircle } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'
import { formatConvTime } from './useAssistant'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | null
  isLoading: boolean
  onSelect: (id: string) => void
  onNew: () => void
  onRename: (conv: Conversation) => void
  onDelete: (conv: Conversation) => void
}

export function ConversationList({
  conversations,
  activeId,
  isLoading,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Cuộc trò chuyện</h3>
        </div>
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          Cuộc trò chuyện mới
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-border flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-1">
        {isLoading ? (
          <div className="space-y-1.5 px-2 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-md animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {search ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện'}
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {filtered.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeId}
                onSelect={() => onSelect(conv.id)}
                onRename={() => onRename(conv)}
                onDelete={() => onDelete(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface ConversationItemProps {
  conv: Conversation
  isActive: boolean
  onSelect: () => void
  onRename: () => void
  onDelete: () => void
}

function ConversationItem({ conv, isActive, onSelect, onRename, onDelete }: ConversationItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={cn(
        'group flex items-start gap-2 px-2 py-2.5 rounded-md cursor-pointer transition-colors',
        isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/60'
      )}
      onClick={onSelect}
    >
      <MessageCircle
        className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', isActive ? 'text-primary' : 'text-muted-foreground')}
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-xs font-medium truncate leading-tight',
            isActive ? 'text-primary' : 'text-foreground'
          )}
        >
          {conv.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatConvTime(conv.updatedAt)}
        </p>
      </div>

      {/* Context menu */}
      <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenu.Trigger asChild onClick={(e) => e.stopPropagation()}>
          <button
            className={cn(
              'flex-shrink-0 p-0.5 rounded hover:bg-muted-foreground/10 transition-colors',
              menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
          >
            <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-36 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none"
              onSelect={onRename}
            >
              <Pencil className="w-3.5 h-3.5" /> Đổi tên
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none text-muted-foreground"
              onSelect={() => {}}
            >
              <Archive className="w-3.5 h-3.5" /> Lưu trữ
            </DropdownMenu.Item>
            <DropdownMenu.Separator className="h-px bg-border my-1" />
            <DropdownMenu.Item
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
              onSelect={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" /> Xóa
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  )
}
