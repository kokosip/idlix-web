import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle, RefreshCw, Film, Tv, Settings, MonitorPlay } from 'lucide-react';
import Hls from 'hls.js';
import { getMovieStream, getEpisodeStream, normalizeMediaItem } from '../services/api';

export default function VideoPlayerModal({ media, episodeInfo, onClose }) {
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSub, setSelectedSub] = useState('');
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const displayData = normalizeMediaItem(media);
  const isSeries = displayData?.type === 'series';
  const seasonNum = episodeInfo?.season || 1;
  const episodeNum = episodeInfo?.episode || 1;

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
      setStreamData(res.data);
      // Auto select first subtitle if available
      const subs = res.data.subtitles || res.data.vtt_tracks || res.data.tracks || [];
      if (subs.length > 0) {
        setSelectedSub(subs[0].file || subs[0].url || subs[0].src || '');
      }
    } else {
      // Mock / direct fallback URL if stream extraction has issues
      const fallbackUrl = res.data?.stream_url || res.data?.url || res.data?.embed_url;
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

  // HLS.js initialization for .m3u8 streams
  useEffect(() => {
    const video = videoRef.current;
    const streamUrl = streamData?.stream_url || streamData?.url || streamData?.m3u8;

    if (!video || !streamUrl || streamUrl.includes('iframe') || streamUrl.includes('embed')) return;

    if (Hls.isSupported() && (streamUrl.includes('.m3u8') || streamUrl.includes('/hls/'))) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      const hls = new Hls({
        debug: false,
        enableWorker: true,
      });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hlsRef.current = hls;

      return () => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.play().catch(() => {});
    } else {
      video.src = streamUrl;
    }
  }, [streamData]);

  if (!displayData) return null;

  const streamUrl = streamData?.stream_url || streamData?.url || streamData?.m3u8 || streamData?.embed_url;
  const isEmbedIframe = streamData?.type === 'iframe' || streamUrl?.includes('embed') || streamUrl?.includes('player');
  const subtitlesList = streamData?.subtitles || streamData?.vtt_tracks || streamData?.tracks || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-lg animate-fade-in">
      <div className="relative w-full max-w-5xl glass-panel rounded-3xl overflow-hidden shadow-2xl border border-dark-border flex flex-col my-auto">
        
        {/* Modal Header Bar */}
        <div className="p-4 sm:p-5 bg-dark-card border-b border-dark-border flex items-center justify-between gap-4">
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
              <button
                onClick={fetchStream}
                className="px-5 py-2.5 rounded-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-glow-red transition-all"
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
              allow="autoplay; encrypted-media; picture-in-picture"
            />
          ) : (
            /* HTML5 / HLS.js Video Player */
            <video
              ref={videoRef}
              controls
              autoPlay
              controlsList="nodownload"
              playsInline
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
          <div className="p-4 bg-dark-card border-t border-dark-border flex flex-wrap items-center justify-between gap-3 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <MonitorPlay className="w-4 h-4 text-brand-500" />
              <span className="font-semibold text-white">Stream Status:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase text-[10px]">
                {isEmbedIframe ? 'Iframe Stream' : 'Direct HLS (.m3u8)'}
              </span>
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
