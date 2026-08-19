import React from 'react';
import { Star, Play, Bookmark, Check } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

export default function ContentCard({ media, onSelect }) {
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  if (!media) return null;

  const isBookmarked = isInWatchlist(media.slug);

  return (
    <div 
      onClick={() => onSelect(media)}
      className="group relative rounded-xl overflow-hidden bg-dark-card border border-dark-border/60 hover:border-brand-500/50 transition-all duration-300 transform hover:-translate-y-1.5 hover:shadow-glow-red cursor-pointer flex flex-col h-full"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-dark-surface">
        <img
          src={media.poster}
          alt={media.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&q=80';
          }}
        />

        {/* Dark Vignette Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-base via-transparent to-black/30 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
          <span className="px-2 py-0.5 text-[10px] font-extrabold tracking-wider uppercase rounded bg-brand-500/90 text-white shadow-sm backdrop-blur-sm">
            {media.quality || 'HD'}
          </span>

          {/* Bookmark Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(media);
            }}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all ${
              isBookmarked 
                ? 'bg-brand-500 text-white shadow-glow-red' 
                : 'bg-black/50 text-gray-300 hover:text-white hover:bg-black/80'
            }`}
            title={isBookmarked ? 'Hapus dari Watchlist' : 'Tambah ke Watchlist'}
          >
            {isBookmarked ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Play Button Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <div className="w-12 h-12 rounded-full bg-brand-500/90 text-white flex items-center justify-center shadow-glow-red transform scale-75 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-white ml-1" />
          </div>
        </div>

        {/* Bottom Poster Info Overlay */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between text-xs text-gray-300">
          <span className="uppercase text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/60 border border-white/10">
            {media.type}
          </span>
          <div className="flex items-center gap-1 font-bold text-amber-400 bg-black/60 px-1.5 py-0.5 rounded border border-white/10 text-[11px]">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {media.rating}
          </div>
        </div>
      </div>

      {/* Card Content Info */}
      <div className="p-3 flex flex-col flex-1 justify-between bg-dark-card">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-white line-clamp-1 group-hover:text-brand-500 transition-colors">
            {media.title}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
            <span>{media.year}</span>
            <span>•</span>
            <span className="truncate">{media.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
