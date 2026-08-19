import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeView from './views/HomeView';
import MoviesView from './views/MoviesView';
import SeriesView from './views/SeriesView';
import LeaderboardView from './views/LeaderboardView';
import CategoryView from './views/CategoryView';
import WatchlistView from './views/WatchlistView';

import DetailModal from './components/DetailModal';
import VideoPlayerModal from './components/VideoPlayerModal';
import ApiConfigModal from './components/ApiConfigModal';
import FilterDrawer from './components/FilterDrawer';

import { WatchlistProvider } from './context/WatchlistContext';
import { checkApiStatus } from './services/api';
import { Film, Server, Heart } from 'lucide-react';

export default function App() {
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

  useEffect(() => {
    const verifyApi = async () => {
      const res = await checkApiStatus();
      setApiOnline(res.success);
    };
    verifyApi();
  }, []);

  const handleSelectCategory = (catData) => {
    setSelectedCategory(catData);
    setActiveTab('category');
  };

  const handlePlayStream = (media, episodeInfo = null) => {
    setPlayingMedia(media);
    setPlayingEpisodeInfo(episodeInfo);
  };

  return (
    <WatchlistProvider>
      <div className="min-h-screen flex flex-col bg-dark-base text-gray-100 selection:bg-brand-500 selection:text-white">
        
        {/* Navigation Bar */}
        <Navbar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedCategory(null);
          }}
          onSelectMedia={(media) => setSelectedMedia(media)}
          onOpenApiConfig={() => setIsApiConfigOpen(true)}
          onOpenFilter={() => setIsFilterOpen(true)}
          apiOnline={apiOnline}
        />

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {activeTab === 'home' && (
            <HomeView 
              onSelectMedia={(media) => setSelectedMedia(media)}
              onPlayStream={handlePlayStream}
            />
          )}

          {activeTab === 'movies' && (
            <MoviesView 
              onSelectMedia={(media) => setSelectedMedia(media)}
            />
          )}

          {activeTab === 'series' && (
            <SeriesView 
              onSelectMedia={(media) => setSelectedMedia(media)}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardView 
              onSelectMedia={(media) => setSelectedMedia(media)}
            />
          )}

          {activeTab === 'category' && (
            <CategoryView 
              selectedCategory={selectedCategory}
              onBack={() => setActiveTab('home')}
              onSelectMedia={(media) => setSelectedMedia(media)}
            />
          )}

          {activeTab === 'watchlist' && (
            <WatchlistView 
              onSelectMedia={(media) => setSelectedMedia(media)}
            />
          )}
        </main>

        {/* Footer */}
        <footer className="w-full glass-panel border-t border-dark-border/60 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white">IDLIX Stream Web</span>
              <span>•</span>
              <span>Backend API: D:\Projects\Self\idlix-api</span>
            </div>
            <div className="flex items-center gap-1">
              <span>Dibuat dengan React & Tailwind CSS</span>
            </div>
          </div>
        </footer>

        {/* Modals & Drawers */}
        {selectedMedia && (
          <DetailModal
            media={selectedMedia}
            onClose={() => setSelectedMedia(null)}
            onPlayStream={handlePlayStream}
          />
        )}

        {playingMedia && (
          <VideoPlayerModal
            media={playingMedia}
            episodeInfo={playingEpisodeInfo}
            onClose={() => {
              setPlayingMedia(null);
              setPlayingEpisodeInfo(null);
            }}
          />
        )}

        <ApiConfigModal
          isOpen={isApiConfigOpen}
          onClose={() => setIsApiConfigOpen(false)}
          onStatusUpdated={(status) => setApiOnline(status)}
        />

        <FilterDrawer
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onSelectCategory={handleSelectCategory}
        />

      </div>
    </WatchlistProvider>
  );
}
