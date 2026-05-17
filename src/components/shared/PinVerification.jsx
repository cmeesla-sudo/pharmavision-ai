import { useState, useRef, useEffect } from 'react'

export default function PinVerification({ isOpen, onClose, onVerify, loading, externalError }) {
  const [pin, setPin] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const inputRefs = [useRef(), useRef(), useRef(), useRef()]

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', ''])
      setError('')
      setSuccess(false)
      setTimeout(() => inputRefs[0].current?.focus(), 200)
    }
  }, [isOpen])

  const handleChange = (index, value) => {
    if (value.length > 1) return
    if (value && !/^\d$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value
    setPin(newPin)
    setError('')

    if (value && index < 3) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (pasted.length === 4) {
      const newPin = pasted.split('')
      setPin(newPin)
      inputRefs[3].current?.focus()
    }
  }

  const handleSubmit = () => {
    const fullPin = pin.join('')
    if (fullPin.length < 4) {
      setError('Please enter all 4 digits.')
      return
    }
    onVerify(fullPin)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative glass-card rounded-3xl p-10 w-full max-w-sm mx-4 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Icon + Title */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <span
              className="material-symbols-outlined text-primary text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_lock
            </span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface text-center">
            Enter Billing PIN
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant text-center mt-1">
            Confirm your identity to process this transaction
          </p>
        </div>

        {/* PIN inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              className={`w-14 h-14 text-center text-headline-md font-bold bg-surface-container-low border-2 rounded-xl outline-none transition-all ${
                error
                  ? 'border-error text-error'
                  : success
                  ? 'border-primary text-primary'
                  : digit
                  ? 'border-primary'
                  : 'border-outline-variant focus:border-primary'
              }`}
            />
          ))}
        </div>

        {/* Error */}
        {(error || externalError) && (
          <div className="flex items-center gap-2 text-error text-body-sm mb-4 justify-center">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {externalError || error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-2 text-primary text-body-sm mb-4 justify-center">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            PIN verified!
          </div>
        )}

        <div className="flex justify-center mb-6">
          <a href="/settings" className="text-[11px] text-primary font-bold hover:underline">Forgot PIN?</a>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || pin.join('').length < 4}
          className="w-full py-4 emerald-gradient text-on-primary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined animate-spin">refresh</span>
              Verifying...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">verified</span>
              Confirm Payment
            </>
          )}
        </button>
      </div>
    </div>
  )
}
