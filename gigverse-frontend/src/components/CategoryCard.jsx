// src/components/CategoryCard.jsx
import { ArrowRight } from 'lucide-react';

export default function CategoryCard({ icon: Icon, title, gigCount, color, id }) {
  // TODO (Phase 3): navigate(`/search?category=${title}`)
  const handleClick = () => {
    console.log('[CategoryCard] Clicked category:', title);
  };

  return (
    <button
      id={`category-card-${id}`}
      onClick={handleClick}
      className="card group p-6 text-left w-full hover:-translate-y-1 hover:border-brand-200 hover:shadow-brand cursor-pointer transition-all duration-200"
    >
      {/* Icon badge */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-110"
        style={{ backgroundColor: color + '20', color }}
      >
        <Icon size={22} />
      </div>

      <h3 className="font-semibold text-gray-900 text-sm mb-1 group-hover:text-brand-600 transition-colors">
        {title}
      </h3>
      <p className="text-xs text-gray-400">{gigCount} gigs available</p>

      <div className="flex items-center gap-1 mt-3 text-brand-500 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-1 transition-all duration-200">
        <span className="text-xs font-semibold">Browse</span>
        <ArrowRight size={12} />
      </div>
    </button>
  );
}
