import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDate, formatDateTime } from './utils'
import { DELAY_CODES } from './constants'

// --- Monochrome palette ---
const BLACK  = [0, 0, 0]
const WHITE  = [255, 255, 255]
const D_GREY = [30, 30, 30]
const M_GREY = [100, 100, 100]
const L_GREY = [240, 240, 240]
const XL_GREY = [250, 250, 250]

// --- Shared helpers ---
function sl(s) {
  const map = { draft: 'Draft', open: 'Open', in_progress: 'In Progress', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled' }
  return map[s] ?? s ?? '-'
}

async function loadLogoDataUrl() {
  try {
    const resp = await fetch('/wearcheck-logo.png')
    const blob = await resp.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// =============================================================
//  LIST EXPORT - PDF
// =============================================================
export async function exportListPDF(cards, filters = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl()

  // Header band
  doc.setFillColor(...BLACK)
  doc.rect(0, 0, 297, 22, 'F')

  if (logo) doc.addImage(logo, 'PNG', 9, 2, 18, 18)
  const tx = logo ? 31 : 10

  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('Tronox CM Portal', tx, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Job Cards Export', tx, 16.5)
  doc.setFontSize(7.5)
  doc.setTextColor(200, 200, 200)
  doc.text('Generated: ' + new Date().toLocaleString('en-ZA') + '   |   ' + cards.length + ' records', 287, 16.5, { align: 'right' })

  // Thin accent line
  doc.setFillColor(180, 180, 180)
  doc.rect(0, 22, 297, 0.8, 'F')

  // Filter row
  const parts = []
  if (filters.dateFrom || filters.dateTo) parts.push('Date: ' + (filters.dateFrom || '...') + ' to ' + (filters.dateTo || '...'))
  if (filters.statusLabel) parts.push('Status: ' + filters.statusLabel)
  if (filters.plantName)   parts.push('Plant: ' + filters.plantName)
  let startY = 27
  if (parts.length) {
    doc.setFontSize(7)
    doc.setTextColor(...M_GREY)
    doc.text('Filters: ' + parts.join('   |   '), 10, 27)
    startY = 31
  }

  autoTable(doc, {
    startY,
    head: [['Order No.', 'Description', 'Plant', 'Start Date', 'Priority', 'Activity Type', 'Status']],
    body: cards.map(c => [
      c.order_no ?? '-',
      c.description_of_work_order ?? '-',
      c.plants?.name ?? '-',
      formatDate(c.basic_start_date) ?? '-',
      c.order_priority ?? '-',
      c.maintenance_activity_type ?? '-',
      sl(c.status),
    ]),
    headStyles: { fillColor: D_GREY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: XL_GREY },
    bodyStyles: { fontSize: 7.5, textColor: D_GREY },
    columnStyles: { 0: { cellWidth: 32 }, 6: { cellWidth: 26 } },
    margin: { left: 10, right: 10 },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
    didDrawPage: (data) => {
      const n = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(...M_GREY)
      doc.text('Page ' + data.pageNumber + ' of ' + n, 287, 207, { align: 'right' })
      doc.text('Tronox CM Portal - Wearcheck Reliability Solutions', 10, 207)
    },
  })

  doc.save('JobCards_Export_' + _today() + '.pdf')
}

// =============================================================
//  LIST EXPORT - Excel
// =============================================================
export function exportListExcel(cards, filters = {}) {
  const rows = cards.map(c => ({
    'Order No.':     c.order_no ?? '',
    'Description':   c.description_of_work_order ?? '',
    'Plant':         c.plants?.name ?? '',
    'Start Date':    c.basic_start_date ?? '',
    'Priority':      c.order_priority ?? '',
    'Activity Type': c.maintenance_activity_type ?? '',
    'Assigned To':   c.profiles?.full_name ?? c.profiles?.email ?? '',
    'Work Centre':   c.main_work_centre_text ?? '',
    'Status':        sl(c.status),
    'Created At':    c.created_at ? formatDateTime(c.created_at) : '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  _autoColWidth(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Job Cards')

  const wsf = XLSX.utils.aoa_to_sheet([
    ['Filter', 'Value'],
    ['Date From',     filters.dateFrom    || 'All'],
    ['Date To',       filters.dateTo      || 'All'],
    ['Status',        filters.statusLabel || 'All'],
    ['Plant',         filters.plantName   || 'All'],
    ['Generated',     new Date().toLocaleString('en-ZA')],
    ['Total Records', cards.length],
  ])
  wsf['!cols'] = [{ wch: 18 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsf, 'Export Info')

  XLSX.writeFile(wb, 'JobCards_Export_' + _today() + '.xlsx')
}

// =============================================================
//  SINGLE JOB CARD - PDF
// =============================================================
export async function exportDetailPDF({ card, equipment, operations, completion, delays, downtime }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl()
  const PW = 210
  const ML = 12
  const MR = 12
  const CW = PW - ML - MR

  // Header band
  doc.setFillColor(...BLACK)
  doc.rect(0, 0, PW, 28, 'F')
  doc.setFillColor(160, 160, 160)
  doc.rect(0, 28, PW, 1, 'F')

  if (logo) doc.addImage(logo, 'PNG', ML, 3.5, 20, 20)
  const hx = logo ? ML + 24 : ML

  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('Job Card Report', hx, 12)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text('Tronox CM Portal - Wearcheck Reliability Solutions', hx, 19)
  doc.setFontSize(7.5)
  doc.setTextColor(160, 160, 160)
  doc.text('Generated: ' + new Date().toLocaleString('en-ZA'), PW - MR, 22, { align: 'right' })

  let y = 34

  // Title card
  doc.setFillColor(...XL_GREY)
  doc.rect(ML, y, CW, 18, 'F')
  doc.setDrawColor(210, 210, 210)
  doc.setLineWidth(0.3)
  doc.rect(ML, y, CW, 18, 'S')

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...D_GREY)
  doc.text(card.description_of_work_order || card.order_no || '-', ML + 4, y + 7, { maxWidth: CW - 8 })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...M_GREY)
  doc.text('Order No: ' + (card.order_no ?? '-') + '   |   Status: ' + sl(card.status) + '   |   Plant: ' + (card.plants?.name ?? '-'), ML + 4, y + 13.5)

  y += 22

  // Section heading helper
  const section = (title) => {
    if (y > 248) { doc.addPage(); _pageFooter(doc); y = 16 }
    doc.setFillColor(...D_GREY)
    doc.rect(ML, y, CW, 6.5, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text(title.toUpperCase(), ML + 3, y + 4.5)
    y += 9
  }

  // Key-value grid helper
  const kvGrid = (pairs, cols = 2) => {
    const colW = CW / cols
    pairs.forEach(([label, value], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = ML + col * colW
      const ry = y + row * 13
      if (row % 2 === 0) {
        doc.setFillColor(...XL_GREY)
        doc.rect(ML, ry - 1, CW, 12.5, 'F')
      }
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...M_GREY)
      doc.text(label, x + 2, ry + 4)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...D_GREY)
      doc.text(String(value ?? '-'), x + 2, ry + 9.5, { maxWidth: colW - 4 })
    })
    const totalRows = Math.ceil(pairs.length / cols)
    y += totalRows * 13 + 3
    if (y > 248) { doc.addPage(); _pageFooter(doc); y = 16 }
  }

  section('Job Details')
  kvGrid([
    ['Functional Location', card.functional_location_text],
    ['Equipment',           card.equipment],
    ['Alternative Label',   card.alternative_label],
    ['Maintenance Activity', card.maintenance_activity_type],
  ])

  section('Planning & Scheduling')
  kvGrid([
    ['Basic Start Date',  formatDate(card.basic_start_date)],
    ['Planned Duration',  card.planned_duration ? card.planned_duration + ' hrs' : null],
    ['Op. Must Start',    formatDate(card.operation_must_start_date)],
    ['Order Priority',    card.order_priority],
    ['Package Used',      card.package_used],
    ['Planner Group',     card.planner_group_text],
  ])

  section('Assignment')
  kvGrid([
    ['Assigned To',      card.profiles?.full_name ?? card.profiles?.email],
    ['Main Work Centre', card.main_work_centre_text],
    ['Created By',       card.created_by_employee],
    ['Plant',            card.plants?.name],
  ])

  if (operations?.length) {
    section('Operations')
    autoTable(doc, {
      startY: y,
      head: [['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description']],
      body: operations.map(op => [op.opr_no ?? '-', op.ctrl_key ?? '-', op.work_c ?? '-', op.system_condition ?? '-', op.description ?? '-']),
      headStyles:         { fillColor: D_GREY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2, textColor: D_GREY },
      alternateRowStyles: { fillColor: XL_GREY },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  if (equipment?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Order Object List')
    autoTable(doc, {
      startY: y,
      head: [['Functional Location Code', 'Description']],
      body: equipment.map(eq => [eq.functional_location_code ?? '-', eq.description ?? '-']),
      headStyles:         { fillColor: D_GREY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2, textColor: D_GREY },
      alternateRowStyles: { fillColor: XL_GREY },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  if (completion) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Completion Data')
    kvGrid([
      ['Actual Hours',  completion.actual_working_hours != null ? completion.actual_working_hours + ' hrs' : null],
      ['Completed By',  completion['profiles!completed_by']?.full_name],
      ['Task Start',    formatDateTime(completion.task_start_datetime)],
      ['Task End',      formatDateTime(completion.task_end_datetime)],
    ])
    if (completion.notes) {
      if (y > 245) { doc.addPage(); _pageFooter(doc); y = 16 }
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...M_GREY)
      doc.text('Completion Notes', ML, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...D_GREY)
      const lines = doc.splitTextToSize(completion.notes, CW)
      doc.text(lines, ML, y)
      y += lines.length * 4.5 + 4
    }
  }

  if (delays?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Delays / Not-Done Codes')
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Description', 'Duration (hrs)']],
      body: delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '-']
      }),
      headStyles:         { fillColor: D_GREY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2, textColor: D_GREY },
      alternateRowStyles: { fillColor: XL_GREY },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  if (downtime?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Downtime Events')
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Start', 'End', 'Duration (hrs)', 'Notes']],
      body: downtime.map(dt => [
        dt.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(dt.started_at) ?? '-',
        formatDateTime(dt.ended_at) ?? '-',
        dt.duration_hours != null ? dt.duration_hours.toFixed(1) : '-',
        dt.notes ?? '',
      ]),
      headStyles:         { fillColor: D_GREY, textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2, textColor: D_GREY },
      alternateRowStyles: { fillColor: XL_GREY },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  if (card.notes) {
    if (y > 235) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Notes')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...D_GREY)
    const lines = doc.splitTextToSize(card.notes, CW)
    doc.text(lines, ML, y)
    y += lines.length * 5 + 4
  }

  _pageFooter(doc)
  doc.save('JobCard_' + (card.order_no ?? card.id) + '_' + _today() + '.pdf')
}

// =============================================================
//  SINGLE JOB CARD - Excel
// =============================================================
export function exportDetailExcel({ card, equipment, operations, completion, delays, downtime }) {
  const wb = XLSX.utils.book_new()

  const summary = [
    ['TRONOX CM PORTAL - JOB CARD REPORT'],
    [],
    ['Order No.',            card.order_no ?? ''],
    ['Description',          card.description_of_work_order ?? ''],
    ['Status',               sl(card.status)],
    ['Plant',                card.plants?.name ?? ''],
    ['Functional Location',  card.functional_location_text ?? ''],
    ['Equipment',            card.equipment ?? ''],
    ['Alternative Label',    card.alternative_label ?? ''],
    ['Maintenance Activity', card.maintenance_activity_type ?? ''],
    [],
    ['PLANNING'],
    ['Basic Start Date',  formatDate(card.basic_start_date) ?? ''],
    ['Op Must Start',     formatDate(card.operation_must_start_date) ?? ''],
    ['Planned Duration',  card.planned_duration ? card.planned_duration + ' hrs' : ''],
    ['Order Priority',    card.order_priority ?? ''],
    ['Package Used',      card.package_used ?? ''],
    ['Planner Group',     card.planner_group_text ?? ''],
    [],
    ['ASSIGNMENT'],
    ['Assigned To',      card.profiles?.full_name ?? card.profiles?.email ?? ''],
    ['Main Work Centre', card.main_work_centre_text ?? ''],
    ['Created By',       card.created_by_employee ?? ''],
    [],
    ['Generated', new Date().toLocaleString('en-ZA')],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summary)
  wsSummary['!cols'] = [{ wch: 28 }, { wch: 55 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  if (operations?.length) {
    const ops = [['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description'],
      ...operations.map(op => [op.opr_no ?? '', op.ctrl_key ?? '', op.work_c ?? '', op.system_condition ?? '', op.description ?? ''])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ops), 'Operations')
  }

  if (equipment?.length) {
    const eq = [['Functional Location Code', 'Description'],
      ...equipment.map(e => [e.functional_location_code ?? '', e.description ?? ''])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eq), 'Equipment')
  }

  if (completion) {
    const comp = [
      ['Field', 'Value'],
      ['Actual Hours',    completion.actual_working_hours ?? ''],
      ['Task Start',      formatDateTime(completion.task_start_datetime) ?? ''],
      ['Task End',        formatDateTime(completion.task_end_datetime) ?? ''],
      ['Completed By',    completion['profiles!completed_by']?.full_name ?? ''],
      ['Additional Work', completion.additional_work_required ?? ''],
      ['Notes',           completion.notes ?? ''],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(comp), 'Completion')
  }

  if (delays?.length) {
    const del = [['Code', 'Description', 'Duration (hrs)'],
      ...delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '']
      })]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(del), 'Delays')
  }

  if (downtime?.length) {
    const dt = [['Type', 'Start', 'End', 'Duration (hrs)', 'Notes'],
      ...downtime.map(d => [
        d.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(d.started_at) ?? '',
        formatDateTime(d.ended_at) ?? '',
        d.duration_hours ?? '',
        d.notes ?? '',
      ])]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dt), 'Downtime')
  }

  XLSX.writeFile(wb, 'JobCard_' + (card.order_no ?? card.id) + '_' + _today() + '.xlsx')
}

// --- Internal helpers ---
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

function _pageFooter(doc) {
  const n = doc.internal.getNumberOfPages()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setDrawColor(180, 180, 180)
    doc.setLineWidth(0.4)
    doc.line(12, 288, 198, 288)
    doc.setFontSize(7)
    doc.setTextColor(...M_GREY)
    doc.text('Page ' + i + ' of ' + n, 198, 292, { align: 'right' })
    doc.text('Tronox CM Portal - Wearcheck Reliability Solutions', 12, 292)
  }
}
