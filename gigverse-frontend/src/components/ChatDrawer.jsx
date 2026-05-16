// src/components/ChatDrawer.jsx — Premium Amber Messaging + Full-Screen + Media
// Slide-in drawer: soft amber palette, voice recording, camera, file attach, proposals.
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Send, MessageSquare, Loader2, ChevronLeft, FileText,
  DollarSign, Clock, CheckCircle2, User, Zap, XCircle,
  Mic, MicOff, Camera, FolderOpen, Phone, Video, MoreVertical,
  Smile, Paperclip, StopCircle, Maximize2, Minimize2, Play, Square
} from 'lucide-react';
import { messageAPI } from '../lib/api';
import toast from 'react-hot-toast';

// ── Parse message content — returns { type, text, ...proposal } ──────────────
function parseContent(content) {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type) return parsed;
  } catch { /* not JSON, regular text message */ }
  return { type: 'text', text: content };
}

// ── Proposal Card (rendered inside chat bubble) ──────────────────────────────
function ProposalCard({ proposal, messageId, isMine, onAccept, onDecline, accepting }) {
  const isAccepted  = proposal.status === 'accepted';
  const isDeclined  = proposal.status === 'declined';

  return (
    <div className={`rounded-xl border-2 p-4 space-y-3 transition-all duration-300 ${
      isAccepted ? 'border-green-200 bg-green-50/50' :
      isDeclined ? 'border-red-200 bg-red-50/30 opacity-70' :
      'border-brand-200 bg-brand-50/30'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          isAccepted ? 'bg-green-100' : isDeclined ? 'bg-red-100' : 'bg-brand-100'
        }`}>
          <FileText size={14} className={isAccepted ? 'text-green-600' : isDeclined ? 'text-red-500' : 'text-brand-600'} />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
          {isAccepted ? 'Accepted Proposal' : isDeclined ? 'Declined Proposal' : 'Custom Proposal'}
        </span>
      </div>
      <p className="text-sm text-gray-800 font-medium leading-relaxed">{proposal.description}</p>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <DollarSign size={13} className="text-brand-500" />
          <span className="text-sm font-extrabold text-brand-600">৳{Number(proposal.price).toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500">{proposal.deliveryDays} day{proposal.deliveryDays > 1 ? 's' : ''} delivery</span>
        </div>
      </div>

      {isAccepted ? (
        <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-100 rounded-lg px-3 py-2">
          <CheckCircle2 size={14} /> Accepted — Order #{proposal.orderId} created
        </div>
      ) : isDeclined ? (
        <div className="flex items-center gap-2 text-xs font-bold text-red-500 bg-red-100 rounded-lg px-3 py-2">
          <XCircle size={14} /> This proposal was declined
        </div>
      ) : !isMine ? (
        <div className="flex gap-2">
          <button onClick={() => onAccept(messageId)} disabled={accepting}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 transition-all duration-200 disabled:opacity-60">
            {accepting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Accept & Confirm Order
          </button>
          <button onClick={() => onDecline(messageId)} disabled={accepting}
            className="px-4 py-3 rounded-xl text-sm font-bold text-red-500 border-2 border-red-200 hover:bg-red-50 transition-all duration-200 disabled:opacity-60">
            Decline Deal
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-400 italic text-center py-1">Waiting for client to respond...</div>
      )}
    </div>
  );
}

// ── System Message Card ──────────────────────────────────────────────────────
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

// ── Main ChatDrawer Component ────────────────────────────────────────────────
export default function ChatDrawer({ isOpen, onClose, targetUser = null, onUnreadChange }) {
  const [conversations, setConversations] = useState([]);
  const [activePartner, setActivePartner] = useState(null);
  const [messages, setMessages]           = useState([]);
  const [msgInput, setMsgInput]           = useState('');
  const [loading, setLoading]             = useState(false);
  const [sending, setSending]             = useState(false);
  const [accepting, setAccepting]         = useState(false);
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposal, setProposal]           = useState({ price: '', deliveryDays: '', description: '' });
  // Media feature states
  const [isRecording, setIsRecording]     = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [audioUrl, setAudioUrl]           = useState(null);
  const [isFullScreen, setIsFullScreen]   = useState(false);
  const recordTimerRef  = useRef(null);
  const mediaRecRef     = useRef(null);
  const audioChunksRef  = useRef([]);
  const fileInputRef    = useRef(null);
  const cameraInputRef  = useRef(null);

  const chatEndRef = useRef(null);
  const pollRef    = useRef(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('gv_user')) || {}; } catch { return {}; } })();

  // ── Fetch conversation list ────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    try {
      const res = await messageAPI.getConversations();
      const convos = res.data?.data || [];
      setConversations(convos);
      // Calculate total unread and notify parent
      const totalUnread = convos.reduce((sum, c) => sum + (c.UnreadCount || 0), 0);
      onUnreadChange?.(totalUnread);
    } catch { /* silent */ }
  }, [onUnreadChange]);

  // ── Fetch messages with a partner ──────────────────────────────────────────
  const fetchMessages = useCallback(async (partnerId) => {
    if (!partnerId) return;
    setLoading(true);
    try {
      const res = await messageAPI.getConversation(partnerId);
      setMessages(res.data?.data || []);
    } catch { toast.error('Failed to load messages.', { className: 'gv-toast' }); }
    finally { setLoading(false); }
  }, []);

  // ── On open: load conversations, auto-select targetUser ────────────────────
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
      fetchMessages(targetUser.UserID || targetUser.id);
    }
  }, [isOpen, targetUser, fetchConversations, fetchMessages]);

  // ── Poll for new messages every 5s ─────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !activePartner) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
    }, 5000);
    return () => clearInterval(pollRef.current);
  }, [isOpen, activePartner, fetchMessages, fetchConversations]);

  // ── Also poll conversations when drawer is open but no active partner ──────
  useEffect(() => {
    if (!isOpen || activePartner) return;
    const t = setInterval(fetchConversations, 5000);
    return () => clearInterval(t);
  }, [isOpen, activePartner, fetchConversations]);

  // ── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select a conversation ──────────────────────────────────────────────────
  const selectPartner = (conv) => {
    setActivePartner(conv);
    setMessages([]);
    fetchMessages(conv.PartnerId);
    setShowProposalForm(false);
  };

  // ── Send a regular message ─────────────────────────────────────────────────
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

  // ── Send a proposal ────────────────────────────────────────────────────────
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

  // ── Accept a proposal ──────────────────────────────────────────────────────
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

  // ── Decline a proposal ─────────────────────────────────────────────────────
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

  // ── Voice Recording with Web Audio API (MediaRecorder) ──────────────────────
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
      await messageAPI.send({ receiverId: activePartner.PartnerId, content: '🎙️ [Voice Note]' });
      setAudioUrl(null);
      setRecordSeconds(0);
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success('Voice note sent!', { className: 'gv-toast', icon: '🎤' });
    } catch { toast.error('Failed to send voice note.', { className: 'gv-toast' }); }
    finally { setSending(false); }
  };

  // ── File Attachment via OS file picker ─────────────────────────────────────
  const handleMediaUpload = () => { fileInputRef.current?.click(); };
  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePartner) return;
    setSending(true);
    try {
      await messageAPI.send({ receiverId: activePartner.PartnerId, content: `📎 [File: ${file.name}] (${(file.size / 1024).toFixed(1)} KB)` });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success(`"${file.name}" shared!`, { className: 'gv-toast', icon: '📁' });
    } catch { toast.error('Failed to send file.', { className: 'gv-toast' }); }
    finally { setSending(false); e.target.value = ''; }
  };

  // ── Camera Capture ────────────────────────────────────────────────────────
  const handleCamera = () => { cameraInputRef.current?.click(); };
  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activePartner) return;
    setSending(true);
    try {
      await messageAPI.send({ receiverId: activePartner.PartnerId, content: `📷 [Photo Capture] (${(file.size / 1024).toFixed(1)} KB)` });
      fetchMessages(activePartner.PartnerId);
      fetchConversations();
      toast.success('Photo sent!', { className: 'gv-toast', icon: '📸' });
    } catch { toast.error('Failed to send photo.', { className: 'gv-toast' }); }
    finally { setSending(false); e.target.value = ''; }
  };

  const formatRecordTime = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  if (!isOpen) return null;

  const partnerInitials = (activePartner?.PartnerName || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Hidden file inputs for media & camera */}
      <input ref={fileInputRef} type="file" className="hidden" accept="*/*" onChange={handleFileSelected} />
      <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleCameraCapture} />

      {/* Drawer */}
      <div className={`relative h-full shadow-2xl flex overflow-hidden ${isFullScreen ? 'w-full' : 'w-full max-w-2xl'}`} onClick={e => e.stopPropagation()}
        style={{ animation: 'slideLeft 0.35s cubic-bezier(0.32,0.72,0,1)', background: '#f8f9fa' }}>

        {/* ── Conversation List Sidebar ──────────────────────────────────────── */}
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
            {conversations.length === 0 ? (
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

        {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
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
              {/* ── WhatsApp-Level Chat Header ── */}
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
                  <button title="Voice call (coming soon)"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                    onClick={() => toast('Voice calls coming soon.', { className: 'gv-toast', icon: '📞' })}>
                    <Phone size={15} className="text-white" />
                  </button>
                  <button title="Video call (coming soon)"
                    className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                    onClick={() => toast('Video calls coming soon.', { className: 'gv-toast', icon: '🎥' })}>
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

              {/* ── Messages area with WhatsApp-style wallpaper ── */}
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
                  const time   = new Date(msg.Timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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

                  return (
                    <div key={msg.MessageID} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        isMine
                          ? 'text-white rounded-tr-sm'
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'
                      }`} style={isMine ? { background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' } : {}}>
                        <p>{parsed.text || msg.Content}</p>
                        <p className={`text-[10px] mt-1 text-right ${isMine ? 'text-white/60' : 'text-gray-400'}`}>{time}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

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

              {/* ── WhatsApp-Level Input Bar ── */}
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

      <style>{`
        @keyframes slideLeft {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        /* WhatsApp-style message tail for sent messages */
        .msg-sent::after {
          content: '';
          position: absolute;
          right: -6px;
          top: 10px;
          border-width: 6px 0 6px 8px;
          border-style: solid;
          border-color: transparent transparent transparent #F59E0B;
        }
        /* Thin branded scrollbar for chat area */
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(245,158,11,0.25); border-radius: 2px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245,158,11,0.45); }
      `}</style>
    </div>
  );
}
