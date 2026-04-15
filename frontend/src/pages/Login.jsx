import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname ?? '/dashboard'

  // views: 'login' | 'forgot' | 'sent' | 'reset'
  const [view, setView] = useState('login')

  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [newPassword, setNewPassword]   = useState('')
  const [confirmPwd, setConfirmPwd]     = useState('')
  const [showPwd, setShowPwd]           = useState(false)
  const [showNewPwd, setShowNewPwd]     = useState(false)
  const [error, setError]               = useState('')
  const [loading, setLoading]           = useState(false)

  // Detect password recovery token in URL hash (after clicking reset link in email)
  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      setView('reset')
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) {
      setError('Invalid email or password. Please try again.')
      return
    }
    navigate(from, { replace: true })
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login',
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setView('sent')
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPwd) { setError('Passwords do not match.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: newPassword })
    setLoading(false)
    if (err) { setError(err.message); return }
    window.location.hash = ''
    navigate('/dashboard', { replace: true })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative"
      style={{
        backgroundImage: 'url(/site-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-brand-900/75" />

      {/* Card */}
      <div className="w-full max-w-sm relative z-10">
        {/* Branding */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Tronox" className="h-16 w-auto object-contain mx-auto mb-4 drop-shadow-lg" />
          <h1 className="text-2xl font-bold text-white">Tronox CM Portal</h1>
          <p className="text-slate-300 text-sm mt-1">Condition Monitoring — Powered by Wearcheck</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6">

          {/* ── Sign In ── */}
          {view === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-5">Sign in to your account</h2>
              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input
                    type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPwd ? 'text' : 'password'} required autoComplete="current-password"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors mt-1">
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button onClick={() => { setView('forgot'); setError('') }}
                  className="text-sm text-brand-600 hover:text-brand-800 hover:underline">
                  Forgot your password?
                </button>
              </div>
            </>
          )}

          {/* ── Forgot Password ── */}
          {view === 'forgot' && (
            <>
              <button onClick={() => { setView('login'); setError('') }}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
                <ArrowLeft size={14} /> Back to sign in
              </button>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Reset your password</h2>
              <p className="text-sm text-slate-500 mb-5">Enter your email and we'll send you a reset link.</p>
              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input
                    type="email" required autoComplete="email"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="you@example.com"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

          {/* ── Email Sent Confirmation ── */}
          {view === 'sent' && (
            <div className="text-center py-2">
              <CheckCircle size={40} className="text-accent-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-slate-800 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 mb-5">
                We've sent a reset link to <strong>{email}</strong>. Follow the instructions in the email.
              </p>
              <button onClick={() => { setView('login'); setError(''); setEmail('') }}
                className="text-sm text-brand-600 hover:text-brand-800 hover:underline">
                Back to sign in
              </button>
            </div>
          )}

          {/* ── Set New Password (after clicking email link) ── */}
          {view === 'reset' && (
            <>
              <h2 className="text-lg font-semibold text-slate-800 mb-1">Set new password</h2>
              <p className="text-sm text-slate-500 mb-5">Choose a new password for your account.</p>
              {error && (
                <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? 'text' : 'password'} required
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2.5 pr-10 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                      placeholder="Min. 8 characters"
                    />
                    <button type="button" onClick={() => setShowNewPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
                  <input
                    type="password" required
                    value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors">
                  {loading ? 'Updating…' : 'Update Password'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-slate-300 text-xs mt-6">
          Access is restricted to authorised personnel only.
          <br />Contact your administrator if you need access.
        </p>
      </div>
    </div>
  )
}
