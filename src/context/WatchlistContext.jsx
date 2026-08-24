import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  getWatchlistFromCloud, 
  saveWatchlistToCloud, 
  isFirebaseConfigured 
} from '../services/firebase';

const WatchlistContext = createContext();

export const WatchlistProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username || 'guest';
  const storageKey = `IDLIX_WATCHLIST_${username.toLowerCase()}`;

  // Helper to read watchlist from local storage
  const loadLocalWatchlist = useCallback(() => {
    try {
      // Legacy key fallback check if user specific key doesn't exist yet
      const savedUser = localStorage.getItem(storageKey);
      if (savedUser) return JSON.parse(savedUser);

      const savedLegacy = localStorage.getItem('IDLIX_WATCHLIST');
      if (savedLegacy) return JSON.parse(savedLegacy);

      return [];
    } catch (e) {
      console.error('[Watchlist] Failed to load local watchlist:', e);
      return [];
    }
  }, [storageKey]);

  const [watchlist, setWatchlist] = useState(loadLocalWatchlist);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state whenever active user changes or on initial mount
  useEffect(() => {
    let isMounted = true;
    const localData = loadLocalWatchlist();
    setWatchlist(localData);

    // If logged in and Firebase is configured, fetch Cloud Watchlist & Merge
    if (currentUser && isFirebaseConfigured()) {
      setIsSyncing(true);
      getWatchlistFromCloud(username).then((cloudData) => {
        if (!isMounted) return;
        setIsSyncing(false);

        if (Array.isArray(cloudData)) {
          // Merge local and cloud list seamlessly without duplicate slugs
          const mergedMap = new Map();
          // Cloud items take precedence
          cloudData.forEach((item) => {
            if (item && item.slug) mergedMap.set(item.slug, item);
          });
          // Local items added if not present
          localData.forEach((item) => {
            if (item && item.slug && !mergedMap.has(item.slug)) {
              mergedMap.set(item.slug, item);
            }
          });

          const finalMerged = Array.from(mergedMap.values());
          setWatchlist(finalMerged);

          // Save back merged list to both local storage and cloud
          try {
            localStorage.setItem(storageKey, JSON.stringify(finalMerged));
          } catch (err) {
            console.error('[Watchlist] Failed to save merged watchlist to localStorage:', err);
          }
          saveWatchlistToCloud(username, finalMerged);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [username, currentUser, loadLocalWatchlist, storageKey]);

  // Helper to persist state to local & cloud
  const persistWatchlist = (newList) => {
    setWatchlist(newList);

    // 1. LocalStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(newList));
    } catch (e) {
      console.error('[Watchlist] Failed to persist to localStorage:', e);
    }

    // 2. Cloud Firestore (if logged in)
    if (currentUser && isFirebaseConfigured()) {
      saveWatchlistToCloud(username, newList);
    }
  };

  const addToWatchlist = (item) => {
    if (!item || !item.slug) return;
    setWatchlist((prev) => {
      if (prev.some((i) => i.slug === item.slug)) return prev;
      const updated = [item, ...prev];
      persistWatchlist(updated);
      return updated;
    });
  };

  const removeFromWatchlist = (slug) => {
    if (!slug) return;
    setWatchlist((prev) => {
      const updated = prev.filter((i) => i.slug !== slug);
      persistWatchlist(updated);
      return updated;
    });
  };

  const isInWatchlist = (slug) => {
    if (!slug) return false;
    return watchlist.some((i) => i.slug === slug);
  };

  const toggleWatchlist = (item) => {
    if (!item || !item.slug) return;
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
        isSyncing,
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
