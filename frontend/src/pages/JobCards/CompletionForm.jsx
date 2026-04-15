import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { ChevronLeft, Plus, Trash2, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { DELAY_CODES } from '../../lib/constants'

export default function CompletionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile, canComplete, isSupervisor } = useAuth()

  const [card, setCard]       = useState(null)
  const [existing, setExisting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      actual_working_hours: '',
      task_start_datetime: '',
      task_end_datetime: '',
      create_notification: false,
      notification_text: '',
      additional_work_required: '',
      task_completed: true,
      counter_readings: '',
      notes: '',
      sign_off: false,
      supervisor_sign_off: false,
      selected_delays: [],
      downtime_events: [],
    },
  })

  const { fields: dtFields, append: appendDt, remove: removeDt } = useFieldArray({ control, name: 'downtime_events' })

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: comp }, { data: dels }] = await Promise.all([
        supabase.from('job_cards').select('*, plants(name)').eq('id', id).single(),
        supabase.from('job_card_completions').select('*').eq('job_card_id', id).maybeSingle(),
        supabase.from('job_card_delays').select('*').eq('job_card_id', id),
      ])
      setCard(c)
      if (comp) {
        setExisting(comp)
        reset({
          actual_working_hours: comp.actual_working_hours ?? '',
          task_start_datetime: comp.task_start_datetime
            ? comp.task_start_datetime.slice(0, 16) : '',
          task_end_datetime: comp.task_end_datetime
            ? comp.task_end_datetime.slice(0, 16) : '',
          create_notification: comp.create_notification ?? false,
          notification_text: comp.notification_text ?? '',
          additional_work_required: comp.additional_work_required ?? '',
          task_completed: comp.task_completed ?? true,
          counter_readings: comp.counter_readings ?? '',
          notes: comp.notes ?? '',
          sign_off: Boolean(comp.completed_by),
          supervisor_sign_off: Boolean(comp.supervisor_id),
          selected_delays: dels?.map(d => d.delay_code) ?? [],
          downtime_events: [],
        })
      }
      setLoading(false)
    }
    load()
  }, [id, reset])

  const onSubmit = async (data) => {
    setSaving(true)
    setError('')

    const completionData = {
      job_card_id: id,
      actual_working_hours: data.actual_working_hours ? Number(data.actual_working_hours) : null,
      task_start_datetime: data.task_start_datetime || null,
      task_end_datetime: data.task_end_datetime || null,
      create_notification: data.create_notification,
      notification_text: data.notification_text || null,
      additional_work_required: data.additional_work_required || null,
      task_completed: data.task_completed,
      counter_readings: data.counter_readings || null,
      notes: data.notes || null,
    }

    // Artisan sign-off
    if (data.sign_off) {
      completionData.completed_by = user.id
      completionData.completed_at = new Date().toISOString()
    }
    // Supervisor sign-off
    if (data.supervisor_sign_off && isSupervisor) {
      completionData.supervisor_id = user.id
      completionData.supervised_at = new Date().toISOString()
    }

    // Upsert completion
    const { error: compErr } = existing
      ? await supabase.from('job_card_completions').update(completionData).eq('job_card_id', id)
      : await supabase.from('job_card_completions').insert(completionData)

    if (compErr) { setError(compErr.message); setSaving(false); return }

    // Replace delays
    await supabase.from('job_card_delays').delete().eq('job_card_id', id)
    if (data.selected_delays && data.selected_delays.length > 0) {
      await supabase.from('job_card_delays').insert(
        data.selected_delays.map(code => ({ job_card_id: id, delay_code: code }))
      )
    }

    // Insert downtime events
    if (data.downtime_events?.length > 0) {
      const validEvents = data.downtime_events.filter(e => e.started_at)
      if (validEvents.length > 0) {
        await supabase.from('job_card_downtime').insert(
          validEvents.map(e => ({
            job_card_id: id,
            is_breakdown: e.is_breakdown ?? false,
            started_at: e.started_at || null,
            ended_at: e.ended_at || null,
            notes: e.notes || null,
          }))
        )
      }
    }

    // Update job card status
    const newStatus = data.task_completed ? 'completed' : 'in_progress'
    await supabase.from('job_cards').update({ status: newStatus }).eq('id', id)

    setSaving(false)
    navigate(`/job-cards/${id}`)
  }

  const selectedDelays = watch('selected_delays') ?? []
  const delayGroups = [
    { title: 'Delay Codes (M)', codes: DELAY_CODES.filter(d => d.category === 'delay') },
    { title: 'Not-Done Codes (N)', codes: DELAY_CODES.filter(d => d.category === 'not_done') },
  ]

  if (loading) return (
    <div className="flex items-center justify-center py-20"><LoadingSpinner size="lg" /></div>
  )

  if (!canComplete) return (
    <div className="p-6 text-center text-slate-500">
      You do not have permission to complete job cards.
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Complete Job Card</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {card?.description_of_work_order || card?.order_no} · {card?.plants?.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Time & Duration */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Time & Duration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Actual Working Hours</label>
              <input {...register('actual_working_hours')} type="number" step="0.5" min="0"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="e.g. 4.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Task Start</label>
              <input {...register('task_start_datetime')} type="datetime-local"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Task End</label>
              <input {...register('task_end_datetime')} type="datetime-local"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Counter Readings</label>
            <input {...register('counter_readings')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Enter counter readings" />
          </div>
        </section>

        {/* Task Status */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Task Outcome
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex items-center gap-3 flex-1 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input {...register('task_completed')} type="radio" value="true" defaultChecked className="accent-green-600" />
              <div>
                <p className="text-sm font-medium text-slate-800">Task Completed</p>
                <p className="text-xs text-slate-500">Do final confirmation & TECO order</p>
              </div>
            </label>
            <label className="flex items-center gap-3 flex-1 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
              <input {...register('task_completed')} type="radio" value="false" className="accent-amber-500" />
              <div>
                <p className="text-sm font-medium text-slate-800">Task Not Started / Incomplete</p>
                <p className="text-xs text-slate-500">Do partial confirmation & reschedule</p>
              </div>
            </label>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Additional Work Required</label>
            <textarea {...register('additional_work_required')} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Describe any additional work identified…" />
          </div>
        </section>

        {/* Notifications */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Notifications
          </h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('create_notification')} type="checkbox"
              className="rounded accent-brand-600" />
            <span className="text-sm text-slate-700">Create Notification (Additional Work / Defects)</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notification Text / OR Number</label>
            <input {...register('notification_text')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Notification text or order number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">RAMS – Improvement Ideas / Suggestions / Feedback</label>
            <textarea {...register('notes')} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="Improvements, safety suggestions, feedback…" />
          </div>
        </section>

        {/* Delay & Not-Done Codes */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-3 mb-3">
            Delays & Not-Done Reasons
          </h2>
          <Controller
            name="selected_delays"
            control={control}
            render={({ field }) => (
              <div className="space-y-4">
                {delayGroups.map(group => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold text-slate-500 mb-2">{group.title}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.codes.map(code => {
                        const checked = field.value?.includes(code.code)
                        return (
                          <label key={code.code}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                              checked
                                ? 'border-amber-300 bg-amber-50 text-amber-800'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={e => {
                                const val = field.value ?? []
                                field.onChange(
                                  e.target.checked
                                    ? [...val, code.code]
                                    : val.filter(c => c !== code.code)
                                )
                              }}
                              className="accent-amber-500 flex-shrink-0"
                            />
                            <span className="font-mono font-bold text-amber-600 w-7 flex-shrink-0">{code.code}</span>
                            <span>{code.description.replace(/^(Delay|Not Done): /, '')}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          />
        </section>

        {/* Downtime */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Downtime Events</h2>
            <button type="button"
              onClick={() => appendDt({ is_breakdown: false, started_at: '', ended_at: '', notes: '' })}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
              <Plus size={13} /> Add Event
            </button>
          </div>
          {dtFields.length === 0 ? (
            <p className="text-sm text-slate-400">No downtime events.</p>
          ) : (
            <div className="space-y-3">
              {dtFields.map((f, i) => (
                <div key={f.id} className="border border-slate-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input {...register(`downtime_events.${i}.is_breakdown`)} type="checkbox"
                        className="accent-red-500" />
                      <span className="font-medium text-red-600">Breakdown</span>
                    </label>
                    <button type="button" onClick={() => removeDt(i)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Date/Time Started</label>
                      <input {...register(`downtime_events.${i}.started_at`)} type="datetime-local"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Date/Time Ended</label>
                      <input {...register(`downtime_events.${i}.ended_at`)} type="datetime-local"
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                    </div>
                  </div>
                  <input {...register(`downtime_events.${i}.notes`)} placeholder="Notes"
                    className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Sign-off */}
        <section className="bg-slate-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck size={15} className="text-green-400" />
            Sign-Off Declaration
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            I hereby declare that I am competent to do this task and am well versed in all the
            hazards involved. All safety precautions have been taken. The machine is properly
            tested, in service and 100% operational.
          </p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input {...register('sign_off', { required: 'You must acknowledge the sign-off declaration' })}
              type="checkbox" className="w-4 h-4 accent-green-500" />
            <span className="text-sm text-white">
              I, <strong>{profile?.full_name ?? profile?.email}</strong>, acknowledge this declaration
            </span>
          </label>
          {errors.sign_off && (
            <p className="text-xs text-red-400">{errors.sign_off.message}</p>
          )}
          {isSupervisor && (
            <label className="flex items-center gap-3 cursor-pointer">
              <input {...register('supervisor_sign_off')} type="checkbox" className="w-4 h-4 accent-brand-400" />
              <span className="text-sm text-slate-300">
                Supervisor approval — I confirm this task is complete and meets requirements
              </span>
            </label>
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-60">
            <Save size={15} />
            {saving ? 'Saving…' : 'Submit Completion'}
          </button>
        </div>
      </form>
    </div>
  )
}
