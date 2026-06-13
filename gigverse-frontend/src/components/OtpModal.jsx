// src/components/OtpModal.jsx
// 6-digit individual box OTP modal with countdown timer and resend button
import { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldCheck, RotateCcw, X, Mail } from 'lucide-react';

const OTP_EXPIRY_SECONDS = 600; // 10 minutes

export default function OtpModal({
  email,
  isLoading,
  onVerify,      // (otp: string) => void
  onResend,      // () => void
  onClose,       // () => void
  serverError,
}) {
  const [digits, setDigits]     = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [localErr, setLocalErr]  = useState('');
  const inputRefs = useRef([]);

  //  Countdown 
  useEffect(() => {
    if (timeLeft <= 0) { setCanResend(true); return; }
    const t = setTimeout(() => setTimeLeft((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  //  Digit input handlers 
  const handleDigitChange = (idx, val) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const next    = [...digits];
    next[idx]     = cleaned;
    setDigits(next);
    setLocalErr('');
    // Auto-advance
    if (cleaned && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft'  && idx > 0) inputRefs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const raw   = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next  = [...digits];
    for (let i = 0; i < 6; i++) next[i] = raw[i] || '';
    setDigits(next);
    const focusIdx = Math.min(raw.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const otpString = digits.join('');

  //  Submit 
  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (otpString.length < 6) { setLocalErr('Please enter all 6 digits.'); return; }
    onVerify(otpString);
  }, [otpString, onVerify]);

  // Allow Enter key to submit
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Enter') handleSubmit(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSubmit]);

  // Auto-focus first box on mount
  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  //  Resend 
  const handleResend = () => {
    setDigits(['', '', '', '', '', '']);
    setTimeLeft(OTP_EXPIRY_SECONDS);
    setCanResend(false);
    setLocalErr('');
    onResend();
    setTimeout(() => inputRefs.current[0]?.focus(), 50);
  };

  const displayError = localErr || serverError;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
        style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.25)' }}
      >
        {/* Orange top bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-brand-500 to-brand-700" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        <div className="px-8 py-8">
          {/* Icon + title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
              <ShieldCheck size={32} className="text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Your Email</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              We've sent a 6-digit code to
            </p>
            <div className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 bg-brand-50 rounded-full">
              <Mail size={12} className="text-brand-500" />
              <span className="text-xs font-semibold text-brand-700 truncate max-w-[220px]">{email}</span>
            </div>
          </div>

          {/* Error */}
          {displayError && (
            <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
              {displayError}
            </div>
          )}

          {/* 6-digit input grid */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="flex gap-2.5 justify-center mb-5" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => (inputRefs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className={`
                    w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none
                    transition-all duration-150 caret-transparent select-none
                    ${d
                      ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm shadow-brand-100'
                      : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-brand-400 focus:bg-white focus:shadow-sm'
                    }
                  `}
                  aria-label={`Digit ${i + 1}`}
                />
              ))}
            </div>

            {/* Timer */}
            <div className="text-center mb-5">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                >
                  <RotateCcw size={13} />
                  Resend Code
                </button>
              ) : (
                <p className="text-xs text-gray-400">
                  Code expires in{' '}
                  <span className={`font-bold tabular-nums ${timeLeft <= 60 ? 'text-red-500' : 'text-gray-600'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otpString.length < 6}
              className="btn-primary w-full !py-3.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"
            >
              {isLoading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span>
                : 'Verify & Create Account'
              }
            </button>
          </form>

          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors py-1"
          >
            ← Back to Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
