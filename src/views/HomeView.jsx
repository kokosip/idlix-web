import React, { useState, useEffect } from 'react';
import { Film, Tv, Trophy, Flame } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
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

export default function HomeView({ onSelectMedia, onPlayStream }) {
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
