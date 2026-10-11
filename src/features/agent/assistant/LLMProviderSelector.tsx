import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ChevronDown, CircleDot, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LLMProvider } from '@/types'

interface LLMProviderSelectorProps {
  providers: LLMProvider[]
  selectedId: string
  onSelect: (id: string) => void
  isLoading?: boolean
}

const STATUS_DOT: Record<LLMProvider['status'], { cls: string; label: string }> = {
  available: { cls: 'text-green-500', label: 'Available' },
  unavailable: { cls: 'text-red-400', label: 'Unavailable' },
  disabled: { cls: 'text-gray-400', label: 'Disabled' },
}

export function LLMProviderSelector({
  providers,
  selectedId,
  onSelect,
  isLoading,
}: LLMProviderSelectorProps) {
  const selected = providers.find((p) => p.id === selectedId)

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-md bg-white hover:bg-muted transition-colors outline-none focus:ring-2 focus:ring-primary/20">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs',
                  selected?.status === 'available' ? 'text-green-500' : 'text-gray-400'
                )}
              >
                ●
              </span>
              <span className="font-medium text-foreground">
                {selected?.label ?? 'Auto'}
              </span>
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-52 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
        >
          <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b border-border mb-1">
            Chọn Model
          </div>
          {providers.map((p) => {
            const dot = STATUS_DOT[p.status] ?? { cls: 'text-gray-400', label: p.status }
            const isDisabled = p.status === 'disabled'
            const isSelected = p.id === selectedId
            return (
              <DropdownMenu.Item
                key={p.id}
                disabled={isDisabled}
                onSelect={() => !isDisabled && onSelect(p.id)}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5 outline-none cursor-pointer',
                  isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted',
                  isSelected ? 'bg-primary/5' : ''
                )}
              >
                <span className={cn('mt-0.5 text-sm leading-none', dot.cls)}>●</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
                      {p.label}
                    </span>
                    {isSelected && (
                      <span className="text-xs text-primary font-medium">✓</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                  {p.status === 'unavailable' && (
                    <p className="text-xs text-red-500 mt-0.5">Không khả dụng</p>
                  )}
                </div>
                {/* Dot icon for available/unavailable */}
                {p.status === 'available' ? (
                  <CircleDot className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 mt-0.5" />
                )}
              </DropdownMenu.Item>
            )
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
