import { useEffect, useState, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Search, Filter, ChevronRight, AlarmClock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDate } from '../../lib/utils'
import { JOB_STATUSES } from '../../lib/constants'

export default function JobCardList() {
  const { canCreate, role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [cards, setCards]   = useState([])
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  const search    = searchParams.get('search') ?? ''
  const status    = searchParams.get('status') ?? ''
  const plantId   = searchParams.get('plant') ?? ''
  const page      = parseInt(searchParams.get('page') ?? '1', 10)
  const PAGE_SIZE = 20

  useEffect(() => {
    supabase.from('plants').select('id, name').then(({ data }) => {
      if (data) setPlants(data)
    })
  }, [])

  const loadCards = useCallback(async () => {
    setLoading(true)

    let q = supabase
      .from('job_cards')
      .select(`
        id, order_no, description_of_work_order, status, basic_start_date,
        order_priority, maintenance_activity_type, assigned_to,
        plants(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (status)  q = q.eq('status', status)
    if (plantId) q = q.eq('plant_id', plantId)
    if (search)  q = q.or(
      `order_no.ilike.%${search}%,description_of_work_order.ilike.%${search}%`
    )

    const { data, count, error } = await q
    if (!error && data) {
      setCards(data)
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }, [search, status, plantId, page])

  useEffect(() => { loadCards() }, [loadCards])

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams)
    if (val) next.set(key, val); else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  const today = new Date().toISOString().slice(0, 10)
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Job Cards</h1>
          <p className="text-sm text-slate-500 mt-0.5">{totalCount} total records</p>
        </div>
        {canCreate && (
          <Link
            to="/job-cards/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 transition-colors"
          >
            <Plus size={15} />
            New Job Card
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search order no. or description…"
            value={search}
            onChange={e => setParam('search', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={status}
          onChange={e => setParam('status', e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          {JOB_STATUSES.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={plantId}
          onChange={e => setParam('plant', e.target.value)}
          className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Plants</option>
          {plants.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Table / List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Filter size={32} className="mb-3 opacity-40" />
            <p className="text-sm">No job cards found</p>
            {canCreate && (
              <Link to="/job-cards/new" className="mt-3 text-sm text-brand-600 hover:underline">
                Create the first one
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Order No.</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Description</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Plant</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Start Date</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Priority</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 text-xs uppercase tracking-wide">Status</th>
                    <th className="w-8 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cards.map(card => {
                    const isOverdue = ['open','in_progress'].includes(card.status)
                      && card.basic_start_date < today
                    return (
                      <tr
                        key={card.id}
                        className={`hover:bg-slate-50 transition-colors ${isOverdue ? 'bg-red-50/40' : ''}`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{card.order_no}</td>
                        <td className="px-4 py-3 text-slate-800 max-w-xs truncate">
                          {card.description_of_work_order || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{card.plants?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {formatDate(card.basic_start_date)}
                          {isOverdue && (
                            <span className="ml-1.5 text-red-500 text-xs font-medium">Overdue</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{card.order_priority ?? '—'}</td>
                        <td className="px-4 py-3"><Badge status={card.status} /></td>
                        <td className="px-4 py-3">
                          <Link to={`/job-cards/${card.id}`}>
                            <ChevronRight size={16} className="text-slate-400 hover:text-brand-600" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden divide-y divide-slate-100">
              {cards.map(card => {
                const isOverdue = ['open','in_progress'].includes(card.status)
                  && card.basic_start_date < today
                return (
                  <Link
                    key={card.id}
                    to={`/job-cards/${card.id}`}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-slate-50 ${isOverdue ? 'bg-red-50/40' : ''}`}
                  >
                    <AlarmClock size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm truncate">
                        {card.description_of_work_order || card.order_no}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {card.order_no} · {card.plants?.name ?? '—'}
                        {isOverdue && <span className="ml-1 text-red-500 font-medium">Overdue</span>}
                      </p>
                    </div>
                    <Badge status={card.status} />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page - 1))
                setSearchParams(next)
              }}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => {
                const next = new URLSearchParams(searchParams)
                next.set('page', String(page + 1))
                setSearchParams(next)
              }}
              className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
