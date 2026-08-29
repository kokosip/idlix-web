import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Film, 
  Copy, 
  Check, 
  MonitorPlay, 
  Layers, 
  Maximize2, 
  Minimize2, 
  ArrowLeft, 
  RotateCcw, 
  RotateCw,
  Play,
  Pause,
  Scaling,
  ListVideo,
  SkipForward,
  ChevronDown,
  Tv,
  CheckCircle2,
  SlidersHorizontal,
  Type,
  Minus,
  Plus,
  Settings
} from 'lucide-react';
import Hls from 'hls.js';
import { 
  getMovieStream, 
  getEpisodeStream, 
  getSeriesDetail, 
  getSeasonDetail, 
  normalizeMediaItem, 
  getApiBaseUrl 
} from '../services/api';
import { useWatchHistory } from '../context/WatchHistoryContext';

const SUB_SIZE_PRESETS = [
  { label: 'Normal (100%)', value: 100, desc: 'Layar HP / Tablet' },
  { label: 'Sedang (125%)', value: 125, desc: 'Laptop Standar' },
  { label: 'Besar (150%)', value: 150, desc: 'Monitor 20-22"' },
  { label: 'Sangat Besar (175%)', value: 175, desc: 'Monitor 22-24"' },
  { label: '22" Monitor / TV (200%)', value: 200, desc: 'Monitor Besar (Rekomendasi)' },
  { label: 'Jumbo (250%)', value: 250, desc: 'Nonton Jarak Jauh' },
  { label: 'Maksimal (300%)', value: 300, desc: 'Ekstra Besar' },
];

const SUB_COLOR_OPTIONS = [
  { label: 'Putih', value: '#ffffff', hexClass: 'bg-white', textClass: 'text-white' },
  { label: 'Kuning', value: '#fde047', hexClass: 'bg-yellow-300', textClass: 'text-yellow-300' },
  { label: 'Cyan', value: '#67e8f9', hexClass: 'bg-cyan-300', textClass: 'text-cyan-300' },
  { label: 'Hijau', value: '#86efac', hexClass: 'bg-green-300', textClass: 'text-green-300' },
];

const SUB_BG_OPTIONS = [
  { id: 'none', label: 'Outline Saja' },
  { id: 'semi', label: 'Semi Transparan' },
  { id: 'solid', label: 'Hitam Pekat' },
];

