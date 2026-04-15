export const DELAY_CODES = [
  { code: 'M01', category: 'delay', description: 'Delay: Abnormal Travel Time' },
  { code: 'M02', category: 'delay', description: 'Delay: No Transport' },
  { code: 'M03', category: 'delay', description: 'Delay: Spares Issuing - Stores' },
  { code: 'M04', category: 'delay', description: 'Delay: No Personnel to Assist' },
  { code: 'M05', category: 'delay', description: 'Delay: No Support Equipment' },
  { code: 'M06', category: 'delay', description: 'Delay: PTO / Training' },
  { code: 'M07', category: 'delay', description: 'Delay: Equipment Handed Over Late' },
  { code: 'M08', category: 'delay', description: 'Delay: Waiting for Permit' },
  { code: 'M09', category: 'delay', description: 'Delay: Waiting for Lockout' },
  { code: 'M10', category: 'delay', description: 'Delay: Return Stock to Stores' },
  { code: 'N00', category: 'not_done', description: 'Not Done: Supervisor Decision' },
  { code: 'N01', category: 'not_done', description: 'Not Done: No Personnel' },
  { code: 'N02', category: 'not_done', description: 'Not Done: No Support Equipment' },
  { code: 'N03', category: 'not_done', description: 'Not Done: Attend to Breakdown' },
  { code: 'N04', category: 'not_done', description: 'Not Done: Spares Not in Stock' },
  { code: 'N05', category: 'not_done', description: 'Not Done: Equipment Not in Use' },
  { code: 'N06', category: 'not_done', description: 'Not Done: Activity Postponed' },
  { code: 'N07', category: 'not_done', description: 'Not Done: Equipment Unavailable' },
]

export const JOB_STATUSES = [
  { value: 'draft',       label: 'Draft',       color: 'bg-slate-100 text-slate-700' },
  { value: 'open',        label: 'Open',        color: 'bg-blue-100 text-blue-700' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
  { value: 'completed',   label: 'Completed',   color: 'bg-green-100 text-green-700' },
  { value: 'closed',      label: 'Closed',      color: 'bg-slate-200 text-slate-600' },
  { value: 'cancelled',   label: 'Cancelled',   color: 'bg-red-100 text-red-700' },
]

export const ROLES = [
  { value: 'admin',      label: 'Admin',      description: 'Full access, user management' },
  { value: 'planner',    label: 'Planner',    description: 'Create & manage job cards' },
  { value: 'supervisor', label: 'Supervisor', description: 'Assign, review, approve job cards' },
  { value: 'artisan',    label: 'Artisan',    description: 'View assigned cards, fill completions' },
  { value: 'analyst',    label: 'Analyst',    description: 'Read-only analytics access' },
  { value: 'client',     label: 'Client',     description: 'Tronox management view' },
]

export const ORDER_PRIORITIES = [
  '1 - Very High',
  '2 - Low',
  '3 - Medium',
  '4 - High',
]

export const ACTIVITY_TYPES = [
  'Inspection',
  'Preventive Maintenance',
  'Corrective Maintenance',
  'Calibration',
  'Vibration Analysis',
  'Lubrication',
  'Overhaul',
]

export const PACKAGES = [
  '1 Monthly',
  '2 Monthly',
  '3 Monthly',
  '4 Weeks',
  '6 Monthly',
  '12 Monthly',
  'Ad Hoc',
]

export function getStatusMeta(status) {
  return JOB_STATUSES.find(s => s.value === status) ?? JOB_STATUSES[0]
}
