import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDate, formatDateTime, formatDuration } from './utils'
import { DELAY_CODES } from './constants'

// ─── Brand colours ───────────────────────────────────────────────
const BRAND_NAVY  = [30, 58, 95]   // #1e3a5f
const BRAND_GREEN = [128, 188, 0]  // #80BC00
const LIGHT_GREY  = [248, 249, 250]
const MID_GREY    = [100, 116, 139]

// ─── Shared helpers ───────────────────────────────────────────────
function statusLabel(status) {
  const map = { draft: 'Draft', open: 'Open', in_progress: 'In Progress', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled' }
  return map[status] ?? status ?? '—'
}

// ============================================================
//  LIST EXPORT — PDF
// ============================================================
export function exportListPDF(cards, filters = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Header band
  doc.setFillColor(...BRAND_NAVY)
  doc.rect(0, 0, 297, 18, 'F')
  doc.setFontSize(13)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Tronox CM Portal — Job Cards Export', 10, 12)

  // Sub-header: filter summary
  const parts = []
  if (filters.dateFrom || filters.dateTo) {
    parts.push(`Date: ${filters.dateFrom || '…'} → ${filters.dateTo || '…'}`)
  }
  if (filters.statusLabel) parts.push(`Status: ${filters.statusLabel}`)
  if (filters.plantName)   parts.push(`Plant: ${filters.plantName}`)
  const sub = parts.length ? parts.join('   |   ') : 'All records'
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(sub, 10, 23)
  doc.setFontSize(7)
  doc.setTextColor(...MID_GREY)
  doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}   |   Total: ${cards.length} records`, 10, 28)

  autoTable(doc, {
    startY: 33,
    head: [['Order No.', 'Description', 'Plant', 'Start Date', 'Priority', 'Activity Type', 'Status']],
    body: cards.map(c => [
      c.order_no ?? '—',
      c.description_of_work_order ?? '—',
      c.plants?.name ?? '—',
      formatDate(c.basic_start_date) ?? '—',
      c.order_priority ?? '—',
      c.maintenance_activity_type ?? '—',
      statusLabel(c.status),
    ]),
    headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: LIGHT_GREY },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 28 }, 6: { cellWidth: 24 } },
    margin: { left: 10, right: 10 },
    styles: { overflow: 'linebreak' },
    didDrawPage: (data) => {
      // Footer on every page
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(...MID_GREY)
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, 287, 207, { align: 'right' })
    },
  })

  // Green accent line below header
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 18, 297, 1.5, 'F')

  doc.save(`JobCards_Export_${_today()}.pdf`)
}

// ============================================================
//  LIST EXPORT — Excel
// ============================================================
export function exportListExcel(cards, filters = {}) {
  const rows = cards.map(c => ({
    'Order No.':        c.order_no ?? '',
    'Description':      c.description_of_work_order ?? '',
    'Plant':            c.plants?.name ?? '',
    'Start Date':       c.basic_start_date ?? '',
    'Priority':         c.order_priority ?? '',
    'Activity Type':    c.maintenance_activity_type ?? '',
    'Maintenance Type': c.maintenance_type ?? '',
    'Assigned To':      c.profiles?.full_name ?? c.profiles?.email ?? '',
    'Work Centre':      c.main_work_centre_text ?? '',
    'Status':           statusLabel(c.status),
    'Created At':       c.created_at ? formatDateTime(c.created_at) : '',
  }))

  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet(rows)
  _autoColWidth(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Job Cards')

  // Filters sheet
  const filterRows = [
    ['Filter', 'Value'],
    ['Date From',  filters.dateFrom  || 'All'],
    ['Date To',    filters.dateTo    || 'All'],
    ['Status',     filters.statusLabel || 'All'],
    ['Plant',      filters.plantName  || 'All'],
    ['Generated',  new Date().toLocaleString('en-ZA')],
    ['Total Records', cards.length],
  ]
  const wsf = XLSX.utils.aoa_to_sheet(filterRows)
  XLSX.utils.book_append_sheet(wb, wsf, 'Export Info')

  XLSX.writeFile(wb, `JobCards_Export_${_today()}.xlsx`)
}

// ============================================================
//  SINGLE JOB CARD — PDF
// ============================================================
export function exportDetailPDF({ card, equipment, operations, completion, delays, downtime }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header band
  doc.setFillColor(...BRAND_NAVY)
  doc.rect(0, 0, 210, 22, 'F')
  doc.setFillColor(...BRAND_GREEN)
  doc.rect(0, 22, 210, 1.5, 'F')

  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.text('Tronox CM Portal', 10, 10)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Job Card Report', 10, 16.5)
  doc.setFontSize(8)
  doc.setTextColor(200, 220, 180)
  doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 200, 16.5, { align: 'right' })

  let y = 30

  // Title row
  doc.setFontSize(13)
  doc.setTextColor(...BRAND_NAVY)
  doc.setFont('helvetica', 'bold')
  doc.text(card.description_of_work_order || card.order_no || '—', 10, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID_GREY)
  doc.text(`Order No: ${card.order_no ?? '—'}   |   Status: ${statusLabel(card.status)}   |   Plant: ${card.plants?.name ?? '—'}`, 10, y)
  y += 8

  // Section helper
  const section = (title) => {
    doc.setFillColor(...BRAND_NAVY)
    doc.rect(10, y, 190, 6, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text(title.toUpperCase(), 13, y + 4.2)
    y += 9
  }

  const twoCol = (pairs) => {
    pairs.forEach(([label, value], i) => {
      const col = i % 2
      const x = col === 0 ? 10 : 110
      if (col === 0 && i > 0) y += 6
      doc.setFontSize(7.5)
      doc.setTextColor(...MID_GREY)
      doc.setFont('helvetica', 'normal')
      doc.text(label, x, y)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'bold')
      doc.text(String(value ?? '—'), x, y + 4)
    })
    y += 10
  }

  // ── Job Details ──
  section('Job Details')
  twoCol([
    ['Functional Location', card.functional_location_text],
    ['Equipment',           card.equipment],
    ['Alternative Label',   card.alternative_label],
    ['Maintenance Activity', card.maintenance_activity_type],
  ])

  // ── Planning ──
  section('Planning')
  twoCol([
    ['Basic Start Date',     formatDate(card.basic_start_date)],
    ['Planned Duration',     formatDuration(card.planned_duration)],
    ['Operation Must Start', formatDate(card.operation_must_start_date)],
    ['Order Priority',       card.order_priority],
    ['Package Used',         card.package_used],
    ['Planner Group',        card.planner_group_text],
  ])

  // ── Assignment ──
  section('Assignment')
  twoCol([
    ['Assigned To',      card.profiles?.full_name ?? card.profiles?.email],
    ['Main Work Centre', card.main_work_centre_text],
    ['Created By',       card.created_by_employee],
    ['Plant',            card.plants?.name],
  ])

  // ── Operations ──
  if (operations?.length) {
    section('Operations')
    autoTable(doc, {
      startY: y,
      head: [['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description']],
      body: operations.map(op => [op.opr_no ?? '—', op.ctrl_key ?? '—', op.work_c ?? '—', op.system_condition ?? '—', op.description ?? '—']),
      headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GREY },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
      didParseCell: () => {},
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Equipment ──
  if (equipment?.length) {
    if (y > 220) { doc.addPage(); y = 20 }
    section('Order Object List')
    autoTable(doc, {
      startY: y,
      head: [['Functional Location Code', 'Description']],
      body: equipment.map(eq => [eq.functional_location_code ?? '—', eq.description ?? '—']),
      headStyles: { fillColor: BRAND_NAVY, textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GREY },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Completion ──
  if (completion) {
    if (y > 220) { doc.addPage(); y = 20 }
    section('Completion Data')
    twoCol([
      ['Actual Hours',    completion.actual_working_hours != null ? `${completion.actual_working_hours} hrs` : null],
      ['Task Start',      formatDateTime(completion.task_start_datetime)],
      ['Task End',        formatDateTime(completion.task_end_datetime)],
      ['Completed By',    completion['profiles!completed_by']?.full_name],
    ])
    if (completion.notes) {
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...MID_GREY)
      doc.text('Completion Notes:', 10, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(30, 41, 59)
      const lines = doc.splitTextToSize(completion.notes, 180)
      doc.text(lines, 10, y)
      y += lines.length * 5 + 3
    }
  }

  // ── Delays ──
  if (delays?.length) {
    if (y > 220) { doc.addPage(); y = 20 }
    section('Delays / Not-Done Codes')
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Description', 'Duration (hrs)']],
      body: delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '—']
      }),
      headStyles: { fillColor: [180, 120, 0], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [255, 251, 235] },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Downtime ──
  if (downtime?.length) {
    if (y > 220) { doc.addPage(); y = 20 }
    section('Downtime Events')
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Start', 'End', 'Duration (hrs)', 'Notes']],
      body: downtime.map(dt => [
        dt.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(dt.started_at) ?? '—',
        formatDateTime(dt.ended_at) ?? '—',
        dt.duration_hours != null ? dt.duration_hours.toFixed(1) : '—',
        dt.notes ?? '',
      ]),
      headStyles: { fillColor: [180, 30, 30], textColor: 255, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: [255, 245, 245] },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
    })
    y = doc.lastAutoTable.finalY + 6
  }

  // ── Notes ──
  if (card.notes) {
    if (y > 230) { doc.addPage(); y = 20 }
    section('Notes')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)
    const lines = doc.splitTextToSize(card.notes, 180)
    doc.text(lines, 10, y)
    y += lines.length * 5 + 3
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(...MID_GREY)
    doc.text(`Page ${i} of ${pageCount}`, 200, 290, { align: 'right' })
    doc.text('Tronox CM Portal — Wearcheck Reliability Solutions', 10, 290)
  }

  doc.save(`JobCard_${card.order_no ?? card.id}_${_today()}.pdf`)
}

// ============================================================
//  SINGLE JOB CARD — Excel
// ============================================================
export function exportDetailExcel({ card, equipment, operations, completion, delays, downtime }) {
  const wb = XLSX.utils.book_new()

  // ── Summary sheet ──
  const summary = [
    ['TRONOX CM PORTAL — JOB CARD REPORT'],
    [],
    ['Order No.',            card.order_no ?? ''],
    ['Description',          card.description_of_work_order ?? ''],
    ['Status',               statusLabel(card.status)],
    ['Plant',                card.plants?.name ?? ''],
    ['Functional Location',  card.functional_location_text ?? ''],
    ['Equipment',            card.equipment ?? ''],
    ['Alternative Label',    card.alternative_label ?? ''],
    ['Maintenance Activity', card.maintenance_activity_type ?? ''],
    [],
    ['PLANNING'],
    ['Basic Start Date',        formatDate(card.basic_start_date) ?? ''],
    ['Op Must Start',           formatDate(card.operation_must_start_date) ?? ''],
    ['Planned Duration',        formatDuration(card.planned_duration) ?? ''],
    ['Order Priority',          card.order_priority ?? ''],
    ['Package Used',            card.package_used ?? ''],
    ['Planner Group',           card.planner_group_text ?? ''],
    [],
    ['ASSIGNMENT'],
    ['Assigned To',       card.profiles?.full_name ?? card.profiles?.email ?? ''],
    ['Main Work Centre',  card.main_work_centre_text ?? ''],
    ['Created By',        card.created_by_employee ?? ''],
    [],
    ['Generated', new Date().toLocaleString('en-ZA')],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 50 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // ── Operations sheet ──
  if (operations?.length) {
    const ops = [['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description'],
      ...operations.map(op => [op.opr_no ?? '', op.ctrl_key ?? '', op.work_c ?? '', op.system_condition ?? '', op.description ?? ''])]
    const wsOps = XLSX.utils.aoa_to_sheet(ops)
    XLSX.utils.book_append_sheet(wb, wsOps, 'Operations')
  }

  // ── Equipment sheet ──
  if (equipment?.length) {
    const eq = [['Functional Location Code', 'Description'],
      ...equipment.map(e => [e.functional_location_code ?? '', e.description ?? ''])]
    const wsEq = XLSX.utils.aoa_to_sheet(eq)
    XLSX.utils.book_append_sheet(wb, wsEq, 'Equipment')
  }

  // ── Completion sheet ──
  if (completion) {
    const comp = [
      ['Field', 'Value'],
      ['Actual Hours',     completion.actual_working_hours ?? ''],
      ['Task Start',       formatDateTime(completion.task_start_datetime) ?? ''],
      ['Task End',         formatDateTime(completion.task_end_datetime) ?? ''],
      ['Completed By',     completion['profiles!completed_by']?.full_name ?? ''],
      ['Additional Work',  completion.additional_work_required ?? ''],
      ['Notes',            completion.notes ?? ''],
    ]
    const wsComp = XLSX.utils.aoa_to_sheet(comp)
    XLSX.utils.book_append_sheet(wb, wsComp, 'Completion')
  }

  // ── Delays sheet ──
  if (delays?.length) {
    const del = [['Code', 'Description', 'Duration (hrs)'],
      ...delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '']
      })]
    const wsDel = XLSX.utils.aoa_to_sheet(del)
    XLSX.utils.book_append_sheet(wb, wsDel, 'Delays')
  }

  // ── Downtime sheet ──
  if (downtime?.length) {
    const dt = [['Type', 'Start', 'End', 'Duration (hrs)', 'Notes'],
      ...downtime.map(d => [
        d.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(d.started_at) ?? '',
        formatDateTime(d.ended_at) ?? '',
        d.duration_hours ?? '',
        d.notes ?? '',
      ])]
    const wsDt = XLSX.utils.aoa_to_sheet(dt)
    XLSX.utils.book_append_sheet(wb, wsDt, 'Downtime')
  }

  XLSX.writeFile(wb, `JobCard_${card.order_no ?? card.id}_${_today()}.xlsx`)
}

// ─── Internal helpers ─────────────────────────────────────────
function _today() {
  return new Date().toISOString().slice(0, 10)
}

function _autoColWidth(ws, rows) {
  if (!rows.length) return
  const keys = Object.keys(rows[0])
  ws['!cols'] = keys.map(k => ({
    wch: Math.max(k.length, ...rows.map(r => String(r[k] ?? '').length), 10),
  }))
}
