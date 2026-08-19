import React from 'react';
import { Bookmark, Trash2, Play } from 'lucide-react';
import ContentCard from '../components/ContentCard';
import { useWatchlist } from '../context/WatchlistContext';

export default function WatchlistView({ onSelectMedia }) {
  const { watchlist } = useWatchlist();

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-dark-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Watchlist Saya</h1>
            <p className="text-xs text-gray-400">
              Daftar film dan TV series yang telah Anda simpan ({watchlist.length} item)
            </p>
          </div>
        </div>
      </div>

      {/* Grid Display */}
      {watchlist.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {watchlist.map((item) => (
            <ContentCard key={item.slug || item.id} media={item} onSelect={onSelectMedia} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 bg-dark-card/40 rounded-3xl border border-dashed border-dark-border">
          <div className="p-4 rounded-full bg-dark-card border border-dark-border text-gray-500">
            <Bookmark className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">Watchlist Anda Masih Kosong</h3>
          <p className="text-xs text-gray-400 max-w-sm">
            Tandai ikon bookmark pada film atau TV series favorit Anda untuk menyimpannya di sini.
          </p>
        </div>
      )}

    </div>
  );
}
