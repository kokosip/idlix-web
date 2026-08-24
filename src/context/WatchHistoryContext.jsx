import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  getHistoryFromCloud, 
  saveHistoryToCloud, 
  isFirebaseConfigured 
} from '../services/firebase';

const WatchHistoryContext = createContext();

export const WatchHistoryProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username || 'guest';
  const storageKey = `IDLIX_WATCH_HISTORY_${username.toLowerCase()}`;

  // Helper to read history from localStorage
  const loadLocalHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('[WatchHistory] Failed to load local watch history:', e);
      return [];
    }
  }, [storageKey]);

  const [watchHistory, setWatchHistory] = useState(loadLocalHistory);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync state whenever active user changes
  useEffect(() => {
    let isMounted = true;
    const localData = loadLocalHistory();
    setWatchHistory(localData);

    // If logged in and Firebase configured, fetch Cloud History & Merge
    if (currentUser && isFirebaseConfigured()) {
      setIsSyncing(true);
      getHistoryFromCloud(username).then((cloudData) => {
        if (!isMounted) return;
        setIsSyncing(false);

        if (Array.isArray(cloudData)) {
          // Merge local and cloud history based on item key & latest lastUpdated timestamp
          const itemMap = new Map();

          // Helper to register or resolve newest item
          const processItem = (item) => {
            if (!item || !item.key) return;
            const existing = itemMap.get(item.key);
            if (!existing) {
              itemMap.set(item.key, item);
            } else {
              const existingTime = new Date(existing.lastUpdated || 0).getTime();
              const newTime = new Date(item.lastUpdated || 0).getTime();
              if (newTime > existingTime) {
                itemMap.set(item.key, item);
              }
            }
          };

          cloudData.forEach(processItem);
          localData.forEach(processItem);

          // Sort by lastUpdated descending (newest first)
          const mergedList = Array.from(itemMap.values()).sort((a, b) => {
            const timeA = new Date(a.lastUpdated || 0).getTime();
            const timeB = new Date(b.lastUpdated || 0).getTime();
            return timeB - timeA;
          });

          setWatchHistory(mergedList);

          // Save back merged history to local storage & cloud
          try {
            localStorage.setItem(storageKey, JSON.stringify(mergedList));
          } catch (err) {
            console.error('[WatchHistory] Failed to save merged history to localStorage:', err);
          }
          saveHistoryToCloud(username, mergedList);
        }
      });
    }

    return () => {
      isMounted = false;
    };
  }, [username, currentUser, loadLocalHistory, storageKey]);

  // Persist to localStorage & Cloud whenever history updates
  const persistHistory = useCallback((newHistory) => {
    setWatchHistory(newHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (e) {
      console.error('[WatchHistory] Failed to save watch history locally:', e);
    }

    if (currentUser && isFirebaseConfigured()) {
      saveHistoryToCloud(username, newHistory);
    }
  }, [username, currentUser, storageKey]);

  /**
   * Create unique storage key for media item
   * Movie: "movie:slug"
   * Series: "series:slug:s1:e1"
   */
  const getStorageItemKey = (slug, season, episode) => {
    if (season !== undefined && episode !== undefined) {
      return `series:${slug}:s${season}:e${episode}`;
    }
    return `movie:${slug}`;
  };

  /**
   * Save or update playback progress
   */
  const saveProgress = useCallback(
    ({ media, episodeInfo, currentTime, duration }) => {
      if (!media || !media.slug || !currentTime || !duration) return;

      const isSeries = media.type === 'series' || Boolean(episodeInfo);
      const season = episodeInfo?.season || 1;
      const episode = episodeInfo?.episode || 1;
      const key = getStorageItemKey(media.slug, isSeries ? season : undefined, isSeries ? episode : undefined);

      // Do not save if duration is invalid or played less than 3 seconds
      if (duration <= 0 || currentTime < 3) return;

      // Calculate progress percentage
      const percent = Math.min(100, Math.round((currentTime / duration) * 100));

      const newItem = {
        key,
        mediaSlug: media.slug,
        mediaType: isSeries ? 'series' : 'movie',
        title: media.title || media.name || 'Untitled',
        poster: media.poster || media.image || media.backdrop || '',
        backdrop: media.backdrop || media.poster || '',
        rating: media.rating || media.vote_average || 'N/A',
        year: media.year || media.release_date || '',
        season: isSeries ? season : undefined,
        episode: isSeries ? episode : undefined,
        episodeTitle: episodeInfo?.title || `Episode ${episode}`,
        progress: Math.floor(currentTime),
        duration: Math.floor(duration),
        percent,
        completed: percent >= 95,
        lastUpdated: new Date().toISOString(),
      };

      setWatchHistory((prev) => {
        const filtered = prev.filter((item) => item.key !== key);
        const updated = [newItem, ...filtered];
        
        // Save to localStorage
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('[WatchHistory] Failed to persist watch progress locally:', e);
        }

        // Save to Cloud Firestore if user logged in
        if (currentUser && isFirebaseConfigured()) {
          saveHistoryToCloud(username, updated);
        }

        return updated;
      });
    },
    [username, currentUser, storageKey]
  );

  /**
   * Get saved playback progress for specific media / episode
   */
  const getSavedProgress = useCallback(
    (slug, season, episode) => {
      if (!slug) return null;
      const key = getStorageItemKey(slug, season, episode);
      return watchHistory.find((item) => item.key === key) || null;
    },
    [watchHistory]
  );

  /**
   * Get overall media progress (for series, return most recent episode progress)
   */
  const getMediaProgress = useCallback(
    (slug) => {
      if (!slug) return null;
      return watchHistory.find((item) => item.mediaSlug === slug) || null;
    },
    [watchHistory]
  );

  /**
   * Remove specific item from history
   */
  const removeFromHistory = useCallback(
    (key) => {
      const updated = watchHistory.filter((item) => item.key !== key);
      persistHistory(updated);
    },
    [watchHistory, persistHistory]
  );

  /**
   * Clear all history for current user
   */
  const clearHistory = useCallback(() => {
    persistHistory([]);
  }, [persistHistory]);

  return (
    <WatchHistoryContext.Provider
      value={{
        watchHistory,
        isSyncing,
        saveProgress,
        getSavedProgress,
        getMediaProgress,
        removeFromHistory,
        clearHistory,
      }}
    >
      {children}
    </WatchHistoryContext.Provider>
  );
};

export const useWatchHistory = () => {
  const context = useContext(WatchHistoryContext);
  if (!context) {
    throw new Error('useWatchHistory must be used within a WatchHistoryProvider');
  }
  return context;
};
