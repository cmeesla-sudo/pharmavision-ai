import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ForgotPinModal, ResetPinModal } from '../components/shared/SecurityModals'
import { useUI } from '../contexts/UIContext'

const TABS = ['Profile', 'Security', 'Preferences']

const Input = ({ label, value, onChange, type = 'text', placeholder, maxLength, sub }) => (
  <div className="space-y-1.5">
    <label className="font-label-md text-label-md text-on-surface block">{label}</label>
    <input type={type} value={value} onChange={onChange} placeholder={placeholder} maxLength={maxLength}
      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-body-md text-on-surface outline-none" />
    {sub && <p className="text-[10px] text-on-surface-variant/60 ml-1 italic">{sub}</p>}
  </div>
)

export default function SettingsPage() {
  const { profile, user, updateProfile, uploadAvatar, removeAvatar, signOut } = useAuth()
  const { showToast } = useUI()
  const [tab, setTab]           = useState('Profile')
  const [form, setForm]         = useState({ pharmacy_name: profile?.pharmacy_name || '', owner_name: profile?.owner_name || '', mobile: profile?.mobile || '' })
  const [pin, setPin]           = useState({ current: '', new: '', confirm: '' })
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')

  const fileInputRef = useRef(null)

  useEffect(() => {
    if (profile) {
      setForm({ pharmacy_name: profile.pharmacy_name || '', owner_name: profile.owner_name || '', mobile: profile.mobile || '' })
    }
  }, [profile])

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setP = (k, v) => setPin(p => ({ ...p, [k]: v }))

  const saveProfile = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    const { error } = await updateProfile(form)
    if (error) setError(error.message)
    else {
      setSuccess('Profile updated successfully!')
      showToast('Profile updated successfully', 'success')
    }
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setError(''); setSuccess('')
    try {
      await uploadAvatar(file)
      setSuccess('Profile photo updated successfully!')
      showToast('Profile photo updated', 'success')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemovePhoto = async () => {
    setUploading(true); setError(''); setSuccess('')
    try {
      await removeAvatar()
      setSuccess('Profile photo removed')
      showToast('Profile photo removed', 'info')
    } catch (err) {
      setError(err.message)
      showToast(err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const savePIN = async (e) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (pin.current !== (profile?.billing_pin || '1234')) return setError('Current PIN is incorrect.')
    if (pin.new.length !== 4 || !/^\d{4}$/.test(pin.new)) return setError('New PIN must be exactly 4 digits.')
    if (pin.new === '1234' || pin.new === '0000') return setError('This PIN is too weak. Choose a different one.')
    if (pin.new !== pin.confirm) return setError('PINs do not match.')
    
    setSaving(true)
    const { error } = await updateProfile({ billing_pin: pin.new })
    if (error) setError(error.message)
    else { 
      setSuccess('Billing PIN updated successfully!')
      setPin({ current: '', new: '', confirm: '' })
      showToast('Security PIN changed.', 'success')
    }
    setSaving(false)
    setTimeout(() => setSuccess(''), 3000)
  }

  const [forgotModal, setForgotModal] = useState(false)
  const [resetModal, setResetModal]   = useState(false)

  const handleManualReset = async (newPin) => {
    const { error } = await updateProfile({ billing_pin: newPin })
    if (error) throw error
    showToast('PIN Reset Successfully', 'success')
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header */}
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Settings</h2>
        <p className="text-body-md text-on-surface-variant mt-0.5">Manage your pharmacy profile and platform security.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant/30">
        {TABS.map(t => (
          <button key={t} onClick={() => { setTab(t); setError(''); setSuccess('') }}
            className={`px-6 py-3 font-label-md text-label-md transition-colors border-b-2 -mb-px ${tab === t ? 'text-primary border-primary' : 'text-on-surface-variant border-transparent hover:text-primary'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'Profile' && (
        <div className="glass-card rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Avatar */}
          <div className="flex items-center gap-5 pb-5 border-b border-outline-variant/20">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0 overflow-hidden shadow-md">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleFileSelect} />
            </div>
            <div>
              <p className="font-headline-sm text-headline-sm text-on-surface">{profile?.owner_name || 'Pharmacist'}</p>
              <p className="text-[13px] text-on-surface-variant">{user?.email || 'demo.pharmacist@pharmavision.com'}</p>
              <div className="flex items-center gap-3 mt-2">
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-[12px] text-primary font-bold hover:underline flex items-center gap-1 transition-opacity disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[14px]">{uploading ? 'refresh' : 'upload_file'}</span>
                  {uploading ? 'Uploading photo...' : 'Upload Photo'}
                </button>
                {profile?.avatar_url && (
                  <button 
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="text-[12px] text-error font-bold hover:underline flex items-center gap-1 transition-opacity disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span> Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {success && tab === 'Profile' && <p className="text-primary text-[12px] font-bold">{success}</p>}
          {error && tab === 'Profile' && <p className="text-error text-[12px] font-bold">{error}</p>}

          <form className="space-y-4" onSubmit={saveProfile}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Pharmacy Name" value={form.pharmacy_name} onChange={e => set('pharmacy_name', e.target.value)} placeholder="MedLife Central" />
              <Input label="Owner Name"    value={form.owner_name}    onChange={e => set('owner_name', e.target.value)}    placeholder="Dr. Sarah Mitchell" />
            </div>
            <Input label="Mobile Number" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210" type="tel" />
            <div>
              <label className="font-label-md text-label-md text-on-surface block mb-1.5">Email Address</label>
              <input value={user?.email || ''} disabled
                className="w-full px-4 py-3 bg-surface-container rounded-xl text-on-surface-variant/60 border border-outline-variant/20 cursor-not-allowed text-body-md" />
            </div>
            <div className="flex justify-end pt-4">
              <button type="submit" disabled={saving}
                className="px-8 py-3.5 emerald-gradient-btn text-white rounded-xl font-label-md text-label-md flex items-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60">
                {saving ? <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span> : <span className="material-symbols-outlined text-[18px]">save</span>}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security tab */}
      {tab === 'Security' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Security Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                <span className="material-symbols-outlined">verified</span>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Email Status</p>
                <p className="font-bold text-on-surface text-[13px]">Verified</p>
              </div>
            </div>
            <div className="glass-card p-4 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                <span className="material-symbols-outlined">pending</span>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">Mobile Status</p>
                <p className="font-bold text-on-surface text-[13px]">Pending Verification</p>
              </div>
            </div>
          </div>

          {/* Billing PIN */}
          <div className="glass-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -mr-16 -mt-16" />
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm">Billing Security PIN</h3>
              </div>
              <button 
                onClick={() => setForgotModal(true)}
                className="text-[12px] text-primary font-bold hover:underline"
              >
                Forgot PIN?
              </button>
            </div>

            {success && tab === 'Security' && <p className="text-primary text-[12px] font-bold mb-4">{success}</p>}
            {error && tab === 'Security' && <p className="text-error text-[12px] font-bold mb-4">{error}</p>}

            <form className="space-y-6" onSubmit={savePIN}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input label="Current PIN" value={pin.current} onChange={e => setP('current', e.target.value)} type="password" placeholder="••••" maxLength={4} />
                <Input label="New 4-Digit PIN" value={pin.new} onChange={e => setP('new', e.target.value)} type="password" placeholder="••••" maxLength={4} sub="Avoid 1234 or 0000" />
                <Input label="Confirm New PIN" value={pin.confirm} onChange={e => setP('confirm', e.target.value)} type="password" placeholder="••••" maxLength={4} />
              </div>
              
              <div className="flex justify-between items-center">
                <p className="text-[11px] text-on-surface-variant">Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}</p>
                <button type="submit" disabled={saving}
                  className="px-8 py-3.5 bg-primary text-on-primary rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all disabled:opacity-60">
                  {saving ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">lock_reset</span>}
                  Update Secure PIN
                </button>
              </div>
            </form>
          </div>

          {/* Danger zone */}
          <div className="glass-card rounded-2xl p-6 border border-error/20 bg-error/5">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-error/10">
              <span className="material-symbols-outlined text-error">dangerous</span>
              <h3 className="font-headline-sm text-headline-sm text-error">Danger Zone</h3>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-[12px] text-on-surface-variant max-w-sm">Signing out will clear your session from this browser. You will need to re-authenticate.</p>
              <button onClick={signOut}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-error text-white rounded-xl font-bold shadow-lg shadow-error/20 hover:bg-error/90 transition-all">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Sign Out Terminal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences tab */}
      {tab === 'Preferences' && (
        <div className="glass-card rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <h3 className="font-headline-sm text-headline-sm text-on-surface pb-4 border-b border-outline-variant/20">Platform Preferences</h3>
          {[
            { label: 'Low Stock Alerts',     sub: 'Get notified when items fall below reorder threshold' },
            { label: 'Expiry Reminders',     sub: 'Alerts 30, 60, and 90 days before medicine expiry' },
            { label: 'Billing Summaries',    sub: 'Daily summary of completed transactions' },
            { label: 'System Updates',       sub: 'Important platform updates and announcements' },
          ].map(({ label, sub }) => (
            <div key={label} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
              <div>
                <span className="font-label-md text-label-md text-on-surface">{label}</span>
                <p className="text-[11px] text-on-surface-variant mt-0.5">{sub}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-outline-variant/50 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ForgotPinModal 
        isOpen={forgotModal} 
        onClose={() => setForgotModal(false)} 
        email={user?.email}
        mobile={profile?.mobile}
        onVerified={() => {
          setForgotModal(false);
          setResetModal(true);
        }}
      />

      <ResetPinModal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onReset={handleManualReset}
      />
    </div>
  )
}
