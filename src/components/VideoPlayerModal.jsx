import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  Film, 
  Tv, 
  ExternalLink, 
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
  Pause
} from 'lucide-react';
import Hls from 'hls.js';
import { getMovieStream, getEpisodeStream, normalizeMediaItem, getApiBaseUrl } from '../services/api';
import { useWatchHistory } from '../context/WatchHistoryContext';

export default function VideoPlayerModal({ media, episodeInfo, onClose }) {
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [playerMode, setPlayerMode] = useState('auto'); // 'auto', 'hls', 'iframe'
  const [copied, setCopied] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

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
  const seasonNum = episodeInfo?.season || 1;
  const episodeNum = episodeInfo?.episode || 1;

  const { saveProgress, getSavedProgress } = useWatchHistory();
  const [resumedNotice, setResumedNotice] = useState(null);
  const hasAutoResumedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  const checkAndResumePlayback = (video) => {
    if (hasAutoResumedRef.current || !video || !displayData) return;
    const dur = video.duration || duration || 0;
    if (!dur || dur <= 0) return;

    const saved = getSavedProgress(
      displayData.slug,
      isSeries ? seasonNum : undefined,
      isSeries ? episodeNum : undefined
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

    // Direct DOM update for seekbar range slider (Zero React re-renders)
    if (seekbarRef.current && document.activeElement !== seekbarRef.current) {
      seekbarRef.current.max = dur || 100;
      seekbarRef.current.value = time;
    }

    // Direct DOM update for time display text
    if (timeTextRef.current) {
      timeTextRef.current.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    }

    // Direct DOM update for Subtitles (only triggers DOM mutation when cue text changes)
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
        episodeInfo: isSeries ? { season: seasonNum, episode: episodeNum } : null,
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
        // iOS Safari native video fullscreen
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

  const handleOpenVLC = () => {
    const rawStream = streamUrl;
    const subUrl = selectedSub
      ? selectedSub.startsWith('http')
        ? selectedSub
        : `${getApiBaseUrl()}${selectedSub.startsWith('/') ? '' : '/'}${selectedSub}`
      : '';

    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isAndroid) {
      let cleanUrl = rawStream.replace(/^https?:\/\//, '');
      let intentUrl = `intent://${cleanUrl}#Intent;action=android.intent.action.VIEW;type=video/*;package=org.videolan.vlc;`;
      if (subUrl) {
        intentUrl += `S.subtitles_location=${subUrl};`;
        intentUrl += `S.sub=${subUrl};`;
      }
      intentUrl += 'end';
      window.location.href = intentUrl;
    } else if (isIOS) {
      window.location.href = `vlc-x-callback://x-callback-url/stream?url=${encodeURIComponent(rawStream)}${
        subUrl ? `&sub=${encodeURIComponent(subUrl)}` : ''
      }`;
    } else {
      const fileName = `${displayData.title.replace(/[^a-z0-9]/gi, '_')}.m3u`;
      let m3uText = `#EXTM3U\n#EXTINF:-1, ${displayData.title}\n`;
      if (subUrl) {
        m3uText += `#EXTVLCOPT:sub-file=${subUrl}\n`;
        m3uText += `#EXTVLCOPT:input-slave=${subUrl}\n`;
      }
      m3uText += `${rawStream}\n`;

      const blob = new Blob([m3uText], { type: 'audio/x-mpegurl' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
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

  // Sync fullscreen change events (Android Chrome / iOS Safari / Desktop)
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

  // Disable background page scrolling & touch dragging while video player modal is open
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
      setControlsVisible(false);
    }, delay);
  };

  // Auto-hide navigation controls 2 seconds after stream loads / starts playing
  useEffect(() => {
    if (streamData && !isLoading) {
      resetControlsTimeout(2000);
    }
  }, [streamData, isLoading]);

  const handlePlayerClick = (e) => {
    // If click is on interactive elements (button, input, select, link, option), keep controls visible & reset 2s timer
    const isInteractive = e.target.closest('button, input, select, a, option');
    if (isInteractive) {
      resetControlsTimeout(2000);
      return;
    }

    // Immediate Netflix-style tap toggle for video navigation
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    setControlsVisible((prev) => {
      const nextState = !prev;
      if (nextState) {
        // If turning ON controls, auto dismiss after 2s
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 2000);
      }
      // If turning OFF controls, immediately hides without delay
      return nextState;
    });
  };

  // Keyboard Shortcuts (Space for Play/Pause toggle, Esc for exiting fullscreen)
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
      } else if (e.key === 'Escape' && isBrowserFullscreen) {
        setIsBrowserFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isBrowserFullscreen]);

  const fetchStream = async () => {
    setIsLoading(true);
    setError(null);
    setStreamData(null);

    let res;
    if (isSeries) {
      res = await getEpisodeStream(displayData.slug, seasonNum, episodeNum);
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
  };

  useEffect(() => {
    if (displayData) {
      fetchStream();
    }
  }, [media, episodeInfo]);

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

  // Keep subtitle cues synced to ref for high-performance direct DOM updates
  useEffect(() => {
    vttCuesRef.current = vttCues;
    if (subtitleRef.current) {
      subtitleRef.current.innerHTML = '';
      subtitleRef.current.style.display = 'none';
    }
    lastCueTextRef.current = '';
  }, [vttCues]);

  // HLS.js initialization for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || isEmbedIframe) return;

    // Correctly check if URL is an HLS playlist (.m3u8) vs Direct MP4/Video stream
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
              console.warn('[HLS Network Error] Trying to recover...', data);
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS Media Error] Trying to recover...', data);
              hls.recoverMediaError();
              break;
            default:
              console.error('[HLS Unrecoverable Error]', data);
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
      // Direct MP4 video or Safari Native HLS: Pure 100% GPU hardware decoding without JS overhead
      video.src = streamUrl;
      video.play().catch(() => {});
    }
  }, [streamUrl, isEmbedIframe, rawType]);

  if (!displayData) return null;

  return (
    <div
      className={`fixed inset-0 z-50 bg-black w-screen h-screen flex flex-col justify-between overflow-hidden select-none touch-none overscroll-none animate-fade-in ${
        controlsVisible ? 'cursor-default' : 'cursor-none'
      }`}
      onMouseMove={() => resetControlsTimeout(2000)}
      onMouseLeave={() => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        setControlsVisible(false);
      }}
      onClick={handlePlayerClick}
    >
      <div className="relative w-full h-full border-0 flex flex-col justify-between overflow-hidden bg-black">
        {/* Netflix Desktop Style Header Bar */}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-none ${
            controlsVisible ? 'opacity-100' : 'opacity-0'
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
                {isSeries ? `Season ${seasonNum} • Episode ${episodeNum}` : `Movie • ${displayData.year}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            {streamUrl && (
              <>
                <button
                  onClick={handleOpenVLC}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shrink-0"
                  title="Buka & Putar Stream di Aplikasi VLC Media Player (Bebas Lag + Subtitle Otomatis)"
                >
                  <Tv className="w-4 h-4 text-amber-200" />
                  <span className="hidden sm:inline">Buka VLC</span>
                </button>

                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold transition-all shadow-glow-red shrink-0"
                  title="Buka Stream di Tab Baru (Gunakan Player Bawaan Browser)"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>
              </>
            )}

            {/* Subtitle Selector */}
            {subtitlesList.length > 0 && (
              <div className="flex items-center gap-1 bg-black/60 border border-white/10 px-2.5 py-1.5 rounded-lg backdrop-blur-md">
                <span className="text-xs text-gray-300 font-medium hidden sm:inline">Sub:</span>
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer max-w-[100px] sm:max-w-[130px] truncate"
                >
                  <option value="" className="bg-dark-card text-white">(Off)</option>
                  {subtitlesList.map((sub, idx) => (
                    <option key={idx} value={sub.file || sub.url || sub.src} className="bg-dark-card text-white">
                      {sub.label || sub.language || `Sub ${idx + 1}`}
                    </option>
                  ))}
                </select>
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
              <span className="text-sm font-semibold">Memproses dan Ekstraksi Video Stream...</span>
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
                onClick={fetchStream}
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
              {/* Invisible Click Layer for video frame */}
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
                      episodeInfo: isSeries ? { season: seasonNum, episode: episodeNum } : null,
                      currentTime: video.currentTime,
                      duration: video.duration || duration,
                    });
                  }
                }}
                className="w-full h-full object-contain cursor-pointer z-0"
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

              {/* Center Play/Pause & Quick Seek Buttons Overlay (Clean Netflix Style) */}
              <div
                onClick={handlePlayerClick}
                className={`absolute inset-0 flex items-center justify-center gap-6 sm:gap-10 bg-transparent transition-opacity duration-300 z-20 cursor-pointer ${
                  controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
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
                  style={{ display: 'none', whitespace: 'pre-line' }}
                  className="absolute bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 max-w-[92%] sm:max-w-2xl px-2 py-1 text-white text-sm sm:text-base md:text-lg font-normal text-center z-20 pointer-events-none transition-all [text-shadow:_0_2px_6px_rgba(0,0,0,0.95),_0_0_3px_rgba(0,0,0,0.9)] leading-snug"
                />
              )}

              {/* Bottom Seekbar & Controls Bar (Netflix Style Gradient Overlay) */}
              <div
                className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/80 to-transparent z-30 transition-opacity duration-300 ${
                  controlsVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
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

                {/* Controls Row: Play/Pause, Time, Fullscreen Button */}
                <div className="flex items-center justify-between text-xs text-white font-bold px-1">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlayPause}
                      className="p-1.5 rounded-full hover:bg-white/20 active:scale-95 transition-all"
                      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                    </button>

                    <span ref={timeTextRef} className="text-xs sm:text-sm text-gray-300 font-mono tracking-tight">
                      00:00 / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
