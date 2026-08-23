import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import HomeView from './views/HomeView';
import MoviesView from './views/MoviesView';
import SeriesView from './views/SeriesView';
import LeaderboardView from './views/LeaderboardView';
import CategoryView from './views/CategoryView';
import WatchlistView from './views/WatchlistView';
import LoginView from './views/LoginView';
import ProfileView from './views/ProfileView';

import DetailModal from './components/DetailModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import ApiConfigModal from './components/ApiConfigModal';
import FilterDrawer from './components/FilterDrawer';
import MobileBottomNav from './components/MobileBottomNav';

import { WatchlistProvider } from './context/WatchlistContext';
import { WatchHistoryProvider } from './context/WatchHistoryContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { checkApiStatus } from './services/api';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { isLoggedIn, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('home');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Modals state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [playingMedia, setPlayingMedia] = useState(null);
  const [playingEpisodeInfo, setPlayingEpisodeInfo] = useState(null);
  
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // API Health state
  const [apiOnline, setApiOnline] = useState(true);

  // State ref for popstate handler without stale closure
  const stateRef = useRef({
    playingMedia,
    selectedMedia,
    isFilterOpen,
    isApiConfigOpen,
    activeTab,
  });

  useEffect(() => {
    stateRef.current = {
      playingMedia,
      selectedMedia,
      isFilterOpen,
      isApiConfigOpen,
      activeTab,
    };
  }, [playingMedia, selectedMedia, isFilterOpen, isApiConfigOpen, activeTab]);

  useEffect(() => {
    const verifyApi = async () => {
      const res = await checkApiStatus();
      setApiOnline(res.success);
    };
    verifyApi();
  }, []);

  // Intercept Android Back Button / Browser Back Button (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const { playingMedia, selectedMedia, isFilterOpen, isApiConfigOpen, activeTab } = stateRef.current;

      // 1. Close Video Player if open
      if (playingMedia) {
        setPlayingMedia(null);
        setPlayingEpisodeInfo(null);
        return;
      }

      // 2. Close Detail Modal if open
      if (selectedMedia) {
        setSelectedMedia(null);
        return;
      }

      // 3. Close Filter Drawer if open
      if (isFilterOpen) {
        setIsFilterOpen(false);
        return;
      }

      // 4. Close API Config Modal if open
      if (isApiConfigOpen) {
        setIsApiConfigOpen(false);
        return;
      }

      // 5. If on non-home tab, go back to home tab
      if (activeTab !== 'home') {
        setActiveTab('home');
        setSelectedCategory(null);
        return;
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Setters with History pushState
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      if (tab !== 'home') {
        window.history.pushState({ type: 'tab', tab }, '');
      }
      setActiveTab(tab);
      setSelectedCategory(null);
    }
  };

  const handleSelectCategory = (catData) => {
    window.history.pushState({ type: 'category' }, '');
    setSelectedCategory(catData);
    setActiveTab('category');
  };

  const handleOpenDetailMedia = (media) => {
    if (media) {
      window.history.pushState({ modal: 'detail' }, '');
    }
    setSelectedMedia(media);
  };

  const handleCloseDetailMedia = () => {
    setSelectedMedia(null);
    if (window.history.state?.modal === 'detail') {
      window.history.back();
    }
  };

  const handlePlayStream = (media, episodeInfo = null) => {
    window.history.pushState({ modal: 'videoPlayer' }, '');
    setPlayingMedia(media);
    setPlayingEpisodeInfo(episodeInfo);
  };

  const handleCloseVideoPlayer = () => {
    setPlayingMedia(null);
    setPlayingEpisodeInfo(null);
    if (window.history.state?.modal === 'videoPlayer') {
      window.history.back();
    }
  };

  const handleOpenFilter = () => {
    window.history.pushState({ modal: 'filter' }, '');
    setIsFilterOpen(true);
  };

  const handleCloseFilter = () => {
    setIsFilterOpen(false);
    if (window.history.state?.modal === 'filter') {
      window.history.back();
    }
  };

  const handleOpenApiConfig = () => {
    window.history.pushState({ modal: 'apiConfig' }, '');
    setIsApiConfigOpen(true);
  };

  const handleCloseApiConfig = () => {
    setIsApiConfigOpen(false);
    if (window.history.state?.modal === 'apiConfig') {
      window.history.back();
    }
  };

  // 1. Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-base text-white flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="text-xs text-gray-400">Memuat Sesi IDLIX...</span>
      </div>
    );
  }

  // 2. Landing Gate: If NOT logged in, show Login Page exclusively
  if (!isLoggedIn) {
    return (
      <LoginView 
        onSuccessLogin={() => setActiveTab('home')}
      />
    );
  }

  // 3. Authenticated App Experience
  return (
    <WatchlistProvider>
      <div className="min-h-screen flex flex-col bg-dark-base text-gray-100 selection:bg-brand-500 selection:text-white">
        
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onSelectMedia={handleOpenDetailMedia}
          onOpenApiConfig={handleOpenApiConfig}
          onOpenFilter={handleOpenFilter}
          apiOnline={apiOnline}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-6">
          {activeTab === 'home' && (
            <HomeView 
              onSelectMedia={handleOpenDetailMedia}
              onPlayStream={handlePlayStream}
            />
          )}

          {activeTab === 'movies' && (
            <MoviesView 
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'series' && (
            <SeriesView 
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'anime' && (
            <CategoryView 
              selectedCategory={{ categoryType: 'genre', slug: 'animation', name: 'Anime & Animasi' }}
              onBack={() => handleTabChange('home')}
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView 
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'category' && (
            <CategoryView 
              selectedCategory={selectedCategory}
              onBack={() => handleTabChange('home')}
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistView 
              onSelectMedia={handleOpenDetailMedia}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView 
              onLogoutSuccess={() => setActiveTab('home')}
              onOpenApiConfig={handleOpenApiConfig}
              apiOnline={apiOnline}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="w-full glass-panel border-t border-dark-border/60 py-8 mt-12 mb-16 md:mb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white">IDLIX Stream Web</span>
            </div>
          </div>
        </footer>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />

        {/* Modals & Drawers */}
        {selectedMedia && (
          <DetailModal
            media={selectedMedia}
            onClose={handleCloseDetailMedia}
            onPlayStream={handlePlayStream}
          />
        )}

        {playingMedia && (
          <VideoPlayerModal
            media={playingMedia}
            episodeInfo={playingEpisodeInfo}
            onClose={handleCloseVideoPlayer}
          />
        )}

        <ApiConfigModal
          isOpen={isApiConfigOpen}
          onClose={handleCloseApiConfig}
          onStatusUpdated={(status) => setApiOnline(status)}
        />

        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={handleCloseFilter}
          onSelectCategory={handleSelectCategory}
        />

      </div>
    </WatchlistProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WatchHistoryProvider>
        <AppContent />
      </WatchHistoryProvider>
    </AuthProvider>
  );
}
