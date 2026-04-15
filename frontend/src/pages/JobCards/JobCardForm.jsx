import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Trash2, Plus, Save, ChevronLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../../components/LoadingSpinner'
import { generateOrderNo } from '../../lib/utils'
import { ORDER_PRIORITIES, ACTIVITY_TYPES, PACKAGES, JOB_STATUSES } from '../../lib/constants'

const schema = z.object({
  order_no: z.string().min(1, 'Order number is required'),
  basic_start_date: z.string().optional().nullable(),
  operation_must_start_date: z.string().optional().nullable(),
  created_by_employee: z.string().optional().nullable(),
  functional_location_text: z.string().optional().nullable(),
  alternative_label: z.string().optional().nullable(),
  equipment: z.string().optional().nullable(),
  order_priority: z.string().optional().nullable(),
  criticality: z.string().optional().nullable(),
  planner_group_text: z.string().optional().nullable(),
  package_used: z.string().optional().nullable(),
  main_work_centre_text: z.string().optional().nullable(),
  counter_reading: z.string().optional().nullable(),
  planned_duration: z.coerce.number().optional().nullable(),
  maintenance_activity_type: z.string().optional().nullable(),
  description_of_work_order: z.string().optional().nullable(),
  plant_id: z.string().optional().nullable(),
  status: z.string().default('open'),
  notes: z.string().optional().nullable(),
  equipment_list: z.array(z.object({
    functional_location_code: z.string().min(1, 'Code required'),
    description: z.string().optional().nullable(),
  })).default([]),
  operations: z.array(z.object({
    opr_no: z.string().optional().nullable(),
    ctrl_key: z.string().optional().nullable(),
    work_c: z.string().optional().nullable(),
    system_condition: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
  })).default([]),
})

