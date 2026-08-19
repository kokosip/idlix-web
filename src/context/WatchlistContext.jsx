import React, { createContext, useContext, useState, useEffect } from 'react';

const WatchlistContext = createContext();

export const WatchlistProvider = ({ children }) => {
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem('IDLIX_WATCHLIST');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('IDLIX_WATCHLIST', JSON.stringify(watchlist));
    } catch (e) {
      console.error('Failed to save watchlist to localStorage', e);
    }
  }, [watchlist]);

  const addToWatchlist = (item) => {
    setWatchlist((prev) => {
      if (prev.some((i) => i.slug === item.slug)) return prev;
      return [item, ...prev];
    });
  };

  const removeFromWatchlist = (slug) => {
    setWatchlist((prev) => prev.filter((i) => i.slug !== slug));
  };

  const isInWatchlist = (slug) => {
    return watchlist.some((i) => i.slug === slug);
  };

  const toggleWatchlist = (item) => {
    if (isInWatchlist(item.slug)) {
      removeFromWatchlist(item.slug);
    } else {
      addToWatchlist(item);
    }
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        toggleWatchlist,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
};

export const useWatchlist = () => useContext(WatchlistContext);
