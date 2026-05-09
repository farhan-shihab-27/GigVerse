import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Zap, Star, Loader2, AlertCircle, CheckCircle2, Briefcase, Mail, ArrowLeft, ArrowRight, MessageSquare, User } from 'lucide-react';
import api from '../lib/api';

export default function PublicProfile() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get(`/users/public/${id}`);
      setUser(res.data.data);
    } catch (err) {
      setError('Failed to load profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleContact = () => {
    if (user?.WhatsAppNumber) {
      const phone = user.WhatsAppNumber.replace(/[^0-9+]/g, '');
      const msg = encodeURIComponent("Hi! I found your portfolio on GigVerse. I'm interested in discussing a custom project with you.");
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else if (user?.PersonalEmail) {
      window.location.href = `mailto:${user.PersonalEmail}?subject=GigVerse Custom Project Inquiry`;
    } else {
      alert("No contact information available for this contributor.");
    }
  };

  if (loading) return (<div className="min-h-[70vh] flex items-center justify-center"><Loader2 size={36} className="text-brand-500 animate-spin" /></div>);
  if (error || !user) return (<div className="min-h-[70vh] flex flex-col items-center justify-center"><AlertCircle size={48} className="text-red-400 mb-3" /><p className="text-gray-600">{error || 'Profile not found.'}</p><Link to="/home" className="btn-secondary mt-4">Back to Home</Link></div>);

  const initials = user.Name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <main className="min-h-screen bg-gray-50 bg-dora-kata py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-600 transition-colors"><ArrowLeft size={16} /> Back to Dashboard</Link>

        {/* HERO SECTION */}
        <div className="card p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10">
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-brand-gradient rounded-full flex items-center justify-center text-white text-3xl font-extrabold shrink-0 shadow-xl ring-4 ring-white">
              {user.ProfilePicUrl ? <img src={user.ProfilePicUrl} alt={user.Name} className="w-full h-full rounded-full object-cover" /> : initials}
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2">{user.Name}</h1>
              <div className="mb-3">
                <span className="inline-block px-3 py-1 bg-brand-50 text-brand-600 font-bold text-sm rounded-full border border-brand-100 shadow-sm">
                  {Number(user.RoleID) === 1 ? 'Current Student' : Number(user.RoleID) === 2 ? 'Alumni' : Number(user.RoleID) === 3 ? 'Faculty' : 'Member'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 bg-gray-50 text-gray-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-gray-200"><Zap size={14} className="fill-brand-500 text-brand-500" />{user.PVP_Points} PVP</span>
                {user.AverageRating > 0 && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-amber-200"><Star size={14} className="fill-amber-400" />{Number(user.AverageRating).toFixed(1)}</span>}
              </div>
              <p className="text-gray-600 leading-relaxed max-w-2xl mx-auto md:mx-0">{user.Bio || "This contributor hasn't written a bio yet."}</p>
            </div>
            <div className="w-full md:w-auto mt-4 md:mt-0">
              <button onClick={handleContact} className="w-full md:w-auto py-3 px-8 rounded-xl font-bold text-white shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all flex items-center justify-center gap-2" style={{ backgroundColor: '#f26522' }}>
                <MessageSquare size={18} /> Contact for Custom Work
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: GIGS */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-6 flex items-center gap-2"><Briefcase size={20} className="text-brand-500" /> Offerings & Gigs</h2>
              {(!user.Gigs || user.Gigs.length === 0) ? (
                <div className="text-center py-8"><div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3"><Briefcase size={20} className="text-gray-400" /></div><p className="text-gray-500 text-sm">No gigs available at the moment.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {user.Gigs.map(gig => (
                    <Link to={`/gigs/${gig.GigID}`} key={gig.GigID} className="group block border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-brand transition-all bg-white">
                      {gig.PrimaryImage && <div className="h-32 bg-gray-100 overflow-hidden"><img src={gig.PrimaryImage} alt={gig.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /></div>}
                      <div className="p-4">
                        <h3 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 group-hover:text-brand-600 transition-colors">{gig.Title}</h3>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                          <span className="text-[10px] text-gray-400 font-medium">Starting at</span>
                          <span className="font-extrabold text-brand-600 text-sm">&#2547;{Number(gig.BasePrice).toLocaleString()}</span>
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
                {(!user.Experiences || user.Experiences.length === 0) ? (
                  <p className="text-sm text-gray-500 italic">No experiences listed.</p>
                ) : (
                  <div className="space-y-4">
                    {user.Experiences.map((exp, i) => {
                      const sd = new Date(exp.StartDate).getFullYear();
                      const ed = exp.EndDate ? new Date(exp.EndDate).getFullYear() : 'Present';
                      return (
                        <div key={i} className="relative pl-4 border-l-2 border-brand-100">
                          <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-brand-500" />
                          <h4 className="text-sm font-bold text-gray-900">{exp.Title}</h4>
                          <p className="text-xs text-brand-600 font-medium">{exp.Company}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{sd} — {ed}</p>
                          {exp.Description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{exp.Description}</p>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Recent Reviews</h3>
                {(!user.Reviews || user.Reviews.length === 0) ? (
                  <p className="text-sm text-gray-500 italic">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {user.Reviews.map((rev, i) => (
                      <div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 bg-gray-200 rounded-full overflow-hidden shrink-0">
                            {rev.ReviewerPic ? <img src={rev.ReviewerPic} className="w-full h-full object-cover" /> : <User size={12} className="m-auto mt-1 text-gray-400" />}
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-900">{rev.ReviewerName}</p>
                            <div className="flex text-amber-400">
                              {[...Array(5)].map((_, j) => (
                                <Star key={j} size={8} className={j < rev.Rating ? "fill-amber-400" : "fill-gray-200 text-gray-200"} />
                              ))}
                            </div>
                          </div>
                        </div>
                        {rev.Comment && <p className="text-xs text-gray-600 italic line-clamp-2">"{rev.Comment}"</p>}
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
