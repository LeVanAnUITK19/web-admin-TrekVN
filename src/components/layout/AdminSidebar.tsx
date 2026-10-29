import { NavLink, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/constants'
import {
  LayoutDashboard, Users, MapPin, Route, Flag,
  Star, MessageSquare, Award, Map, Navigation,
  ClipboardList, ChevronDown, ChevronRight,
  Mountain, Bot, MessageCircle, MapPinned, ListTodo,
  TrendingUp, Trophy,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  label: string
  path?: string
  icon: React.ElementType
  children?: NavItem[]
  badge?: number
}

interface AdminSidebarProps {
  collapsed?: boolean
  pendingContributions?: number
}

export function AdminSidebar({ collapsed = false, pendingContributions }: AdminSidebarProps) {
  const location = useLocation()
  const [trekkingOpen, setTrekkingOpen] = useState(
    location.pathname.startsWith('/trekking')
  )
  const [agentOpen, setAgentOpen] = useState(
    location.pathname.startsWith('/agent')
  )
  const [gamificationOpen, setGamificationOpen] = useState(
    location.pathname.startsWith('/ranks') ||
    location.pathname.startsWith('/badges')
  )

  const navItems: NavItem[] = [
    { label: 'Tổng quan', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Người dùng', path: ROUTES.USERS, icon: Users },
    {
      label: 'Địa điểm',
      icon: Mountain,
      children: [
        { label: 'Địa điểm', path: ROUTES.TREKKING_PLACES, icon: MapPin },
        { label: 'Cung đường', path: ROUTES.TREKKING_ROUTES, icon: Route },
        { label: 'Cột mốc', path: ROUTES.TREKKING_MILESTONES, icon: Flag },
      ],
    },
    {
      label: 'Đóng góp',
      path: ROUTES.CONTRIBUTIONS,
      icon: Star,
      badge: pendingContributions,
    },
    { label: 'Bài viết cộng đồng', path: ROUTES.COMMUNITY, icon: MessageSquare },
    { label: 'Đánh giá địa điểm', path: ROUTES.PLACE_REVIEWS, icon: Star },
    {
      label: 'Gamification',
      icon: TrendingUp,
      children: [
        { label: 'Huy hiệu', path: ROUTES.BADGES, icon: Award },
        { label: 'Cấp rank', path: ROUTES.RANKS, icon: Trophy },
      ],
    },
    { label: 'Bản đồ offline', path: ROUTES.OFFLINE_MAPS, icon: Map },
    { label: 'Nhật ký hệ thống', path: ROUTES.AUDIT_LOGS, icon: ClipboardList },
    {
      label: 'AI Agent',
      icon: Bot,
      children: [
        { label: 'Trợ lý AI', path: ROUTES.AGENT_ASSISTANT, icon: MessageCircle },
        { label: 'Tạo bản đồ', path: ROUTES.AGENT_MAP_BUILDER, icon: MapPinned },
        { label: 'Lịch sử tác vụ', path: ROUTES.AGENT_TASKS, icon: ListTodo },
      ],
    },
    { label: 'Cài đặt', path: '#', icon: Navigation },
  ]

  /** Render a group item (has children) with toggle */
  const renderGroup = (
    item: NavItem,
    isOpen: boolean,
    onToggle: () => void
  ) => {
    const isGroupActive = item.children!.some(
      (c) => c.path && location.pathname.startsWith(c.path)
    )
    const open = isOpen || isGroupActive

    return (
      <div key={item.label}>
        <button
          onClick={onToggle}
          className={cn(
            'sidebar-item w-full justify-between',
            isGroupActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
          )}
        >
          <span className="flex items-center gap-3">
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </span>
          {!collapsed && (
            open
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
            {item.children!.map((child) => (
              <NavLink key={child.path} to={child.path!} end>
                {({ isActive }) => (
                  <div
                    className={cn(
                      'sidebar-item',
                      isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                    )}
                  >
                    <child.icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{child.label}</span>
                  </div>
                )}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-brand-darkGreen text-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-green rounded-lg flex items-center justify-center">
          <Mountain className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <div className="font-bold text-white text-base leading-none">TrekViệt</div>
            <div className="text-white/50 text-xs mt-0.5">Admin Portal</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map((item) => {
          // ── Group: Địa điểm ──────────────────────────────
          if (item.label === 'Địa điểm' && item.children) {
            return renderGroup(item, trekkingOpen, () => setTrekkingOpen((v) => !v))
          }

          // ── Group: Gamification ──────────────────────────
          if (item.label === 'Gamification' && item.children) {
            return renderGroup(item, gamificationOpen, () => setGamificationOpen((v) => !v))
          }

          // ── Group: AI Agent ──────────────────────────────
          if (item.label === 'AI Agent' && item.children) {
            return renderGroup(item, agentOpen, () => setAgentOpen((v) => !v))
          }

          // ── Disabled placeholder ─────────────────────────
          if (item.path === '#') {
            return (
              <div
                key={item.label}
                className={cn('sidebar-item sidebar-item-inactive opacity-50 cursor-not-allowed')}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </div>
            )
          }

          // ── Regular item ──────────────────────────────────
          return (
            <NavLink
              key={item.path}
              to={item.path!}
              end={item.path === ROUTES.DASHBOARD}
            >
              {({ isActive }) => (
                <div
                  className={cn(
                    'sidebar-item relative',
                    isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="bg-warning text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center leading-none">
                      {item.badge}
                    </span>
                  )}
                  {collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-warning rounded-full" />
                  )}
                </div>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
