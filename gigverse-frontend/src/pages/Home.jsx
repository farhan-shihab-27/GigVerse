// src/pages/Home.jsx — Smart Router: Workspace for auth users, Marketing for guests
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, Zap, Code2, Palette, PenLine, Megaphone, GraduationCap,
  Camera, BarChart3, Music, TrendingUp, Star, Users, ShieldCheck,
  ArrowRight, Loader2, AlertCircle, ImageOff
} from 'lucide-react';
import CategoryCard from '../components/CategoryCard';
import { gigAPI, userAPI } from '../lib/api';
import WorkspaceHome from './WorkspaceHome';
import ProfileCompletionModal from '../components/ProfileCompletionModal';

const CATEGORIES = [
  { id: 1, title: 'Web Development', icon: Code2, gigCount: 24, color: '#3b82f6' },
  { id: 2, title: 'Graphic Design', icon: Palette, gigCount: 18, color: '#f97316' },
  { id: 3, title: 'Content Writing', icon: PenLine, gigCount: 12, color: '#10b981' },
  { id: 4, title: 'Digital Marketing', icon: Megaphone, gigCount: 9, color: '#8b5cf6' },
  { id: 5, title: 'Academic Tutoring', icon: GraduationCap, gigCount: 31, color: '#f59e0b' },
  { id: 6, title: 'Photography', icon: Camera, gigCount: 7, color: '#ec4899' },
  { id: 7, title: 'Data Analysis', icon: BarChart3, gigCount: 11, color: '#06b6d4' },
  { id: 8, title: 'Music & Audio', icon: Music, gigCount: 5, color: '#84cc16' },
];

