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
  ListVideo,
  Users
} from 'lucide-react';
import { getMovieDetail, getSeriesDetail, getSeasonDetail, normalizeMediaItem } from '../services/api';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchHistory } from '../context/WatchHistoryContext';

export default function DetailModal({ media, onClose, onPlayStream }) {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [isLoadingSeason, setIsLoadingSeason] = useState(false);
  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { getSavedProgress, getMediaProgress } = useWatchHistory();

  // Disable background page scrolling while detail modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

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
          // Flatten res.data properties into merged detail object
          const detailObj = res.data.data || res.data;
          const merged = { ...normalized, ...detailObj };
          
          // Ensure synopsis is populated from overview if needed
          merged.synopsis = detailObj.overview || detailObj.synopsis || merged.synopsis;
          setDetail(merged);

          // Handle series seasons & initial episode population
          if (merged.type === 'series') {
            const seasonsArr = getSeasonNumbers(merged);
            const firstSeasonNum = seasonsArr[0] || 1;
            setSelectedSeason(firstSeasonNum);
            loadEpisodesForSeason(merged, firstSeasonNum);
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

  const getSeasonNumbers = (mediaDetail) => {
    if (!mediaDetail) return [1];
    if (Array.isArray(mediaDetail.seasons) && mediaDetail.seasons.length > 0) {
      return mediaDetail.seasons.map((s) => (typeof s === 'object' ? s.seasonNumber || s.season_number || 1 : s));
    }
    const count = mediaDetail.total_seasons || mediaDetail.seasons_count || 1;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  };

  const loadEpisodesForSeason = async (mediaDetail, seasonNum) => {
    // Check if episodes already exist in detail.seasons array
    if (Array.isArray(mediaDetail?.seasons)) {
      const matchedSeasonObj = mediaDetail.seasons.find(
        (s) => typeof s === 'object' && (s.seasonNumber === seasonNum || s.season_number === seasonNum)
      );
      if (matchedSeasonObj && Array.isArray(matchedSeasonObj.episodes) && matchedSeasonObj.episodes.length > 0) {
        setEpisodes(matchedSeasonObj.episodes);
        return;
      }
    }

    // Otherwise fetch via season detail API endpoint
    setIsLoadingSeason(true);
    const res = await getSeasonDetail(mediaDetail.slug, seasonNum);
    if (res.success && res.data) {
      const seasonData = res.data.data || res.data;
      const epList = seasonData.episodes || seasonData || [];
      setEpisodes(Array.isArray(epList) ? epList : []);
    } else {
      setEpisodes([]);
    }
    setIsLoadingSeason(false);
  };

  if (!media) return null;

  const displayData = detail || normalizeMediaItem(media);
  const isBookmarked = isInWatchlist(displayData.slug);
  const seasonsList = getSeasonNumbers(displayData);

  const handleSeasonChange = (seasonNum) => {
    setSelectedSeason(seasonNum);
    if (displayData) {
      loadEpisodesForSeason(displayData, seasonNum);
    }
  };

  const getPlayEpisodeTarget = () => {
    if (displayData.type !== 'series') return null;

    const saved = getMediaProgress(displayData.slug);
    if (saved && saved.season && saved.episode) {
      // If completed (percent >= 95), play the NEXT episode automatically
      if (saved.completed || (saved.percent && saved.percent >= 95)) {
        const nextEp = saved.episode + 1;
        return {
          season: saved.season,
          episode: nextEp,
          title: `Episode ${nextEp}`
        };
      }
      // Otherwise resume current episode
      return {
        season: saved.season,
        episode: saved.episode,
        title: saved.episodeTitle || `Episode ${saved.episode}`
      };
    }

    return {
      season: selectedSeason || 1,
      episode: 1,
      title: 'Episode 1'
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 md:p-10 overflow-y-auto bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl glass-panel rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl border border-dark-border max-h-[92vh] sm:max-h-[90vh] flex flex-col my-0 sm:my-auto">
        
        {/* Mobile Bottom Sheet Handle Indicator */}
        <div className="sm:hidden w-full pt-2 pb-1 bg-dark-surface/90 flex justify-center border-b border-white/5">
          <div className="w-12 h-1.5 rounded-full bg-gray-600/60" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 p-2.5 rounded-full bg-black/60 text-gray-300 hover:text-white hover:bg-black/90 transition-all backdrop-blur-md active:scale-95"
          aria-label="Tutup modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto hide-scrollbar flex-1 pb-20 sm:pb-0">
          
          {/* Backdrop Header */}
          <div className="relative h-48 sm:h-80 w-full bg-dark-surface">
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
            
            {/* Title overlay on banner */}
            <div className="absolute bottom-3 left-4 right-4 sm:bottom-4 sm:left-6 sm:right-6 flex items-end justify-between z-10">
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
                  <h2 className="text-lg sm:text-3xl font-black text-white tracking-tight leading-tight">
                    {displayData.title}
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="p-4 sm:p-8 space-y-5 sm:space-y-6">
            
            {/* Meta Row & Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dark-border/60 pb-5">
              <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-300 flex-wrap">
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

              {/* Desktop / Inline Action Buttons */}
              <div className="hidden sm:flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    onPlayStream(displayData, getPlayEpisodeTarget());
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs sm:text-sm shadow-glow-red transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Putar</span>
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
                {displayData.synopsis || displayData.overview || 'Tidak ada sinopsis yang tersedia.'}
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

            {/* Cast Members */}
            {displayData.cast && Array.isArray(displayData.cast) && displayData.cast.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-brand-500" />
                  <span>Pemeran Utama (Cast)</span>
                </div>
                <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                  {displayData.cast.map((actor, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-dark-card border border-dark-border flex-shrink-0 min-w-[140px]">
                      {actor.image && (
                        <img 
                          src={actor.image} 
                          alt={actor.name} 
                          className="w-8 h-8 rounded-full object-cover bg-dark-surface"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      )}
                      <div className="min-w-0 text-xs">
                        <div className="font-bold text-white truncate">{actor.name}</div>
                        {actor.character && (
                          <div className="text-[10px] text-gray-400 truncate">{actor.character}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TV Series Episode & Season Selector */}
            {displayData.type === 'series' && (
              <div className="space-y-4 pt-4 border-t border-dark-border/60">
                <div className="flex flex-wrap items-center justify-between gap-3">
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
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          selectedSeason === sNum
                            ? 'bg-brand-500 text-white shadow-glow-red'
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
                      const epNum = ep.episodeNumber || ep.episode_number || ep.episode || idx + 1;
                      const epTitle = ep.title || ep.name || `Episode ${epNum}`;
                      const epOverview = ep.overview || ep.synopsis || ep.description || 'Klik untuk memutar episode ini.';
                      const epThumb = ep.stillPath || ep.still_path || ep.thumbnail || ep.poster || displayData.backdrop;
                      const epSaved = getSavedProgress(displayData.slug, selectedSeason, epNum);

                      return (
                        <div
                          key={idx}
                          onClick={() => onPlayStream(displayData, { season: selectedSeason, episode: epNum })}
                          className="group p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover transition-all cursor-pointer flex items-center gap-3 relative overflow-hidden"
                        >
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-dark-surface flex-shrink-0">
                            <img
                              src={epThumb}
                              alt={epTitle}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&q=80';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-brand-500/30 transition-colors">
                              <Play className="w-5 h-5 fill-white text-white" />
                            </div>
                            {epSaved && epSaved.percent > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
                                <div className="h-full bg-brand-500 shadow-glow-red" style={{ width: `${epSaved.percent}%` }} />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className="text-xs font-bold text-white group-hover:text-brand-400 transition-colors truncate">
                                Ep {epNum}. {epTitle}
                              </h4>
                              {epSaved && (
                                <span className="text-[10px] font-extrabold text-brand-400 bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20 shrink-0">
                                  {epSaved.percent >= 95 ? 'Selesai' : `${epSaved.percent}%`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                              {epOverview}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-gray-400 bg-dark-card/50 rounded-xl border border-dashed border-dark-border">
                    Belum ada daftar episode khusus yang dimuat untuk Season {selectedSeason}. Klik "Putar" untuk memutar stream secara langsung.
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Sticky Mobile Floating Action Bar */}
        <div className="sm:hidden p-3 bg-dark-base/95 backdrop-blur-xl border-t border-dark-border/80 z-40 flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              onPlayStream(displayData, getPlayEpisodeTarget());
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs shadow-glow-red active:scale-95 transition-all"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Putar</span>
          </button>
          <button
            onClick={() => toggleWatchlist(displayData)}
            className={`p-3 rounded-full border transition-all active:scale-95 ${
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
    </div>
  );
}
