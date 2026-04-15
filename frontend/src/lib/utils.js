import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, fmt = 'dd MMM yyyy') {
  if (!date) return '—'
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return '—'
  return format(d, fmt)
}

export function formatDateTime(date) {
  return formatDate(date, 'dd MMM yyyy HH:mm')
}

export function formatDuration(hours) {
  if (hours == null || isNaN(hours)) return '—'
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ')
}

export function generateOrderNo() {
  const now = new Date()
  const year = now.getFullYear().toString().slice(2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `WCK${year}${month}${rand}/0010/KS01`
}
