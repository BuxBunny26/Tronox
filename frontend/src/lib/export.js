import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDate, formatDateTime } from './utils'
import { DELAY_CODES } from './constants'

// ── Professional palette ──────────────────────────────────────
const GREEN   = [128, 188, 0]   // Tronox accent #80BC00
const DARK    = [32,  32,  32]  // primary text
const MID     = [100, 100, 100] // secondary text / labels
const LIGHT   = [130, 130, 130] // muted text
const DIVIDER = [220, 220, 220] // rules / borders
const TBLHDR  = [50,  55,  65]  // table header fill (dark slate)
const ROW_ALT = [248, 249, 250] // alternating row bg
const SECTION = [245, 246, 248] // section kv background
const WHITE   = [255, 255, 255]

// ── Status label ──────────────────────────────────────────────
function sl(s) {
  const map = { draft: 'Draft', open: 'Open', in_progress: 'In Progress', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled' }
  return map[s] ?? s ?? '-'
}

// ── Logo loader ───────────────────────────────────────────────
async function loadLogoDataUrl() {
  try {
    const resp = await fetch('/wearcheck-logo.png')
    const blob = await resp.blob()
    return new Promise((res) => {
      const reader = new FileReader()
      reader.onloadend = () => res(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch { return null }
}

// =============================================================
//  LIST EXPORT - PDF
// =============================================================
export async function exportListPDF(cards, filters = {}) {
  const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl()
  const PW   = 297
  const ML   = 12
  const MR   = 12

  _pageHeader(doc, logo, PW, ML, 'Job Cards Export', 'List Report')

  // ── Filter summary bar
  const parts = []
  if (filters.dateFrom || filters.dateTo) parts.push('Date: ' + (filters.dateFrom || '...') + ' to ' + (filters.dateTo || '...'))
  if (filters.statusLabel) parts.push('Status: ' + filters.statusLabel)
  if (filters.plantName)   parts.push('Plant: ' + filters.plantName)

  let startY = 38
  if (parts.length) {
    doc.setFillColor(245, 246, 248)
    doc.rect(ML, startY, PW - ML - MR, 7, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text('Filters: ' + parts.join('   |   '), ML + 3, startY + 5)
    startY = 48
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
    headStyles:         { fillColor: TBLHDR, textColor: WHITE, fontStyle: 'bold', fontSize: 8, cellPadding: 3 },
    alternateRowStyles: { fillColor: ROW_ALT },
    bodyStyles:         { fontSize: 8, textColor: DARK, cellPadding: 2.8 },
    columnStyles:       { 0: { cellWidth: 32 }, 6: { cellWidth: 26 } },
    margin:             { left: ML, right: MR },
    styles:             { overflow: 'linebreak', lineColor: DIVIDER, lineWidth: 0.2 },
    didDrawPage: (data) => {
      _pageFooter(doc, data.pageNumber, doc.internal.getNumberOfPages(), PW)
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
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logo = await loadLogoDataUrl()
  const PW   = 210
  const ML   = 14
  const MR   = 14
  const CW   = PW - ML - MR

  _pageHeader(doc, logo, PW, ML, 'Job Card Report', card.order_no ? 'Order No. ' + card.order_no : '')

  let y = 42

  // ── Title block (order highlight) ────────────────────────────
  doc.setFillColor(...ROW_ALT)
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.3)
  doc.rect(ML, y, CW, 20, 'FD')
  // Green left accent bar
  doc.setFillColor(...GREEN)
  doc.rect(ML, y, 3, 20, 'F')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(card.description_of_work_order || card.order_no || '-', ML + 7, y + 8, { maxWidth: CW - 10 })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...MID)
  const statusText = 'Status: ' + sl(card.status) + '   |   Plant: ' + (card.plants?.name ?? '-')
  doc.text(statusText, ML + 7, y + 15)

  y += 25

  // ── Section heading helper ────────────────────────────────────
  const section = (title) => {
    if (y > 252) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
    // Label
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...GREEN)
    doc.text(title.toUpperCase(), ML, y + 4)
    // Underline rule
    doc.setDrawColor(...DIVIDER)
    doc.setLineWidth(0.5)
    const labelWidth = doc.getTextWidth(title.toUpperCase())
    doc.line(ML + labelWidth + 2, y + 3.5, ML + CW, y + 3.5)
    y += 8
  }

  // ── Key-Value grid helper ─────────────────────────────────────
  const kvGrid = (pairs, cols = 2) => {
    const colW    = CW / cols
    const rowH    = 12
    const totalRows = Math.ceil(pairs.length / cols)

    pairs.forEach(([label, value], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x   = ML + col * colW
      const ry  = y + row * rowH

      // Alternating row background
      if (row % 2 === 0) {
        doc.setFillColor(...ROW_ALT)
        doc.rect(ML, ry, CW, rowH - 0.5, 'F')
      }

      // Label
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...LIGHT)
      doc.text(String(label), x + 3, ry + 4.5)

      // Value
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DARK)
      doc.text(String(value ?? '-'), x + 3, ry + 9.5, { maxWidth: colW - 6 })
    })

    // Bottom divider
    doc.setDrawColor(...DIVIDER)
    doc.setLineWidth(0.3)
    doc.line(ML, y + totalRows * rowH, ML + CW, y + totalRows * rowH)

    y += totalRows * rowH + 6
    if (y > 252) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
  }

  // ── Sections ──────────────────────────────────────────────────
  section('Job Details')
  kvGrid([
    ['Functional Location',  card.functional_location_text],
    ['Equipment',            card.equipment],
    ['Alternative Label',    card.alternative_label],
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
      headStyles:         { fillColor: TBLHDR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_ALT },
      styles:             { lineColor: DIVIDER, lineWidth: 0.2 },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (equipment?.length) {
    if (y > 235) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
    section('Order Object List')
    autoTable(doc, {
      startY: y,
      head: [['Functional Location Code', 'Description']],
      body: equipment.map(eq => [eq.functional_location_code ?? '-', eq.description ?? '-']),
      headStyles:         { fillColor: TBLHDR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_ALT },
      styles:             { lineColor: DIVIDER, lineWidth: 0.2 },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (completion) {
    if (y > 235) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
    section('Completion Data')
    kvGrid([
      ['Actual Hours',  completion.actual_working_hours != null ? completion.actual_working_hours + ' hrs' : null],
      ['Completed By',  completion['profiles!completed_by']?.full_name],
      ['Task Start',    formatDateTime(completion.task_start_datetime)],
      ['Task End',      formatDateTime(completion.task_end_datetime)],
    ])
    if (completion.notes) {
      if (y > 248) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...MID)
      doc.text('Completion Notes', ML, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...DARK)
      const lines = doc.splitTextToSize(completion.notes, CW)
      doc.text(lines, ML, y)
      y += lines.length * 5 + 6
    }
  }

  if (delays?.length) {
    if (y > 235) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
    section('Delays / Not-Done Codes')
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Description', 'Duration (hrs)']],
      body: delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '-']
      }),
      headStyles:         { fillColor: TBLHDR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_ALT },
      styles:             { lineColor: DIVIDER, lineWidth: 0.2 },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (downtime?.length) {
    if (y > 235) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
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
      headStyles:         { fillColor: TBLHDR, textColor: WHITE, fontSize: 7.5, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      alternateRowStyles: { fillColor: ROW_ALT },
      styles:             { lineColor: DIVIDER, lineWidth: 0.2 },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 8
  }

  if (card.notes) {
    if (y > 240) { doc.addPage(); _pageHeader(doc, null, PW, ML, 'Job Card Report', card.order_no ?? ''); y = 42 }
    section('Notes')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...DARK)
    const lines = doc.splitTextToSize(card.notes, CW)
    doc.text(lines, ML, y)
    y += lines.length * 5 + 6
  }

  // Stamp all footers
  const total = doc.internal.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    _pageFooter(doc, p, total, PW)
  }

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
    const ops = [
      ['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description'],
      ...operations.map(op => [op.opr_no ?? '', op.ctrl_key ?? '', op.work_c ?? '', op.system_condition ?? '', op.description ?? '']),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ops), 'Operations')
  }

  if (equipment?.length) {
    const eq = [
      ['Functional Location Code', 'Description'],
      ...equipment.map(e => [e.functional_location_code ?? '', e.description ?? '']),
    ]
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
    const del = [
      ['Code', 'Description', 'Duration (hrs)'],
      ...delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? '']
      }),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(del), 'Delays')
  }

  if (downtime?.length) {
    const dt = [
      ['Type', 'Start', 'End', 'Duration (hrs)', 'Notes'],
      ...downtime.map(d => [
        d.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(d.started_at) ?? '',
        formatDateTime(d.ended_at) ?? '',
        d.duration_hours ?? '',
        d.notes ?? '',
      ]),
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dt), 'Downtime')
  }

  XLSX.writeFile(wb, 'JobCard_' + (card.order_no ?? card.id) + '_' + _today() + '.xlsx')
}

