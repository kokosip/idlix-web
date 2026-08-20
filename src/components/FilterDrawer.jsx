import React, { useState, useEffect } from 'react';
import { X, Filter, Film, Globe, Calendar, Tv, ChevronRight, Check } from 'lucide-react';
import { getGenres, getCountries, getYears, getNetworks } from '../services/api';

export default function FilterDrawer({ isOpen, onClose, onSelectCategory }) {
  const [activeTab, setActiveTab] = useState('genres');
  const [genres, setGenres] = useState([]);
  const [countries, setCountries] = useState([]);
  const [years, setYears] = useState([]);
  const [networks, setNetworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const loadFilters = async () => {
      setIsLoading(true);
      const [gRes, cRes, yRes, nRes] = await Promise.all([
        getGenres(),
        getCountries(),
        getYears(),
        getNetworks(),
      ]);

      if (gRes.success && gRes.data) {
        setGenres(Array.isArray(gRes.data) ? gRes.data : gRes.data.genres || gRes.data.data || []);
      } else {
        // Fallback default genres
        setGenres([
          { name: 'Action', slug: 'action' },
          { name: 'Drama Korea (K-Drama)', slug: 'drama-korea' },
          { name: 'Comedy', slug: 'comedy' },
          { name: 'Horror', slug: 'horror' },
          { name: 'Romance', slug: 'romance' },
          { name: 'Sci-Fi', slug: 'sci-fi' },
          { name: 'Thriller', slug: 'thriller' },
          { name: 'Animation', slug: 'animation' },
          { name: 'Adventure', slug: 'adventure font-bold' },
        ]);
      }

      if (cRes.success && cRes.data) {
        setCountries(Array.isArray(cRes.data) ? cRes.data : cRes.data.countries || cRes.data.data || []);
      } else {
        setCountries([
          { name: 'South Korea', slug: 'south-korea' },
          { name: 'United States', slug: 'united-states' },
          { name: 'Indonesia', slug: 'indonesia' },
          { name: 'Japan', slug: 'japan' },
          { name: 'United Kingdom', slug: 'united-kingdom' },
        ]);
      }

      if (yRes.success && yRes.data) {
        setYears(Array.isArray(yRes.data) ? yRes.data : yRes.data.years || yRes.data.data || []);
      } else {
        setYears(['2026', '2025', '2024', '2023', '2022', '2021', '2020']);
      }

      if (nRes.success && nRes.data) {
        setNetworks(Array.isArray(nRes.data) ? nRes.data : nRes.data.networks || nRes.data.data || []);
      } else {
        setNetworks([
          { name: 'Netflix', slug: 'netflix' },
          { name: 'HBO Max', slug: 'hbo' },
          { name: 'Disney+', slug: 'disney' },
          { name: 'Apple TV+', slug: 'apple-tv' },
          { name: 'Amazon Prime', slug: 'amazon' },
        ]);
      }

      setIsLoading(false);
    };

    loadFilters();
  }, [isOpen]);

  if (!isOpen) return null;

  const filterTabs = [
    { id: 'genres', label: 'Genre', icon: Film },
    { id: 'countries', label: 'Negara', icon: Globe },
    { id: 'years', label: 'Tahun Rilis', icon: Calendar },
    { id: 'networks', label: 'Streaming Network', icon: Tv },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-center sm:justify-end bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md h-[88vh] sm:h-full bg-dark-base rounded-t-3xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-dark-border shadow-2xl flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="sm:hidden w-full pt-2 pb-1 bg-dark-surface flex justify-center border-b border-white/5">
          <div className="w-12 h-1.5 rounded-full bg-gray-600/60" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-dark-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-extrabold text-base sm:text-lg">
            <Filter className="w-5 h-5 text-brand-500" />
            <span>Jelajahi & Filter Konten</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-dark-card text-gray-400 hover:text-white hover:bg-dark-hover transition-all active:scale-95"
            aria-label="Tutup filter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection Row */}
        <div className="flex items-center gap-1 p-2 bg-dark-card/60 border-b border-dark-border overflow-x-auto hide-scrollbar">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-glow-red'
                    : 'text-gray-400 hover:text-white hover:bg-dark-hover'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Memuat pilihan kategori...
            </div>
          ) : activeTab === 'genres' ? (
            <div className="grid grid-cols-1 gap-2">
              {genres.map((g, idx) => {
                const name = typeof g === 'object' ? g.name || g.title : g;
                const slug = typeof g === 'object' ? g.slug || g.id || name.toLowerCase() : g;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectCategory({ categoryType: 'genre', name, slug });
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover text-left text-xs font-bold text-gray-200 hover:text-brand-500 transition-all group"
                  >
                    <span>{name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : activeTab === 'countries' ? (
            <div className="grid grid-cols-1 gap-2">
              {countries.map((c, idx) => {
                const name = typeof c === 'object' ? c.name || c.title : c;
                const slug = typeof c === 'object' ? c.slug || c.id || name.toLowerCase().replace(/\s+/g, '-') : c;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectCategory({ categoryType: 'country', name, slug });
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover text-left text-xs font-bold text-gray-200 hover:text-brand-500 transition-all group"
                  >
                    <span>{name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          ) : activeTab === 'years' ? (
            <div className="grid grid-cols-2 gap-2">
              {years.map((y, idx) => {
                const yearVal = typeof y === 'object' ? y.year || y.name : y;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectCategory({ categoryType: 'year', name: `Tahun ${yearVal}`, slug: yearVal });
                      onClose();
                    }}
                    className="p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover text-center text-xs font-bold text-gray-200 hover:text-brand-500 transition-all"
                  >
                    {yearVal}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {networks.map((n, idx) => {
                const name = typeof n === 'object' ? n.name || n.title : n;
                const slug = typeof n === 'object' ? n.slug || n.id || name.toLowerCase().replace(/\s+/g, '-') : n;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectCategory({ categoryType: 'network', name, slug });
                      onClose();
                    }}
                    className="flex items-center justify-between p-3 rounded-xl bg-dark-card border border-dark-border hover:border-brand-500/60 hover:bg-dark-hover text-left text-xs font-bold text-gray-200 hover:text-brand-500 transition-all group"
                  >
                    <span>{name}</span>
                    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-brand-500 transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
