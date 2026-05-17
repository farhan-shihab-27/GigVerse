// src/components/Navbar.jsx — Full-width, properly aligned navigation
// Integrates the glassmorphic NotificationBell component.
// Search bar now uses the reusable DynamicSearch component for live suggestions.
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap, Menu, X, LogIn, UserPlus,
  User, LogOut, Trophy, Home, ClipboardList
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import DynamicSearch from './DynamicSearch';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
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

        {/* Search bar — DynamicSearch replaces the dead input */}
        <DynamicSearch
          className="flex-1 max-w-lg"
          compact={true}
          placeholder="Search gigs, skills, contributors..."
        />

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
            {/* Notification Bell (Glassmorphic) */}
            <NotificationBell />

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
        <div className="flex items-center gap-1">
          {isLoggedIn && <NotificationBell />}
          <button id="nav-mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 animate-slide-up">
          {/* DynamicSearch for mobile drawer too */}
          <DynamicSearch compact={true} placeholder="Search gigs..." />

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
