import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMedicines } from '../hooks/useMedicines'
import { useUI } from '../contexts/UIContext'

const CATEGORIES = ['Antibiotics', 'Analgesics', 'Cardiovascular', 'Antipyretics', 'Dermatological', 'Neurology', 'Antifungal', 'Vitamins', 'General']

const initialForm = {
  medicine_name: '', batch_number: '', expiry_date: '', quantity: '', unit_price: '', manufacturer: ''
};

const InputRow = ({ label, children }) => (
  <div className="space-y-1.5">
    <label className="block font-label-md text-label-md text-on-surface-variant">{label}</label>
    {children}
  </div>
)

const Input = ({ name, type = 'text', placeholder, value, onChange, ...rest }) => (
  <input name={name} type={type} value={value} placeholder={placeholder}
    onChange={onChange}
    className="w-full px-4 py-3 bg-surface-container-low border-none rounded-lg text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all outline-none"
    {...rest} />
)

export default function AddMedicinePage() {
  const { add } = useMedicines()
  const { showToast } = useUI()
  const navigate = useNavigate()
  const [form, setForm]         = useState(initialForm)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.medicine_name.trim()) return setError('Medicine name is required.')
    setLoading(true)
    const payload = {
      medicine_name: form.medicine_name,
      batch_number:  form.batch_number || null,
      expiry_date:   form.expiry_date || null,
      quantity:      parseInt(form.quantity) || 0,
      unit_price:    parseFloat(form.unit_price) || 0,
      manufacturer:  form.manufacturer || null
    }
    const { error } = await add(payload);
    if (error) { 
      setError(error.message); 
      setLoading(false); 
      showToast('Failed to add medicine.', 'error');
    } else {
      showToast('Medicine added to inventory!', 'success');
      navigate('/inventory');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[12px] text-on-surface-variant/60 mb-1">
            <Link to="/inventory" className="hover:text-primary">Inventory</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span>Fast Entry</span>
          </nav>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Add to Inventory</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Quick entry for local shop inventory.</p>
        </div>
        <Link to="/ai-scanner" className="flex items-center gap-2 px-4 py-2.5 bg-secondary/10 text-secondary rounded-xl font-label-md text-label-md hover:bg-secondary/20 transition-all border border-secondary/20 shadow-sm">
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          Use AI Scanner
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-error-container/20 border border-error/20 rounded-xl">
          <span className="material-symbols-outlined text-error">error</span>
          <p className="text-body-sm text-error">{error}</p>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Primary Details Card */}
        <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm">Medicine Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <div className="col-span-1 md:col-span-2">
              <InputRow label="Medicine Name *">
                <Input name="medicine_name" value={form.medicine_name} onChange={e => set('medicine_name', e.target.value)} placeholder="e.g. Crocin Advance 500mg" required className="text-lg font-bold py-4 px-5 bg-surface-container-highest/30 border-primary/20 border ring-primary/5 ring-1" />
              </InputRow>
            </div>

            <InputRow label="Batch Number">
              <Input name="batch_number" value={form.batch_number} onChange={e => set('batch_number', e.target.value)} placeholder="e.g. BT-4592-X" />
            </InputRow>

            <InputRow label="Expiry Date">
              <Input name="expiry_date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} type="date" />
            </InputRow>

            <InputRow label="Quantity (Stock)">
              <div className="flex">
                <Input name="quantity" value={form.quantity} onChange={e => set('quantity', e.target.value)} type="number" placeholder="0" className="rounded-r-none border-r-0" />
                <span className="inline-flex items-center px-4 bg-outline-variant/10 text-on-surface-variant rounded-r-lg font-label-md text-label-md border border-l-0 border-outline-variant/20">Units</span>
              </div>
            </InputRow>

            <InputRow label="Unit Price / MRP (₹)">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-semibold">₹</span>
                <input name="unit_price" type="number" step="0.01" value={form.unit_price} placeholder="0.00"
                  onChange={e => set('unit_price', e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-surface-container-low border-none rounded-lg text-body-md text-on-surface focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none" />
              </div>
            </InputRow>

            <div className="col-span-1 md:col-span-2">
              <InputRow label="Manufacturer (Optional)">
                <Input name="manufacturer" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} placeholder="e.g. Cipla, GSK, Abbott" />
              </InputRow>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-card p-4 rounded-2xl border-t-2 border-primary/10 bg-surface/80 backdrop-blur sticky bottom-6 shadow-2xl z-20">
          <div className="hidden sm:flex items-center gap-2 px-3 text-on-surface-variant/70">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="text-[11px] font-bold uppercase tracking-wider">Secured entry</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link to="/inventory" className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-label-md text-label-md text-on-surface-variant hover:bg-surface-container transition-colors text-center">
              Discard
            </Link>
            <button type="submit" disabled={loading}
              className="flex-1 sm:flex-none px-10 py-3.5 emerald-gradient-btn text-white rounded-xl font-label-md text-label-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-primary/20 disabled:opacity-60">
              {loading ? <><span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Processing...</> : <><span className="material-symbols-outlined text-[18px]">save</span> Register Inventory</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
