// src/components/NotificationBell.jsx — Glassmorphic Notification Dropdown
// Glowing bell with unread count, slide-down panel, and toast integration.
import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, CheckCheck, MessageSquare, ClipboardList, Star, AlertTriangle, Zap, X } from 'lucide-react';
import { notificationAPI } from '../lib/api';
import toast from 'react-hot-toast';

// ── Icon map by notification type ───────────────────────────────────────────
const TYPE_CONFIG = {
  order:     { icon: ClipboardList, color: 'text-blue-500',   bg: 'bg-blue-50' },
  milestone: { icon: Zap,           color: 'text-brand-500',  bg: 'bg-brand-50' },
  review:    { icon: Star,          color: 'text-amber-500',  bg: 'bg-amber-50' },
  message:   { icon: MessageSquare, color: 'text-green-500',  bg: 'bg-green-50' },
  dispute:   { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50' },
  system:    { icon: Bell,          color: 'text-gray-500',   bg: 'bg-gray-50' },
};

export default function NotificationBell() {
  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading]         = useState(false);
  const [bellAnimate, setBellAnimate] = useState(false);
  const panelRef = useRef(null);
  const prevCount = useRef(0);

  // ── Fetch unread count (polling every 30s) ────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      const count = res.data?.data?.count || 0;

      // If new notifications arrived, animate bell + show toast
      if (count > prevCount.current && prevCount.current !== 0) {
        setBellAnimate(true);
        setTimeout(() => setBellAnimate(false), 600);
        toast('You have new notifications!', {
          icon: '🔔',
          className: 'gv-toast',
          duration: 3000,
          style: { borderLeft: '4px solid #f26522' },
        });
      }
      prevCount.current = count;
      setUnreadCount(count);
    } catch {
      // Silently fail — non-critical
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('gv_token');
    if (!token) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ── Fetch notifications when panel opens ──────────────────────────────────
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll(20);
      setNotifications(res.data?.data || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const togglePanel = () => {
    if (!isOpen) fetchNotifications();
    setIsOpen(!isOpen);
  };

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ── Mark single as read ───────────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications(prev => prev.map(n =>
        n.NotificationID === id ? { ...n, IsRead: 1 } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // Silently fail
    }
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  // ── Time ago helper ───────────────────────────────────────────────────────
  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell Button ────────────────────────────────────────────────────── */}
      <button
        id="nav-notifications"
        onClick={togglePanel}
        title="Notifications"
        className={`relative p-2 rounded-xl transition-all duration-200
          ${isOpen
            ? 'bg-brand-50 text-brand-600'
            : 'text-gray-500 hover:text-brand-600 hover:bg-brand-50'
          }
          ${bellAnimate ? 'animate-bell-ring' : ''}
        `}
      >
        <Bell size={17} className={unreadCount > 0 ? 'fill-brand-500/20' : ''} />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-500 text-white text-[9px] font-bold rounded-full px-1 ring-2 ring-white animate-glow-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ─────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] rounded-2xl glass-panel overflow-hidden z-50 animate-slide-down border border-gray-200/50">

          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100/80 bg-gradient-to-r from-brand-50/50 to-white">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-brand-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-[10px] font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 rounded-lg hover:bg-brand-50 transition-all"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-[380px] notification-scroll">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                  <Bell size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-300 mt-1">You will be notified about orders, reviews, and messages.</p>
              </div>
            ) : (
              <div>
                {notifications.map((notif) => {
                  const config = TYPE_CONFIG[notif.Type] || TYPE_CONFIG.system;
                  const Icon = config.icon;
                  const isUnread = !notif.IsRead;

                  return (
                    <div
                      key={notif.NotificationID}
                      onClick={() => isUnread && handleMarkRead(notif.NotificationID)}
                      className={`flex gap-3 px-5 py-3.5 border-b border-gray-50 transition-all duration-150 cursor-pointer group
                        ${isUnread
                          ? 'bg-brand-50/30 hover:bg-brand-50/60'
                          : 'hover:bg-gray-50'
                        }`}
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon size={15} className={config.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-xs leading-relaxed ${isUnread ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                            {notif.Title}
                          </p>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1 animate-pulse-soft" />
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{notif.Content}</p>
                        <p className="text-[10px] text-gray-300 mt-1.5 font-medium">{timeAgo(notif.CreatedAt)}</p>
                      </div>

                      {/* Mark read indicator */}
                      {isUnread && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.NotificationID); }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-brand-500 transition-all shrink-0 mt-0.5"
                          title="Mark as read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
