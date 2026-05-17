import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNotifications } from '../../hooks/useNotifications'
import { useCart } from '../../contexts/CartContext'

export default function TopBar({ onMenuClick }) {
  const { profile } = useAuth()
  const { unreadCount } = useNotifications()
  const { calculateTotals } = useCart()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/inventory?q=${encodeURIComponent(query.trim())}`)
  }

  const { totalItems, grandTotal } = calculateTotals()

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 px-4 md:px-6 h-14 bg-surface/90 backdrop-blur-xl border-b border-outline-variant/30 shadow-sm">
      {/* Hamburger — mobile only */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-on-surface-variant hover:text-primary transition-colors p-1 shrink-0"
      >
        <span className="material-symbols-outlined">menu</span>
      </button>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex-1 max-w-md">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-1.5 bg-surface-container-low border-none rounded-full text-[13px] text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
          />
        </div>
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-2 md:gap-3 ml-auto">
        {/* Global Cart Indicator */}
        <Link
          to="/billing"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
          <span className="text-[12px] font-bold">Cart ({totalItems})</span>
          {totalItems > 0 && (
            <span className="text-[11px] ml-1 bg-white/20 px-1.5 py-0.5 rounded-md font-mono">
              ₹{grandTotal.toFixed(0)}
            </span>
          )}
        </Link>

        {/* Notifications */}
        <Link to="/notifications" className="relative p-2 text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="h-5 w-px bg-outline-variant/40 hidden md:block" />

        {/* User */}
        <Link to="/settings" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="hidden sm:block text-right">
            <p className="text-[12px] font-bold text-on-surface leading-none">
              {profile?.owner_name || 'Pharmacist'}
            </p>
            <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-wider mt-0.5">
              {profile?.pharmacy_name || 'Pharmacy'}
            </p>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_circle
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}
