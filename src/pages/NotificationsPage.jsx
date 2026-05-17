import { useState } from 'react'
import { useNotifications } from '../hooks/useNotifications'

const TYPE_CONFIG = {
  warning: { icon: 'warning',      bg: 'bg-[#fef3c7]/70 border-[#f59e0b]', text: 'text-[#92400e]',  badge: 'bg-[#fef3c7] text-[#92400e]' },
  error:   { icon: 'error',         bg: 'bg-error-container/10 border-error', text: 'text-on-error-container', badge: 'bg-error-container text-on-error-container' },
  success: { icon: 'check_circle',  bg: 'bg-secondary-container/10 border-primary', text: 'text-on-secondary-container', badge: 'bg-secondary-container text-on-secondary-container' },
  info:    { icon: 'info',          bg: 'bg-tertiary-container/10 border-tertiary', text: 'text-on-tertiary-container', badge: 'bg-tertiary-container text-on-tertiary-container' },
}

export default function NotificationsPage() {
  const { notifications, loading, unreadCount, markRead, markAllRead, remove } = useNotifications()
  const [filter, setFilter] = useState('all')

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read
    if (filter === 'read')   return n.is_read
    return true
  })

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr)
    const mins  = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days  = Math.floor(diff / 86400000)
    if (days > 0)  return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (mins > 0)  return `${mins}m ago`
    return 'just now'
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Notifications</h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-primary border border-primary/20 font-label-md text-label-md hover:bg-primary/10 transition-colors">
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {['all', 'unread', 'read'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-[12px] font-semibold capitalize transition-all ${filter === f ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/30'}`}>
            {f} {f === 'all' ? `(${notifications.length})` : f === 'unread' ? `(${unreadCount})` : `(${notifications.length - unreadCount})`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>notifications_none</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">No notifications</h3>
          <p className="text-body-md text-on-surface-variant">{filter === 'unread' ? 'All notifications have been read.' : 'Alerts will appear here automatically.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
            return (
              <div key={n.id}
                className={`relative glass-card rounded-2xl p-4 border-l-4 ${cfg.bg} transition-all ${!n.is_read ? 'shadow-md' : 'opacity-70'}`}>
                {!n.is_read && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-primary rounded-full" />
                )}
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined ${cfg.text} text-[22px] shrink-0 mt-0.5`} style={{ fontVariationSettings: "'FILL' 1" }}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-label-md text-label-md font-bold ${cfg.text} text-[13px]`}>{n.title}</p>
                    {n.message && <p className={`text-[12px] mt-0.5 ${cfg.text} opacity-80`}>{n.message}</p>}
                    <p className="text-[10px] text-on-surface-variant mt-2 uppercase font-semibold">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.is_read && (
                      <button onClick={() => markRead(n.id)}
                        className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-[16px]">done</span>
                      </button>
                    )}
                    <button onClick={() => remove(n.id)}
                      className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
