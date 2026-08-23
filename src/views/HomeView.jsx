import React, { useState, useEffect } from 'react';
import { Film, Tv, Trophy, Flame, History, Play, Trash2 } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
import { useWatchHistory } from '../context/WatchHistoryContext';
import { 
  getHomeSections, 
  getHomeFlat,
  getFeatured, 
  getCinemaXXI, 
  getTrendingMovies, 
  getTrendingSeries, 
  getLeaderboard,
  extractMediaArray,
  normalizeMediaItem 
} from '../services/api';

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return '00:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export default function HomeView({ onSelectMedia, onPlayStream }) {
  const { watchHistory, removeFromHistory, clearHistory } = useWatchHistory();
  const [featuredItems, setFeaturedItems] = useState([]);
  const [cinemaXXIItems, setCinemaXXIItems] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [leaderboardItems, setLeaderboardItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      const [featRes, xx1Res, movRes, serRes, leadRes, secRes, flatRes] = await Promise.all([
        getFeatured(),
        getCinemaXXI(),
        getTrendingMovies(),
        getTrendingSeries(),
        getLeaderboard(),
        getHomeSections(),
        getHomeFlat(),
      ]);

      if (!isMounted) return;

      const flatItems = flatRes.success ? extractMediaArray(flatRes.data).map(normalizeMediaItem) : [];

      // 1. Featured items
      let feats = featRes.success ? extractMediaArray(featRes.data).map(normalizeMediaItem) : [];
      if (feats.length === 0 && secRes.success && secRes.data) {
        feats = extractMediaArray(secRes.data.featured || secRes.data.trending).map(normalizeMediaItem);
      }
      if (feats.length === 0 && flatItems.length > 0) {
        feats = flatItems.slice(0, 5);
      }
      setFeaturedItems(feats);

      // 2. CinemaXXI items
      let xx1 = xx1Res.success ? extractMediaArray(xx1Res.data).map(normalizeMediaItem) : [];
      if (xx1.length === 0 && secRes.success && secRes.data) {
        xx1 = extractMediaArray(secRes.data.cinemaxxi || secRes.data.cinema_xxi).map(normalizeMediaItem);
      }
      if (xx1.length === 0 && flatItems.length > 0) {
        xx1 = flatItems.filter((i) => i.type === 'movie').slice(0, 10);
      }
      setCinemaXXIItems(xx1);

      // 3. Trending Movies
      let tMov = movRes.success ? extractMediaArray(movRes.data).map(normalizeMediaItem) : [];
      if (tMov.length === 0 && secRes.success && secRes.data) {
        tMov = extractMediaArray(secRes.data.movies || secRes.data.trending_movies).map(normalizeMediaItem);
      }
      if (tMov.length === 0 && flatItems.length > 0) {
        tMov = flatItems.filter((i) => i.type === 'movie');
      }
      setTrendingMovies(tMov);

      // 4. Trending Series
      let tSer = serRes.success ? extractMediaArray(serRes.data).map(normalizeMediaItem) : [];
      if (tSer.length === 0 && secRes.success && secRes.data) {
        tSer = extractMediaArray(secRes.data.series || secRes.data.trending_series).map(normalizeMediaItem);
      }
      if (tSer.length === 0 && flatItems.length > 0) {
        tSer = flatItems.filter((i) => i.type === 'series');
      }
      setTrendingSeries(tSer);

      // 5. Leaderboard items
      let lead = leadRes.success ? extractMediaArray(leadRes.data).map(normalizeMediaItem) : [];
      if (lead.length === 0 && flatItems.length > 0) {
        lead = flatItems.slice(0, 10);
      }
      setLeaderboardItems(lead);

      setIsLoading(false);
    };

    loadData();
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Featured Hero Banner */}
      <HeroBanner 
        items={featuredItems} 
        onSelectMedia={onSelectMedia} 
        onPlayStream={onPlayStream} 
      />

      {/* Continue Watching (Lanjutkan Menonton) Rail */}
      {watchHistory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <History className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Lanjutkan Menonton
                </h2>
                <p className="text-xs text-gray-400">
                  Lanjutkan dari posisi menit terakhir Anda menonton
                </p>
              </div>
            </div>

            <button
              onClick={clearHistory}
              className="text-xs text-gray-400 hover:text-rose-400 transition-colors flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10"
              title="Hapus semua riwayat menonton"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bersihkan</span>
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {watchHistory.map((item) => {
              const mediaObj = {
                slug: item.mediaSlug,
                title: item.title,
                type: item.mediaType,
                poster: item.poster,
                backdrop: item.backdrop,
              };
              const epInfo = item.mediaType === 'series'
                ? { season: item.season, episode: item.episode, title: item.episodeTitle }
                : null;

              return (
                <div
                  key={item.key}
                  className="relative group shrink-0 w-52 sm:w-64 bg-dark-card border border-dark-border rounded-xl overflow-hidden hover:border-brand-500/50 transition-all duration-300 shadow-lg hover:shadow-glow-red/20 cursor-pointer"
                  onClick={() => onPlayStream(mediaObj, epInfo)}
                >
                  {/* Backdrop / Poster Container */}
                  <div className="relative aspect-video w-full bg-dark-surface overflow-hidden">
                    <img
                      src={item.backdrop || item.poster}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-card via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-3 rounded-full bg-brand-500 text-white shadow-glow-red opacity-90 group-hover:scale-110 group-hover:opacity-100 transition-all duration-300">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Remove Item Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(item.key);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-rose-600 transition-all opacity-0 group-hover:opacity-100"
                      title="Hapus dari riwayat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Progress Bar anchored at bottom of thumbnail */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/80">
                      <div
                        className="h-full bg-brand-500 shadow-glow-red transition-all duration-300"
                        style={{ width: `${item.percent || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Card Content Info */}
                  <div className="p-3">
                    <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-brand-400 transition-colors">
                      {item.title}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-gray-400">
                      <span className="truncate font-medium text-brand-300">
                        {item.mediaType === 'series'
                          ? `S${item.season} E${item.episode} • ${item.episodeTitle || ''}`
                          : 'Film'}
                      </span>
                      <span className="font-mono text-[10px] shrink-0 text-gray-400">
                        {formatTime(item.progress)} / {formatTime(item.duration)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CinemaXXI Movies Rail */}
      <ContentRail
        title="Bioskop XXI Terbaru"
        subtitle="Rilisan film terbaru yang sedang tayang di bioskop XXI"
        icon={Film}
        items={cinemaXXIItems}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Trending Movies Rail */}
      <ContentRail
        title="Film Trending"
        subtitle="Paling banyak ditonton minggu ini"
        icon={Flame}
        items={trendingMovies}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Trending Series Rail */}
      <ContentRail
        title="TV Series & K-Drama Populer"
        subtitle="Serial TV terpopuler dengan rating tertinggi"
        icon={Tv}
        items={trendingSeries}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Leaderboard Ranking Rail */}
      <ContentRail
        title="Leaderboard Top Rank"
        subtitle="Peringkat teratas terfavorit pengguna IDLIX"
        icon={Trophy}
        items={leaderboardItems}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

    </div>
  );
}
