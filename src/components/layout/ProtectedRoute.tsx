import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/auth.context'
import { PageLoader } from '@/components/feedback/PageLoader'
import { ROUTES } from '@/constants'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageLoader />

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (user?.role !== 'ADMIN') {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.status === 'BLOCKED' || user?.status === 'INACTIVE') {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  return <>{children}</>
}
