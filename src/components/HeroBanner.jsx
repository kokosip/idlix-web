import React, { useState, useEffect } from 'react';
import { Play, Info, Bookmark, Star, ChevronLeft, ChevronRight, Sparkles, Check } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

export default function HeroBanner({ items = [], onSelectMedia, onPlayStream }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  useEffect(() => {
    if (!items || items.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [items]);

  if (!items || items.length === 0) {
    return (
      <div className="relative w-full h-[450px] sm:h-[520px] rounded-3xl overflow-hidden bg-dark-card border border-dark-border/40 animate-pulse flex items-center justify-center">
        <div className="text-gray-500 text-sm flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" />
          Memuat Unggulan...
        </div>
      </div>
    );
  }

  const item = items[currentIndex] || items[0];
  const isBookmarked = isInWatchlist(item.slug);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  return (
    <div className="relative w-full h-[480px] sm:h-[550px] md:h-[600px] rounded-3xl overflow-hidden shadow-2xl border border-dark-border/60 group">
      
      {/* Backdrop Image */}
      <div className="absolute inset-0 bg-dark-base">
        <img
          key={item.slug}
          src={item.backdrop || item.poster}
          alt={item.title}
          className="w-full h-full object-cover object-top filter brightness-90 animate-fade-in transition-transform duration-1000 group-hover:scale-105"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80';
          }}
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-base via-dark-base/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-base via-dark-base/70 to-transparent w-full md:w-3/4" />
      </div>

      {/* Content Container */}
      <div className="relative h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-12 z-10">
        
        {/* Badges row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2.5 py-1 text-xs font-black uppercase tracking-wider rounded-md bg-brand-500 text-white shadow-glow-red flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 fill-white" />
            Featured #{currentIndex + 1}
          </span>
          <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-dark-card/90 text-white border border-dark-border">
            {item.quality || 'HD'}
          </span>
          <span className="px-2 py-0.5 text-xs font-bold uppercase rounded bg-dark-card/90 text-gray-300 border border-dark-border">
            {item.type}
          </span>
          <div className="flex items-center gap-1 font-bold text-amber-400 bg-dark-card/90 px-2 py-0.5 rounded border border-dark-border text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            {item.rating}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none mb-3 drop-shadow-md max-w-3xl">
          {item.title}
        </h1>

        {/* Overview Synopsis */}
        <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 sm:line-clamp-3 max-w-2xl mb-6 font-normal leading-relaxed">
          {item.synopsis}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onPlayStream(item)}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs sm:text-sm shadow-glow-red hover:scale-105 active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Tonton Sekarang</span>
          </button>

          <button
            onClick={() => onSelectMedia(item)}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-dark-card/90 hover:bg-dark-hover border border-dark-border text-white font-bold text-xs sm:text-sm hover:border-gray-400 transition-all"
          >
            <Info className="w-4 h-4" />
            <span>Detail Info</span>
          </button>

          <button
            onClick={() => toggleWatchlist(item)}
            className={`p-3 rounded-full border transition-all ${
              isBookmarked 
                ? 'bg-brand-500/20 text-brand-500 border-brand-500 shadow-glow-red' 
                : 'bg-dark-card/90 text-gray-300 border-dark-border hover:text-white hover:border-gray-400'
            }`}
            title={isBookmarked ? 'Disimpan di Watchlist' : 'Tambah ke Watchlist'}
          >
            {isBookmarked ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Slide Navigation Arrows */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <button
            onClick={prevSlide}
            className="p-2.5 rounded-full bg-dark-card/80 border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-xs font-semibold text-gray-400 px-1">
            {currentIndex + 1} / {items.length}
          </div>
          <button
            onClick={nextSlide}
            className="p-2.5 rounded-full bg-dark-card/80 border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
