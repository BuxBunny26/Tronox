import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plants(*)')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) fetchProfile(u.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          fetchProfile(u.id)
          if (_event === 'SIGNED_IN') {
            supabase.from('login_events').insert({ user_id: u.id }).then(() => {})
          }
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signOut = () => supabase.auth.signOut()

  const refreshProfile = () => user && fetchProfile(user.id)

  const role = profile?.role

  const value = {
    user,
    profile,
    loading,
    role,
    signIn,
    signOut,
    refreshProfile,
    // Convenience permission flags
    isAdmin:          role === 'admin',
    isPlanner:        ['admin', 'planner'].includes(role),
    isSupervisor:     ['admin', 'planner', 'supervisor'].includes(role),
    canCreate:        ['admin', 'planner'].includes(role),
    canEdit:          ['admin', 'planner', 'supervisor'].includes(role),
    canComplete:      ['admin', 'planner', 'supervisor', 'artisan'].includes(role),
    canViewAnalytics: ['admin', 'planner', 'supervisor', 'analyst'].includes(role),
    canManageUsers:   role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