const STATS = [
  { icon: Users, value: '200+', label: 'Active Contributors' },
  { icon: Zap, value: '500+', label: 'Completed Gigs' },
  { icon: Star, value: '4.8', label: 'Avg. Rating' },
  { icon: ShieldCheck, value: '100%', label: 'Secure Escrow' },
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Auth / profile completion state
  const [isLoggedIn] = useState(() => Boolean(localStorage.getItem('gv_token')));
  const [showCompletion, setShowCompletion] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const userName = (() => { try { return JSON.parse(localStorage.getItem('gv_user'))?.Name || ''; } catch { return ''; } })();

  // For logged-in users: check profile completeness on mount
  useEffect(() => {
    if (!isLoggedIn) { setProfileChecked(true); return; }
    userAPI.getProfileStatus()
      .then(r => { if (!r.data.data.isComplete) setShowCompletion(true); })
      .catch(() => {})
      .finally(() => setProfileChecked(true));
  }, [isLoggedIn]);

  // If authenticated, render workspace (with optional onboarding overlay)
  if (isLoggedIn && profileChecked) {
    return (
      <>
        <WorkspaceHome />
        {showCompletion && (
          <ProfileCompletionModal
            userName={userName}
            onComplete={() => setShowCompletion(false)}
          />
        )}
      </>
    );
  }

  // Loading state while checking auth
  if (isLoggedIn && !profileChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0d0d14' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#f26522' }} />
      </div>
    );
  }

  // ── Anonymous marketing landing page (unchanged) ──────────────────────────

  const fetchGigs = async () => {
    setLoading(true); setError('');
    try { const res = await gigAPI.getAll(12); setGigs(res.data.data || []); }
    catch { setError('Failed to load gigs. Please try again.'); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchGigs(); }, []);

  const navigate = useNavigate();
  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?skill=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <main className="min-h-screen bg-white bg-dora-kata">
      {/* HERO */}
      <section className="relative bg-gradient-to-br from-brand-50 via-white to-orange-50 bg-dora-kata overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-100 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-orange-100 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/4 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-brand-100 text-brand-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 animate-fade-in">
            <Zap size={12} className="fill-brand-500" /> UIU’s Campus Freelance Platform
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight mb-5 animate-slide-up">
            Collaborate With <span className="text-[#f26522] drop-shadow-md">UIU’s Exceptional Minds</span><br />and Innovators
          </h1>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed">
            Seamlessly connect with credentialed professionals within the UIU community. Browse portfolios for software innovation, engineering & design, and business solutions to easily find and engage with top-tier campus talent.
          </p>
          <form onSubmit={handleHeroSearch} className="relative max-w-2xl mx-auto animate-slide-up">
            <div className="flex items-center bg-white border-2 border-gray-200 hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 rounded-2xl shadow-lg transition-all duration-300 overflow-hidden">
              <Search size={18} className="text-gray-400 ml-5 shrink-0" />
              <input id="hero-search-input" type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search "Logo Design", "Web Dev", "Math Tutoring"…'
                className="flex-1 py-4 px-4 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none" />
              <button id="hero-search-btn" type="submit" className="btn-primary !rounded-none !rounded-r-xl !py-4 !px-6 m-0 text-sm">Search</button>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <span className="text-xs text-gray-400">Popular:</span>
              {['Logo Design', 'React Developer', 'Blog Writing', 'Math Tutor'].map((s) => (
                <button key={s} type="button" onClick={() => setSearchQuery(s)} className="text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-full font-medium transition-colors duration-150">{s}</button>
              ))}
            </div>
          </form>
          <div className="flex items-center justify-center gap-4 mt-8 animate-fade-in">
            <Link to="/auth?mode=signup" className="btn-primary !px-6 !py-3">Get Started Free <ArrowRight size={16} /></Link>
            <Link to="/leaderboard" className="btn-secondary !px-6 !py-3">View Leaderboard</Link>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-0 md:divide-x md:divide-gray-100">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center text-center px-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-2"><stat.icon size={18} className="text-brand-500" /></div>
                <span className="text-2xl font-extrabold text-gray-900">{stat.value}</span>
                <span className="text-xs text-gray-400 mt-0.5">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Browse by <span className="text-gradient">Category</span></h2>
            <p className="text-gray-400 text-sm mt-1">Find the right service for your needs</p>
          </div>
          <button className="text-sm font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors">View All <ArrowRight size={14} /></button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{CATEGORIES.map((cat) => <CategoryCard key={cat.id} {...cat} />)}</div>
      </section>

      {/* FEATURED GIGS */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">Recent <span className="text-gradient">Gigs</span></h2>
              <p className="text-gray-400 text-sm mt-1">Top services from verified UIU contributors</p>
            </div>
            <div className="flex items-center gap-1 text-brand-500 text-xs font-semibold"><TrendingUp size={14} /> Trending</div>
          </div>
          {loading && (<div className="flex items-center justify-center py-16"><Loader2 size={28} className="text-brand-500 animate-spin" /><span className="ml-3 text-gray-400 text-sm">Loading gigs…</span></div>)}
          {error && !loading && (<div className="flex flex-col items-center py-12"><AlertCircle size={36} className="text-red-400 mb-3" /><p className="text-gray-500 text-sm mb-3">{error}</p><button onClick={fetchGigs} className="btn-secondary !text-xs">Try Again</button></div>)}
          {!loading && !error && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {gigs.length === 0 ? (<div className="col-span-full text-center py-12"><ImageOff size={36} className="text-gray-300 mx-auto mb-3" /><p className="text-gray-400 text-sm">No gigs available yet.</p></div>) : (
                gigs.map((gig) => {
                  const initials = gig.ContributorName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
                  return (
                    <Link to={`/profile/${gig.ContributorID}`} key={gig.GigID} id={`gig-card-${gig.GigID}`} className="card p-5 hover:-translate-y-1 hover:shadow-brand hover:border-brand-100 cursor-pointer transition-all duration-200 group block">
                      {gig.PrimaryImage && (<div className="w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-100"><img src={gig.PrimaryImage} alt={gig.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>)}
                      <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-brand-50 text-brand-600 px-2.5 py-0.5 rounded-full mb-3">{gig.DeptName || 'Campus'}</span>
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-3 line-clamp-2">{gig.Title}</h3>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 bg-brand-gradient rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0">{gig.ProfilePicUrl ? <img src={gig.ProfilePicUrl} alt={gig.ContributorName} className="w-full h-full rounded-full object-cover" /> : initials}</div>
                        <div><p className="text-xs font-medium text-gray-800">{gig.ContributorName}</p><p className="text-[10px] text-brand-500 font-semibold">⚡ {gig.PVP_Points} PVP</p></div>
                      </div>
                      {gig.AverageRating > 0 && (<div className="flex items-center gap-1 mb-4"><Star size={12} className="text-amber-400 fill-amber-400" /><span className="text-xs font-semibold text-gray-800">{Number(gig.AverageRating).toFixed(1)}</span></div>)}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-[10px] text-gray-400 font-medium">Starting at</span>
                        <span className="text-brand-600 font-extrabold text-sm">&#2547;{Number(gig.BasePrice).toLocaleString()}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-extrabold text-gray-900">How <span className="text-gradient">GigVerse</span> Works</h2>
          <p className="text-gray-400 text-sm mt-2">Get your project done in three simple steps</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Search or Post', desc: 'Find talent or post your requirements. Filter by category, price, and PVP rating.', icon: Search },
            { step: '02', title: 'Order & Escrow', desc: 'Place a secure order. Your payment is safely held in escrow until delivery.', icon: ShieldCheck },
            { step: '03', title: 'Deliver & Release', desc: 'Review the work, approve it, and payment is automatically released.', icon: Zap },
          ].map((item) => (
            <div key={item.step} className="text-center group">
              <div className="relative inline-flex">
                <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:bg-brand-500 transition-colors duration-300"><item.icon size={26} className="text-brand-500 group-hover:text-white transition-colors duration-300" /></div>
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-brand-gradient text-white text-[10px] font-extrabold rounded-full flex items-center justify-center">{item.step}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="bg-brand-gradient py-14">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-3">Ready to Start Earning on Campus?</h2>
          <p className="text-brand-100 text-sm mb-8">Join GigVerse as a contributor, list your skills, and start earning Peer Value Points today.</p>
          <Link to="/auth?mode=signup" className="inline-flex items-center gap-2 bg-white text-brand-600 font-bold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors duration-200 shadow-lg text-sm">Become a Contributor <ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2"><div className="w-6 h-6 bg-brand-gradient rounded-md flex items-center justify-center"><Zap size={11} className="text-white fill-white" /></div><span className="font-bold text-sm"><span className="text-gradient">Gig</span><span className="text-gray-900">Verse</span></span></div>
          <p className="text-xs text-gray-400">© 2026 GigVerse. Exclusively for <span className='text-[#f26522] font-semibold'>United International University</span>.</p>
        </div>
      </footer>
    </main>
  );
}
