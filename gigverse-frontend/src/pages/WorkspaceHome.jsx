// src/pages/WorkspaceHome.jsx — Executive Hub Dashboard with ERP-grade analytics
// Collapsible sidebar, grouped search, draggable right panel, analytics layer.
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Briefcase, MessageSquare,
  Trophy, Wallet, Search, Bell, Star, Zap, LogOut, Award,
  User, TrendingUp, Loader2, ImageOff, ChevronRight, Tag,
  X, GripVertical, ShieldCheck, ArrowUpRight,
  ChevronsLeft, ChevronsRight, ShoppingCart, BarChart2,
  PieChart, Activity, TrendingDown, DollarSign, BarChart,
  Code2, Pen, BookOpen, Megaphone, Monitor, GraduationCap
} from 'lucide-react';
import { gigAPI, userAPI, searchAPI, orderAPI, dashboardAPI, messageAPI, reviewAPI } from '../lib/api';
import SmartGigEstimator from '../components/SmartGigEstimator';
import GigFormModal from '../components/GigFormModal';
import ChatDrawer from '../components/ChatDrawer';


// CATEGORY → ICON MAP — maps backend CategoryName strings to Lucide components
// so the pie-chart legend keeps its icon column after switching to live data.

const CATEGORY_ICON_MAP = {
  Development: Code2,
  Design:      Pen,
  Tutoring:    BookOpen,
  Writing:     Megaphone,
  Marketing:   Monitor,
  'Academic & Course Guidelines': GraduationCap,
  'Career Mentorship & Grooming': Briefcase,
};
const FALLBACK_ICON = Briefcase;

// High-fidelity fallback demo data for fresh accounts without historical data.
const DEMO_MONTHLY = [
  { month: 'Jan', revenue: 15000, escrow: 5000 },
  { month: 'Feb', revenue: 22000, escrow: 8000 },
  { month: 'Mar', revenue: 18000, escrow: 12000 },
  { month: 'Apr', revenue: 28000, escrow: 9000 },
  { month: 'May', revenue: 35000, escrow: 15000 },
  { month: 'Jun', revenue: 42000, escrow: 10000 },
];
const CATEGORY_COLOR_MAP = {
  Development: { color: '#3b82f6', lightColor: '#eff6ff' },
  Design:      { color: '#10b981', lightColor: '#f0fdf4' },
  Tutoring:    { color: '#f97316', lightColor: '#fff7ed' },
  Writing:     { color: '#8b5cf6', lightColor: '#f5f3ff' },
  Marketing:   { color: '#ec4899', lightColor: '#fdf2f8' },
  'Academic & Course Guidelines': { color: '#059669', lightColor: '#d1fae5' },
  'Career Mentorship & Grooming': { color: '#2563eb', lightColor: '#dbeafe' },
};
const FALLBACK_PALETTE = { color: '#8b5cf6', lightColor: '#f5f3ff' };

const DEMO_DISTRIBUTION = [
  { category: 'Development', amountBDT: 85000, count: 12, ...CATEGORY_COLOR_MAP.Development },
  { category: 'Design', amountBDT: 42000, count: 8, ...CATEGORY_COLOR_MAP.Design },
  { category: 'Writing', amountBDT: 25000, count: 5, ...CATEGORY_COLOR_MAP.Writing },
  { category: 'Tutoring', amountBDT: 15000, count: 3, ...CATEGORY_COLOR_MAP.Tutoring },
  { category: 'Marketing', amountBDT: 10000, count: 2, ...CATEGORY_COLOR_MAP.Marketing },
];

// MOCK_REVIEWS removed — now fetched live from reviewAPI.getByContributor(userId)


// Review Analytics Modal 
/**
 * Premium overlay modal showing rating breakdown, bar chart, and recent reviews.
 * Props:
 *   isOpen     {boolean}
 *   onClose    {() => void}
 *   avgRating  {number}     — from profile.AverageRating
 *   reviews    {object[]}   — MOCK_REVIEWS (replace with API)
 */
