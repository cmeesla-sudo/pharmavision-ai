import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useMedicines } from '../hooks/useMedicines'

const GROUP = [
  { label: 'Expired',        key: 'expired',   days: [-Infinity, 0],  color: 'border-error bg-error-container/10 text-on-error-container', badge: 'bg-error-container text-on-error-container', icon: 'dangerous' },
  { label: 'Critical (≤30d)', key: 'critical',  days: [0, 30],         color: 'border-[#f59e0b] bg-[#fef3c7]/60 text-[#92400e]', badge: 'bg-[#fef3c7] text-[#92400e]', icon: 'warning' },
  { label: 'Warning (≤60d)', key: 'warning',    days: [30, 60],        color: 'border-tertiary bg-tertiary-container/10 text-on-tertiary-container', badge: 'bg-tertiary-container text-on-tertiary-container', icon: 'schedule' },
  { label: 'Watch (≤90d)',   key: 'watch',      days: [60, 90],        color: 'border-secondary bg-secondary-container/10 text-on-secondary-container', badge: 'bg-secondary-container text-on-secondary-container', icon: 'event_note' },
]

export default function ExpiryPage() {
  const { medicines, loading } = useMedicines()
  const today = new Date()

  const groups = useMemo(() => {
    return GROUP.map(g => ({
      ...g,
      items: medicines.filter(m => {
        if (!m.expiry_date) return false
        const d = Math.ceil((new Date(m.expiry_date) - today) / 86400000)
        return d >= g.days[0] && d < g.days[1]
      }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date)),
    }))
  }, [medicines])

  const totalAtRisk = groups.reduce((s, g) => s + g.items.length, 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Expiry Tracking</h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">Monitor medicines nearing or past their expiry dates.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-error-container/20 border border-error/20 rounded-xl">
          <span className="material-symbols-outlined text-error text-[20px]">warning</span>
          <span className="font-label-md text-label-md text-error font-bold">{totalAtRisk} medicines at risk</span>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {GROUP.map(g => {
          const count = groups.find(x => x.key === g.key)?.items.length || 0
          return (
            <div key={g.key} className={`glass-card p-4 rounded-2xl border-l-4 ${g.color}`}>
              <p className="text-[10px] font-bold uppercase mb-2">{g.label}</p>
              <p className="text-[32px] font-bold">{loading ? '—' : count}</p>
              <p className="text-[11px] mt-1 opacity-70">medicines</p>
            </div>
          )
        })}
      </div>

      {/* Groups */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
        </div>
      ) : totalAtRisk === 0 ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">All Clear!</h3>
          <p className="text-body-md text-on-surface-variant">No medicines expiring within the next 90 days.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.filter(g => g.items.length > 0).map(g => (
            <div key={g.key} className={`glass-card rounded-2xl overflow-hidden border-l-4 ${g.color}`}>
              <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">{g.icon}</span>
                  <h4 className="font-headline-sm text-headline-sm">{g.label}</h4>
                </div>
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold ${g.badge}`}>{g.items.length} medicines</span>
              </div>
              <div className="divide-y divide-outline-variant/20">
                {g.items.map(m => {
                  const daysLeft = Math.ceil((new Date(m.expiry_date) - today) / 86400000)
                  return (
                    <div key={m.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 p-4 hover:bg-surface-container/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-label-md text-label-md font-bold text-on-surface truncate">{m.name}</p>
                          <p className="text-[11px] text-on-surface-variant">{m.category} • Batch: {m.batch_number || '—'} • {m.quantity} units left</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:gap-6 sm:ml-4 flex-wrap">
                        <div className="text-center">
                          <p className="text-[10px] text-on-surface-variant uppercase">Expiry</p>
                          <p className="font-bold text-[13px]">{new Date(m.expiry_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'2-digit' })}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-on-surface-variant uppercase">Days Left</p>
                          <p className={`font-bold text-[13px] ${daysLeft < 0 ? 'text-error' : daysLeft <= 30 ? 'text-[#f59e0b]' : 'text-on-surface'}`}>
                            {daysLeft < 0 ? `${Math.abs(daysLeft)}d ago` : `${daysLeft}d`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/inventory/${m.id}/edit`}
                            className="px-3 py-1.5 text-[11px] font-semibold text-primary border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
                            Edit
                          </Link>
                          <Link to={`/inventory/${m.id}`}
                            className="px-3 py-1.5 text-[11px] font-semibold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors">
                            View
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
