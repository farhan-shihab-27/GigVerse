// src/pages/PublicProfile.jsx — Public Portfolio with Gmail Web Contact Flow
// ────────────────────────────────────────────────────────────────────────────
// ARCHITECTURE:
//   Route:    /profile/:id  →  this component
//   Backend:  GET /api/users/public/:id  →  getPublicProfile()
//   Self:     /profile (no id)  →  Profile.jsx (separate component)
//
// DEFENSIVE LAYERS:
//   1. useCallback + AbortController prevents race conditions & stale closures
//   2. State-boundary normalization guarantees arrays before they reach JSX
//   3. Every render-path property uses optional chaining + fallback values
//   4. Error states keep the container alive — never crash to a blank screen
// ────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Zap, Star, Loader2, AlertCircle, CheckCircle2, Briefcase, Mail, ArrowLeft, User, RefreshCw } from 'lucide-react';
import api from '../lib/api';

export default function PublicProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Fetch — useCallback ensures stable identity across re-renders ────────
  // AbortController cancels in-flight requests if `id` changes mid-fetch,
  // preventing the "flash then crash" race condition.
  const fetchProfile = useCallback(async (signal) => {
    setLoading(true); setError(''); setUser(null);
    try {
      const res = await api.get(`/users/public/${id}`, { signal });

      // Debug trace — visible in DevTools, stripped in production builds
      console.log('[PublicProfile] API response for id=' + id + ':', res?.data);

      const profileData = res?.data?.data;

      // ── Guard: backend returned 200 but payload is empty or malformed ────
      if (!profileData || typeof profileData !== 'object' || !profileData.UserID) {
        setError('This profile could not be loaded. The user may have been deactivated.');
        setUser(null);
        return;
      }

      // ── State-boundary normalization ─────────────────────────────────────
      // Guarantee every nested collection is an array BEFORE it enters state.
      // This is the single source of truth — the JSX never needs to re-check.
      setUser({
        ...profileData,
        Name:        profileData.Name        || profileData.name        || 'Contributor',
        Gigs:        Array.isArray(profileData.Gigs)        ? profileData.Gigs        : [],
        Experiences: Array.isArray(profileData.Experiences) ? profileData.Experiences : [],
        Reviews:     Array.isArray(profileData.Reviews)     ? profileData.Reviews     : [],
      });
    } catch (err) {
      // AbortController cancellation — not an actual error, ignore silently
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;

      console.error('[PublicProfile] Fetch failed for id=' + id + ':', err);

      // ── Differentiate error types for user-friendly messaging ────────────
      const status = err?.response?.status;
      if (status === 404) {
        setError('This user profile was not found. They may have deactivated their account.');
      } else if (status === 500) {
        setError('The server encountered an error loading this profile. Please try again.');
      } else if (!err?.response) {
        setError('Network error — please check your connection and try again.');
      } else {
        setError('Failed to load profile details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Effect — fires on mount and when `id` param changes ──────────────────
  // Returns a cleanup function that aborts the previous request if `id` changes
  // before the first request completes (prevents the stale-data flash).
  useEffect(() => {
    const controller = new AbortController();
    fetchProfile(controller.signal);
    return () => controller.abort();
  }, [fetchProfile]);

  // ── Build Gmail Web Compose URL (bypasses broken native Outlook on Windows) ──
  const buildGmailComposeUrl = () => {
    if (!user) return '#';

    let clientName = 'A GigVerse Client';
    try {
      const stored = JSON.parse(localStorage.getItem('gv_user') || '{}');
      if (stored?.Name) clientName = stored.Name;
    } catch { /* fallback to default */ }

    const contributorName = user?.Name || 'Contributor';
    // Fallback chain: UiuEmail → PersonalEmail → empty string
    const contributorEmail = user?.UiuEmail || user?.PersonalEmail || '';

    const frontendUrl = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

    const subject = `[GigVerse Custom Project Request] - ${clientName}`;
    const body = `Dear ${contributorName},\n\nI recently viewed your profile on GigVerse and am very impressed with your offerings. I would like to initiate a conversation for a customized project with you.\n\nPlease click this link to access our secure workspace and accept the conversation request: ${frontendUrl}/dashboard/messages?initiate=true\n\nBest regards,\n${clientName}`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contributorEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleContact = () => {
    const token = localStorage.getItem('gv_token');
    if (!token) { window.location.href = '/auth'; return; }
    window.open(buildGmailComposeUrl(), '_blank', 'noopener,noreferrer');
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="text-brand-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading profile…</p>
      </div>
    </div>
  );

  // ── Error / empty state — with retry button so the user isn't stuck ──────
  if (error || !user) return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center">
      <AlertCircle size={48} className="text-red-400 mb-3" />
      <p className="text-gray-600 mb-4">{error || 'Profile not found.'}</p>
      <div className="flex items-center gap-3">
        <button onClick={() => fetchProfile()}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 px-4 py-2 rounded-xl border border-brand-200 hover:bg-brand-50 transition-all">
          <RefreshCw size={14} /> Try Again
        </button>
        <Link to="/home" className="btn-secondary">Back to Home</Link>
      </div>
    </div>
  );

  // ── Derived display values — triple-guarded ──────────────────────────────
  const displayName    = user?.Name || 'Contributor';
  const initials       = (displayName || '').split(' ').map(w => w?.[0] || '').join('').slice(0, 2).toUpperCase() || '??';
  const pvpPoints      = user?.PVP_Points ?? 0;
  const avgRating      = Number(user?.AverageRating || 0);
  const userBio        = user?.Bio || "This contributor hasn't written a bio yet.";
  const userGigs       = user?.Gigs || [];
  const userExperiences = user?.Experiences || [];
  const userReviews    = user?.Reviews || [];

  // ── Premium role + department formatter ──────────────────────────────────
  const formatRoleLabel = (roleName, deptName) => {
    const dept = deptName ? `Dept. of ${deptName}` : null;
    const rn = (roleName || '').toLowerCase();
    let prefix = 'Member';
    if (rn.includes('student')) prefix = 'Student';
    else if (rn.includes('alumni')) prefix = 'Alumni';
    else if (rn.includes('faculty')) prefix = 'Faculty';
    return dept ? `${prefix} — ${dept}` : prefix;
  };

  return (
    <main className="min-h-screen bg-gray-50 bg-dora-kata py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"><ArrowLeft size={16} /> Back to Dashboard</Link>

        {/* HERO SECTION */}
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-brand-gradient rounded-full flex items-center justify-center text-white text-3xl font-extrabold shrink-0 shadow-xl ring-4 ring-white overflow-hidden">
              {user?.ProfilePicUrl ? <img src={user.ProfilePicUrl} alt={displayName} className="w-full h-full rounded-full object-cover" /> : initials}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{displayName}</h1>
              <div className="mb-3">
                <span className="inline-block px-3 py-1 bg-brand-50 text-brand-600 font-bold text-sm rounded-full border border-brand-100 shadow-sm">
                  {formatRoleLabel(user?.RoleName, user?.DeptName || 'CSE')}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-gray-200"><Zap size={14} className="fill-brand-500 text-brand-500" />{pvpPoints} PVP</span>
                {avgRating > 0 && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-amber-200"><Star size={14} className="fill-amber-400" />{avgRating.toFixed(1)}</span>}
              </div>
              <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto md:mx-0">{userBio}</p>
            </div>
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <button onClick={handleContact} className="w-full md:w-auto py-3 px-8 rounded-xl font-bold text-white shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#f26522' }}>
                <Mail size={18} /> Contact for Custom Work
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: GIGS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-brand-500" /> Offerings & Gigs</h2>
              {userGigs.length === 0 ? (
                <div className="text-center py-8"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Briefcase size={20} className="text-gray-400" /></div><p className="text-gray-500 text-sm">No gigs available at the moment.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userGigs.map((gig, idx) => (
                    <Link to={`/gigs/${gig?.GigID}`} key={gig?.GigID || `gig-${idx}`} className="group block border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-brand transition-all bg-white">
                      {gig?.PrimaryImage && <div className="h-32 bg-gray-100 overflow-hidden"><img src={gig.PrimaryImage} alt={gig?.Title || 'Gig'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">{gig?.Title || 'Untitled Gig'}</h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-[10px] text-gray-400 font-medium">Starting at</span>
                          <span className="font-extrabold text-brand-600 text-sm">&#2547;{Number(gig?.BasePrice || 0).toLocaleString()}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: WORK RECORD */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4 flex items-center gap-2"><CheckCircle2 size={20} className="text-brand-500" /> Work Record</h2>
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Experiences</h3>
                {userExperiences.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No experiences listed.</p>
                ) : (
                  <div className="space-y-4">
                    {userExperiences.map((exp, i) => {
                      const sd = exp?.StartDate ? new Date(exp.StartDate).getFullYear() : '—';
                      const ed = exp?.EndDate ? new Date(exp.EndDate).getFullYear() : 'Present';
                      return (
                        <div key={i} className="relative pl-4 border-l-2 border-brand-100">
                          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-500" />
                          <h4 className="text-sm font-bold text-gray-900">{exp?.Title || 'Untitled'}</h4>
                          <p className="text-xs text-brand-600 font-medium">{exp?.Company || ''}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{sd} — {ed}</p>
                          {exp?.Description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{exp.Description}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Reviews</h3>
                {userReviews.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {userReviews.map((rev, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden shrink-0">
                            {rev?.ReviewerPic ? <img src={rev.ReviewerPic} className="w-full h-full object-cover" /> : <User size={12} className="m-auto mt-1 text-gray-400" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-900">{rev?.ReviewerName || 'Anonymous'}</p>
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} size={8} className={j < (rev?.Rating || 0) ? "fill-amber-400" : "fill-gray-200 text-gray-200"} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {rev?.Comment && <p className="text-xs text-gray-600 italic line-clamp-2">"{rev.Comment}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
