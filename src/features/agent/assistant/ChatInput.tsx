import { useRef, useState, useCallback } from 'react'
import { Send, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (text: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, disabled, placeholder = 'Hỏi tôi về TrekViệt...' }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback(() => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="border-t border-border bg-white px-4 py-3">
      <div className="flex items-end gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
        {/* Attachment button (UI only, no upload yet) */}
        <button
          type="button"
          title="Đính kèm (chưa khả dụng)"
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors mb-0.5 opacity-50 cursor-not-allowed"
          disabled
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            'flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none leading-relaxed py-1',
            'min-h-[32px] max-h-[160px]',
            disabled ? 'opacity-50' : ''
          )}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all mb-0.5',
            canSend
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-center">
        Nhấn <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> để gửi,{' '}
        <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">Shift+Enter</kbd> để xuống dòng
      </p>
    </div>
  )
}
