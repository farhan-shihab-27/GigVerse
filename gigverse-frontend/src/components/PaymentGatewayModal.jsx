// src/components/PaymentGatewayModal.jsx — Premium Escrow Payment Gateway
// Glassmorphic modal with Mobile Money + Bank Transfer tabs.
import { useState } from 'react';
import {
  X, ShieldCheck, Loader2, CheckCircle2, AlertCircle,
  Smartphone, Building2, CreditCard, ArrowRight, Lock
} from 'lucide-react';
import { paymentAPI } from '../lib/api';

// ── Mobile Money Providers ───────────────────────────────────────────────────
const MOBILE_PROVIDERS = [
  {
    id: 'bkash',
    label: 'bKash',
    color: '#e2136e',
    dialCode: '*247#',
    receiveNumber: '01712-XXXXXX',
  },
  {
    id: 'nagad',
    label: 'Nagad',
    color: '#ed1c24',
    dialCode: '*167#',
    receiveNumber: '01812-XXXXXX',
  },
  {
    id: 'rocket',
    label: 'Rocket',
    color: '#8c1515',
    dialCode: '*322#',
    receiveNumber: '01912-XXXXXX',
  },
];

// ── Bank List (Exactly 20) ──────────────────────────────────────────────────
const BANK_LIST = [
  'BRAC Bank',
  'The City Bank',
  'Eastern Bank (EBL)',
  'Dutch-Bangla Bank (DBBL)',
  'Islami Bank Bangladesh',
  'Prime Bank',
  'Mutual Trust Bank (MTB)',
  'Standard Chartered Bangladesh',
  'Bank Asia',
  'United Commercial Bank (UCB)',
  'Trust Bank',
  'Mercantile Bank',
  'Dhaka Bank',
  'Jamuna Bank',
  'Southeast Bank',
  'Pubali Bank',
  'AB Bank',
  'NCC Bank',
  'Shahjalal Islami Bank',
  'HSBC Bangladesh',
];

/**
 * @param {Object}   props
 * @param {boolean}  props.isOpen       - Modal visibility
 * @param {Function} props.onClose      - Close callback
 * @param {Object}   props.order        - { orderId, gigTitle, amount }
 * @param {Function} props.onSuccess    - Called with response data on success
 */
