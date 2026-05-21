import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useMedicines } from '../hooks/useMedicines'
import { useBilling } from '../hooks/useBilling'
import { useNotifications } from '../hooks/useNotifications'
import DashboardListModal from '../components/shared/DashboardListModal'

const StatCard = ({ icon, iconBg, label, value, badge, badgeColor, sub, onView }) => (
  <div className="bg-surface-container-lowest p-4 md:p-5 rounded-xl border border-outline-variant/30 soft-lift hover:border-primary/30 transition-colors relative group">
    <div className="flex justify-between items-start mb-3">
      <div className={`p-2.5 ${iconBg} rounded-lg`}>
        <span className="material-symbols-outlined text-[22px]">{icon}</span>
      </div>
      {badge && <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded-full text-[11px] ${badgeColor}`}>{badge}</span>}
    </div>
    <p className="font-label-md text-label-md text-on-surface-variant text-[12px]">{label}</p>
    <div className="flex items-end justify-between mt-0.5">
      <h3 className="font-headline-lg text-headline-lg font-bold text-on-surface text-[28px]">{value}</h3>
      {onView && (
        <button 
          onClick={onView} 
          className="px-3 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 rounded-lg text-[12px] font-bold text-on-surface-variant hover:text-primary transition-all flex items-center gap-1 opacity-0 group-hover:opacity-100"
        >
          View <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      )}
    </div>
    {sub && <p className="text-[11px] text-on-surface-variant mt-1">{sub}</p>}
  </div>
)

export default function DashboardPage() {
  const [modalType, setModalType] = useState(null)
  const { profile } = useAuth()
  const { medicines, stats, loading: medLoading } = useMedicines()
  const { sessions, todayRevenue }                 = useBilling()
  const { notifications, unreadCount }             = useNotifications()

  const recentMeds = medicines.slice(0, 5)
  const recentAlerts = notifications.filter(n => !n.is_read).slice(0, 3)

  const QUICK_ACTIONS = [
    { icon: 'add_box',          label: 'Add Medicine',  sub: 'Stock Intake',  color: 'bg-primary/10 text-primary',      to: '/inventory/add' },
    { icon: 'qr_code_scanner',  label: 'AI Scanner',    sub: 'Smart Scan',    color: 'bg-secondary/10 text-secondary',  to: '/ai-scanner' },
    { icon: 'event_busy',       label: 'Check Expiry',  sub: 'Track Dates',   color: 'bg-tertiary/10 text-tertiary',    to: '/expiry' },
    { icon: 'insights',         label: 'Analytics',     sub: 'View Reports',  color: 'bg-primary/10 text-primary',      to: '/analytics' },
    { icon: 'receipt_long',     label: 'Billing',       sub: 'New Bill',      color: 'bg-secondary/10 text-secondary',  to: '/billing' },
    { icon: 'settings',         label: 'Settings',      sub: 'Configure',     color: 'bg-surface-container-high text-on-surface-variant', to: '/settings' },
  ]

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, {profile?.owner_name?.split(' ')[0] || 'Pharmacist'} 👋
          </h2>
          <p className="text-on-surface-variant font-body-md mt-0.5">{profile?.pharmacy_name || 'Your Pharmacy'} — {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/billing"
            className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Bill
          </Link>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard icon="medication"   iconBg="bg-primary/10 text-primary"    label="Total Medicines" value={medLoading ? '—' : stats.total.toString()} badge={stats.total > 0 ? 'Active' : null} badgeColor="text-primary bg-secondary-container/20" />
        <StatCard icon="payments"     iconBg="bg-secondary/10 text-secondary" label="Today's Revenue"  value={`₹${todayRevenue().toFixed(2)}`} badge={sessions.filter(s => s.created_at?.startsWith(new Date().toISOString().split('T')[0])).length + ' bills'} badgeColor="text-secondary bg-secondary-container/20" />
        <StatCard 
          icon="inventory"    
          iconBg="bg-error/10 text-error"         
          label="Low Stock Items"  
          value={medLoading ? '—' : stats.lowStock.toString()} 
          badge={stats.lowStock > 0 ? 'Action Needed' : 'All Good'} 
          badgeColor={stats.lowStock > 0 ? 'text-error bg-error-container/30' : 'text-primary bg-secondary-container/20'} 
          onView={() => setModalType('low_stock')}
        />
        <StatCard 
          icon="event_busy"   
          iconBg="bg-tertiary/10 text-tertiary"   
          label="Expiring (30d)"  
          value={medLoading ? '—' : stats.expiringSoon.toString()} 
          badge={stats.expiringSoon > 0 ? 'Review' : 'Clear'} 
          badgeColor={stats.expiringSoon > 0 ? 'text-error bg-error-container/30' : 'text-primary bg-secondary-container/20'} 
          onView={() => setModalType('expiring')}
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Recent medicines */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant/30 soft-lift overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center">
            <div>
              <h4 className="font-headline-sm text-headline-sm text-on-surface">Recent Inventory</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Latest medicines added to your stock</p>
            </div>
            <Link to="/inventory" className="text-primary font-label-md text-label-md hover:underline">View All</Link>
          </div>
          {medLoading ? (
            <div className="p-8 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[32px] animate-spin">refresh</span>
            </div>
          ) : recentMeds.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-surface-container rounded-full flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-outline text-[28px]">inventory_2</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant/60 mb-4">No medicines added yet</p>
              <Link to="/inventory/add" className="px-5 py-2 bg-primary/10 text-primary rounded-full font-label-md text-label-md hover:bg-primary/20 transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">add</span> Add Medicine
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/20">
              {recentMeds.map(m => (
                <Link key={m.id} to={`/inventory/${m.id}`} className="flex items-center gap-4 p-4 hover:bg-surface-container/50 transition-colors group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md font-bold text-on-surface truncate">{m.medicine_name}</p>
                    <p className="text-[11px] text-on-surface-variant">{m.manufacturer || 'General'} • {m.quantity} units</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-label-md text-label-md font-bold text-primary">₹{Number(m.unit_price).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.quantity <= 10 ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                      {m.quantity <= 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform text-[18px]">chevron_right</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant/30 soft-lift overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 flex justify-between items-center">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Alerts</h4>
            <Link to="/notifications" className="text-primary font-label-md text-label-md hover:underline">View All</Link>
          </div>
          <div className="p-4 space-y-3">
            {recentAlerts.length === 0 ? (
              <div className="py-8 flex flex-col items-center text-center">
                <span className="material-symbols-outlined text-primary/30 text-[40px] mb-2">check_circle</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant/60">No unread alerts</p>
              </div>
            ) : recentAlerts.map(n => {
              const colors = { warning: 'bg-error-container/10 border-error text-on-error-container', success: 'bg-secondary-container/10 border-primary text-on-secondary-container', info: 'bg-tertiary-container/10 border-tertiary text-on-tertiary-container', error: 'bg-error-container/10 border-error text-on-error-container' }
              const icons  = { warning: 'warning', success: 'check_circle', info: 'info', error: 'error' }
              return (
                <div key={n.id} className={`p-3 ${colors[n.type] || colors.info} border-l-4 rounded-r-lg`}>
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{icons[n.type] || 'info'}</span>
                    <div>
                      <p className="font-label-md text-label-md font-bold text-[12px]">{n.title}</p>
                      <p className="text-[11px] mt-0.5 opacity-80">{n.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div className="col-span-12 bg-surface-container-lowest rounded-xl border border-outline-variant/30 soft-lift overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30">
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Quick Actions</h4>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(({ icon, label, sub, color, to }) => (
              <Link key={to} to={to}
                className="p-4 rounded-xl border border-outline-variant/20 hover:border-primary/50 hover:bg-primary-container/5 transition-all text-left group block">
                <div className={`p-2 ${color} rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform`}>
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </div>
                <p className="font-label-md text-label-md font-bold text-on-surface text-[12px]">{label}</p>
                <p className="text-[10px] text-on-surface-variant/70 mt-0.5 uppercase">{sub}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link to="/inventory/add"
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40">
        <span className="material-symbols-outlined text-[28px]">add</span>
      </Link>

      <DashboardListModal 
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType}
        title={modalType === 'low_stock' ? 'Low Stock Items' : 'Expiring Medicines (30d)'}
        medicines={medicines}
      />
    </div>
  )
}
