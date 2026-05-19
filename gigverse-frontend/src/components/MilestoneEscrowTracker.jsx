// src/components/MilestoneEscrowTracker.jsx — Elite ERP-Grade Milestone Escrow Tracker
// Premium glassmorphic design with animated progress, step sequencing, and fund release UI.
import { useState, useEffect } from 'react';
import {
  Check, Palette, FileText, RefreshCw, Package, Lock, Loader2,
  ShieldCheck, Sparkles, ArrowRight, DollarSign, AlertCircle,
  Clock, ChevronRight, Unlock
} from 'lucide-react';
import { orderAPI } from '../lib/api';
import toast from 'react-hot-toast';

// ── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { step: 1, label: 'Design & Planning',   icon: Palette,   color: 'from-violet-400 to-purple-500',   shadow: 'shadow-purple-200', ring: 'ring-purple-300'  },
  { step: 2, label: 'Draft & Development', icon: FileText,  color: 'from-blue-400   to-indigo-500',   shadow: 'shadow-blue-200',   ring: 'ring-blue-300'    },
  { step: 3, label: 'Review & Revisions',  icon: RefreshCw, color: 'from-amber-400  to-orange-500',   shadow: 'shadow-amber-200',  ring: 'ring-amber-300'   },
  { step: 4, label: 'Final Delivery',      icon: Package,   color: 'from-emerald-400 to-green-500',   shadow: 'shadow-emerald-200',ring: 'ring-emerald-300' },
];

// ── Status metadata ──────────────────────────────────────────────────────────
const MS_STATUS = {
  pending: {
    label: 'Locked',
    icon: Lock,
    bg: 'bg-gray-100',
    text: 'text-gray-400',
    border: 'border-gray-200',
  },
  submitted_by_freelancer: {
    label: 'Awaiting Approval',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-300',
  },
  approved_by_client: {
    label: 'Approved',
    icon: Check,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-300',
  },
  funds_released: {
    label: 'Funds Released',
    icon: Unlock,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
  },
};

