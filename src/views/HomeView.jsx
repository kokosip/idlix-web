import React, { useState, useEffect } from 'react';
import { Sparkles, Film, Tv, Trophy, Flame, Layers } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import ContentRail from '../components/ContentRail';
import { 
  getHomeSections, 
  getFeatured, 
  getCinemaXXI, 
  getTrendingMovies, 
  getTrendingSeries, 
  getLeaderboard,
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

      const [featRes, xx1Res, movRes, serRes, leadRes, secRes] = await Promise.all([
        getFeatured(),
        getCinemaXXI(),
        getTrendingMovies(),
        getTrendingSeries(),
        getLeaderboard(),
        getHomeSections(),
      ]);

      if (!isMounted) return;

      // Normalize featured items
      let feats = [];
      if (featRes.success && featRes.data) {
        const raw = Array.isArray(featRes.data) ? featRes.data : featRes.data.data || [];
        feats = raw.map(normalizeMediaItem);
      }
      if (feats.length === 0 && secRes.success && secRes.data) {
        // Try extracted sections
        const secFeatured = secRes.data.featured || secRes.data.trending || [];
        feats = secFeatured.map(normalizeMediaItem);
      }
      setFeaturedItems(feats);

      // CinemaXXI items
      let xx1 = [];
      if (xx1Res.success && xx1Res.data) {
        const raw = Array.isArray(xx1Res.data) ? xx1Res.data : xx1Res.data.data || [];
        xx1 = raw.map(normalizeMediaItem);
      }
      setCinemaXXIItems(xx1);

      // Trending Movies
      let tMov = [];
      if (movRes.success && movRes.data) {
        const raw = Array.isArray(movRes.data) ? movRes.data : movRes.data.data || [];
        tMov = raw.map(normalizeMediaItem);
      }
      setTrendingMovies(tMov);

      // Trending Series
      let tSer = [];
      if (serRes.success && serRes.data) {
        const raw = Array.isArray(serRes.data) ? serRes.data : serRes.data.data || [];
        tSer = raw.map(normalizeMediaItem);
      }
      setTrendingSeries(tSer);

      // Leaderboard items
      let lead = [];
      if (leadRes.success && leadRes.data) {
        const raw = Array.isArray(leadRes.data) ? leadRes.data : leadRes.data.data || [];
        lead = raw.map(normalizeMediaItem);
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
