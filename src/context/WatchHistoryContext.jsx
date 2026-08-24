import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { 
  getHistoryFromCloud, 
  saveHistoryToCloud, 
  isFirebaseConfigured 
} from '../services/firebase';

const WatchHistoryContext = createContext();

/**
 * Deduplicate watch history entries by mediaSlug.
 * For each media title, retains ONLY the single entry with the most recent lastUpdated timestamp.
 */
export const deduplicateWatchHistory = (historyList) => {
  if (!Array.isArray(historyList)) return [];

  const map = new Map();
  historyList.forEach((item) => {
    if (!item) return;
    const groupKey = item.mediaSlug || item.key;
    const existing = map.get(groupKey);

    if (!existing) {
      map.set(groupKey, item);
    } else {
      const existingTime = new Date(existing.lastUpdated || 0).getTime();
      const newTime = new Date(item.lastUpdated || 0).getTime();
      if (newTime > existingTime) {
        map.set(groupKey, item);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const timeA = new Date(a.lastUpdated || 0).getTime();
    const timeB = new Date(b.lastUpdated || 0).getTime();
    return timeB - timeA;
  });
};

export const WatchHistoryProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username || 'guest';
  const storageKey = `IDLIX_WATCH_HISTORY_${username.toLowerCase()}`;

  // Helper to read history from localStorage & deduplicate per media title
  const loadLocalHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return deduplicateWatchHistory(parsed);
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
          // Deduplicate and merge local and cloud data by media title
          const combined = [...cloudData, ...localData];
          const mergedList = deduplicateWatchHistory(combined);

          setWatchHistory(mergedList);

          // Save back deduplicated history to local storage & cloud
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
    const deduplicated = deduplicateWatchHistory(newHistory);
    setWatchHistory(deduplicated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(deduplicated));
    } catch (e) {
      console.error('[WatchHistory] Failed to save watch history locally:', e);
    }

    if (currentUser && isFirebaseConfigured()) {
      saveHistoryToCloud(username, deduplicated);
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
   * Save or update playback progress per media title.
   * Replaces any existing entry for the same media.slug with the latest watched episode.
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
        // Filter out any previous entries matching either exact key OR mediaSlug (so 1 title = 1 entry)
        const filtered = prev.filter(
          (item) => item.key !== key && item.mediaSlug !== media.slug
        );
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
      const specificKey = getStorageItemKey(slug, season, episode);
      
      // 1. Try exact match by key
      const exact = watchHistory.find((item) => item.key === specificKey);
      if (exact) return exact;

      // 2. Try match by mediaSlug & season/episode
      const matched = watchHistory.find(
        (item) => 
          item.mediaSlug === slug && 
          (season !== undefined ? item.season === season : true) &&
          (episode !== undefined ? item.episode === episode : true)
      );
      return matched || null;
    },
    [watchHistory]
  );

  /**
   * Get overall media progress (returns most recent episode progress for series)
   */
  const getMediaProgress = useCallback(
    (slug) => {
      if (!slug) return null;
      return watchHistory.find((item) => item.mediaSlug === slug) || null;
    },
    [watchHistory]
  );

  /**
   * Remove specific media item from history (by key or mediaSlug)
   */
  const removeFromHistory = useCallback(
    (keyOrSlug) => {
      const updated = watchHistory.filter(
        (item) => item.key !== keyOrSlug && item.mediaSlug !== keyOrSlug
      );
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