export default function PaymentGatewayModal({ isOpen, onClose, order, onSuccess }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]           = useState('mobile');  // 'mobile' | 'bank'
  const [mobileProvider, setMobileProvider] = useState('bkash');
  const [senderNumber, setSenderNumber]     = useState('');
  const [txId, setTxId]                     = useState('');
  const [selectedBank, setSelectedBank]     = useState('');
  const [accountName, setAccountName]       = useState('');
  const [accountNumber, setAccountNumber]   = useState('');
  const [bankRefId, setBankRefId]           = useState('');
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');

  if (!isOpen || !order) return null;

  const selectedProvider = MOBILE_PROVIDERS.find(p => p.id === mobileProvider);

  // ── Validation ─────────────────────────────────────────────────────────────
  const isMobileValid = senderNumber.trim().length >= 6 && txId.trim().length >= 4;
  const isBankValid   = selectedBank && accountName.trim().length >= 2 && accountNumber.trim().length >= 6 && bankRefId.trim().length >= 4;
  const isFormValid   = activeTab === 'mobile' ? isMobileValid : isBankValid;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const payload = {
      orderId:          order.orderId,
      paymentMethod:    activeTab === 'mobile' ? mobileProvider : 'bank',
      senderAccountNo:  activeTab === 'mobile' ? senderNumber.trim() : accountNumber.trim(),
      transactionId:    activeTab === 'mobile' ? txId.trim() : bankRefId.trim(),
      senderBankName:   activeTab === 'bank' ? selectedBank : null,
      accountHolderName: activeTab === 'bank' ? accountName.trim() : null,
    };

    try {
      const res = await paymentAPI.processEscrow(payload);
      if (res.data?.success) {
        setSuccess('Payment submitted successfully! Funds are held in escrow.');
        if (onSuccess) onSuccess(res.data);
      } else {
        setError(res.data?.message || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while processing your payment.');
    } finally {
      setLoading(false);
    }
  };

  // ── Close handler (reset on close) ─────────────────────────────────────────
  const handleClose = () => {
    if (loading) return;
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-gray-900/10 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up border border-white/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="relative px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-brand-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-orange-400 flex items-center justify-center shadow-brand">
                <ShieldCheck size={18} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">Secure Escrow Payment</h2>
                <p className="text-[11px] text-gray-400 font-medium">Your funds are protected until delivery</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {/* Order Summary */}
          <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Order</p>
              <p className="text-sm font-semibold text-gray-900 truncate">{order.gigTitle}</p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Amount</p>
              <p className="text-xl font-extrabold text-brand-600">&#2547;{Number(order.amount).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* ── Tab Switcher ────────────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-0">
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('mobile')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'mobile'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Smartphone size={14} />
              Mobile Money
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === 'bank'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building2 size={14} />
              Bank Transfer
            </button>
          </div>
        </div>

        {/* ── Scrollable Content ──────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>

          {/* ────── TAB 1: MOBILE MONEY ────── */}
          {activeTab === 'mobile' && (
            <div className="space-y-5 animate-fade-in">
              {/* Provider selection */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2.5 block">Select Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {MOBILE_PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setMobileProvider(p.id)}
                      className={`relative py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all duration-200 ${
                        mobileProvider === p.id
                          ? 'shadow-md scale-[1.02]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:shadow-sm'
                      }`}
                      style={mobileProvider === p.id ? {
                        borderColor: p.color,
                        color: p.color,
                        backgroundColor: `${p.color}08`,
                      } : {}}
                    >
                      {mobileProvider === p.id && (
                        <div
                          className="absolute top-1.5 right-1.5 w-3 h-3 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: p.color }}
                        >
                          <CheckCircle2 size={8} className="text-white" />
                        </div>
                      )}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CreditCard size={11} /> Payment Instructions
                </h4>
                <ol className="text-xs text-gray-600 space-y-1.5 list-decimal pl-4 leading-relaxed">
                  <li>Open your <strong style={{ color: selectedProvider?.color }}>{selectedProvider?.label}</strong> app or Dial <code className="px-1.5 py-0.5 bg-white rounded text-[11px] font-mono font-bold border">{selectedProvider?.dialCode}</code></li>
                  <li>Choose <strong>"Send Money"</strong></li>
                  <li>
                    Enter GigVerse Escrow Number:
                    <span className="ml-1 font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">{selectedProvider?.receiveNumber}</span>
                  </li>
                  <li>Enter the total amount: <strong>&#2547;{Number(order.amount).toLocaleString()}</strong></li>
                  <li>Copy the <strong>Transaction ID</strong> from the confirmation and paste below</li>
                </ol>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Sender Number</label>
                  <input
                    id="mobile-sender-number"
                    type="tel"
                    placeholder="e.g. 01712345678"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Transaction ID (TxID)</label>
                  <input
                    id="mobile-txid"
                    type="text"
                    placeholder="e.g. 8A7B6C5D4E"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="input-field uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ────── TAB 2: BANK TRANSFER ────── */}
          {activeTab === 'bank' && (
            <div className="space-y-5 animate-fade-in">
              {/* Bank details card */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <Building2 size={11} /> Transfer Instructions
                </h4>
                <div className="text-xs text-gray-600 space-y-1 leading-relaxed">
                  <p>Transfer the exact amount to the GigVerse Escrow Account:</p>
                  <div className="mt-2 bg-white rounded-lg p-3 border border-gray-200 space-y-1">
                    <p><span className="text-gray-400">Account Name:</span> <strong>GigVerse Escrow Holdings</strong></p>
                    <p><span className="text-gray-400">Account No:</span> <strong className="text-brand-600">1234-5678-9012</strong></p>
                    <p><span className="text-gray-400">Bank:</span> <strong>BRAC Bank</strong></p>
                    <p><span className="text-gray-400">Branch:</span> <strong>Dhaka Main</strong></p>
                  </div>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Sender Bank</label>
                  <select
                    id="bank-select"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="input-field appearance-none cursor-pointer"
                  >
                    <option value="">Select your bank...</option>
                    {BANK_LIST.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Account Holder Name</label>
                  <input
                    id="bank-account-name"
                    type="text"
                    placeholder="e.g. John Doe"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Account Number</label>
                  <input
                    id="bank-account-number"
                    type="text"
                    placeholder="e.g. 1234567890123"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Reference / TxID</label>
                  <input
                    id="bank-ref-id"
                    type="text"
                    placeholder="e.g. REF-20260513-001"
                    value={bankRefId}
                    onChange={(e) => setBankRefId(e.target.value)}
                    className="input-field uppercase"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50/80 to-white space-y-3">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium animate-slide-up">
              <AlertCircle size={14} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-medium animate-slide-up">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Submit */}
          {!success ? (
            <button
              id="submit-escrow-payment"
              onClick={handleSubmit}
              disabled={!isFormValid || loading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 shadow-brand hover:shadow-brand-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-brand transition-all duration-200"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock size={14} />
                  Submit Escrow Payment
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="w-full py-3.5 rounded-xl text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-all duration-200 flex items-center justify-center gap-2"
            >
              <CheckCircle2 size={14} />
              Done — Close
            </button>
          )}

          {/* Trust badge */}
          <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <ShieldCheck size={11} className="text-green-500" />
            <span>256-bit encrypted · Funds held until delivery confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
