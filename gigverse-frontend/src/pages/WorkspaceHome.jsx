// src/pages/WorkspaceHome.jsx — Authenticated 3-column Workspace
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Briefcase, MessageSquare,
  Trophy, Wallet, Search, Bell, Star, Zap, LogOut,
  User, TrendingUp, Loader2, AlertCircle, ImageOff,
  ChevronRight, Tag, X
} from 'lucide-react';
import { gigAPI, userAPI, searchAPI } from '../lib/api';

// ── Sidebar nav items ────────────────────────────────────────────────────────
const NAV = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/home' },
  { icon: ClipboardList,   label: 'My Orders',  to: '/orders' },
  { icon: Briefcase,       label: 'My Gigs',    to: '/search' },
  { icon: MessageSquare,   label: 'Messages',   to: '/home', badge: 0 },
  { icon: Trophy,          label: 'Leaderboard',to: '/leaderboard' },
  { icon: Wallet,          label: 'PVP Wallet', to: '/home' },
];

const CATEGORIES = ['All', 'Development', 'Design', 'Writing', 'Marketing', 'Tutoring'];

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDeb(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return deb;
}

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [gigs, setGigs]             = useState([]);
  const [gigsLoading, setGigsLoading] = useState(true);
  const [activeCategory, setActiveCat] = useState('All');
  const [query, setQuery]           = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [sugLoading, setSugLoading] = useState(false);
  const [showSug, setShowSug]       = useState(false);
  const [notifications]             = useState([
    { id:1, text:'Your order #42 has been delivered.',  time:'2m ago' },
    { id:2, text:'New review posted on your gig.',      time:'1h ago' },
    { id:3, text:'You received 50 PVP points!',         time:'3h ago' },
  ]);
  const searchRef = useRef();
  const debQuery  = useDebounce(query, 300);

  const user = (() => { try { return JSON.parse(localStorage.getItem('gv_user')) || {}; } catch { return {}; } })();
  const initials = (user.Name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    userAPI.getMyProfile().then(r => setProfile(r.data.data)).catch(() => {});
  }, []);

  // ── Fetch gigs ────────────────────────────────────────────────────────────
  useEffect(() => {
    setGigsLoading(true);
    gigAPI.getAll(12).then(r => setGigs(r.data.data || [])).catch(() => {}).finally(() => setGigsLoading(false));
  }, []);

  // ── Autocomplete ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (debQuery.length < 2) { setSuggestions([]); return; }
    setSugLoading(true);
    searchAPI.autocomplete(debQuery)
      .then(r => setSuggestions(r.data.data || []))
      .catch(() => setSuggestions([]))
      .finally(() => setSugLoading(false));
  }, [debQuery]);

  const handleSugClick = (item) => {
    setShowSug(false); setQuery('');
    if (item.type === 'user') navigate(`/profile/${item.id}`);
    else navigate(`/search?skill=${encodeURIComponent(item.label)}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('gv_token'); localStorage.removeItem('gv_user');
    navigate('/auth');
  };

  const filteredGigs = activeCategory === 'All' ? gigs : gigs.filter(g =>
    g.CategoryName === activeCategory || g.DeptName?.includes(activeCategory)
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0d0d14', fontFamily: "'Inter', sans-serif" }}>

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────────── */}
      <aside className="w-64 flex flex-col shrink-0 border-r"
        style={{ background: 'linear-gradient(180deg, #0f0f1c 0%, #130c06 100%)', borderColor: 'rgba(255,255,255,0.06)' }}>

        {/* Logo */}
        <div className="px-6 py-5 border-b flex items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, #f26522, #d95315)', boxShadow: '0 4px 12px rgba(242,101,34,0.4)' }}>
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight">
            <span style={{ background: 'linear-gradient(135deg, #f26522, #f97316)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Gig</span>
            <span className="text-white">Verse</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ icon: Icon, label, to, badge }) => {
            const active = window.location.pathname === to && label === 'Dashboard';
            return (
              <Link key={label} to={to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group"
                style={{
                  color: active ? '#f97316' : 'rgba(255,255,255,0.45)',
                  background: active ? 'rgba(242,101,34,0.12)' : 'transparent',
                }}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full" style={{ background: '#f26522' }} />}
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
                {badge > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#f26522', color: '#fff' }}>{badge}</span>
                )}
                <span className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ color: 'rgba(239,68,68,0.6)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={15} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── CENTER FEED ───────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <div className="px-6 py-4 border-b flex items-center gap-4 shrink-0"
          style={{ background: 'rgba(13,13,20,0.95)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(10px)' }}>

          {/* Search bar */}
          <div className="flex-1 relative" ref={searchRef}>
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              onFocus={() => setShowSug(true)}>
              <Search size={15} style={{ color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="text" value={query}
                onChange={e => { setQuery(e.target.value); setShowSug(true); }}
                onFocus={() => setShowSug(true)}
                onBlur={() => setTimeout(() => setShowSug(false), 150)}
                placeholder="Search gigs, skills, contributors..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
                style={{ color: 'rgba(255,255,255,0.8)', caretColor: '#f26522' }}
              />
              {query && (
                <button onClick={() => { setQuery(''); setSuggestions([]); }} style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <X size={13} />
                </button>
              )}
              {sugLoading && <Loader2 size={13} className="animate-spin" style={{ color: '#f26522' }} />}
            </div>

            {/* Suggestions dropdown */}
            {showSug && (query.length >= 2) && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                style={{ background: 'rgba(15,15,28,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)' }}>
                {suggestions.length === 0 && !sugLoading && (
                  <div className="px-5 py-4 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No results for "{query}"</div>
                )}
                {suggestions.map((item, i) => (
                  <button key={i} onMouseDown={() => handleSugClick(item)}
                    className="flex items-center gap-3 w-full px-5 py-3 text-left transition-colors duration-100"
                    style={{ borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(242,101,34,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: item.type === 'user' ? 'rgba(242,101,34,0.15)' : 'rgba(255,255,255,0.07)' }}>
                      {item.type === 'user' ? <User size={13} style={{ color: '#f97316' }} /> : <Tag size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{item.label}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{item.sub} · {item.type === 'user' ? 'Contributor' : 'Skill'}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <button className="relative p-2.5 rounded-xl transition-colors duration-150"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <Bell size={16} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-500 ring-2" style={{ ringColor: '#0d0d14' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>

          {/* Category chips */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {CATEGORIES.map(cat => (
              <button key={cat} onClick={() => setActiveCat(cat)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-150"
                style={{
                  background: activeCategory === cat ? 'rgba(242,101,34,0.2)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${activeCategory === cat ? 'rgba(242,101,34,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: activeCategory === cat ? '#f97316' : 'rgba(255,255,255,0.4)',
                }}>
                {cat}
              </button>
            ))}
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-white">Gig Discovery</h2>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Latest services from UIU contributors</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#f97316' }}>
              <TrendingUp size={13} />Trending
            </div>
          </div>

          {/* Gigs grid */}
          {gigsLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin" style={{ color: '#f26522' }} />
            </div>
          )}
          {!gigsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredGigs.length === 0 ? (
                <div className="col-span-full flex flex-col items-center py-16 gap-3">
                  <ImageOff size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No gigs in this category yet.</p>
                </div>
              ) : filteredGigs.map(gig => {
                const initials2 = (gig.ContributorName || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
                return (
                  <Link to={`/profile/${gig.ContributorID}`} key={gig.GigID}
                    className="rounded-2xl overflow-hidden group transition-all duration-200 hover:-translate-y-1 block"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 2px 20px rgba(0,0,0,0.2)' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(242,101,34,0.3)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(242,101,34,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.boxShadow = '0 2px 20px rgba(0,0,0,0.2)'; }}>
                    {/* Gig image */}
                    {gig.PrimaryImage ? (
                      <div className="w-full h-36 overflow-hidden">
                        <img src={gig.PrimaryImage} alt={gig.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(242,101,34,0.08), rgba(242,101,34,0.03))' }}>
                        <Briefcase size={32} style={{ color: 'rgba(242,101,34,0.2)' }} />
                      </div>
                    )}
                    <div className="p-4">
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-2"
                        style={{ background: 'rgba(242,101,34,0.12)', color: '#f97316' }}>
                        {gig.DeptName || 'Campus'}
                      </span>
                      <h3 className="text-sm font-semibold mb-3 line-clamp-2 leading-snug" style={{ color: 'rgba(255,255,255,0.85)' }}>{gig.Title}</h3>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #f26522, #d95315)' }}>
                          {gig.ProfilePicUrl ? <img src={gig.ProfilePicUrl} alt="" className="w-full h-full rounded-full object-cover" /> : initials2}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{gig.ContributorName}</p>
                          <p className="text-[10px] font-semibold" style={{ color: '#f97316' }}>{gig.PVP_Points} PVP</p>
                        </div>
                        {gig.AverageRating > 0 && (
                          <div className="ml-auto flex items-center gap-1">
                            <Star size={11} className="fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>{Number(gig.AverageRating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Starting at</span>
                        <span className="text-sm font-extrabold" style={{ color: '#f97316' }}>&#2547;{Number(gig.BasePrice).toLocaleString()}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside className="w-72 shrink-0 border-l overflow-y-auto"
        style={{ background: 'rgba(13,13,20,0.9)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-6 space-y-5">

          {/* Mini Profile Card */}
          <div className="rounded-2xl p-5 text-center"
            style={{ background: 'linear-gradient(135deg, rgba(242,101,34,0.12) 0%, rgba(242,101,34,0.04) 100%)', border: '1px solid rgba(242,101,34,0.2)' }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-extrabold mx-auto mb-3 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f26522, #d95315)', boxShadow: '0 4px 20px rgba(242,101,34,0.4)' }}>
              {profile?.ProfilePicUrl
                ? <img src={profile.ProfilePicUrl} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            <h3 className="text-sm font-bold text-white mb-0.5">{profile?.Name || user.Name || 'Loading...'}</h3>
            <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>{profile?.RoleName} · {profile?.DeptCode}</p>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-extrabold" style={{ color: '#f97316' }}>{profile?.PVP_Points ?? '—'}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>PVP Points</p>
              </div>
              <div className="rounded-xl p-2.5 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-lg font-extrabold" style={{ color: '#fbbf24' }}>{profile ? Number(profile.AverageRating).toFixed(1) : '—'}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Avg Rating</p>
              </div>
            </div>

            {profile?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                {profile.skills.slice(0, 3).map(s => (
                  <span key={s.SkillID} className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(242,101,34,0.15)', color: '#f97316', border: '1px solid rgba(242,101,34,0.25)' }}>
                    {s.SkillName}
                  </span>
                ))}
                {profile.skills.length > 3 && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                    +{profile.skills.length - 3} more
                  </span>
                )}
              </div>
            )}

            <Link to="/profile" className="mt-4 flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-semibold transition-colors duration-150"
              style={{ background: 'rgba(242,101,34,0.12)', color: '#f97316', border: '1px solid rgba(242,101,34,0.25)' }}>
              <User size={12} />View Full Profile
            </Link>
          </div>

          {/* Notifications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>Recent Activity</h3>
              <Bell size={13} style={{ color: 'rgba(255,255,255,0.25)' }} />
            </div>
            <div className="space-y-2">
              {notifications.map(n => (
                <div key={n.id} className="px-4 py-3 rounded-xl transition-colors duration-150 cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>{n.text}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{n.time}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Platform Pulse</h3>
            {[
              { label: 'Active Gigs', value: gigs.length },
              { label: 'Skills Tracked', value: profile?.skills?.length ?? 0 },
              { label: 'Top PVP Score', value: '1,240' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{item.label}</span>
                <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
