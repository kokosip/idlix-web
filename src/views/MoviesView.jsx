import React, { useState, useEffect } from 'react';
import { Film, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import ContentCard from '../components/ContentCard';
import SkeletonCard from '../components/SkeletonCard';
import { getMovies, normalizeMediaItem } from '../services/api';

export default function MoviesView({ onSelectMedia }) {
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMoviesData = async () => {
      setIsLoading(true);
      const res = await getMovies(page);
      if (isMounted) {
        if (res.success && res.data) {
          const raw = Array.isArray(res.data) ? res.data : res.data.data || res.data.movies || [];
          setMovies(raw.map(normalizeMediaItem));
        } else {
          setMovies([]);
        }
        setIsLoading(false);
      }
    };

    fetchMoviesData();
    return () => { isMounted = false; };
  }, [page]);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Katalog Film</h1>
            <p className="text-xs text-gray-400">Jelajahi koleksi film terlengkap (Halaman {page})</p>
          </div>
        </div>

        {/* Page Switcher Top */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
            className="p-2 rounded-xl bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 disabled:opacity-40 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-dark-card border border-dark-border text-white">
            {page}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading || movies.length === 0}
            className="p-2 rounded-xl bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 disabled:opacity-40 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid Display */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {movies.map((item) => (
            <ContentCard key={item.slug || item.id} media={item} onSelect={onSelectMedia} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center text-gray-400 bg-dark-card/40 rounded-3xl border border-dashed border-dark-border">
          Tidak ada film ditemukan pada halaman ini.
        </div>
      )}

      {/* Bottom Pagination */}
      <div className="flex items-center justify-center gap-3 pt-6 border-t border-dark-border/40">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1 || isLoading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-gray-300 hover:text-white hover:border-brand-500 disabled:opacity-40 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>
        <span className="text-xs font-extrabold text-brand-500 px-3 py-1">
          Halaman {page}
        </span>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={isLoading || movies.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-dark-card border border-dark-border text-xs font-bold text-gray-300 hover:text-white hover:border-brand-500 disabled:opacity-40 transition-all"
        >
          <span>Selanjutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
