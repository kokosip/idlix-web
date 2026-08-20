import React, { useState, useEffect, useRef } from 'react';
import { 
  Film, 
  Tv, 
  Trophy, 
  Bookmark, 
  Search, 
  SlidersHorizontal, 
  Server, 
  X, 
  Star,
  Play,
  Loader2
} from 'lucide-react';
import { searchContent, normalizeMediaItem } from '../services/api';
import { useWatchlist } from '../context/WatchlistContext';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  onSelectMedia, 
  onOpenApiConfig, 
  onOpenFilter,
  apiOnline 
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isMobileSearchExpanded, setIsMobileSearchExpanded] = useState(false);

  const searchRef = useRef(null);
  const { watchlist } = useWatchlist();

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const res = await searchContent(query.trim());
      setIsSearching(false);
      
      if (res.success && Array.isArray(res.data)) {
        setResults(res.data.map(normalizeMediaItem));
      } else if (res.success && res.data?.data) {
        setResults((res.data.data || []).map(normalizeMediaItem));
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Film },
    { id: 'movies', label: 'Film', icon: Film },
    { id: 'series', label: 'TV Series', icon: Tv },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark, badge: watchlist.length },
  ];

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-dark-border/50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-8 shrink-0">
            <button 
              onClick={() => setActiveTab('home')} 
              className="flex items-center gap-2 group text-left focus:outline-none"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-700 via-brand-500 to-rose-400 p-0.5 shadow-glow-red group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-dark-base rounded-[10px] flex items-center justify-center">
                  <span className="text-lg sm:text-xl font-black text-brand-500 tracking-tighter">ID</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-wider text-white flex items-center gap-1">
                  IDLIX <span className="text-brand-500 text-[10px] sm:text-xs px-1.5 py-0.5 rounded bg-brand-500/10 border border-brand-500/30">v3</span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-gray-400 font-medium -mt-1 tracking-widest uppercase hidden sm:block">Stream Hub</span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-brand-500/15 text-brand-500 border border-brand-500/30 shadow-sm' 
                        : 'text-gray-300 hover:text-white hover:bg-dark-hover/60'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-brand-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right Actions: Search, Filter, Server Status */}
          <div className="flex items-center gap-1.5 sm:gap-3 flex-1 justify-end">
            
            {/* Search Input Container (Responsive & Touch Friendly) */}
            <div className="relative flex-1 sm:flex-none max-w-[200px] sm:max-w-xs md:max-w-sm" ref={searchRef}>
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Cari film, series..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  className="w-full bg-dark-card/90 border border-dark-border text-xs sm:text-sm text-white rounded-full py-1.5 sm:py-2 pl-8 sm:pl-9 pr-7 sm:pr-8 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all placeholder:text-gray-500"
                />
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-2.5 sm:left-3 pointer-events-none" />
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500 animate-spin absolute right-2.5 sm:right-3" />
                ) : query && (
                  <button 
                    onClick={() => setQuery('')}
                    className="absolute right-2.5 sm:right-3 text-gray-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                )}
              </div>

              {/* Search Dropdown Preview */}
              {showSearchDropdown && query.trim() !== '' && (
                <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto mt-1 sm:mt-2 sm:w-96 glass-panel rounded-2xl shadow-2xl border border-dark-border overflow-hidden z-50 animate-fade-in max-h-[75vh] overflow-y-auto">
                  <div className="p-3 border-b border-dark-border/60 flex items-center justify-between text-xs text-gray-400">
                    <span>Hasil Pencarian: "{query}"</span>
                    <span>{results.length} ditemukan</span>
                  </div>

                  {isSearching ? (
                    <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
                      <span className="text-xs">Mencari di IDLIX...</span>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="divide-y divide-dark-border/40">
                      {results.slice(0, 8).map((item) => (
                        <button
                          key={item.slug}
                          onClick={() => {
                            onSelectMedia(item);
                            setShowSearchDropdown(false);
                            setQuery('');
                          }}
                          className="w-full p-2.5 flex items-center gap-3 hover:bg-dark-hover/80 text-left transition-colors group active:bg-dark-hover"
                        >
                          <img
                            src={item.poster}
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded-lg bg-dark-card flex-shrink-0 group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=150&q=80';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-brand-500 transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                              <span className="uppercase text-[10px] px-1.5 py-0.2 rounded bg-dark-card border border-dark-border text-gray-300 font-bold">
                                {item.type}
                              </span>
                              <span>{item.year}</span>
                              <span className="flex items-center gap-0.5 text-amber-400 font-medium">
                                <Star className="w-3 h-3 fill-amber-400" />
                                {item.rating}
                              </span>
                            </div>
                          </div>
                          <Play className="w-4 h-4 text-gray-500 group-hover:text-brand-500 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-400">
                      Tidak ada film atau series ditemukan untuk "{query}".
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Category / Filter Drawer Button */}
            <button
              onClick={onOpenFilter}
              className="p-2 rounded-full bg-dark-card/80 border border-dark-border text-gray-300 hover:text-white hover:border-brand-500/50 hover:bg-dark-hover transition-all shrink-0 active:scale-95"
              title="Filter Kategori"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {/* API Status Badge & Config Modal Launcher */}
            <button
              onClick={onOpenApiConfig}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 active:scale-95 ${
                apiOnline 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              }`}
              title="Pengaturan API Host"
            >
              <Server className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">API</span>
              <span className={`w-2 h-2 rounded-full ${apiOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </button>

          </div>
        </div>
      </div>
    </header>
  );
}
