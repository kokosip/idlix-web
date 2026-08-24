import React, { useState, useEffect } from 'react';
import { Film, Tv, Trophy, Flame, History, Play, Trash2, Sparkles, Globe } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
import { useWatchHistory, deduplicateWatchHistory } from '../context/WatchHistoryContext';
import { 
  getHomeSections, 
  getHomeFlat,
  getFeatured, 
  getCinemaXXI, 
  getMovies,
  getSeries,
  getTrendingMovies, 
  getTrendingSeries, 
  getLeaderboard,
  getNetworks,
  getByNetwork,
  getByCountry,
  getByGenre,
  searchContent,
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

const NETWORK_STYLES = {
  'netflix': {
    bg: 'from-red-950/60 to-dark-card border-red-500/30 text-red-400 hover:border-red-500',
    active: 'bg-red-600 text-white shadow-glow-red border-red-500 font-extrabold',
  },
  'hbo': {
    bg: 'from-purple-950/60 to-dark-card border-purple-500/30 text-purple-400 hover:border-purple-500',
    active: 'bg-purple-600 text-white shadow-lg border-purple-500 font-extrabold',
  },
  'prime-video': {
    bg: 'from-sky-950/60 to-dark-card border-sky-500/30 text-sky-400 hover:border-sky-500',
    active: 'bg-sky-600 text-white shadow-lg border-sky-500 font-extrabold',
  },
  'disney-plus': {
    bg: 'from-blue-950/60 to-dark-card border-blue-500/30 text-blue-400 hover:border-blue-500',
    active: 'bg-blue-600 text-white shadow-lg border-blue-500 font-extrabold',
  },
  'apple-tv-plus': {
    bg: 'from-slate-800 to-dark-card border-slate-400/30 text-slate-300 hover:border-slate-300',
    active: 'bg-slate-200 text-black shadow-lg border-white font-black',
  },
};

const POPULAR_COUNTRIES = [
  { name: 'Korea Selatan', code: 'KR', flag: '🇰🇷' },
  { name: 'Jepang', code: 'JP', flag: '🇯🇵' },
  { name: 'Amerika Serikat', code: 'US', flag: '🇺🇸' },
  { name: 'Inggris (UK)', code: 'GB', flag: '🇬🇧' },
  { name: 'Thailand', code: 'TH', flag: '🇹🇭' },
  { name: 'Taiwan', code: 'TW', flag: '🇹🇼' },
];

export default function HomeView({ onSelectMedia, onPlayStream }) {
  const { watchHistory, removeFromHistory, clearHistory } = useWatchHistory();
  const [featuredItems, setFeaturedItems] = useState([]);
  const [recentMovies, setRecentMovies] = useState([]);
  const [recentSeries, setRecentSeries] = useState([]);
  const [animeItems, setAnimeItems] = useState([]);
  const [cinemaXXIItems, setCinemaXXIItems] = useState([]);
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingSeries, setTrendingSeries] = useState([]);
  const [leaderboardItems, setLeaderboardItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Network Originals State
  const [networks, setNetworks] = useState([]);
  const [selectedNetwork, setSelectedNetwork] = useState({ name: 'Netflix', slug: 'netflix' });
  const [networkItems, setNetworkItems] = useState([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);

  // Country Catalog State
  const [selectedCountry, setSelectedCountry] = useState(POPULAR_COUNTRIES[0]);
  const [countryItems, setCountryItems] = useState([]);
  const [isLoadingCountry, setIsLoadingCountry] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      const [featRes, recRes, recSerRes, animeRes, xx1Res, movRes, serRes, leadRes, secRes, flatRes] = await Promise.all([
        getFeatured(),
        getMovies(),
        getSeries(),
        getByGenre('animation'),
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

      // 2. Recently Added Movies
      let recs = recRes.success ? extractMediaArray(recRes.data).map(normalizeMediaItem) : [];
      if (recs.length === 0 && flatItems.length > 0) {
        recs = flatItems.filter((i) => i.type === 'movie');
      }
      setRecentMovies(recs);

      // 3. Recently Added Series
      let recSeries = recSerRes.success ? extractMediaArray(recSerRes.data).map(normalizeMediaItem) : [];
      if (recSeries.length === 0 && flatItems.length > 0) {
        recSeries = flatItems.filter((i) => i.type === 'series');
      }
      setRecentSeries(recSeries);

      // 4. Anime & Animasi
      let animes = animeRes.success ? extractMediaArray(animeRes.data).map(normalizeMediaItem) : [];
      setAnimeItems(animes);

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

  // Fetch Networks List
  useEffect(() => {
    let isMounted = true;
    const fetchNetworksList = async () => {
      const res = await getNetworks();
      if (!isMounted) return;
      if (res.success && res.data) {
        const raw = Array.isArray(res.data) ? res.data : res.data.networks || res.data.data || [];
        const formatted = raw.map((n) => ({
          name: n.title || n.name || n.slug,
          slug: n.slug || n.value || n.network,
        }));
        if (formatted.length > 0) {
          setNetworks(formatted);
          setSelectedNetwork(formatted[0]);
          return;
        }
      }
      // Default fallback networks
      const fallback = [
        { name: 'Netflix', slug: 'netflix' },
        { name: 'HBO', slug: 'hbo' },
        { name: 'Prime Video', slug: 'prime-video' },
        { name: 'Disney+', slug: 'disney-plus' },
        { name: 'Apple TV+', slug: 'apple-tv-plus' },
      ];
      setNetworks(fallback);
      setSelectedNetwork(fallback[0]);
    };

    fetchNetworksList();
    return () => { isMounted = false; };
  }, []);

  // Fetch Content for Selected Network
  useEffect(() => {
    if (!selectedNetwork?.slug) return;
    let isMounted = true;

    const loadNetworkContent = async () => {
      setIsLoadingNetwork(true);
      const slug = (selectedNetwork.slug || '').toLowerCase();

      let searchQuery = slug;
      if (slug === 'prime-video' || slug === 'amazon') searchQuery = 'prime';
      if (slug === 'disney-plus' || slug === 'disney') searchQuery = 'disney';
      if (slug === 'apple-tv-plus' || slug === 'apple-tv') searchQuery = 'apple';
      if (slug === 'hbo' || slug === 'hbo-max') searchQuery = 'hbo';
      if (slug === 'netflix') searchQuery = 'netflix';

      // 1. Fetch network specific titles via network search API
      let res = await searchContent(searchQuery);
      let items = [];

      if (res.success && res.data) {
        items = extractMediaArray(res.data).map(normalizeMediaItem);
      }

      // 2. Fallback to getByNetwork if search returned nothing
      if (items.length === 0) {
        const netRes = await getByNetwork(slug);
        if (netRes.success && netRes.data) {
          items = extractMediaArray(netRes.data).map(normalizeMediaItem);
        }
      }

      if (!isMounted) return;
      setNetworkItems(items);
      setIsLoadingNetwork(false);
    };

    loadNetworkContent();
    return () => { isMounted = false; };
  }, [selectedNetwork]);

  // Fetch Content for Selected Country
  useEffect(() => {
    if (!selectedCountry?.code) return;
    let isMounted = true;

    const loadCountryContent = async () => {
      setIsLoadingCountry(true);
      const res = await getByCountry(selectedCountry.code);
      if (!isMounted) return;
      if (res.success && res.data) {
        const items = extractMediaArray(res.data).map(normalizeMediaItem);
        setCountryItems(items);
      } else {
        setCountryItems([]);
      }
      setIsLoadingCountry(false);
    };

    loadCountryContent();
    return () => { isMounted = false; };
  }, [selectedCountry]);

  return (
    <div className="space-y-3 sm:space-y-4 pb-8">
      
      {/* Featured Hero Banner */}
      <HeroBanner 
        items={featuredItems} 
        onSelectMedia={onSelectMedia} 
        onPlayStream={onPlayStream} 
      />

      {/* Continue Watching (Lanjutkan Menonton) Rail */}
      {(() => {
        const uniqueHistory = deduplicateWatchHistory(watchHistory);
        if (uniqueHistory.length === 0) return null;

        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    Lanjutkan Menonton
                  </h2>
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
              {uniqueHistory.map((item) => {
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
      );
    })()}

      {/* Streaming Network Originals Section */}
      {networks.length > 0 && (
        <div className="space-y-2 pt-0.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-brand-500/20 text-brand-400 border border-brand-500/30">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Streaming Network Originals
                </h2>
              </div>
            </div>

            {/* Network Brand Selector Pills */}
            <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
              {networks.map((net) => {
                const slugKey = (net.slug || '').toLowerCase();
                const isSelected = selectedNetwork?.slug === net.slug;
                const style = NETWORK_STYLES[slugKey] || {
                  bg: 'from-dark-card to-dark-surface border-white/10 text-gray-300',
                  active: 'bg-brand-500 text-white shadow-glow-red border-brand-400 font-extrabold',
                };

                return (
                  <button
                    key={net.slug}
                    onClick={() => setSelectedNetwork(net)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shrink-0 ${
                      isSelected
                        ? style.active
                        : `bg-gradient-to-r ${style.bg} hover:scale-105 active:scale-95`
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isSelected ? 'fill-current' : 'text-gray-400'}`} />
                    <span>{net.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Network Content Rail */}
          <ContentRail
            title={`${selectedNetwork?.name || 'Network'} Originals`}
            icon={Tv}
            items={networkItems}
            isLoading={isLoadingNetwork}
            onSelectMedia={onSelectMedia}
          />
        </div>
      )}

      {/* Country Catalog Section */}
      <div className="space-y-2 pt-0.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Katalog Berdasarkan Negara
              </h2>
            </div>
          </div>

          {/* Country Selector Pills */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
            {POPULAR_COUNTRIES.map((c) => {
              const isSelected = selectedCountry?.code === c.code;

              return (
                <button
                  key={c.code}
                  onClick={() => setSelectedCountry(c)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-lg border-blue-400 font-extrabold'
                      : 'bg-dark-card text-gray-300 border-white/10 hover:border-white/20 hover:text-white active:scale-95'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Country Content Rail */}
        <ContentRail
          title={`Film & Series ${selectedCountry?.name || ''}`}
          icon={Globe}
          items={countryItems}
          isLoading={isLoadingCountry}
          onSelectMedia={onSelectMedia}
        />
      </div>

      {/* Recently Added Movies Rail */}
      <ContentRail
        title="Recently Added Movies"
        icon={Film}
        items={recentMovies}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Recently Added Series Rail */}
      <ContentRail
        title="Recently Added Series"
        icon={Tv}
        items={recentSeries}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Anime & Animasi Rail */}
      <ContentRail
        title="Anime & Animasi Populer"
        icon={Sparkles}
        items={animeItems}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* CinemaXXI Movies Rail */}
      <ContentRail
        title="Bioskop XXI Terbaru"
        icon={Film}
        items={cinemaXXIItems}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Trending Movies Rail */}
      <ContentRail
        title="Film Trending"
        icon={Flame}
        items={trendingMovies}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Trending Series Rail */}
      <ContentRail
        title="TV Series & K-Drama Populer"
        icon={Tv}
        items={trendingSeries}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

      {/* Leaderboard Ranking Rail */}
      <ContentRail
        title="Leaderboard Top Rank"
        icon={Trophy}
        items={leaderboardItems}
        isLoading={isLoading}
        onSelectMedia={onSelectMedia}
      />

    </div>
  );
}
