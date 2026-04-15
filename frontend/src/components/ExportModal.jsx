import { useState, useEffect } from 'react'
import { X, Download, FileText, Sheet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { JOB_STATUSES } from '../lib/constants'
import { exportListPDF, exportListExcel } from '../lib/export'

export default function ExportModal({ onClose, initialFilters = {} }) {
  const [plants, setPlants]       = useState([])
  const [format, setFormat]       = useState('pdf')
  const [dateFrom, setDateFrom]   = useState(initialFilters.dateFrom ?? '')
  const [dateTo, setDateTo]       = useState(initialFilters.dateTo ?? '')
  const [status, setStatus]       = useState(initialFilters.status ?? '')
  const [plantId, setPlantId]     = useState(initialFilters.plantId ?? '')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    supabase.from('plants').select('id, name').then(({ data }) => {
      if (data) setPlants(data)
    })
  }, [])

  const handleExport = async () => {
    setError('')
    setLoading(true)
    try {
      let q = supabase
        .from('job_cards')
        .select(`
          id, order_no, description_of_work_order, status, basic_start_date,
          order_priority, maintenance_activity_type,
          main_work_centre_text, created_at,
          plants(name),
          profiles!assigned_to(full_name, email)
        `)
        .order('basic_start_date', { ascending: false })

      if (status)   q = q.eq('status', status)
      if (plantId)  q = q.eq('plant_id', plantId)
      if (dateFrom) q = q.gte('basic_start_date', dateFrom)
      if (dateTo)   q = q.lte('basic_start_date', dateTo)

      const { data, error: qErr } = await q
      if (qErr) throw qErr
      if (!data?.length) { setError('No records match the selected filters.'); setLoading(false); return }

      const statusLabel = JOB_STATUSES.find(s => s.value === status)?.label ?? ''
      const plantName   = plants.find(p => p.id === plantId)?.name ?? ''
      const filters     = { dateFrom, dateTo, statusLabel, plantName }

      if (format === 'pdf') await exportListPDF(data, filters)
      else exportListExcel(data, filters)
      onClose()
    } catch (err) {
      setError(err.message ?? 'Export failed.')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Download size={16} className="text-brand-700" />
            <h2 className="text-sm font-semibold text-slate-800">Export Job Cards</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Format picker */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Export Format</p>
            <div className="flex gap-2">
              {[
                { val: 'pdf',   label: 'PDF',   icon: FileText },
                { val: 'excel', label: 'Excel', icon: Sheet    },
              ].map(({ val, label, icon: Icon }) => (
                <button
                  key={val}
                  onClick={() => setFormat(val)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    format === val
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Filters <span className="text-slate-400 font-normal">(optional — leave blank for all)</span></p>
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Start Date From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Start Date To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">All Statuses</option>
                  {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Plant</label>
                <select value={plantId} onChange={e => setPlantId(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">All Plants</option>
                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleExport} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-700 hover:bg-brand-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
            <Download size={14} />
            {loading ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  )
}
