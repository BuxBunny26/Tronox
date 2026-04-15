import { cn } from '../lib/utils'
import { getStatusMeta } from '../lib/constants'

export default function Badge({ status, label, className }) {
  const meta = status ? getStatusMeta(status) : null
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        meta ? meta.color : 'bg-slate-100 text-slate-700',
        className
      )}
    >
      {label ?? meta?.label ?? status}
    </span>
  )
}
