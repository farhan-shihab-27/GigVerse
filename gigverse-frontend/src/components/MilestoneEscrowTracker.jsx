// src/components/MilestoneEscrowTracker.jsx — Elite ERP-Grade Milestone Escrow Tracker
// Premium glassmorphic design with animated progress, step sequencing, and fund release UI.
// Analytics section appended at bottom — reactive to live milestone state, API-wiring ready.
import { useState, useEffect, useRef } from 'react';
import {
  Check, Palette, FileText, RefreshCw, Package, Lock, Loader2,
  ShieldCheck, Sparkles, ArrowRight, DollarSign, AlertCircle,
  Clock, ChevronRight, Unlock, TrendingUp, Shield, BarChart2,
  Layers, Activity
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

// ── SVG Doughnut Chart ───────────────────────────────────────────────────────
/**
 * Pure SVG doughnut ring chart. No external dependencies.
 * Props:
 *   releasedPct  {number}  0-100 — percentage of funds released (emerald slice)
 *   isComplete   {boolean} — full completion state
 */
function EscrowDoughnutChart({ releasedPct, isComplete }) {
  const radius = 52;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * radius;
  // Clamp to [0, 100]
  const pct = Math.min(100, Math.max(0, releasedPct));
  const releasedArc = (pct / 100) * circumference;
  const remainingArc = circumference - releasedArc;

  // Colors
  const releasedColor = '#10b981'; // Emerald-500
  const remainColor   = isComplete ? '#d1fae5' : '#f1f5f9'; // Pale emerald or slate
  const accentColor   = pct > 0 && pct < 100 ? '#f97316' : releasedColor;

  const animRef = useRef(null);

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={radius}
          stroke={remainColor}
          strokeWidth="18"
          fill="none"
        />
        {/* Released arc — animated via CSS transition */}
        <circle
          cx={cx} cy={cy} r={radius}
          stroke={releasedColor}
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${releasedArc} ${remainingArc}`}
          strokeDashoffset={circumference * 0.25} // Start from top
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
        {/* Accent cap dot when partially done */}
        {pct > 2 && pct < 98 && (
          <circle
            cx={cx} cy={cy - radius} r="4"
            fill={accentColor}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              transform: `rotate(${(pct / 100) * 360 - 90}deg)`,
              transition: 'transform 1s cubic-bezier(0.4,0,0.2,1)'
            }}
          />
        )}
        {/* Completion sparkle ring */}
        {isComplete && (
          <circle cx={cx} cy={cy} r={radius + 12}
            stroke="#10b981" strokeWidth="1.5" fill="none" strokeDasharray="4 6"
            opacity="0.4"
          />
        )}
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-extrabold leading-none ${
          isComplete ? 'text-emerald-600' : pct > 0 ? 'text-gray-800' : 'text-gray-300'
        }`}>
          {Math.round(pct)}%
        </span>
        <span className={`text-[10px] font-bold mt-0.5 ${
          isComplete ? 'text-emerald-500' : 'text-gray-400'
        }`}>
          {isComplete ? 'Complete' : 'Done'}
        </span>
      </div>
    </div>
  );
}

// ── Order Financial Analytics Section ────────────────────────────────────────
/**
 * Appended below the milestone cards — reads computed values from parent scope.
 * All props are API-wiring ready; replace mock derivations with real API data.
 *
 * Props:
 *   totalOrderValue  {number}  — full contract value in BDT
 *   releasedFunds    {number}  — sum of released milestone amounts
 *   escrowRemaining  {number}  — totalOrderValue - releasedFunds
 *   completionPct    {number}  — 0-100
 *   isComplete       {boolean}
 *   milestoneCount   {number}  — total milestones (4)
 *   releasedCount    {number}  — milestones with funds_released status
 */
