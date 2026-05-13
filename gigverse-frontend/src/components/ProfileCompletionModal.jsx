// src/components/ProfileCompletionModal.jsx
// 3-step dark glassmorphism onboarding modal
import { useState, useRef, useCallback } from 'react';
import { Upload, User, FileText, Tag, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, X, Camera, Loader2 } from 'lucide-react';
import { userAPI } from '../lib/api';

// ── Skill Catalog ────────────────────────────────────────────────────────────
const SKILL_CATALOG = [
  { category: 'Programming and Technology', skills: ['Full-Stack Web Development','Frontend Development','Backend Development','SaaS Architecture','Mobile App Development (Flutter/React Native)','Database Design and Optimization','Cybersecurity and Penetration Testing','AI Prompt Engineering','Machine Learning Scripting','Web Scraping'] },
  { category: 'Graphics and Creative Design', skills: ['Logo and Brand Identity','UI/UX Design (Figma/Adobe XD)','Photo Retouching and Manipulation','Vector Tracing','Presentation and Pitch Deck Design','2D/3D Floor Plan Drafting','Structural Analysis (ETABS)'] },
  { category: 'Video and Audio Production', skills: ['Video Post-Production','Short-form Content Editing','Motion Graphics','Podcast Audio Engineering','Voiceover Services'] },
  { category: 'Writing and Professional Content', skills: ['SEO Copywriting','Technical and Academic Writing','Business Proposal Writing','Proofreading and Editing','Translation Services','Creative Content Strategy'] },
  { category: 'Digital Marketing and Sales', skills: ['Search Engine Optimization (SEO)','Social Media Management (SMM)','Performance Marketing and Ads','Email Marketing Automation','Lead Generation and B2B Research'] },
  { category: 'Business and Finance', skills: ['Financial Modeling','Bookkeeping (QuickBooks/Xero)','Market Research and Analysis','Project Management','Virtual Assistance and Data Management'] },
  { category: 'Engineering and Specialized Tech', skills: ['PCB Design and Prototyping','Circuit Simulation','Microcontroller Programming (Arduino/ESP32)','Architectural Rendering'] },
  { category: 'Campus and Community Services', skills: ['Academic Tutoring','Instructional Content Creation','Audio/Video Transcription','Volunteering','Blood Donation'] },
];

const DEPTS = [
  {id:1,name:'B.Sc. in CSE'},{id:2,name:'B.Sc. in EEE'},{id:3,name:'B.Sc. in CE'},
  {id:4,name:'B.Sc. in Data Science'},{id:5,name:'BBA'},{id:6,name:'BBA in AIS'},
  {id:7,name:'B.Sc. in Economics'},{id:8,name:'BSS in EDS'},{id:9,name:'BSS in MSJ'},
  {id:10,name:'BA in English'},{id:11,name:'B. Pharmacy'},{id:12,name:'B.Sc. in BSBGE'},
  {id:13,name:'M.Sc. in CSE'},{id:14,name:'MBA'},{id:15,name:'Executive MBA'},
  {id:16,name:'Master in IHRM'},{id:17,name:'MS in Economics'},{id:18,name:'Master in Dev. Studies'},
];

// ── ImgBB Upload Helper ───────────────────────────────────────────────────────
// Replace IMGBB_API_KEY with your key from imgbb.com (free account)
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_KEY || 'YOUR_IMGBB_API_KEY';

async function uploadToImgBB(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST', body: form,
  });
  const json = await res.json();
  if (!json.success) throw new Error('Image upload failed.');
  return json.data.display_url; // short URL ≤ 150 chars — safe for VARCHAR(500)
}

// ── Step indicators ──────────────────────────────────────────────────────────
const STEPS = ['Profile Photo', 'Bio & Department', 'Your Skills'];

