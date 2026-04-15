import { useState } from 'react'
import { Moon, Sun, Check, X } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { ROLES } from '../../lib/constants'
import Users from './Users'

const TABS = ['Appearance', 'Users & Roles', 'My Profile']

// Permission matrix for the Roles tab
const PERMISSIONS = [
  { label: 'Create job cards',       admin: true,  planner: true,  supervisor: false, artisan: false, analyst: false, client: false },
  { label: 'Edit job cards',         admin: true,  planner: true,  supervisor: true,  artisan: false, analyst: false, client: false },
  { label: 'Complete job cards',     admin: true,  planner: true,  supervisor: true,  artisan: true,  analyst: false, client: false },
  { label: 'Delete job cards',       admin: true,  planner: false, supervisor: false, artisan: false, analyst: false, client: false },
  { label: 'View all job cards',     admin: true,  planner: true,  supervisor: true,  artisan: false, analyst: true,  client: false },
  { label: 'View assigned cards',    admin: true,  planner: true,  supervisor: true,  artisan: true,  analyst: true,  client: false },
  { label: 'View plant cards',       admin: true,  planner: true,  supervisor: true,  artisan: false, analyst: true,  client: true  },
  { label: 'View analytics',         admin: true,  planner: true,  supervisor: true,  artisan: false, analyst: true,  client: false },
  { label: 'Manage users',           admin: true,  planner: false, supervisor: false, artisan: false, analyst: false, client: false },
  { label: 'Manage reference data',  admin: true,  planner: false, supervisor: false, artisan: false, analyst: false, client: false },
]

function Tick({ yes }) {
  return yes
    ? <Check size={14} className="text-accent-500 mx-auto" />
    : <span className="text-slate-200 mx-auto block text-center">—</span>
}

export default function Settings() {
  const { dark, setDark } = useTheme()
  const { profile, refreshProfile } = useAuth()
  const [tab, setTab] = useState('Appearance')
  const [roleTab, setRoleTab] = useState('Users')

  // My Profile state
  const [name, setName]         = useState(profile?.full_name ?? '')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [saveError, setSaveError] = useState('')

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    setSaveError('')
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name || null })
      .eq('id', profile.id)
    setSaving(false)
    if (error) { setSaveError(error.message); return }
    setSaved(true)
    refreshProfile()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Portal configuration and user management</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'bg-white border border-b-0 border-slate-200 text-brand-700 -mb-px'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Appearance ── */}
      {tab === 'Appearance' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-lg">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Appearance</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {dark ? <Moon size={18} className="text-accent-500" /> : <Sun size={18} className="text-accent-500" />}
                <div>
                  <p className="text-sm font-medium text-slate-800">Dark mode</p>
                  <p className="text-xs text-slate-500">Switch between light and dark interface</p>
                </div>
              </div>
              <button
                onClick={() => setDark(d => !d)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${dark ? 'bg-accent-500' : 'bg-slate-300'}`}
                aria-label="Toggle dark mode"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Users & Roles ── */}
      {tab === 'Users & Roles' && (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-5">
            {['Users', 'Role Permissions'].map(st => (
              <button
                key={st}
                onClick={() => setRoleTab(st)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  roleTab === st
                    ? 'bg-brand-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {roleTab === 'Users' && <Users />}

          {roleTab === 'Role Permissions' && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Role Permissions Matrix</h2>
                <span className="text-xs text-slate-400">Read-only — controlled by database policies</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide w-52">Permission</th>
                      {ROLES.map(r => (
                        <th key={r.value} className="px-3 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide text-center">
                          <div>{r.label}</div>
                          <div className="text-slate-400 font-normal normal-case mt-0.5 hidden md:block">{r.description}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {PERMISSIONS.map(p => (
                      <tr key={p.label} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-700 font-medium">{p.label}</td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.admin} /></td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.planner} /></td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.supervisor} /></td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.artisan} /></td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.analyst} /></td>
                        <td className="px-3 py-2.5 text-center"><Tick yes={p.client} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Role legend */}
              <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 grid grid-cols-2 md:grid-cols-3 gap-3">
                {ROLES.map(r => (
                  <div key={r.value} className="flex items-start gap-2">
                    <span className="inline-block mt-0.5 w-2 h-2 rounded-full bg-accent-500 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{r.label}</p>
                      <p className="text-xs text-slate-500">{r.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── My Profile ── */}
      {tab === 'My Profile' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden max-w-lg">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">My Profile</h2>
          </div>
          <form onSubmit={handleSaveProfile} className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={profile?.email ?? ''}
                disabled
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <input
                type="text"
                value={profile?.role ?? ''}
                disabled
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 capitalize cursor-not-allowed"
              />
            </div>
            {saveError && (
              <p className="text-xs text-red-600">{saveError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {saved && <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} /> Saved</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