// ── Individual Milestone Card ─────────────────────────────────────────────────
function MilestoneCard({ stepDef, milestone, isContributor, isClient, canSubmit, canApprove, onSubmit, onApprove, submitting, approving, orderAmount }) {
  const status    = milestone?.Status || 'pending';
  const meta      = MS_STATUS[status] || MS_STATUS.pending;
  const released  = status === 'funds_released';
  const submitted = status === 'submitted_by_freelancer';
  const pending   = status === 'pending';
  const Icon      = stepDef.icon;
  const StatusIcon= meta.icon;
  const amtTaka   = Number(milestone?.AmountTaka || (Number(orderAmount) * 0.25)).toFixed(0);
  const txnId     = milestone?.ReleasedTransactionId;

  return (
    <div className={`relative rounded-2xl border-2 p-4 transition-all duration-500 overflow-hidden
      ${released
        ? 'bg-gradient-to-br from-emerald-50 to-green-50/60 border-emerald-200 shadow-sm shadow-emerald-100'
        : submitted
          ? `bg-gradient-to-br from-amber-50/80 to-orange-50/60 border-amber-300 shadow-md shadow-amber-100`
          : `bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm`
      }`}
    >
      {/* Glow pulse for submitted */}
      {submitted && (
        <div className="absolute inset-0 rounded-2xl pointer-events-none">
          <div className="absolute inset-0 animate-[glow-card_2.5s_ease-in-out_infinite] rounded-2xl" />
        </div>
      )}

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {/* Step icon */}
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300
              ${released
                ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-md shadow-emerald-200 text-white'
                : submitted
                  ? `bg-gradient-to-br ${stepDef.color} ${stepDef.shadow} text-white shadow-md`
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {released
                ? <Check size={16} strokeWidth={3} className="text-white" />
                : submitting || approving
                  ? <Loader2 size={15} className="animate-spin" />
                  : <Icon size={15} />
              }
            </div>
            <div>
              <p className="text-xs font-extrabold text-gray-900 leading-tight">{stepDef.label}</p>
              <div className={`inline-flex items-center gap-1 text-[10px] font-bold mt-0.5 ${meta.text}`}>
                <StatusIcon size={9} strokeWidth={2.5} />
                {meta.label}
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-gray-400 font-medium">25% escrow</p>
            <p className={`text-sm font-extrabold ${released ? 'text-emerald-600' : 'text-gray-700'}`}>
              ৳{Number(amtTaka).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Transaction ID for released milestones */}
        {released && txnId && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-emerald-100/70 rounded-xl">
            <DollarSign size={10} className="text-emerald-500 shrink-0" />
            <span className="text-[9px] text-emerald-700 font-mono font-medium truncate">{txnId}</span>
          </div>
        )}

        {/* Approval timestamp */}
        {released && milestone?.ApprovedAt && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-gray-50 rounded-xl">
            <Clock size={10} className="text-gray-400 shrink-0" />
            <span className="text-[10px] text-gray-400">
              Released {new Date(milestone.ApprovedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Submission timestamp */}
        {submitted && milestone?.CompletedAt && (
          <div className="flex items-center gap-1.5 mb-3 px-2.5 py-1.5 bg-amber-50 rounded-xl">
            <Clock size={10} className="text-amber-500 shrink-0" />
            <span className="text-[10px] text-amber-600">
              Submitted {new Date(milestone.CompletedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* CONTRIBUTOR: Submit button */}
        {canSubmit && (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className={`w-full mt-1 flex items-center justify-center gap-2 px-3 py-2.5
              bg-gradient-to-r ${stepDef.color} ${stepDef.shadow}
              text-white rounded-xl text-xs font-extrabold transition-all
              shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
            Mark as Done & Submit
          </button>
        )}

        {/* CLIENT: Approve & Release button */}
        {canApprove && (
          <button
            onClick={onApprove}
            disabled={approving}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2.5
              bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600
              text-white rounded-xl text-xs font-extrabold transition-all
              shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-300
              hover:scale-[1.02] active:scale-[0.98]
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving
              ? <Loader2 size={13} className="animate-spin" />
              : <ShieldCheck size={13} />
            }
            Approve & Release ৳{Number(amtTaka).toLocaleString()}
          </button>
        )}

        {/* Pending lock state */}
        {pending && !canSubmit && (
          <div className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <Lock size={11} className="text-gray-300" />
            <span className="text-[10px] text-gray-400 font-semibold">Awaiting previous milestone</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Progress Bar ─────────────────────────────────────────────────────────────
function EscrowProgressBar({ percent, isComplete }) {
  return (
    <div className="space-y-2">
      <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
        {/* Segments (25% markers) */}
        {[25, 50, 75].map(p => (
          <div key={p} className="absolute top-0 bottom-0 w-px bg-white/80 z-10" style={{ left: `${p}%` }} />
        ))}
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500'
              : 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500'
          }`}
          style={{ width: `${percent}%` }}
        >
          {/* Shimmer */}
          {!isComplete && percent > 0 && (
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
              />
            </div>
          )}
          {isComplete && (
            <div className="absolute inset-0 animate-pulse opacity-30 bg-white rounded-full" />
          )}
        </div>
      </div>
      {/* Tick labels */}
      <div className="flex justify-between px-0.5">
        {['0%', '25%', '50%', '75%', '100%'].map((t, i) => (
          <span key={t} className={`text-[9px] font-bold ${i * 25 <= percent ? (isComplete ? 'text-emerald-600' : 'text-amber-600') : 'text-gray-300'}`}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MilestoneEscrowTracker({
  orderId,
  currentStep = 0,
  milestones = [],
  isContributor = false,
  isClient = false,
  orderStatus = '',
  orderAmount = 0,
  onStepUpdate = () => {},
}) {
  const [advancing, setAdvancing]       = useState(false);
  const [approving, setApproving]       = useState(null);
  const [localMilestones, setLocal]     = useState(milestones);

  useEffect(() => { setLocal(milestones); }, [milestones]);

  const getMS   = (step) => localMilestones.find(m => m.Step === step);
  const getStatus = (step) => getMS(step)?.Status || 'pending';

  const canContributorSubmit = (step) => {
    if (!isContributor || orderStatus !== 'In_Progress' || advancing) return false;
    if (getStatus(step) !== 'pending') return false;
    // Sequential enforcement: every prior step must be fully 'funds_released'
    if (step > 1 && getStatus(step - 1) !== 'funds_released') return false;
    return true;
  };

  const canClientApprove = (step) => {
    if (!isClient || approving) return false;
    return getStatus(step) === 'submitted_by_freelancer';
  };

  // ── Submit milestone ─────────────────────────────────────────────────────
  const handleSubmit = async (step) => {
    if (!canContributorSubmit(step)) return;
    setAdvancing(true);
    try {
      await orderAPI.updateMilestone(orderId, { step });
      setLocal(prev => prev.map(m =>
        m.Step === step ? { ...m, Status: 'submitted_by_freelancer', CompletedAt: new Date().toISOString() } : m
      ));
      onStepUpdate(step);
      const s = STEPS.find(x => x.step === step);
      toast.success(`"${s?.label}" submitted for client approval!`, { className: 'gv-toast', icon: '🎯' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit milestone.', { className: 'gv-toast' });
    } finally { setAdvancing(false); }
  };

  // ── Approve milestone & release funds ────────────────────────────────────
  const handleApprove = async (step) => {
    if (!canClientApprove(step)) return;
    setApproving(step);
    try {
      const res = await orderAPI.approveMilestone(orderId, { step });
      const d = res.data?.data;
      setLocal(prev => prev.map(m =>
        m.Step === step
          ? { ...m, Status: 'funds_released', ApprovedAt: new Date().toISOString(), AmountTaka: d?.releaseTaka }
          : m
      ));
      onStepUpdate(step);
      const walletLine = d?.walletBalance != null
        ? ` | Wallet: ৳${Number(d.walletBalance).toLocaleString()}`
        : '';
      toast.success(
        `৳${d?.releaseTaka?.toLocaleString() || '—'} released from escrow!${walletLine} 🎉`,
        { className: 'gv-toast', icon: '💰', duration: 5000 }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve milestone.', { className: 'gv-toast' });
    } finally { setApproving(null); }
  };

  // ── Computed values ──────────────────────────────────────────────────────
  const releasedCount   = localMilestones.filter(m => m.Status === 'funds_released').length;
  const submittedCount  = localMilestones.filter(m => m.Status === 'submitted_by_freelancer').length;
  const progressPercent = releasedCount * 25;
  const totalReleased   = localMilestones
    .filter(m => m.Status === 'funds_released')
    .reduce((sum, m) => sum + Number(m.AmountTaka || 0), 0);
  const totalLocked     = Number(orderAmount) - totalReleased;
  const isFullyReleased = releasedCount >= 4;

  return (
    <div className="space-y-6">

      {/* ── Summary header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
            isFullyReleased
              ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-200'
              : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200'
          }`}>
            {isFullyReleased
              ? <Check size={20} className="text-white" strokeWidth={3} />
              : <Sparkles size={20} className="text-white" />
            }
          </div>
          <div>
            <p className="text-xs font-extrabold text-gray-900">
              {isFullyReleased ? 'All Funds Released ✓' : submittedCount > 0 ? `${submittedCount} Awaiting Approval` : `${releasedCount}/4 Milestones Complete`}
            </p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {isFullyReleased ? 'Order fully settled' : '25% escrow released per milestone'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-medium">Released</p>
            <p className={`text-sm font-extrabold ${isFullyReleased ? 'text-emerald-600' : 'text-amber-600'}`}>
              ৳{totalReleased.toLocaleString()}
              <span className="text-gray-300 text-xs font-normal"> / ৳{Number(orderAmount).toLocaleString()}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-medium">In Escrow</p>
            <p className="text-sm font-extrabold text-gray-600">৳{totalLocked.toLocaleString()}</p>
          </div>
          <div className={`text-xs font-extrabold px-3 py-1.5 rounded-full border ${
            isFullyReleased
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {progressPercent}%
          </div>
        </div>
      </div>

      {/* ── Progress bar ── */}
      <EscrowProgressBar percent={progressPercent} isComplete={isFullyReleased} />

      {/* Role guidance chip */}
      {(isContributor || isClient) && !isFullyReleased && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold ${
          isContributor ? 'bg-blue-50 border border-blue-100 text-blue-700' : 'bg-emerald-50 border border-emerald-100 text-emerald-700'
        }`}>
          <AlertCircle size={12} />
          {isContributor
            ? 'Complete each milestone in order, then mark it done for client approval.'
            : 'Review each submitted milestone and approve to release the corresponding escrow funds.'}
        </div>
      )}

      {/* ── Milestone Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {STEPS.map((s) => {
          const ms = getMS(s.step);
          return (
            <MilestoneCard
              key={s.step}
              stepDef={s}
              milestone={ms}
              isContributor={isContributor}
              isClient={isClient}
              canSubmit={canContributorSubmit(s.step)}
              canApprove={canClientApprove(s.step)}
              onSubmit={() => handleSubmit(s.step)}
              onApprove={() => handleApprove(s.step)}
              submitting={advancing}
              approving={approving === s.step}
              orderAmount={orderAmount}
            />
          );
        })}
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-gray-100">
        {[
          { dot: 'bg-gray-300',   label: 'Locked' },
          { dot: 'bg-amber-400',  label: 'Awaiting Approval' },
          { dot: 'bg-emerald-500',label: 'Funds Released' },
        ].map(({ dot, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${dot}`} />
            <span className="text-[10px] text-gray-400 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