export default function ProfileCompletionModal({ onComplete, userName }) {
  const [step, setStep]           = useState(0);
  const [imgFile, setImgFile]     = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio]             = useState('');
  const [deptId, setDeptId]       = useState('1');
  const [selected, setSelected]   = useState([]); // [{category, skill}]
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);
  const fileRef = useRef();

  // ── Avatar handling ─────────────────────────────────────────────────────────
  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please select a valid image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be smaller than 5 MB.'); return; }
    setError('');
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  }, []);

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  const onDragOver = (e) => e.preventDefault();

  // ── Skill toggle ─────────────────────────────────────────────────────────────
  const toggleSkill = (category, skill) => {
    setSelected(prev => {
      const exists = prev.some(s => s.category === category && s.skill === skill);
      return exists
        ? prev.filter(s => !(s.category === category && s.skill === skill))
        : [...prev, { category, skill }];
    });
  };
  const isSelected = (category, skill) => selected.some(s => s.category === category && s.skill === skill);

  // ── Navigation ───────────────────────────────────────────────────────────────
  const next = async () => {
    setError('');
    if (step === 0) {
      if (!imgFile && !imgPreview) { setError('Please add a profile photo to continue.'); return; }
      setStep(1);
    } else if (step === 1) {
      if (!bio.trim() || bio.trim().length < 20) { setError('Please write a bio of at least 20 characters.'); return; }
      setStep(2);
    }
  };

  const prev = () => { setError(''); setStep(s => s - 1); };

  // ── Final submit ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (selected.length < 3) { setError('Please select at least 3 skills.'); return; }
    setError(''); setSaving(true);
    try {
      let profilePicUrl = imgPreview; // fallback if no file (URL string)
      if (imgFile) {
        setUploading(true);
        try { profilePicUrl = await uploadToImgBB(imgFile); }
        catch { setError('Image upload failed. Please check your ImgBB API key in .env (VITE_IMGBB_KEY). Using local preview as fallback.'); profilePicUrl = null; }
        setUploading(false);
      }
      await userAPI.completeProfile({
        bio: bio.trim(),
        deptId: Number(deptId),
        profilePicUrl: profilePicUrl || undefined,
        skillNames: selected,
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally { setSaving(false); setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>

      <div className="w-full max-w-2xl rounded-3xl overflow-hidden animate-slide-up"
        style={{ background: 'linear-gradient(135deg, rgba(15,15,25,0.98) 0%, rgba(25,12,5,0.98) 100%)', border: '1px solid rgba(242,101,34,0.2)', boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)' }}>

        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div className="h-full bg-gradient-to-r from-brand-500 to-orange-400 transition-all duration-500"
            style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-brand-400 tracking-widest uppercase mb-1">Step {step + 1} of 3</p>
              <h2 className="text-xl font-bold text-white">{STEPS[step]}</h2>
              <p className="text-sm text-white/40 mt-0.5">
                {step === 0 && `Welcome, ${userName?.split(' ')[0] || 'there'}. Let's set up your professional profile.`}
                {step === 1 && 'Tell the GigVerse community who you are.'}
                {step === 2 && 'Select your professional skills. Minimum 3 required.'}
              </p>
            </div>
            {/* Step dots */}
            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-brand-500 w-6' : i < step ? 'bg-brand-500/50' : 'bg-white/15'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(242,101,34,0.3) transparent' }}>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.25)', color: '#fca5a5' }}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* ── STEP 1: Avatar ── */}
          {step === 0 && (
            <div className="flex flex-col items-center gap-6">
              {/* Preview circle */}
              <div className="relative group">
                <div className="w-36 h-36 rounded-full overflow-hidden flex items-center justify-center cursor-pointer transition-all duration-300"
                  style={{ background: imgPreview ? 'transparent' : 'linear-gradient(135deg, rgba(242,101,34,0.15), rgba(242,101,34,0.05))', border: '2px dashed rgba(242,101,34,0.4)' }}
                  onClick={() => fileRef.current?.click()}
                  onDrop={onDrop} onDragOver={onDragOver}>
                  {imgPreview
                    ? <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <User size={48} className="text-white/20" />
                  }
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <Camera size={24} className="text-white" />
                  </div>
                </div>
                {imgPreview && (
                  <button onClick={() => { setImgFile(null); setImgPreview(null); }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors">
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Drop zone */}
              <div className="w-full rounded-2xl border border-dashed cursor-pointer transition-all duration-200 hover:border-brand-500/60"
                style={{ background: 'rgba(242,101,34,0.04)', borderColor: 'rgba(242,101,34,0.2)', padding: '28px' }}
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop} onDragOver={onDragOver}>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(242,101,34,0.1)' }}>
                    <Upload size={20} className="text-brand-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-white/80">Drag and drop your photo here</p>
                    <p className="text-xs text-white/30 mt-1">or click to browse — JPG, PNG, WebP up to 5 MB</p>
                  </div>
                  <div className="px-5 py-2 rounded-full text-xs font-semibold text-brand-400 transition-colors"
                    style={{ background: 'rgba(242,101,34,0.1)', border: '1px solid rgba(242,101,34,0.25)' }}>
                    Choose File
                  </div>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              <p className="text-xs text-white/25 text-center">
                Your photo will be uploaded via ImgBB. Add your ImgBB API key to <code className="text-brand-400/70">.env</code> as <code className="text-brand-400/70">VITE_IMGBB_KEY</code>.
              </p>
            </div>
          )}

          {/* ── STEP 2: Bio & Department ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Professional Bio
                </label>
                <div className="relative">
                  <FileText size={14} className="absolute left-4 top-4 text-white/20 pointer-events-none" />
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} maxLength={500}
                    placeholder="Describe your expertise, academic background, and what you offer on GigVerse..."
                    className="w-full pl-10 pr-4 py-3.5 text-sm rounded-2xl resize-none focus:outline-none transition-all duration-200"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', caretColor: '#f26522' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(242,101,34,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                <div className="flex justify-between">
                  <p className={`text-xs ${bio.length >= 20 ? 'text-green-400' : 'text-white/25'}`}>
                    {bio.length >= 20 ? <span className="flex items-center gap-1"><CheckCircle2 size={11} />Minimum met</span> : `${Math.max(0, 20 - bio.length)} more characters needed`}
                  </p>
                  <p className="text-xs text-white/20">{bio.length}/500</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Department
                </label>
                <select value={deptId} onChange={e => setDeptId(e.target.value)}
                  className="w-full px-4 py-3 text-sm rounded-2xl focus:outline-none appearance-none cursor-pointer transition-all duration-200"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(242,101,34,0.5)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}>
                  {DEPTS.map(d => <option key={d.id} value={d.id} style={{ background: '#1a1a2e' }}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 3: Skills ── */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between sticky top-0 py-2"
                style={{ background: 'linear-gradient(135deg, rgba(15,15,25,0.98), rgba(25,12,5,0.98))' }}>
                <p className="text-xs text-white/30">
                  {selected.length} selected{selected.length < 3 && <span className="text-orange-400"> — {3 - selected.length} more needed</span>}
                </p>
                {selected.length >= 3 && (
                  <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                    <CheckCircle2 size={12} />Ready to continue
                  </span>
                )}
              </div>

              {SKILL_CATALOG.map(({ category, skills }) => (
                <div key={category}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(242,101,34,0.7)' }}>{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => {
                      const active = isSelected(category, skill);
                      return (
                        <button key={skill} type="button" onClick={() => toggleSkill(category, skill)}
                          className="text-xs font-medium px-3.5 py-1.5 rounded-full transition-all duration-150"
                          style={{
                            background: active ? 'rgba(242,101,34,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${active ? 'rgba(242,101,34,0.6)' : 'rgba(255,255,255,0.1)'}`,
                            color: active ? '#f97316' : 'rgba(255,255,255,0.5)',
                            transform: active ? 'scale(1.02)' : 'scale(1)',
                          }}>
                          {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <button onClick={prev} disabled={step === 0}
            className="flex items-center gap-2 text-sm font-semibold transition-all duration-150 disabled:opacity-0"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <ChevronLeft size={16} />Back
          </button>

          {step < 2 ? (
            <button onClick={next}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #f26522, #d95315)', boxShadow: '0 4px 20px rgba(242,101,34,0.35)' }}>
              Continue<ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving || selected.length < 3}
              className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ background: saving || selected.length < 3 ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #f26522, #d95315)', boxShadow: saving ? 'none' : '0 4px 20px rgba(242,101,34,0.35)' }}>
              {(saving || uploading)
                ? <><Loader2 size={15} className="animate-spin" />{uploading ? 'Uploading Photo...' : 'Saving...'}</>
                : <><CheckCircle2 size={15} />Complete Profile</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
