// src/components/DynamicSearch.jsx — Reusable dynamic search with grouped suggestions
// Extracts the working search logic from WorkspaceHome into a portable component.
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Tag, ArrowUpRight } from 'lucide-react';
import { searchAPI } from '../lib/api';

function useDebounce(val, delay) {
  const [d, setD] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setD(val), delay);
    return () => clearTimeout(t);
  }, [val, delay]);
  return d;
}

export default function DynamicSearch({
  placeholder = 'Search gigs, skills, contributors...',
  className = '',
  inputClassName = '',
  compact = false,
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ skills: [], users: [] });
  const [sugLoading, setSugLoading] = useState(false);
  const [showSug, setShowSug] = useState(false);
  const containerRef = useRef(null);
  const debQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debQuery.length < 2) {
      setSuggestions({ skills: [], users: [] });
      return;
    }
    setSugLoading(true);
    searchAPI.autocomplete(debQuery)
      .then(r => setSuggestions(r.data.data || { skills: [], users: [] }))
      .catch(() => setSuggestions({ skills: [], users: [] }))
      .finally(() => setSugLoading(false));
  }, [debQuery]);

  const handleSugClick = (item, type) => {
    setShowSug(false);
    setQuery('');
    if (type === 'user') navigate(`/profile/${item.id}`);
    else navigate(`/search?skill=${encodeURIComponent(item.label)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?skill=${encodeURIComponent(query)}`);
      setShowSug(false);
    }
  };

  const hasSuggestions = suggestions.skills.length > 0 || suggestions.users.length > 0;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <form
        onSubmit={handleSubmit}
        className={`flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl hover:border-brand-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 transition-all duration-200 ${
          compact ? 'px-3 py-2' : 'px-4 py-2.5 rounded-2xl'
        }`}
      >
        <Search size={compact ? 14 : 15} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowSug(true); }}
          onFocus={() => setShowSug(true)}
          onBlur={() => setTimeout(() => setShowSug(false), 180)}
          placeholder={placeholder}
          className={`flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none ${inputClassName}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); setSuggestions({ skills: [], users: [] }); }}
            className="text-gray-300 hover:text-gray-500"
          >
            <X size={compact ? 11 : 13} />
          </button>
        )}
        {sugLoading && <Loader2 size={compact ? 12 : 13} className="animate-spin text-brand-500" />}
      </form>

      {/* ── Grouped suggestions dropdown ── */}
      {showSug && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-[9999] bg-white border border-gray-200 shadow-xl animate-slide-up"
             style={{ maxHeight: '360px', overflowY: 'auto' }}>

          {!hasSuggestions && !sugLoading && (
            <div className="px-5 py-4 text-sm text-gray-400">No results for &ldquo;{query}&rdquo;</div>
          )}

          {/* Skills group */}
          {suggestions.skills.length > 0 && (
            <div>
              <div className="px-5 py-2 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suggested Skills</p>
              </div>
              {suggestions.skills.map((item, i) => (
                <button
                  key={`sk-${i}`}
                  onMouseDown={() => handleSugClick(item, 'skill')}
                  className="flex items-center gap-3 w-full px-5 py-2.5 text-left hover:bg-brand-50 transition-colors duration-100"
                  style={{ borderBottom: '1px solid #f9fafb' }}
                >
                  <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <Tag size={12} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                    <p className="text-xs text-gray-400">{item.sub}</p>
                  </div>
                  <ArrowUpRight size={12} className="ml-auto text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {/* Contributors group */}
          {suggestions.users.length > 0 && (
            <div>
              <div className="px-5 py-2 border-b border-gray-100 border-t">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Suggested Contributors</p>
              </div>
              {suggestions.users.map((item, i) => {
                const ui = (item.label || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <button
                    key={`us-${i}`}
                    onMouseDown={() => handleSugClick(item, 'user')}
                    className="flex items-center gap-3 w-full px-5 py-2.5 text-left hover:bg-brand-50 transition-colors duration-100"
                    style={{ borderBottom: i < suggestions.users.length - 1 ? '1px solid #f9fafb' : 'none' }}
                  >
                    <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 bg-brand-gradient flex items-center justify-center text-white text-[10px] font-bold">
                      {item.avatar
                        ? <img src={item.avatar} alt="" className="w-full h-full object-cover" />
                        : ui}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub} · {item.PVP_Points} PVP</p>
                    </div>
                    <ArrowUpRight size={12} className="ml-auto text-gray-300" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
