import React, { useState, useEffect } from 'react';
import { Trophy, Star, Flame } from 'lucide-react';
import ContentCard from '../components/ContentCard';
import SkeletonCard from '../components/SkeletonCard';
import { getLeaderboard, normalizeMediaItem } from '../services/api';

export default function LeaderboardView({ onSelectMedia }) {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchLeaderboard = async () => {
      setIsLoading(true);
      const res = await getLeaderboard();
      if (isMounted) {
        if (res.success && res.data) {
          const raw = Array.isArray(res.data) ? res.data : res.data.data || [];
          setItems(raw.map(normalizeMediaItem));
        } else {
          setItems([]);
        }
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Banner Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/20 via-brand-500/10 to-dark-card border border-amber-500/30 overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-glow-indigo">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider">
              Top Ranked
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              IDLIX Leaderboard
            </h1>
            <p className="text-xs text-gray-300">
              Daftar film dan TV series berating paling tinggi dan terfavorit penonton.
            </p>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item, idx) => (
            <div key={item.slug || item.id} className="relative group">
              {/* Rank Overlay Badge */}
              <div className="absolute top-2 left-2 z-20 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-xs flex items-center justify-center shadow-lg border border-white/20">
                #{idx + 1}
              </div>
              <ContentCard media={item} onSelect={onSelectMedia} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400 bg-dark-card/40 rounded-3xl border border-dashed border-dark-border">
          Tidak ada data leaderboard yang tersedia saat ini.
        </div>
      )}

    </div>
  );
}
