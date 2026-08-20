import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, RefreshCw, Film, Tv, ExternalLink, Copy, Check, MonitorPlay, Layers, Maximize2, Minimize2, ArrowLeft, RotateCcw, RotateCw } from 'lucide-react';
import Hls from 'hls.js';
import { getMovieStream, getEpisodeStream, normalizeMediaItem, getApiBaseUrl } from '../services/api';

export default function VideoPlayerModal({ media, episodeInfo, onClose }) {
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState('');
  const [playerMode, setPlayerMode] = useState('auto'); // 'auto', 'hls', 'iframe'
  const [copied, setCopied] = useState(false);
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);

  // Auto-hiding controls timer for Netflix-style immersive view
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const displayData = normalizeMediaItem(media);
  const isSeries = displayData?.type === 'series';
  const seasonNum = episodeInfo?.season || 1;
  const episodeNum = episodeInfo?.episode || 1;

  const handleSeek = (seconds) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
      resetControlsTimeout();
    }
  };

  // Disable background page scrolling & touch dragging while video player modal is open & auto-fullscreen on mobile
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    const originalOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.overscrollBehavior = 'none';

    const preventTouchScroll = (e) => {
      // Prevent dragging page around on mobile touch devices when video modal is open
      if (e.target.tagName !== 'SELECT' && e.target.tagName !== 'OPTION') {
        if (e.cancelable) e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventTouchScroll, { passive: false });

    // Auto-enable full screen mode on mobile screens
    if (window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024)) {
      setIsBrowserFullscreen(true);
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.removeEventListener('touchmove', preventTouchScroll);
    };
  }, []);

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  };

  // Keyboard Shortcuts (Space for Play/Pause toggle, Esc for exiting fullscreen)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore keyboard shortcuts when typing inside form elements
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();

        // Remove focus from focused button so Space never triggers button clicks
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }

        const video = videoRef.current;
        if (video) {
          if (video.paused) {
            video.play().catch((err) => console.warn('[VideoPlayer] Play error:', err));
          } else {
            video.pause();
          }
        }
      } else if (e.key === 'Escape' && isBrowserFullscreen) {
        setIsBrowserFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isBrowserFullscreen]);

  // Manage control visibility timer when in browser fullscreen mode
  useEffect(() => {
    if (isBrowserFullscreen) {
      resetControlsTimeout();
    } else {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
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
      // Extract inner payload if wrapped inside res.data.data or res.data.result
      const rawData = res.data;
      const payload = rawData.data || rawData.result || rawData.stream || rawData;
      setStreamData(payload);

      // Auto select first subtitle if available
      const subs = payload.subtitles || payload.vtt_tracks || payload.tracks || payload.captions || [];
      if (subs.length > 0) {
        setSelectedSub(subs[0].file || subs[0].url || subs[0].src || '');
      }
    } else {
      // Mock / direct fallback URL if stream extraction has issues
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

  // Strict iframe embed detection (prevent false positive on /v/ or json stream endpoints)
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
  const [currentTime, setCurrentTime] = useState(0);

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
          // Parse cues for high-visibility overlay rendering
          const parsed = parseVttCues(text);
          if (isMounted) {
            setVttCues(parsed);
          }

          // Ensure WEBVTT header & convert SRT timestamp comma to dot if needed
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

  // Active VTT cue matching for overlay
  const activeCue = vttCues.find((c) => currentTime >= c.start && currentTime <= c.end);

  // HLS.js initialization for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl || isEmbedIframe) return;

    const isHlsStream = streamUrl.includes('.m3u8') || streamUrl.includes('/hls/') || rawType === 'm3u8' || rawType === 'hls' || Hls.isSupported();

    if (Hls.isSupported() && isHlsStream) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
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
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch(() => { });
    } else {
      video.src = streamUrl;
    }
  }, [streamUrl, isEmbedIframe, rawType]);

  if (!displayData) return null;

  return (
    <div
      className={
        isBrowserFullscreen
          ? `fixed inset-0 z-[100] bg-black w-screen h-screen flex flex-col justify-center items-center overflow-hidden select-none ${
              controlsVisible ? '' : 'cursor-none'
            }`
          : 'fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg animate-fade-in'
      }
      onMouseMove={isBrowserFullscreen ? resetControlsTimeout : undefined}
      onClick={isBrowserFullscreen ? resetControlsTimeout : undefined}
    >
      <div
        className={
          isBrowserFullscreen
            ? 'relative w-full h-full max-w-none rounded-none border-0 flex flex-col flex-1 overflow-hidden bg-black'
            : 'relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-dark-border flex flex-col my-auto'
        }
      >
        {/* Header Bar (Floating Overlay for Fullscreen, Card Header for Normal) */}
        <div
          className={
            isBrowserFullscreen
              ? `absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-none ${
                  controlsVisible ? 'opacity-100' : 'opacity-0'
                }`
              : 'p-3 sm:p-4 bg-dark-card border-b border-dark-border flex items-center justify-between gap-4 shrink-0'
          }
        >
          <div className={`flex items-center gap-3 min-w-0 ${isBrowserFullscreen ? 'pointer-events-auto' : ''}`}>
            {isBrowserFullscreen ? (
              <button
                onClick={() => setIsBrowserFullscreen(false)}
                className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all group"
                title="Keluar Fullscreen (Esc)"
              >
                <ArrowLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
                {isSeries ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
              </div>
            )}

            <div className="min-w-0">
              <h3 className={isBrowserFullscreen ? 'text-base sm:text-xl font-black text-white truncate drop-shadow-md' : 'text-sm sm:text-base font-extrabold text-white truncate'}>
                {displayData.title}
              </h3>
              <p className={isBrowserFullscreen ? 'text-xs sm:text-sm text-gray-300 font-medium truncate' : 'text-xs text-gray-400'}>
                {isSeries ? `Season ${seasonNum} • Episode ${episodeNum}` : `Movie • ${displayData.year}`}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-2 ${isBrowserFullscreen ? 'pointer-events-auto' : ''}`}>
            {streamUrl && (
              <>
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    isBrowserFullscreen
                      ? 'p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all'
                      : 'flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-xs font-semibold text-gray-200 hover:text-white hover:border-brand-500 transition-all'
                  }
                  title="Buka Stream URL di Tab Baru Browser"
                >
                  <ExternalLink className={isBrowserFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5 text-brand-500'} />
                  {!isBrowserFullscreen && <span className="hidden sm:inline">Buka Tab Baru</span>}
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className={
                    isBrowserFullscreen
                      ? 'p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all'
                      : 'flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-xs font-semibold text-gray-200 hover:text-white hover:border-brand-500 transition-all'
                  }
                  title="Salin Direct Stream URL"
                >
                  {copied ? (
                    <Check className={isBrowserFullscreen ? 'w-4 h-4 text-emerald-400' : 'w-3.5 h-3.5 text-emerald-400'} />
                  ) : (
                    <Copy className={isBrowserFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5 text-gray-400'} />
                  )}
                  {!isBrowserFullscreen && <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Salin URL'}</span>}
                </button>
              </>
            )}

            <button
              onClick={() => setPlayerMode((prev) => (prev === 'iframe' ? 'hls' : 'iframe'))}
              className={
                isBrowserFullscreen
                  ? 'px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md text-xs font-semibold transition-all flex items-center gap-1.5'
                  : 'flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-white hover:border-brand-500 transition-all'
              }
              title="Ganti Player Mode"
            >
              <Layers className={isBrowserFullscreen ? 'w-3.5 h-3.5 text-brand-400' : 'w-3 h-3 text-brand-500'} />
              <span className="hidden sm:inline">{isEmbedIframe ? 'Iframe' : 'HLS Direct'}</span>
            </button>

            <button
              onClick={() => setIsBrowserFullscreen(!isBrowserFullscreen)}
              className={
                isBrowserFullscreen
                  ? 'hidden md:inline-flex p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all'
                  : 'hidden md:inline-flex p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all'
              }
              title={isBrowserFullscreen ? 'Keluar Fullscreen (Esc)' : 'Fullscreen Browser Netflix Style'}
            >
              {isBrowserFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {!isBrowserFullscreen && (
              <button
                onClick={fetchStream}
                className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
                title="Muat Ulang Stream"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
              </button>
            )}

            <button
              onClick={onClose}
              className={
                isBrowserFullscreen
                  ? 'p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all'
                  : 'p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all'
              }
              title="Tutup Player"
            >
              <X className={isBrowserFullscreen ? 'w-5 h-5' : 'w-5 h-5'} />
            </button>
          </div>
        </div>

        {/* Video Viewport (Single Reused DOM Element) */}
        <div
          className={
            isBrowserFullscreen
              ? 'relative w-full h-full bg-black flex items-center justify-center overflow-hidden'
              : 'relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden'
          }
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 gap-3 text-gray-400">
              <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
              <span className="text-sm font-semibold">Memproses dan Ekstraksi Video Stream...</span>
              <span className="text-xs text-gray-500">Membuka proteksi Cloudflare & ekstraksi HLS m3u8</span>
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
              <div className="flex items-center gap-3">
                <button
                  onClick={fetchStream}
                  className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-glow-red transition-all"
                >
                  Coba Lagi
                </button>
                {streamUrl && (
                  <a
                    href={streamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 rounded-full bg-dark-surface border border-dark-border hover:border-brand-500 text-white font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka di Tab Baru</span>
                  </a>
                )}
              </div>
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
            /* HTML5 / HLS.js Video Player (100% Shared Single Instance) */
            <>
              <video
                ref={videoRef}
                controls
                autoPlay
                controlsList="nodownload"
                playsInline
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                className="w-full h-full object-contain"
              >
                {subBlobUrl && (
                  <track
                    key={subBlobUrl}
                    kind="subtitles"
                    src={subBlobUrl}
                    srcLang="id"
                    label="Indonesian"
                    default
                  />
                )}
                Browser anda tidak mendukung HTML5 video tag.
              </video>

              {/* Quick Seek Buttons Overlay */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20">
                <button
                  onClick={() => handleSeek(-10)}
                  className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95 border border-white/10 backdrop-blur-md transition-all shadow-lg flex items-center gap-1 text-xs font-bold"
                  title="Mundur 10 Detik"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>-10s</span>
                </button>
                <button
                  onClick={() => handleSeek(10)}
                  className="pointer-events-auto p-2.5 sm:p-3 rounded-full bg-black/60 text-white hover:bg-black/80 active:scale-95 border border-white/10 backdrop-blur-md transition-all shadow-lg flex items-center gap-1 text-xs font-bold"
                  title="Maju 10 Detik"
                >
                  <span>+10s</span>
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {/* High-visibility Netflix-style Subtitle Overlay */}
              {activeCue && !isEmbedIframe && (
                <div className="absolute bottom-[22%] sm:bottom-14 landscape:bottom-6 left-1/2 -translate-x-1/2 max-w-[92%] sm:max-w-3xl px-3.5 py-1.5 rounded-lg bg-black/90 border border-white/10 text-white text-xs sm:text-base md:text-lg font-extrabold text-center drop-shadow-2xl z-30 pointer-events-none transition-all">
                  {activeCue.text.split('\n').map((line, idx) => (
                    <div key={idx}>{line}</div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Video Player Footer Bar */}
        {!isLoading && !error && streamData && (
          <div
            className={
              isBrowserFullscreen
                ? `absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 pointer-events-none ${
                    controlsVisible ? 'opacity-100' : 'opacity-0'
                  }`
                : 'p-3 sm:p-4 bg-dark-card border-t border-dark-border flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 shrink-0'
            }
          >
            <div className={`flex items-center gap-3 ${isBrowserFullscreen ? 'pointer-events-auto' : ''}`}>
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-white">Stream Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[10px]">
                  {isEmbedIframe ? 'Iframe Stream' : 'Direct HLS (.m3u8)'}
                </span>
              </div>
            </div>

            {/* Subtitle Selector */}
            {subtitlesList.length > 0 && (
              <div
                className={
                  isBrowserFullscreen
                    ? 'flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 pointer-events-auto'
                    : 'flex items-center gap-2'
                }
              >
                <span className="text-gray-300 font-medium">Subtitle:</span>
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className={
                    isBrowserFullscreen
                      ? 'bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer'
                      : 'bg-dark-surface border border-dark-border text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500'
                  }
                >
                  <option value="" className="bg-dark-card text-white">(Tanpa Subtitle)</option>
                  {subtitlesList.map((sub, idx) => (
                    <option key={idx} value={sub.file || sub.url || sub.src} className="bg-dark-card text-white">
                      {sub.label || sub.language || `Trek ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



