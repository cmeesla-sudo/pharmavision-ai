import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ForgotPasswordModal } from '../components/shared/SecurityModals'

const Field = ({ id, icon, type, placeholder, value, onChange, extra }) => (
  <div className="relative group">
    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">{icon}</span>
    <input id={id} name={id} type={type} value={value} onChange={onChange}
      placeholder={placeholder}
      className="w-full pl-12 pr-12 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-body-md text-on-surface placeholder:text-outline outline-none" />
    {extra}
  </div>
)

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', remember: false })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotModal, setForgotModal] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn(form.email, form.password)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/dashboard')
  }

  return (
    <div className="bg-mesh min-h-screen w-full flex items-center justify-center font-body-md text-on-surface px-4 md:px-8 py-12">
      <div className="w-full max-w-[1100px] grid grid-cols-1 md:grid-cols-12 gap-8 items-center">

        {/* Branding */}
        <div className="hidden md:flex md:col-span-7 flex-col space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 emerald-gradient rounded-xl flex items-center justify-center shadow-lg">
              <span className="material-symbols-outlined text-white text-3xl">clinical_notes</span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">PharmaVision AI</h1>
          </div>
          <h2 className="font-display-lg text-display-lg text-on-surface leading-tight">
            Precision pharmacy <br /><span className="text-primary">management</span>, reimagined.
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-lg">
            Access the next generation of pharmaceutical intelligence. Streamline inventory, automate compliance, and optimize patient care.
          </p>
          <div className="flex gap-8 pt-4">
            {[['99.9%', 'Inventory Accuracy'], ['2.4k+', 'Active Pharmacies']].map(([val, label]) => (
              <div key={label}>
                <span className="font-headline-sm text-headline-sm text-primary">{val}</span>
                <p className="font-label-md text-label-md text-on-surface-variant">{label}</p>
              </div>
            ))}
          </div>
          <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-xl border border-outline-variant/20 bg-gradient-to-br from-primary/8 to-secondary/5 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary/20 text-[120px]" style={{ fontVariationSettings: "'FILL' 1" }}>local_pharmacy</span>
          </div>
        </div>

        {/* Login card */}
        <div className="md:col-span-5">
          <div className="w-full max-w-md mx-auto glass-card rounded-2xl p-8">
            <div className="md:hidden flex items-center gap-3 mb-6">
              <div className="w-9 h-9 emerald-gradient rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-xl">clinical_notes</span>
              </div>
              <span className="font-headline-sm text-headline-sm text-primary">PharmaVision AI</span>
            </div>

            <div className="mb-6">
              <h3 className="font-headline-md text-headline-md text-on-surface">Welcome Back</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Enter your credentials to access your dashboard</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-error-container/20 border border-error/20 rounded-xl mb-4">
                <span className="material-symbols-outlined text-error text-[18px]">error</span>
                <p className="text-body-sm text-error">{error}</p>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="font-label-md text-label-md text-on-surface-variant px-1" htmlFor="email">Email</label>
                <Field id="email" icon="mail" type="email" placeholder="pharmacist@hospital.com"
                  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between px-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
                  <button type="button" onClick={() => setForgotModal(true)} className="font-label-sm text-label-sm text-primary hover:underline">Forgot?</button>
                </div>
                <Field id="password" icon="lock" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  extra={
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  } />
              </div>

              <div className="flex items-center gap-2 px-1">
                <input id="remember" type="checkbox" checked={form.remember} onChange={e => setForm(p => ({ ...p, remember: e.target.checked }))}
                  className="w-4 h-4 text-primary rounded border-outline-variant" />
                <label className="font-label-sm text-label-sm text-on-surface-variant" htmlFor="remember">Keep me signed in for 30 days</label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full emerald-gradient text-on-primary py-4 rounded-xl font-headline-sm text-headline-sm shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                {loading ? <><span className="material-symbols-outlined animate-spin">refresh</span> Signing In...</> : <><span>Sign In</span><span className="material-symbols-outlined">arrow_forward</span></>}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-outline-variant/30 text-center">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary font-semibold hover:underline">Create Account</Link>
              </p>
            </div>

            <div className="mt-4 flex justify-center items-center gap-4 opacity-40 grayscale">
              {[['verified_user', 'HIPAA'], ['security', '256-bit AES']].map(([icon, label]) => (
                <div key={icon} className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={forgotModal} onClose={() => setForgotModal(false)} />

      <footer className="fixed bottom-0 w-full p-3 flex justify-center gap-6">
        {['Privacy Policy', 'Terms', 'Help'].map(l => (
          <a key={l} href="#" className="text-[11px] text-on-surface-variant/50 hover:text-primary transition-colors">{l}</a>
        ))}
      </footer>
    </div>
  )
}
