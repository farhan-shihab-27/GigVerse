// src/components/Navbar.jsx — Full-width, properly aligned navigation
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Zap, Bell, Menu, X, LogIn, UserPlus,
  User, LogOut, Trophy, Home, ClipboardList
} from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [userName, setUserName]       = useState('');
  const [profilePic, setProfilePic]   = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token   = localStorage.getItem('gv_token');
    const userStr = localStorage.getItem('gv_user');
    setIsLoggedIn(!!token);
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserName(u.Name || '');
        setProfilePic(u.ProfilePicUrl || '');
      } catch { setUserName(''); }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('gv_token');
    localStorage.removeItem('gv_user');
    setIsLoggedIn(false); setUserName('');
    navigate('/auth');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?skill=${encodeURIComponent(searchQuery)}`);
  };

  const initials = (userName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const NavLink = ({ to, icon: Icon, label }) => (
    <Link to={to}
      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-150 whitespace-nowrap">
      <Icon size={14} />{label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      {/* ── Desktop layout ── */}
      <div className="hidden md:flex items-center h-16 px-4 lg:px-6 gap-3 w-full">

        {/* Logo — shrink-0 left anchor */}
        <Link to="/home" className="flex items-center gap-2 shrink-0 group mr-2">
          <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow duration-200">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            <span className="text-gradient">Gig</span>
            <span className="text-gray-900">Verse</span>
          </span>
        </Link>

        {/* Search bar — flex-1 pushes nav links to the right */}
        <form onSubmit={handleSearch}
          className="flex-1 max-w-lg flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all duration-200">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            id="navbar-search" type="text" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Search gigs, skills, contributors...'
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} className="text-gray-300 hover:text-gray-500">
              <X size={12} />
            </button>
          )}
        </form>

        {/* Spacer keeps nav links at the far right */}
        <div className="flex-1" />

        {/* Nav links */}
        <nav className="flex items-center gap-0.5">
          <NavLink to="/home"        icon={Home}          label="Home" />
          <NavLink to="/leaderboard" icon={Trophy}        label="Leaderboard" />
          {isLoggedIn && <NavLink to="/orders" icon={ClipboardList} label="Orders" />}
        </nav>

        {isLoggedIn ? (
          <div className="flex items-center gap-1 pl-2 border-l border-gray-200 ml-1">
            {/* Bell */}
            <button id="nav-notifications" title="Notifications"
              className="relative p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-150">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Avatar / Profile */}
            <Link to="/profile" id="nav-profile"
              className="flex items-center gap-2 px-2.5 py-1.5 bg-brand-50 hover:bg-brand-100 rounded-xl transition-all duration-150">
              <div className="w-7 h-7 rounded-lg overflow-hidden bg-brand-gradient flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                {profilePic
                  ? <img src={profilePic} alt="" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <span className="text-xs font-semibold text-brand-700 max-w-[90px] truncate">{userName || 'Profile'}</span>
            </Link>

            {/* Logout — extreme right */}
            <button id="nav-logout" onClick={handleLogout} title="Sign Out"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-150">
              <LogOut size={14} />Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 ml-1">
            <Link to="/auth"             id="nav-login"  className="btn-secondary !py-2 !px-4 !text-xs"><LogIn size={13} />Log In</Link>
            <Link to="/auth?mode=signup" id="nav-signup" className="btn-primary !py-2 !px-4 !text-xs"><UserPlus size={13} />Sign Up</Link>
          </div>
        )}
      </div>

      {/* ── Mobile header ── */}
      <div className="md:hidden flex items-center justify-between h-14 px-4">
        <Link to="/home" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-gradient rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-white fill-white" />
          </div>
          <span className="text-lg font-extrabold">
            <span className="text-gradient">Gig</span><span className="text-gray-900">Verse</span>
          </span>
        </Link>
        <button id="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 animate-slide-up">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search gigs..." className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400" />
          </form>
          <div className="flex flex-col gap-1">
            {[{ to:'/home', icon:Home, label:'Home' }, { to:'/leaderboard', icon:Trophy, label:'Leaderboard' }].map(({to,icon:Icon,label}) => (
              <Link key={to} to={to} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-brand-50 rounded-lg">
                <Icon size={15} />{label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link to="/orders" onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-brand-50 rounded-lg">
                <ClipboardList size={15} />My Orders
              </Link>
            )}
          </div>
          {isLoggedIn ? (
            <div className="flex gap-2 pt-1">
              <Link to="/profile" className="btn-secondary flex-1 !text-sm" onClick={() => setMobileOpen(false)}>
                <User size={14} />Profile
              </Link>
              <button onClick={() => { handleLogout(); setMobileOpen(false); }}
                className="flex-1 flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 hover:bg-red-50 font-semibold rounded-xl px-4 py-2.5 text-sm transition-all">
                <LogOut size={14} />Logout
              </button>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <Link to="/auth"             className="btn-secondary flex-1 !text-sm" onClick={() => setMobileOpen(false)}><LogIn size={14} />Log In</Link>
              <Link to="/auth?mode=signup" className="btn-primary flex-1 !text-sm"   onClick={() => setMobileOpen(false)}><UserPlus size={14} />Sign Up</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
