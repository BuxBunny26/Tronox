import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, Edit, CheckSquare, MapPin, Calendar, Clock,
  User, AlertCircle, ClipboardCheck, FileText, Wrench,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import Badge from '../../components/Badge'
import LoadingSpinner from '../../components/LoadingSpinner'
import { formatDate, formatDateTime, formatDuration } from '../../lib/utils'
import { DELAY_CODES } from '../../lib/constants'

export default function JobCardDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { canEdit, canComplete, role } = useAuth()

  const [card, setCard]         = useState(null)
  const [equipment, setEquipment] = useState([])
  const [operations, setOperations] = useState([])
  const [completion, setCompletion] = useState(null)
  const [delays, setDelays]     = useState([])
  const [downtime, setDowntime] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: c },
        { data: eq },
        { data: ops },
        { data: comp },
        { data: del },
        { data: dt },
      ] = await Promise.all([
        supabase
          .from('job_cards')
          .select('*, plants(id, name), profiles!assigned_to(id, full_name, email)')
          .eq('id', id)
          .single(),
        supabase.from('job_card_equipment').select('*').eq('job_card_id', id).order('sort_order'),
        supabase.from('job_card_operations').select('*').eq('job_card_id', id).order('sort_order'),
        supabase
          .from('job_card_completions')
          .select('*, profiles!completed_by(full_name), profiles!supervisor_id(full_name)')
          .eq('job_card_id', id)
          .maybeSingle(),
        supabase.from('job_card_delays').select('*').eq('job_card_id', id),
        supabase.from('job_card_downtime').select('*').eq('job_card_id', id),
      ])
      setCard(c)
      setEquipment(eq ?? [])
      setOperations(ops ?? [])
      setCompletion(comp)
      setDelays(del ?? [])
      setDowntime(dt ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <LoadingSpinner size="lg" />
    </div>
  )

  if (!card) return (
    <div className="p-6 text-center text-slate-500">Job card not found.</div>
  )

  const today = new Date().toISOString().slice(0, 10)
  const isOverdue = ['open','in_progress'].includes(card.status) && card.basic_start_date < today

  const InfoRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={15} className="text-slate-400 mt-0.5 flex-shrink-0" />}
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-sm text-slate-800 font-medium mt-0.5">{value ?? '—'}</p>
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-start gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mt-0.5">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-slate-800">
              {card.description_of_work_order || card.order_no}
            </h1>
            <Badge status={card.status} />
            {isOverdue && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                <AlertCircle size={12} /> Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 font-mono">{card.order_no}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {canComplete && card.status !== 'completed' && card.status !== 'closed' && (
            <Link
              to={`/job-cards/${id}/complete`}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
            >
              <CheckSquare size={14} />
              Complete
            </Link>
          )}
          {canEdit && (
            <Link
              to={`/job-cards/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
            >
              <Edit size={14} />
              Edit
            </Link>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Header details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <FileText size={13} /> Job Details
            </h3>
            <div className="space-y-3">
              <InfoRow icon={MapPin} label="Functional Location" value={card.functional_location_text} />
              <InfoRow icon={null} label="Alternative Label" value={card.alternative_label} />
              <InfoRow icon={null} label="Equipment" value={card.equipment} />
              <InfoRow icon={null} label="Maintenance Activity" value={card.maintenance_activity_type} />
              <InfoRow icon={null} label="Plant" value={card.plants?.name} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Calendar size={13} /> Planning
            </h3>
            <div className="space-y-3">
              <InfoRow icon={Calendar} label="Basic Start Date" value={formatDate(card.basic_start_date)} />
              <InfoRow icon={null} label="Operation Must Start" value={formatDate(card.operation_must_start_date)} />
              <InfoRow icon={Clock} label="Planned Duration" value={formatDuration(card.planned_duration)} />
              <InfoRow icon={null} label="Package Used" value={card.package_used} />
              <InfoRow icon={null} label="Order Priority" value={card.order_priority} />
              <InfoRow icon={null} label="Planner Group" value={card.planner_group_text} />
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <User size={13} /> Assignment & Work Centre
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <InfoRow icon={User} label="Assigned To"
              value={card.profiles?.full_name ?? card.profiles?.email} />
            <InfoRow icon={null} label="Main Work Centre" value={card.main_work_centre_text} />
            <InfoRow icon={null} label="Created By" value={card.created_by_employee} />
          </div>
        </div>

        {/* Operations table */}
        {operations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Wrench size={13} /> Operations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="text-left py-2 pr-3 font-medium">Opr No</th>
                    <th className="text-left py-2 pr-3 font-medium">Ctrl Key</th>
                    <th className="text-left py-2 pr-3 font-medium">Work/C</th>
                    <th className="text-left py-2 pr-3 font-medium">System Condition</th>
                    <th className="text-left py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {operations.map(op => (
                    <tr key={op.id} className="text-slate-700">
                      <td className="py-2 pr-3">{op.opr_no ?? '—'}</td>
                      <td className="py-2 pr-3">{op.ctrl_key ?? '—'}</td>
                      <td className="py-2 pr-3">{op.work_c ?? '—'}</td>
                      <td className="py-2 pr-3">{op.system_condition ?? '—'}</td>
                      <td className="py-2">{op.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Equipment List */}
        {equipment.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <MapPin size={13} /> Order Object List ({equipment.length} items)
            </h3>
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th className="text-left py-2 pr-4 font-medium">Functional Location</th>
                    <th className="text-left py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {equipment.map(eq => (
                    <tr key={eq.id} className="text-slate-700">
                      <td className="py-1.5 pr-4 font-mono">{eq.functional_location_code}</td>
                      <td className="py-1.5 text-slate-500">{eq.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Completion Data */}
        {completion && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <ClipboardCheck size={13} /> Completion Data
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <InfoRow icon={Clock} label="Actual Hours"
                value={completion.actual_working_hours != null ? `${completion.actual_working_hours} hrs` : null} />
              <InfoRow icon={Calendar} label="Task Start"
                value={formatDateTime(completion.task_start_datetime)} />
              <InfoRow icon={Calendar} label="Task End"
                value={formatDateTime(completion.task_end_datetime)} />
              <InfoRow icon={User} label="Completed By"
                value={completion['profiles!completed_by']?.full_name} />
            </div>
            {completion.additional_work_required && (
              <div className="mt-2 text-xs text-slate-600">
                <span className="font-medium">Additional Work: </span>{completion.additional_work_required}
              </div>
            )}
            {completion.notes && (
              <div className="mt-2 text-xs text-slate-600">
                <span className="font-medium">Notes: </span>{completion.notes}
              </div>
            )}
          </div>
        )}

        {/* Delays */}
        {delays.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Delay / Not-Done Codes
            </h3>
            <div className="space-y-2">
              {delays.map(d => {
                const meta = DELAY_CODES.find(c => c.code === d.delay_code)
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs text-amber-700 w-8">{d.delay_code}</span>
                    <span className="text-xs text-slate-700 flex-1">{meta?.description ?? d.delay_code}</span>
                    {d.duration_hours != null && (
                      <span className="text-xs text-slate-500">{d.duration_hours} hrs</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Downtime */}
        {downtime.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
              Downtime Events
            </h3>
            {downtime.map(dt => (
              <div key={dt.id} className="flex flex-wrap gap-4 text-xs text-slate-700 mb-2">
                <span>{dt.is_breakdown ? 'Breakdown' : 'Planned Downtime'}</span>
                <span>Start: {formatDateTime(dt.started_at)}</span>
                <span>End: {formatDateTime(dt.ended_at)}</span>
                {dt.duration_hours != null && <span>{dt.duration_hours.toFixed(1)} hrs</span>}
                {dt.notes && <span className="text-slate-500">{dt.notes}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Notes */}
        {card.notes && (
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notes</h3>
            <p className="text-sm text-slate-700 whitespace-pre-line">{card.notes}</p>
          </div>
        )}

        <div className="text-xs text-slate-400 pb-4">
          Created: {formatDateTime(card.created_at)} · Last updated: {formatDateTime(card.updated_at)}
        </div>
      </div>
    </div>
  )
}
