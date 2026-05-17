import { useState, useEffect, useRef } from 'react';

export const ForgotPinModal = ({ isOpen, onClose, onVerified, email, mobile }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(false);

  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (isOpen) {
      console.log("Demo OTP is 123456");
      setOtp(['', '', '', '', '', '']);
      setError('');
      setSuccessState(false);
      setLoading(false);
      setTimer(60);
      setTimeout(() => inputRefs[0].current?.focus(), 200);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleResend = () => {
    console.log("Demo OTP is 123456");
    setTimer(60);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setTimeout(() => inputRefs[0].current?.focus(), 200);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      setError('');
      inputRefs[5].current?.focus();
    }
  };

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      if (fullOtp === '123456') {
        setSuccessState(true);
        setTimeout(() => {
          setSuccessState(false);
          onVerified();
        }, 1000);
      } else {
        setError('Invalid OTP. Please use demo code 123456.');
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-md glass-card rounded-[28px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-inner">
            <span className={`material-symbols-outlined text-[32px] ${successState ? 'text-emerald-500 scale-110 transition-transform' : 'text-primary'}`}>
              {successState ? 'check_circle' : 'vibration'}
            </span>
          </div>

          <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-2">
            {successState ? 'Verification Complete!' : 'Enter 6-Digit Demo OTP'}
          </h2>
          <p className="text-body-md text-on-surface-variant text-center mb-8 leading-relaxed">
            {successState
              ? 'Your identity has been verified.'
              : `Enter the verification code to reset your billing PIN. (Demo code: 123456)`}
          </p>

          <div className="space-y-6 mb-8">
            <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  disabled={loading || successState}
                  className={`w-12 h-14 bg-surface-container-low border-2 rounded-xl text-center text-xl font-extrabold text-on-surface focus:bg-white outline-none transition-all shadow-sm ${error
                      ? 'border-red-500 text-red-500 bg-red-500/5 animate-shake'
                      : successState
                        ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        : digit
                          ? 'border-primary text-primary'
                          : 'border-white/10 focus:border-primary/50'
                    }`}
                  maxLength={1}
                />
              ))}
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 font-bold text-[12px]">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {successState && (
              <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 font-bold text-[12px] animate-pulse">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>OTP Verified! Proceeding to PIN reset...</span>
              </div>
            )}

            <div className="flex justify-between items-center text-[12px] px-1 font-semibold">
              <span className="text-on-surface-variant">{timer > 0 ? `Resend timer: ${timer}s` : 'Code expired?'}</span>
              <button
                disabled={timer > 0 || loading || successState}
                onClick={handleResend}
                className="text-primary font-bold hover:underline disabled:opacity-40 transition-opacity flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span> Resend Code
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleVerify}
              disabled={loading || successState || otp.some(d => !d)}
              className="w-full py-4 rounded-xl emerald-gradient text-white font-extrabold shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  <span>Verifying Code...</span>
                </>
              ) : successState ? (
                <>
                  <span className="material-symbols-outlined">check</span>
                  <span>Verified Successfully</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">verified_user</span>
                  <span>Verify & Reset PIN</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading || successState}
              className="w-full py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ResetPinModal = ({ isOpen, onClose, onReset }) => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewPin('');
      setConfirmPin('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return setError('PIN must be exactly 4 digits.');
    }
    if (newPin !== confirmPin) {
      return setError('PINs do not match. Please verify both inputs.');
    }
    if (newPin === '1234' || newPin === '0000') {
      return setError('Insecure PIN pattern detected. Choose a stronger combination.');
    }

    setLoading(true);
    setError('');
    try {
      await onReset(newPin);
      onClose();
    } catch (err) {
      console.error('Reset PIN error:', err);
      setError(err.message || 'Failed to update billing PIN. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-md glass-card rounded-[28px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-inner">
            <span className="material-symbols-outlined text-[32px] text-primary">lock_reset</span>
          </div>

          <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-2">Create New Billing PIN</h2>
          <p className="text-body-md text-on-surface-variant text-center mb-8 leading-relaxed">
            Choose a new secure 4-digit billing PIN. Avoid trivial sequences like 1234 or 0000.
          </p>

          <div className="space-y-5 mb-8">
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider block">New 4-Digit PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={newPin}
                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setNewPin(e.target.value.slice(0, 4)); setError(''); }}
                placeholder="••••"
                maxLength={4}
                className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/30 rounded-xl text-center text-3xl font-extrabold tracking-[0.7em] text-on-surface focus:bg-white focus:border-primary/50 outline-none transition-all shadow-sm font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider block">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => { if (/^\d*$/.test(e.target.value)) setConfirmPin(e.target.value.slice(0, 4)); setError(''); }}
                placeholder="••••"
                maxLength={4}
                className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/30 rounded-xl text-center text-3xl font-extrabold tracking-[0.7em] text-on-surface focus:bg-white focus:border-primary/50 outline-none transition-all shadow-sm font-mono"
              />
            </div>

            {error && (
              <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 font-bold text-[12px]">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading || newPin.length < 4 || confirmPin.length < 4}
              className="w-full py-4 rounded-xl emerald-gradient text-white font-extrabold shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  <span>Registering Secure PIN...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">save</span>
                  <span>Confirm & Register PIN</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ForgotPasswordModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('email'); // 'email', 'otp', 'reset'
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successState, setSuccessState] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    let interval;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setStep('email');
      setOtp(['', '', '', '', '', '']);
      setError('');
      setSuccessState(false);
      setLoading(false);
      setNewPassword('');
      setConfirmPassword('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendOtp = () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      console.log("Demo OTP is 123456");
      setStep('otp');
      setTimer(60);
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 200);
    }, 600);
  };

  const handleResend = () => {
    console.log("Demo OTP is 123456");
    setTimer(60);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setTimeout(() => inputRefs[0].current?.focus(), 200);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newOtp = pasted.split('');
      setOtp(newOtp);
      setError('');
      inputRefs[5].current?.focus();
    }
  };

  const handleVerify = () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter all 6 digits.');
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      if (fullOtp === '123456') {
        setSuccessState(true);
        setTimeout(() => {
          setSuccessState(false);
          setStep('reset');
        }, 1000);
      } else {
        setError('Invalid OTP. Please use demo code 123456.');
      }
    }, 800);
  };

  const handleResetPassword = () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');
    setTimeout(() => {
      setLoading(false);
      setSuccessState(true);
      setTimeout(() => {
        onClose();
      }, 1200);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

      <div className="relative w-full max-w-md glass-card rounded-[28px] border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-inner">
            <span className={`material-symbols-outlined text-[32px] ${successState ? 'text-emerald-500 scale-110 transition-transform' : 'text-primary'}`}>
              {successState ? 'check_circle' : step === 'email' ? 'lock_open' : step === 'otp' ? 'vibration' : 'key'}
            </span>
          </div>

          <h2 className="font-headline-md text-headline-md font-bold text-on-surface text-center mb-2">
            {successState && step === 'reset' ? 'Password Reset Complete!' : successState && step === 'otp' ? 'Verification Complete!' : step === 'email' ? 'Account Recovery' : step === 'otp' ? 'Enter 6-Digit Demo OTP' : 'Set New Password'}
          </h2>
          <p className="text-body-md text-on-surface-variant text-center mb-8 leading-relaxed">
            {successState && step === 'reset'
              ? 'Your password has been successfully updated.'
              : successState && step === 'otp'
                ? 'Your account has been verified.'
                : step === 'email'
                  ? 'Enter your account email to receive a demo verification code.'
                  : step === 'otp'
                    ? `Enter the verification code to recover your account. (Demo code: 123456)`
                    : 'Choose a strong password with at least 8 characters.'}
          </p>

          {step === 'email' && (
            <div className="space-y-5 mb-8">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider block">Registered Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="pharmacist@hospital.com"
                  className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/30 rounded-xl text-body-md text-on-surface focus:bg-white focus:border-primary/50 outline-none transition-all shadow-sm"
                />
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 font-bold text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-6 mb-8">
              <div className="flex justify-center gap-2.5" onPaste={handlePaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={inputRefs[i]}
                    type="text"
                    inputMode="numeric"
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading || successState}
                    className={`w-12 h-14 bg-surface-container-low border-2 rounded-xl text-center text-xl font-extrabold text-on-surface focus:bg-white outline-none transition-all shadow-sm ${error
                        ? 'border-red-500 text-red-500 bg-red-500/5 animate-shake'
                        : successState
                          ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                          : digit
                            ? 'border-primary text-primary'
                            : 'border-white/10 focus:border-primary/50'
                      }`}
                    maxLength={1}
                  />
                ))}
              </div>

              {error && (
                <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 font-bold text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {successState && (
                <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 font-bold text-[12px] animate-pulse">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>OTP Verified! Proceeding to password reset...</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[12px] px-1 font-semibold">
                <span className="text-on-surface-variant">{timer > 0 ? `Resend available in ${timer}s` : 'Code expired?'}</span>
                <button
                  disabled={timer > 0 || loading || successState}
                  onClick={handleResend}
                  className="text-primary font-bold hover:underline disabled:opacity-40 transition-opacity flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">refresh</span> Resend Code
                </button>
              </div>
            </div>
          )}

          {step === 'reset' && (
            <div className="space-y-5 mb-8">
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider block">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/30 rounded-xl text-body-md text-on-surface focus:bg-white focus:border-primary/50 outline-none transition-all shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-on-surface-variant ml-1 uppercase tracking-wider block">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-surface-container-low border border-outline-variant/30 rounded-xl text-body-md text-on-surface focus:bg-white focus:border-primary/50 outline-none transition-all shadow-sm"
                />
              </div>
              {error && (
                <div className="flex items-center justify-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-600 font-bold text-[12px]">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={step === 'email' ? handleSendOtp : step === 'otp' ? handleVerify : handleResetPassword}
              disabled={loading || successState || (step === 'otp' && otp.some(d => !d)) || (step === 'email' && !email) || (step === 'reset' && (!newPassword || !confirmPassword))}
              className="w-full py-4 rounded-xl emerald-gradient text-white font-extrabold shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                  <span>{step === 'email' ? 'Generating Demo Code...' : step === 'otp' ? 'Verifying Token...' : 'Updating Password...'}</span>
                </>
              ) : successState ? (
                <>
                  <span className="material-symbols-outlined">check</span>
                  <span>{step === 'reset' ? 'Password Reset Successfully' : 'Verified'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">
                    {step === 'email' ? 'send' : step === 'otp' ? 'verified_user' : 'save'}
                  </span>
                  <span>{step === 'email' ? 'Send Demo Code' : step === 'otp' ? 'Verify Code' : 'Update Password'}</span>
                </>
              )}
            </button>
            <button
              onClick={step === 'otp' && !successState && !loading ? () => setStep('email') : onClose}
              disabled={loading || successState}
              className="w-full py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors disabled:opacity-40"
            >
              {step === 'otp' ? 'Change Email Address' : 'Cancel Recovery'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
