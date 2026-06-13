// src/pages/OrderDetails.jsx — Premium ERP-Style Order Details & Milestone Escrow Hub
// Full-page detail view: timeline, escrow tracker, action panel, revision history
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ClipboardList, Loader2, AlertCircle, Clock, CheckCircle2,
  ShieldCheck, Package, RefreshCw, XCircle, AlertTriangle, MessageSquare,
  Phone, Mail, ExternalLink, DollarSign, TrendingUp, Calendar, User,
  ChevronRight, Zap, Info, Star, Flag
} from 'lucide-react';
import { orderAPI, paymentAPI, reportAPI, reviewAPI } from '../lib/api';
import MilestoneEscrowTracker from '../components/MilestoneEscrowTracker';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import toast from 'react-hot-toast';

//  Status display helpers 
const STATUS_META = {
  Pending_Acceptance: { color: 'text-amber-700 bg-amber-50 border-amber-200',   dot: 'bg-amber-400',   label: 'Pending Acceptance' },
  In_Progress:        { color: 'text-blue-700  bg-blue-50  border-blue-200',    dot: 'bg-blue-500',    label: 'In Progress' },
  Delivered:          { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', label: 'Delivered' },
  Completed:          { color: 'text-green-700 bg-green-50 border-green-200',   dot: 'bg-green-500',   label: 'Completed' },
  Cancelled:          { color: 'text-red-700   bg-red-50   border-red-200',     dot: 'bg-red-400',     label: 'Cancelled' },
  Disputed:           { color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400',  label: 'Disputed' },
  Custom_Pending:     { color: 'text-purple-700 bg-purple-50 border-purple-200', dot: 'bg-purple-400',  label: 'Custom Pending' },
  Pending:            { color: 'text-yellow-700 bg-yellow-50 border-yellow-200', dot: 'bg-yellow-400',  label: 'Pending' },
};

const PAYMENT_META = {
  Escrow_Held:        { color: 'text-brand-700  bg-brand-50',  label: 'Escrow Held' },
  In_Escrow:          { color: 'text-blue-700   bg-blue-50',   label: 'In Escrow' },
  Released:           { color: 'text-green-700  bg-green-50',  label: 'Released' },
  Refunded:           { color: 'text-gray-700   bg-gray-100',  label: 'Refunded' },
  Partially_Refunded: { color: 'text-amber-700  bg-amber-50',  label: 'Partially Refunded' },
  Pending:            { color: 'text-yellow-700 bg-yellow-50', label: 'Pending' },
};

//  Stat card 
function StatCard({ icon: Icon, label, value, sub, accent = 'brand' }) {
  const accents = {
    brand:   'from-brand-400   to-brand-600   shadow-brand',
    emerald: 'from-emerald-400 to-green-600   shadow-emerald-200',
    blue:    'from-blue-400    to-indigo-600  shadow-blue-200',
    amber:   'from-amber-400   to-orange-500  shadow-amber-200',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow duration-200">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accents[accent]} flex items-center justify-center shrink-0 shadow-md`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide truncate">{label}</p>
        <p className="text-base font-extrabold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 truncate">{sub}</p>}
      </div>
    </div>
  );
}

//  Timeline event 
function TimelineEvent({ dot, title, subtitle, time, isLast }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${dot}`} />
        {!isLast && <div className="w-px flex-1 bg-gray-100 mt-1" />}
      </div>
      <div className={`pb-4 ${isLast ? '' : ''}`}>
        <p className="text-xs font-semibold text-gray-800">{title}</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
        {time && <p className="text-[10px] text-gray-300 mt-0.5 font-mono">{time}</p>}
      </div>
    </div>
  );
}

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [revisionReason, setRevisionReason] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeInput, setShowDisputeInput] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferEmail, setTransferEmail] = useState('');
  // Mandatory Rating & Feedback Modal state (release-gate)
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [ratingHover, setRatingHover] = useState(0);
  const [pendingFinalStep, setPendingFinalStep] = useState(null);
  // Report User Modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  // Standalone Leave Feedback Modal state (mutual — for both roles)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);

  const userStr = localStorage.getItem('gv_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  const fetchOrder = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await orderAPI.getById(id);
      const data = res.data.data;
      setOrder(data);
      setMilestones(data.milestones || []);
      setRevisions(data.revisions || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!currentUser) { navigate('/auth', { replace: true }); return; }
    fetchOrder();
  }, [fetchOrder]);

  // Check if the current user has already left standalone feedback for this order
  useEffect(() => {
    if (!currentUser || !id) return;
    reviewAPI.getMyReviewForOrder(id, currentUser.UserID)
      .then(res => { if (res.data?.reviewed) setAlreadyReviewed(true); })
      .catch(() => {}); // Silently ignore errors — UI degrades gracefully
  }, [id, currentUser?.UserID]);

  const isClient = order ? order.ClientID === currentUser?.UserID : false;
  const isContributor = order ? order.ContributorID === currentUser?.UserID : false;

  //  Actions 
  const doAction = async (key, fn) => {
    setActionLoading(key);
    try { await fn(); fetchOrder(); }
    catch (e) { toast.error(e.response?.data?.message || 'Action failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleAccept = () => doAction('accept', async () => {
    await orderAPI.acceptOrder(id);
    toast.success('Order accepted! Work has begun.', { className: 'gv-toast', icon: '🚀' });
  });

  const handleDeliver = () => doAction('deliver', async () => {
    await orderAPI.deliverOrder(id);
    toast.success('Order marked as delivered!', { className: 'gv-toast', icon: '📦' });
  });

  const handleRevision = () => doAction('revision', async () => {
    await orderAPI.requestRevision(id, { reason: revisionReason || 'Revision needed' });
    toast.success('Revision requested.', { className: 'gv-toast', icon: '🔄' });
    setRevisionReason(''); setShowRevisionInput(false);
  });

  const handleRelease = () => {
    // Intercept: open rating modal instead of direct release
    setPendingFinalStep('release');
    setShowRatingModal(true);
  };

  const handleCancel = () => {
    const revCount = order?.RevisionCount || 0;
    const msg = `Cancel Order #${id}? ${revCount > 0 ? `Contributor receives ${Math.min(revCount * 10, 50)}% compensation.` : 'Full refund will be processed.'}`;
    if (!confirm(msg)) return;
    doAction('cancel', async () => {
      const res = await paymentAPI.cancelWithCompensation({ orderId: id });
      const d = res.data?.data;
      toast.success(`Cancelled. ৳${d?.clientRefund} refunded to you.`, { className: 'gv-toast', icon: '⚖️', duration: 5000 });
    });
  };

  const handleDispute = () => doAction('dispute', async () => {
    if (!disputeReason.trim()) { toast.error('Please describe the issue.', { className: 'gv-toast' }); return; }
    await paymentAPI.disputeOrder({ orderId: id, reason: disputeReason });
    toast.success('Dispute filed. Both parties notified.', { className: 'gv-toast', icon: '⚠️' });
    setDisputeReason(''); setShowDisputeInput(false);
  });

  const handleContact = async () => {
    setLoadingContact(true); setShowContactModal(true);
    try {
      const cid = isClient ? order.ContributorID : order.ClientID;
      const res = await orderAPI.getContributorContact(cid);
      setContactInfo(res.data.data);
    } catch { setContactInfo({ error: true }); }
    finally { setLoadingContact(false); }
  };

  //  Final Milestone Interception (from MilestoneEscrowTracker) 
  const handleFinalMilestoneApproval = (step) => {
    setPendingFinalStep(step);
    setShowRatingModal(true);
  };

  //  Submit Rating + Feedback → triggers final milestone or full release 
  const handleRatingSubmit = () => {
    if (ratingValue < 1 || ratingValue > 5) {
      toast.error('Please select a star rating (1-5).', { className: 'gv-toast' });
      return;
    }
    if (feedbackText.trim().length < 10) {
      toast.error('Feedback must be at least 10 characters.', { className: 'gv-toast' });
      return;
    }

    // Capture current values before any state resets
    const capturedRating   = ratingValue;
    const capturedFeedback = feedbackText.trim();
    const capturedStep     = pendingFinalStep;

    if (capturedStep === 'release') {
      // Full release path — approve final milestone atomically (backend handles escrow release + review + order completion)
      doAction('release', async () => {
        await orderAPI.approveMilestone(id, { step: 4, rating: capturedRating, feedback: capturedFeedback });
        toast.success('Payment released & review submitted!', { className: 'gv-toast', icon: '💰' });
        // Close modal only after success
        setShowRatingModal(false);
        setRatingValue(0);
        setFeedbackText('');
        setPendingFinalStep(null);
      });
    } else {
      // Milestone 4 approval path
      doAction('release', async () => {
        const res = await orderAPI.approveMilestone(id, { step: capturedStep, rating: capturedRating, feedback: capturedFeedback });
        const d = res.data?.data;
        toast.success(
          `৳${d?.releaseTaka?.toLocaleString() || '—'} released! Review submitted! 🎉`,
          { className: 'gv-toast', icon: '💰', duration: 5000 }
        );
        // Close modal only after success
        setShowRatingModal(false);
        setRatingValue(0);
        setFeedbackText('');
        setPendingFinalStep(null);
      });
    }
  };

  //  Submit Standalone Mutual Feedback (Leave Feedback button) 
  const handleFeedbackSubmit = async () => {
    if (feedbackRating < 1 || feedbackRating > 5) {
      toast.error('Please select a star rating between 1 and 5.', { className: 'gv-toast' });
      return;
    }
    if (feedbackComment.trim().length < 10) {
      toast.error('Your feedback must be at least 10 characters long.', { className: 'gv-toast' });
      return;
    }
    setFeedbackSubmitting(true);
    try {
      const revieweeId = isClient ? order.ContributorID : order.ClientID;
      await reviewAPI.submitMutualFeedback({
        order_id:    Number(id),
        reviewer_id: currentUser.UserID,
        reviewee_id: revieweeId,
        rating:      feedbackRating,
        comment:     feedbackComment.trim(),
      });
      setAlreadyReviewed(true);
      setShowFeedbackModal(false);
      setFeedbackRating(0);
      setFeedbackComment('');
      setFeedbackHover(0);
      toast.success(
        `Feedback submitted! ${feedbackRating === 5 ? '+10 PVP Points awarded to them. 🏆' : '✅'}`,
        { className: 'gv-toast', duration: 4500 }
      );
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to submit feedback. Please try again.';
      toast.error(msg, { className: 'gv-toast' });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  //  Submit Manual Report 
  const handleReportSubmit = () => {
    if (!reportReason.trim()) {
      toast.error('Please describe the reason for reporting.', { className: 'gv-toast' });
      return;
    }
    const reportedUserId = isClient ? order.ContributorID : order.ClientID;
    doAction('report', async () => {
      await reportAPI.submit({ orderId: Number(id), reportedUserId, reason: reportReason.trim() });
      toast.success('Report submitted. Our team will review it.', { className: 'gv-toast', icon: '🛡️' });
    });
    setShowReportModal(false);
    setReportReason('');
  };

  //  Computed values 
  const statusMeta  = order ? (STATUS_META[order.OrderStatus]  || { color: 'text-gray-600 bg-gray-100 border-gray-200', dot: 'bg-gray-400', label: order.OrderStatus }) : null;
  const paymentMeta = order ? (PAYMENT_META[order.PaymentStatus] || { color: 'text-gray-600 bg-gray-100', label: order.PaymentStatus }) : null;
  const hasTracker  = order && ['In_Progress', 'Delivered', 'Completed'].includes(order.OrderStatus);
  const escrowReleased = milestones.filter(m => m.Status === 'funds_released').reduce((s, m) => s + Number(m.AmountTaka || 0), 0);
  const escrowPct   = milestones.length > 0 ? Math.round((milestones.filter(m => m.Status === 'funds_released').length / milestones.length) * 100) : 0;
  const revCount    = order?.RevisionCount || 0;
  const isTerminal  = ['Completed', 'Cancelled', 'Disputed'].includes(order?.OrderStatus);

  //  Timeline events 
  const timelineEvents = order ? [
    {
      dot: 'bg-brand-400',
      title: 'Order Placed',
      subtitle: `${order.ClientName} placed this order`,
      time: new Date(order.CreatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    order.AcceptedAt && {
      dot: 'bg-blue-500',
      title: 'Order Accepted',
      subtitle: `${order.ContributorName} began work`,
      time: new Date(order.AcceptedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    },
    ...milestones.filter(m => m.Status === 'funds_released').map(m => ({
      dot: 'bg-emerald-500',
      title: `Milestone ${m.Step} Released — ৳${Number(m.AmountTaka).toLocaleString()}`,
      subtitle: m.Label,
      time: m.ApprovedAt ? new Date(m.ApprovedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : null,
    })),
    order.OrderStatus === 'Completed' && {
      dot: 'bg-green-500',
      title: 'Order Completed',
      subtitle: 'All milestones approved, funds released.',
      time: null,
    },
    order.OrderStatus === 'Cancelled' && {
      dot: 'bg-red-400',
      title: 'Order Cancelled',
      subtitle: revCount > 0 ? `${Math.min(revCount * 10, 50)}% compensation applied` : 'Full refund processed',
      time: null,
    },
  ].filter(Boolean) : [];

  //  Render 
  if (loading) return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-brand-100 animate-ping opacity-30" />
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-brand">
            <Loader2 size={24} className="text-white animate-spin" />
          </div>
        </div>
        <p className="text-gray-400 text-sm font-medium">Loading order details…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900 mb-1">Could Not Load Order</h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button onClick={() => navigate('/orders')} className="btn-secondary !text-sm">
          ← Back to Orders
        </button>
      </div>
    </div>
  );

  if (!order) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50/60 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto animate-fade-in space-y-6">

        {/* ── Breadcrumb & Header ── */}
        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
          <button onClick={() => navigate('/orders')} className="hover:text-brand-600 transition-colors flex items-center gap-1">
            <ArrowLeft size={14} /> Orders
          </button>
          <ChevronRight size={12} />
          <span className="text-gray-600">Order #{order.OrderID}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <Link to={`/gigs/${order.GigID}`} className="text-2xl sm:text-3xl font-extrabold text-gray-900 transition-colors duration-200 cursor-pointer hover:text-emerald-600">{order.GigTitle}</Link>
              <span className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${statusMeta.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot} animate-pulse`} />
                {statusMeta.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <ClipboardList size={12} /> Order #{order.OrderID}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={12} />
                {new Date(order.CreatedAt).toLocaleDateString('en-US', { dateStyle: 'long' })}
              </span>
              <span className={`font-semibold px-2 py-0.5 rounded-lg text-[11px] ${paymentMeta.color}`}>
                {paymentMeta.label}
              </span>
              <span className="flex items-center gap-1 font-semibold">
                <User size={12} />
                Your role: <strong className={isClient ? 'text-blue-600' : 'text-brand-600'}>
                  {isClient ? 'Client' : 'Contributor'}
                </strong>
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-brand-600">৳{Number(order.Amount).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Order Value</p>
          </div>
        </div>

        {/* ── KPI Stats Row ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={DollarSign}
            label="Escrow Released"
            value={`৳${escrowReleased.toLocaleString()}`}
            sub={`${escrowPct}% of total`}
            accent="emerald"
          />
          <StatCard
            icon={TrendingUp}
            label="Milestones Done"
            value={`${milestones.filter(m => m.Status === 'funds_released').length} / ${milestones.length || 4}`}
            sub="Smart escrow stages"
            accent="brand"
          />
          <StatCard
            icon={RefreshCw}
            label="Revisions"
            value={revCount.toString()}
            sub={revCount > 0 ? `${Math.min(revCount * 10, 50)}% compensation` : 'None yet'}
            accent="amber"
          />
          {order.DeliveryDeadline ? (
            <StatCard
              icon={Clock}
              label="Deadline"
              value={new Date(order.DeliveryDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              sub={new Date(order.DeliveryDeadline) < new Date() ? '⚠️ Overdue' : 'On track'}
              accent="blue"
            />
          ) : (
            <StatCard icon={Clock} label="Deadline" value="Not set" sub="Pending acceptance" accent="blue" />
          )}
        </div>

        {/* ── Work Progress Bar ── */}
        {hasTracker && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                  <TrendingUp size={14} className="text-white" />
                </div>
                <h3 className="text-sm font-extrabold text-gray-900">Work Progress</h3>
              </div>
              <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${
                escrowPct >= 100
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {escrowPct}%
              </span>
            </div>
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200/60">
              {[25, 50, 75].map(p => (
                <div key={p} className="absolute top-0 bottom-0 w-px bg-white/80 z-10" style={{ left: `${p}%` }} />
              ))}
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                  escrowPct >= 100
                    ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500'
                    : escrowPct > 0
                      ? 'bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-500'
                      : ''
                }`}
                style={{ width: `${escrowPct}%` }}
              >
                {escrowPct > 0 && escrowPct < 100 && (
                  <div className="absolute inset-0 overflow-hidden">
                    <div
                      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
                      style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {milestones.map((m, i) => {
                const isDone = m.Status === 'funds_released';
                const isAwait = m.Status === 'submitted_by_freelancer';
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 transition-all duration-500 ${
                      isDone
                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : isAwait
                          ? 'bg-amber-100 border-amber-400 text-amber-700 animate-pulse'
                          : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-[9px] font-semibold ${
                      isDone ? 'text-emerald-600' : isAwait ? 'text-amber-600' : 'text-gray-300'
                    }`}>
                      {(i + 1) * 25}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/*  Main Content Grid  */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/*  LEFT: Milestone Tracker (spans 2 cols)  */}
          <div className="lg:col-span-2 space-y-5">

            {/* Milestone Escrow Tracker */}
            {hasTracker && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200">
                      <Zap size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-gray-900">Milestone Escrow Tracker</h2>
                      <p className="text-[10px] text-gray-400 font-medium">Smart 4-stage payment release system</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-bold px-2.5 py-1 rounded-full">
                    LIVE
                  </span>
                </div>
                <div className="p-6">
                  <MilestoneEscrowTracker
                    orderId={order.OrderID}
                    currentStep={order.CurrentStep || 0}
                    milestones={milestones}
                    isContributor={isContributor}
                    isClient={isClient}
                    orderStatus={order.OrderStatus}
                    orderAmount={order.Amount}
                    onStepUpdate={() => fetchOrder()}
                    onFinalMilestoneApproval={handleFinalMilestoneApproval}
                  />
                </div>
              </div>
            )}

            {/* Pending Acceptance — no tracker yet */}
            {order.OrderStatus === 'Pending_Acceptance' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto mb-4">
                  <Clock size={28} className="text-amber-500" />
                </div>
                <h3 className="font-extrabold text-gray-900 mb-1">Waiting for Acceptance</h3>
                <p className="text-sm text-gray-400">
                  {isContributor
                    ? 'Review the order details below and accept to begin work. Milestones will activate once accepted.'
                    : 'The contributor has been notified. Milestones will appear once they accept the order.'}
                </p>
              </div>
            )}

            {/* Custom Pending */}
            {order.OrderStatus === 'Custom_Pending' && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-purple-50 border-2 border-purple-200 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={28} className="text-purple-500" />
                </div>
                <h3 className="font-extrabold text-gray-900 mb-1">Custom Offer — Awaiting Payment</h3>
                <p className="text-sm text-gray-400 mb-4">
                  The custom agreement is set. Proceed to secure payment to lock funds in escrow and activate milestones.
                </p>
                {isClient && (
                  <button onClick={() => setShowPayment(true)} className="btn-primary !text-sm">
                    <ShieldCheck size={15} /> Proceed to Payment
                  </button>
                )}
              </div>
            )}

            {/* Completed */}
            {order.OrderStatus === 'Completed' && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl border border-green-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-green-200 shrink-0">
                    <CheckCircle2 size={28} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-green-900 text-lg">Order Completed! 🎉</h3>
                    <p className="text-sm text-green-700">All milestones approved. ৳{Number(order.Amount).toLocaleString()} fully released to the contributor.</p>
                    {!['', null, undefined].includes(order.ContributorName) && (
                      <p className="text-xs text-green-600 font-semibold mt-1 inline-flex items-center gap-1">
                        <Star size={11} /> Review submitted for {order.ContributorName}
                      </p>
                    )}
                  </div>
                </div>
                {/* Leave Feedback — always visible inside the Completed banner for both roles */}
                {(isClient || isContributor) && (
                  <button
                    onClick={() => {
                      if (alreadyReviewed) {
                        toast('You have already submitted feedback for this order.', { className: 'gv-toast', icon: '⭐' });
                        return;
                      }
                      setShowFeedbackModal(true);
                    }}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      alreadyReviewed
                        ? 'bg-white/70 text-emerald-600 border-2 border-emerald-300 cursor-default'
                        : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-md shadow-amber-200 hover:shadow-lg hover:shadow-amber-300'
                    }`}
                  >
                    <Star size={15} className={alreadyReviewed ? 'fill-emerald-500' : ''} />
                    {alreadyReviewed ? 'Feedback Submitted ✓' : 'Leave Feedback'}
                  </button>
                )}
              </div>
            )}

            {/* Cancelled */}
            {order.OrderStatus === 'Cancelled' && (
              <div className="bg-red-50 rounded-3xl border border-red-200 shadow-sm p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-200 shrink-0">
                  <XCircle size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-red-900 text-lg">Order Cancelled</h3>
                  <p className="text-sm text-red-700">
                    {revCount > 0
                      ? `${Math.min(revCount * 10, 50)}% (৳${(Number(order.Amount) * Math.min(revCount * 10, 50) / 100).toLocaleString()}) was paid to the contributor as compensation.`
                      : 'Full refund has been processed.'}
                  </p>
                </div>
              </div>
            )}

            {/* Disputed */}
            {order.OrderStatus === 'Disputed' && (
              <div className="bg-orange-50 rounded-3xl border border-orange-200 shadow-sm p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200 shrink-0">
                  <AlertTriangle size={28} className="text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-orange-900 text-lg">Dispute Under Review</h3>
                  <p className="text-sm text-orange-700">A dispute has been filed on this order. Our team will review and resolve it shortly.</p>
                </div>
              </div>
            )}

            {/* Order Description */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <Info size={15} className="text-brand-500" /> Order Description
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                {order.GigDescription || 'No description available.'}
              </p>
            </div>

            {/* Revision History */}
            {revisions.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                  <RefreshCw size={15} className="text-amber-500" /> Revision History
                  <span className="text-[10px] bg-amber-50 text-amber-600 border border-amber-200 font-bold px-2 py-0.5 rounded-full ml-auto">
                    {revisions.length}
                  </span>
                </h2>
                <div className="space-y-3">
                  {revisions.map((rev, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-xs font-bold text-amber-600">
                        #{i + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800">Requested by {rev.RequestedByName}</p>
                        {rev.Reason && <p className="text-xs text-gray-500 mt-0.5">{rev.Reason}</p>}
                        <p className="text-[10px] text-gray-300 mt-1 font-mono">
                          {new Date(rev.CreatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/*  RIGHT: Action Panel + Timeline  */}
          <div className="space-y-5">

            {/* Action Panel */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Zap size={15} className="text-brand-500" /> Actions
              </h2>
              <div className="space-y-2.5">

                {/* Contributor: Accept Order */}
                {isContributor && order.OrderStatus === 'Pending_Acceptance' && (
                  <button
                    onClick={handleAccept}
                    disabled={actionLoading === 'accept'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-green-200 hover:shadow-lg hover:shadow-green-300 disabled:opacity-50"
                  >
                    {actionLoading === 'accept' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Accept Order & Start Work
                  </button>
                )}

                {/* Contributor: Mark Delivered */}
                {isContributor && order.OrderStatus === 'In_Progress' && (
                  <button
                    onClick={handleDeliver}
                    disabled={actionLoading === 'deliver'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-brand hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading === 'deliver' ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />}
                    Mark as Delivered
                  </button>
                )}

                {/* Client: Pay */}
                {isClient && (order.OrderStatus === 'Custom_Pending' || (order.OrderStatus === 'Pending_Acceptance' && order.PaymentStatus === 'Escrow_Held' && !order.transaction_id)) && (
                  <button
                    onClick={() => setShowPayment(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-brand hover:shadow-lg"
                  >
                    <ShieldCheck size={15} /> Make Escrow Payment
                  </button>
                )}

                {/* Client: Release Escrow */}
                {isClient && order.OrderStatus === 'Delivered' && (
                  <button
                    onClick={handleRelease}
                    disabled={actionLoading === 'release'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-green-200 hover:shadow-lg disabled:opacity-50"
                  >
                    {actionLoading === 'release' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    Release Full Payment
                  </button>
                )}

                {/* Client: Request Revision */}
                {isClient && (order.OrderStatus === 'Delivered' || order.OrderStatus === 'In_Progress') && (
                  <div className="space-y-2">
                    {showRevisionInput ? (
                      <>
                        <textarea
                          value={revisionReason}
                          onChange={e => setRevisionReason(e.target.value)}
                          placeholder="Describe what needs to be revised..."
                          rows={3}
                          className="input-field !text-xs !py-2.5 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleRevision} disabled={actionLoading === 'revision'}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                            {actionLoading === 'revision' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                            Submit Revision
                          </button>
                          <button onClick={() => { setShowRevisionInput(false); setRevisionReason(''); }}
                            className="px-3 py-2.5 text-gray-400 hover:bg-gray-100 rounded-xl text-xs font-bold">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => setShowRevisionInput(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-amber-200 text-amber-600 hover:bg-amber-50 rounded-2xl text-sm font-bold transition-all">
                        <RefreshCw size={15} /> Request Revision
                      </button>
                    )}
                  </div>
                )}

                {/* Client: Cancel */}
                {isClient && !isTerminal && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading === 'cancel'}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-200 text-red-500 hover:bg-red-50 rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'cancel' ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    Cancel Order
                  </button>
                )}

                {/* Either: Dispute */}
                {!isTerminal && (
                  <div className="space-y-2">
                    {showDisputeInput ? (
                      <>
                        <textarea
                          value={disputeReason}
                          onChange={e => setDisputeReason(e.target.value)}
                          placeholder="Describe the issue clearly..."
                          rows={3}
                          className="input-field !text-xs !py-2.5 resize-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleDispute} disabled={actionLoading === 'dispute'}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                            {actionLoading === 'dispute' ? <Loader2 size={13} className="animate-spin" /> : <AlertTriangle size={13} />}
                            File Dispute
                          </button>
                          <button onClick={() => { setShowDisputeInput(false); setDisputeReason(''); }}
                            className="px-3 py-2.5 text-gray-400 hover:bg-gray-100 rounded-xl text-xs font-bold">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <button onClick={() => setShowDisputeInput(true)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-orange-200 text-orange-500 hover:bg-orange-50 rounded-2xl text-sm font-bold transition-all">
                        <AlertTriangle size={15} /> Raise Dispute
                      </button>
                    )}
                  </div>
                )}



                {/* Contact counterpart */}
                <button
                  onClick={handleContact}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl text-sm font-semibold transition-all border border-gray-200"
                >
                  <MessageSquare size={15} /> Contact {isClient ? order.ContributorName : order.ClientName}
                </button>

                {/* Report User */}
                {!isTerminal && (
                  <button
                    onClick={() => setShowReportModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-red-100 text-red-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded-2xl text-sm font-bold transition-all"
                  >
                    <Flag size={15} /> Report User
                  </button>
                )}

                {/* Contributor: Transfer Order */}
                {isContributor && !isTerminal && (
                  <button
                    onClick={() => setShowTransferModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-2xl text-sm font-bold transition-all shadow-sm"
                  >
                    <RefreshCw size={15} /> Transfer Order / Refer
                  </button>
                )}

                {/* Compensation notice */}
                {revCount > 0 && isClient && !isTerminal && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 mb-1">
                      <AlertTriangle size={11} /> Compensation Active
                    </p>
                    <p className="text-[11px] text-amber-700">
                      {revCount} revision(s) → Contributor gets <strong>{Math.min(revCount * 10, 50)}%</strong> (৳{(Number(order.Amount) * Math.min(revCount * 10, 50) / 100).toLocaleString()}) if cancelled.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Parties */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-gray-900 mb-4">Parties</h2>
              <div className="space-y-3">
                <Link to={`/profile/${order.ClientID}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-extrabold text-sm shrink-0">
                    {order.ClientName?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate transition-colors duration-200 hover:text-emerald-600 font-medium">{order.ClientName}</p>
                    <p className="text-[10px] text-blue-500 font-semibold">Client</p>
                  </div>
                  <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 ml-auto shrink-0" />
                </Link>
                <Link to={`/profile/${order.ContributorID}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center text-brand-600 font-extrabold text-sm shrink-0">
                    {order.ContributorName?.[0]?.toUpperCase() || 'F'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate transition-colors duration-200 hover:text-emerald-600 font-medium">{order.ContributorName}</p>
                    <p className="text-[10px] text-brand-500 font-semibold">Contributor</p>
                  </div>
                  <ExternalLink size={12} className="text-gray-300 group-hover:text-gray-500 ml-auto shrink-0" />
                </Link>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-2">
                <Clock size={14} className="text-brand-500" /> Activity Timeline
              </h2>
              <div className="space-y-0">
                {timelineEvents.map((ev, i) => (
                  <TimelineEvent
                    key={i}
                    dot={ev.dot}
                    title={ev.title}
                    subtitle={ev.subtitle}
                    time={ev.time}
                    isLast={i === timelineEvents.length - 1}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact Modal ── */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => { setShowContactModal(false); setContactInfo(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <MessageSquare size={18} className="text-brand-500" /> Contact Info
            </h3>
            <p className="text-xs text-gray-400 mb-5">Order #{order.OrderID}</p>
            {loadingContact ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={28} className="text-brand-500 animate-spin" />
              </div>
            ) : contactInfo?.error ? (
              <div className="text-center py-6">
                <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Could not load contact info.</p>
              </div>
            ) : contactInfo ? (
              <div className="space-y-3">
                {contactInfo.WhatsAppNumber && (
                  <a href={`https://wa.me/${contactInfo.WhatsAppNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition-all group">
                    <Phone size={18} className="text-green-600 shrink-0" />
                    <div className="flex-1"><p className="text-[10px] text-gray-400">WhatsApp</p><p className="text-sm font-bold text-gray-800">{contactInfo.WhatsAppNumber}</p></div>
                    <ExternalLink size={13} className="text-green-400 group-hover:text-green-600" />
                  </a>
                )}
                {contactInfo.PersonalEmail && (
                  <a href={`mailto:${contactInfo.PersonalEmail}`}
                    className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all group">
                    <Mail size={18} className="text-blue-600 shrink-0" />
                    <div className="flex-1"><p className="text-[10px] text-gray-400">Email</p><p className="text-sm font-bold text-gray-800">{contactInfo.PersonalEmail}</p></div>
                    <ExternalLink size={13} className="text-blue-400 group-hover:text-blue-600" />
                  </a>
                )}
                {!contactInfo.WhatsAppNumber && !contactInfo.PersonalEmail && (
                  <div className="text-center py-4"><p className="text-sm text-gray-400">No contact information available.</p></div>
                )}
              </div>
            ) : null}
            <button onClick={() => { setShowContactModal(false); setContactInfo(null); }} className="btn-secondary w-full mt-5 !text-sm">Close</button>
          </div>
        </div>
      )}

      {/* ── Transfer Order Modal ── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => setShowTransferModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <RefreshCw size={18} className="text-brand-500" /> Transfer Order
            </h3>
            <p className="text-xs text-gray-400 mb-4">Refer this order to another contributor. You will lose access to it once transferred.</p>
            
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Recipient Email or User ID</label>
              <input 
                type="text" 
                value={transferEmail} 
                onChange={e => setTransferEmail(e.target.value)} 
                placeholder="Enter UIU email or User ID..."
                className="input-field !py-2.5 !text-sm mt-1"
              />
            </div>
            
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
              <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1 mb-1">
                <AlertTriangle size={11} /> Referral Bonus Note
              </p>
              <p className="text-[11px] text-amber-700">
                If the recipient successfully completes this order, you may be eligible for a referral PVP bonus.
              </p>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  doAction('transfer', async () => {
                    await orderAPI.transferOrder(id, { recipientEmail: transferEmail });
                    toast.success('Order transferred successfully!', { className: 'gv-toast', icon: '✅' });
                    setShowTransferModal(false);
                    setTransferEmail('');
                  });
                }} 
                disabled={actionLoading === 'transfer' || !transferEmail.trim()}
                className="flex-1 btn-primary !text-sm"
              >
                {actionLoading === 'transfer' ? <Loader2 size={15} className="animate-spin mr-2 inline" /> : null}
                Confirm Transfer
              </button>
              <button onClick={() => setShowTransferModal(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl text-sm font-bold transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        order={{ orderId: order.OrderID, gigTitle: order.GigTitle, amount: order.Amount }}
        onSuccess={() => {
          setShowPayment(false);
          toast.success('Payment submitted! Funds secured in escrow.', { className: 'gv-toast', icon: '✅' });
          fetchOrder();
        }}
      />

      {/* ── Mandatory Rating & Feedback Modal ── */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => { setShowRatingModal(false); setRatingValue(0); setFeedbackText(''); setPendingFinalStep(null); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-amber-200">
                <Star size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-extrabold text-gray-900">Rate & Complete Order</h3>
              <p className="text-xs text-gray-400 mt-1">Your rating and feedback are mandatory before releasing final payment.</p>
            </div>

            {/* Star Rating */}
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Your Rating</label>
              <div className="flex items-center justify-center gap-2 mt-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    onMouseEnter={() => setRatingHover(star)}
                    onMouseLeave={() => setRatingHover(0)}
                    className="transition-all duration-200 hover:scale-125 active:scale-95 focus:outline-none"
                  >
                    <Star
                      size={32}
                      className={`transition-colors duration-200 ${
                        star <= (ratingHover || ratingValue)
                          ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                          : 'text-gray-200'
                      }`}
                    />
                  </button>
                ))}
              </div>
              {ratingValue > 0 && (
                <p className="text-center text-xs font-bold text-amber-600 mt-1.5">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][ratingValue]}
                </p>
              )}
            </div>

            {/* Feedback Textarea */}
            <div className="mb-5">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Written Feedback</label>
              <textarea
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
                placeholder="Describe your experience working with this contributor (min 10 characters)..."
                rows={4}
                className="input-field !text-xs !py-2.5 resize-none mt-1"
              />
              <p className={`text-[10px] mt-1 font-medium ${
                feedbackText.trim().length >= 10 ? 'text-emerald-500' : 'text-gray-300'
              }`}>
                {feedbackText.trim().length}/10 minimum characters
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleRatingSubmit}
                disabled={ratingValue < 1 || feedbackText.trim().length < 10 || actionLoading === 'release'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-green-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'release' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                Submit & Release Payment
              </button>
              <button
                onClick={() => { setShowRatingModal(false); setRatingValue(0); setFeedbackText(''); setPendingFinalStep(null); }}
                className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-2xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Standalone Leave Feedback Modal (Mutual — Both Roles) ── */}
      {showFeedbackModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4"
          onClick={() => { setShowFeedbackModal(false); setFeedbackRating(0); setFeedbackComment(''); setFeedbackHover(0); }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-sm animate-slide-up overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/*  Modal Header  */}
            <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 p-6 text-center relative overflow-hidden">
              {/* Decorative rings */}
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-lg border border-white/30">
                  <Star size={26} className="text-white fill-white" />
                </div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Leave Feedback</h3>
                <p className="text-white/80 text-xs mt-1 font-medium">
                  Rating for <span className="font-bold text-white">{isClient ? order.ContributorName : order.ClientName}</span>
                </p>
              </div>
            </div>

            {/*  Modal Body  */}
            <div className="p-6">
              {/*  Interactive Star Rating  */}
              <div className="mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-3">
                  Select Your Rating
                </p>
                <div className="flex items-center justify-center gap-3">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedbackRating(star)}
                      onMouseEnter={() => setFeedbackHover(star)}
                      onMouseLeave={() => setFeedbackHover(0)}
                      className="focus:outline-none transition-all duration-150 hover:scale-125 active:scale-95"
                      aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                    >
                      {/* SVG Star for crisp rendering */}
                      <svg
                        width="36"
                        height="36"
                        viewBox="0 0 24 24"
                        className={`transition-all duration-200 ${
                          star <= (feedbackHover || feedbackRating)
                            ? 'drop-shadow-[0_2px_6px_rgba(251,146,60,0.7)]'
                            : ''
                        }`}
                        fill={star <= (feedbackHover || feedbackRating) ? '#F59E0B' : '#E5E7EB'}
                        stroke={star <= (feedbackHover || feedbackRating) ? '#D97706' : '#D1D5DB'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    </button>
                  ))}
                </div>
                {/* Rating label */}
                <div className="text-center mt-2 h-5">
                  {feedbackRating > 0 && (
                    <span className={`text-xs font-extrabold tracking-wide ${
                      feedbackRating === 5 ? 'text-amber-500' :
                      feedbackRating === 4 ? 'text-green-500' :
                      feedbackRating === 3 ? 'text-blue-500' :
                      feedbackRating === 2 ? 'text-orange-500' : 'text-red-500'
                    }`}>
                      {['', '😞 Poor', '😐 Fair', '🙂 Good', '😊 Great', '🌟 Excellent!'][feedbackRating]}
                    </span>
                  )}
                </div>
              </div>

              {/*  Written Feedback Textarea  */}
              <div className="mb-5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                  Written Feedback
                </label>
                <textarea
                  value={feedbackComment}
                  onChange={e => setFeedbackComment(e.target.value)}
                  placeholder={`Share your experience working with ${isClient ? order.ContributorName : order.ClientName}...`}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-100 focus:border-amber-300 focus:ring-2 focus:ring-amber-100 focus:outline-none text-xs text-gray-700 placeholder-gray-300 resize-none transition-all duration-200 bg-gray-50 focus:bg-white"
                />
                <div className="flex justify-between mt-1.5">
                  <span className={`text-[10px] font-semibold ${
                    feedbackComment.trim().length >= 10 ? 'text-emerald-500' : 'text-gray-300'
                  }`}>
                    {feedbackComment.trim().length >= 10 ? '✓ Minimum met' : `${feedbackComment.trim().length}/10 min characters`}
                  </span>
                  <span className="text-[10px] text-gray-300">{feedbackComment.length}/1000</span>
                </div>
              </div>

              {/*  Action Buttons  */}
              <div className="flex gap-2.5">
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackRating < 1 || feedbackComment.trim().length < 10 || feedbackSubmitting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white rounded-2xl text-sm font-extrabold transition-all shadow-md shadow-amber-200 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                  id="submit-feedback-btn"
                >
                  {feedbackSubmitting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <Star size={15} className="fill-white" />
                      Submit Rating
                    </>
                  )}
                </button>
                <button
                  onClick={() => { setShowFeedbackModal(false); setFeedbackRating(0); setFeedbackComment(''); setFeedbackHover(0); }}
                  disabled={feedbackSubmitting}
                  className="px-4 py-3 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-2xl text-sm font-bold transition-all border-2 border-gray-100 hover:border-gray-200"
                >
                  Cancel
                </button>
              </div>

              {/*  5-star incentive hint  */}
              {feedbackRating === 5 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                  <span className="text-amber-500 text-sm">🏆</span>
                  <p className="text-[11px] text-amber-700 font-semibold">
                    5-star rating grants <strong>+10 PVP Points</strong> to {isClient ? order.ContributorName : order.ClientName}!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/*  Manual Report User Modal  */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={() => { setShowReportModal(false); setReportReason(''); }}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full animate-slide-up border border-gray-100" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-gray-900 mb-1 flex items-center gap-2">
              <Flag size={18} className="text-red-500" /> Report User
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Report <strong className="text-gray-700">{isClient ? order.ContributorName : order.ClientName}</strong> for a dispute or violation on Order #{order.OrderID}.
            </p>
            <div className="mb-4">
              <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Reason for Report</label>
              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                className="input-field !text-xs !py-2.5 resize-none mt-1"
              />
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5">
              <p className="text-[11px] font-semibold text-red-800 flex items-center gap-1 mb-1">
                <AlertTriangle size={11} /> Important
              </p>
              <p className="text-[11px] text-red-700">
                False reports may result in account penalties. Only report genuine issues.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleReportSubmit}
                disabled={!reportReason.trim() || actionLoading === 'report'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl text-sm font-bold transition-all shadow-md shadow-red-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === 'report' ? <Loader2 size={15} className="animate-spin" /> : <Flag size={15} />}
                Submit Report
              </button>
              <button
                onClick={() => { setShowReportModal(false); setReportReason(''); }}
                className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-2xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
