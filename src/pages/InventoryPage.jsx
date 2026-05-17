import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useMedicines } from '../hooks/useMedicines'
import { useUI } from '../contexts/UIContext'
import { useCart } from '../contexts/CartContext'

export default function InventoryPage() {
  const { medicines, stats, loading, remove } = useMedicines()
  const { showConfirm, showToast } = useUI()
  const { addToCart } = useCart()
  const [searchParams] = useSearchParams()
  const [search, setSearch]   = useState(searchParams.get('q') || '')
  const [sortBy, setSortBy]   = useState('created_at')
  const [deleting, setDeleting] = useState(null)
  
  // Track selected quantities for each item in inventory
  const [selectedQtys, setSelectedQtys] = useState({})

  const filtered = useMemo(() => {
    let list = [...medicines]
    if (search)      list = list.filter(m => m.medicine_name.toLowerCase().includes(search.toLowerCase()))
    if (sortBy === 'name')       list.sort((a, b) => a.medicine_name.localeCompare(b.medicine_name))
    if (sortBy === 'expiry')     list.sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    if (sortBy === 'quantity')   list.sort((a, b) => a.quantity - b.quantity)
    if (sortBy === 'unit_price') list.sort((a, b) => b.unit_price - a.unit_price)
    return list;
  }, [medicines, search, sortBy]);

  const handleDelete = (id, name, batch) => {
    showConfirm({
      title: 'Remove from Inventory',
      message: 'This action will permanently remove this medicine and its stock from your pharmacy database. Are you sure you want to proceed?',
      itemDetails: { name, batch },
      confirmText: 'Remove Medicine',
      type: 'danger',
      onConfirm: async () => {
        setDeleting(id);
        await remove(id);
        setDeleting(null);
        showToast(`"${name}" removed successfully`, 'success');
      }
    });
  };

  const handleQtyChange = (id, delta, maxStock) => {
    setSelectedQtys(prev => {
      const current = prev[id] || 1;
      const next = Math.max(1, Math.min(maxStock, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const handleAddToCart = (m) => {
    const qty = selectedQtys[m.id] || 1;
    addToCart(m, qty);
    setSelectedQtys(prev => ({ ...prev, [m.id]: 1 }));
  };

  const today = new Date()

  return (
    <div className="max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Inventory Management</h2>
          <p className="text-body-md text-on-surface-variant mt-0.5">Track and manage your pharmacy stock.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/ai-scanner"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 text-secondary font-label-md text-label-md hover:bg-secondary/20 transition-colors">
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            AI Scan
          </Link>
          <Link to="/inventory/add"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Medicine
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: 'inventory',   bg: 'bg-primary/10 text-primary',    label: 'Total Stock',    value: stats.total },
          { icon: 'warning',     bg: 'bg-error/10 text-error',        label: 'Low Stock',      value: stats.lowStock },
          { icon: 'event_busy',  bg: 'bg-secondary/10 text-secondary', label: 'Expiring (30d)', value: stats.expiringSoon },
          { icon: 'trending_up', bg: 'bg-tertiary/10 text-tertiary',   label: 'Total Value',   value: `₹${stats.totalValue.toFixed(0)}` },
        ].map(({ icon, bg, label, value }) => (
          <div key={label} className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 ${bg} rounded-lg`}><span className="material-symbols-outlined text-[20px]">{icon}</span></div>
              <span className="text-[10px] font-semibold text-on-surface-variant uppercase">{label}</span>
            </div>
            <p className="text-[28px] font-bold text-on-surface">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..."
            className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 bg-surface-container-low border border-outline-variant rounded-xl text-body-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none">
          <option value="created_at">Newest First</option>
          <option value="name">Name A-Z</option>
          <option value="expiry">Expiry Date</option>
          <option value="quantity">Quantity</option>
          <option value="unit_price">Price</option>
        </select>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="glass-card rounded-2xl p-16 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">No medicines found</h3>
          <p className="text-body-md text-on-surface-variant mb-6">
            {search ? 'Try adjusting your search.' : 'Add your first medicine to get started.'}
          </p>
          <Link to="/inventory/add"
            className="inline-flex items-center gap-2 primary-gradient text-white px-6 py-3 rounded-xl font-label-md text-label-md shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
            <span className="material-symbols-outlined text-[18px]">add</span> Add Medicine
          </Link>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block glass-card rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/30">
                <tr>
                  {['Medicine', 'Batch', 'Stock', 'Price', 'Expiry', 'Qty Selection', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filtered.map(m => {
                  const expDate = m.expiry_date ? new Date(m.expiry_date) : null
                  const daysLeft = expDate ? Math.ceil((expDate - today) / 86400000) : null
                  const expired = daysLeft !== null && daysLeft < 0
                  const critical = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
                  const currentQty = selectedQtys[m.id] || 1;
                  const maxStock = Number(m.quantity || 0);

                  return (
                    <tr key={m.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                          </div>
                          <div>
                            <p className="font-label-md text-label-md font-bold text-on-surface">{m.medicine_name}</p>
                            {m.manufacturer && <p className="text-[11px] text-on-surface-variant">{m.manufacturer}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-on-surface-variant">{m.batch_number || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[13px] font-bold ${m.quantity <= 10 ? 'text-error' : 'text-on-surface'}`}>{m.quantity}</span>
                        <span className="text-[11px] text-on-surface-variant ml-1">units</span>
                      </td>
                      <td className="px-4 py-3 font-label-md text-label-md font-bold text-primary">₹{Number(m.unit_price).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        {expDate ? (
                          <span className={`text-[12px] font-semibold ${expired ? 'text-error' : critical ? 'text-[#f59e0b]' : 'text-on-surface-variant'}`}>
                            {expDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            {daysLeft !== null && <span className="block text-[10px]">{expired ? 'Expired' : `${daysLeft}d left`}</span>}
                          </span>
                        ) : <span className="text-[12px] text-on-surface-variant/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {maxStock > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                              <button
                                onClick={() => handleQtyChange(m.id, -1, maxStock)}
                                className="w-6 h-6 rounded bg-surface-container hover:bg-primary/20 hover:text-primary font-bold text-[14px] flex items-center justify-center text-on-surface-variant active:scale-95 transition-all"
                                title="Decrease"
                              >−</button>
                              <span className="w-8 text-center font-extrabold font-mono text-[13px] text-on-surface">{currentQty}</span>
                              <button
                                onClick={() => handleQtyChange(m.id, 1, maxStock)}
                                disabled={currentQty >= maxStock}
                                className="w-6 h-6 rounded bg-surface-container hover:bg-primary/20 hover:text-primary font-bold text-[14px] flex items-center justify-center text-on-surface-variant active:scale-95 disabled:opacity-30 transition-all"
                                title="Increase"
                              >+</button>
                            </div>
                            {currentQty >= maxStock && (
                              <span className="text-[10px] text-amber-600 font-bold tracking-tight">⚠️ Max {maxStock}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-error font-semibold uppercase tracking-wider">Zero Stock</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAddToCart(m)}
                            disabled={maxStock <= 0}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1 transition-all ${
                              maxStock <= 0
                                ? 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
                                : 'bg-primary text-on-primary shadow-sm hover:opacity-90 active:scale-95'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                            {maxStock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                          <Link to={`/inventory/${m.id}`} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="View">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </Link>
                          <Link to={`/inventory/${m.id}/edit`} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          <button onClick={() => handleDelete(m.id, m.medicine_name, m.batch_number)} disabled={deleting === m.id}
                            className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-40" title="Delete">
                            <span className="material-symbols-outlined text-[18px]">{deleting === m.id ? 'refresh' : 'delete'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(m => {
              const expDate = m.expiry_date ? new Date(m.expiry_date) : null
              const daysLeft = expDate ? Math.ceil((expDate - today) / 86400000) : null
              const expired = daysLeft !== null && daysLeft < 0
              const currentQty = selectedQtys[m.id] || 1;
              const maxStock = Number(m.quantity || 0);

              return (
                <div key={m.id} className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
                      </div>
                      <div>
                        <p className="font-label-md text-label-md font-bold text-on-surface">{m.medicine_name}</p>
                        <p className="text-[11px] text-on-surface-variant">{m.manufacturer || 'General'}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${expired ? 'bg-error-container text-on-error-container' : m.quantity <= 10 ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-secondary-container text-on-secondary-container'}`}>
                      {expired ? 'Expired' : m.quantity <= 10 ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-surface-container-low rounded-lg p-2">
                      <p className="text-[10px] text-on-surface-variant uppercase">Stock</p>
                      <p className="font-bold text-on-surface text-[14px]">{m.quantity}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-2">
                      <p className="text-[10px] text-on-surface-variant uppercase">Price</p>
                      <p className="font-bold text-primary text-[14px]">₹{Number(m.unit_price).toFixed(0)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-lg p-2">
                      <p className="text-[10px] text-on-surface-variant uppercase">Expires</p>
                      <p className={`font-bold text-[12px] ${expired ? 'text-error' : daysLeft && daysLeft <= 30 ? 'text-[#f59e0b]' : 'text-on-surface'}`}>
                        {expDate ? `${daysLeft}d` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Quantity selector & Cart button */}
                  <div className="flex items-center gap-2 pt-1">
                    {maxStock > 0 && (
                      <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-outline-variant/30">
                        <button
                          onClick={() => handleQtyChange(m.id, -1, maxStock)}
                          className="w-7 h-7 rounded bg-surface-container hover:bg-primary/20 hover:text-primary font-bold text-[16px] flex items-center justify-center text-on-surface-variant active:scale-95 transition-all"
                        >−</button>
                        <span className="w-8 text-center font-extrabold font-mono text-[14px] text-on-surface">{currentQty}</span>
                        <button
                          onClick={() => handleQtyChange(m.id, 1, maxStock)}
                          disabled={currentQty >= maxStock}
                          className="w-7 h-7 rounded bg-surface-container hover:bg-primary/20 hover:text-primary font-bold text-[16px] flex items-center justify-center text-on-surface-variant active:scale-95 disabled:opacity-30 transition-all"
                        >+</button>
                      </div>
                    )}
                    <button
                      onClick={() => handleAddToCart(m)}
                      disabled={maxStock <= 0}
                      className={`flex-1 py-2.5 text-center font-label-md text-label-md rounded-lg flex items-center justify-center gap-1.5 transition-all text-[13px] ${
                        maxStock <= 0
                          ? 'bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed'
                          : 'bg-primary text-on-primary shadow-sm hover:opacity-90 font-extrabold'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                      {maxStock <= 0 ? 'Out of Stock' : `Add ${currentQty} to Cart`}
                    </button>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-outline-variant/10">
                    <Link to={`/inventory/${m.id}`} className="flex-1 py-1.5 text-center text-primary font-label-md text-label-md border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors text-[12px]">View Details</Link>
                    <Link to={`/inventory/${m.id}/edit`} className="flex-1 py-1.5 text-center text-on-surface-variant font-label-md text-label-md border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors text-[12px]">Edit</Link>
                    <button onClick={() => handleDelete(m.id, m.medicine_name, m.batch_number)} className="px-3 py-1.5 text-error border border-error/20 rounded-lg hover:bg-error/10 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <p className="text-[12px] text-on-surface-variant text-center">Showing {filtered.length} of {medicines.length} medicines</p>
        </>
      )}

      <Link to="/inventory/add"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl primary-gradient text-white flex items-center justify-center soft-lift hover:scale-110 active:scale-95 transition-all z-40">
        <span className="material-symbols-outlined text-[26px]">add</span>
      </Link>
    </div>
  )
}
