// src/components/DeleteAccountModal.jsx — 2-step account deletion flow
import { useState } from 'react';
import { AlertTriangle, X, Loader2, CheckCircle2, Lock, Trash2, ChevronRight } from 'lucide-react';
import { userAPI } from '../lib/api';
import { useNavigate } from 'react-router-dom';

const REASONS = [
  'Not getting enough orders',
  'Got scammed or had a bad experience',
  'Taking a break from the platform',
  'Found a better alternative',
  'Privacy concerns',
  'Other reason',
];

export default function DeleteAccountModal({ onClose }) {
  const navigate  = useNavigate();
  const [step, setStep]         = useState(1);        // 1 = survey, 2 = confirm
  const [reason, setReason]     = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleDelete = async () => {
    if (!password.trim()) { setError('Please enter your password to confirm.'); return; }
    setError(''); setLoading(true);
    try {
      await userAPI.deleteAccount({ password });
      // Clear session and redirect
      localStorage.removeItem('gv_token');
      localStorage.removeItem('gv_user');
      navigate('/auth', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Deletion failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center shrink-0">
              <Trash2 size={18} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Delete Account</h2>
              <p className="text-xs text-gray-400">Step {step} of 2 — {step === 1 ? 'Tell us why' : 'Final confirmation'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-gray-100">
          <div className="h-full bg-red-400 transition-all duration-500" style={{ width: step === 1 ? '50%' : '100%' }} />
        </div>

        <div className="px-6 py-5">

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* ── STEP 1: Survey ── */}
          {step === 1 && (
            <>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                We are sorry to see you go. Please tell us your reason so we can keep improving GigVerse.
              </p>
              <div className="space-y-2">
                {REASONS.map(r => (
                  <label key={r}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-150 ${
                      reason === r
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <input type="radio" name="reason" value={r} checked={reason === r}
                      onChange={() => { setReason(r); setError(''); }}
                      className="accent-red-500 shrink-0" />
                    <span className={`text-sm font-medium ${reason === r ? 'text-red-600' : 'text-gray-700'}`}>{r}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button onClick={onClose}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  Cancel
                </button>
                <button
                  onClick={() => { if (!reason) { setError('Please select a reason to continue.'); return; } setError(''); setStep(2); }}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
                  Continue<ChevronRight size={14} />
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Password Confirm ── */}
          {step === 2 && (
            <>
              {/* Critical warning */}
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-700">This action cannot be undone</p>
                </div>
                <ul className="space-y-1.5 pl-5">
                  {[
                    'Your UIU email will be freed immediately for re-signup.',
                    'All your gig history and PVP points will be preserved for platform integrity.',
                    'Your active orders must be completed or cancelled before deletion.',
                  ].map(item => (
                    <li key={item} className="text-xs text-red-600 list-disc leading-relaxed">{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">
                  Confirm with your password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-300" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter your current password"
                    className="input-field pl-10 border-red-200 focus:border-red-400 focus:ring-red-100"
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-medium">
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setStep(1); setPassword(''); setError(''); }}
                  className="flex-1 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                  Go Back
                </button>
                <button onClick={handleDelete} disabled={loading || !password}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" />Deleting...</>
                    : <><Trash2 size={14} />Delete My Account</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
