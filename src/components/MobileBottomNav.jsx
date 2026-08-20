import React from 'react';
import { Home, Film, Tv, Trophy, Bookmark } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';

export default function MobileBottomNav({ activeTab, setActiveTab }) {
  const { watchlist } = useWatchlist();
  const watchlistCount = watchlist.length;

  const navItems = [
    { id: 'home', label: 'Beranda', icon: Home },
    { id: 'movies', label: 'Film', icon: Film },
    { id: 'series', label: 'Series', icon: Tv },
    { id: 'leaderboard', label: 'Top', icon: Trophy },
    { id: 'watchlist', label: 'Watchlist', icon: Bookmark, badge: watchlistCount },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation" 
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 pb-safe pt-2 bg-dark-base/95 backdrop-blur-xl border-t border-dark-border/80 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all duration-200 min-w-[56px] active:scale-95 ${
                isActive
                  ? 'text-brand-500 font-bold scale-105'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {/* Active Indicator Background Pill */}
              {isActive && (
                <span className="absolute inset-0 bg-brand-500/15 rounded-2xl border border-brand-500/30 animate-fade-in -z-10" />
              )}

              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 min-w-[16px] h-4 text-[10px] font-black leading-none rounded-full bg-brand-500 text-white flex items-center justify-center shadow-glow-red">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span className="text-[10px] tracking-tight mt-1 font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
