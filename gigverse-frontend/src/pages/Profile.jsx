// src/pages/Profile.jsx — User Profile Dashboard with Gig CRUD
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Phone, CreditCard, Award, Star, Edit3, Save,
  X, Zap, Calendar, FileText, Shield, CheckCircle2, AlertCircle,
  Loader2, ClipboardList, Trash2, RefreshCw, Briefcase, Plus, Pencil, ImageOff, Wallet
} from 'lucide-react';
import { userAPI, gigAPI } from '../lib/api';
import DeleteAccountModal from '../components/DeleteAccountModal';
import GigFormModal from '../components/GigFormModal';
import toast from 'react-hot-toast';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [form, setForm] = useState({
    name: '', bio: '', dob: '',
    whatsAppNumber: '', bkashNumber: '', bankAccountDetails: '',
  });

  // ── Gig CRUD State ────────────────────────────────────────────────────────
  const [myGigs, setMyGigs]           = useState([]);
  const [gigsLoading, setGigsLoading] = useState(true);
  const [showGigModal, setShowGigModal] = useState(false);
  const [editingGig, setEditingGig]   = useState(null); // null = create mode

  // ── Fetch profile — useCallback MUST be declared BEFORE the useEffect ──────
  const fetchProfile = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res  = await userAPI.getMyProfile();
      const data = res?.data?.data;
      if (!data) throw new Error('Empty profile response.');
      setProfile(data);
      setForm({
        name:               data.Name               || '',
        bio:                data.Bio                 || '',
        dob:                data.DOB ? data.DOB.split('T')[0] : '',
        whatsAppNumber:     data.WhatsAppNumber      || '',
        bkashNumber:        data.BkashNumber         || '',
        bankAccountDetails: data.BankAccountDetails  || '',
      });
    } catch (err) {
      if (err.response?.status === 401) { navigate('/auth', { replace: true }); return; }
      setError(err.response?.data?.message || err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchMyGigs = useCallback(async () => {
    setGigsLoading(true);
    try {
      const res = await gigAPI.getMyGigs();
      setMyGigs(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch { setMyGigs([]); }
    finally { setGigsLoading(false); }
  }, []);

  // useEffect fires AFTER fetchProfile is already in scope
  useEffect(() => { fetchProfile(); fetchMyGigs(); }, [fetchProfile, fetchMyGigs]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccessMsg('');
    try {
      await userAPI.updateMyProfile({
        name: form.name || undefined, bio: form.bio || undefined,
        dob: form.dob || undefined, whatsAppNumber: form.whatsAppNumber || undefined,
        bkashNumber: form.bkashNumber || undefined, bankAccountDetails: form.bankAccountDetails || undefined,
      });
      setSuccessMsg('Profile updated successfully!'); setEditing(false);
      fetchProfile();
    } catch (err) { setError(err.response?.data?.message || 'Update failed.'); }
    finally { setSaving(false); }
  };

  // ── Gig Actions ────────────────────────────────────────────────────────────
  const handleDeleteGig = async (gigId, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await gigAPI.remove(gigId);
      toast.success('Gig deleted.', { className: 'gv-toast', icon: '🗑️' });
      fetchMyGigs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete gig.', { className: 'gv-toast' });
    }
  };

  const openEditGig = (gig) => {
    setEditingGig(gig);
    setShowGigModal(true);
  };

  const openCreateGig = () => {
    setEditingGig(null);
    setShowGigModal(true);
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={36} className="text-brand-500 animate-spin" />
        <p className="text-gray-400 text-sm">Loading profile…</p>
      </div>
    </div>
  );

  // ── Error / empty state (with retry button) ────────────────────────────────
  if (!profile) return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="text-center space-y-4">
        <AlertCircle size={48} className="text-red-400 mx-auto" />
        <p className="text-gray-600">{error || 'Profile not found.'}</p>
        <button onClick={fetchProfile}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700">
          <RefreshCw size={14} />Try Again
        </button>
      </div>
    </div>
  );

  // ── Derived values (only computed when profile exists) ─────────────────────
  const initials = (profile.Name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const joinDate = profile.CreatedAt
    ? new Date(profile.CreatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  // ── Premium role + department formatter ───────────────────────────────────
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
    <>
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white bg-dora-kata py-8 px-4">
      <div className="max-w-4xl mx-auto animate-fade-in">

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-slide-up">
            <AlertCircle size={16} className="shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2 animate-slide-up">
            <CheckCircle2 size={16} className="shrink-0" /> {successMsg}
          </div>
        )}

        {/* PROFILE HEADER */}
        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 bg-brand-gradient rounded-2xl flex items-center justify-center text-white text-3xl font-extrabold shadow-brand shrink-0 overflow-hidden">
              {profile.ProfilePicUrl
                ? <img src={profile.ProfilePicUrl} alt={profile.Name} className="w-full h-full object-cover" />
                : initials}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{profile.Name}</h1>
              <p className="text-sm font-semibold text-brand-600 mb-2">
                {formatRoleLabel(profile.RoleName, profile.DeptName || 'CSE')}
              </p>
              {profile.Bio && <p className="text-sm text-gray-600 leading-relaxed mb-3 max-w-lg">{profile.Bio}</p>}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
                <div className="flex items-center gap-1.5 bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Zap size={13} className="fill-brand-500" />{profile.PVP_Points ?? 0} PVP Points
                </div>
                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Star size={13} className="fill-amber-400" />{Number(profile.AverageRating || 0).toFixed(1)} Avg. Rating
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-xs font-medium">
                  <Calendar size={13} />Joined: {joinDate}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex flex-wrap items-center gap-2">
              <button onClick={openCreateGig}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-brand-500 text-white hover:bg-brand-600 transition-all duration-200 shadow-brand">
                <Plus size={15} /> Create Gig
              </button>
              <Link to="/orders" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-green-50 text-green-600 hover:bg-green-100 transition-all duration-200">
                <ClipboardList size={15} /> My Orders
              </Link>
              <button onClick={() => { setEditing(!editing); setSuccessMsg(''); setError(''); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${editing ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}>
                {editing ? <><X size={15} /> Cancel</> : <><Edit3 size={15} /> Edit Profile</>}
              </button>
            </div>
          </div>
        </div>

        {/* PVP STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Link to="/wallet"
            className="card p-5 text-center hover:-translate-y-1 hover:shadow-lg hover:border-brand-200 cursor-pointer transition-all duration-200 group">
            <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-brand-100 transition-colors"><Award size={24} className="text-brand-500" /></div>
            <p className="text-3xl font-extrabold text-gray-900">{profile.PVP_Points ?? 0}</p>
            <p className="text-xs text-gray-400 mt-1 group-hover:text-brand-500 transition-colors">PVP Points</p>
          </Link>
          <Link to="/leaderboard"
            className="card p-5 text-center hover:-translate-y-1 hover:shadow-lg hover:border-amber-200 cursor-pointer transition-all duration-200 group">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-amber-100 transition-colors"><Star size={24} className="text-amber-500" /></div>
            <p className="text-3xl font-extrabold text-gray-900">{Number(profile.AverageRating || 0).toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-1 group-hover:text-amber-500 transition-colors">Avg. Rating</p>
          </Link>
          <a href="#profile-skills"
            className="card p-5 text-center hover:-translate-y-1 hover:shadow-lg hover:border-green-200 cursor-pointer transition-all duration-200 group">
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-green-100 transition-colors"><Shield size={24} className="text-green-500" /></div>
            <p className="text-3xl font-extrabold text-gray-900">{profile.skills?.length || 0}</p>
            <p className="text-xs text-gray-400 mt-1 group-hover:text-green-500 transition-colors">Skills</p>
          </a>
          {/* Escrow Wallet Balance — credited on each approved milestone */}
          <Link to="/wallet"
            className="card p-5 text-center hover:-translate-y-1 hover:shadow-lg cursor-pointer transition-all duration-200 relative overflow-hidden group">
            {/* Subtle green shimmer background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-green-50/30 pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-green-500 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-emerald-200 group-hover:shadow-emerald-300 transition-all">
                <Wallet size={22} className="text-white" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">
                ৳{Number(profile.WalletBalance || 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1 group-hover:text-emerald-500 transition-colors">Escrow Wallet</p>
              <p className="text-[9px] text-emerald-500 font-semibold mt-0.5">Milestone earnings</p>
            </div>
          </Link>
        </div>


        {/* SKILLS */}
        {Array.isArray(profile.skills) && profile.skills.length > 0 && (
          <div id="profile-skills" className="card p-6 mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Zap size={15} className="text-brand-500" /> Skills</h3>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map(s => (
                <span key={s.SkillID} className="bg-brand-50 text-brand-700 text-xs font-medium px-3 py-1.5 rounded-full border border-brand-100">{s.SkillName}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── MY GIGS (Dynamic CRUD) ─────────────────────────────────────────── */}
        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <Briefcase size={15} className="text-brand-500" /> Offerings & Gigs
            </h3>
            <button onClick={openCreateGig}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-all duration-200">
              <Plus size={12} /> Add New
            </button>
          </div>

          {gigsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : myGigs.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Briefcase size={24} className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 mb-3">You haven't created any gigs yet.</p>
              <button onClick={openCreateGig} className="btn-primary !text-xs !py-2 !px-4">
                <Plus size={13} /> Create Your First Gig
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {myGigs.map(gig => (
                <div key={gig.GigID} className="group relative border border-gray-100 rounded-xl overflow-hidden hover:border-brand-200 hover:shadow-brand transition-all bg-white">
                  {/* Image */}
                  {gig.PrimaryImage ? (
                    <div className="h-32 bg-gray-100 overflow-hidden">
                      <img src={gig.PrimaryImage} alt={gig.Title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-brand-50 to-orange-50 flex items-center justify-center">
                      <ImageOff size={28} className="text-brand-200" />
                    </div>
                  )}

                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 text-sm mb-2 line-clamp-2 leading-snug">{gig.Title}</h4>
                    {gig.Description && <p className="text-xs text-gray-400 line-clamp-2 mb-3">{gig.Description}</p>}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div>
                        <span className="text-[10px] text-gray-400">Starting at</span>
                        <p className="text-sm font-extrabold text-brand-600">&#2547;{Number(gig.BasePrice).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEditGig(gig)} title="Edit gig"
                          className="w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 flex items-center justify-center transition-colors">
                          <Pencil size={13} className="text-blue-500" />
                        </button>
                        <button onClick={() => handleDeleteGig(gig.GigID, gig.Title)} title="Delete gig"
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={13} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EDIT FORM */}
        {editing && (
          <form onSubmit={handleSave} className="card p-6 sm:p-8 mb-6 animate-slide-up">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"><Edit3 size={18} className="text-brand-500" /> Edit Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">Full Name</label><div className="relative"><User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field pl-10" placeholder="Your name" /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">Date of Birth</label><div className="relative"><Calendar size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="input-field pl-10" /></div></div>
              <div className="space-y-1 sm:col-span-2"><label className="text-xs font-semibold text-gray-600">Bio</label><div className="relative"><FileText size={15} className="absolute left-3.5 top-3 text-gray-400" /><textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} className="input-field pl-10 min-h-[80px] resize-none" placeholder="Tell us about yourself…" rows={3} /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">WhatsApp Number</label><div className="relative"><Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={form.whatsAppNumber} onChange={e => setForm({ ...form, whatsAppNumber: e.target.value })} className="input-field pl-10" placeholder="017XXXXXXXX" /></div></div>
              <div className="space-y-1"><label className="text-xs font-semibold text-gray-600">bKash Number</label><div className="relative"><CreditCard size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="tel" value={form.bkashNumber} onChange={e => setForm({ ...form, bkashNumber: e.target.value })} className="input-field pl-10" placeholder="01XXXXXXXXX" /></div></div>
              <div className="space-y-1 sm:col-span-2"><label className="text-xs font-semibold text-gray-600">Bank Account Details</label><div className="relative"><Shield size={15} className="absolute left-3.5 top-3 text-gray-400" /><textarea value={form.bankAccountDetails} onChange={e => setForm({ ...form, bankAccountDetails: e.target.value })} className="input-field pl-10 min-h-[60px] resize-none" placeholder="Bank name, account number, branch…" rows={2} /></div></div>
            </div>
            <div className="flex justify-end mt-6 gap-3">
              <button type="button" onClick={() => setEditing(false)} className="btn-secondary !py-2.5 !px-5 !text-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary !py-2.5 !px-6 !text-sm disabled:opacity-60">
                {saving
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span>
                  : <span className="flex items-center gap-2"><Save size={15} /> Save Changes</span>}
              </button>
            </div>
          </form>
        )}

        {/* CONTACT DETAILS */}
        {!editing && (
          <div className="card p-6 mb-6">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Mail size={15} className="text-brand-500" /> Contact Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Mail size={16} className="text-brand-500 shrink-0" /><div><p className="text-[10px] text-gray-400 font-medium">UIU Email</p><p className="text-sm text-gray-800 font-medium">{profile.UiuEmail || '—'}</p></div></div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Mail size={16} className="text-gray-400 shrink-0" /><div><p className="text-[10px] text-gray-400 font-medium">Personal Email</p><p className="text-sm text-gray-800 font-medium">{profile.PersonalEmail || '—'}</p></div></div>
              {profile.WhatsAppNumber && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone size={16} className="text-green-500 shrink-0" /><div><p className="text-[10px] text-gray-400 font-medium">WhatsApp</p><p className="text-sm text-gray-800 font-medium">{profile.WhatsAppNumber}</p></div></div>}
              {profile.BkashNumber && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><CreditCard size={16} className="text-pink-500 shrink-0" /><div><p className="text-[10px] text-gray-400 font-medium">bKash</p><p className="text-sm text-gray-800 font-medium">{profile.BkashNumber}</p></div></div>}
            </div>
          </div>
        )}

        {/* DANGER ZONE */}
        <div className="card p-6 border-red-100 bg-red-50/30">
          <h3 className="text-sm font-bold text-red-700 mb-1 flex items-center gap-2">
            <Trash2 size={15} className="text-red-500" />Danger Zone
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Permanently deactivate your GigVerse account. Your UIU email will be freed instantly for a fresh re-signup. Historical transaction data is preserved for platform integrity.
          </p>
          <button onClick={() => setShowDelete(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 border-2 border-red-200 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-200">
            <Trash2 size={14} />Delete My Account
          </button>
        </div>
      </div>
    </main>

    {showDelete && <DeleteAccountModal onClose={() => setShowDelete(false)} />}

    {/* Gig Create/Edit Modal */}
    <GigFormModal
      isOpen={showGigModal}
      onClose={() => { setShowGigModal(false); setEditingGig(null); }}
      onSuccess={fetchMyGigs}
      editGig={editingGig}
    />
    </>
  );
}
