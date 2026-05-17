import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const InputField = ({ id, icon, type = 'text', placeholder, value, onChange }) => (
  <div className="space-y-1.5">
    <label className="font-label-md text-label-md text-on-surface" htmlFor={id}>
      {id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
    </label>
    <div className="relative">
      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">{icon}</span>
      <input id={id} type={type} value={value} onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md text-on-surface transition-all focus:bg-white input-focus-ring outline-none" />
    </div>
  </div>
)

export default function SignupPage() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ pharmacy_name: '', owner_name: '', mobile: '', email: '', password: '', confirm_password: '', terms: false })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.terms) return setError('Please accept the Terms of Service.')
    if (form.password !== form.confirm_password) return setError('Passwords do not match.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setLoading(true)
    const { error } = await signUp(form.email, form.password, {
      pharmacy_name: form.pharmacy_name,
      owner_name:    form.owner_name,
      mobile:        form.mobile,
    })
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 rounded-xl overflow-hidden glass-panel min-h-[800px]">
      {/* Left branding */}
      <section className="relative hidden md:flex flex-col justify-between p-16 overflow-hidden hero-gradient">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <span className="material-symbols-outlined text-on-primary text-4xl">health_metrics</span>
            <h1 className="font-headline-md text-headline-md text-on-primary tracking-tight">PharmaVision AI</h1>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-primary mb-4 leading-tight">Empowering Modern Pharmacies</h2>
          <p className="font-body-lg text-body-lg text-on-primary/90 max-w-md">
            Precision management meets intelligent automation. Join thousands of pharmacy owners optimizing their operations.
          </p>
        </div>
        <div className="relative z-10 flex justify-center py-16">
          <div className="w-56 h-56 bg-white/10 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-white/50 text-[100px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_pharmacy</span>
          </div>
        </div>
        <div className="relative z-10 flex gap-8 pt-6 border-t border-white/20">
          {[['12,000+', 'Active Pharmacies'], ['99.9%', 'Uptime']].map(([v, l]) => (
            <div key={l}>
              <p className="font-headline-sm text-headline-sm text-on-primary">{v}</p>
              <p className="font-body-sm text-body-sm text-on-primary/80">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Right form */}
      <section className="flex flex-col justify-center p-8 md:p-10 bg-surface">
        <div className="max-w-md mx-auto w-full">
          <div className="md:hidden flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary text-3xl">health_metrics</span>
            <h1 className="font-headline-sm text-headline-sm text-primary">PharmaVision AI</h1>
          </div>

          <div className="mb-6">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-1">Create an Account</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Start your 14-day free trial. No credit card required.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error/20 rounded-xl mb-4">
              <span className="material-symbols-outlined text-error text-[18px]">error</span>
              <p className="text-body-sm text-error">{error}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField id="pharmacy_name" icon="local_pharmacy" value={form.pharmacy_name} onChange={e => set('pharmacy_name', e.target.value)} placeholder="MedLife Central" />
            <InputField id="owner_name"    icon="person_outline" value={form.owner_name} onChange={e => set('owner_name', e.target.value)} placeholder="Dr. Sarah Mitchell" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField id="mobile" icon="phone_iphone" type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+1 (555) 000-0000" />
              <InputField id="email"  icon="mail"         type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="sarah@medlife.com" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField id="password"         icon="lock" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
              <InputField id="confirm_password" icon="lock" type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} placeholder="••••••••" />
            </div>

            <div className="flex items-start gap-3 py-1">
              <input id="terms" type="checkbox" checked={form.terms} onChange={e => set('terms', e.target.checked)}
                className="w-4 h-4 text-primary border-outline rounded focus:ring-primary mt-0.5" />
              <label className="font-body-sm text-body-sm text-on-surface-variant" htmlFor="terms">
                I agree to the <a href="#" className="text-primary font-semibold hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-primary font-semibold hover:underline">Privacy Policy</a>.
              </label>
            </div>

            <button type="submit" disabled={loading}
              className="w-full bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-semibold py-4 rounded-lg shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-2 disabled:opacity-60">
              {loading
                ? <><span className="material-symbols-outlined animate-spin">refresh</span> Creating Account...</>
                : <><span className="font-body-md text-body-md">Create Your Account</span><span className="material-symbols-outlined">arrow_forward</span></>
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Log In</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
