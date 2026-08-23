import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const WatchHistoryContext = createContext();

export const WatchHistoryProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const username = currentUser?.username || 'guest';
  const storageKey = `IDLIX_WATCH_HISTORY_${username.toLowerCase()}`;

  // Helper to read history from localStorage
  const loadHistory = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load watch history:', e);
      return [];
    }
  }, [storageKey]);

  const [watchHistory, setWatchHistory] = useState(loadHistory);

  // Sync state whenever active user changes
  useEffect(() => {
    setWatchHistory(loadHistory());
  }, [username, loadHistory]);

  // Persist to localStorage whenever watchHistory state updates
  const persistHistory = (newHistory) => {
    setWatchHistory(newHistory);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save watch history:', e);
    }
  };

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
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.error('Failed to persist watch progress:', e);
        }
        return updated;
      });
    },
    [storageKey]
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
    [watchHistory, storageKey]
  );

  /**
   * Clear all history for current user
   */
  const clearHistory = useCallback(() => {
    persistHistory([]);
  }, [storageKey]);

  return (
    <WatchHistoryContext.Provider
      value={{
        watchHistory,
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
