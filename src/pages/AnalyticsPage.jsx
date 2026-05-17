import { useMedicines } from '../hooks/useMedicines'
import { useBilling }   from '../hooks/useBilling'

const Bar = ({ label, value, max, color }) => (
  <div className="flex items-center gap-3">
    <span className="text-[12px] text-on-surface-variant w-24 shrink-0 truncate">{label}</span>
    <div className="flex-1 h-6 bg-surface-container-low rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }} />
    </div>
    <span className="text-[12px] font-bold text-on-surface w-8 text-right">{value}</span>
  </div>
)

export default function AnalyticsPage() {
  const { medicines, stats, loading: medLoading } = useMedicines()
  const { sessions, loading: billLoading }        = useBilling()

  const totalRevenue  = sessions.reduce((s, b) => s + Number((b.total_amount ?? b.total) || 0), 0)
  const totalBills    = sessions.length
  const avgBill       = totalBills > 0 ? totalRevenue / totalBills : 0
  const totalUnits    = medicines.reduce((s, m) => s + m.quantity, 0)

  // Revenue by day (last 7 days)
  const revenueByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const ds = d.toISOString().split('T')[0]
    return {
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: sessions.filter(s => ((s.transaction_time ?? s.created_at) || '').startsWith(ds)).reduce((s, b) => s + Number((b.total_amount ?? b.total) || 0), 0),
    }
  })
  const maxRevDay = Math.max(...revenueByDay.map(d => d.value), 1)

  const categoryData = Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1])
  const maxCat = categoryData[0]?.[1] || 1

  const KPI = ({ icon, iconBg, label, value, sub }) => (
    <div className="glass-card p-5 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 ${iconBg} rounded-xl`}><span className="material-symbols-outlined text-[20px]">{icon}</span></div>
      </div>
      <p className="text-[11px] text-on-surface-variant uppercase font-bold mb-1">{label}</p>
      <p className="font-bold text-on-surface text-[26px]">{medLoading || billLoading ? '—' : value}</p>
      {sub && <p className="text-[11px] text-on-surface-variant mt-1">{sub}</p>}
    </div>
  )

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Analytics & Reports</h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">Real-time insights into your pharmacy performance.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KPI icon="medication"  iconBg="bg-primary/10 text-primary"    label="Total Medicines"  value={stats.total}                  sub={`${stats.lowStock} low stock`} />
        <KPI icon="payments"    iconBg="bg-secondary/10 text-secondary" label="Total Revenue"    value={`₹${totalRevenue.toFixed(0)}`} sub={`${totalBills} bills`} />
        <KPI icon="inventory"   iconBg="bg-error/10 text-error"         label="Total Units"      value={totalUnits}                   sub="across all medicines" />
        <KPI icon="trending_up" iconBg="bg-tertiary/10 text-tertiary"   label="Avg Bill Value"   value={`₹${avgBill.toFixed(0)}`}     sub="per transaction" />
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Revenue chart */}
        <div className="col-span-12 lg:col-span-8 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Revenue — Last 7 Days</h4>
              <p className="text-[12px] text-on-surface-variant mt-0.5">Daily billing totals</p>
            </div>
            <span className="font-bold text-primary text-[18px]">₹{totalRevenue.toFixed(0)}</span>
          </div>

          {billLoading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[40px] animate-spin">refresh</span>
            </div>
          ) : (
            <div className="flex items-end justify-around gap-2 h-48">
              {revenueByDay.map(({ label, value }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-primary">
                    {value > 0 ? `₹${value.toFixed(0)}` : ''}
                  </span>
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className="w-full bg-primary rounded-t-lg transition-all duration-700 min-h-[4px]"
                      style={{ height: maxRevDay > 0 ? `${Math.max((value / maxRevDay) * 100, 4)}%` : '4%', opacity: value > 0 ? 1 : 0.2 }}
                    />
                  </div>
                  <span className="text-[11px] text-on-surface-variant">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inventory health */}
        <div className="col-span-12 lg:col-span-4 glass-card rounded-2xl p-6">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4">Inventory Health</h4>
          <div className="space-y-4">
            {[
              { label: 'In Stock',      value: stats.total - stats.lowStock - stats.expired, color: 'bg-primary', total: stats.total },
              { label: 'Low Stock',     value: stats.lowStock,    color: 'bg-[#f59e0b]', total: stats.total },
              { label: 'Expiring (30d)', value: stats.expiringSoon, color: 'bg-error',   total: stats.total },
              { label: 'Expired',       value: stats.expired,     color: 'bg-error/40',  total: stats.total },
            ].map(({ label, value, color, total }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-[12px]">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-bold text-on-surface">{value}</span>
                </div>
                <div className="h-2 bg-surface-container-low rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: total > 0 ? `${Math.max((value / total) * 100, 0)}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant/20">
            <h5 className="font-label-md text-label-md font-bold text-on-surface mb-3">Total Value</h5>
            <p className="text-[28px] font-bold text-primary">₹{stats.totalValue.toFixed(0)}</p>
            <p className="text-[12px] text-on-surface-variant mt-1">Across {stats.total} medicine SKUs</p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="col-span-12 lg:col-span-6 glass-card rounded-2xl p-6">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-5">Medicines by Category</h4>
          {medLoading ? (
            <div className="h-40 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[40px] animate-spin">refresh</span>
            </div>
          ) : categoryData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-center">
              <p className="text-on-surface-variant text-[13px]">No inventory data yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {categoryData.map(([cat, count]) => (
                <Bar key={cat} label={cat} value={count} max={maxCat} color="bg-primary" />
              ))}
            </div>
          )}
        </div>

        {/* Recent bills */}
        <div className="col-span-12 lg:col-span-6 glass-card rounded-2xl p-6">
          <h4 className="font-headline-sm text-headline-sm text-on-surface mb-5">Recent Transactions</h4>
          {billLoading ? (
            <div className="h-40 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[40px] animate-spin">refresh</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-center">
              <p className="text-on-surface-variant text-[13px]">No transactions recorded yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 5).map(s => {
                const txTime = s.transaction_time ?? s.created_at;
                const dateStr = txTime ? new Date(txTime).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : "No Date";
                const amount = Number((s.total_amount ?? s.total) || 0);
                const title = s.medicine_name ? `${s.medicine_name} (${s.quantity_sold ?? 1}x)` : s.patient_name || 'Walk-in Patient';
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-md text-label-md font-bold text-on-surface text-[12px] truncate">{title}</p>
                      <p className="text-[11px] text-on-surface-variant">{dateStr}</p>
                    </div>
                    <p className="font-bold text-primary text-[14px] shrink-0">₹{amount.toFixed(2)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
