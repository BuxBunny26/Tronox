import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  LogOut,
  X,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard, always: true },
  { to: '/job-cards',  label: 'Job Cards',  icon: ClipboardList,   always: true },
  { to: '/admin/users',label: 'Users',      icon: Users,           adminOnly: true },
]

export default function Sidebar({ onClose }) {
  const { profile, signOut, canManageUsers } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const items = navItems.filter(item =>
    item.always || (item.adminOnly && canManageUsers)
  )

  return (
    <div className="flex flex-col h-full bg-brand-700 text-white w-64">
      {/* Logo / Header */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-brand-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Tronox" className="h-7 w-auto object-contain" />
          <div className="leading-tight">
            <p className="font-bold text-sm text-white">Tronox CM</p>
            <p className="text-brand-300 text-xs">Condition Monitoring</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded text-brand-300 hover:text-white hover:bg-brand-600"
        >
          <X size={16} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-600 hover:text-white'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-accent-400' : 'text-brand-300 group-hover:text-white'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-brand-300" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + sign out */}
      <div className="border-t border-brand-600 p-3 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-xs text-brand-300 capitalize">{profile?.role ?? '—'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-brand-200 hover:bg-brand-600 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  )
}
