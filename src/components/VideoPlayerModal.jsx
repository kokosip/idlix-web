import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, RefreshCw, Film, Tv, ExternalLink, Copy, Check, MonitorPlay, Layers, Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import Hls from 'hls.js';
import { getMovieStream, getEpisodeStream, normalizeMediaItem } from '../services/api';

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

  const resetControlsTimeout = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  };

  // Handle ESC key to exit browser fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBrowserFullscreen) {
        setIsBrowserFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // Auto-detect iframe embed vs direct HLS video stream
  const detectedIsIframe =
    rawType === 'iframe' ||
    rawType === 'embed' ||
    streamUrl.includes('embed') ||
    streamUrl.includes('player.php') ||
    streamUrl.includes('vidsrc') ||
    streamUrl.includes('/e/') ||
    streamUrl.includes('/v/') ||
    (!streamUrl.includes('.m3u8') && !streamUrl.includes('.mp4') && !streamUrl.includes('/hls/') && (streamUrl.startsWith('http://') || streamUrl.startsWith('https://')));

  const isEmbedIframe = playerMode === 'iframe' ? true : playerMode === 'hls' ? false : detectedIsIframe;
  const subtitlesList = payload?.subtitles || payload?.vtt_tracks || payload?.tracks || payload?.captions || [];

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

  //Edge-to-Edge Browser Fullscreen View
  if (isBrowserFullscreen) {
    return (
      <div
        className={`fixed inset-0 z-[100] bg-black w-screen h-screen flex flex-col justify-center items-center overflow-hidden select-none ${controlsVisible ? '' : 'cursor-none'
          }`}
        onMouseMove={resetControlsTimeout}
        onClick={resetControlsTimeout}
      >
        {/* Floating Top Header Overlay*/}
        <div
          className={`absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
        >
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setIsBrowserFullscreen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all group"
              title="Keluar Fullscreen (Esc)"
            >
              <ArrowLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white truncate drop-shadow-md">
                {displayData.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium truncate">
                {isSeries ? `Season ${seasonNum} • Episode ${episodeNum}` : `Movie • ${displayData.year}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streamUrl && (
              <>
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                  title="Buka Stream URL di Tab Baru Browser"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
                  title="Salin Direct Stream URL"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </>
            )}

            <button
              onClick={() => setPlayerMode((prev) => (prev === 'iframe' ? 'hls' : 'iframe'))}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md text-xs font-semibold transition-all flex items-center gap-1.5"
              title="Ganti Player Mode"
            >
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">{isEmbedIframe ? 'Iframe' : 'HLS Direct'}</span>
            </button>

            <button
              onClick={() => setIsBrowserFullscreen(false)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
              title="Keluar Fullscreen Browser"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all"
              title="Tutup Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Viewport (100% Browser Screen) */}
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
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
              <h4 className="text-sm font-bold text-white mb-1">Gagal Memuat Stream Video</h4>
              <p className="text-xs text-gray-400">{error}</p>
              <button
                onClick={fetchStream}
                className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition-all"
              >
                Coba Lagi
              </button>
            </div>
          ) : isEmbedIframe ? (
            <iframe
              src={streamUrl}
              title={displayData.title}
              className="w-full h-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            />
          ) : (
            <video
              ref={videoRef}
              controls
              autoPlay
              controlsList="nodownload"
              playsInline
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            >
              {selectedSub && (
                <track
                  kind="subtitles"
                  src={selectedSub}
                  srcLang="id"
                  label="Indonesian"
                  default
                />
              )}
            </video>
          )}
        </div>

        {/* Floating Bottom Footer Overlay (Netflix Style) */}
        {!isLoading && !error && streamData && (
          <div
            className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3 z-30 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
          >
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                {isEmbedIframe ? 'Iframe Stream' : 'Direct HLS (.m3u8)'}
              </span>
            </div>

            {subtitlesList.length > 0 && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <span className="text-xs text-gray-300 font-medium">Subtitle:</span>
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
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
    );
  }

  // Standard Modal View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-dark-border flex flex-col my-auto">

        {/* Modal Header Bar */}
        <div className="p-3 sm:p-4 bg-dark-card border-b border-dark-border flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
              {isSeries ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                {displayData.title}
              </h3>
              <p className="text-xs text-gray-400">
                {isSeries ? `Season ${seasonNum} • Episode ${episodeNum}` : `Movie • ${displayData.year}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {streamUrl && (
              <>
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-xs font-semibold text-gray-200 hover:text-white hover:border-brand-500 transition-all"
                  title="Buka Stream URL di Tab Baru Browser"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-brand-500" />
                  <span className="hidden sm:inline">Buka Tab Baru</span>
                </a>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(streamUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dark-surface border border-dark-border text-xs font-semibold text-gray-200 hover:text-white hover:border-brand-500 transition-all"
                  title="Salin Direct Stream URL"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  <span className="hidden sm:inline">{copied ? 'Tersalin!' : 'Salin URL'}</span>
                </button>
              </>
            )}

            {/* Browser Fullscreen Toggle Button */}
            <button
              onClick={() => setIsBrowserFullscreen(true)}
              className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
              title="Fullscreen Browser Netflix Style (Seluas Window Browser)"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={fetchStream}
              className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
              title="Muat Ulang Stream"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-dark-surface border border-dark-border text-gray-300 hover:text-white hover:border-brand-500 transition-all"
              title="Tutup Player"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Video Viewport */}
        <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
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
            /* HTML5 / HLS.js Video Player */
            <video
              ref={videoRef}
              controls
              autoPlay
              controlsList="nodownload"
              playsInline
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            >
              {selectedSub && (
                <track
                  kind="subtitles"
                  src={selectedSub}
                  srcLang="id"
                  label="Indonesian"
                  default
                />
              )}
              Browser anda tidak mendukung HTML5 video tag.
            </video>
          )}
        </div>

        {/* Video Player Footer & Subtitle Selector */}
        {!isLoading && !error && streamData && (
          <div className="p-3 sm:p-4 bg-dark-card border-t border-dark-border flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-brand-500" />
                <span className="font-semibold text-white">Stream Status:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[10px]">
                  {isEmbedIframe ? 'Iframe Stream' : 'Direct HLS (.m3u8)'}
                </span>
              </div>

              {/* Mode Toggle Button */}
              {streamUrl && (
                <button
                  onClick={() => {
                    setPlayerMode((prev) => (prev === 'iframe' ? 'hls' : 'iframe'));
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-white hover:border-brand-500 transition-all"
                  title="Ganti antara HLS Direct Video dan Iframe Embed Mode"
                >
                  <Layers className="w-3 h-3 text-brand-500" />
                  <span>Ganti Player Mode</span>
                </button>
              )}

              {/* Browser Fullscreen Footer Shortcut */}
              <button
                onClick={() => setIsBrowserFullscreen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-dark-surface border border-dark-border text-[11px] text-gray-300 hover:text-white hover:border-brand-500 transition-all"
                title="Fullscreen"
              >
                <Maximize2 className="w-3 h-3 text-brand-500" />
                <span>Fullscreen</span>
              </button>
            </div>

            {/* Subtitle selector if vtt tracks available */}
            {subtitlesList.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Subtitle:</span>
                <select
                  value={selectedSub}
                  onChange={(e) => setSelectedSub(e.target.value)}
                  className="bg-dark-surface border border-dark-border text-white text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-brand-500"
                >
                  <option value="">(Tanpa Subtitle)</option>
                  {subtitlesList.map((sub, idx) => (
                    <option key={idx} value={sub.file || sub.url || sub.src}>
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


