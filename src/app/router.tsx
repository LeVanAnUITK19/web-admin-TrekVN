/* eslint-disable react-refresh/only-export-components */
import React, { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import { ROUTES } from '@/constants'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { PageLoader } from '@/components/feedback/PageLoader'
import LoginPage from '@/features/auth/LoginPage'
import { usePlace } from '@/features/trekking/places/usePlaces'
import { useRoute } from '@/features/trekking/routes/useRoutes'
import { useMilestone } from '@/features/trekking/milestones/useMilestones'

// Lazy-loaded list pages
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const UsersPage = lazy(() => import('@/features/users/UsersPage'))
const UserFormPage = lazy(() => import('@/features/users/UserFormPage'))
const PlacesPage = lazy(() => import('@/features/trekking/places/PlacesPage'))
const PlaceFormPage = lazy(() => import('@/features/trekking/places/PlaceFormPage'))
const PlaceDetailPage = lazy(() => import('@/features/trekking/places/PlaceDetailPage'))
const RoutesPage = lazy(() => import('@/features/trekking/routes/RoutesPage'))
const RouteFormPage = lazy(() => import('@/features/trekking/routes/RouteFormPage'))
const MilestonesPage = lazy(() => import('@/features/trekking/milestones/MilestonesPage'))
const MilestoneFormPage = lazy(() => import('@/features/trekking/milestones/MilestoneFormPage'))
const ContributionsPage = lazy(() => import('@/features/contributions/ContributionsPage'))
const CommunityPage = lazy(() => import('@/features/community/CommunityPage'))
const BadgesPage = lazy(() => import('@/features/badges/BadgesPage'))
const BadgeFormPage = lazy(() => import('@/features/badges/BadgeFormPage'))
const OfflineMapsPage = lazy(() => import('@/features/offline-maps/OfflineMapsPage'))
const OfflineMapFormPage = lazy(() => import('@/features/offline-maps/OfflineMapFormPage'))
const PlaceOfflineMapDetailPage = lazy(() => import('@/features/offline-maps/PlaceOfflineMapDetailPage'))
const JourneysPage = lazy(() => import('@/features/journeys/JourneysPage'))
const AuditLogsPage = lazy(() => import('@/features/audit-logs/AuditLogsPage'))
const RanksPage = lazy(() => import('@/features/ranks/RanksPage'))

// ── AI Agent pages ─────────────────────────────────────────────────────────
const AssistantPage = lazy(() => import('@/features/agent/assistant/AssistantPage'))
const AgentTasksPage = lazy(() => import('@/features/agent/tasks/AgentTasksPage'))
const AgentTaskDetailPage = lazy(() => import('@/features/agent/tasks/AgentTaskDetailPage'))
const MapBuilderPage = lazy(() => import('@/features/agent/map-builder/MapBuilderPage'))
const MapBuilderJobPage = lazy(() => import('@/features/agent/map-builder/MapBuilderJobPage'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>
}

// Edit wrappers – load the item from params then pass to form
function PlaceEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: place, isLoading, isError } = usePlace(id ?? '')

  if (isLoading) return <PageLoader />
  if (isError || !place) return <Navigate to={ROUTES.TREKKING_PLACES} replace />

  return (
    <SuspenseWrapper>
      <PlaceFormPage editPlace={place} />
    </SuspenseWrapper>
  )
}

function RouteEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: route, isLoading, isError } = useRoute(id ?? '')

  if (isLoading) return <PageLoader />
  if (isError || !route) return <Navigate to={ROUTES.TREKKING_ROUTES} replace />

  return (
    <SuspenseWrapper>
      <RouteFormPage editRoute={route} />
    </SuspenseWrapper>
  )
}

function MilestoneEditPage() {
  const { id } = useParams<{ id: string }>()
  const { data: milestone, isLoading, isError } = useMilestone(id ?? '')
  if (isLoading) return <PageLoader />
  if (isError || !milestone) return <Navigate to={ROUTES.TREKKING_MILESTONES} replace />
  return <SuspenseWrapper><MilestoneFormPage editMilestone={milestone} /></SuspenseWrapper>
}

// BadgeFormPage reads its own :id via useParams

function OfflineMapEditPage() {
  return <SuspenseWrapper><OfflineMapFormPage /></SuspenseWrapper>
}

