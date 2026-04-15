import { cn } from '../lib/utils'

export default function StatsCard({ label, value, icon: Icon, trend, accent, className }) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4', className)}>
      {Icon && (
        <div className={cn('p-2 rounded-lg', accent ? 'bg-accent-100 text-accent-500' : 'bg-brand-50 text-brand-600')}>
          <Icon size={20} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
        {trend != null && (
          <p className={cn('text-xs mt-1', trend >= 0 ? 'text-green-600' : 'text-red-500')}>
            {trend >= 0 ? '+' : ''}{trend}% vs last month
          </p>
        )}
      </div>
    </div>
  )
}
