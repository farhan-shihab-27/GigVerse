// src/pages/GigDetails.jsx — Single Gig View + Premium Escrow Payment Gateway
// Updated: "Contact for Custom Work" now opens Gmail Web Compose (fixes Outlook bug)
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Zap, Star, Clock, ShieldCheck, AlertCircle, CheckCircle2, ArrowLeft, Loader2, Mail } from 'lucide-react';
import { gigAPI, orderAPI } from '../lib/api';
import PaymentGatewayModal from '../components/PaymentGatewayModal';

export default function GigDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [orderError, setOrderError] = useState('');

  // Payment Gateway Modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState(null);

  useEffect(() => { fetchGig(); }, [id]);

  const fetchGig = async () => {
    setLoading(true); setError('');
    try { const res = await gigAPI.getById(id); setGig(res.data.data); }
    catch { setError('Failed to load gig details.'); }
    finally { setLoading(false); }
  };

  // Step 1: Create the order, then open payment modal
  const handleCheckout = async () => {
    if (!localStorage.getItem('gv_token')) { navigate('/auth'); return; }
    const user = JSON.parse(localStorage.getItem('gv_user') || '{}');
    if (!user.UserID) { navigate('/auth'); return; }

    setOrdering(true); setOrderError(''); setOrderSuccess('');
    try {
      const res = await orderAPI.create({ clientId: user.UserID, gigId: Number(id) });
      const newOrderId = res.data?.data?.orderId;
      setCreatedOrderId(newOrderId);
      setShowPaymentModal(true);
    } catch (err) {
      setOrderError(err.response?.data?.message || 'Failed to create order.');
    } finally {
      setOrdering(false);
    }
  };

  // Step 2: Payment completed successfully
  const handlePaymentSuccess = () => {
    setOrderSuccess('Order placed successfully! Payment is held in secure escrow.');
    setShowPaymentModal(false);
  };

  // ── Build Gmail Web Compose URL (bypasses broken native Outlook on Windows) ──
  const buildGmailComposeUrl = () => {
    if (!gig) return '#';

    let clientName = 'A GigVerse Client';
    try {
      const stored = JSON.parse(localStorage.getItem('gv_user') || '{}');
      if (stored.Name) clientName = stored.Name;
    } catch { /* fallback */ }

    const contributorName = gig.ContributorName || 'Contributor';
    const contributorEmail = gig.UiuEmail || '';

    // Use Vite env variable for production-safe URL; fallback to current origin
    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

    const subject = `[GigVerse Custom Project Request] - ${clientName}`;
    const body = `Dear ${contributorName},\n\nI recently viewed your profile on GigVerse and am very impressed with your offerings. I would like to initiate a conversation for a customized project with you.\n\nPlease click this link to access our secure workspace and accept the conversation request: ${frontendUrl}/dashboard/messages?initiate=true\n\nBest regards,\n${clientName}`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contributorEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleContactCustomWork = () => {
    if (!localStorage.getItem('gv_token')) { navigate('/auth'); return; }
    // Open Gmail Web Compose in a new tab
    window.open(buildGmailComposeUrl(), '_blank', 'noopener,noreferrer');
  };

  if (loading) return (<div className="min-h-[70vh] flex items-center justify-center"><Loader2 size={36} className="text-brand-500 animate-spin" /></div>);
  if (error || !gig) return (<div className="min-h-[70vh] flex items-center justify-center"><div className="text-center"><AlertCircle size={48} className="text-red-400 mx-auto mb-3" /><p className="text-gray-600">{error || 'Gig not found.'}</p><Link to="/home" className="btn-secondary mt-4 inline-flex">Back to Home</Link></div></div>);

  const initials = gig.ContributorName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const createdAt = new Date(gig.CreatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <Link to="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"><ArrowLeft size={16} /> Back to Gigs</Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT: GIG DETAILS */}
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6 sm:p-8">
                <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full mb-4">{gig.DeptName || 'Campus'}</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4">{gig.Title}</h1>
                <div className="flex items-center gap-4 mb-6 text-sm text-gray-500">
                  {gig.AverageRating > 0 && <div className="flex items-center gap-1"><Star size={14} className="text-amber-400 fill-amber-400" /><span className="font-semibold text-gray-800">{Number(gig.AverageRating).toFixed(1)}</span></div>}
                  <div className="flex items-center gap-1"><Clock size={14} />{createdAt}</div>
                </div>
                <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed">
                  <h3 className="text-base font-bold text-gray-900 mb-2">About This Gig</h3>
                  <p>{gig.Description || 'No description provided for this gig.'}</p>
                </div>
              </div>

              {/* CONTRIBUTOR INFO */}
              <div className="card p-6">
                <h3 className="text-sm font-bold text-gray-800 mb-4">About the Contributor</h3>
                <div className="flex items-center gap-4">
                  <Link to={`/profile/${gig.ContributorID}`} className="w-14 h-14 bg-brand-gradient rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shrink-0 hover:opacity-90 transition-opacity">{initials}</Link>
                  <div className="flex-1">
                    <Link to={`/profile/${gig.ContributorID}`} className="font-bold text-gray-900 hover:text-[#f26522] transition-colors">{gig.ContributorName}</Link>
                    <p className="text-xs text-gray-500">{gig.UiuEmail}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1 bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full text-xs font-semibold"><Zap size={11} className="fill-brand-500" />{gig.PVP_Points} PVP</span>
                      {gig.AverageRating > 0 && <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-semibold"><Star size={11} className="fill-amber-400" />{Number(gig.AverageRating).toFixed(1)}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: ORDER SIDEBAR */}
            <div className="lg:col-span-1">
              <div className="card p-6 sticky top-24">
                <div className="text-center mb-6">
                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mb-1">Starting at</p>
                  <p className="text-4xl font-extrabold text-brand-600">&#2547;{Number(gig.BasePrice).toLocaleString()}</p>
                </div>

                {orderSuccess && (<div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2"><CheckCircle2 size={16} className="shrink-0" />{orderSuccess}</div>)}
                {orderError && (<div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} className="shrink-0" />{orderError}</div>)}

                <button
                  id="place-order-btn"
                  onClick={handleCheckout}
                  disabled={ordering || !!orderSuccess}
                  className="btn-primary w-full !py-3.5 text-sm disabled:opacity-60 disabled:cursor-not-allowed mb-4"
                >
                  {ordering ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating Order…</span>
                  ) : orderSuccess ? (
                    <span className="flex items-center gap-2"><CheckCircle2 size={15} /> Order Placed</span>
                  ) : (
                    <span className="flex items-center gap-2"><ShieldCheck size={15} /> Continue to Checkout</span>
                  )}
                </button>

                <button
                  onClick={handleContactCustomWork}
                  className="w-full !py-3.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 text-white shadow-lg mb-4 hover:opacity-90"
                  style={{ backgroundColor: '#f26522' }}
                >
                  <Mail size={16} /> Contact for Custom Work
                </button>

                {orderSuccess && <Link to="/orders" className="btn-secondary w-full !py-2.5 text-sm text-center block">View My Orders</Link>}

                <div className="mt-6 space-y-3 text-xs text-gray-500">
                  <div className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500 shrink-0" />Payment held in secure escrow</div>
                  <div className="flex items-center gap-2"><Clock size={14} className="text-brand-500 shrink-0" />Delivery timeline set after order</div>
                  <div className="flex items-center gap-2"><Star size={14} className="text-amber-400 shrink-0" />Review the contributor after delivery</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Premium Payment Gateway Modal ── */}
      <PaymentGatewayModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        order={createdOrderId ? {
          orderId: createdOrderId,
          gigTitle: gig.Title,
          amount: gig.BasePrice,
        } : null}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