function ReviewAnalyticsModal({ isOpen, onClose, avgRating, reviews = [] }) {
  // Compute live star distribution from real reviews array
  const distribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(r => Number(r.Rating) === stars).length;
    const pct   = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { stars, count, pct };
  });
  const totalReviews = reviews.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-[scaleIn_0.25s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header gradient bar */}
        <div className="bg-gradient-to-r from-amber-400 via-orange-400 to-brand-500 p-5 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Review Analytics</p>
              <h2 className="text-2xl font-extrabold leading-none">{Number(avgRating || 0).toFixed(1)}</h2>
              <div className="flex items-center gap-1 mt-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star
                    key={s} size={14}
                    className={s <= Math.round(avgRating || 0) ? 'fill-white text-white' : 'text-white/40 fill-white/40'}
                  />
                ))}
                <span className="text-xs font-semibold ml-1.5 opacity-80">{totalReviews} reviews</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X size={15} className="text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Star breakdown bars */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Rating Breakdown</p>
            <div className="space-y-2">
              {distribution.map(({ stars, count, pct }) => (
                <div key={stars} className="flex items-center gap-3">
                  <div className="flex items-center gap-1 w-14 shrink-0 justify-end">
                    <span className="text-xs font-bold text-gray-700">{stars}</span>
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-medium w-8 shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trend indicator */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-100">
            <TrendingUp size={18} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-emerald-700">Rating Trend: Positive</p>
              <p className="text-xs text-emerald-600 mt-0.5">Your average rating improved 0.3 points this month</p>
            </div>
          </div>

          {/* Recent reviews */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Reviews</p>
            {reviews.length === 0 ? (
              <div className="text-center py-6">
                <Star size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-xs text-gray-400">No reviews yet. Complete orders to receive ratings.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 5).map((r, idx) => {
                  const reviewerName = r.ReviewerName || 'Anonymous';
                  const initials = reviewerName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                  const relDate = r.CreatedAt
                    ? new Date(r.CreatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  return (
                    <div key={r.ReviewID || idx} className="flex gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all">
                      <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-gray-900">{reviewerName}</span>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={9} className={s <= Number(r.Rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 fill-gray-200'} />
                            ))}
                          </div>
                          <span className="text-[10px] text-gray-400 ml-auto shrink-0">{relDate}</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{r.Comment || r.text || ''}</p>
                        {r.GigTitle && <p className="text-[10px] text-brand-400 font-semibold mt-1 truncate">On: {r.GigTitle}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Active Gigs SVG Pie Chart 
/**
 * Pure SVG pie chart for gig income distribution.
 * Generates SVG arc slices from data array.
 * Props:
 *   data  {object[]}  — MOCK_GIG_DISTRIBUTION shape
 */
function ActiveGigsPieChart({ data }) {
  const [hovered, setHovered] = useState(null);

  const total = data.reduce((s, d) => s + d.amountBDT, 0);

  // Compute SVG arcs
  const cx = 90; const cy = 90; const r = 72; const gap = 2;
  const arcs = useMemo(() => {
    let startAngle = -90; // Start from top
    return data.map((d) => {
      const pct = d.amountBDT / total;
      const angle = pct * 360;
      const endAngle = startAngle + angle - gap;
      const start = polarToCartesian(cx, cy, r, startAngle);
      const end   = polarToCartesian(cx, cy, r, endAngle);
      const largeArc = angle > 180 ? 1 : 0;
      const path = [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`,
        'Z',
      ].join(' ');
      const midAngle = startAngle + angle / 2;
      const labelPos = polarToCartesian(cx, cy, r * 0.62, midAngle);
      const result = { ...d, path, pct: Math.round(pct * 100), midAngle, labelPos };
      startAngle += angle;
      return result;
    });
  }, [data, total]);

  return (
    <div>
      {/* Chart + legend row */}
      <div className="flex flex-col sm:flex-row items-center gap-5">
        {/* SVG Pie */}
        <div className="relative shrink-0" style={{ width: 180, height: 180 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {arcs.map((arc, i) => (
              <path
                key={arc.category}
                d={arc.path}
                fill={arc.color}
                opacity={hovered === null || hovered === i ? 1 : 0.45}
                stroke="white"
                strokeWidth="2"
                style={{ transition: 'opacity 0.2s, transform 0.2s', cursor: 'pointer',
                  transform: hovered === i ? `translate(${Math.cos((arc.midAngle * Math.PI) / 180) * 5}px, ${Math.sin((arc.midAngle * Math.PI) / 180) * 5}px)` : 'translate(0,0)',
                  transformOrigin: `${cx}px ${cy}px`
                }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
            {/* Center hole */}
            <circle cx={cx} cy={cy} r="36" fill="white" />
            {/* Center text */}
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#111827">Total</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="600" fill="#6b7280">Income</text>
          </svg>
          {/* Hover tooltip */}
          {hovered !== null && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg pointer-events-none">
              {arcs[hovered].category}: {arcs[hovered].pct}%
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2.5 w-full">
          {arcs.map((arc, i) => {
            const ArcIcon = arc.icon;
            return (
              <div
                key={arc.category}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-default transition-all duration-200 ${
                  hovered === i ? 'shadow-sm scale-[1.01]' : ''
                }`}
                style={{ background: hovered === i ? arc.lightColor : 'transparent' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: arc.color }} />
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0`} style={{ background: arc.lightColor }}>
                  <ArcIcon size={11} style={{ color: arc.color }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 flex-1 min-w-0 truncate">{arc.category}</span>
                <span className="text-xs font-extrabold text-gray-900 shrink-0 ml-1">৳{arc.amountBDT.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-gray-400 w-8 text-right shrink-0">{arc.pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Polar to Cartesian helper for SVG arc calculations */
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad + Math.PI / 2), y: cy + r * Math.sin(rad + Math.PI / 2) };
}

// Platform Analytics Section 
/**
 * The prominent analytics grid row below the summary cards.
 * Left 60%: Monthly Revenue & Escrow Velocity placeholder with SVG sparkline.
 * Right 40%: Active Gigs Distribution SVG Pie chart.
 * Props:
 *   monthlyData    {object[]}  — MOCK_MONTHLY shape
 *   gigDistData    {object[]}  — MOCK_GIG_DISTRIBUTION shape
 *   totalSales     {number}    — from myStats
 *   activeOrders   {number}    — from myStats
 *   isDemoMode     {boolean}   — toggle sandbox opacity & alert banner
 */
function PlatformAnalyticsSection({ monthlyData, gigDistData, totalSales, activeOrders, isDemoMode }) {
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
  const chartH = 80; const chartW = 300; const barCount = monthlyData.length;
  const barW = chartW / barCount;

  // Sparkline points for revenue line
  const points = monthlyData.map((d, i) => {
    const x = (i / (barCount - 1)) * chartW;
    const y = chartH - (d.revenue / maxRevenue) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const escrowPoints = monthlyData.map((d, i) => {
    const x = (i / (barCount - 1)) * chartW;
    const y = chartH - (d.escrow / maxRevenue) * chartH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <section className="animate-[fadeIn_0.5s_ease-out]">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shadow-sm">
            <Activity size={15} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-gray-900">Platform Analytics</h2>
            <p className="text-xs text-gray-400">Your earnings intelligence hub</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-[10px] font-bold text-indigo-600">LIVE DATA</span>
        </div>
      </div>

      {isDemoMode && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-100 shadow-sm animate-[fadeIn_0.5s_ease-out]">
          <div className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
            <span className="text-base">💡</span>
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">Dynamic Sandbox Analytics View</p>
            <p className="text-xs text-amber-700 mt-0.5">Real-time telemetry will sync upon your first transaction.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

        {/* ── LEFT: Monthly Revenue & Escrow Velocity (60% / 3 cols) ── */}
        <div className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Monthly Revenue & Escrow Velocity</h3>
              <p className="text-xs text-gray-400 mt-0.5">Revenue vs Escrow — last 6 months</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-[10px] font-semibold text-gray-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" style={{ borderStyle: 'dashed', borderWidth: 1 }} />
                <span className="text-[10px] font-semibold text-gray-500">Escrow</span>
              </div>
            </div>
          </div>

          {/* SVG Sparkline */}
          <div className="relative mb-4" style={{ height: chartH + 8 }}>
            <svg width="100%" height={chartH + 8} viewBox={`0 0 ${chartW} ${chartH + 8}`} preserveAspectRatio="none">
              {/* Escrow area fill */}
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="escrowGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Revenue area */}
              <polygon
                points={`0,${chartH} ${points} ${chartW},${chartH}`}
                fill="url(#revenueGrad)"
              />
              {/* Revenue line */}
              <polyline points={points} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Escrow area */}
              <polygon
                points={`0,${chartH} ${escrowPoints} ${chartW},${chartH}`}
                fill="url(#escrowGrad)"
              />
              {/* Escrow line (dashed) */}
              <polyline points={escrowPoints} fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />

              {/* Data point dots */}
              {monthlyData.map((d, i) => {
                const x = (i / (barCount - 1)) * chartW;
                const y = chartH - (d.revenue / maxRevenue) * chartH;
                return <circle key={i} cx={x} cy={y} r="3" fill="#6366f1" stroke="white" strokeWidth="1.5" />;
              })}
            </svg>
          </div>

          {/* Month labels */}
          <div className="flex justify-between px-1">
            {monthlyData.map(d => (
              <span key={d.month} className="text-[10px] font-semibold text-gray-400">{d.month}</span>
            ))}
          </div>

          {/* KPI row */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
            {[
              { label: 'Peak Month', value: monthlyData.reduce((a, b) => a.revenue > b.revenue ? a : b).month, color: 'text-indigo-600', icon: TrendingUp },
              { label: 'Total 6-mo Revenue', value: `৳${monthlyData.reduce((s,d) => s+d.revenue,0).toLocaleString()}`, color: 'text-emerald-600', icon: DollarSign },
              { label: 'Avg Escrow/mo', value: `৳${Math.round(monthlyData.reduce((s,d) => s+d.escrow,0)/monthlyData.length).toLocaleString()}`, color: 'text-amber-600', icon: BarChart },
            ].map(kpi => {
              const KIcon = kpi.icon;
              return (
                <div key={kpi.label} className="text-center">
                  <KIcon size={14} className={`${kpi.color} mx-auto mb-1`} />
                  <p className={`text-sm font-extrabold ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[10px] text-gray-400">{kpi.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Active Gigs Distribution (40% / 2 cols) ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900">Active Gigs Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Income by category (BDT)</p>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100">
              <PieChart size={11} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-400">Current</span>
            </div>
          </div>
          <ActiveGigsPieChart data={gigDistData} />

          {/* Summary footer */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-center">
              <p className="text-base font-extrabold text-gray-900">{gigDistData.reduce((s,d) => s+d.count, 0)}</p>
              <p className="text-[10px] text-gray-400">Total Gigs</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-emerald-600">৳{gigDistData.reduce((s,d) => s+d.amountBDT, 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-400">Total Earnings</p>
            </div>
            <div className="text-center">
              <p className="text-base font-extrabold text-indigo-600">{gigDistData.length}</p>
              <p className="text-[10px] text-gray-400">Categories</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',   to: '/home' },
  { icon: ClipboardList,   label: 'My Orders',   to: '/orders' },
  { icon: Briefcase,       label: 'Browse Gigs', to: '/search' },
  { icon: MessageSquare,   label: 'Messages',    to: '__chat__' },
  { icon: Trophy,          label: 'Leaderboard', to: '/leaderboard' },
  { icon: Wallet,          label: 'PVP Wallet',  to: '/wallet' },
];

const CATEGORIES = ['All', 'Development', 'Design', 'Writing', 'Marketing', 'Tutoring', 'Academic & Course Guidelines', 'Career Mentorship & Grooming'];

function useDebounce(val, delay) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), delay); return () => clearTimeout(t); }, [val, delay]);
  return d;
}

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const [profile, setProfile]           = useState(null);
  const [gigs, setGigs]                 = useState([]);
  const [gigsLoading, setGigsLoading]   = useState(true);
  const [activeCategory, setActiveCat]  = useState('All');
  const [query, setQuery]               = useState('');
  const [suggestions, setSuggestions]   = useState({ skills: [], users: [] });
  const [sugLoading, setSugLoading]     = useState(false);
  const [showSug, setShowSug]           = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const [collapsed, setCollapsed]       = useState(false);
  const [myStats, setMyStats]           = useState(null);
  const [showGigModal, setShowGigModal] = useState(false);
  const [showChat, setShowChat]         = useState(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  // Review Analytics Modal state — triggered by Avg. Rating card click
  const [showReviewModal, setShowReviewModal] = useState(false);
  // Live reviews for the Review Analytics Modal 
  const [myReviews, setMyReviews]   = useState([]);
  // Telemetry state — live dashboard data from /api/dashboard/telemetry 
  const [telemetry, setTelemetry]             = useState(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);

  const isDragging = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(0);
  const debQuery   = useDebounce(query, 300);

  const user      = (() => { try { return JSON.parse(localStorage.getItem('gv_user')) || {}; } catch { return {}; } })();
  const initials  = (user.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = (profile?.Name || user.Name || '').split(' ')[0] || 'there';

  useEffect(() => {
    userAPI.getMyProfile()
      .then(r => {
        if (!r?.data?.data) return;
        const profileData = r.data.data;
        setProfile(profileData);
        // Fetch this user's reviews as a contributor so the Analytics Modal is live
        if (profileData.UserID) {
          reviewAPI.getByContributor(profileData.UserID)
            .then(rv => setMyReviews(Array.isArray(rv?.data?.data) ? rv.data.data : []))
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    setGigsLoading(true);
    gigAPI.getAll(12)
      .then(r => setGigs(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch(() => setGigs([]))
      .finally(() => setGigsLoading(false));
  }, []);
  useEffect(() => {
    dashboardAPI.getMyStats()
      .then(r => { if (r?.data?.data) setMyStats(r.data.data); })
      .catch(() => {});
  }, []);

  // Fetch live telemetry (macro stats + velocity chart + distribution)
  useEffect(() => {
    setTelemetryLoading(true);
    dashboardAPI.getTelemetry()
      .then(r => { if (r?.data?.data) setTelemetry(r.data.data); })
      .catch(() => {})
      .finally(() => setTelemetryLoading(false));
  }, []);

  const refreshGigs = () => {
    gigAPI.getAll(12)
      .then(r => setGigs(Array.isArray(r?.data?.data) ? r.data.data : []))
      .catch(() => {});
  };

  // Poll unread message count every 15 seconds
  useEffect(() => {
    const fetchUnread = () => {
      messageAPI.getUnreadCount()
        .then(r => setUnreadMsgCount(r?.data?.data?.count || 0))
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (debQuery.length < 2) { setSuggestions({ skills: [], users: [] }); return; }
    setSugLoading(true);
    searchAPI.autocomplete(debQuery)
      .then(r => setSuggestions(r.data.data || { skills: [], users: [] }))
      .catch(() => setSuggestions({ skills: [], users: [] }))
      .finally(() => setSugLoading(false));
  }, [debQuery]);

  // Draggable sidebar
  const onDragStart = useCallback((e) => {
    isDragging.current = true;
    startX.current = e.clientX;
    startW.current = sidebarWidth;
    document.body.classList.add('is-dragging');          // CSS class fixes cursor globally
    const onMove = (ev) => {
      if (!isDragging.current) return;
      const delta = startX.current - ev.clientX;
      setSidebarWidth(Math.min(500, Math.max(250, startW.current + delta)));
    };
    const onUp = () => {
      isDragging.current = false;
      document.body.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const handleSugClick = (item, type) => {
    setShowSug(false); setQuery('');
    if (type === 'user') navigate(`/profile/${item.id}`);
    else navigate(`/search?skill=${encodeURIComponent(item.label)}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('gv_token'); localStorage.removeItem('gv_user');
    navigate('/auth');
  };

  const filteredGigs = activeCategory === 'All' ? gigs
    : gigs.filter(g => g.CategoryName === activeCategory || g.DeptName?.includes(activeCategory));

  const skillCount  = profile?.skills?.length ?? 0;
  const profilePct  = Math.min(100, [
    !!profile?.Name,
    !!profile?.Bio && profile.Bio !== 'New member of GigVerse',
    !!profile?.ProfilePicUrl,
    skillCount >= 3,
  ].filter(Boolean).length * 25);

  // Derive live chart data from telemetry (with fallbacks)
  const isDemoMode = !telemetry || (
    telemetry.macroStats?.totalSales === 0 &&
    telemetry.macroStats?.activeOrders === 0 &&
    telemetry.velocityChart?.every(d => d.revenue === 0 && d.escrow === 0) &&
    telemetry.distributionChart?.length === 0
  );

  const liveMonthly = telemetryLoading ? DEMO_MONTHLY.map(d => ({ ...d, revenue: 0, escrow: 0 }))
    : (isDemoMode ? DEMO_MONTHLY : (telemetry?.velocityChart || []));

  const liveDistribution = telemetryLoading ? []
    : (isDemoMode ? DEMO_DISTRIBUTION : (telemetry?.distributionChart || [])).map(d => ({
        ...d,
        color: CATEGORY_COLOR_MAP[d.category]?.color || d.color || FALLBACK_PALETTE.color,
        lightColor: CATEGORY_COLOR_MAP[d.category]?.lightColor || d.lightColor || FALLBACK_PALETTE.lightColor,
        icon: CATEGORY_ICON_MAP[d.category] || FALLBACK_ICON,
      }));

  const QUICK_STATS = [
    {
      id: 'orders',
      icon: ClipboardList, label: 'Active Orders',
      value: telemetry?.macroStats?.activeOrders ?? myStats?.activeOrders ?? '—',
      color: '#3b82f6', bg: '#eff6ff', to: '/orders', onClick: null,
    },
    {
      id: 'pvp',
      icon: Zap, label: 'Available PVP',
      value: telemetry?.macroStats?.pvpPoints ?? profile?.PVP_Points ?? '—',
      color: '#f26522', bg: '#fff4eb', to: '/wallet', onClick: null,
    },
    {
      id: 'rating',
      icon: Star, label: 'Avg. Rating',
      value: telemetry?.macroStats?.avgRating != null
        ? Number(telemetry.macroStats.avgRating).toFixed(1)
        : (profile ? Number(profile.AverageRating || 0).toFixed(1) : '—'),
      color: '#f59e0b', bg: '#fffbeb',
      // No navigation — triggers Review Analytics Modal instead
      to: null, onClick: () => setShowReviewModal(true),
    },
    {
      id: 'sales',
      icon: ShoppingCart, label: 'Total Sales',
      value: telemetry?.macroStats?.totalSales != null
        ? `৳${Number(telemetry.macroStats.totalSales).toLocaleString()}`
        : (myStats ? `৳${Number(myStats.totalSales).toLocaleString()}` : '—'),
      color: '#10b981', bg: '#f0fdf4', to: '/wallet', onClick: null,
    },
  ];

  const hasSuggestions = suggestions.skills.length > 0 || suggestions.users.length > 0;

  return (
    <><div className="flex bg-gray-50 bg-dora-kata" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* LEFT SIDEBAR */}
      <aside
        className="flex flex-col shrink-0 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? '56px' : '224px' }}>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Main Menu</p>}
          {NAV.map(({ icon: Icon, label, to }) => {
            const active = window.location.pathname === to && label === 'Dashboard';
            const isChat = to === '__chat__';

            if (isChat) {
              return (
                <button key={label} onClick={() => setShowChat(true)} title={collapsed ? label : undefined}
                  className={`w-full flex items-center rounded-xl text-sm font-medium transition-all duration-150 relative group overflow-hidden
                    ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                    text-gray-500 hover:text-gray-800 hover:bg-gray-50`}>
                  <div className="relative shrink-0">
                    <Icon size={16} />
                    {unreadMsgCount > 0 && (
                      <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[8px] font-bold flex items-center justify-center animate-pulse-soft shadow-sm">
                        {unreadMsgCount > 9 ? '9+' : unreadMsgCount}
                      </span>
                    )}
                  </div>
                  {!collapsed && <span className="whitespace-nowrap">Messages</span>}
                  {!collapsed && unreadMsgCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-bold">{unreadMsgCount}</span>
                  )}
                </button>
              );
            }

            return (
              <Link key={label} to={to} title={collapsed ? label : undefined}
                className={`flex items-center rounded-xl text-sm font-medium transition-all duration-150 relative group overflow-hidden
                  ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                  ${active ? 'bg-brand-50 text-brand-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`}>
                {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-full" />}
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                {!collapsed && <ChevronRight size={11} className="ml-auto opacity-0 group-hover:opacity-40 transition-opacity" />}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle + Logout */}
        <div className="px-2 py-3 border-t border-gray-100 space-y-1">
          {!collapsed && (
            <button onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-150">
              <LogOut size={15} /><span className="whitespace-nowrap">Sign Out</span>
            </button>
          )}
          <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`flex items-center w-full rounded-xl text-xs font-semibold text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-all duration-150 py-2.5
              ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}>
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={15} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>

      {/* CENTER FEED */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Search row */}
        <div className="px-6 py-3 bg-white border-b border-gray-100 shrink-0">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all duration-200">
              <Search size={15} className="text-gray-400 shrink-0" />
              <input type="text" value={query}
                onChange={e => { setQuery(e.target.value); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder='Search gigs, skills, contributors...'
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
              />
              {query && <button onClick={() => { setQuery(''); setSuggestions({ skills: [], users: [] }); }} className="text-gray-300 hover:text-gray-500"><X size={13} /></button>}
              {sugLoading && <Loader2 size={13} className="animate-spin text-brand-500" />}
            </div>

            {/* Grouped suggestions dropdown */}
            {showSug && query.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50 bg-white border border-gray-200 shadow-xl animate-slide-up">
                {!hasSuggestions && !sugLoading && (
                  <div className="px-5 py-4 text-sm text-gray-400">No results for "{query}"</div>
                )}

                {/* Skills group */}
                {suggestions.skills.length > 0 && (
                  <div>
                    <div className="px-5 py-2 border-b border-gray-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suggested Skills</p>
                    </div>
                    {suggestions.skills.map((item, i) => (
                      <button key={`sk-${i}`} onMouseDown={() => handleSugClick(item, 'skill')}
                        className="flex items-center gap-3 w-full px-5 py-2.5 text-left hover:bg-brand-50 transition-colors duration-100"
                        style={{ borderBottom: '1px solid #f9fafb' }}>
                        <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                          <Tag size={12} className="text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                          <p className="text-xs text-gray-400">{item.sub}</p>
                        </div>
                        <ArrowUpRight size={12} className="ml-auto text-gray-300" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Contributors group */}
                {suggestions.users.length > 0 && (
                  <div>
                    <div className="px-5 py-2 border-b border-gray-100 border-t">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suggested Contributors</p>
                    </div>
                    {suggestions.users.map((item, i) => {
                      const ui = (item.label || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                      return (
                        <button key={`us-${i}`} onMouseDown={() => handleSugClick(item, 'user')}
                          className="flex items-center gap-3 w-full px-5 py-2.5 text-left hover:bg-brand-50 transition-colors duration-100"
                          style={{ borderBottom: i < suggestions.users.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-brand-gradient flex items-center justify-center text-white text-[10px] font-bold">
                            {item.avatar
                              ? <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                              : ui}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                            <p className="text-xs text-gray-400">{item.sub} · {item.PVP_Points} PVP</p>
                          </div>
                          <ArrowUpRight size={12} className="ml-auto text-gray-300" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>

          {/* Executive Dashboard Header */}
          <section>
            {/* Premium Header Block */}
            <div className="mb-6 pb-5 border-b border-gray-100/80">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  {/* GigVerse wordmark — emerald gradient */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Executive Dashboard</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">GigVerse</span>
                  </div>
                  <h1 className="text-2xl font-extrabold leading-tight">
                    <span className="text-gray-900">Welcome back, </span>
                    <span className="bg-gradient-to-r from-brand-500 to-orange-400 bg-clip-text text-transparent">{firstName}</span>
                  </h1>
                  <p className="text-sm text-gray-400 mt-0.5 font-medium">Here is your workspace intelligence overview for today.</p>
                </div>
                {/* Live status pill */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 self-start mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Live Data</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              {QUICK_STATS.map(({ id, icon: Icon, label, value, color, bg, to, onClick }) => {
                const cardClasses = `relative bg-white rounded-2xl border border-gray-100 p-4
                  shadow-md hover:shadow-xl hover:-translate-y-1.5 hover:border-gray-200/80
                  cursor-pointer transition-all duration-300 group block overflow-hidden`;
                const cardInner = (
                  <>
                    {/* Subtle colored top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                    />
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ background: bg }}>
                        <Icon size={17} style={{ color }} />
                      </div>
                      <ArrowUpRight size={13} className="text-gray-200 group-hover:text-gray-400 transition-colors mt-0.5" />
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 tracking-tight">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">{label}</p>
                    {id === 'rating' && (
                      <p className="text-[10px] text-brand-400 font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">View Analytics →</p>
                    )}
                  </>
                );
                return onClick ? (
                  <button key={id} onClick={onClick} className={cardClasses}>{cardInner}</button>
                ) : (
                  <Link key={id} to={to} className={cardClasses}>{cardInner}</Link>
                );
              })}
            </div>
            {profilePct < 100 && (
              <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-sm flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <Award size={16} className="text-brand-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-700">Profile Completion</p>
                    <span className="text-xs font-bold text-brand-500">{profilePct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-brand-500 to-orange-400 rounded-full transition-all duration-500" style={{ width: `${profilePct}%` }} />
                  </div>
                </div>
                <Link to="/profile" className="shrink-0 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">Complete</Link>
              </div>
            )}
          </section>

          {/* Platform Analytics Hub  */}
          {telemetryLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-indigo-400" />
              <span className="ml-3 text-sm text-gray-400 font-medium">Loading analytics…</span>
            </div>
          ) : (
            <PlatformAnalyticsSection
              monthlyData={liveMonthly}
              gigDistData={liveDistribution}
              totalSales={telemetry?.macroStats?.totalSales || myStats?.totalSales || 0}
              activeOrders={telemetry?.macroStats?.activeOrders || myStats?.activeOrders || 0}
              isDemoMode={isDemoMode}
            />
          )}

          {/*  AI Smart Pricing Estimator  */}
          <SmartGigEstimator />

          {/*  Gig Discovery  */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Featured Services</h2>
                <p className="text-xs text-gray-400 mt-0.5">Top gigs from verified UIU contributors</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowGigModal(true)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-sm hover:shadow-brand transition-all duration-200"><Briefcase size={12} />Create Gig</button>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-500"><TrendingUp size={13} />Trending</div>
              </div>
            </div>
            <div className="flex gap-2 mb-5 flex-wrap">
              {CATEGORIES.map(cat => {
                const isPremium = cat === 'Academic & Course Guidelines' || cat === 'Career Mentorship & Grooming';
                return (
                  <button key={cat} onClick={() => setActiveCat(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                      ${activeCategory === cat
                        ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-500'}
                      ${isPremium ? (activeCategory === cat ? 'ring-2 ring-emerald-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:text-emerald-800') : ''}`}>
                    {cat === 'Academic & Course Guidelines' && <GraduationCap size={13} />}
                    {cat === 'Career Mentorship & Grooming' && <Briefcase size={13} />}
                    {cat}
                  </button>
                );
              })}
            </div>

            {gigsLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-brand-500" />
                <span className="ml-3 text-sm text-gray-400">Loading gigs...</span>
              </div>
            )}
            {!gigsLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredGigs.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center py-14 gap-3">
                    <ImageOff size={32} className="text-gray-200" />
                    <p className="text-sm text-gray-400">No gigs in this category yet.</p>
                  </div>
                ) : filteredGigs.map(gig => {
                  const gi = (gig.ContributorName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                  return (
                    <Link key={gig.GigID} to={`/gigs/${gig.GigID}`}
                      className="card hover:-translate-y-1 hover:shadow-brand hover:border-brand-100 group block transition-all duration-200 overflow-hidden cursor-pointer">
                      {gig.PrimaryImage ? (
                        <div className="w-full h-36 overflow-hidden">
                          <img src={gig.PrimaryImage} alt={gig.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        </div>
                      ) : (
                        <div className="w-full h-36 bg-gradient-to-br from-brand-50 to-orange-50 flex items-center justify-center">
                          <Briefcase size={28} className="text-brand-200" />
                        </div>
                      )}
                      <div className="p-4">
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full mb-2">
                          {gig.DeptName || 'Campus'}
                        </span>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug transition-colors duration-200 cursor-pointer hover:text-emerald-600 font-medium">{gig.Title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <span onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/profile/${gig.ContributorID}`); }}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-brand-gradient overflow-hidden hover:ring-2 hover:ring-brand-200 transition-all cursor-pointer">
                            {gig.ProfilePicUrl ? <img src={gig.ProfilePicUrl} alt="" className="w-full h-full object-cover" /> : gi}
                          </span>
                          <div className="min-w-0">
                            <Link to={`/profile/${gig.ContributorID}`} onClick={e => e.stopPropagation()}
                              className="text-xs text-gray-700 truncate block transition-colors duration-200 cursor-pointer hover:text-emerald-600 font-medium">{gig.ContributorName}</Link>
                            <p className="text-[10px] font-semibold text-brand-500">{gig.PVP_Points ?? 0} PVP</p>
                          </div>
                          {Number(gig.AverageRating || 0) > 0 && (
                            <div className="ml-auto flex items-center gap-1">
                              <Star size={11} className="fill-amber-400 text-amber-400" />
                              <span className="text-xs font-semibold text-gray-600">{Number(gig.AverageRating).toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <div>
                            <span className="text-[10px] text-gray-400">Starting at</span>
                            <p className="text-sm font-extrabold text-brand-600">&#2547;{Number(gig.BasePrice || 0).toLocaleString()}</p>
                          </div>
                          <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 group-hover:bg-brand-600 shadow-sm group-hover:shadow-brand transition-all duration-200">
                            <ArrowUpRight size={12} />View Details
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* DRAG HANDLE + RIGHT SIDEBAR  */}
      <div className="flex shrink-0" style={{ width: sidebarWidth }}>
        <div
          className="w-3 flex items-center justify-center cursor-col-resize group shrink-0 border-l border-gray-100 hover:border-brand-300 transition-colors bg-white select-none"
          onMouseDown={onDragStart}>
          <GripVertical size={12} className="text-gray-300 group-hover:text-brand-400 transition-colors" />
        </div>
        <aside className="flex-1 overflow-y-auto bg-white border-l border-gray-100" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e5e7eb transparent' }}>
          <div className="p-4 space-y-5">
            {/* Mini Profile Card */}
            <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-orange-50/30 p-5 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold mx-auto mb-3 overflow-hidden shadow-brand bg-brand-gradient">
                {profile?.ProfilePicUrl ? <img src={profile.ProfilePicUrl} alt="" className="w-full h-full object-cover" /> : initials}
              </div>
              <h3 className="text-sm font-bold text-gray-900 mb-0.5">{profile?.Name || user.Name || '...'}</h3>
              <p className="text-xs font-semibold text-brand-500 mb-4">
                {(() => {
                  const rn = (profile?.RoleName || '').toLowerCase();
                  let prefix = 'Member';
                  if (rn.includes('student')) prefix = 'Student';
                  else if (rn.includes('alumni')) prefix = 'Alumni';
                  else if (rn.includes('faculty')) prefix = 'Faculty';
                  const dept = (profile?.DeptName || 'CSE') ? `Dept. of ${profile?.DeptName || 'CSE'}` : null;
                  return dept ? `${prefix} — ${dept}` : prefix;
                })()}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/wallet"
                  className="bg-white rounded-xl p-2.5 border border-gray-100 text-center
                    hover:border-brand-200 hover:shadow-sm hover:-translate-y-0.5
                    cursor-pointer transition-all duration-200 group">
                  <p className="text-lg font-extrabold text-brand-500">{profile?.PVP_Points ?? '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 group-hover:text-brand-400 transition-colors">PVP Points</p>
                </Link>
                <Link to="/leaderboard"
                  className="bg-white rounded-xl p-2.5 border border-gray-100 text-center
                    hover:border-amber-200 hover:shadow-sm hover:-translate-y-0.5
                    cursor-pointer transition-all duration-200 group">
                  <p className="text-lg font-extrabold text-amber-500">{profile ? Number(profile.AverageRating).toFixed(1) : '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 group-hover:text-amber-400 transition-colors">Avg Rating</p>
                </Link>
              </div>
              {profile?.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                  {profile.skills.slice(0, 3).map(s => (
                    <span key={s.SkillID} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 border border-brand-100">{s.SkillName}</span>
                  ))}
                  {profile.skills.length > 3 && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">+{profile.skills.length - 3} more</span>
                  )}
                </div>
              )}
              <Link to="/profile" className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-colors">
                <User size={11} />View Full Profile
              </Link>
            </div>

            {/* Recent Activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">Recent Activity</h3>
                <Bell size={13} className="text-gray-300" />
              </div>
              <div className="space-y-2">
                {[
                  { text: 'Your order #42 has been delivered.', time: '2m ago' },
                  { text: 'New review posted on your gig.',     time: '1h ago' },
                  { text: 'You received 50 PVP points.',        time: '3h ago' },
                ].map((n, i) => (
                  <div key={i} className="px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-brand-200 hover:bg-brand-50/40 transition-all cursor-pointer">
                    <p className="text-xs text-gray-600 leading-relaxed">{n.text}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Pulse */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Platform Pulse</h3>
              {[
                { label: 'Active Gigs',   value: gigs.length },
                { label: 'Skills Added',  value: profile?.skills?.length ?? 0 },
                { label: 'Top PVP Score', value: '1,240' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500">{item.label}</span>
                  <span className="text-xs font-bold text-gray-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>

    {/* Gig Create Modal */}
    <GigFormModal
      isOpen={showGigModal}
      onClose={() => setShowGigModal(false)}
      onSuccess={refreshGigs}
    />

    {/* Chat Drawer */}
    <ChatDrawer
      isOpen={showChat}
      onClose={() => setShowChat(false)}
      onUnreadChange={(count) => setUnreadMsgCount(count)}
    />

    {/* Review Analytics Modal — triggered by Avg. Rating stat card */}
    <ReviewAnalyticsModal
      isOpen={showReviewModal}
      onClose={() => setShowReviewModal(false)}
      avgRating={profile?.AverageRating || 0}
      reviews={myReviews}
    />
    </>
  );
}
