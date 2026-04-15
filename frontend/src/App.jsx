import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import JobCardList from './pages/JobCards/JobCardList'
import JobCardForm from './pages/JobCards/JobCardForm'
import JobCardDetail from './pages/JobCards/JobCardDetail'
import CompletionForm from './pages/JobCards/CompletionForm'
import Users from './pages/Admin/Users'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="job-cards" element={<JobCardList />} />
              <Route path="job-cards/new" element={<JobCardForm />} />
              <Route path="job-cards/:id" element={<JobCardDetail />} />
              <Route path="job-cards/:id/edit" element={<JobCardForm />} />
              <Route path="job-cards/:id/complete" element={<CompletionForm />} />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <Users />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
