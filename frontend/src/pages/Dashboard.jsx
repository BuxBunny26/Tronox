import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import {
  ClipboardList, CheckCircle, Clock, AlertTriangle,
  TrendingUp, AlarmClock, Plus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import StatsCard from '../components/StatsCard'
import Badge from '../components/Badge'
import { formatDate } from '../lib/utils'
import { DELAY_CODES } from '../lib/constants'

const STATUS_COLORS = {
  open:        '#3b82f6',
  in_progress: '#f59e0b',
  completed:   '#22c55e',
  closed:      '#94a3b8',
  draft:       '#cbd5e1',
  cancelled:   '#ef4444',
}

const CHART_COLORS = ['#3b82f6','#f97316','#22c55e','#a855f7','#ef4444','#06b6d4','#f59e0b','#10b981']

export default function Dashboard() {
  const { canCreate, canViewAnalytics } = useAuth()
  const [stats, setStats]       = useState(null)
  const [statusData, setStatusData]   = useState([])
  const [delayData, setDelayData]     = useState([])
  const [recentCards, setRecentCards] = useState([])
  const [plantFilter, setPlantFilter] = useState('all')
  const [plants, setPlants]           = useState([])
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    supabase.from('plants').select('id, name, code').then(({ data }) => {
      if (data) setPlants(data)
    })
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [plantFilter])

  async function loadDashboard() {
    setLoading(true)

    // Build base query
    let q = supabase.from('job_cards').select('id, status, basic_start_date, plant_id')
    if (plantFilter !== 'all') q = q.eq('plant_id', plantFilter)
    const { data: all } = await q

    if (all) {
      const total      = all.length
      const completed  = all.filter(j => j.status === 'completed' || j.status === 'closed').length
      const open       = all.filter(j => j.status === 'open').length
      const inProgress = all.filter(j => j.status === 'in_progress').length
      const today      = new Date().toISOString().slice(0, 10)
      const overdue    = all.filter(j =>
        ['open','in_progress'].includes(j.status) && j.basic_start_date < today
      ).length

      setStats({ total, completed, open, inProgress, overdue,
        completionRate: total ? Math.round((completed / total) * 100) : 0 })

      // Status breakdown for pie chart
      const statusCount = {}
      all.forEach(j => { statusCount[j.status] = (statusCount[j.status] ?? 0) + 1 })
      setStatusData(Object.entries(statusCount).map(([name, value]) => ({ name, value })))
    }

    // Delay code frequency
    let dq = supabase.from('job_card_delays').select('delay_code, job_cards!inner(plant_id)')
    if (plantFilter !== 'all') dq = dq.eq('job_cards.plant_id', plantFilter)
    const { data: delays } = await dq
    if (delays) {
      const freq = {}
      delays.forEach(d => { freq[d.delay_code] = (freq[d.delay_code] ?? 0) + 1 })
      const sorted = Object.entries(freq)
        .sort(([,a],[,b]) => b - a)
        .slice(0, 8)
        .map(([code, count]) => ({
          code,
          count,
          label: DELAY_CODES.find(d => d.code === code)?.description.replace(/^(Delay|Not Done): /, '') ?? code,
        }))
      setDelayData(sorted)
    }

    // Recent cards
    let rq = supabase
      .from('job_cards')
      .select('id, order_no, description_of_work_order, status, basic_start_date, plants(name)')
      .order('updated_at', { ascending: false })
      .limit(8)
    if (plantFilter !== 'all') rq = rq.eq('plant_id', plantFilter)
    const { data: recent } = await rq
    if (recent) setRecentCards(recent)

    setLoading(false)
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Condition monitoring overview</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={plantFilter}
            onChange={e => setPlantFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Plants</option>
            {plants.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {canCreate && (
            <Link
              to="/job-cards/new"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
            >
              <Plus size={15} />
              New Job Card
            </Link>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatsCard
          label="Total Job Cards"
          value={loading ? '…' : stats?.total}
          icon={ClipboardList}
        />
        <StatsCard
          label="Completed"
          value={loading ? '…' : stats?.completed}
          icon={CheckCircle}
          className="border-green-200"
        />
        <StatsCard
          label="In Progress"
          value={loading ? '…' : stats?.inProgress}
          icon={Clock}
        />
        <StatsCard
          label="Overdue"
          value={loading ? '…' : stats?.overdue}
          icon={AlertTriangle}
          accent
          className={stats?.overdue > 0 ? 'border-red-200' : ''}
        />
      </div>

      {/* Completion Rate Banner */}
      {!loading && stats && (
        <div className="bg-brand-700 text-white rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <TrendingUp size={20} className="text-accent-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-brand-200">Overall Completion Rate</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 h-2 bg-brand-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-500 rounded-full transition-all"
                  style={{ width: `${stats.completionRate}%` }}
                />
              </div>
              <span className="text-lg font-bold">{stats.completionRate}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts row */}
      {canViewAnalytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Status Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Status Breakdown</h3>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) =>
                      `${name} ${Math.round(percent * 100)}%`
                    }
                    labelLine={false}
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-12 text-center">No data</p>
            )}
          </div>

          {/* Top Delay Codes */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Top Delay Reasons</h3>
            {delayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={delayData} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={140} />
                  <Tooltip formatter={(v) => [v, 'Occurrences']} />
                  <Bar dataKey="count" fill="#f97316" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 py-12 text-center">No delay data recorded</p>
            )}
          </div>
        </div>
      )}

      {/* Recent job cards */}
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-700">Recent Job Cards</h3>
          <Link to="/job-cards" className="text-xs text-brand-600 hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading…</div>
        ) : recentCards.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No job cards yet</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {recentCards.map(card => (
              <Link
                key={card.id}
                to={`/job-cards/${card.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <AlarmClock size={15} className="text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {card.description_of_work_order || card.order_no}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {card.order_no} · {card.plants?.name ?? '—'} · {formatDate(card.basic_start_date)}
                  </p>
                </div>
                <Badge status={card.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
