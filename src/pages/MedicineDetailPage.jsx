import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMedicines } from '../hooks/useMedicines'
import { useUI } from '../contexts/UIContext'

export default function MedicineDetailPage() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { remove }   = useMedicines()
  const { showConfirm, showToast } = useUI()
  const [med, setMed]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase.from('medicines').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/inventory');
        else { setMed(data); setLoading(false); }
      });
  }, [id]);

  const handleDelete = () => {
    showConfirm({
      title: 'Remove from Inventory',
      message: 'Are you sure you want to permanently remove this medicine? All related stock and history will be lost.',
      itemDetails: { name: med?.medicine_name, batch: med?.batch_number },
      confirmText: 'Delete Record',
      type: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        const { error } = await remove(id);
        if (!error) {
          showToast('Medicine deleted successfully', 'success');
          navigate('/inventory');
        } else {
          showToast('Failed to delete medicine', 'error');
          setDeleting(false);
        }
      }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
    </div>
  )

  const today = new Date()
  const expDate  = med.expiry_date ? new Date(med.expiry_date) : null
  const daysLeft = expDate ? Math.ceil((expDate - today) / 86400000) : null
  const expired  = daysLeft !== null && daysLeft < 0
  const critical = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
  const inventoryValue = (med.quantity * med.unit_price).toFixed(2)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-5">
        <div className="flex gap-5 items-start">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>medication</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${expired ? 'bg-error-container text-on-error-container' : med.quantity <= 10 ? 'bg-[#fef3c7] text-[#92400e]' : 'bg-secondary-container text-on-secondary-container'}`}>
                {expired ? 'EXPIRED' : med.quantity <= 10 ? 'LOW STOCK' : 'IN STOCK'}
              </span>
              {critical && !expired && <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded-full text-[10px] font-bold">EXPIRY ALERT</span>}
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">{med.medicine_name}</h1>
            <p className="text-on-surface-variant text-[14px] mt-1 font-medium">{med.manufacturer || 'General Manufacturer'}</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to={`/inventory/${id}/edit`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-outline-variant hover:bg-surface-container transition-colors text-on-surface font-semibold text-[13px]">
            <span className="material-symbols-outlined text-[18px]">edit</span> Edit Details
          </Link>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary shadow-lg hover:opacity-90 active:scale-[0.98] transition-all font-semibold text-[13px]">
            <span className="material-symbols-outlined text-[18px]">add</span> Update Stock
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Current Stock',      value: med.quantity.toString(),      sub: 'Total units in shop',         color: med.quantity <= 10 ? 'text-error' : 'text-primary' },
          { label: 'Unit Price',       value: `₹${Number(med.unit_price).toFixed(2)}`, sub: 'Selling price per unit',                         color: 'text-on-surface' },
          { label: 'Inventory Value',  value: `₹${inventoryValue}`,         sub: `${med.quantity} × ₹${Number(med.unit_price).toFixed(2)}`, color: 'text-secondary' },
          { label: 'Days to Expiry',   value: daysLeft !== null ? `${expired ? 'Expired' : daysLeft + ' days'}` : '—', sub: expDate ? expDate.toLocaleDateString('en-IN') : 'No expiry set', color: expired ? 'text-error' : critical ? 'text-[#f59e0b]' : 'text-on-surface' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="glass-card inner-glow p-5 rounded-2xl border border-outline-variant/10 shadow-sm">
            <p className="text-[11px] text-outline-variant font-bold uppercase mb-2 tracking-wider">{label}</p>
            <p className={`font-headline-sm text-headline-sm font-bold ${color}`}>{value}</p>
            <p className="text-[11px] text-on-surface-variant mt-1.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Details + Actions */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 glass-card inner-glow rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/30">
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Inventory Information</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            {[
              ['Manufacturer',       med.manufacturer || '—'],
              ['Batch Number',       med.batch_number || '—'],
              ['Expiry Date',        med.expiry_date ? new Date(med.expiry_date).toLocaleDateString('en-IN', { dateStyle: 'long' }) : 'No date set'],
              ['Stock Status',       med.quantity <= 10 ? 'Refill Required' : 'Healthy'],
              ['Registration Date',   new Date(med.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })],
              ['Medicine ID',        med.id.substring(0, 8).toUpperCase()],
            ].map(([label, val]) => (
              <div key={label} className="space-y-1">
                <h4 className="text-[10px] text-outline-variant font-bold uppercase tracking-widest">{label}</h4>
                <p className="text-[15px] font-medium text-on-surface">{val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="glass-card inner-glow rounded-2xl p-6 shadow-sm border border-outline-variant/10">
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider mb-5">Quick Actions</h3>
            <div className="space-y-3">
              {[
                { icon: 'receipt_long', label: 'Sale History',     sub: 'Past sales records' },
                { icon: 'print',        label: 'Print Label',   sub: 'Small barcode label' },
              ].map(({ icon, label, sub }) => (
                <button key={label} className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-surface-container transition-all group border border-transparent hover:border-outline-variant/20">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary group-hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined text-[20px]">{icon}</span>
                    </div>
                    <div className="text-left">
                      <span className="font-label-md font-bold text-on-surface text-[14px]">{label}</span>
                      <p className="text-[11px] text-on-surface-variant">{sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:translate-x-1 transition-transform text-[18px]">chevron_right</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 border border-error/20 bg-error-container/5 rounded-2xl space-y-4">
            <div>
              <h4 className="text-[11px] text-error font-bold uppercase tracking-widest mb-1">Danger Zone</h4>
              <p className="text-[11px] text-on-surface-variant">Careful, this action cannot be undone.</p>
            </div>
            <button onClick={handleDelete} disabled={deleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-error text-error hover:bg-error hover:text-on-error transition-all font-bold text-[13px] disabled:opacity-60">
              {deleting
                ? <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Removing...</>
                : <><span className="material-symbols-outlined text-[18px]">delete</span> Remove from Inventory</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
