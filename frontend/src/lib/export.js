import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { formatDate, formatDateTime, formatDuration } from './utils'
import { DELAY_CODES } from './constants'

// â”€â”€â”€ Brand colours â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAVY    = [30, 58, 95]      // #1e3a5f
const GREEN   = [128, 188, 0]     // #80BC00
const SLATE   = [71, 85, 105]
const LIGHT   = [248, 249, 250]
const WHITE   = [255, 255, 255]
const RED_ROW = [255, 245, 245]
const AMB_ROW = [255, 251, 235]

// â”€â”€â”€ Shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function statusLabel(s) {
  const map = { draft: 'Draft', open: 'Open', in_progress: 'In Progress', completed: 'Completed', closed: 'Closed', cancelled: 'Cancelled' }
  return map[s] ?? s ?? 'â€”'
}

function statusColors(s) {
  if (s === 'completed') return { fill: [220, 252, 231], text: [21, 128, 61] }
  if (s === 'in_progress') return { fill: [254, 243, 199], text: [146, 64, 14] }
  if (s === 'open') return { fill: [219, 234, 254], text: [29, 78, 216] }
  if (s === 'cancelled') return { fill: [254, 226, 226], text: [185, 28, 28] }
  if (s === 'closed') return { fill: [226, 232, 240], text: [71, 85, 105] }
  return { fill: [226, 232, 240], text: [71, 85, 105] }
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

// ============================================================
//  LIST EXPORT â€” PDF
// ============================================================
export async function exportListPDF(cards, filters = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadLogoDataUrl()

  // Header band
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 297, 22, 'F')
  doc.setFillColor(...GREEN)
  doc.rect(0, 22, 297, 2, 'F')

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 9, 2, 18, 18)
  }

  const textX = logoDataUrl ? 31 : 10
  doc.setFontSize(14)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('Tronox CM Portal', textX, 10)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Job Cards Export', textX, 16.5)

  doc.setFontSize(7.5)
  doc.setTextColor(200, 220, 170)
  doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}   |   ${cards.length} records`, 287, 16.5, { align: 'right' })

  // Filter pills row
  const parts = []
  if (filters.dateFrom || filters.dateTo) parts.push(`Date: ${filters.dateFrom || 'â€¦'} â†’ ${filters.dateTo || 'â€¦'}`)
  if (filters.statusLabel) parts.push(`Status: ${filters.statusLabel}`)
  if (filters.plantName)   parts.push(`Plant: ${filters.plantName}`)
  if (parts.length) {
    doc.setFontSize(7)
    doc.setTextColor(...SLATE)
    doc.text('Filters: ' + parts.join('   Â·   '), 10, 29)
  }

  autoTable(doc, {
    startY: parts.length ? 33 : 28,
    head: [['Order No.', 'Description', 'Plant', 'Start Date', 'Priority', 'Activity Type', 'Status']],
    body: cards.map(c => [
      c.order_no ?? 'â€”',
      c.description_of_work_order ?? 'â€”',
      c.plants?.name ?? 'â€”',
      formatDate(c.basic_start_date) ?? 'â€”',
      c.order_priority ?? 'â€”',
      c.maintenance_activity_type ?? 'â€”',
      statusLabel(c.status),
    ]),
    headStyles: { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: LIGHT },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 32 }, 6: { cellWidth: 26 } },
    margin: { left: 10, right: 10 },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
    didDrawPage: (data) => {
      const n = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(...SLATE)
      doc.text(`Page ${data.pageNumber} of ${n}`, 287, 207, { align: 'right' })
      doc.text('Tronox CM Portal â€” Wearcheck Reliability Solutions', 10, 207)
    },
  })

  doc.save(`JobCards_Export_${_today()}.pdf`)
}

// ============================================================
//  LIST EXPORT â€” Excel
// ============================================================
export function exportListExcel(cards, filters = {}) {
  const rows = cards.map(c => ({
    'Order No.':        c.order_no ?? '',
    'Description':      c.description_of_work_order ?? '',
    'Plant':            c.plants?.name ?? '',
    'Start Date':       c.basic_start_date ?? '',
    'Priority':         c.order_priority ?? '',
    'Activity Type':    c.maintenance_activity_type ?? '',
    'Assigned To':      c.profiles?.full_name ?? c.profiles?.email ?? '',
    'Work Centre':      c.main_work_centre_text ?? '',
    'Status':           statusLabel(c.status),
    'Created At':       c.created_at ? formatDateTime(c.created_at) : '',
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  _autoColWidth(ws, rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Job Cards')

  const filterRows = [
    ['Filter', 'Value'],
    ['Date From',       filters.dateFrom     || 'All'],
    ['Date To',         filters.dateTo       || 'All'],
    ['Status',          filters.statusLabel  || 'All'],
    ['Plant',           filters.plantName    || 'All'],
    ['Generated',       new Date().toLocaleString('en-ZA')],
    ['Total Records',   cards.length],
  ]
  const wsf = XLSX.utils.aoa_to_sheet(filterRows)
  wsf['!cols'] = [{ wch: 18 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsf, 'Export Info')

  XLSX.writeFile(wb, `JobCards_Export_${_today()}.xlsx`)
}

// ============================================================
//  SINGLE JOB CARD â€” PDF  (modern, sleek design)
// ============================================================
export async function exportDetailPDF({ card, equipment, operations, completion, delays, downtime }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const logoDataUrl = await loadLogoDataUrl()
  const PW = 210  // page width
  const ML = 12   // margin left
  const MR = 12   // margin right
  const CW = PW - ML - MR  // content width

  // â”€â”€ Header band â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, PW, 28, 'F')
  doc.setFillColor(...GREEN)
  doc.rect(0, 28, PW, 2.5, 'F')

  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', ML, 3.5, 20, 20)
  }

  const hx = logoDataUrl ? ML + 24 : ML
  doc.setFontSize(15)
  doc.setTextColor(...WHITE)
  doc.setFont('helvetica', 'bold')
  doc.text('Job Card Report', hx, 12)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(190, 215, 160)
  doc.text('Tronox CM Portal â€” Wearcheck Reliability Solutions', hx, 19)
  doc.setTextColor(160, 195, 140)
  doc.setFontSize(7.5)
  doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, PW - MR, 22, { align: 'right' })

  let y = 36

  // â”€â”€ Order No + Title card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.setFillColor(243, 246, 250)
  doc.roundedRect(ML, y, CW, 20, 2, 2, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...NAVY)
  doc.text(card.description_of_work_order || card.order_no || 'â€”', ML + 4, y + 8, { maxWidth: CW - 40 })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...SLATE)
  doc.text(`Order No: ${card.order_no ?? 'â€”'}   Â·   Plant: ${card.plants?.name ?? 'â€”'}`, ML + 4, y + 14.5)

  // Status pill
  const sc = statusColors(card.status)
  const sLabel = statusLabel(card.status)
  const pillW = doc.getStringUnitWidth(sLabel) * 8 / doc.internal.scaleFactor + 8
  doc.setFillColor(...sc.fill)
  doc.roundedRect(PW - MR - pillW - 2, y + 4, pillW + 4, 8, 2, 2, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...sc.text)
  doc.text(sLabel, PW - MR, y + 9.5, { align: 'right' })

  y += 24

  // â”€â”€ Section helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const section = (title, iconChar = '') => {
    if (y > 248) { doc.addPage(); _pageFooter(doc); y = 16 }
    doc.setFillColor(...NAVY)
    doc.roundedRect(ML, y, CW, 7, 1, 1, 'F')
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...WHITE)
    doc.text((iconChar ? iconChar + '  ' : '') + title.toUpperCase(), ML + 3.5, y + 4.7)
    y += 10
  }

  // â”€â”€ Key-value grid helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const kvGrid = (pairs, cols = 2) => {
    const colW = CW / cols
    let maxH = 0
    pairs.forEach(([label, value], i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const x = ML + col * colW
      const ry = y + row * 14
      // subtle row background for even rows
      if (row % 2 === 0) {
        doc.setFillColor(250, 251, 253)
        doc.rect(ML, ry - 1, CW, 13, 'F')
      }
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...SLATE)
      doc.text(label, x + 2, ry + 4)
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(20, 30, 50)
      const val = String(value ?? 'â€”')
      doc.text(val, x + 2, ry + 10, { maxWidth: colW - 4 })
      maxH = Math.max(maxH, (Math.ceil(val.length / 30)) * 14)
    })
    const totalRows = Math.ceil(pairs.length / cols)
    y += totalRows * 14 + 2
    if (y > 248) { doc.addPage(); _pageFooter(doc); y = 16 }
  }

  // â”€â”€ Job Details â”€â”€
  section('Job Details')
  kvGrid([
    ['Functional Location', card.functional_location_text],
    ['Equipment',           card.equipment],
    ['Alternative Label',   card.alternative_label],
    ['Maintenance Activity', card.maintenance_activity_type],
  ])

  // â”€â”€ Planning â”€â”€
  section('Planning & Scheduling')
  kvGrid([
    ['Basic Start Date',     formatDate(card.basic_start_date)],
    ['Planned Duration',     card.planned_duration ? `${card.planned_duration} hrs` : null],
    ['Op. Must Start',       formatDate(card.operation_must_start_date)],
    ['Order Priority',       card.order_priority],
    ['Package Used',         card.package_used],
    ['Planner Group',        card.planner_group_text],
  ])

  // â”€â”€ Assignment â”€â”€
  section('Assignment')
  kvGrid([
    ['Assigned To',      card.profiles?.full_name ?? card.profiles?.email],
    ['Main Work Centre', card.main_work_centre_text],
    ['Created By',       card.created_by_employee],
    ['Plant',            card.plants?.name],
  ])

  // â”€â”€ Operations â”€â”€
  if (operations?.length) {
    section('Operations')
    autoTable(doc, {
      startY: y,
      head: [['Opr No', 'Ctrl Key', 'Work/C', 'System Condition', 'Description']],
      body: operations.map(op => [op.opr_no ?? 'â€”', op.ctrl_key ?? 'â€”', op.work_c ?? 'â€”', op.system_condition ?? 'â€”', op.description ?? 'â€”']),
      headStyles:          { fillColor: [50, 75, 115], textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:          { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles:  { fillColor: LIGHT },
      margin:              { left: ML, right: MR },
      tableWidth:          CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // â”€â”€ Equipment â”€â”€
  if (equipment?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Order Object List')
    autoTable(doc, {
      startY: y,
      head: [['Functional Location Code', 'Description']],
      body: equipment.map(eq => [eq.functional_location_code ?? 'â€”', eq.description ?? 'â€”']),
      headStyles:         { fillColor: [50, 75, 115], textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: LIGHT },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // â”€â”€ Completion â”€â”€
  if (completion) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Completion Data')
    doc.setFillColor(240, 253, 244)
    doc.rect(ML, y - 2, CW, 30, 'F')
    kvGrid([
      ['Actual Hours',     completion.actual_working_hours != null ? `${completion.actual_working_hours} hrs` : null],
      ['Completed By',     completion['profiles!completed_by']?.full_name],
      ['Task Start',       formatDateTime(completion.task_start_datetime)],
      ['Task End',         formatDateTime(completion.task_end_datetime)],
    ])
    if (completion.notes) {
      if (y > 245) { doc.addPage(); _pageFooter(doc); y = 16 }
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...SLATE)
      doc.text('Completion Notes', ML, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(20, 30, 50)
      const lines = doc.splitTextToSize(completion.notes, CW)
      doc.text(lines, ML, y)
      y += lines.length * 4.5 + 4
    }
  }

  // â”€â”€ Delays â”€â”€
  if (delays?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Delays / Not-Done Codes')
    autoTable(doc, {
      startY: y,
      head: [['Code', 'Description', 'Duration (hrs)']],
      body: delays.map(d => {
        const meta = DELAY_CODES.find(c => c.code === d.delay_code)
        return [d.delay_code, meta?.description ?? d.delay_code, d.duration_hours ?? 'â€”']
      }),
      headStyles:         { fillColor: [154, 96, 0], textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: AMB_ROW },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // â”€â”€ Downtime â”€â”€
  if (downtime?.length) {
    if (y > 230) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Downtime Events')
    autoTable(doc, {
      startY: y,
      head: [['Type', 'Start', 'End', 'Duration (hrs)', 'Notes']],
      body: downtime.map(dt => [
        dt.is_breakdown ? 'Breakdown' : 'Planned',
        formatDateTime(dt.started_at) ?? 'â€”',
        formatDateTime(dt.ended_at) ?? 'â€”',
        dt.duration_hours != null ? dt.duration_hours.toFixed(1) : 'â€”',
        dt.notes ?? '',
      ]),
      headStyles:         { fillColor: [160, 30, 30], textColor: WHITE, fontSize: 7, fontStyle: 'bold', cellPadding: 2.5 },
      bodyStyles:         { fontSize: 7.5, cellPadding: 2.5 },
      alternateRowStyles: { fillColor: RED_ROW },
      margin:             { left: ML, right: MR },
      tableWidth:         CW,
    })
    y = doc.lastAutoTable.finalY + 5
  }

  // â”€â”€ Notes â”€â”€
  if (card.notes) {
    if (y > 235) { doc.addPage(); _pageFooter(doc); y = 16 }
    section('Notes')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 30, 50)
    const lines = doc.splitTextToSize(card.notes, CW)
    doc.text(lines, ML, y)
    y += lines.length * 5 + 4
  }

  // â”€â”€ Footer on all pages â”€â”€
  _pageFooter(doc)

  doc.save(`JobCard_${card.order_no ?? card.id}_${_today()}.pdf`)
}

// ============================================================
//  SINGLE JOB CARD â€” Excel
// ============================================================
export function exportDetailExcel({ card, equipment, operations, completion, delays, downtime }) {
  const wb = XLSX.utils.book_new()

  const summary = [
    ['TRONOX CM PORTAL â€” JOB CARD REPORT'],
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
    ['Basic Start Date',     formatDate(card.basic_start_date) ?? ''],
    ['Op Must Start',        formatDate(card.operation_must_start_date) ?? ''],
    ['Planned Duration',     card.planned_duration ? `${card.planned_duration} hrs` : ''],
    ['Order Priority',       card.order_priority ?? ''],
    ['Package Used',         card.package_used ?? ''],
    ['Planner Group',        card.planner_group_text ?? ''],
    [],
    ['ASSIGNMENT'],
    ['Assigned To',       card.profiles?.full_name ?? card.profiles?.email ?? ''],
    ['Main Work Centre',  card.main_work_centre_text ?? ''],
    ['Created By',        card.created_by_employee ?? ''],
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

  XLSX.writeFile(wb, `JobCard_${card.order_no ?? card.id}_${_today()}.xlsx`)
}

// â”€â”€â”€ Internal helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    doc.setFontSize(7)
    doc.setTextColor(...SLATE)
    doc.text(`Page ${i} of ${n}`, 198, 291, { align: 'right' })
    doc.text('Tronox CM Portal â€” Wearcheck Reliability Solutions', 12, 291)
    // bottom green rule
    doc.setDrawColor(...GREEN)
    doc.setLineWidth(0.5)
    doc.line(12, 288, 198, 288)
  }
}
