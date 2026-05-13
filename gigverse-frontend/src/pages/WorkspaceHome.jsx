// src/pages/WorkspaceHome.jsx — Collapsible sidebar, grouped search, draggable right panel
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Briefcase, MessageSquare,
  Trophy, Wallet, Search, Bell, Star, Zap, LogOut, Award,
  User, TrendingUp, Loader2, ImageOff, ChevronRight, Tag,
  X, GripVertical, ShieldCheck, ArrowUpRight,
  ChevronsLeft, ChevronsRight, ShoppingCart
} from 'lucide-react';
import { gigAPI, userAPI, searchAPI, orderAPI } from '../lib/api';
import SmartGigEstimator from '../components/SmartGigEstimator';

const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',   to: '/home' },
  { icon: ClipboardList,   label: 'My Orders',   to: '/orders' },
  { icon: Briefcase,       label: 'Browse Gigs', to: '/search' },
  { icon: MessageSquare,   label: 'Messages',    to: '/home' },
  { icon: Trophy,          label: 'Leaderboard', to: '/leaderboard' },
  { icon: Wallet,          label: 'PVP Wallet',  to: '/home' },
];

const CATEGORIES = ['All', 'Development', 'Design', 'Writing', 'Marketing', 'Tutoring'];

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

  const isDragging = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(0);
  const debQuery   = useDebounce(query, 300);

  const user      = (() => { try { return JSON.parse(localStorage.getItem('gv_user')) || {}; } catch { return {}; } })();
  const initials  = (user.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const firstName = (profile?.Name || user.Name || '').split(' ')[0] || 'there';

  useEffect(() => {
    userAPI.getMyProfile()
      .then(r => { if (r?.data?.data) setProfile(r.data.data); })
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
    if (debQuery.length < 2) { setSuggestions({ skills: [], users: [] }); return; }
    setSugLoading(true);
    searchAPI.autocomplete(debQuery)
      .then(r => setSuggestions(r.data.data || { skills: [], users: [] }))
      .catch(() => setSuggestions({ skills: [], users: [] }))
      .finally(() => setSugLoading(false));
  }, [debQuery]);

  // ── Draggable sidebar ──────────────────────────────────────────────────────
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

  const QUICK_STATS = [
    { icon: ClipboardList, label: 'Active Orders',      value: '—',       color: '#3b82f6', bg: '#eff6ff' },
    { icon: Zap,           label: 'Available PVP',      value: profile?.PVP_Points ?? '—', color: '#f26522', bg: '#fff4eb' },
    { icon: Star,          label: 'Avg. Rating',        value: profile ? Number(profile.AverageRating || 0).toFixed(1) : '—', color: '#f59e0b', bg: '#fffbeb' },
    { icon: ShieldCheck,   label: 'Profile Completion', value: `${profilePct}%`, color: '#10b981', bg: '#f0fdf4' },
  ];

  const hasSuggestions = suggestions.skills.length > 0 || suggestions.users.length > 0;

  return (
    <div className="flex bg-gray-50 bg-dora-kata" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside
        className="flex flex-col shrink-0 bg-white border-r border-gray-100 shadow-sm transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? '56px' : '224px' }}>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {!collapsed && <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap">Main Menu</p>}
          {NAV.map(({ icon: Icon, label, to }) => {
            const active = window.location.pathname === to && label === 'Dashboard';
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

      {/* ── CENTER FEED ──────────────────────────────────────────────────── */}
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

            {/* ── Grouped suggestions dropdown ── */}
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

          {/* ── Welcome Dashboard Summary ── */}
          <section>
            <div className="mb-5">
              <h1 className="text-xl font-extrabold text-gray-900">
                Welcome back, <span className="text-brand-500">{firstName}</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">Here is your workspace overview for today.</p>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
              {QUICK_STATS.map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                      <Icon size={16} style={{ color }} />
                    </div>
                    <ArrowUpRight size={13} className="text-gray-200" />
                  </div>
                  <p className="text-2xl font-extrabold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
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

          {/* ── AI Smart Pricing Estimator ── */}
          <SmartGigEstimator />

          {/* ── Gig Discovery ── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-extrabold text-gray-900">Featured Services</h2>
                <p className="text-xs text-gray-400 mt-0.5">Top gigs from verified UIU contributors</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-500"><TrendingUp size={13} />Trending</div>
            </div>
            <div className="flex gap-2 mb-5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setActiveCat(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150
                    ${activeCategory === cat
                      ? 'bg-brand-500 text-white border-brand-500 shadow-sm'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-500'}`}>
                  {cat}
                </button>
              ))}
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
                    <div key={gig.GigID}
                      className="card hover:-translate-y-1 hover:shadow-brand hover:border-brand-100 group block transition-all duration-200 overflow-hidden">
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
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 line-clamp-2 leading-snug">{gig.Title}</h3>
                        <div className="flex items-center gap-2 mb-3">
                          <Link to={`/profile/${gig.ContributorID}`}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-brand-gradient overflow-hidden hover:ring-2 hover:ring-brand-200 transition-all">
                            {gig.ProfilePicUrl ? <img src={gig.ProfilePicUrl} alt="" className="w-full h-full object-cover" /> : gi}
                          </Link>
                          <div className="min-w-0">
                            <Link to={`/profile/${gig.ContributorID}`} className="text-xs font-medium text-gray-700 hover:text-brand-600 transition-colors truncate block">{gig.ContributorName}</Link>
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
                          <button onClick={() => navigate(`/gigs/${gig.GigID}`)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 shadow-sm hover:shadow-brand transition-all duration-200">
                            <ShoppingCart size={12} />Order Now
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── DRAG HANDLE + RIGHT SIDEBAR ──────────────────────────────────── */}
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
              <p className="text-xs text-gray-400 mb-4">{profile?.RoleName} · {profile?.DeptCode}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2.5 border border-gray-100 text-center">
                  <p className="text-lg font-extrabold text-brand-500">{profile?.PVP_Points ?? '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">PVP Points</p>
                </div>
                <div className="bg-white rounded-xl p-2.5 border border-gray-100 text-center">
                  <p className="text-lg font-extrabold text-amber-500">{profile ? Number(profile.AverageRating).toFixed(1) : '—'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Avg Rating</p>
                </div>
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
  );
}
