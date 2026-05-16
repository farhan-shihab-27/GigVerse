// src/pages/MessagesPage.jsx — Full-Page Advanced Messaging Hub
// Handles ?initiate=true parameter from the email magic link flow
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  MessageSquare, Zap, ShieldCheck, ArrowLeft, CheckCircle2, Sparkles
} from 'lucide-react';
import ChatDrawer from '../components/ChatDrawer';
import toast from 'react-hot-toast';

export default function MessagesPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [showChat, setShowChat] = useState(false);
  const [initiated, setInitiated] = useState(false);

  const isInitiate = searchParams.get('initiate') === 'true';

  // Get current user info
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('gv_user')) || {}; }
    catch { return {}; }
  })();

  const firstName = (currentUser.Name || 'there').split(' ')[0];

  // ── Handle the ?initiate=true magic link parameter ─────────────────────────
  useEffect(() => {
    if (isInitiate && !initiated) {
      setInitiated(true);
      // Auto-open the chat drawer when arriving from the email magic link
      setTimeout(() => {
        setShowChat(true);
        toast.success(
          'A client has requested to connect with you! Check your messages.',
          { className: 'gv-toast', icon: '🤝', duration: 6000 }
        );
      }, 500);
    }
  }, [isInitiate, initiated]);

  // Auto-open chat drawer on mount for returning users (non-initiate)
  useEffect(() => {
    if (!isInitiate) {
      setShowChat(true);
    }
  }, []);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/20 bg-dora-kata">
        <div className="max-w-5xl mx-auto px-4 py-8">

          {/* Back navigation */}
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </button>

          {/* ── Hero Section ── */}
          <div className="card p-8 sm:p-10 relative overflow-hidden mb-8">
            {/* Decorative blurs */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand-100 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100 rounded-full blur-3xl opacity-25 translate-y-1/2 -translate-x-1/4 pointer-events-none" />

            <div className="relative z-10 text-center max-w-2xl mx-auto">
              {/* Icon */}
              <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-brand rotate-3 hover:rotate-0 transition-transform duration-500">
                <MessageSquare size={36} className="text-white" />
              </div>

              {isInitiate ? (
                <>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700 text-sm font-semibold mb-5 animate-slide-up">
                    <Sparkles size={14} className="text-green-500" />
                    New Connection Request Received
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                    Welcome back, <span className="text-gradient">{firstName}</span>!
                  </h1>
                  <p className="text-gray-500 leading-relaxed mb-6">
                    A client has initiated a custom project request with you via email.
                    Open the secure workspace below to review and accept the conversation.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-3">
                    Secure <span className="text-gradient">Workspace</span>
                  </h1>
                  <p className="text-gray-500 leading-relaxed mb-6">
                    Your private messaging hub for all GigVerse conversations, proposals, and project discussions.
                  </p>
                </>
              )}

              <button
                onClick={() => setShowChat(true)}
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl font-bold text-white text-base shadow-brand hover:shadow-brand-lg hover:-translate-y-0.5 transition-all duration-300"
                style={{ background: 'linear-gradient(135deg, #f26522 0%, #d95315 100%)' }}
              >
                <MessageSquare size={20} />
                {isInitiate ? 'Open Conversation Request' : 'Open Messages'}
              </button>
            </div>
          </div>

          {/* ── Feature Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-11 h-11 rounded-xl bg-brand-50 flex items-center justify-center mb-4">
                <ShieldCheck size={20} className="text-brand-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">End-to-End Secure</h3>
              <p className="text-xs text-gray-400 leading-relaxed">All conversations are secured within the GigVerse platform with authenticated access.</p>
            </div>

            <div className="card p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <CheckCircle2 size={20} className="text-green-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Proposal System</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Send and receive custom proposals directly in chat. Accept deals with one click.</p>
            </div>

            <div className="card p-6 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Zap size={20} className="text-amber-500" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-1.5">Real-Time Updates</h3>
              <p className="text-xs text-gray-400 leading-relaxed">Messages sync in real-time so you never miss a conversation or proposal update.</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Advanced Chat Drawer ── */}
      <ChatDrawer
        isOpen={showChat}
        onClose={() => setShowChat(false)}
      />
    </>
  );
}
