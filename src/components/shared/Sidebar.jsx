import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/dashboard',    icon: 'dashboard',      label: 'Dashboard'     },
  { to: '/inventory',    icon: 'inventory_2',    label: 'Inventory'     },
  { to: '/billing',      icon: 'receipt_long',   label: 'Billing'       },
  { to: '/expiry',       icon: 'event_busy',     label: 'Expiry'        },
  { to: '/analytics',    icon: 'insights',       label: 'Analytics'     },
  { to: '/notifications',icon: 'notifications',  label: 'Notifications' },
  { to: '/ai-scanner',   icon: 'qr_code_scanner',label: 'AI Scanner'    },
  { to: '/settings',     icon: 'settings',       label: 'Settings'      },
]

export default function Sidebar({ isOpen, onClose }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <aside
      className={`
        fixed left-0 top-0 h-full w-64 bg-surface/95 backdrop-blur-xl
        border-r border-outline-variant/30 shadow-sm flex flex-col py-5 z-50
        transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Brand */}
      <div className="px-5 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              health_metrics
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-primary text-[15px] leading-tight truncate">PharmaVision AI</h1>
            <p className="text-[9px] uppercase tracking-widest text-on-surface-variant/60 font-semibold">
              {profile?.pharmacy_name || 'Precision Management'}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-on-surface-variant hover:text-primary transition-colors p-1">
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {NAV_ITEMS.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-[13px] font-medium ${
                isActive
                  ? 'text-primary font-semibold bg-primary/8 active-glow'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[20px] shrink-0"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 mt-4 space-y-2">
        <NavLink
          to="/billing"
          onClick={onClose}
          className="w-full py-2.5 px-3 flex items-center justify-center gap-2 bg-primary text-on-primary rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all text-[13px]"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Prescription
        </NavLink>
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-3 flex items-center gap-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-xl transition-colors text-[13px]"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