export default function VideoPlayerModal({ media, episodeInfo, onClose }) {
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [playerMode, setPlayerMode] = useState('auto'); // 'auto', 'hls', 'iframe'
  const [copied, setCopied] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [zoomMode, setZoomMode] = useState('contain'); // 'contain' (Original Fit), 'cover' (Zoom Fit / Crop Fill), 'fill' (Stretch)

  // Subtitle Customization State (Persisted in localStorage)
  const [subSize, setSubSize] = useState(() => {
    try {
      const saved = localStorage.getItem('idlix_sub_size');
      return saved ? parseInt(saved, 10) : 150; // Default 150% for comfortable viewing
    } catch {
      return 150;
    }
  });

  const [subColor, setSubColor] = useState(() => {
    try {
      return localStorage.getItem('idlix_sub_color') || '#ffffff';
    } catch {
      return '#ffffff';
    }
  });

  const [subBg, setSubBg] = useState(() => {
    try {
      return localStorage.getItem('idlix_sub_bg') || 'none';
    } catch {
      return 'none';
    }
  });

  const [subPosition, setSubPosition] = useState(() => {
    try {
      return localStorage.getItem('idlix_sub_position') || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [isSubSettingsOpen, setIsSubSettingsOpen] = useState(false);

  const updateSubSize = (val) => {
    const clamped = Math.max(70, Math.min(300, Math.round(val)));
    setSubSize(clamped);
    try {
      localStorage.setItem('idlix_sub_size', clamped.toString());
    } catch {}
  };

  const updateSubColor = (color) => {
    setSubColor(color);
    try {
      localStorage.setItem('idlix_sub_color', color);
    } catch {}
  };

  const updateSubBg = (bg) => {
    setSubBg(bg);
    try {
      localStorage.setItem('idlix_sub_bg', bg);
    } catch {}
  };

  const updateSubPosition = (pos) => {
    setSubPosition(pos);
    try {
      localStorage.setItem('idlix_sub_position', pos);
    } catch {}
  };

  const resetSubSettings = () => {
    updateSubSize(150);
    updateSubColor('#ffffff');
    updateSubBg('none');
    updateSubPosition('normal');
  };

  // Series Season & Episode State
  const [currentSeason, setCurrentSeason] = useState(episodeInfo?.season || 1);
  const [currentEpisode, setCurrentEpisode] = useState(episodeInfo?.episode || 1);
  const [currentEpTitle, setCurrentEpTitle] = useState(episodeInfo?.title || `Episode ${episodeInfo?.episode || 1}`);

  // Series Episodes Drawer State
  const [isEpisodesDrawerOpen, setIsEpisodesDrawerOpen] = useState(false);
  const [seriesDetail, setSeriesDetail] = useState(null);
  const [selectedDrawerSeason, setSelectedDrawerSeason] = useState(episodeInfo?.season || 1);
  const [drawerEpisodes, setDrawerEpisodes] = useState([]);
  const [isLoadingDrawerEpisodes, setIsLoadingDrawerEpisodes] = useState(false);

  // Playback & Seekbar state (Isolated to prevent 4x/sec React re-render bottleneck)
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-hiding controls timer for Netflix/YouTube-style immersive view
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerContainerRef = useRef(null);
  const seekbarRef = useRef(null);
  const timeTextRef = useRef(null);
  const subtitleRef = useRef(null);
  const vttCuesRef = useRef([]);
  const lastCueTextRef = useRef('');

  const displayData = normalizeMediaItem(media);
  const isSeries = displayData?.type === 'series';

  const { saveProgress, getSavedProgress } = useWatchHistory();
  const [resumedNotice, setResumedNotice] = useState(null);
  const hasAutoResumedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  // Sync state when props change
  useEffect(() => {
    if (episodeInfo) {
      setCurrentSeason(episodeInfo.season || 1);
      setCurrentEpisode(episodeInfo.episode || 1);
      setCurrentEpTitle(episodeInfo.title || `Episode ${episodeInfo.episode || 1}`);
      setSelectedDrawerSeason(episodeInfo.season || 1);
    }
  }, [episodeInfo]);

  // Fetch Series Details & Season Episode List for Drawer
  useEffect(() => {
    if (!isSeries || !displayData?.slug) return;

    let isMounted = true;
    const fetchSeriesData = async () => {
      const res = await getSeriesDetail(displayData.slug);
      if (isMounted && res.success && res.data) {
        const detailObj = res.data.data || res.data;
        setSeriesDetail(detailObj);
      }
    };

    fetchSeriesData();
    return () => { isMounted = false; };
  }, [isSeries, displayData?.slug]);

  // Fetch episodes when selected season in drawer changes
  const loadDrawerSeasonEpisodes = useCallback(async (seasonNum) => {
    if (!displayData?.slug) return;
    setIsLoadingDrawerEpisodes(true);

    const res = await getSeasonDetail(displayData.slug, seasonNum);
    setIsLoadingDrawerEpisodes(false);

    if (res.success && res.data) {
      const rawData = res.data;
      const list = rawData.episodes || rawData.data?.episodes || rawData.data || rawData;
      setDrawerEpisodes(Array.isArray(list) ? list : []);
    } else {
      setDrawerEpisodes([]);
    }
  }, [displayData?.slug]);

  useEffect(() => {
    if (isSeries && displayData?.slug) {
      loadDrawerSeasonEpisodes(selectedDrawerSeason);
    }
  }, [isSeries, displayData?.slug, selectedDrawerSeason, loadDrawerSeasonEpisodes]);

  const toggleZoomMode = () => {
    setZoomMode((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
    resetControlsTimeout(2000);
  };

  const getZoomLabel = () => {
    if (zoomMode === 'cover') return 'Zoom Fit';
    if (zoomMode === 'fill') return 'Stretch';
    return 'Fit Original';
  };

  const checkAndResumePlayback = (video) => {
    if (hasAutoResumedRef.current || !video || !displayData) return;
    const dur = video.duration || duration || 0;
    if (!dur || dur <= 0) return;

    const saved = getSavedProgress(
      displayData.slug,
      isSeries ? currentSeason : undefined,
      isSeries ? currentEpisode : undefined
    );

    if (saved && saved.progress > 5 && saved.progress < dur - 10) {
      video.currentTime = saved.progress;
      hasAutoResumedRef.current = true;
      lastSavedTimeRef.current = saved.progress;
      setResumedNotice({
        time: saved.progress,
        formatted: formatTime(saved.progress),
      });
      setTimeout(() => setResumedNotice(null), 6000);
    } else {
      hasAutoResumedRef.current = true;
    }
  };

  const handleStartOver = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      if (seekbarRef.current) seekbarRef.current.value = 0;
      if (timeTextRef.current) {
        timeTextRef.current.textContent = `${formatTime(0)} / ${formatTime(video.duration || duration)}`;
      }
    }
    setResumedNotice(null);
  };

  const handleTimeUpdate = (e) => {
    const video = e.target;
    if (!video) return;
    const time = video.currentTime;
    const dur = video.duration || duration || 0;

    // Direct DOM update for seekbar range slider
    if (seekbarRef.current && document.activeElement !== seekbarRef.current) {
      seekbarRef.current.max = dur || 100;
      seekbarRef.current.value = time;
    }

    // Direct DOM update for time display text
    if (timeTextRef.current) {
      timeTextRef.current.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    }

    // Direct DOM update for Subtitles
    if (subtitleRef.current && vttCuesRef.current.length > 0) {
      const activeCue = vttCuesRef.current.find((c) => time >= c.start && time <= c.end);
      const newText = activeCue ? activeCue.text : '';
      if (newText !== lastCueTextRef.current) {
        lastCueTextRef.current = newText;
        subtitleRef.current.innerHTML = newText.replace(/\n/g, '<br>');
        subtitleRef.current.style.display = newText ? 'block' : 'none';
      }
    }

    // Throttled Watch History save (every 5 seconds)
    if (Math.abs(time - lastSavedTimeRef.current) >= 5 && dur > 0 && displayData) {
      lastSavedTimeRef.current = time;
      saveProgress({
        media: displayData,
        episodeInfo: isSeries ? { season: currentSeason, episode: currentEpisode, title: currentEpTitle } : null,
        currentTime: time,
        duration: dur,
      });
    }
  };

  const handleSeek = (seconds) => {
    const video = videoRef.current;
    if (video) {
      const dur = video.duration || duration || 0;
      const newTime = Math.max(0, Math.min(dur, video.currentTime + seconds));
      video.currentTime = newTime;
      if (seekbarRef.current) seekbarRef.current.value = newTime;
      if (timeTextRef.current) {
        timeTextRef.current.textContent = `${formatTime(newTime)} / ${formatTime(dur)}`;
      }
      resetControlsTimeout();
    }
  };

  const handleSeekSliderChange = (e) => {
    const newTime = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = newTime;
      const dur = video.duration || duration || 0;
      if (timeTextRef.current) {
        timeTextRef.current.textContent = `${formatTime(newTime)} / ${formatTime(dur)}`;
      }
    }
    resetControlsTimeout();
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    resetControlsTimeout();
  };

  const toggleDeviceFullscreen = () => {
    const container = playerContainerRef.current || videoRef.current;
    if (!container) {
      const nextFS = !isBrowserFullscreen;
      setIsBrowserFullscreen(nextFS);
      if (window.screen && window.screen.orientation) {
        if (nextFS && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        } else if (!nextFS && window.screen.orientation.unlock) {
          try { window.screen.orientation.unlock(); } catch (e) {}
        }
      }
      return;
    }

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenDocument) {
        document.webkitExitFullscreen();
      }
      setIsBrowserFullscreen(false);
      if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
        try { window.screen.orientation.unlock(); } catch (e) {}
      }
    } else {
      if (container.requestFullscreen) {
        container.requestFullscreen().then(() => {
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch(() => {
          setIsBrowserFullscreen(true);
          if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
            window.screen.orientation.lock('landscape').catch(() => {});
          }
        });
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      } else if (videoRef.current?.webkitEnterFullscreen) {
        videoRef.current.webkitEnterFullscreen();
      } else {
        setIsBrowserFullscreen(true);
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          window.screen.orientation.lock('landscape').catch(() => {});
        }
      }
    }
    resetControlsTimeout();
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFS = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsBrowserFullscreen(isFS);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Disable background page scrolling & touch dragging
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';

    const preventTouchScroll = (e) => {
      if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION' && e.target.tagName !== 'INPUT') {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, []);

  const resetControlsTimeout = (delay = 2000) => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      // Don't auto hide if drawer or subtitle settings is open
      if (!isEpisodesDrawerOpen && !isSubSettingsOpen) {
        setControlsVisible(false);
      }
    }, delay);
  };

  useEffect(() => {
    if (streamData && !isLoading) {
      resetControlsTimeout(2000);
    }
  }, [streamData, isLoading]);

  const handlePlayerClick = (e) => {
    // If click is on drawer, subtitle settings, or interactive elements, keep controls visible
    const isInteractive = e.target.closest('button, input, select, a, option, [data-drawer], [data-sub-modal]');
    if (isInteractive || isEpisodesDrawerOpen || isSubSettingsOpen) {
      resetControlsTimeout(4000);
      return;
    }

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setControlsVisible((prev) => {
      const nextState = !prev;
      if (nextState) {
        controlsTimeoutRef.current = setTimeout(() => {
          if (!isEpisodesDrawerOpen && !isSubSettingsOpen) setControlsVisible(false);
        }, 2000);
      }
      return nextState;
    });
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();

        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }

        togglePlayPause();
        resetControlsTimeout(2000);
      } else if (e.key === 'Escape') {
        if (isSubSettingsOpen) {
          setIsSubSettingsOpen(false);
        } else if (isEpisodesDrawerOpen) {
          setIsEpisodesDrawerOpen(false);
        } else if (isBrowserFullscreen) {
          setIsBrowserFullscreen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isBrowserFullscreen, isEpisodesDrawerOpen, isSubSettingsOpen]);

  // Fetch Stream Function
  const fetchStream = useCallback(async (sNum = currentSeason, eNum = currentEpisode) => {
    setIsLoading(true);
    setError(null);
    setStreamData(null);
    hasAutoResumedRef.current = false;

    let res;
    if (isSeries) {
      res = await getEpisodeStream(displayData.slug, sNum, eNum);
    } else {
      res = await getMovieStream(displayData.slug);
    }

    if (res.success && res.data) {
      const rawData = res.data;
      const payload = rawData.data || rawData.result || rawData.stream || rawData;
      setStreamData(payload);

      const subs = payload.subtitles || payload.vtt_tracks || payload.tracks || payload.captions || [];
      if (subs.length > 0) {
        setSelectedSub(subs[0].file || subs[0].url || subs[0].src || '');
      }
    } else {
      const fallbackPayload = res.data?.data || res.data;
      const fallbackUrl = fallbackPayload?.stream_url || fallbackPayload?.url || fallbackPayload?.embed_url || fallbackPayload?.m3u8;
      if (fallbackUrl) {
        setStreamData({ stream_url: fallbackUrl });
      } else {
        setError(res.error || 'Gagal mengekstrak URL stream video dari server IDLIX API.');
      }
    }
    setIsLoading(false);
  }, [displayData?.slug, isSeries, currentSeason, currentEpisode]);

  useEffect(() => {
    if (displayData) {
      fetchStream(currentSeason, currentEpisode);
    }
  }, [currentSeason, currentEpisode]);

  // Handle Episode Selection from Drawer
  const handleSelectEpisode = (seasonNum, epNum, epTitle) => {
    setCurrentSeason(seasonNum);
    setCurrentEpisode(epNum);
    setCurrentEpTitle(epTitle || `Episode ${epNum}`);
    setIsEpisodesDrawerOpen(false);
    resetControlsTimeout(2000);
  };

  // Play Next Episode Helper
  const playNextEpisode = () => {
    const nextEp = currentEpisode + 1;
    setCurrentEpisode(nextEp);
    setCurrentEpTitle(`Episode ${nextEp}`);
    resetControlsTimeout(2000);
  };

  // Helper to extract season numbers
  const getSeasonNumbers = () => {
    if (!seriesDetail) return [1];
    if (Array.isArray(seriesDetail.seasons) && seriesDetail.seasons.length > 0) {
      return seriesDetail.seasons.map((s) => (typeof s === 'object' ? s.seasonNumber || s.season_number || 1 : s));
    }
    const count = seriesDetail.total_seasons || seriesDetail.seasons_count || 1;
    return Array.from({ length: Math.max(1, count) }, (_, i) => i + 1);
  };

  // Extract nested stream payload
  const payload = streamData?.data || streamData;
  const streamUrl = payload ? (
    payload.stream_url ||
    payload.streamUrl ||
    payload.url ||
    payload.m3u8 ||
    payload.file ||
    payload.embed_url ||
    payload.embedUrl ||
    payload.iframe_url ||
    payload.iframe ||
    payload.link || ''
  ) : '';

  const rawType = (payload?.type || payload?.format || '').toLowerCase();

  const detectedIsIframe =
    rawType === 'iframe' ||
    rawType === 'embed' ||
    streamUrl.includes('/embed/') ||
    streamUrl.includes('player.php') ||
    streamUrl.includes('vidsrc.me') ||
    streamUrl.includes('vidsrc.to') ||
    streamUrl.includes('2embed');

  const isEmbedIframe = playerMode === 'iframe' ? true : playerMode === 'hls' ? false : detectedIsIframe;
  const subtitlesList = payload?.subtitles || payload?.vtt_tracks || payload?.tracks || payload?.captions || [];

  // Subtitle Blob Loader & VTT Cue Parser
  const [subBlobUrl, setSubBlobUrl] = useState('');
  const [vttCues, setVttCues] = useState([]);

  const parseVttCues = (vttText) => {
    if (!vttText) return [];
    const lines = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const cues = [];
    let currentCue = null;

    const timeToSec = (tStr) => {
      if (!tStr) return 0;
      const parts = tStr.trim().split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2].replace(',', '.'));
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60 + parseFloat(parts[1].replace(',', '.'));
      }
      return 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const [startStr, endStr] = line.split('-->');
        currentCue = {
          start: timeToSec(startStr),
          end: timeToSec(endStr),
          text: '',
        };
      } else if (currentCue && line !== '' && !line.startsWith('WEBVTT') && !/^\d+$/.test(line)) {
        currentCue.text = currentCue.text ? `${currentCue.text}\n${line}` : line;
      } else if (line === '' && currentCue) {
        if (currentCue.text) cues.push(currentCue);
        currentCue = null;
      }
    }
    if (currentCue && currentCue.text) cues.push(currentCue);
    return cues;
  };

  useEffect(() => {
    if (!selectedSub) {
      setSubBlobUrl('');
      setVttCues([]);
      return;
    }

    let isMounted = true;
    let createdUrl = '';

    const fetchAndCreateBlob = async () => {
      try {
        const fullUrl = selectedSub.startsWith('http')
          ? selectedSub
          : `${getApiBaseUrl()}${selectedSub.startsWith('/') ? '' : '/'}${selectedSub}`;

        const response = await fetch(fullUrl);
        if (response.ok) {
          let text = await response.text();
          const parsed = parseVttCues(text);
          if (isMounted) {
            setVttCues(parsed);
          }

          if (!text.trim().startsWith('WEBVTT')) {
            text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
          }
          const blob = new Blob([text], { type: 'text/vtt' });
          createdUrl = URL.createObjectURL(blob);
          if (isMounted) {
            setSubBlobUrl(createdUrl);
          }
          return;
        }
      } catch (err) {
        console.warn('[SubtitleLoader] Fetch failed, falling back to direct URL:', err);
      }

      if (isMounted) {
        setSubBlobUrl(selectedSub);
      }
    };

    fetchAndCreateBlob();

    return () => {
      isMounted = false;
      if (createdUrl && createdUrl.startsWith('blob:')) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [selectedSub]);

  // Keep subtitle cues synced to ref
  useEffect(() => {
    vttCuesRef.current = vttCues;
    if (subtitleRef.current) {
      subtitleRef.current.innerHTML = '';
      subtitleRef.current.style.display = 'none';
    }
    lastCueTextRef.current = '';
  }, [vttCues]);

  // HLS.js initialization
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || isEmbedIframe) return;

    const isHlsUrl = streamUrl.includes('.m3u8') || streamUrl.includes('/hls/') || rawType === 'm3u8' || rawType === 'hls';
    const isNativeHlsSupported = video.canPlayType('application/vnd.apple.mpegurl');

    if (isHlsUrl && !isNativeHlsSupported && Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1024 * 1024,
        capLevelToPlayerSize: true,
        startLevel: -1,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        checkAndResumePlayback(video);
        video.play().catch((err) => {
          console.warn('[VideoPlayer] Autoplay error:', err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      };
    } else {
      video.src = streamUrl;
      video.play().catch(() => {});
    }
  }, [streamUrl, isEmbedIframe, rawType]);

  if (!displayData) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black w-screen h-screen flex flex-col justify-between overflow-hidden select-none touch-none overscroll-none animate-fade-in ${
        controlsVisible || isEpisodesDrawerOpen || isSubSettingsOpen ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={() => resetControlsTimeout(2000)}
      onMouseLeave={() => {
        if (!isEpisodesDrawerOpen && !isSubSettingsOpen) {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          setControlsVisible(false);
        }
      }}
      onClick={handlePlayerClick}
    >
      <div className="relative w-full h-full border-0 flex flex-col justify-between overflow-hidden bg-black">
        
        {/* Netflix Desktop Style Header Bar */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-none ${
            controlsVisible || isEpisodesDrawerOpen || isSubSettingsOpen ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 pointer-events-auto">
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95 shrink-0"
              title="Tutup Player (Kembali)"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate drop-shadow-md">
                {displayData.title}
              </h3>
              <p className="text-[11px] text-gray-300 truncate">
                {isSeries ? `Season ${currentSeason} • ${currentEpTitle}` : `Movie • ${displayData.year}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto flex-wrap justify-end">
            
            {/* Netflix Episodes & Season Selector Drawer Button (Series Only) */}
            {isSeries && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEpisodesDrawerOpen(true);
                  setIsSubSettingsOpen(false);
                  resetControlsTimeout(6000);
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md active:scale-95 ${
                  isEpisodesDrawerOpen
                    ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                    : 'bg-black/60 hover:bg-white/20 text-white border-white/10'
                }`}
                title="Pilih Episode & Season"
              >
                <ListVideo className="w-4 h-4 text-brand-400" />
                <span className="hidden sm:inline text-xs">Episode & Season</span>
              </button>
            )}

            {/* Subtitle Selector & Quick Size Controls */}
            {subtitlesList.length > 0 && (
              <div className="flex items-center gap-1 bg-black/60 border border-white/10 p-1 rounded-lg backdrop-blur-md">
                <div className="flex items-center gap-1 px-1.5 py-0.5">
                  <span className="text-xs text-gray-300 font-medium hidden sm:inline">Sub:</span>
                  <select
                    value={selectedSub}
                    onChange={(e) => setSelectedSub(e.target.value)}
                    className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[85px] sm:max-w-[110px] truncate"
                  >
                    <option value="" className="bg-dark-card text-white">(Off)</option>
                    {subtitlesList.map((sub, idx) => (
                      <option key={idx} value={sub.file || sub.url || sub.src} className="bg-dark-card text-white">
                        {sub.label || sub.language || `Sub ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subtitle Size Selector & Settings Trigger (Active when Subtitle is selected) */}
                {selectedSub && (
                  <>
                    <div className="w-[1px] h-4 bg-white/20 hidden md:block" />

                    {/* Quick Subtitle Size Dropdown */}
                    <div className="hidden md:flex items-center gap-1 px-1">
                      <span className="text-[11px] text-gray-400 font-medium">Ukuran:</span>
                      <select
                        value={subSize}
                        onChange={(e) => updateSubSize(parseInt(e.target.value, 10))}
                        className="bg-transparent text-brand-300 text-xs font-bold focus:outline-none cursor-pointer"
                        title="Pilih ukuran font subtitle"
                      >
                        <option value="100" className="bg-dark-card text-white">100% (Normal)</option>
                        <option value="125" className="bg-dark-card text-white">125% (Sedang)</option>
                        <option value="150" className="bg-dark-card text-white">150% (Besar)</option>
                        <option value="175" className="bg-dark-card text-white">175% (Sangat Besar)</option>
                        <option value="200" className="bg-dark-card text-white">200% (Monitor 22")</option>
                        <option value="250" className="bg-dark-card text-white">250% (Jumbo)</option>
                        <option value="300" className="bg-dark-card text-white">300% (Maksimal)</option>
                      </select>
                    </div>

                    {/* Subtitle Customizer Popover Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSubSettingsOpen((prev) => !prev);
                        setIsEpisodesDrawerOpen(false);
                        resetControlsTimeout(8000);
                      }}
                      className={`px-2 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 ${
                        isSubSettingsOpen
                          ? 'bg-brand-500 text-white shadow-glow-red'
                          : 'hover:bg-white/20 text-gray-300 hover:text-white'
                      }`}
                      title="Atur Tampilan Subtitle (Ukuran, Warna, Background)"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-[11px] font-bold text-white hidden sm:inline">{subSize}%</span>
                    </button>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => setPlayerMode((prev) => (prev === 'iframe' ? 'hls' : 'iframe'))}
              className="p-2 rounded-lg bg-black/60 border border-white/10 text-white hover:bg-white/20 text-xs font-semibold transition-all flex items-center gap-1 backdrop-blur-md"
              title="Ganti Player Mode"
            >
              <Layers className="w-4 h-4 text-brand-400" />
              <span className="hidden sm:inline text-xs">{isEmbedIframe ? 'Iframe' : 'HLS Direct'}</span>
            </button>

            {/* Zoom Fit Toggle Button */}
            <button
              onClick={toggleZoomMode}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all flex items-center gap-1 backdrop-blur-md active:scale-95 ${
                zoomMode !== 'contain'
                  ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                  : 'bg-black/60 hover:bg-white/20 text-white border-white/10'
              }`}
              title={`Mode Layar Video: ${getZoomLabel()}`}
            >
              <Scaling className="w-4 h-4 text-brand-300" />
              <span className="hidden sm:inline text-xs">{getZoomLabel()}</span>
            </button>

            <button
              onClick={toggleDeviceFullscreen}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95"
              title={isBrowserFullscreen ? 'Keluar Fullscreen Layar' : 'Fullscreen Layar Utuh'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all active:scale-95"
              title="Tutup Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Box Container (Full Viewport Browser Frame) */}
        <div
          ref={playerContainerRef}
          onClick={handlePlayerClick}
          className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden cursor-pointer"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3 text-gray-400">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
              <span className="text-sm font-semibold">Memproses Stream Episode S{currentSeason} E{currentEpisode}...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-8 gap-4 text-center max-w-md">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Gagal Memuat Stream Video</h4>
                <p className="text-xs text-gray-400">{error}</p>
              </div>
              <button
                onClick={() => fetchStream(currentSeason, currentEpisode)}
                className="px-5 py-2 rounded-full bg-brand-500 text-white font-bold text-xs shadow-glow-red"
              >
                Coba Lagi
              </button>
            </div>
          ) : isEmbedIframe ? (
            /* Embedded Iframe Player */
            <iframe
              src={streamUrl}
              title={displayData.title}
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            />
          ) : (
            /* HTML5 Video Player Container */
            <div 
              onClick={handlePlayerClick}
              className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden group cursor-pointer"
            >
              <div 
                onClick={handlePlayerClick}
                className="absolute inset-0 z-10 cursor-pointer"
              />

              <video
                ref={videoRef}
                autoPlay
                playsInline
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={(e) => {
                  const dur = e.target.duration || 0;
                  setDuration(dur);
                  checkAndResumePlayback(e.target);
                }}
                onDurationChange={(e) => {
                  const dur = e.target.duration || 0;
                  setDuration(dur);
                  checkAndResumePlayback(e.target);
                }}
                onPlay={() => {
                  setIsPlaying(true);
                  resetControlsTimeout(2000);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  const video = videoRef.current;
                  if (video && video.currentTime > 3 && (video.duration || duration) > 0 && displayData) {
                    saveProgress({
                      media: displayData,
                      episodeInfo: isSeries ? { season: currentSeason, episode: currentEpisode, title: currentEpTitle } : null,
                      currentTime: video.currentTime,
                      duration: video.duration || duration,
                    });
                  }
                }}
                className={`w-full h-full cursor-pointer z-0 transition-all duration-300 ${
                  zoomMode === 'cover'
                    ? 'object-cover'
                    : zoomMode === 'fill'
                    ? 'object-fill'
                    : 'object-contain'
                }`}
              />

              {/* Resumed Playback Toast Notification */}
              {resumedNotice && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-black/85 border border-brand-500/50 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-3 animate-fade-in pointer-events-auto">
                  <div className="flex items-center gap-1.5 font-semibold text-gray-200">
                    <RotateCcw className="w-3.5 h-3.5 text-brand-400" />
                    <span>Melanjutkan dari <strong className="text-brand-400 font-mono">{resumedNotice.formatted}</strong></span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartOver();
                    }}
                    className="px-2.5 py-1 rounded-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-[11px] font-bold transition-all shadow-glow-red shrink-0"
                  >
                    Mulai dari Awal
                  </button>
                </div>
              )}

              {/* Center Play/Pause & Quick Seek Buttons Overlay */}
              <div
                onClick={handlePlayerClick}
                className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 bg-transparent transition-opacity duration-300 z-20 cursor-pointer ${
                  controlsVisible && !isEpisodesDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(-10);
                  }}
                  className="pointer-events-auto p-3 sm:p-4 rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95 border border-white/20 transition-all shadow-xl flex flex-col items-center gap-0.5"
                  title="Mundur 10 Detik"
                >
                  <RotateCcw className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] font-extrabold">-10s</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                  className="pointer-events-auto p-4 sm:p-5 rounded-full bg-brand-500 text-white hover:bg-brand-600 active:scale-95 shadow-glow-red transition-all"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                >
                  {isPlaying ? (
                    <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-white" />
                  ) : (
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-white ml-1" />
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(10);
                  }}
                  className="pointer-events-auto p-3 sm:p-4 rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95 border border-white/20 transition-all shadow-xl flex flex-col items-center gap-0.5"
                  title="Maju 10 Detik"
                >
                  <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="text-[10px] font-extrabold">+10s</span>
                </button>
              </div>

              {/* High-Performance Direct Subtitle Overlay */}
              {!isEmbedIframe && (
                <div
                  ref={subtitleRef}
                  style={{
                    display: 'none',
                    whiteSpace: 'pre-line',
                    fontSize: `clamp(${Math.round(13 * (subSize / 100))}px, ${(0.95 * (subSize / 100)).toFixed(2)}vw + ${Math.round(8 * (subSize / 100))}px, ${Math.round(28 * (subSize / 100))}px)`,
                    lineHeight: 1.35,
                    color: subColor,
                    backgroundColor:
                      subBg === 'solid'
                        ? 'rgba(0, 0, 0, 0.92)'
                        : subBg === 'semi'
                        ? 'rgba(0, 0, 0, 0.65)'
                        : 'transparent',
                    borderRadius: subBg !== 'none' ? '0.5rem' : '0',
                    padding: subBg !== 'none' ? '0.35rem 0.85rem' : '0.2rem 0.5rem',
                  }}
                  className={`absolute left-1/2 -translate-x-1/2 max-w-[95%] sm:max-w-4xl lg:max-w-6xl font-semibold text-center z-20 pointer-events-none transition-all duration-150 [text-shadow:_0_2px_8px_rgba(0,0,0,0.98),_0_0_4px_rgba(0,0,0,0.95)] ${
                    subPosition === 'raised'
                      ? controlsVisible
                        ? 'bottom-24 sm:bottom-32'
                        : 'bottom-10 sm:bottom-16'
                      : controlsVisible
                      ? 'bottom-16 sm:bottom-20'
                      : 'bottom-3 sm:bottom-6'
                  }`}
                />
              )}

              {/* Bottom Seekbar & Controls Bar */}
              <div
                className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-30 transition-opacity duration-300 ${
                  controlsVisible && !isEpisodesDrawerOpen && !isSubSettingsOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Seekbar Range Slider */}
                <div className="flex items-center gap-2 mb-2 px-1">
                  <input
                    ref={seekbarRef}
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    defaultValue={0}
                    onChange={handleSeekSliderChange}
                    onInput={handleSeekSliderChange}
                    className="w-full h-2 bg-gray-700/80 accent-brand-500 rounded-lg cursor-pointer transition-all hover:h-2.5"
                  />
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between text-xs text-white font-bold px-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all"
                      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                    </button>

                    {/* Next Episode Quick Button for TV Series */}
                    {isSeries && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playNextEpisode();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-brand-500 text-gray-200 hover:text-white transition-all text-xs font-semibold backdrop-blur-md active:scale-95"
                        title="Putar Episode Selanjutnya"
                      >
                        <SkipForward className="w-4 h-4 text-brand-400" />
                        <span className="hidden sm:inline">Ep. Selanjutnya</span>
                      </button>
                    )}

                    <span ref={timeTextRef} className="text-xs sm:text-sm text-gray-300 font-mono tracking-tight">
                      00:00 / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Zoom Fit Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleZoomMode();
                      }}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 backdrop-blur-md active:scale-95 ${
                        zoomMode !== 'contain'
                          ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                      }`}
                      title={`Mode Zoom Video: ${getZoomLabel()}`}
                    >
                      <Scaling className="w-4 h-4" />
                      <span className="hidden sm:inline text-xs font-semibold">{getZoomLabel()}</span>
                    </button>

                    <button
                      onClick={toggleDeviceFullscreen}
                      className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:scale-95 text-white backdrop-blur-md transition-all flex items-center gap-1.5"
                      title={isBrowserFullscreen ? 'Keluar Fullscreen' : 'Fullscreen Layar Utuh'}
                    >
                      {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      <span className="hidden sm:inline text-xs font-semibold">
                        {isBrowserFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Netflix-Style Side Drawer for TV Series Episodes & Seasons */}
        {isSeries && isEpisodesDrawerOpen && (
          <div 
            data-drawer="true"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] max-w-full bg-dark-base/95 border-l border-dark-border/80 backdrop-blur-xl z-50 p-4 sm:p-6 flex flex-col shadow-2xl animate-fade-in pointer-events-auto"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <Tv className="w-5 h-5 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{displayData.title}</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Pilih Season & Episode</p>
                </div>
              </div>
              <button
                onClick={() => setIsEpisodesDrawerOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                title="Tutup Daftar Episode"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Season Selector Tabs */}
            <div className="py-4 border-b border-dark-border/40">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-300">Pilih Season:</label>
                <span className="text-[11px] text-brand-400 font-bold">Season {selectedDrawerSeason}</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {getSeasonNumbers().map((sNum) => (
                  <button
                    key={sNum}
                    onClick={() => setSelectedDrawerSeason(sNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedDrawerSeason === sNum
                        ? 'bg-brand-500 text-white shadow-glow-red border border-brand-400'
                        : 'bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:bg-dark-hover'
                    }`}
                  >
                    Season {sNum}
                  </button>
                ))}
              </div>
            </div>

            {/* Episode List Container */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2 pr-1 custom-scrollbar">
              {isLoadingDrawerEpisodes ? (
                <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-7 h-7 text-brand-500 animate-spin" />
                  <span className="text-xs font-medium">Memuat Daftar Episode Season {selectedDrawerSeason}...</span>
                </div>
              ) : drawerEpisodes.length > 0 ? (
                drawerEpisodes.map((ep, idx) => {
                  const epNum = ep.episode || ep.episode_number || idx + 1;
                  const epTitle = ep.title || ep.name || `Episode ${epNum}`;
                  const isCurrent = currentSeason === selectedDrawerSeason && currentEpisode === epNum;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectEpisode(selectedDrawerSeason, epNum, epTitle)}
                      className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-3 group active:scale-[0.98] ${
                        isCurrent
                          ? 'bg-brand-500/20 border-brand-500/80 shadow-glow-red'
                          : 'bg-dark-card/80 border-dark-border/60 hover:bg-dark-hover hover:border-brand-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0 ${
                          isCurrent ? 'bg-brand-500 text-white' : 'bg-dark-base border border-dark-border text-gray-300 group-hover:border-brand-500/50'
                        }`}>
                          {epNum}
                        </div>

                        <div className="min-w-0">
                          <h5 className={`text-xs font-semibold truncate transition-colors ${
                            isCurrent ? 'text-brand-400' : 'text-white group-hover:text-brand-400'
                          }`}>
                            {epTitle}
                          </h5>
                          <span className="text-[10px] text-gray-400">
                            Season {selectedDrawerSeason} • Ep {epNum}
                          </span>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-brand-400 px-2 py-0.5 rounded-full bg-brand-500/20 border border-brand-500/40 shrink-0">
                          <Play className="w-3 h-3 fill-brand-400 animate-pulse" />
                          <span>Diputar</span>
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white/5 group-hover:bg-brand-500 group-hover:text-white text-gray-400 flex items-center justify-center transition-all shrink-0">
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              ) : (
                /* Fallback Episode Selector if API only provides number count */
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 24 }, (_, i) => i + 1).map((epNum) => {
                    const isCurrent = currentSeason === selectedDrawerSeason && currentEpisode === epNum;
                    return (
                      <button
                        key={epNum}
                        onClick={() => handleSelectEpisode(selectedDrawerSeason, epNum, `Episode ${epNum}`)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                          isCurrent
                            ? 'bg-brand-500/20 border-brand-500 text-white shadow-glow-red'
                            : 'bg-dark-card border-dark-border text-gray-300 hover:bg-dark-hover hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-bold">Episode {epNum}</span>
                        {isCurrent && <span className="text-[9px] text-brand-400 font-extrabold uppercase">Diputar</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="pt-3 border-t border-dark-border/40 text-center">
              <p className="text-[10px] text-gray-400">
                Pilih episode untuk langsung memutar tanpa keluar dari player.
              </p>
            </div>

          </div>
        )}

        {/* Subtitle Appearance Settings Drawer / Modal */}
        {isSubSettingsOpen && (
          <div 
            data-sub-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 bottom-0 w-full sm:w-[420px] max-w-full bg-dark-base/95 border-l border-dark-border/80 backdrop-blur-xl z-50 p-4 sm:p-6 flex flex-col shadow-2xl animate-fade-in pointer-events-auto"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-dark-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <SlidersHorizontal className="w-5 h-5 text-brand-500 shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">Pengaturan Subtitle</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Sesuaikan ukuran font, warna & latar belakang</p>
                </div>
              </div>
              <button
                onClick={() => setIsSubSettingsOpen(false)}
                className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0"
                title="Tutup Pengaturan Subtitle"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Settings Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1 custom-scrollbar">

              {/* 1. Realtime Live Subtitle Preview Card */}
              <div>
                <label className="text-xs font-semibold text-gray-300 mb-2 block flex items-center justify-between">
                  <span>Pratinjau Langsung (Preview):</span>
                  <span className="text-[10px] text-brand-400 font-bold font-mono">{subSize}% Scale</span>
                </label>
                <div className="relative w-full h-28 sm:h-32 rounded-xl bg-gradient-to-b from-slate-900 via-zinc-900 to-black border border-dark-border/80 flex items-center justify-center p-3 overflow-hidden shadow-inner">
                  {/* Subtle video background grid pattern */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293715_1px,transparent_1px),linear-gradient(to_bottom,#1f293715_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                  
                  <div
                    style={{
                      fontSize: `clamp(${Math.round(11 * (subSize / 100))}px, ${(0.8 * (subSize / 100)).toFixed(2)}vw + ${Math.round(7 * (subSize / 100))}px, ${Math.round(24 * (subSize / 100))}px)`,
                      lineHeight: 1.3,
                      color: subColor,
                      backgroundColor:
                        subBg === 'solid'
                          ? 'rgba(0, 0, 0, 0.92)'
                          : subBg === 'semi'
                          ? 'rgba(0, 0, 0, 0.65)'
                          : 'transparent',
                      borderRadius: subBg !== 'none' ? '0.375rem' : '0',
                      padding: subBg !== 'none' ? '0.25rem 0.6rem' : '0.15rem 0.35rem',
                    }}
                    className="relative text-center font-semibold [text-shadow:_0_2px_8px_rgba(0,0,0,1),_0_0_4px_rgba(0,0,0,0.95)] max-w-[90%] transition-all duration-150"
                  >
                    Ini adalah contoh tampilan subtitle IDLIX.
                  </div>
                </div>
              </div>

              {/* 2. Subtitle Size Adjustment (Slider + Stepper) */}
              <div className="space-y-3 p-3.5 rounded-xl bg-dark-card/60 border border-dark-border/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-brand-400" />
                    <label className="text-xs font-bold text-white">Ukuran Subtitle (Font Size)</label>
                  </div>
                  <span className="text-xs font-extrabold text-brand-400 bg-brand-500/20 px-2 py-0.5 rounded-md border border-brand-500/30 font-mono">
                    {subSize}%
                  </span>
                </div>

                {/* Slider with - and + Stepper Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateSubSize(subSize - 10)}
                    disabled={subSize <= 70}
                    className="p-2 rounded-lg bg-dark-base border border-dark-border text-gray-300 hover:text-white hover:border-brand-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Kecilkan Font (-10%)"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="range"
                    min={70}
                    max={300}
                    step={5}
                    value={subSize}
                    onChange={(e) => updateSubSize(parseInt(e.target.value, 10))}
                    className="flex-1 h-2 bg-gray-700 accent-brand-500 rounded-lg cursor-pointer transition-all hover:h-2.5"
                  />

                  <button
                    onClick={() => updateSubSize(subSize + 10)}
                    disabled={subSize >= 300}
                    className="p-2 rounded-lg bg-dark-base border border-dark-border text-gray-300 hover:text-white hover:border-brand-500/50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    title="Besarkan Font (+10%)"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Presets Grid */}
                <div>
                  <span className="text-[11px] text-gray-400 font-medium mb-1.5 block">Pilihan Ukuran Cepat:</span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SUB_SIZE_PRESETS.map((preset) => {
                      const isSelected = subSize === preset.value;
                      const isMonitorHighlight = preset.value === 200;
                      return (
                        <button
                          key={preset.value}
                          onClick={() => updateSubSize(preset.value)}
                          className={`p-2 rounded-lg border text-left transition-all flex flex-col gap-0.5 active:scale-95 ${
                            isSelected
                              ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                              : isMonitorHighlight
                              ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 hover:bg-brand-500/20'
                              : 'bg-dark-base/80 border-dark-border/80 text-gray-300 hover:bg-dark-hover hover:text-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold">{preset.label}</span>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-[9px] truncate ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                            {preset.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Subtitle Font Color Options */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-dark-card/60 border border-dark-border/60">
                <label className="text-xs font-bold text-white block">Warna Teks Subtitle</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SUB_COLOR_OPTIONS.map((c) => {
                    const isSelected = subColor === c.value;
                    return (
                      <button
                        key={c.value}
                        onClick={() => updateSubColor(c.value)}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 transition-all active:scale-95 ${
                          isSelected
                            ? 'bg-white/10 border-brand-400 ring-1 ring-brand-400'
                            : 'bg-dark-base/80 border-dark-border/80 hover:bg-dark-hover'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-3.5 h-3.5 rounded-full ${c.hexClass} shadow-sm shrink-0`} />
                          <span className={`text-xs font-bold truncate ${c.textClass}`}>{c.label}</span>
                        </div>
                        {isSelected && <Check className="w-3 h-3 text-brand-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Subtitle Background Style */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-dark-card/60 border border-dark-border/60">
                <label className="text-xs font-bold text-white block">Gaya Latar Belakang (Background)</label>
                <div className="grid grid-cols-3 gap-2">
                  {SUB_BG_OPTIONS.map((bgOpt) => {
                    const isSelected = subBg === bgOpt.id;
                    return (
                      <button
                        key={bgOpt.id}
                        onClick={() => updateSubBg(bgOpt.id)}
                        className={`p-2 rounded-lg border text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1 active:scale-95 ${
                          isSelected
                            ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                            : 'bg-dark-base/80 border-dark-border/80 text-gray-300 hover:bg-dark-hover hover:text-white'
                        }`}
                      >
                        <span>{bgOpt.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 5. Vertical Position Offset */}
              <div className="space-y-2.5 p-3.5 rounded-xl bg-dark-card/60 border border-dark-border/60">
                <label className="text-xs font-bold text-white block">Posisi Vertikal</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateSubPosition('normal')}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between active:scale-95 ${
                      subPosition === 'normal'
                        ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                        : 'bg-dark-base/80 border-dark-border/80 text-gray-300 hover:bg-dark-hover hover:text-white'
                    }`}
                  >
                    <span>Standar (Bawah)</span>
                    {subPosition === 'normal' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <button
                    onClick={() => updateSubPosition('raised')}
                    className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-between active:scale-95 ${
                      subPosition === 'raised'
                        ? 'bg-brand-500 text-white border-brand-400 shadow-glow-red'
                        : 'bg-dark-base/80 border-dark-border/80 text-gray-300 hover:bg-dark-hover hover:text-white'
                    }`}
                  >
                    <span>Sedikit Naik</span>
                    {subPosition === 'raised' && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-4 border-t border-dark-border/60 flex items-center justify-between gap-3">
              <button
                onClick={resetSubSettings}
                className="px-3 py-2 rounded-lg bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:bg-dark-hover text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
                title="Kembalikan ke pengaturan awal"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                onClick={() => setIsSubSettingsOpen(false)}
                className="flex-1 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-glow-red transition-all text-center"
              >
                Selesai & Simpan
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