// =============================================================
//  Internal helpers
// =============================================================
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

/**
 * Shared page header: white background, WearCheck logo left,
 * title right, Tronox green accent bar at bottom.
 */
function _pageHeader(doc, logo, PW, ML, title, subtitle) {
  const HEADER_H = 32

  // White header background
  doc.setFillColor(...WHITE)
  doc.rect(0, 0, PW, HEADER_H, 'F')

  // Logo
  if (logo) doc.addImage(logo, 'PNG', ML, 5, 22, 22)
  const textX = logo ? ML + 26 : ML

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text(title, textX, 14)

  // Subtitle (left, beside title)
  if (subtitle) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...MID)
    doc.text(subtitle, textX, 21)
  }

  // Generated timestamp (right-aligned)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text(new Date().toLocaleString('en-ZA'), PW - ML, 14, { align: 'right' })
  doc.text('Tronox CM Portal - Wearcheck Reliability Solutions', PW - ML, 21, { align: 'right' })

  // Green accent bar at bottom of header
  doc.setFillColor(...GREEN)
  doc.rect(0, HEADER_H - 2, PW, 2, 'F')

  // Thin light rule beneath accent
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.2)
  doc.line(0, HEADER_H, PW, HEADER_H)
}

/**
 * Page footer: thin rule, page number right, company name left.
 */
function _pageFooter(doc, current, total, PW) {
  const FOOTER_Y = PW === 297 ? 204 : 288
  doc.setDrawColor(...DIVIDER)
  doc.setLineWidth(0.4)
  doc.line(14, FOOTER_Y, PW - 14, FOOTER_Y)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...LIGHT)
  doc.text('Tronox CM Portal - Wearcheck Reliability Solutions', 14, FOOTER_Y + 4)
  doc.text('Page ' + current + ' of ' + total, PW - 14, FOOTER_Y + 4, { align: 'right' })
}
