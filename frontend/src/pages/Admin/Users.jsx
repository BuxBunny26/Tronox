import { useEffect, useState } from 'react'
import { UserPlus, Pencil, Check, X, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { ROLES } from '../../lib/constants'

export default function Users() {
  const { isAdmin } = useAuth()
  const [users, setUsers]     = useState([])
  const [plants, setPlants]   = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editId, setEditId]   = useState(null)
  const [editData, setEditData] = useState({})
  const [saving, setSaving]   = useState(false)

  // Invite form
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteRole, setInviteRole]       = useState('artisan')
  const [invitePlant, setInvitePlant]     = useState('')
  const [inviteName, setInviteName]       = useState('')
  const [inviteError, setInviteError]     = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState('')

  useEffect(() => {
    supabase.from('plants').select('id, name').then(({ data }) => { if (data) setPlants(data) })
    loadUsers()
  }, [])

  async function loadUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*, plants(name)')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    setInviteError('')
    setInviteSuccess('')
    setInviteLoading(true)

    // Create user via Supabase admin invite (requires service role key — not available client-side)
    // Instead we use signUp which sends a confirmation email
    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail,
      password: crypto.randomUUID(), // temporary password — user will need to reset
      options: {
        data: { full_name: inviteName },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      setInviteError(error.message)
      setInviteLoading(false)
      return
    }

    // Update the profile with role and plant
    if (data.user) {
      await supabase.from('profiles').update({
        full_name: inviteName || null,
        role: inviteRole,
        plant_id: invitePlant || null,
      }).eq('id', data.user.id)
    }

    setInviteSuccess(`Invitation sent to ${inviteEmail}. They must set their password via the confirmation email.`)
    setInviteEmail('')
    setInviteRole('artisan')
    setInvitePlant('')
    setInviteName('')
    setInviteLoading(false)
    loadUsers()
  }

  const startEdit = (user) => {
    setEditId(user.id)
    setEditData({ role: user.role, plant_id: user.plant_id ?? '', is_active: user.is_active })
  }

  const saveEdit = async (userId) => {
    setSaving(true)
    await supabase.from('profiles').update({
      role: editData.role,
      plant_id: editData.plant_id || null,
      is_active: editData.is_active,
    }).eq('id', userId)
    setSaving(false)
    setEditId(null)
    loadUsers()
  }

  if (!isAdmin) return (
    <div className="p-8 flex flex-col items-center text-slate-500">
      <ShieldAlert size={36} className="mb-3 text-red-400" />
      <p>You need admin access to manage users.</p>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{users.length} users</p>
        </div>
        <button
          onClick={() => { setInviteOpen(v => !v); setInviteSuccess(''); setInviteError('') }}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800"
        >
          <UserPlus size={15} />
          Invite User
        </button>
      </div>

      {/* Invite Form */}
      {inviteOpen && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-5">
          <h3 className="text-sm font-semibold text-brand-800 mb-3">Invite New User</h3>
          {inviteSuccess && (
            <div className="mb-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              {inviteSuccess}
            </div>
          )}
          {inviteError && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {inviteError}
            </div>
          )}
          <form onSubmit={handleInvite} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input type="email" required value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="user@tronox.com" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
              <input type="text" value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                {ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plant</label>
              <select value={invitePlant} onChange={e => setInvitePlant(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">All plants</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setInviteOpen(false)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancel
              </button>
              <button type="submit" disabled={inviteLoading}
                className="flex items-center gap-2 px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-60">
                {inviteLoading ? 'Sending…' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Plant</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Status</th>
                  <th className="w-24 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.full_name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.full_name ?? '—'}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editId === user.id ? (
                        <select value={editData.role}
                          onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                          className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500">
                          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      ) : (
                        <span className="capitalize text-slate-700">{user.role}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editId === user.id ? (
                        <select value={editData.plant_id ?? ''}
                          onChange={e => setEditData(d => ({ ...d, plant_id: e.target.value }))}
                          className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500">
                          <option value="">All plants</option>
                          {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      ) : (
                        <span className="text-slate-500">{user.plants?.name ?? 'All plants'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editId === user.id ? (
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={editData.is_active}
                            onChange={e => setEditData(d => ({ ...d, is_active: e.target.checked }))}
                            className="accent-brand-600" />
                          Active
                        </label>
                      ) : (
                        <span className={`text-xs font-medium ${user.is_active ? 'text-green-600' : 'text-red-500'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {editId === user.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => saveEdit(user.id)} disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded">
                          <Pencil size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
