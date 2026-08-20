import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ContentCard from './ContentCard';
import SkeletonCard from './SkeletonCard';

export default function ContentRail({ 
  title, 
  subtitle, 
  items = [], 
  isLoading = false, 
  onSelectMedia,
  icon: Icon
}) {
  const scrollRef = useRef(null);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-6 relative">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500 border border-brand-500/20">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Scroll Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleScroll('left')}
            className="p-2 rounded-full bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 hover:bg-dark-hover transition-all"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            className="p-2 rounded-full bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 hover:bg-dark-hover transition-all"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Rail Container */}
      <div 
        ref={scrollRef}
        className="flex gap-3 sm:gap-4 overflow-x-auto hide-scrollbar scroll-smooth snap-x snap-mandatory pb-4 px-4 sm:px-0 -mx-4 sm:mx-0"
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="w-32 sm:w-44 md:w-52 flex-shrink-0 snap-start">
              <SkeletonCard />
            </div>
          ))
        ) : items && items.length > 0 ? (
          items.map((item) => (
            <div key={item.slug || item.id} className="w-32 sm:w-44 md:w-52 flex-shrink-0 snap-start">
              <ContentCard media={item} onSelect={onSelectMedia} />
            </div>
          ))
        ) : (
          <div className="w-full py-8 text-center text-xs text-gray-500 bg-dark-surface/50 rounded-xl border border-dashed border-dark-border">
            Belum ada konten tersedia pada seksi ini.
          </div>
        )}
      </div>
    </section>
  );
}
