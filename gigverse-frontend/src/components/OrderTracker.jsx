// src/components/OrderTracker.jsx — Premium 4-Stage Milestone Escrow Tracker
// Glassmorphic, amber-glow design with interactive approve & release flow.
import { useState, useEffect } from 'react';
import {
  Check, Palette, FileText, RefreshCw, Package, Lock, Loader2,
  ShieldCheck, Sparkles, ArrowRight, DollarSign
} from 'lucide-react';
import { orderAPI } from '../lib/api';
import toast from 'react-hot-toast';

const STEPS = [
  { step: 1, label: 'Design & Planning',   icon: Palette,   pct: 25  },
  { step: 2, label: 'Draft & Development',  icon: FileText,  pct: 50  },
  { step: 3, label: 'Review & Revisions',   icon: RefreshCw, pct: 75  },
  { step: 4, label: 'Final Delivery',       icon: Package,   pct: 100 },
];

const STATUS_LABEL = {
  pending: 'Pending',
  submitted_by_freelancer: 'Awaiting Approval',
  approved_by_client: 'Approved',
  funds_released: 'Funds Released',
};

const STATUS_COLOR = {
  pending: 'text-gray-400',
  submitted_by_freelancer: 'text-amber-500',
  approved_by_client: 'text-emerald-500',
  funds_released: 'text-emerald-600',
};

