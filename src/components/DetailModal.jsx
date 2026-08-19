import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  Bookmark, 
  Star, 
  Calendar, 
  Clock, 
  Globe, 
  Tv, 
  Film, 
  Check,
  Loader2,
  ListVideo
} from 'lucide-react';
import { getMovieDetail, getSeriesDetail, getSeasonDetail, normalizeMediaItem } from '../services/api';
import { useWatchlist } from '../context/WatchlistContext';

export default function DetailModal({ media, onClose, onPlayStream }) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();

  useEffect(() => {
    if (!media) return;

    let isMounted = true;
    const fetchDetail = async () => {
      setIsLoading(true);
      const normalized = normalizeMediaItem(media);

      let res;
      if (normalized.type === 'series') {
        res = await getSeriesDetail(normalized.slug);
      } else {
        res = await getMovieDetail(normalized.slug);
      }

      if (isMounted) {
        if (res.success && res.data) {
          const merged = { ...normalized, ...res.data };
          setDetail(merged);

          // Handle series seasons & initial episode population
          if (merged.type === 'series') {
            const initialSeasons = merged.seasons || merged.season_list || [1];
            const firstSeasonNum = Array.isArray(initialSeasons) 
              ? (typeof initialSeasons[0] === 'object' ? initialSeasons[0].season_number || 1 : initialSeasons[0]) 
              : 1;
            
            setSelectedSeason(firstSeasonNum);
            if (merged.episodes && Array.isArray(merged.episodes) && merged.episodes.length > 0) {
              setEpisodes(merged.episodes);
            } else {
              fetchSeasonEpisodes(normalized.slug, firstSeasonNum);
            }
          }
        } else {
          setDetail(normalized);
        }
        setIsLoading(false);
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [media]);

  const fetchSeasonEpisodes = async (slug, seasonNum) => {
    setIsLoadingSeason(true);
    const res = await getSeasonDetail(slug, seasonNum);
    if (res.success && res.data) {
      const epList = res.data.episodes || res.data || [];
      setEpisodes(Array.isArray(epList) ? epList : []);
    } else {
      setEpisodes([]);
    }
    setIsLoadingSeason(false);
  };

  const handleSeasonChange = (seasonNum) => {
    setSelectedSeason(seasonNum);
    if (detail) {
      fetchSeasonEpisodes(detail.slug, seasonNum);
    }
  };

  if (!media) return null;

  const displayData = detail || normalizeMediaItem(media);
  const isBookmarked = isInWatchlist(displayData.slug);

  // Available seasons list
  const seasonsCount = displayData.total_seasons || displayData.seasons_count || 
    (Array.isArray(displayData.seasons) ? displayData.seasons.length : 1);
  const seasonsList = Array.from({ length: Math.max(1, seasonsCount) }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-dark-border max-h-[90vh] flex flex-col my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 transition-all backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto hide-scrollbar flex-1">
          
          {/* Backdrop Header */}
          <div className="relative h-64 sm:h-80 w-full bg-dark-surface">
            <img
              src={displayData.backdrop || displayData.poster}
              alt={displayData.title}
              className="w-full h-full object-cover filter brightness-90"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-dark-surface via-dark-surface/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-dark-surface via-transparent to-transparent" />
            
            {/* Quick Title overlay on banner */}
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between z-10">
              <div className="flex items-center gap-4">
                <img
                  src={displayData.poster}
                  alt={displayData.title}
                  className="w-24 sm:w-32 aspect-[2/3] object-cover rounded-xl shadow-2xl border border-dark-border hidden sm:block"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="uppercase text-[10px] font-extrabold px-2 py-0.5 rounded bg-brand-500 text-white">
                      {displayData.quality || 'HD'}
                    </span>
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-dark-card border border-dark-border text-gray-300">
                      {displayData.type}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                    {displayData.title}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Meta Row & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dark-border/60 pb-6">
              <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-300 flex-wrap">
                <div className="flex items-center gap-1 text-amber-400 font-bold bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{displayData.rating}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{displayData.year}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{displayData.duration}</span>
                </div>
                {displayData.country && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>{displayData.country}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    onPlayStream(displayData, displayData.type === 'series' ? { season: selectedSeason, episode: 1 } : null);
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs sm:text-sm shadow-glow-red transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Tonton Film</span>
                </button>
                <button
                  onClick={() => toggleWatchlist(displayData)}
                  className={`p-3 rounded-full border transition-all ${
                    isBookmarked 
                      ? 'bg-brand-500/20 text-brand-500 border-brand-500' 
                      : 'bg-dark-card text-gray-300 border-dark-border hover:text-white'
                  }`}
                  title={isBookmarked ? 'Disimpan di Watchlist' : 'Tambah ke Watchlist'}
                >
                  {isBookmarked ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Synopsis */}
            <div>
              <h3 className="text-sm font-bold text-gray-200 mb-2 uppercase tracking-wider">Sinopsis</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {displayData.synopsis}
              </p>
            </div>

            {/* Genres Chips */}
            {displayData.genres && displayData.genres.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Genre</h3>
                <div className="flex flex-wrap gap-2">
                  {displayData.genres.map((g, idx) => (
                    <span 
                      key={idx}
                      className="px-3 py-1 rounded-full bg-dark-card border border-dark-border text-xs text-gray-300 font-medium"
                    >
                      {typeof g === 'object' ? g.name : g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TV Series Episode & Season Selector */}
            {displayData.type === 'series' && (
              <div className="space-y-4 pt-4 border-t border-dark-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <ListVideo className="w-5 h-5 text-brand-500" />
                    <span>Daftar Episode</span>
                  </div>

                  {/* Season Tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar py-1">
                    {seasonsList.map((sNum) => (
                      <button
                        key={sNum}
                        onClick={() => handleSeasonChange(sNum)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          selectedSeason === sNum
                            ? 'bg-brand-500 text-white shadow-sm'
                            : 'bg-dark-card text-gray-400 hover:text-white border border-dark-border'
                        }`}
                      >
                        Season {sNum}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Episode Cards Grid */}
                {isLoadingSeason ? (
                  <div className="py-8 text-center text-gray-400 flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                    <span className="text-xs">Memuat episode Season {selectedSeason}...</span>
                  </div>
                ) : episodes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {episodes.map((ep, idx) => {
                      const epNum = ep.episode_number || ep.episode || idx + 1;
                      const epTitle = ep.title || ep.name || `Episode ${epNum}`;
                      const epThumb = ep.still_path || ep.thumbnail || ep.poster || displayData.backdrop;

                      return (
                        <div
                          key={idx}
                          onClick={() => onPlayStream(displayData, { season: selectedSeason, episode: epNum })}
                          className="group p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-dark-surface flex-shrink-0">
                            <img
                              src={epThumb}
                              alt={epTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-brand-500/30 transition-colors">
                              <Play className="w-4 h-4 fill-white text-white" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[11px] text-brand-500 font-bold">
                              Eps {epNum}
                            </div>
                            <h4 className="text-xs font-bold text-white truncate group-hover:text-brand-500 transition-colors">
                              {epTitle}
                            </h4>
                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                              {ep.overview || ep.synopsis || 'Klik untuk memutar episode ini.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400 bg-dark-card/50 rounded-xl border border-dashed border-dark-border">
                    Belum ada episode khusus yang dimuat untuk Season {selectedSeason}. Memutar otomatis Episode 1.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
