import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export default function ProtectedRoute({ requiredRole, children }) {
  const { user, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return children ?? <Outlet />
}
