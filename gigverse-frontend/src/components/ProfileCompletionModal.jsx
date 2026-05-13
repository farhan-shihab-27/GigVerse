// src/components/ProfileCompletionModal.jsx — Light/Orange Premium Onboarding
import { useState, useRef, useCallback } from 'react';
import {
  Upload, User, FileText, Tag, CheckCircle2, AlertCircle,
  ChevronRight, ChevronLeft, X, Camera, Loader2, Zap
} from 'lucide-react';
import { userAPI } from '../lib/api';

// ── Full 60+ Skill Catalog ────────────────────────────────────────────────────
const SKILL_CATALOG = [
  { category: 'Programming and Technology', skills: [
    'Full-Stack Web Development','Frontend Development','Backend Development',
    'SaaS Architecture','Mobile App Development (Flutter/React Native)',
    'Database Design and Optimization','Cybersecurity and Penetration Testing',
    'AI Prompt Engineering','Machine Learning Scripting','Web Scraping',
  ]},
  { category: 'Graphics and Creative Design', skills: [
    'Logo and Brand Identity','UI/UX Design (Figma/Adobe XD)',
    'Photo Retouching and Manipulation','Vector Tracing',
    'Presentation and Pitch Deck Design','2D/3D Floor Plan Drafting',
    'Structural Analysis (ETABS)',
  ]},
  { category: 'Video and Audio Production', skills: [
    'Video Post-Production','Short-form Content Editing','Motion Graphics',
    'Podcast Audio Engineering','Voiceover Services',
  ]},
  { category: 'Writing and Professional Content', skills: [
    'SEO Copywriting','Technical and Academic Writing','Business Proposal Writing',
    'Proofreading and Editing','Translation Services','Creative Content Strategy',
  ]},
  { category: 'Digital Marketing and Sales', skills: [
    'Search Engine Optimization (SEO)','Social Media Management (SMM)',
    'Performance Marketing and Ads','Email Marketing Automation',
    'Lead Generation and B2B Research',
  ]},
  { category: 'Business and Finance', skills: [
    'Financial Modeling','Bookkeeping (QuickBooks/Xero)',
    'Market Research and Analysis','Project Management',
    'Virtual Assistance and Data Management',
  ]},
  { category: 'Engineering and Specialized Tech', skills: [
    'PCB Design and Prototyping','Circuit Simulation',
    'Microcontroller Programming (Arduino/ESP32)','Architectural Rendering',
  ]},
  { category: 'Campus and Community Services', skills: [
    'Academic Tutoring','Instructional Content Creation',
    'Audio/Video Transcription','Volunteering','Blood Donation',
  ]},
];

const DEPTS = [
  {id:1,name:'B.Sc. in CSE'},{id:2,name:'B.Sc. in EEE'},{id:3,name:'B.Sc. in CE'},
  {id:4,name:'B.Sc. in Data Science'},{id:5,name:'BBA'},{id:6,name:'BBA in AIS'},
  {id:7,name:'B.Sc. in Economics'},{id:8,name:'BSS in EDS'},{id:9,name:'BSS in MSJ'},
  {id:10,name:'BA in English'},{id:11,name:'B. Pharmacy'},{id:12,name:'B.Sc. in BSBGE'},
  {id:13,name:'M.Sc. in CSE'},{id:14,name:'MBA'},{id:15,name:'Executive MBA'},
  {id:16,name:'Master in IHRM'},{id:17,name:'MS in Economics'},{id:18,name:'Master in Dev. Studies'},
];

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_KEY || '';

async function uploadToImgBB(file) {
  const form = new FormData();
  form.append('image', file);
  const res  = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error('Upload failed');
  return json.data.display_url;
}

const STEPS = ['Profile Photo', 'Bio & Department', 'Your Skills'];

