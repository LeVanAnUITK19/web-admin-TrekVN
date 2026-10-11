import { Bell, Menu, LogOut, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useAuth } from '@/features/auth/auth.context'
import { getInitials } from '@/lib/utils'
import { useNavigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { toast } from 'sonner'

interface AdminHeaderProps {
  onMenuToggle: () => void
}

const BREADCRUMB_MAP: Record<string, string> = {
  '/dashboard': 'Tổng quan',
  '/users': 'Người dùng',
  '/trekking/places': 'Địa điểm',
  '/trekking/routes': 'Cung đường',
  '/trekking/milestones': 'Cột mốc',
  '/contributions': 'Duyệt đóng góp',
  '/community': 'Cộng đồng',
  '/badges': 'Huy hiệu',
  '/offline-maps': 'Bản đồ offline',
  '/journeys': 'Hành trình',
  '/audit-logs': 'Nhật ký hệ thống',
  '/agent/assistant': 'Trợ lý AI',
  '/agent/map-builder': 'Tạo bản đồ',
  '/agent/tasks': 'Lịch sử tác vụ',
  '/agent': 'AI Agent',
}

export function AdminHeader({ onMenuToggle }: AdminHeaderProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const pageTitle = (() => {
    // Exact match first
    if (BREADCRUMB_MAP[location.pathname]) return BREADCRUMB_MAP[location.pathname]
    // Prefix match for dynamic routes (/agent/tasks/:id, /agent/map-builder/:id, etc.)
    const matched = Object.keys(BREADCRUMB_MAP)
      .filter((k) => location.pathname.startsWith(k + '/'))
      .sort((a, b) => b.length - a.length)[0]
    return matched ? BREADCRUMB_MAP[matched] : 'Admin'
  })()

  const handleLogout = async () => {
    await logout()
    toast.success('Đã đăng xuất')
    navigate(ROUTES.LOGIN)
  }

  return (
    <header className="h-14 bg-white border-b border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-semibold text-foreground text-sm">{pageTitle}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-2 rounded hover:bg-muted text-muted-foreground relative">
          <Bell className="w-4 h-4" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {user ? getInitials(user.name) : 'A'}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-medium text-foreground leading-none">{user?.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">Admin</div>
              </div>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={4}
              className="z-50 min-w-44 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
            >
              <div className="px-3 py-2 border-b border-border">
                <p className="font-medium text-foreground text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted text-muted-foreground outline-none"
                onSelect={() => {}}
              >
                <User className="w-4 h-4" />
                Hồ sơ
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="h-px bg-border my-1" />
              <DropdownMenu.Item
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
                onSelect={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  )
}
