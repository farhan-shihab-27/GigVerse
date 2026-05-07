// src/components/Navbar.jsx — Auth-Aware Navigation (English UI)
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Zap, Bell, Menu, X, LogIn, UserPlus, User, LogOut, Trophy, Home, ClipboardList } from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('gv_token');
    const userStr = localStorage.getItem('gv_user');
    setIsLoggedIn(!!token);
    if (userStr) { try { setUserName(JSON.parse(userStr).Name || ''); } catch { setUserName(''); } }
  }, []);

  const handleLogout = () => { localStorage.removeItem('gv_token'); localStorage.removeItem('gv_user'); setIsLoggedIn(false); setUserName(''); navigate('/auth'); };
  const handleSearch = (e) => { e.preventDefault(); };
  const initials = userName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link to="/home" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow duration-200"><Zap size={16} className="text-white fill-white" /></div>
            <span className="text-xl font-extrabold tracking-tight"><span className="text-gradient">Gig</span><span className="text-gray-900">Verse</span></span>
          </Link>
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all duration-200">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input id="navbar-search" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search gigs…" className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none" />
            <button type="submit" className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0 transition-colors">Search</button>
          </form>
          <div className="hidden md:flex items-center gap-2">
            <Link to="/home" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200"><Home size={14} /> Home</Link>
            <Link to="/leaderboard" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200"><Trophy size={14} /> Leaderboard</Link>
            {isLoggedIn ? (
              <>
                <Link to="/orders" className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200"><ClipboardList size={14} /> Orders</Link>
                <button id="nav-notifications" className="relative p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200" title="Notifications"><Bell size={18} /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white animate-pulse-soft" /></button>
                <Link to="/profile" id="nav-profile" className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all duration-200"><div className="w-7 h-7 bg-brand-gradient rounded-lg flex items-center justify-center text-white text-[10px] font-bold">{initials}</div><span className="text-xs font-semibold text-brand-700 max-w-[100px] truncate">{userName || 'Profile'}</span></Link>
                <button id="nav-logout" onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200" title="Logout"><LogOut size={14} /> Logout</button>
              </>
            ) : (
              <>
                <Link to="/auth" id="nav-login" className="btn-secondary !py-2 !px-4 !text-xs"><LogIn size={14} /> Log In</Link>
                <Link to="/auth?mode=signup" id="nav-signup" className="btn-primary !py-2 !px-4 !text-xs"><UserPlus size={14} /> Sign Up</Link>
              </>
            )}
          </div>
          <button id="nav-mobile-toggle" className="md:hidden p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 animate-slide-up space-y-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5"><Search size={15} className="text-gray-400 shrink-0" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search gigs…" className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" /></form>
          <div className="flex flex-col gap-2">
            <Link to="/home" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 rounded-lg" onClick={() => setMobileOpen(false)}><Home size={16} /> Home</Link>
            <Link to="/leaderboard" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 rounded-lg" onClick={() => setMobileOpen(false)}><Trophy size={16} /> Leaderboard</Link>
            {isLoggedIn && <Link to="/orders" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-brand-50 rounded-lg" onClick={() => setMobileOpen(false)}><ClipboardList size={16} /> My Orders</Link>}
          </div>
          {isLoggedIn ? (
            <div className="flex gap-3">
              <Link to="/profile" className="btn-secondary flex-1 !text-sm" onClick={() => setMobileOpen(false)}><User size={15} /> Profile</Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }} className="flex-1 flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold rounded-xl px-5 py-2.5 text-sm transition-all"><LogOut size={15} /> Logout</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link to="/auth" className="btn-secondary flex-1 !text-sm" onClick={() => setMobileOpen(false)}><LogIn size={15} /> Log In</Link>
              <Link to="/auth?mode=signup" className="btn-primary flex-1 !text-sm" onClick={() => setMobileOpen(false)}><UserPlus size={15} /> Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
