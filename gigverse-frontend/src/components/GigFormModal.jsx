// src/components/GigFormModal.jsx — Create / Edit Gig with File Upload & Professional Pricing
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Briefcase, DollarSign, FileText, Tag, Loader2,
  CheckCircle2, Upload, Camera, Image as ImageIcon, AlertCircle, List
} from 'lucide-react';
import { gigAPI } from '../lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Design', 'Development', 'Writing', 'Marketing', 'Tutoring'];
const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_KEY || '';

async function uploadToImgBB(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: form });
  const json = await res.json();
  if (!json.success) throw new Error('Upload failed');
  return json.data.display_url;
}

export default function GigFormModal({ isOpen, onClose, onSuccess, editGig = null }) {
  const isEdit = !!editGig;
  const [form, setForm] = useState({
    title: '',
    category: 'Development',
    description: '',
    pricingBreakdown: '',
    basePrice: '',
  });
  const [imgFile, setImgFile]       = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const fileRef = useRef();

  // Pre-fill form when editing
  useEffect(() => {
    if (editGig) {
      setForm({
        title:            editGig.Title            || '',
        category:         editGig.CategoryName      || 'Development',
        description:      editGig.Description       || '',
        pricingBreakdown: editGig.PricingBreakdown  || '',
        basePrice:        editGig.BasePrice          || '',
      });
      if (editGig.PrimaryImage) setImgPreview(editGig.PrimaryImage);
    } else {
      setForm({ title: '', category: 'Development', description: '', pricingBreakdown: '', basePrice: '' });
      setImgFile(null);
      setImgPreview(null);
    }
    setError('');
  }, [editGig, isOpen]);

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) { setError('Please select a valid image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be smaller than 5 MB.'); return; }
    setError(''); setImgFile(file); setImgPreview(URL.createObjectURL(file));
  }, []);

  const onDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (!form.title.trim()) { setError('Gig title is required.'); return; }
    if (!form.description.trim() || form.description.trim().length < 30) {
      setError('Please provide a detailed service description (minimum 30 characters).'); return;
    }
    if (!form.pricingBreakdown.trim() || form.pricingBreakdown.trim().length < 15) {
      setError('Pricing breakdown is mandatory. Explain what is included at this price.'); return;
    }
    if (!form.basePrice || Number(form.basePrice) <= 0) { setError('Enter a valid base price.'); return; }

    setSaving(true);
    try {
      let imageUrl = undefined;
      // Upload new image if a file was selected
      if (imgFile && IMGBB_API_KEY) {
        setUploading(true);
        try { imageUrl = await uploadToImgBB(imgFile); }
        catch { setError('Image upload failed. Gig will be saved without image.'); }
        setUploading(false);
      }

      const fullDescription = `${form.description.trim()}\n\n---PRICING---\n${form.pricingBreakdown.trim()}`;

      if (isEdit) {
        await gigAPI.update(editGig.GigID, {
          title:       form.title.trim(),
          description: fullDescription,
          basePrice:   Number(form.basePrice),
          imageUrl:    imageUrl || undefined,
        });
        toast.success('Gig updated successfully!', { className: 'gv-toast', icon: '✅' });
      } else {
        await gigAPI.create({
          title:       form.title.trim(),
          description: fullDescription,
          basePrice:   Number(form.basePrice),
          imageUrl:    imageUrl || undefined,
        });
        toast.success('Gig created successfully!', { className: 'gv-toast', icon: '🎉' });
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} gig.`);
    } finally {
      setSaving(false); setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-slide-up max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-brand-500 to-orange-500 px-6 py-5 shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Briefcase size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-white">{isEdit ? 'Edit Gig' : 'Create New Gig'}</h2>
                <p className="text-xs text-white/70">{isEdit ? 'Update your service offering' : 'Publish a professional service to the marketplace'}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Form — scrollable body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5" style={{ scrollbarWidth: 'thin' }}>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm animate-slide-up">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Tag size={12} /> Gig Title <span className="text-red-400">*</span></label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="input-field" placeholder="e.g. Professional Logo Design for Your Brand" maxLength={200} />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><Tag size={12} /> Category</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="input-field appearance-none cursor-pointer">
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Service Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><FileText size={12} /> Service Description <span className="text-red-400">*</span></label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
              className="input-field min-h-[100px] resize-none" rows={4}
              placeholder="Describe the service you provide, the process, deliverables, and what makes your offering unique. Be specific about technologies, tools, and methodologies you use." />
            <div className="flex justify-between">
              <p className={`text-[10px] flex items-center gap-1 ${form.description.length >= 30 ? 'text-green-500' : 'text-gray-400'}`}>
                {form.description.length >= 30 ? <><CheckCircle2 size={10} />Minimum met</> : `${Math.max(0, 30 - form.description.length)} more characters needed`}
              </p>
              <p className="text-[10px] text-gray-300">{form.description.length}/2000</p>
            </div>
          </div>

          {/* Pricing Breakdown (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><List size={12} /> Pricing Breakdown <span className="text-red-400">*</span></label>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 px-3 py-2 mb-1.5">
              <p className="text-[10px] text-amber-600 font-medium">Clients need to know exactly what they're paying for. Break down what's included at your base price and mention any add-on charges.</p>
            </div>
            <textarea value={form.pricingBreakdown} onChange={e => setForm({ ...form, pricingBreakdown: e.target.value })}
              className="input-field min-h-[80px] resize-none" rows={3}
              placeholder={"Example:\n• Base Package: 1 logo concept, 2 revisions — ৳500\n• Source files (AI/PSD) — included\n• Extra revision — ৳100 each\n• Rush delivery (24h) — ৳200 surcharge"} />
          </div>

          {/* Base Price */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><DollarSign size={12} /> Base Price (৳) <span className="text-red-400">*</span></label>
            <div className="relative max-w-[200px]">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">৳</span>
              <input type="number" min="1" step="1" value={form.basePrice}
                onChange={e => setForm({ ...form, basePrice: e.target.value })} className="input-field pl-9" placeholder="500" />
            </div>
          </div>

          {/* Gig Cover Image — File Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 flex items-center gap-1.5"><ImageIcon size={12} /> Cover Image</label>
            {imgPreview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200 h-36 bg-gray-50 group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <img src={imgPreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                  <Camera size={22} className="text-white" />
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setImgFile(null); setImgPreview(null); }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-sm z-10">
                  <X size={11} />
                </button>
              </div>
            ) : (
              <div className="w-full rounded-xl border border-dashed border-brand-200 bg-brand-50/30 hover:border-brand-400 hover:bg-brand-50 transition-all duration-200 cursor-pointer p-5"
                onClick={() => fileRef.current?.click()} onDrop={onDrop} onDragOver={e => e.preventDefault()}>
                <div className="flex flex-col items-center gap-2.5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-white border border-brand-100 flex items-center justify-center shadow-sm">
                    <Upload size={18} className="text-brand-400" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600">Drag and drop your cover image</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">or click to browse — JPG, PNG, max 5MB</p>
                  </div>
                  <span className="px-4 py-1 rounded-full text-[10px] font-semibold text-brand-600 bg-white border border-brand-200 shadow-sm">Choose File</span>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all duration-200">
              Cancel
            </button>
            <button type="submit" disabled={saving || uploading} className="btn-primary !py-2.5 !px-6 disabled:opacity-60">
              {saving || uploading ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> {uploading ? 'Uploading Image...' : isEdit ? 'Saving...' : 'Creating...'}</span>
              ) : (
                <span className="flex items-center gap-2"><CheckCircle2 size={14} /> {isEdit ? 'Save Changes' : 'Publish Gig'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