export default function OrderTracker({
  orderId,
  currentStep = 0,
  milestones = [],
  isContributor = false,
  isClient = false,
  orderStatus = '',
  orderAmount = 0,
  onStepUpdate = () => {},
}) {
  const [advancing, setAdvancing] = useState(false);
  const [approving, setApproving] = useState(null);
  const [activeStep, setActiveStep] = useState(currentStep);
  const [localMilestones, setLocalMilestones] = useState(milestones);

  useEffect(() => { setActiveStep(currentStep); }, [currentStep]);
  useEffect(() => { setLocalMilestones(milestones); }, [milestones]);

  const getMilestone = (step) => localMilestones.find(m => m.Step === step);

  const getStepStatus = (step) => {
    const ms = getMilestone(step);
    return ms?.Status || 'pending';
  };

  const isCompleted = (step) => {
    const status = getStepStatus(step);
    return status === 'funds_released' || status === 'approved_by_client';
  };

  const isSubmitted = (step) => getStepStatus(step) === 'submitted_by_freelancer';

  const canContributorSubmit = (step) => {
    if (!isContributor || orderStatus !== 'In_Progress' || advancing) return false;
    const status = getStepStatus(step);
    if (status !== 'pending') return false;
    // Must complete steps in order
    if (step > 1 && getStepStatus(step - 1) === 'pending') return false;
    return true;
  };

  const canClientApprove = (step) => {
    if (!isClient || approving) return false;
    return getStepStatus(step) === 'submitted_by_freelancer';
  };

  // Contributor submits a milestone
  const handleSubmit = async (step) => {
    if (!canContributorSubmit(step)) return;
    setAdvancing(true);
    try {
      await orderAPI.updateMilestone(orderId, { step });
      setActiveStep(step);
      // Update local state
      setLocalMilestones(prev => prev.map(m =>
        m.Step === step ? { ...m, Status: 'submitted_by_freelancer', CompletedAt: new Date().toISOString() } : m
      ));
      onStepUpdate(step);
      const s = STEPS.find(x => x.step === step);
      toast.success(`"${s?.label}" submitted for approval!`, { className: 'gv-toast', icon: '🎯' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit milestone.', { className: 'gv-toast' });
    } finally { setAdvancing(false); }
  };

  // Client approves a milestone → releases 25% escrow
  const handleApprove = async (step) => {
    if (!canClientApprove(step)) return;
    setApproving(step);
    try {
      const res = await orderAPI.approveMilestone(orderId, { step });
      const d = res.data?.data;
      setLocalMilestones(prev => prev.map(m =>
        m.Step === step ? { ...m, Status: 'funds_released', ApprovedAt: new Date().toISOString(), AmountTaka: d?.releaseTaka } : m
      ));
      onStepUpdate(step);
      toast.success(`৳${d?.releaseTaka?.toLocaleString() || '—'} released from escrow!`, {
        className: 'gv-toast', icon: '💰', duration: 4000,
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve milestone.', { className: 'gv-toast' });
    } finally { setApproving(null); }
  };

  // Calculate progress
  const releasedCount = localMilestones.filter(m => m.Status === 'funds_released').length;
  const submittedCount = localMilestones.filter(m => m.Status === 'submitted_by_freelancer').length;
  const progressPercent = releasedCount * 25;
  const totalReleased = localMilestones
    .filter(m => m.Status === 'funds_released')
    .reduce((sum, m) => sum + Number(m.AmountTaka || 0), 0);
  const isFullyReleased = releasedCount >= 4;

  return (
    <div className="space-y-5">
      {/*  Header with progress summary  */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            isFullyReleased
              ? 'bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-green-200'
              : 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200'
          }`}>
            {isFullyReleased ? <Check size={18} className="text-white" strokeWidth={3} /> : <Sparkles size={18} className="text-white" />}
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-gray-900">Milestone Escrow Tracker</h3>
            <p className="text-[10px] text-gray-400 font-medium">4-Stage Smart Payment Release</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[10px] text-gray-400 font-medium">Released</p>
            <p className={`text-sm font-extrabold ${isFullyReleased ? 'text-emerald-600' : 'text-amber-600'}`}>
              &#2547;{totalReleased.toLocaleString()} <span className="text-gray-300 font-normal">/ &#2547;{Number(orderAmount).toLocaleString()}</span>
            </p>
          </div>
          <div className={`text-xs font-extrabold px-3 py-1.5 rounded-full ${
            isFullyReleased ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            {progressPercent}%
          </div>
        </div>
      </div>

      {/*  Glassmorphic progress bar  */}
      <div className="relative">
        <div className="h-3.5 bg-gray-100/80 rounded-full overflow-hidden backdrop-blur-sm border border-gray-200/50">
          <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
              isFullyReleased
                ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Animated shimmer */}
            {!isFullyReleased && progressPercent > 0 && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
                  style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)' }} />
              </div>
            )}
            {/* Glow effect for released */}
            {isFullyReleased && (
              <div className="absolute inset-0 animate-pulse opacity-40 bg-white rounded-full" />
            )}
          </div>
        </div>
        {/* Escrow lock label */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Lock size={10} className={isFullyReleased ? 'text-emerald-500' : 'text-amber-500'} />
          <span className={`text-[10px] font-semibold ${isFullyReleased ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isFullyReleased
              ? 'All funds released — Order complete!'
              : submittedCount > 0
                ? `${submittedCount} milestone(s) awaiting approval`
                : `${progressPercent}% escrow released`
            }
          </span>
        </div>
      </div>

      {/*  4-Stage Milestone Cards  */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {STEPS.map((s) => {
          const ms = getMilestone(s.step);
          const status = ms?.Status || 'pending';
          const released = status === 'funds_released';
          const submitted = status === 'submitted_by_freelancer';
          const pending = status === 'pending';
          const Icon = s.icon;
          const amtTaka = Number(ms?.AmountTaka || (Number(orderAmount) * 0.25)).toFixed(0);
          const showSubmitBtn = canContributorSubmit(s.step);
          const showApproveBtn = canClientApprove(s.step);

          return (
            <div
              key={s.step}
              className={`relative rounded-2xl border p-4 transition-all duration-500
                ${released
                  ? 'bg-gradient-to-br from-emerald-50/80 to-green-50/50 border-emerald-200 shadow-sm shadow-emerald-100'
                  : submitted
                    ? 'bg-gradient-to-br from-amber-50/80 to-orange-50/50 border-amber-200 shadow-md shadow-amber-100 animate-[glow-card_2s_infinite]'
                    : 'bg-white/60 border-gray-200/80 backdrop-blur-sm'
                }`}
            >
              {/* Ambient glow for submitted milestones */}
              {submitted && (
                <div className="absolute inset-0 rounded-2xl animate-pulse opacity-20 bg-gradient-to-br from-amber-300 to-orange-300 pointer-events-none" />
              )}

              <div className="relative z-10">
                {/* Step header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      released
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-sm'
                        : submitted
                          ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-200'
                          : 'bg-gray-100 text-gray-400'
                    }`}>
                      {released
                        ? <Check size={14} strokeWidth={3} />
                        : (advancing && showSubmitBtn) || (approving === s.step)
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Icon size={14} />
                      }
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-800 leading-tight">{s.label}</p>
                      <p className={`text-[10px] font-semibold ${STATUS_COLOR[status]}`}>
                        {STATUS_LABEL[status]}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-medium">{s.pct}%</p>
                    <p className={`text-xs font-extrabold ${released ? 'text-emerald-600' : 'text-gray-600'}`}>
                      &#2547;{Number(amtTaka).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Transaction ID for released milestones */}
                {released && ms?.ReleasedTransactionId && (
                  <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-emerald-100/60 rounded-lg">
                    <DollarSign size={10} className="text-emerald-500" />
                    <span className="text-[9px] text-emerald-600 font-mono font-medium truncate">
                      {ms.ReleasedTransactionId}
                    </span>
                  </div>
                )}

                {/* Contributor: Submit button */}
                {showSubmitBtn && (
                  <button
                    onClick={() => handleSubmit(s.step)}
                    disabled={advancing}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2.5
                      bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600
                      text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-200
                      hover:shadow-lg hover:shadow-amber-300 hover:scale-[1.02] active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {advancing ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                    Mark as Done
                  </button>
                )}

                {/* Client: Approve & Release button */}
                {showApproveBtn && (
                  <button
                    onClick={() => handleApprove(s.step)}
                    disabled={approving === s.step}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 px-3 py-2.5
                      bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600
                      text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200
                      hover:shadow-lg hover:shadow-emerald-300 hover:scale-[1.02] active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {approving === s.step
                      ? <Loader2 size={13} className="animate-spin" />
                      : <ShieldCheck size={13} />
                    }
                    Approve & Release &#2547;{Number(amtTaka).toLocaleString()}
                  </button>
                )}

                {/* Pending (non-actionable) */}
                {pending && !showSubmitBtn && (
                  <div className="mt-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 rounded-xl">
                    <Lock size={11} className="text-gray-300" />
                    <span className="text-[10px] text-gray-400 font-semibold">Locked</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
