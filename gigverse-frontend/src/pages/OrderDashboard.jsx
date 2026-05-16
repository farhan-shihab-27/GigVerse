// src/pages/OrderDashboard.jsx — Smart Order Dashboard with 4-Step Tracker
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList, Loader2, AlertCircle, Clock, CheckCircle2, Zap,
  MessageSquare, Phone, Mail, ExternalLink, Send, ShieldCheck,
  XCircle, AlertTriangle, ChevronDown, ChevronUp, Package, RefreshCw
} from 'lucide-react';
import { orderAPI, paymentAPI } from '../lib/api';
import OrderTracker from '../components/OrderTracker';
import PaymentGatewayModal from '../components/PaymentGatewayModal';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  Pending_Acceptance: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  In_Progress: 'bg-blue-50 text-blue-700 border-blue-200',
  Delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
  Disputed: 'bg-orange-50 text-orange-700 border-orange-200',
  Custom_Pending: 'bg-purple-50 text-purple-700 border-purple-200',
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
};
const PAYMENT_COLORS = {
  Escrow_Held: 'bg-brand-50 text-brand-700',
  In_Escrow: 'bg-blue-50 text-blue-700',
  Released: 'bg-green-50 text-green-700',
  Refunded: 'bg-gray-100 text-gray-600',
  Partially_Refunded: 'bg-amber-50 text-amber-700',
  Pending: 'bg-yellow-50 text-yellow-600',
};
const TABS = ['All Orders', 'As Client', 'As Contributor'];