function OrderFinancialAnalytics({
  totalOrderValue,
  releasedFunds,
  escrowRemaining,
  completionPct,
  isComplete,
  milestoneCount,
  releasedCount,
}) {
  // ── ERP Stat Cards data ───────────────────────────────────────────────────
  const statCards = [
    {
      id: 'tvl',
      icon: Shield,
      label: 'Total Value Locked (TVL)',
      sublabel: 'Full contract escrow pool',
      value: `৳${Number(totalOrderValue).toLocaleString()}`,
      valueColor: 'text-gray-900',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      accent: 'border-slate-200',
      badge: null,
    },
    {
      id: 'liquid',
      icon: TrendingUp,
      label: 'Liquid Assets Released',
      sublabel: `${releasedCount} of ${milestoneCount} milestones`,
      value: `৳${Number(releasedFunds).toLocaleString()}`,
      valueColor: releasedFunds > 0 ? 'text-emerald-600' : 'text-gray-400',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      accent: releasedFunds > 0 ? 'border-emerald-200' : 'border-gray-200',
      badge: releasedFunds > 0 ? { text: '+' + Math.round(completionPct) + '%', color: 'bg-emerald-100 text-emerald-700' } : null,
    },
    {
      id: 'escrow',
      icon: ShieldCheck,
      label: 'Escrow Protection',
      sublabel: 'Remaining in secure vault',
      value: `৳${Number(escrowRemaining).toLocaleString()}`,
      valueColor: escrowRemaining > 0 ? 'text-orange-600' : 'text-emerald-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-500',
      accent: escrowRemaining > 0 ? 'border-orange-200' : 'border-emerald-200',
      badge: { text: 'Platform Secured', color: 'bg-blue-50 text-blue-600' },
    },
  ];

  return (
    <div className="mt-2 pt-6 border-t-2 border-dashed border-gray-100">

      {/* ── Section Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm shadow-emerald-200">
            <BarChart2 size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-gray-900 leading-tight">Order Financial Analytics</p>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">Real-time escrow telemetry</p>
          </div>
        </div>
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-600">LIVE</span>
        </div>
      </div>

      {/* ── Chart + Legend Row ── */}
      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6
        bg-gradient-to-br from-slate-50 to-emerald-50/30
        border border-slate-200/80 rounded-2xl p-5
        shadow-sm">

        {/* Doughnut Chart */}
        <div className="shrink-0">
          <EscrowDoughnutChart releasedPct={completionPct} isComplete={isComplete} />
        </div>

        {/* Legend + Breakdown */}
        <div className="flex-1 min-w-0 space-y-3">
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Escrow Breakdown</p>

          {/* Released row */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-xs font-semibold text-gray-700">Released Funds</span>
              </div>
              <span className="text-xs font-extrabold text-emerald-600">
                ৳{Number(releasedFunds).toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${completionPct}%` }}
              />
            </div>
          </div>

          {/* Escrow remaining row */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-300 shrink-0" />
                <span className="text-xs font-semibold text-gray-700">Funds in Escrow</span>
              </div>
              <span className="text-xs font-extrabold text-orange-500">
                ৳{Number(escrowRemaining).toLocaleString()}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-300 to-amber-300 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${100 - completionPct}%` }}
              />
            </div>
          </div>

          {/* Milestone step indicators */}
          <div className="flex items-center gap-2 pt-1">
            {Array.from({ length: milestoneCount }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-1.5 rounded-full transition-all duration-500 ${
                  i < releasedCount ? 'bg-emerald-400' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-400">
            {releasedCount} of {milestoneCount} milestone escrow pools cleared
          </p>
        </div>
      </div>

      {/* ── ERP Stat Cards — 3-column grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {statCards.map((card) => {
          const CardIcon = card.icon;
          return (
            <div
              key={card.id}
              className={`relative rounded-xl border-2 ${card.accent} bg-white p-4
                shadow-sm hover:shadow-md hover:-translate-y-0.5
                transition-all duration-200 group overflow-hidden`}
            >
              {/* Subtle gradient glow on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
                bg-gradient-to-br from-transparent via-transparent to-slate-50/60 rounded-xl pointer-events-none" />

              <div className="relative z-10">
                {/* Icon + Badge row */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                    <CardIcon size={15} className={card.iconColor} />
                  </div>
                  {card.badge && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${card.badge.color}`}>
                      {card.badge.text}
                    </span>
                  )}
                </div>

                {/* Value */}
                <p className={`text-lg font-extrabold ${card.valueColor} leading-none mb-1`}>
                  {card.value}
                </p>

                {/* Labels */}
                <p className="text-[11px] font-bold text-gray-700 leading-tight">{card.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{card.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ── */}
      <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/50 border border-blue-100">
        <Activity size={11} className="text-blue-400 shrink-0" />
        <p className="text-[10px] text-blue-500 font-medium">
          Escrow values update in real-time as milestones are approved and funds are released.
        </p>
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

      {/* ── Order Financial Analytics — appended below, no existing logic touched ── */}
      <OrderFinancialAnalytics
        totalOrderValue={Number(orderAmount)}
        releasedFunds={totalReleased}
        escrowRemaining={totalLocked}
        completionPct={progressPercent}
        isComplete={isFullyReleased}
        milestoneCount={STEPS.length}
        releasedCount={releasedCount}
      />
    </div>
  );
}
