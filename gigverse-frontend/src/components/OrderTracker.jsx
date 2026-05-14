// src/components/OrderTracker.jsx — 4-Step Visual Escrow Progress Bar
// Shows Design → Draft → Revisions → Delivered with escrow motivation labels.
// Contributors can advance steps; Clients see read-only view.
import { useState } from 'react';
import { Check, Palette, FileText, RefreshCw, Package, Lock, Loader2 } from 'lucide-react';
import { orderAPI } from '../lib/api';
import toast from 'react-hot-toast';

// ── Step definitions ────────────────────────────────────────────────────────
const STEPS = [
  { step: 1, label: 'Design',    sublabel: '25% Secured',   icon: Palette,   pct: 25 },
  { step: 2, label: 'Draft',     sublabel: '50% Secured',   icon: FileText,  pct: 50 },
  { step: 3, label: 'Revisions', sublabel: '75% Secured',   icon: RefreshCw, pct: 75 },
  { step: 4, label: 'Delivered', sublabel: '100% Released',  icon: Package,   pct: 100 },
];

/**
 * @param {Object} props
 * @param {number} props.orderId     - Order ID
 * @param {number} props.currentStep - Current milestone step (0-4)
 * @param {Array}  props.milestones  - Array of milestone objects from API
 * @param {boolean} props.isContributor - Whether the current user is the contributor
 * @param {string} props.orderStatus    - Current order status
 * @param {Function} props.onStepUpdate - Callback after a step is updated
 */
export default function OrderTracker({
  orderId,
  currentStep = 0,
  milestones = [],
  isContributor = false,
  orderStatus = '',
  onStepUpdate = () => {},
}) {
  const [advancing, setAdvancing] = useState(false);
  const [activeStep, setActiveStep] = useState(currentStep);

  // Check if a step is completed (either from milestones data or current step)
  const isStepCompleted = (step) => {
    const milestone = milestones.find(m => m.Step === step);
    if (milestone?.CompletedAt) return true;
    return step <= activeStep;
  };

  // Check if a step is the current active one
  const isStepActive = (step) => step === activeStep;

  // Can the contributor advance to this step?
  const canAdvance = (step) => {
    if (!isContributor) return false;
    if (orderStatus !== 'In_Progress') return false;
    if (advancing) return false;
    return step === activeStep + 1;
  };

  // Handle step advancement
  const handleAdvance = async (step) => {
    if (!canAdvance(step)) return;

    setAdvancing(true);
    try {
      await orderAPI.updateMilestone(orderId, { step });
      setActiveStep(step);
      onStepUpdate(step);

      const stepInfo = STEPS.find(s => s.step === step);
      toast.success(`${stepInfo?.label} milestone completed — ${stepInfo?.pct}% progress!`, {
        className: 'gv-toast',
        duration: 3000,
        icon: '🎯',
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update milestone.', {
        className: 'gv-toast',
      });
    } finally {
      setAdvancing(false);
    }
  };

  const progressPercent = Math.min(activeStep * 25, 100);
  const isInProgress = orderStatus === 'In_Progress';

  return (
    <div className="space-y-4">
      {/* ── Progress bar (continuous fill) ───────────────────────────────── */}
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-700">Order Progress</span>
          <span className="text-xs font-extrabold text-brand-600">{progressPercent}%</span>
        </div>

        {/* Background track */}
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
          {/* Filled portion */}
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden
              ${progressPercent === 100
                ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                : 'bg-gradient-to-r from-brand-400 via-brand-500 to-orange-400'
              }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Animated stripes for in-progress */}
            {isInProgress && progressPercent < 100 && (
              <div className="absolute inset-0 progress-stripes opacity-60" />
            )}
          </div>
        </div>

        {/* Escrow motivation label */}
        <div className="flex items-center justify-center gap-1.5 mt-2">
          <Lock size={10} className={progressPercent === 100 ? 'text-green-500' : 'text-brand-500'} />
          <span className={`text-[10px] font-semibold ${progressPercent === 100 ? 'text-green-600' : 'text-brand-600'}`}>
            {progressPercent === 100
              ? 'Escrow fully secured — Ready for release'
              : `${progressPercent}% of escrow unlocked — Keep going!`
            }
          </span>
        </div>
      </div>

      {/* ── 4-Step Visual Tracker ────────────────────────────────────────── */}
      <div className="flex items-start justify-between relative px-1">
        {STEPS.map((s, idx) => {
          const completed = isStepCompleted(s.step);
          const active    = isStepActive(s.step);
          const clickable = canAdvance(s.step);
          const Icon      = s.icon;

          return (
            <div key={s.step} className="flex flex-col items-center relative" style={{ flex: 1 }}>
              {/* Connector line (before each step except first) */}
              {idx > 0 && (
                <div
                  className={`absolute top-5 right-1/2 h-0.5 transition-all duration-500 ${
                    isStepCompleted(s.step) ? 'bg-brand-500' : 'bg-gray-200'
                  }`}
                  style={{ width: '100%', transform: 'translateX(50%)' }}
                />
              )}

              {/* Step circle */}
              <button
                onClick={() => handleAdvance(s.step)}
                disabled={!clickable}
                className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                  ${completed
                    ? 'bg-gradient-to-br from-brand-500 to-orange-400 text-white shadow-brand'
                    : active
                      ? 'bg-brand-50 text-brand-600 border-2 border-brand-500 shadow-md'
                      : clickable
                        ? 'bg-white text-gray-400 border-2 border-dashed border-brand-300 hover:border-brand-500 hover:text-brand-500 hover:bg-brand-50 cursor-pointer hover:scale-110 hover:shadow-brand'
                        : 'bg-gray-50 text-gray-300 border-2 border-gray-200'
                  }
                  ${advancing && clickable ? 'animate-pulse' : ''}
                `}
                title={clickable ? `Click to complete: ${s.label}` : s.label}
              >
                {advancing && clickable ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : completed ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  <Icon size={16} />
                )}

                {/* Glow ring for active step */}
                {active && !completed && (
                  <span className="absolute inset-0 rounded-xl animate-glow-pulse" />
                )}
              </button>

              {/* Step label */}
              <p className={`text-[10px] font-semibold mt-2 text-center leading-tight
                ${completed ? 'text-brand-600' : active ? 'text-gray-700' : 'text-gray-400'}`}
              >
                {s.label}
              </p>

              {/* Escrow percentage */}
              <p className={`text-[9px] font-medium mt-0.5
                ${completed ? 'text-brand-500' : 'text-gray-300'}`}
              >
                {s.sublabel}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