export default function ProfileCompletionModal({ onComplete, userName }) {
  const [step, setStep]             = useState(0);
  const [imgFile, setImgFile]       = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [bio, setBio]               = useState('');
  const [deptId, setDeptId]         = useState('1');
  const [selected, setSelected]     = useState([]);
  const [error, setError]           = useState('');
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please select a valid image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be smaller than 5 MB.'); return; }
    setError(''); setImgFile(file); setImgPreview(URL.createObjectURL(file));
  }, []);

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const toggleSkill = (category, skill) => {
    setSelected(prev => {
      const exists = prev.some(s => s.category === category && s.skill === skill);
      return exists ? prev.filter(s => !(s.category === category && s.skill === skill)) : [...prev, { category, skill }];
    });
  };
  const isSelected = (cat, skill) => selected.some(s => s.category === cat && s.skill === skill);

  const next = async () => {
    setError('');
    if (step === 0) {
      if (!imgPreview) { setError('Please add a profile photo to continue.'); return; }
      setStep(1);
    } else if (step === 1) {
      if (!bio.trim() || bio.trim().length < 20) { setError('Please write a bio of at least 20 characters.'); return; }
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (selected.length < 3) { setError('Please select at least 3 skills.'); return; }
    setError(''); setSaving(true);
    try {
      let profilePicUrl = null;
      if (imgFile && IMGBB_API_KEY) {
        setUploading(true);
        try { profilePicUrl = await uploadToImgBB(imgFile); }
        catch { /* skip upload — no URL stored */ }
        setUploading(false);
      }
      await userAPI.completeProfile({
        bio: bio.trim(), deptId: Number(deptId),
        profilePicUrl: profilePicUrl || undefined,
        skillNames: selected,
      });
      onComplete();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save. Please try again.');
    } finally { setSaving(false); setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-gray-100">

        {/* Orange progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-gradient-to-r from-brand-500 to-orange-400 transition-all duration-500"
            style={{ width: `${((step + 1) / 3) * 100}%` }} />
        </div>

        {/* Header */}
        <div className="px-8 pt-6 pb-5 border-b border-gray-100 bg-gradient-to-r from-brand-50/60 to-orange-50/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-brand shrink-0">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-brand-500 tracking-widest uppercase">Step {step + 1} of 3 — {STEPS[step]}</p>
                <h2 className="text-lg font-extrabold text-gray-900 leading-tight">
                  {step === 0 && `Welcome, ${userName?.split(' ')[0] || 'there'}! Set up your profile.`}
                  {step === 1 && 'Tell the community who you are.'}
                  {step === 2 && 'Select your professional skills.'}
                </h2>
              </div>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-brand-500' : i < step ? 'w-4 bg-brand-300' : 'w-4 bg-gray-200'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 max-h-[60vh] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#fcd9bc transparent' }}>

          {/* Error alert */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-slide-up">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* ── STEP 1: Avatar ── */}
          {step === 0 && (
            <div className="flex flex-col items-center gap-5">
              {/* Preview circle */}
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className={`w-32 h-32 rounded-full overflow-hidden flex items-center justify-center transition-all duration-200 border-2 ${imgPreview ? 'border-brand-300' : 'border-dashed border-brand-200 hover:border-brand-400'} bg-brand-50`}>
                  {imgPreview
                    ? <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                    : <User size={40} className="text-brand-200" />}
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <Camera size={22} className="text-white" />
                  </div>
                </div>
                {imgPreview && (
                  <button onClick={e => { e.stopPropagation(); setImgFile(null); setImgPreview(null); }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-sm">
                    <X size={11} />
                  </button>
                )}
              </div>

              {/* Drop zone */}
              <div className="w-full rounded-2xl border border-dashed border-brand-200 bg-brand-50/40 hover:border-brand-400 hover:bg-brand-50 transition-all duration-200 cursor-pointer p-7"
                onClick={() => fileRef.current?.click()}
                onDrop={onDrop} onDragOver={e => e.preventDefault()}>
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-brand-100 flex items-center justify-center shadow-sm">
                    <Upload size={20} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Drag and drop your photo here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse from your files</p>
                  </div>
                  <span className="px-5 py-1.5 rounded-full text-xs font-semibold text-brand-600 bg-white border border-brand-200 shadow-sm hover:bg-brand-50 transition-colors">
                    Choose File
                  </span>
                </div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
              <p className="text-xs text-gray-400 text-center">Supported formats: JPG, PNG. Max size: 5MB</p>
            </div>
          )}

          {/* ── STEP 2: Bio & Department ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Professional Bio</label>
                <div className="relative">
                  <FileText size={14} className="absolute left-4 top-4 text-gray-300 pointer-events-none" />
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={5} maxLength={500}
                    placeholder="Describe your expertise, academic background, and what you offer on GigVerse..."
                    className="input-field pl-10 resize-none min-h-[120px]" />
                </div>
                <div className="flex justify-between">
                  <p className={`text-xs flex items-center gap-1 ${bio.length >= 20 ? 'text-green-500' : 'text-gray-400'}`}>
                    {bio.length >= 20 ? <><CheckCircle2 size={11} />Minimum met</> : `${Math.max(0, 20 - bio.length)} more characters needed`}
                  </p>
                  <p className="text-xs text-gray-300">{bio.length}/500</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Department</label>
                <select value={deptId} onChange={e => setDeptId(e.target.value)} className="input-field">
                  {DEPTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 3: Skills ── */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Selection counter sticky header */}
              <div className="sticky top-0 py-2 bg-white z-10 flex items-center justify-between border-b border-gray-100 -mx-8 px-8">
                <p className="text-sm font-semibold text-gray-700">
                  <span className="text-brand-500 font-extrabold">{selected.length}</span> selected
                  {selected.length < 3 && <span className="text-gray-400 font-normal text-xs ml-2">({3 - selected.length} more required)</span>}
                </p>
                {selected.length >= 3 && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-green-500">
                    <CheckCircle2 size={12} />Ready to continue
                  </span>
                )}
              </div>

              {/* Full skill grid — all 8 categories */}
              {SKILL_CATALOG.map(({ category, skills }) => (
                <div key={category}>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-brand-500 mb-2.5">{category}</p>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(skill => {
                      const active = isSelected(category, skill);
                      return (
                        <button key={skill} type="button" onClick={() => toggleSkill(category, skill)}
                          className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all duration-150
                            ${active
                              ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'}`}>
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
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <button onClick={() => { setError(''); setStep(s => s - 1); }} disabled={step === 0}
            className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-0">
            <ChevronLeft size={15} />Back
          </button>

          {step < 2 ? (
            <button onClick={next}
              className="btn-primary !px-8 !py-2.5 !text-sm">
              Continue<ChevronRight size={14} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={saving || selected.length < 3}
              className="btn-primary !px-8 !py-2.5 !text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none">
              {saving || uploading
                ? <><Loader2 size={14} className="animate-spin" />{uploading ? 'Uploading Photo...' : 'Saving...'}</>
                : <><CheckCircle2 size={14} />Complete Profile</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
