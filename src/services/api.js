// API Service for IDLIX REST API v3

export const getApiBaseUrl = () => {
  const saved = localStorage.getItem('IDLIX_API_URL');
  if (saved) return saved;

  // In web production (when served by Nginx on port 80/443), use relative URL ''
  // so Nginx reverse-proxies /api/ directly to http://api:3000 inside Docker network!
  if (typeof window !== 'undefined' && window.location.port !== '5173') {
    return '';
  }

  return 'http://localhost:3001';
};

export const setApiBaseUrl = (url) => {
  const cleanUrl = url.trim().replace(/\/+$/, '');
  localStorage.setItem('IDLIX_API_URL', cleanUrl);
  return cleanUrl;
};

// Array Extractor Helper to handle any API payload format
export const extractMediaArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.movies)) return data.movies;
  if (Array.isArray(data.series)) return data.series;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.results)) return data.results;
  return [];
};

// Generic fetch wrapper
const fetchApi = async (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = baseUrl ? `${baseUrl}${cleanEndpoint}` : cleanEndpoint;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.warn(`[IDLIX API] Error fetching ${url}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Health Check
export const checkApiStatus = async () => {
  const res = await fetchApi('/api/home');
  return res;
};

// Homepage
export const getHomeFlat = () => fetchApi('/api/home');
export const getHomeSections = () => fetchApi('/api/home/sections');
export const getFeatured = () => fetchApi('/api/featured');
export const getCinemaXXI = () => fetchApi('/api/cinemaxxi');

// Search
export const searchContent = (query) => fetchApi(`/api/search?q=${encodeURIComponent(query)}`);

// Movies
export const getMovies = (page = 1) => fetchApi(`/api/movie?page=${page}`);
export const getTrendingMovies = () => fetchApi('/api/movie/trending');
export const getMovieDetail = (slug) => fetchApi(`/api/movie/${slug}`);
export const getMovieStream = (slug) => fetchApi(`/api/movie/${slug}/stream`);

// Series
export const getSeries = (page = 1) => fetchApi(`/api/series?page=${page}`);
export const getTrendingSeries = () => fetchApi('/api/series/trending');
export const getSeriesDetail = (slug) => fetchApi(`/api/series/${slug}`);
export const getSeasonDetail = (slug, season) => fetchApi(`/api/series/${slug}/season/${season}`);
export const getEpisodeStream = (slug, season, episode) => fetchApi(`/api/series/${slug}/season/${season}/episode/${episode}/stream`);

// Leaderboard
export const getLeaderboard = () => fetchApi('/api/leaderboard');

// Genres
export const getGenres = () => fetchApi('/api/genre');
export const getByGenre = (slug) => fetchApi(`/api/genre/${slug}`);
export const getMoviesByGenre = (slug) => fetchApi(`/api/genre/movie/${slug}`);
export const getSeriesByGenre = (slug) => fetchApi(`/api/genre/series/${slug}`);

// Countries
export const getCountries = () => fetchApi('/api/country');
export const getByCountry = (slug) => fetchApi(`/api/country/${slug}`);

// Years
export const getYears = () => fetchApi('/api/year');
export const getByYear = (year) => fetchApi(`/api/year/${year}`);

// Networks
export const getNetworks = () => fetchApi('/api/network');
export const getByNetwork = (slug) => fetchApi(`/api/network/${slug}`);

// Item Normalizer Helper to harmonize backend object variances
export const normalizeMediaItem = (item) => {
  if (!item) return null;
  
  const title = item.title || item.name || item.movie_title || item.series_title || 'Untitled';
  
  let slug = item.slug || item.id;
  if (!slug && item.link) {
    const parts = item.link.split('/').filter(Boolean);
    slug = parts[parts.length - 1];
  }
  if (!slug) {
    slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Type determination
  let type = item.type || item.media_type;
  if (!type) {
    if (item.link?.includes('/series/') || item.seasons || item.episodes || item.total_seasons) {
      type = 'series';
    } else {
      type = 'movie';
    }
  }

  const poster = item.poster || item.poster_path || item.thumbnail || item.image || item.img || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80';
  const backdrop = item.backdrop || item.backdrop_path || item.banner || poster;
  const rating = item.rating || item.vote_average || item.score || '8.5';
  const year = item.year || item.release_year || (item.release_date ? new Date(item.release_date).getFullYear() : '2024');
  const quality = item.quality || item.resolution || 'HD';
  const duration = item.duration || item.runtime || (type === 'series' ? 'Series' : '120 min');
  const synopsis = item.overview || item.synopsis || item.description || item.storyline || 'Tidak ada deskripsi tersedia.';

  return {
    ...item,
    id: slug,
    slug,
    title,
    type,
    poster,
    backdrop,
    rating,
    year,
    quality,
    duration,
    genres: item.genres || item.genre || [],
    synopsis,
  };
};
