// src/pages/OrderDashboard.jsx — Order Tracking + Contact Contributor
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ClipboardList, Loader2, AlertCircle, Clock, CheckCircle2, Zap, MessageSquare, Phone, Mail, ExternalLink, Send } from 'lucide-react';
import { orderAPI } from '../lib/api';

const STATUS_COLORS = {
  Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  In_Progress: 'bg-blue-50 text-blue-700 border-blue-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Cancelled: 'bg-red-50 text-red-700 border-red-200',
};
const PAYMENT_COLORS = {
  Escrow_Held: 'bg-brand-50 text-brand-700',
  Released: 'bg-green-50 text-green-700',
  Refunded: 'bg-gray-100 text-gray-600',
};

export default function OrderDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [contactInfo, setContactInfo] = useState(null);
  const [loadingContact, setLoadingContact] = useState(false);

  const userStr = localStorage.getItem('gv_user');
  const currentUser = userStr ? JSON.parse(userStr) : null;

  useEffect(() => {
    if (!currentUser) { navigate('/auth', { replace: true }); return; }
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true); setError('');
    try { const res = await orderAPI.getMyOrders(); setOrders(res.data.data || []); }
    catch { setError('Failed to load orders.'); }
    finally { setLoading(false); }
  };

  const handleContactContributor = async (order) => {
    setSelectedOrder(order); setLoadingContact(true);
    try {
      const res = await orderAPI.getContributorContact(order.ContributorID);
      setContactInfo(res.data.data);
    } catch { setContactInfo({ error: true }); }
    finally { setLoadingContact(false); }
  };

  if (loading) return (<div className="min-h-[70vh] flex items-center justify-center"><div className="flex flex-col items-center gap-3"><Loader2 size={36} className="text-brand-500 animate-spin" /><p className="text-gray-400 text-sm">Loading orders…</p></div></div>);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto animate-fade-in">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 flex items-center gap-3"><ClipboardList size={28} className="text-brand-500" /> My Orders</h1>
            <p className="text-gray-400 text-sm mt-1">Track your active and past orders</p>
          </div>
          <Link to="/home" className="btn-secondary !text-xs">Browse Gigs</Link>
        </div>

        {error && (<div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {error}</div>)}

        {orders.length === 0 ? (
          <div className="card p-12 text-center">
            <ClipboardList size={48} className="text-gray-300 mx-auto mb-4" />
            <h3 className="font-bold text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-400 text-sm mb-6">Browse gigs and place your first order to get started.</p>
            <Link to="/home" className="btn-primary !text-sm">Explore Gigs</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isClient = order.ClientID === currentUser?.UserID;
              return (
                <div key={order.OrderID} className="card p-5 sm:p-6 hover:border-brand-100 transition-all duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-gray-400">#{order.OrderID}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_COLORS[order.OrderStatus] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{order.OrderStatus?.replace('_', ' ')}</span>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${PAYMENT_COLORS[order.PaymentStatus] || 'bg-gray-50 text-gray-600'}`}>{order.PaymentStatus?.replace('_', ' ')}</span>
                      </div>
                      <Link to={`/gigs/${order.GigID}`} className="font-semibold text-gray-900 text-sm hover:text-brand-600 transition-colors">{order.GigTitle}</Link>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Clock size={12} />{new Date(order.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>Role: <strong className={isClient ? 'text-blue-600' : 'text-green-600'}>{isClient ? 'Client' : 'Contributor'}</strong></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xl font-extrabold text-brand-600">&#2547;{Number(order.Amount).toLocaleString()}</p>
                      {isClient && (
                        <button onClick={() => handleContactContributor(order)} className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl text-xs font-semibold transition-all"><MessageSquare size={14} /> Contact</button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CONTACT CONTRIBUTOR MODAL */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4" onClick={() => { setSelectedOrder(null); setContactInfo(null); }}>
            <div className="card p-6 sm:p-8 max-w-md w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2"><MessageSquare size={20} className="text-brand-500" /> Contact Contributor</h3>
              <p className="text-xs text-gray-400 mb-6">Order #{selectedOrder.OrderID} — {selectedOrder.GigTitle}</p>

              {loadingContact ? (
                <div className="flex items-center justify-center py-8"><Loader2 size={24} className="text-brand-500 animate-spin" /></div>
              ) : contactInfo?.error ? (
                <div className="text-center py-6"><AlertCircle size={32} className="text-red-400 mx-auto mb-2" /><p className="text-sm text-gray-500">Could not load contact info.</p></div>
              ) : contactInfo ? (
                <div className="space-y-4">
                  {contactInfo.WhatsAppNumber && (
                    <a href={`https://wa.me/${contactInfo.WhatsAppNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-all group">
                      <Phone size={20} className="text-green-600 shrink-0" />
                      <div className="flex-1"><p className="text-xs text-gray-400 font-medium">WhatsApp</p><p className="text-sm font-semibold text-gray-800">{contactInfo.WhatsAppNumber}</p></div>
                      <ExternalLink size={14} className="text-green-400 group-hover:text-green-600" />
                    </a>
                  )}
                  {contactInfo.PersonalEmail && (
                    <a href={`mailto:${contactInfo.PersonalEmail}`} className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-all group">
                      <Mail size={20} className="text-blue-600 shrink-0" />
                      <div className="flex-1"><p className="text-xs text-gray-400 font-medium">Personal Email</p><p className="text-sm font-semibold text-gray-800">{contactInfo.PersonalEmail}</p></div>
                      <ExternalLink size={14} className="text-blue-400 group-hover:text-blue-600" />
                    </a>
                  )}
                  {!contactInfo.WhatsAppNumber && !contactInfo.PersonalEmail && (
                    <div className="text-center py-4"><p className="text-sm text-gray-400">No contact information available.</p></div>
                  )}

                  {/* IN-APP MESSAGING PLACEHOLDER */}
                  <div className="border-t border-gray-100 pt-4 mt-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3 flex items-center gap-2"><Send size={12} /> In-App Messaging <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full font-medium normal-case">Coming Soon</span></h4>
                    <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-200">
                      <div className="flex gap-2"><input type="text" disabled placeholder="Type a message…" className="input-field flex-1 !bg-white opacity-50" /><button disabled className="btn-primary !py-2 !px-4 !text-xs opacity-50">Send</button></div>
                      <p className="text-[10px] text-gray-400 mt-2">Real-time messaging will be available in a future update.</p>
                    </div>
                  </div>
                </div>
              ) : null}

              <button onClick={() => { setSelectedOrder(null); setContactInfo(null); }} className="btn-secondary w-full mt-6 !text-sm">Close</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