export default function OrderDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('All Orders');
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(null);

  const userStr = localStorage.getItem('gv_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!currentUser) { navigate('/auth', { replace: true }); return; }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true); setError('');
    try {
      const res = await orderAPI.getMyOrders();
      setOrders(res.data.data || []);
    } catch { setError('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  const filtered = orders.filter(o => {
    if (activeTab === 'As Client') return o.ClientID === currentUser?.UserID;
    if (activeTab === 'As Contributor') return o.ContributorID === currentUser?.UserID;
    return true;
  });

  const isClient = (o) => o.ClientID === currentUser?.UserID;
  const isContributor = (o) => o.ContributorID === currentUser?.UserID;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await orderAPI.acceptOrder(id);
      toast.success('Order accepted! Work has begun.', { className: 'gv-toast', icon: '🚀' });
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleDeliver = async (id) => {
    setActionLoading(id);
    try {
      await orderAPI.deliverOrder(id);
      toast.success('Order delivered! Awaiting client review.', { className: 'gv-toast', icon: '📦' });
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleRevision = async (id) => {
    setActionLoading(id);
    try {
      const res = await orderAPI.requestRevision(id, { reason: revisionReason || 'Revision needed' });
      toast.success(res.data?.message || 'Revision requested.', { className: 'gv-toast', icon: '🔄' });
      setRevisionReason('');
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleRelease = async (id) => {
    setActionLoading(id);
    try {
      await paymentAPI.releaseEscrow({ orderId: id });
      toast.success('Payment released to contributor!', { className: 'gv-toast', icon: '💰' });
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleCancel = async (id) => {
    setActionLoading(id);
    try {
      const res = await paymentAPI.cancelWithCompensation({ orderId: id });
      const d = res.data?.data;
      toast.success(`Cancelled. Contributor gets ৳${d?.contributorCompensation} (${d?.compensationPercent}%), you get ৳${d?.clientRefund} back.`, { className: 'gv-toast', icon: '⚖️', duration: 5000 });
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleDispute = async (id) => {
    if (!disputeReason.trim()) { toast.error('Please provide a reason.', { className: 'gv-toast' }); return; }
    setActionLoading(id);
    try {
      await paymentAPI.disputeOrder({ orderId: id, reason: disputeReason });
      toast.success('Dispute filed. Both parties notified.', { className: 'gv-toast', icon: '⚠️' });
      setShowDisputeForm(null); setDisputeReason('');
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed.', { className: 'gv-toast' }); }
    finally { setActionLoading(null); }
  };

  const handleContact = async (order) => {
    setSelectedOrder(order); setLoadingContact(true);
    try {
      const cid = isClient(order) ? order.ContributorID : order.ClientID;
      const res = await orderAPI.getContributorContact(cid);
      setContactInfo(res.data.data);
    } catch { setContactInfo({ error: true }); }
    finally { setLoadingContact(false); }
  };

  const openPayment = (order) => {
    setPaymentOrder({ orderId: order.OrderID, gigTitle: order.GigTitle, amount: order.Amount });
    setShowPayment(true);
  };

  if (loading) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="text-brand-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading orders...</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">

      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3">
              <ClipboardList size={28} className="text-brand-500" /> My Orders
            </h1>
            <p className="text-gray-400 text-sm mt-1">Track, manage, and review your orders</p>
          </div>
          <Link to="/home" className="btn-secondary !text-xs">Browse Gigs</Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                activeTab === tab ? 'bg-white text-brand-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>{tab}</button>
          ))}
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-400 text-sm mb-6">
              {activeTab !== 'All Orders' ? `No orders found for "${activeTab}" filter.` : 'Browse gigs and place your first order.'}
            </p>
            <Link to="/home" className="btn-primary !text-sm">Explore Gigs</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((order) => {
              const client = isClient(order);
              const contributor = isContributor(order);
              const expanded = expandedId === order.OrderID;
              const isLoading = actionLoading === order.OrderID;
              const hasTracker = ['In_Progress', 'Delivered', 'Completed'].includes(order.OrderStatus);
              const revCount = order.RevisionCount || 0;

              return (
                <div key={order.OrderID}
                  className={`card overflow-hidden transition-all duration-300 ${expanded ? 'shadow-lg border-brand-200' : ''}`}>
                  {/* ── Order Header ── */}
                  <div className="p-5 sm:p-6 cursor-pointer" onClick={() => setExpandedId(expanded ? null : order.OrderID)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className="text-xs font-bold text-gray-400">#{order.OrderID}</span>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.OrderStatus] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {(order.OrderStatus || '').replace(/_/g, ' ')}
                          </span>
                          <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${PAYMENT_COLORS[order.PaymentStatus] || 'bg-gray-50 text-gray-600'}`}>
                            {(order.PaymentStatus || '').replace(/_/g, ' ')}
                          </span>
                          {revCount > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
                              {revCount} revision{revCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <Link to={`/gigs/${order.GigID}`} onClick={e => e.stopPropagation()}
                          className="font-semibold text-gray-900 text-sm hover:text-brand-600 transition-colors">
                          {order.GigTitle}
                        </Link>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(order.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span>Role: <strong className={client ? 'text-blue-600' : 'text-green-600'}>{client ? 'Client' : 'Contributor'}</strong></span>
                          <span>With: <strong className="text-gray-700">{client ? order.ContributorName : order.ClientName}</strong></span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <p className="text-xl font-extrabold text-brand-600">&#2547;{Number(order.Amount).toLocaleString()}</p>
                        {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {/* ── Expanded Detail Panel ── */}
                  {expanded && (
                    <div className="border-t border-gray-100 bg-gray-50/50 p-5 sm:p-6 space-y-5 animate-fade-in">

                      {/* 4-Step Tracker */}
                      {hasTracker && (
                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                          <OrderTracker
                            orderId={order.OrderID}
                            currentStep={order.CurrentStep || 0}
                            milestones={order.milestones || []}
                            isContributor={contributor}
                            isClient={client}
                            orderStatus={order.OrderStatus}
                            orderAmount={order.Amount}
                            onStepUpdate={() => fetchOrders()}
                          />
                        </div>
                      )}

                      {/* Deadline info */}
                      {order.DeliveryDeadline && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
                          <Clock size={13} className="text-brand-500" />
                          <span>Delivery deadline: <strong className="text-gray-700">{new Date(order.DeliveryDeadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                        </div>
                      )}

                      {/* Compensation preview for in-progress/delivered orders */}
                      {revCount > 0 && client && order.OrderStatus !== 'Completed' && order.OrderStatus !== 'Cancelled' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                          <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                            <AlertTriangle size={13} /> Compensation Notice
                          </p>
                          <p className="text-xs text-amber-700">
                            {revCount} revision(s) logged. If you cancel now, the contributor receives <strong>{Math.min(revCount * 10, 50)}%</strong> (&#2547;{(Number(order.Amount) * Math.min(revCount * 10, 50) / 100).toLocaleString()}) for work completed.
                          </p>
                        </div>
                      )}

                      {/* ── Action Buttons ── */}
                      <div className="flex flex-wrap gap-2">
                        {/* Contributor: Accept */}
                        {contributor && order.OrderStatus === 'Pending_Acceptance' && (
                          <button onClick={() => handleAccept(order.OrderID)} disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Accept Order
                          </button>
                        )}

                        {/* Contributor: Deliver */}
                        {contributor && order.OrderStatus === 'In_Progress' && (
                          <button onClick={() => handleDeliver(order.OrderID)} disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Package size={13} />} Mark Delivered
                          </button>
                        )}

                        {/* Client: Pay (Custom_Pending or Pending escrow) */}
                        {client && (order.OrderStatus === 'Custom_Pending' || (order.OrderStatus === 'Pending_Acceptance' && order.PaymentStatus === 'Escrow_Held' && !order.transaction_id)) && (
                          <button onClick={() => openPayment(order)}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
                            <ShieldCheck size={13} /> Make Payment
                          </button>
                        )}

                        {/* Client: Release Escrow */}
                        {client && order.OrderStatus === 'Delivered' && (
                          <button onClick={() => handleRelease(order.OrderID)} disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Release Payment
                          </button>
                        )}

                        {/* Client: Request Revision */}
                        {client && (order.OrderStatus === 'Delivered' || order.OrderStatus === 'In_Progress') && (
                          <div className="flex items-center gap-2">
                            <input value={revisionReason} onChange={e => setRevisionReason(e.target.value)}
                              placeholder="Revision reason..." className="input-field !py-2 !text-xs !rounded-lg w-40" />
                            <button onClick={() => handleRevision(order.OrderID)} disabled={isLoading}
                              className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                              {isLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Revise
                            </button>
                          </div>
                        )}

                        {/* Client: Cancel with Compensation */}
                        {client && !['Completed', 'Cancelled', 'Disputed'].includes(order.OrderStatus) && (
                          <button onClick={() => { if (confirm(`Cancel order #${order.OrderID}? ${revCount > 0 ? `Contributor gets ${Math.min(revCount * 10, 50)}% compensation.` : 'Full refund.'}`)) handleCancel(order.OrderID); }}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />} Cancel Order
                          </button>
                        )}

                        {/* Either: Dispute */}
                        {!['Completed', 'Cancelled', 'Disputed'].includes(order.OrderStatus) && (
                          <>
                            {showDisputeForm === order.OrderID ? (
                              <div className="flex items-center gap-2 w-full mt-2">
                                <input value={disputeReason} onChange={e => setDisputeReason(e.target.value)}
                                  placeholder="Describe the issue..." className="input-field !py-2 !text-xs !rounded-lg flex-1" />
                                <button onClick={() => handleDispute(order.OrderID)} disabled={isLoading}
                                  className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50">
                                  {isLoading ? <Loader2 size={13} className="animate-spin" /> : 'Submit'}
                                </button>
                                <button onClick={() => { setShowDisputeForm(null); setDisputeReason(''); }}
                                  className="px-3 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl text-xs font-bold">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setShowDisputeForm(order.OrderID)}
                                className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-orange-200 text-orange-500 hover:bg-orange-50 rounded-xl text-xs font-bold transition-all">
                                <AlertTriangle size={13} /> Raise Dispute
                              </button>
                            )}
                          </>
                        )}

                        {/* Contact */}
                        <button onClick={() => handleContact(order)}
                          className="flex items-center gap-1.5 px-3 py-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl text-xs font-semibold transition-all ml-auto">
                          <MessageSquare size={13} /> Contact
                        </button>
                      </div>

                      {/* Completed badge */}
                      {order.OrderStatus === 'Completed' && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600 bg-green-50 rounded-xl p-4 border border-green-200">
                          <CheckCircle2 size={18} /> Order completed. Payment released.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Contact Modal ── */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => { setSelectedOrder(null); setContactInfo(null); }}>
            <div className="card p-6 sm:p-8 max-w-md w-full animate-slide-up" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                <MessageSquare size={20} className="text-brand-500" /> Contact
              </h3>
              <p className="text-xs text-gray-400 mb-6">Order #{selectedOrder.OrderID} — {selectedOrder.GigTitle}</p>
              {loadingContact ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={24} className="text-brand-500 animate-spin" /></div>
              ) : contactInfo?.error ? (
                <div className="text-center py-6"><AlertCircle size={32} className="text-red-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Could not load contact info.</p></div>
              ) : contactInfo ? (
                <div className="space-y-4">
                  {contactInfo.WhatsAppNumber && (
                    <a href={`https://wa.me/${contactInfo.WhatsAppNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-all group">
                      <Phone size={20} className="text-green-600 shrink-0" />
                      <div className="flex-1"><p className="text-xs text-gray-400 font-medium">WhatsApp</p><p className="text-sm font-semibold text-gray-800">{contactInfo.WhatsAppNumber}</p></div>
                      <ExternalLink size={14} className="text-green-400 group-hover:text-green-600" />
                    </a>
                  )}
                  {contactInfo.PersonalEmail && (
                    <a href={`mailto:${contactInfo.PersonalEmail}`}
                      className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all group">
                      <Mail size={20} className="text-blue-600 shrink-0" />
                      <div className="flex-1"><p className="text-xs text-gray-400 font-medium">Email</p><p className="text-sm font-semibold text-gray-800">{contactInfo.PersonalEmail}</p></div>
                      <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600" />
                    </a>
                  )}
                  {!contactInfo.WhatsAppNumber && !contactInfo.PersonalEmail && (
                    <div className="text-center py-4"><p className="text-sm text-gray-400">No contact information available.</p></div>
                  )}
                </div>
              ) : null}
              <button onClick={() => { setSelectedOrder(null); setContactInfo(null); }} className="btn-secondary w-full mt-6 !text-sm">Close</button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Gateway Modal */}
      <PaymentGatewayModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        order={paymentOrder}
        onSuccess={() => { setShowPayment(false); toast.success('Payment submitted!', { className: 'gv-toast', icon: '✅' }); fetchOrders(); }}
      />
    </main>
  );
}
