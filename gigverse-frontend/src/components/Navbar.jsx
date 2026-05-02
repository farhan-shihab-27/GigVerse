// src/components/Navbar.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Zap, Bell, ChevronDown,
  Menu, X, LogIn, UserPlus
} from 'lucide-react';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // ── Handler: Search ──────────────────────────────────────
  // TODO (Phase 3): Replace with GET /api/search?q={searchQuery}
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    console.log('[Navbar] Search query:', searchQuery);
    // navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">

          {/* ── Brand Logo ─────────────────────────────────── */}
          <Link to="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 bg-brand-gradient rounded-lg flex items-center justify-center shadow-brand group-hover:shadow-brand-lg transition-shadow duration-200">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              <span className="text-gradient">Gig</span>
              <span className="text-gray-900">Verse</span>
            </span>
          </Link>

          {/* ── Search Bar (desktop) ────────────────────────── */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-xl items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all duration-200"
          >
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              id="navbar-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for logo design, web dev, writing…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 shrink-0 transition-colors"
            >
              Search
            </button>
          </form>

          {/* ── Desktop Actions ─────────────────────────────── */}
          <div className="hidden md:flex items-center gap-3">
            <button
              id="nav-notifications"
              className="relative p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all duration-200"
              title="Notifications"
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white animate-pulse-soft" />
            </button>

            <Link
              to="/auth"
              id="nav-login"
              className="btn-secondary !py-2 !px-4 !text-xs"
            >
              <LogIn size={14} />
              Log In
            </Link>

            <Link
              to="/auth?mode=signup"
              id="nav-signup"
              className="btn-primary !py-2 !px-4 !text-xs"
            >
              <UserPlus size={14} />
              Sign Up
            </Link>
          </div>

          {/* ── Mobile Hamburger ────────────────────────────── */}
          <button
            id="nav-mobile-toggle"
            className="md:hidden p-2 text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 animate-slide-up space-y-3">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search gigs…"
              className="flex-1 bg-transparent text-sm focus:outline-none placeholder-gray-400"
            />
          </form>
          <div className="flex gap-3">
            <Link
              to="/auth"
              className="btn-secondary flex-1 !text-sm"
              onClick={() => setMobileOpen(false)}
            >
              <LogIn size={15} /> Log In
            </Link>
            <Link
              to="/auth?mode=signup"
              className="btn-primary flex-1 !text-sm"
              onClick={() => setMobileOpen(false)}
            >
              <UserPlus size={15} /> Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
