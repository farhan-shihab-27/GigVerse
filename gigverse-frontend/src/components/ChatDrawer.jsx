// src/components/ChatDrawer.jsx — Premium Amber Messaging + Full-Screen + Media
// Slide-in drawer: soft amber palette, voice recording, camera, file attach, proposals.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, MessageSquare, Loader2, ChevronLeft, FileText,
  DollarSign, Clock, CheckCircle2, User, Zap, XCircle,
  Mic, MicOff, Camera, FolderOpen, Phone, Video, MoreVertical,
  Smile, Paperclip, StopCircle, Maximize2, Minimize2, Play, Square,
  PhoneOff, Shield, Sparkles, Star
} from 'lucide-react';
import { messageAPI, orderAPI, reviewAPI } from '../lib/api';
import toast from 'react-hot-toast';

// Inline Review Card — renders after order completion 
/**
 * Premium 5-star rating + feedback panel rendered between the chat messages area
 * and the input bar. Only visible when:
 *   - Current user is the CLIENT of the order
 *   - Order status is Completed
 *   - No review has been submitted yet for this order
 */
function InlineReviewCard({ order, reviewerId, onSubmitted }) {
  const [hover, setHover]       = useState(0);
  const [rating, setRating]     = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const handleSubmit = async () => {
    if (rating < 1) {
      toast.error('Please select a star rating before submitting.', { className: 'gv-toast' });
      return;
    }
    if (feedback.trim().length < 10) {
      toast.error('Please write at least 10 characters of feedback.', { className: 'gv-toast' });
      return;
    }
    setSubmitting(true);
    try {
      await reviewAPI.create({
        orderId:    order.OrderID,
        reviewerId: Number(reviewerId),
        rating:     rating,
        comment:    feedback.trim(),
      });
      toast.success(
        rating === 5
          ? '⭐ Review submitted! +10 PVP Points awarded to the contributor!'
          : '✅ Review submitted successfully! Thank you for your feedback.',
        { className: 'gv-toast', duration: 5000 }
      );
      setSubmitted(true);
      setTimeout(() => onSubmitted(), 2500); // hide panel after thank-you message
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit review.';
      // 409 = already reviewed — silently dismiss
      if (err.response?.status === 409) {
        toast.success('You have already reviewed this order.', { className: 'gv-toast' });
        onSubmitted();
        return;
      }
      toast.error(msg, { className: 'gv-toast' });
    } finally {
      setSubmitting(false);
    }
  };

  const starLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent ⭐'];
  const display    = hover || rating;

  // Submitted thank-you state
  if (submitted) {
    return (
      <div className="px-4 py-4 bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border-t-2 border-emerald-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-md shrink-0">
            <CheckCircle2 size={20} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-emerald-800">Thank You for Your Review!</p>
            <p className="text-xs text-emerald-600 mt-0.5">Your {rating}-star rating has been saved. This helps the GigVerse community.</p>
          </div>
          <div className="ml-auto flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <svg key={s} width="14" height="14" viewBox="0 0 24 24"
                fill={s <= rating ? '#10b981' : 'none'} stroke={s <= rating ? '#10b981' : '#d1d5db'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0" style={{ background: 'linear-gradient(to bottom, #fffbeb, #fff7ed)' }}>
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

      <div className="px-4 pt-4 pb-3">
        {/* Header row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-200 shrink-0">
            <Star size={16} className="text-white fill-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-gray-900 leading-tight">Rate Your Experience</p>
            <p className="text-[10px] text-gray-500 font-medium truncate">
              Order #{order.OrderID}{order.GigTitle ? ` — ${order.GigTitle}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 shrink-0">
            <CheckCircle2 size={10} className="text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Order Completed</span>
          </div>
        </div>

        {/* 5-star interactive row */}
        <div className="flex items-center justify-center gap-2 mb-1">
          {[1,2,3,4,5].map(s => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              disabled={submitting}
              className="transition-all duration-100 hover:scale-125 active:scale-95 focus:outline-none disabled:cursor-not-allowed"
              title={starLabels[s]}
            >
              <svg
                width="36" height="36" viewBox="0 0 24 24"
                fill={s <= display ? '#f59e0b' : 'none'}
                stroke={s <= display ? '#f59e0b' : '#d1d5db'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  filter: s <= display ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.55))' : 'none',
                  transition: 'all 0.15s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: s <= display ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>

        {/* Star label */}
        <p className={`text-center text-xs font-bold mb-3 h-4 transition-all duration-200 ${
          display > 0 ? 'text-amber-600' : 'text-gray-300'
        }`}>
          {display > 0 ? starLabels[display] : 'Tap a star to rate'}
        </p>

        {/* Feedback textarea */}
        <div className="relative mb-3">
          <textarea
            rows={2}
            value={feedback}
            maxLength={200}
            onChange={e => setFeedback(e.target.value)}
            placeholder="Share your experience with this contributor… (min. 10 characters)"
            disabled={submitting}
            className="w-full rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none resize-none transition-all duration-200 hover:border-amber-300 leading-relaxed"
          />
          <span className={`absolute bottom-2 right-3 text-[9px] font-bold transition-colors ${
            feedback.length >= 10 ? 'text-emerald-500' : 'text-gray-300'
          }`}>
            {feedback.length}/200
          </span>
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || rating === 0}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all duration-300 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-amber-300/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
          style={{
            background: rating > 0
              ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              : 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
            color: rating > 0 ? 'white' : '#9ca3af',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? (
            <><Loader2 size={13} className="animate-spin" /> Submitting your review…</>
          ) : (
            <><Star size={13} className={rating > 0 ? 'fill-white' : ''} /> Submit Review & Rating</>
          )}
        </button>

        {/* 5-star bonus hint */}
        {rating === 5 && (
          <p className="text-center text-[10px] text-amber-600 font-bold mt-2 animate-pulse">
            ⭐ A 5-star review awards +10 PVP Points to your contributor!
          </p>
        )}

        {/* Minimum validation hint */}
        {rating > 0 && feedback.length > 0 && feedback.length < 10 && (
          <p className="text-center text-[10px] text-red-400 font-semibold mt-1.5">
            Please write at least {10 - feedback.length} more character{10 - feedback.length !== 1 ? 's' : ''}.
          </p>
        )}
      </div>
    </div>
  );
}


// Parse message content — returns { type, text, ...proposal }
function parseContent(content) {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type) return parsed;
  } catch { /* not JSON, regular text message */ }
  return { type: 'text', text: content };
}

// Proposal Card (rendered inside chat bubble)
function ProposalCard({ proposal, messageId, isMine, onAccept, onDecline, accepting }) {
  const isAccepted  = proposal.status === 'accepted';
  const isDeclined  = proposal.status === 'declined';

  return (
    <div className={`relative rounded-2xl p-5 space-y-4 transition-all duration-500 overflow-hidden ${
      isAccepted
        ? 'bg-gradient-to-br from-emerald-900/80 to-emerald-800/60 backdrop-blur-md ring-1 ring-emerald-400/50 shadow-[0_0_20px_rgba(16,185,129,0.25)]'
        : isDeclined
        ? 'bg-gradient-to-br from-red-900/40 to-red-800/30 backdrop-blur-md ring-1 ring-red-400/30 opacity-70'
        : 'bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-md ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
    }`}>
      {/* Decorative glow orb */}
      <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-40 ${
        isAccepted ? 'bg-emerald-400' : isDeclined ? 'bg-red-400' : 'bg-amber-400'
      }`} />

      <div className="relative flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          isAccepted ? 'bg-emerald-500/20 ring-1 ring-emerald-400/30' : isDeclined ? 'bg-red-500/20 ring-1 ring-red-400/30' : 'bg-amber-500/20 ring-1 ring-amber-400/30'
        }`}>
          {isAccepted ? <Shield size={14} className="text-emerald-400" /> : isDeclined ? <XCircle size={14} className="text-red-400" /> : <Sparkles size={14} className="text-amber-400" />}
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.15em] ${
          isAccepted ? 'text-emerald-300' : isDeclined ? 'text-red-300' : 'text-amber-300'
        }`}>
          {isAccepted ? 'Deal Confirmed' : isDeclined ? 'Proposal Declined' : 'Custom Proposal'}
        </span>
      </div>

      <p className="relative text-sm text-white/90 font-medium leading-relaxed">{proposal.description}</p>

      <div className="relative flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <DollarSign size={14} className="text-amber-400" />
          <span className="text-base font-extrabold text-white">৳{Number(proposal.price).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-300">{proposal.deliveryDays} day{proposal.deliveryDays > 1 ? 's' : ''} delivery</span>
        </div>
      </div>

      {isAccepted ? (
        <div className="relative flex items-center gap-2 text-xs font-bold text-emerald-300 bg-emerald-500/15 backdrop-blur-sm rounded-xl px-4 py-3 ring-1 ring-emerald-400/20">
          <CheckCircle2 size={14} /> Accepted — Order #{proposal.orderId} created
        </div>
      ) : isDeclined ? (
        <div className="relative flex items-center gap-2 text-xs font-bold text-red-300 bg-red-500/15 backdrop-blur-sm rounded-xl px-4 py-3 ring-1 ring-red-400/20">
          <XCircle size={14} /> This proposal was declined
        </div>
      ) : !isMine ? (
        <div className="relative flex gap-2 pt-1">
          <button onClick={() => onAccept(messageId)} disabled={accepting}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-gray-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:shadow-[0_0_30px_rgba(245,158,11,0.6)] transition-all duration-300 disabled:opacity-60 proposal-accept-glow">
            {accepting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Accept & Confirm Order
          </button>
          <button onClick={() => onDecline(messageId)} disabled={accepting}
            className="px-4 py-3.5 rounded-xl text-sm font-bold text-red-300 border border-red-500/30 hover:bg-red-500/10 backdrop-blur-sm transition-all duration-300 disabled:opacity-60">
            Decline
          </button>
        </div>
      ) : (
        <div className="relative text-xs text-gray-400 italic text-center py-1">Waiting for client to respond...</div>
      )}
    </div>
  );
}

// System Message Card
function SystemMessage({ data }) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 max-w-[85%] text-center">
        <p className="text-xs font-semibold text-green-700 flex items-center justify-center gap-1.5">
          <CheckCircle2 size={12} /> {data.text}
        </p>
      </div>
    </div>
  );
}

// Main ChatDrawer Component
export default function ChatDrawer({ isOpen, onClose, targetUser = null, onUnreadChange }) {
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [msgInput, setMsgInput]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [sending, setSending]             = useState(false);
  const [accepting, setAccepting]         = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposal, setProposal]           = useState({ price: '', deliveryDays: '', description: '' });
  // Media feature states
  const [isRecording, setIsRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl]           = useState(null);
  const [isFullScreen, setIsFullScreen]   = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType]           = useState('audio');
  // ── Review Card state — detects completed orders with pending review ──────
  const [pendingReviewOrder, setPendingReviewOrder] = useState(null);
  const [reviewSubmitted, setReviewSubmitted]       = useState(false);
  const recordTimerRef  = useRef(null);
  const mediaRecRef     = useRef(null);
  const audioChunksRef  = useRef([]);
  const fileInputRef    = useRef(null);
  const cameraInputRef  = useRef(null);

  const chatEndRef = useRef(null);
  const pollRef    = useRef(null);


  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('gv_user')) || {}; } catch { return {}; } })();

  // Fetch conversation list
  const fetchConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const res = await messageAPI.getConversations();
      const convos = res.data?.data || [];
      setConversations(convos);
      // Calculate total unread and notify parent
      const totalUnread = convos.reduce((sum, c) => sum + (c.UnreadCount || 0), 0);
      onUnreadChange?.(totalUnread);
    } catch { /* silent */ }
    finally { setConversationsLoading(false); }
  }, [onUnreadChange]);

  // Fetch messages with a partner
  const fetchMessages = useCallback(async (partnerId, isInitial = false) => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await messageAPI.getConversation(partnerId);
      setMessages(res.data?.data || []);
    } catch { 
      if (!isInitial) toast.error('Failed to load messages.', { className: 'gv-toast' }); 
    }
    finally { setLoading(false); }
  }, []);

  // On open: load conversations, auto-select targetUser
  useEffect(() => {
    if (!isOpen) {
      clearInterval(pollRef.current);
      return;
    }
    fetchConversations();

    if (targetUser) {
      setActivePartner({
        PartnerId:     targetUser.UserID || targetUser.id,
        PartnerName:   targetUser.Name   || targetUser.name,
        PartnerAvatar: targetUser.ProfilePicUrl || targetUser.avatar,
      });
      fetchMessages(targetUser.UserID || targetUser.id, true);
    }
  }, [isOpen, targetUser, fetchConversations, fetchMessages]);

  // Poll for new messages every 5s
  useEffect(() => {
    if (!isOpen || !activePartner) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, activePartner, fetchMessages, fetchConversations]);

  // Also poll conversations when drawer is open but no active partner
  useEffect(() => {
    if (!isOpen || activePartner) return;
    const t = setInterval(fetchConversations, 5000);
    return () => clearInterval(t);
  }, [isOpen, activePartner, fetchConversations]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect pending review when active partner changes
  // Queries my orders to find a Completed order with this partner where I am
  // the Client and no review has been submitted yet.
  useEffect(() => {
    setPendingReviewOrder(null);
    setReviewSubmitted(false);
    if (!activePartner?.PartnerId || !currentUser?.UserID) return;

    (async () => {
      try {
        const ordersRes = await orderAPI.getMyOrders();
        const orders = ordersRes.data?.data || [];
        const completedOrder = orders.find(o =>
          o.Status === 'Completed' &&
          Number(o.ClientID) === Number(currentUser.UserID) &&
          Number(o.ContributorID) === Number(activePartner.PartnerId)
        );
        if (!completedOrder) return;

        // Check if review already exists for this order
        try {
          await reviewAPI.getByOrder(completedOrder.OrderID);
          // 200 OK means review exists — do not show card
        } catch (reviewErr) {
          if (reviewErr.response?.status === 404) {
            // No review yet — surface the inline card
            setPendingReviewOrder(completedOrder);
          }
        }
      } catch { /* silent — chat should not break if orders API fails */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePartner?.PartnerId]);



  // Select a conversation
  const selectPartner = (conv) => {
    setActivePartner(conv);
    setMessages([]);
    fetchMessages(conv.PartnerId);
    setShowProposalForm(false);
  };

  // Send a regular message
  const handleSend = async () => {
    if (!msgInput.trim() || !activePartner) return;
    setSending(true);
    try {
      await messageAPI.send({ receiverId: activePartner.PartnerId, content: msgInput.trim() });
      setMsgInput('');
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message.', { className: 'gv-toast' });
    } finally { setSending(false); }
  };

  // Send a proposal 
  const handleSendProposal = async () => {
    if (!proposal.price || !proposal.deliveryDays || !proposal.description) {
      toast.error('All proposal fields are required.', { className: 'gv-toast' }); return;
    }
    setSending(true);
    try {
      await messageAPI.sendProposal({
        receiverId:   activePartner.PartnerId,
        price:        Number(proposal.price),
        deliveryDays: Number(proposal.deliveryDays),
        description:  proposal.description.trim(),
      });
      toast.success('Custom proposal sent!', { className: 'gv-toast', icon: '📋' });
      setProposal({ price: '', deliveryDays: '', description: '' });
      setShowProposalForm(false);
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send proposal.', { className: 'gv-toast' });
    } finally { setSending(false); }
  };

  // Accept a proposal
  const handleAcceptProposal = async (messageId) => {
    setAccepting(true);
    try {
      const res = await messageAPI.acceptProposal(messageId);
      toast.success(`Order #${res.data?.data?.orderId} created! Payment held in escrow.`, { className: 'gv-toast', icon: '🎉', duration: 5000 });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept proposal.', { className: 'gv-toast' });
    } finally { setAccepting(false); }
  };

  // Decline a proposal
  const handleDeclineProposal = async (messageId) => {
    try {
      await messageAPI.declineProposal(messageId);
      toast('Proposal declined.', { className: 'gv-toast', icon: '❌' });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline proposal.', { className: 'gv-toast' });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Voice Recording with Web Audio API (MediaRecorder)
  const handleMicToggle = async () => {
    if (isRecording) {
      // Stop recording
      mediaRecRef.current?.stop();
      clearInterval(recordTimerRef.current);
      setIsRecording(false);
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          toast.success('Voice note ready! Press send to deliver.', { className: 'gv-toast', icon: '🎙️' });
        };

        recorder.start();
        setIsRecording(true);
        setRecordSeconds(0);
        setAudioUrl(null);
        recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
        toast('Recording started...', { className: 'gv-toast', icon: '🔴', duration: 1500 });
      } catch {
        toast.error('Microphone access denied. Please allow microphone permission.', { className: 'gv-toast' });
      }
    }
  };

  const handleCancelRecording = () => {
    mediaRecRef.current?.stop();
    clearInterval(recordTimerRef.current);
    setIsRecording(false);
    setAudioUrl(null);
    setRecordSeconds(0);
  };

  const handleSendVoiceNote = async () => {
    if (!audioUrl || !activePartner) return;
    setSending(true);
    try {
      // Encode audio blob as base64 data URL so receiver can authentically play it
      const blob = await fetch(audioUrl).then(r => r.blob());
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      // Store as JSON payload so renderer can detect it
      const content = JSON.stringify({ type: 'voice', src: dataUrl, duration: recordSeconds });
      await messageAPI.send({ receiverId: activePartner.PartnerId, content });
      setAudioUrl(null);
      setRecordSeconds(0);
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success('Voice note sent!', { className: 'gv-toast', icon: '🎤' });
    } catch (err) { console.error('[VoiceNote] Send failed:', err.response?.data || err.message); toast.error(err.response?.data?.message || 'Failed to send voice note.', { className: 'gv-toast' }); }
    finally { setSending(false); }
  };

  // File Attachment via OS file picker
  const handleMediaUpload = (e) => { e.stopPropagation(); e.preventDefault(); fileInputRef.current?.click(); };
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePartner) return;
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${MAX_SIZE_MB} MB.`, { className: 'gv-toast' });
      e.target.value = ''; return;
    }
    setSending(true);
    try {
      // Encode file as base64 data URL so receiver can authentically download it
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const content = JSON.stringify({
        type: 'file',
        src: dataUrl,
        name: file.name,
        size: file.size,
        mime: file.type,
      });
      await messageAPI.send({ receiverId: activePartner.PartnerId, content });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success(`"${file.name}" shared!`, { className: 'gv-toast', icon: '📁' });
    } catch (err) { console.error('[FileUpload] Send failed:', err.response?.data || err.message); toast.error(err.response?.data?.message || 'Failed to send file.', { className: 'gv-toast' }); }
    finally { setSending(false); e.target.value = ''; }
  };

  // Camera Capture
  const handleCamera = (e) => { e.stopPropagation(); e.preventDefault(); cameraInputRef.current?.click(); };
  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePartner) return;
    const MAX_SIZE_MB = 5;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error('Image too large. Maximum 5 MB.', { className: 'gv-toast' });
      e.target.value = ''; return;
    }
    setSending(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const content = JSON.stringify({
        type: 'image',
        src: dataUrl,
        name: file.name,
        size: file.size,
        mime: file.type,
      });
      await messageAPI.send({ receiverId: activePartner.PartnerId, content });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success('Photo sent!', { className: 'gv-toast', icon: '📸' });
    } catch (err) { console.error('[Camera] Send failed:', err.response?.data || err.message); toast.error(err.response?.data?.message || 'Failed to send photo.', { className: 'gv-toast' }); }
    finally { setSending(false); e.target.value = ''; }
  };

  const formatRecordTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (!isOpen) return null;

  const partnerInitials = (activePartner?.PartnerName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Hidden file inputs for media & camera — onClick stopPropagation prevents drawer close */}
      <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileSelected} onClick={e => e.stopPropagation()} />
      <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCameraCapture} onClick={e => e.stopPropagation()} />

      {/* Drawer */}
      <div className={`relative h-full shadow-2xl flex overflow-hidden ${isFullScreen ? 'w-full' : 'w-full max-w-2xl'}`} onClick={e => e.stopPropagation()}
        style={{ animation: 'slideLeft 0.35s cubic-bezier(0.32,0.72,0,1)', background: '#f8f9fa' }}>

        {/* Conversation List Sidebar */}
        <div className={`${activePartner ? 'hidden sm:flex' : 'flex'} flex-col w-72 shrink-0`}
          style={{ background: '#fff', borderRight: '1px solid #e5e7eb' }}>
          <div className="px-4 py-4 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <MessageSquare size={16} className="text-white/90" /> GigVerse Messages
              </h3>
              <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
                <X size={14} className="text-white" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            {conversationsLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={24} className="text-brand-500 animate-spin" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <MessageSquare size={28} className="text-gray-200 mx-auto mb-3" />
                <p className="text-xs text-gray-400">No conversations yet</p>
                <p className="text-[10px] text-gray-300 mt-1">Visit a contributor's profile to start chatting</p>
              </div>
            ) : conversations.map(conv => {
              const ini = (conv.PartnerName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
              const active = activePartner?.PartnerId === conv.PartnerId;
              let lastText = conv.LastMessage || '';
              try { const p = JSON.parse(lastText); if (p.type === 'proposal') lastText = `📋 Proposal: ৳${Number(p.price).toLocaleString()}`; else if (p.type === 'system') lastText = `✅ ${p.text?.slice(0, 40)}`; } catch {}
              return (
                <button key={conv.PartnerId} onClick={() => selectPartner(conv)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 border-b border-gray-50 ${active ? 'bg-brand-50 border-l-2 border-l-brand-500' : 'hover:bg-gray-50'}`}>
                  <div className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
                    {conv.PartnerAvatar ? <img src={conv.PartnerAvatar} alt="" className="w-full h-full object-cover" /> : ini}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-bold text-gray-900 truncate">{conv.PartnerName}</p>
                      {(conv.UnreadCount || 0) > 0 && (
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 animate-pulse-soft">{conv.UnreadCount}</span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{lastText}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activePartner ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center">
                <MessageSquare size={28} className="text-brand-300" />
              </div>
              <p className="text-sm text-gray-400 text-center">Select a conversation or visit a profile to start</p>
            </div>
          ) : (
            <>
              {/* WhatsApp-Level Chat Header */}
              <div className="flex items-center gap-3 px-5 py-4 shrink-0"
                style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                <button onClick={() => setActivePartner(null)}
                  className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors sm:hidden">
                  <ChevronLeft size={14} className="text-white" />
                </button>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden ring-2 ring-white/30">
                  {activePartner.PartnerAvatar
                    ? <img src={activePartner.PartnerAvatar} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm font-extrabold">{partnerInitials}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{activePartner.PartnerName}</p>
                  <p className="text-[10px] text-white/80 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />Active on GigVerse
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button title="Voice Call"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                    onClick={() => { setCallType('audio'); setShowCallModal(true); }}>
                    <Phone size={15} className="text-white" />
                  </button>
                  <button title="Video Call"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                    onClick={() => { setCallType('video'); setShowCallModal(true); }}>
                    <Video size={15} className="text-white" />
                  </button>
                  <button title={isFullScreen ? 'Exit full screen' : 'Full screen'}
                    onClick={() => setIsFullScreen(f => !f)}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200">
                    {isFullScreen ? <Minimize2 size={15} className="text-white" /> : <Maximize2 size={15} className="text-white" />}
                  </button>
                  <button onClick={onClose}
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200 ml-1">
                    <X size={15} className="text-white" />
                  </button>
                </div>
              </div>

              {/* Messages area with WhatsApp-style wallpaper */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4" style={{
                scrollbarWidth: 'thin',
                background: 'linear-gradient(160deg, #FFFBEB 0%, #FEF3C7 50%, #FFFBEB 100%)'
              }}>
                {loading && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><Loader2 size={24} className="text-brand-500 animate-spin" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-xs text-gray-400">No messages yet. Say hello!</p>
                  </div>
                ) : messages.map(msg => {
                  const parsed = parseContent(msg.Content);
                  const isMine = msg.SenderID === currentUser.UserID;
                  const time   = new Date(msg.Timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dhaka' });

                  if (parsed.type === 'system') return <SystemMessage key={msg.MessageID} data={parsed} />;

                  if (parsed.type === 'proposal') {
                    return (
                      <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[85%]">
                          <ProposalCard proposal={parsed} messageId={msg.MessageID} isMine={isMine}
                            onAccept={handleAcceptProposal} onDecline={handleDeclineProposal} accepting={accepting} />
                          <p className={`text-[10px] text-gray-400 mt-1 ${isMine ? 'text-right' : ''}`}>{time}</p>
                        </div>
                      </div>
                    );
                  }

                  // Detect rich message types from JSON content
                  const textContent = parsed.text || msg.Content;
                  const richType = parsed.type; // 'voice' | 'file' | 'image' | 'text' | 'proposal' | 'system'

                  // Voice Note Bubble 
                  if (richType === 'voice' && parsed.src) {
                    return (
                      <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-3 py-3 rounded-2xl shadow-sm ${
                          isMine ? 'rounded-tr-sm text-white' : 'bg-white border border-gray-100 rounded-tl-sm'
                        }`} style={isMine ? { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' } : {}}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isMine ? 'bg-white/20' : 'bg-amber-50'
                            }`}>
                              <Mic size={13} className={isMine ? 'text-white' : 'text-amber-500'} />
                            </div>
                            <span className={`text-[11px] font-semibold ${isMine ? 'text-white/90' : 'text-gray-600'}`}>Voice Message</span>
                            {parsed.duration > 0 && (
                              <span className={`text-[10px] ml-auto ${isMine ? 'text-white/60' : 'text-gray-400'}`}>
                                {String(Math.floor(parsed.duration / 60)).padStart(2,'0')}:{String(parsed.duration % 60).padStart(2,'0')}
                              </span>
                            )}
                          </div>
                          <audio
                            src={parsed.src}
                            controls
                            preload="metadata"
                            className="w-full rounded-xl"
                            style={{ height: '36px', minWidth: '220px' }}
                          />
                          <p className={`text-[10px] mt-1.5 text-right ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{time}</p>
                        </div>
                      </div>
                    );
                  }

                  // File Download Bubble
                  if (richType === 'file' && parsed.src) {
                    const sizeKB = parsed.size ? (parsed.size / 1024).toFixed(1) : '?';
                    const isImg = parsed.mime?.startsWith('image/');
                    return (
                      <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl shadow-sm overflow-hidden ${
                          isMine ? 'rounded-tr-sm' : 'rounded-tl-sm'
                        }`} style={isMine ? { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' } : { background: '#fff', border: '1px solid #f3f4f6' }}>
                          <div className="px-4 py-3 flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              isMine ? 'bg-white/20' : 'bg-brand-50'
                            }`}>
                              <FileText size={18} className={isMine ? 'text-white' : 'text-brand-500'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-semibold truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>{parsed.name}</p>
                              <p className={`text-[10px] ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{sizeKB} KB</p>
                            </div>
                            <a
                              href={parsed.src}
                              download={parsed.name}
                              title={`Download ${parsed.name}`}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                                isMine
                                  ? 'bg-white/20 hover:bg-white/30 text-white'
                                  : 'bg-brand-50 hover:bg-brand-100 text-brand-600'
                              }`}
                              onClick={e => e.stopPropagation()}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            </a>
                          </div>
                          <p className={`text-[10px] pb-2 pr-3 text-right ${isMine ? 'text-white/50' : 'text-gray-400'}`}>{time}</p>
                        </div>
                      </div>
                    );
                  }

                  // ── Image Bubble ──
                  if (richType === 'image' && parsed.src) {
                    return (
                      <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[65%]">
                          <div className={`rounded-2xl overflow-hidden shadow-sm ${
                            isMine ? 'rounded-tr-sm ring-2 ring-amber-400/40' : 'rounded-tl-sm ring-1 ring-gray-100'
                          }`}>
                            <img
                              src={parsed.src}
                              alt={parsed.name || 'Photo'}
                              className="w-full object-cover max-h-64 cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => window.open(parsed.src, '_blank')}
                            />
                          </div>
                          <p className={`text-[10px] mt-1 ${isMine ? 'text-right text-gray-400' : 'text-gray-400'}`}>{time}</p>
                        </div>
                      </div>
                    );
                  }

                  // Plain Text Bubble (fallback)
                  return (
                    <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMine
                          ? 'text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`} style={isMine ? { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' } : {}}>
                        <p>{textContent}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{time}</p>
                      </div>
                    </div>
                  );
                })}

                <div ref={chatEndRef} />
              </div>

              {/* ── REVIEW PANEL — Shown between messages and input when order is Completed ── */}
              {/* This is the primary, always-visible review submission UI for clients */}
              {pendingReviewOrder && !reviewSubmitted && (
                <div className="mx-0 shrink-0 border-t-2 border-amber-200 animate-slide-up">
                  <InlineReviewCard
                    order={pendingReviewOrder}
                    reviewerId={currentUser.UserID}
                    onSubmitted={() => setReviewSubmitted(true)}
                  />
                </div>
              )}

              {/* Proposal Form (Inline Expansion) */}
              {showProposalForm && (
                <div className="px-4 py-4 border-t border-gray-100 bg-gradient-to-b from-brand-50/40 to-white space-y-3 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><FileText size={12} className="text-amber-500" /> Send Deal Proposal</p>
                    <button onClick={() => setShowProposalForm(false)} className="text-xs text-gray-400 hover:text-gray-600"><X size={14} /></button>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-500">What will you deliver?</label>
                    <input type="text" value={proposal.description} onChange={e => setProposal({ ...proposal, description: e.target.value })}
                      className="input-field !py-2 !text-xs" placeholder="e.g. Complete website redesign with 3 pages" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500">Proposed Price (৳)</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">৳</span>
                        <input type="number" min="1" value={proposal.price} onChange={e => setProposal({ ...proposal, price: e.target.value })}
                          className="input-field !py-2 !text-xs !pl-7" placeholder="1500" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-500">Delivery Time</label>
                      <div className="relative">
                        <input type="number" min="1" value={proposal.deliveryDays} onChange={e => setProposal({ ...proposal, deliveryDays: e.target.value })}
                          className="input-field !py-2 !text-xs !pr-12" placeholder="3" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">days</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleSendProposal} disabled={sending} className="w-full btn-primary !py-2.5 !text-xs disabled:opacity-60">
                    {sending ? <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Sending...</span>
                      : <span className="flex items-center gap-2"><Send size={12} /> Send Proposal to Client</span>}
                  </button>
                </div>
              )}

              {/* WhatsApp-Level Input Bar */}
              <div className="px-4 py-4 shrink-0" style={{ background: '#f8f9fa', borderTop: '1px solid #e5e7eb' }}>

                {/* Voice Recording indicator */}
                {isRecording && (
                  <div className="flex items-center gap-3 mb-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 animate-pulse">
                    <StopCircle size={16} className="text-red-500 shrink-0" />
                    <span className="text-sm font-bold text-red-600">Recording...</span>
                    <span className="text-sm font-mono text-red-500 ml-auto">{formatRecordTime(recordSeconds)}</span>
                    <button onClick={handleCancelRecording}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors">
                      Cancel
                    </button>
                  </div>
                )}

                {/* Voice note preview */}
                {audioUrl && !isRecording && (
                  <div className="flex items-center gap-3 mb-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <Play size={16} className="text-amber-600 shrink-0" />
                    <audio src={audioUrl} controls className="flex-1 h-8" style={{ maxWidth: '100%' }} />
                    <button onClick={handleSendVoiceNote} disabled={sending}
                      className="px-4 py-1.5 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                    <button onClick={() => { setAudioUrl(null); setRecordSeconds(0); }}
                      className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-300 transition-colors">
                      Discard
                    </button>
                  </div>
                )}

                <div className="flex items-end gap-2">

                  {/* Left action cluster: Proposal + Emoji + Attach */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setShowProposalForm(!showProposalForm)}
                      title="Send Deal Proposal"
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
                        showProposalForm
                          ? 'text-white shadow-brand'
                          : 'text-gray-500 hover:text-brand-500 hover:bg-brand-50'
                      }`}
                      style={showProposalForm ? { background: 'linear-gradient(135deg,#F59E0B,#D97706)' } : {}}>
                      <FileText size={18} />
                    </button>
                    <button
                      title="Media & Files"
                      onClick={handleMediaUpload}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-500 hover:bg-brand-50 transition-all duration-200">
                      <FolderOpen size={18} />
                    </button>
                    <button
                      title="Camera"
                      onClick={handleCamera}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-brand-500 hover:bg-brand-50 transition-all duration-200">
                      <Camera size={18} />
                    </button>
                  </div>

                  {/* Text input */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={msgInput}
                      onChange={e => setMsgInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={isRecording ? 'Recording voice message...' : 'Type a message...'}
                      disabled={isRecording || !!audioUrl}
                      className="w-full rounded-3xl border border-gray-200 bg-white px-5 py-3 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 focus:outline-none transition-all disabled:opacity-50 shadow-sm"
                    />
                    <button
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-amber-500 transition-colors"
                      title="Emoji"
                      onClick={() => toast('Emoji picker coming soon.', { className: 'gv-toast', icon: '😊' })}>
                      <Smile size={16} />
                    </button>
                  </div>

                  {/* Right action: Send OR Mic */}
                  {msgInput.trim() ? (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      title="Send message"
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-200 disabled:opacity-40 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                      style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                      {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    </button>
                  ) : (
                    <button
                      onClick={handleMicToggle}
                      title={isRecording ? 'Stop recording' : 'Record voice message'}
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 transition-all duration-300 shadow-sm ${
                        isRecording ? 'animate-pulse' : 'hover:-translate-y-0.5 hover:shadow-brand-lg'
                      }`}
                      style={{ background: isRecording ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#F59E0B,#D97706)' }}>
                      {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TASK 3: Jitsi Meet Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={e => e.stopPropagation()}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCallModal(false)} />
          <div className="relative w-full max-w-2xl mx-4 rounded-2xl overflow-hidden bg-gray-900 shadow-2xl shadow-black/50 ring-1 ring-white/10 animate-scale-in">
            {/* Call Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center ring-1 ring-green-400/30">
                  {callType === 'video' ? <Video size={14} className="text-green-400" /> : <Phone size={14} className="text-green-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{callType === 'video' ? 'Video' : 'Voice'} Call</p>
                  <p className="text-[10px] text-gray-400 font-medium">with {activePartner?.PartnerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-green-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live
              </div>
            </div>
            {/* Jitsi iframe */}
            <iframe
              src={`https://meet.jit.si/GigVerse_Call_${activePartner?.PartnerId}_${currentUser?.UserID || 'u'}#config.prejoinPageEnabled=false`}
              width="100%"
              height="480"
              allow="camera; microphone; fullscreen; display-capture"
              className="w-full border-0"
              style={{ background: '#1a1a2e' }}
            />
            {/* End Call Button */}
            <div className="flex justify-center py-4 bg-gray-900 border-t border-white/5">
              <button
                onClick={() => { setShowCallModal(false); toast('Call ended.', { className: 'gv-toast', icon: '📞' }); }}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-500/30 hover:shadow-red-500/50 transition-all duration-300 hover:scale-105"
              >
                <PhoneOff size={16} /> End Call
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .msg-sent::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 10px;
          border-width: 6px 0 6px 8px;
          border-style: solid;
          border-color: transparent transparent transparent #F59E0B;
        }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 2px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.45); }
        /* Ultra-premium proposal accept button glow */
        @keyframes proposalGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(245,158,11,0.4); }
          50%      { box-shadow: 0 0 30px rgba(245,158,11,0.7), 0 0 60px rgba(245,158,11,0.2); }
        }
        .proposal-accept-glow { animation: proposalGlow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
