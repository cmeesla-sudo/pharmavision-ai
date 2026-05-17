import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useMedicines } from '../hooks/useMedicines'
import { useUI } from '../contexts/UIContext'

const CATEGORIES = ['Antibiotics', 'Analgesics', 'Cardiovascular', 'Antipyretics', 'Dermatological', 'Neurology', 'Antifungal', 'Vitamins', 'General'];

const Input = ({ name, type = 'text', placeholder, value, onChange, className = '' }) => (
  <input name={name} type={type} value={value ?? ''} placeholder={placeholder}
    onChange={onChange}
    className={`w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface outline-none ${className}`} />
)

export default function EditMedicinePage() {
  const { id } = useParams()
  const { update } = useMedicines()
  const { showToast } = useUI()
  const navigate    = useNavigate()
  const [form, setForm]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    supabase.from('medicines').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) navigate('/inventory')
        else { setForm({ ...data, expiry_date: data.expiry_date || '', unit_price: String(data.unit_price || '0') }); setLoading(false) }
      })
  }, [id])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.medicine_name?.trim()) return setError('Medicine name is required.')
    setSaving(true)
    const { error } = await update(id, {
      medicine_name: form.medicine_name,
      batch_number:  form.batch_number || null,
      expiry_date:   form.expiry_date || null,
      quantity:      parseInt(form.quantity) || 0,
      unit_price:    parseFloat(form.unit_price) || 0,
      manufacturer:  form.manufacturer || null
    });
    if (error) { 
      setError(error.message); 
      setSaving(false); 
      showToast('Failed to update medicine.', 'error');
    } else {
      showToast('Inventory updated successfully!', 'success');
      navigate(`/inventory/${id}`);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined text-primary text-[48px] animate-spin">refresh</span>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 mb-1">
            <Link to="/inventory" className="hover:text-primary">Inventory</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="hover:text-primary cursor-pointer" onClick={() => navigate(`/inventory/${id}`)}>{form.medicine_name}</span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary">Edit</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Edit Inventory Details</h2>
        </div>
        <div className="flex gap-3">
          <Link to={`/inventory/${id}`} className="px-5 py-2.5 rounded-xl border border-outline-variant font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-all">Cancel</Link>
          <button onClick={handleSubmit} disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-primary text-white font-label-md text-label-md hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-60">
            {saving ? <><span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> Saving...</> : <><span className="material-symbols-outlined text-[18px]">save</span> Save Changes</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-container/20 border border-error/20 rounded-xl">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border border-outline-variant/10">
        <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-4">
          <span className="material-symbols-outlined text-primary">edit_note</span>
          <h3 className="font-headline-sm text-headline-sm">Update Medicine Information</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-1 md:col-span-2">
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Medicine Name *</label>
            <Input name="medicine_name" value={form.medicine_name} onChange={e => set('medicine_name', e.target.value)} placeholder="e.g. Crocin Advance 500mg" />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Batch Number</label>
            <Input name="batch_number" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} placeholder="e.g. B-2024-X99" />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Expiry Date</label>
            <Input name="expiry_date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} type="date" />
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Current Stock</label>
            <div className="relative">
              <Input name="quantity" value={form.quantity} onChange={e => set('quantity', e.target.value)} type="number" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant font-bold">units</span>
            </div>
          </div>

          <div>
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Unit Price (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold">₹</span>
              <input type="number" step="0.01" value={form.unit_price || ''} onChange={e => set('unit_price', e.target.value)}
                className="w-full pl-8 pr-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface outline-none" />
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="font-label-md text-label-md text-on-surface mb-1.5 block">Manufacturer</label>
            <Input name="manufacturer" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Cipla, GSK" />
          </div>
        </div>
      </div>
    </div>
  )
}