export const router = createBrowserRouter([
  {
    path: ROUTES.LOGIN,
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to={ROUTES.DASHBOARD} replace />,
      },
      {
        path: ROUTES.DASHBOARD,
        element: <SuspenseWrapper><DashboardPage /></SuspenseWrapper>,
      },

      // ── Users ──────────────────────────────────────────────
      {
        path: ROUTES.USERS,
        element: <SuspenseWrapper><UsersPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.USERS_CREATE,
        element: <SuspenseWrapper><UserFormPage /></SuspenseWrapper>,
      },

      // ── Trekking: Places ───────────────────────────────────
      {
        path: ROUTES.TREKKING_PLACES,
        element: <SuspenseWrapper><PlacesPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.TREKKING_PLACES_CREATE,
        element: <SuspenseWrapper><PlaceFormPage /></SuspenseWrapper>,
      },
      {
        path: '/trekking/places/:id',
        element: <SuspenseWrapper><PlaceDetailPage /></SuspenseWrapper>,
      },
      {
        path: '/trekking/places/:id/edit',
        element: <PlaceEditPage />,
      },

      // ── Trekking: Routes ───────────────────────────────────
      {
        path: ROUTES.TREKKING_ROUTES,
        element: <SuspenseWrapper><RoutesPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.TREKKING_ROUTES_CREATE,
        element: <SuspenseWrapper><RouteFormPage /></SuspenseWrapper>,
      },
      {
        path: '/trekking/routes/:id/edit',
        element: <RouteEditPage />,
      },

      // ── Trekking: Milestones ───────────────────────────────
      {
        path: ROUTES.TREKKING_MILESTONES,
        element: <SuspenseWrapper><MilestonesPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.TREKKING_MILESTONES_CREATE,
        element: <SuspenseWrapper><MilestoneFormPage /></SuspenseWrapper>,
      },
      {
        path: '/trekking/milestones/:id/edit',
        element: <MilestoneEditPage />,
      },

      // ── Contributions ──────────────────────────────────────
      {
        path: ROUTES.CONTRIBUTIONS,
        element: <SuspenseWrapper><ContributionsPage /></SuspenseWrapper>,
      },

      // ── Community ──────────────────────────────────────────
      {
        path: ROUTES.COMMUNITY,
        element: <SuspenseWrapper><CommunityPage /></SuspenseWrapper>,
      },

      // ── Badges ─────────────────────────────────────────────
      {
        path: ROUTES.BADGES,
        element: <SuspenseWrapper><BadgesPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.BADGES_CREATE,
        element: <SuspenseWrapper><BadgeFormPage /></SuspenseWrapper>,
      },
      {
        path: '/badges/:id/edit',
        element: <SuspenseWrapper><BadgeFormPage /></SuspenseWrapper>,
      },

      // ── Offline Maps ───────────────────────────────────────
      {
        path: ROUTES.OFFLINE_MAPS,
        element: <SuspenseWrapper><OfflineMapsPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.OFFLINE_MAPS_CREATE,
        element: <SuspenseWrapper><OfflineMapFormPage /></SuspenseWrapper>,
      },
      {
        path: '/offline-maps/:id/edit',
        element: <OfflineMapEditPage />,
      },
      {
        // Trang xem/cập nhật embedded offlineMap của TrekkingPlace (Agent Map Builder)
        path: '/offline-maps/place/:placeId',
        element: <SuspenseWrapper><PlaceOfflineMapDetailPage /></SuspenseWrapper>,
      },

      // ── Other ──────────────────────────────────────────────
      {
        path: ROUTES.JOURNEYS,
        element: <SuspenseWrapper><JourneysPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.AUDIT_LOGS,
        element: <SuspenseWrapper><AuditLogsPage /></SuspenseWrapper>,
      },

      // ── Gamification ───────────────────────────────────────
      {
        path: ROUTES.RANKS,
        element: <SuspenseWrapper><RanksPage /></SuspenseWrapper>,
      },

      // ── AI Agent ───────────────────────────────────────────
      {
        path: ROUTES.AGENT,
        element: <Navigate to={ROUTES.AGENT_ASSISTANT} replace />,
      },
      {
        path: ROUTES.AGENT_ASSISTANT,
        element: <SuspenseWrapper><AssistantPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.AGENT_TASKS,
        element: <SuspenseWrapper><AgentTasksPage /></SuspenseWrapper>,
      },
      {
        path: '/agent/tasks/:jobId',
        element: <SuspenseWrapper><AgentTaskDetailPage /></SuspenseWrapper>,
      },
      {
        path: ROUTES.AGENT_MAP_BUILDER,
        element: <SuspenseWrapper><MapBuilderPage /></SuspenseWrapper>,
      },
      {
        path: '/agent/map-builder/:jobId',
        element: <SuspenseWrapper><MapBuilderJobPage /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.DASHBOARD} replace />,
  },
])