export default function JobCardForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { canEdit, canCreate, user } = useAuth()

  const [plants, setPlants]   = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState('')

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      order_no: generateOrderNo(),
      status: 'open',
      equipment_list: [],
      operations: [],
    },
  })

  const { fields: equipFields, append: appendEquip, remove: removeEquip } = useFieldArray({ control, name: 'equipment_list' })
  const { fields: opFields,    append: appendOp,    remove: removeOp    } = useFieldArray({ control, name: 'operations' })

  useEffect(() => {
    supabase.from('plants').select('id, name').then(({ data }) => { if (data) setPlants(data) })
    supabase.from('profiles').select('id, full_name, email, role')
      .in('role', ['artisan', 'supervisor', 'planner'])
      .then(({ data }) => { if (data) setProfiles(data) })
  }, [])

  useEffect(() => {
    if (!isEdit) return
    async function loadCard() {
      const [{ data: card }, { data: equip }, { data: ops }] = await Promise.all([
        supabase.from('job_cards').select('*').eq('id', id).single(),
        supabase.from('job_card_equipment').select('*').eq('job_card_id', id).order('sort_order'),
        supabase.from('job_card_operations').select('*').eq('job_card_id', id).order('sort_order'),
      ])
      if (card) {
        reset({
          ...card,
          basic_start_date: card.basic_start_date ?? '',
          operation_must_start_date: card.operation_must_start_date ?? '',
          equipment_list: equip ?? [],
          operations: ops ?? [],
        })
      }
      setLoading(false)
    }
    loadCard()
  }, [id, isEdit, reset])

  const onSubmit = async (data) => {
    if (!canCreate && !isEdit) return
    if (!canEdit && isEdit) return
    setSaving(true)
    setSaveError('')

    const { equipment_list, operations, ...cardData } = data
    if (!isEdit) cardData.created_by_user_id = user.id

    // Upsert job card
    const { data: saved, error } = isEdit
      ? await supabase.from('job_cards').update(cardData).eq('id', id).select('id').single()
      : await supabase.from('job_cards').insert(cardData).select('id').single()

    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }

    const cardId = saved.id

    // Replace equipment list
    await supabase.from('job_card_equipment').delete().eq('job_card_id', cardId)
    if (equipment_list.length > 0) {
      await supabase.from('job_card_equipment').insert(
        equipment_list.map((e, i) => ({ ...e, job_card_id: cardId, sort_order: i }))
      )
    }

    // Replace operations
    await supabase.from('job_card_operations').delete().eq('job_card_id', cardId)
    if (operations.length > 0) {
      await supabase.from('job_card_operations').insert(
        operations.map((o, i) => ({ ...o, job_card_id: cardId, sort_order: i }))
      )
    }

    setSaving(false)
    navigate(`/job-cards/${cardId}`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if ((isEdit && !canEdit) || (!isEdit && !canCreate)) {
    return (
      <div className="p-6 text-center text-slate-500">
        You do not have permission to {isEdit ? 'edit' : 'create'} job cards.
      </div>
    )
  }

  const field = (name, label, opts = {}) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        {...register(name)}
        type={opts.type ?? 'text'}
        placeholder={opts.placeholder}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
      {errors[name] && <p className="text-xs text-red-500 mt-1">{errors[name].message}</p>}
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? 'Edit Job Card' : 'New Job Card'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {isEdit ? 'Update job card details' : 'Create a new job ticket for plant maintenance'}
          </p>
        </div>
      </div>

      {saveError && (
        <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* Header section */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Job Card Header
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('order_no', 'Order Number *')}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select {...register('status')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                {JOB_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {field('basic_start_date', 'Basic Start Date', { type: 'date' })}
            {field('operation_must_start_date', 'Operation Must Start Date', { type: 'date' })}
            {field('created_by_employee', 'Created By (Employee ID)', { placeholder: 'e.g. IP1020260228' })}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Plant</label>
              <select {...register('plant_id')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select plant…</option>
                {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Location & Equipment */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Location & Equipment
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('functional_location_text', 'Functional Location', { placeholder: 'e.g. THK-MPP' })}
            {field('alternative_label', 'Alternative Label', { placeholder: 'e.g. IHS-P20' })}
            {field('equipment', 'Equipment')}
          </div>
        </section>

        {/* Planning */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">
            Planning Details
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Order Priority</label>
              <select {...register('order_priority')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                {ORDER_PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {field('criticality', 'Criticality')}
            {field('planner_group_text', 'Planner Group', { placeholder: 'e.g. K05-MSP Wet' })}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Package Used</label>
              <select {...register('package_used')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                {PACKAGES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {field('main_work_centre_text', 'Main Work Centre')}
            {field('counter_reading', 'Counter Reading')}
            {field('planned_duration', 'Planned Duration (hrs)', { type: 'number', placeholder: '0' })}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Maintenance Activity Type</label>
              <select {...register('maintenance_activity_type')}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select…</option>
                {ACTIVITY_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description of Work Order</label>
            <textarea {...register('description_of_work_order')} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              placeholder="e.g. CM TASK VIBRATION MSP"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Internal Notes</label>
            <textarea {...register('notes')} rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
        </section>

        {/* Operations */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Operations</h2>
            <button type="button" onClick={() => appendOp({ opr_no: '', ctrl_key: '', work_c: '', system_condition: '', description: '' })}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
              <Plus size={13} /> Add Row
            </button>
          </div>
          {opFields.length === 0 ? (
            <p className="text-sm text-slate-400">No operations yet.</p>
          ) : (
            <div className="space-y-2">
              {opFields.map((f, i) => (
                <div key={f.id} className="grid grid-cols-12 gap-2 items-start text-xs">
                  <input {...register(`operations.${i}.opr_no`)} placeholder="Opr No"
                    className="col-span-2 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <input {...register(`operations.${i}.ctrl_key`)} placeholder="Ctrl Key"
                    className="col-span-2 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <input {...register(`operations.${i}.work_c`)} placeholder="Work/C"
                    className="col-span-2 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <input {...register(`operations.${i}.system_condition`)} placeholder="System Condition"
                    className="col-span-3 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <input {...register(`operations.${i}.description`)} placeholder="Description"
                    className="col-span-2 px-2 py-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <button type="button" onClick={() => removeOp(i)} className="col-span-1 flex justify-center p-1.5 text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Equipment / Object List */}
        <section className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Order Object List</h2>
            <button type="button" onClick={() => appendEquip({ functional_location_code: '', description: '' })}
              className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 font-medium">
              <Plus size={13} /> Add Equipment
            </button>
          </div>
          {equipFields.length === 0 ? (
            <p className="text-sm text-slate-400">No equipment assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {equipFields.map((f, i) => (
                <div key={f.id} className="flex gap-2 items-start">
                  <input {...register(`equipment_list.${i}.functional_location_code`)} placeholder="Functional Location Code *"
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <input {...register(`equipment_list.${i}.description`)} placeholder="Description"
                    className="flex-1 px-2 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500" />
                  <button type="button" onClick={() => removeEquip(i)} className="p-1.5 text-red-400 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {errors.equipment_list && (
                <p className="text-xs text-red-500">{errors.equipment_list.message}</p>
              )}
            </div>
          )}
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-800 disabled:opacity-60">
            <Save size={15} />
            {saving ? 'Saving…' : isEdit ? 'Update Job Card' : 'Create Job Card'}
          </button>
        </div>
      </form>
    </div>
  )
}
