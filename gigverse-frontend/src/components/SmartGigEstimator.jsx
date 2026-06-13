// src/components/SmartGigEstimator.jsx — AI-Powered Smart Pricing & Gig Estimator
// Glassmorphic suggestion box with debounced AI estimation via Google Gemini.
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Loader2, Tag, DollarSign, Layers, AlertCircle, RefreshCw, Wand2 } from 'lucide-react';
import { aiAPI } from '../lib/api';

//  Debounce Hook 
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

//  Category Color Map 
const CATEGORY_STYLES = {
  Design:      'from-pink-500 to-rose-500',
  Development: 'from-blue-500 to-indigo-500',
  Writing:     'from-emerald-500 to-teal-500',
  Marketing:   'from-amber-500 to-orange-500',
  Tutoring:    'from-violet-500 to-purple-500',
};

export default function SmartGigEstimator() {
  const [prompt, setPrompt]       = useState('');
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [hasSearched, setSearched] = useState(false);

  const debouncedPrompt = useDebounce(prompt, 800);

  //  Auto-fetch when debounced prompt changes 
  useEffect(() => {
    if (!debouncedPrompt || debouncedPrompt.trim().length < 10) {
      if (debouncedPrompt.trim().length === 0) {
        setResult(null);
        setSearched(false);
        setError('');
      }
      return;
    }
    fetchEstimation(debouncedPrompt.trim());
  }, [debouncedPrompt]);

  const fetchEstimation = useCallback(async (text) => {
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const res = await aiAPI.estimateGig(text);
      if (res.data?.success) {
        setResult(res.data.data);
      } else {
        setError(res.data?.message || 'Could not get AI suggestion.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'AI service is unavailable. Please try again.';
      setError(msg);
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    if (prompt.trim().length >= 10) fetchEstimation(prompt.trim());
  };

  const catGradient = CATEGORY_STYLES[result?.SuggestedCategory] || 'from-brand-500 to-brand-700';

  return (
    <section className="mb-8 animate-fade-in">
      {/*  Header  */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-orange-400 flex items-center justify-center shadow-brand">
          <Wand2 size={16} className="text-white" />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            AI Smart Pricing
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-brand-500 to-orange-400 text-white uppercase tracking-wider">Beta</span>
          </h2>
          <p className="text-xs text-gray-400">Describe your project and let AI estimate the price</p>
        </div>
      </div>

      {/*  Textarea  */}
      <div className="relative">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-500/20 via-orange-400/20 to-amber-400/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <textarea
            id="ai-gig-estimator-input"
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your project... e.g., I need a React e-commerce site with payment integration and admin dashboard"
            className="relative w-full rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-900 placeholder-gray-400 transition-all duration-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none hover:border-gray-300 resize-none"
          />
        </div>

        {/*  Character count + loading indicator  */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-gray-300">
            {prompt.length < 10 && prompt.length > 0
              ? `${10 - prompt.length} more characters needed`
              : prompt.length >= 10
                ? 'AI will analyze when you stop typing...'
                : 'Minimum 10 characters'}
          </p>
          {loading && (
            <div className="flex items-center gap-1.5 text-brand-500">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[10px] font-semibold">Analyzing...</span>
            </div>
          )}
        </div>
      </div>

      {/*  Loading Skeleton  */}
      {loading && !result && (
        <div className="mt-4 rounded-2xl border border-brand-100/50 bg-gradient-to-br from-white/80 to-brand-50/30 backdrop-blur-xl p-5 shadow-brand/10">
          <div className="space-y-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-20 h-5 bg-gray-200/60 rounded-full" />
              <div className="w-32 h-5 bg-gray-200/60 rounded-full" />
            </div>
            <div className="flex gap-2">
              <div className="w-16 h-6 bg-gray-200/60 rounded-full" />
              <div className="w-20 h-6 bg-gray-200/60 rounded-full" />
              <div className="w-14 h-6 bg-gray-200/60 rounded-full" />
              <div className="w-24 h-6 bg-gray-200/60 rounded-full" />
            </div>
            <div className="w-28 h-8 bg-gray-200/60 rounded-xl" />
          </div>
        </div>
      )}

      {/*  Result Card — Glassmorphic  */}
      {result && !loading && (
        <div className="mt-4 relative group animate-slide-up">
          {/* Glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-500/15 via-orange-400/10 to-amber-400/15 rounded-3xl blur-lg opacity-80 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="relative rounded-2xl border border-brand-100/60 bg-white/80 backdrop-blur-xl p-5 shadow-lg shadow-brand-500/5">
            {/* Top: Sparkles header */}
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-brand-500" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-500">AI Suggestion</span>
            </div>

            {/* Category Badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500">Category</span>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full text-white bg-gradient-to-r ${catGradient} shadow-sm`}>
                {result.SuggestedCategory}
              </span>
            </div>

            {/* Skill Tags */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Tag size={14} className="text-gray-400" />
                <span className="text-xs font-semibold text-gray-500">Recommended Skills</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {result.SkillTags.map((skill, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all duration-200 cursor-default"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Price Estimate */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100/80">
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-brand-500" />
                <span className="text-xs font-semibold text-gray-500">Estimated Price</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold bg-gradient-to-r from-brand-500 to-orange-500 bg-clip-text text-transparent">
                  {result.EstimatedBasePrice}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">UIU Market</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*  Error State  */}
      {error && !loading && (
        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/50 backdrop-blur-sm p-4 flex items-start gap-3 animate-slide-up">
          <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <button
              onClick={handleRetry}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
            >
              <RefreshCw size={11} />
              Try Again
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
