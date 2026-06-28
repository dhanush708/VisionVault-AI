import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getEnhancementReport, getDownloadUrl, EnhancementReport } from '../services/enhancementService';

export default function PlaybackPage() {
  const [searchParams] = useSearchParams();
  const videoId = searchParams.get('video_id') || '';
  const navigate = useNavigate();

  const [report, setReport] = useState<EnhancementReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Playback States
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);

  // Layout mode: 'side' | 'slider'
  const [viewMode, setViewMode] = useState<'side' | 'slider'>('slider');
  const [sliderPos, setSliderPos] = useState(50); // percentage for overlay slider

  // Video Refs
  const compVideoRef = useRef<HTMLVideoElement>(null);
  const enhVideoRef = useRef<HTMLVideoElement>(null);
  const isSyncingRef = useRef(false);

  // Fetch enhancement report on mount
  useEffect(() => {
    if (!videoId) {
      setError('No Video ID provided in url query parameters.');
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const data = await getEnhancementReport(videoId);
        setReport(data);
      } catch (err: any) {
        console.error('Failed to load enhancement report:', err);
        setError('Enhancement report not found. Has the enhancement process finished?');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [videoId]);

  // Sync master events
  const handlePlay = () => {
    setIsPlaying(true);
    if (compVideoRef.current && compVideoRef.current.paused) {
      compVideoRef.current.play().catch(() => {});
    }
    if (enhVideoRef.current && enhVideoRef.current.paused) {
      enhVideoRef.current.play().catch(() => {});
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (compVideoRef.current && !compVideoRef.current.paused) {
      compVideoRef.current.pause();
    }
    if (enhVideoRef.current && !enhVideoRef.current.paused) {
      enhVideoRef.current.pause();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  // Keep timelines aligned
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (isSyncingRef.current) return;
    const time = e.currentTarget.currentTime;
    setCurrentTime(time);

    // Sync other video
    const otherVideo = e.currentTarget === compVideoRef.current ? enhVideoRef.current : compVideoRef.current;
    if (otherVideo && Math.abs(otherVideo.currentTime - time) > 0.08) {
      isSyncingRef.current = true;
      otherVideo.currentTime = time;
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 50);
    }
  };

  const handleLoadedMetadata = () => {
    if (compVideoRef.current) {
      setDuration(compVideoRef.current.duration || 0);
    }
  };

  // Master scrubbing
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (compVideoRef.current) compVideoRef.current.currentTime = time;
    if (enhVideoRef.current) enhVideoRef.current.currentTime = time;
  };

  // Speed adjustments
  const handleSpeedChange = (rate: number) => {
    setPlaybackRate(rate);
    if (compVideoRef.current) compVideoRef.current.playbackRate = rate;
    if (enhVideoRef.current) enhVideoRef.current.playbackRate = rate;
  };

  // Volume / Mute
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    setIsMuted(vol === 0);
    if (compVideoRef.current) {
      compVideoRef.current.volume = vol;
      compVideoRef.current.muted = vol === 0;
    }
    if (enhVideoRef.current) {
      enhVideoRef.current.volume = vol;
      enhVideoRef.current.muted = vol === 0;
    }
  };

  const toggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    const nextVol = nextMute ? 0 : (volume || 0.5);
    if (compVideoRef.current) {
      compVideoRef.current.muted = nextMute;
      compVideoRef.current.volume = nextVol;
    }
    if (enhVideoRef.current) {
      enhVideoRef.current.muted = nextMute;
      enhVideoRef.current.volume = nextVol;
    }
  };

  // Format Helper
  const fmtSize = (bytes?: number) => {
    if (!bytes) return '—';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const fmtDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-slate-100">
        <div className="w-16 h-16 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold tracking-wider text-slate-400">LOADING FORENSIC TELEMETRY...</p>
      </div>
    );
  }

  if (error || !videoId) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center text-3xl mb-4 font-black">!</div>
        <p className="text-lg font-bold text-slate-200 mb-2">Enhancement Playback Error</p>
        <p className="text-sm text-slate-400 max-w-md text-center mb-6">{error || 'Unknown error occurred.'}</p>
        <button
          onClick={() => navigate('/library')}
          className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-colors"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const compUrl = getDownloadUrl(videoId, 'compressed', true);
  const enhUrl = getDownloadUrl(videoId, 'enhanced', true);

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-950/60 border-b border-white/5 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl flex items-center justify-center border border-white/10 transition-all cursor-pointer"
            title="Go Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="font-extrabold text-lg text-white leading-tight">VisionVault AI Compare Viewer</h1>
            <p className="text-xs text-violet-400 font-bold uppercase tracking-wider">Forensic Quality Inspection Hub</p>
          </div>
        </div>

        {/* View Mode Selectors */}
        <div className="flex bg-slate-900 border border-white/5 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('slider')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'slider'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Split Overlay
          </button>
          <button
            onClick={() => setViewMode('side')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'side'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Side-by-Side
          </button>
        </div>
      </header>

      {/* Main Grid Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 overflow-hidden">
        {/* Left Side: Video Playback Console (3/4 Columns) */}
        <section className="lg:col-span-3 flex flex-col gap-5">
          {/* Active View Container */}
          <div className="bg-slate-950/40 border border-white/5 rounded-3xl p-4 flex-1 flex flex-col justify-center items-center relative overflow-hidden backdrop-blur-sm aspect-video">
            {viewMode === 'side' ? (
              /* SIDE-BY-SIDE MODE */
              <div className="grid grid-cols-2 gap-4 w-full h-full">
                {/* Compressed Player */}
                <div className="relative border border-white/5 rounded-2xl overflow-hidden bg-black flex flex-col">
                  <video
                    ref={compVideoRef}
                    src={compUrl}
                    muted={isMuted}
                    preload="auto"
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/75 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-amber-400 z-10">
                    Compressed H.265
                  </div>
                </div>

                {/* Enhanced Player */}
                <div className="relative border border-white/5 rounded-2xl overflow-hidden bg-black flex flex-col">
                  <video
                    ref={enhVideoRef}
                    src={enhUrl}
                    muted={isMuted}
                    preload="auto"
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 bg-black/75 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-emerald-400 z-10">
                    AI Enhanced (Output Resolution)
                  </div>
                </div>
              </div>
            ) : (
              /* SLIDER SPLIT OVERLAY MODE */
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black select-none">
                {/* Base: Compressed Video (Right side) */}
                <video
                  ref={compVideoRef}
                  src={compUrl}
                  muted={isMuted}
                  preload="auto"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Top Overlay: Enhanced Video (Left side, clipped) */}
                <video
                  ref={enhVideoRef}
                  src={enhUrl}
                  muted={isMuted}
                  preload="auto"
                  onPlay={handlePlay}
                  onPause={handlePause}
                  onTimeUpdate={handleTimeUpdate}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
                  }}
                />

                {/* UI Mode Labels */}
                <div className="absolute top-3 left-3 bg-black/75 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-emerald-400 pointer-events-none z-20">
                  Enhanced Resolution
                </div>
                <div className="absolute top-3 right-3 bg-black/75 border border-white/10 rounded-lg px-2.5 py-1 text-[10px] font-black tracking-wider uppercase text-amber-400 pointer-events-none z-20">
                  Compressed Feed
                </div>

                {/* Physical Divider Line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-violet-500 hover:bg-violet-400 cursor-col-resize z-20 pointer-events-none shadow-lg shadow-violet-500/50"
                  style={{ left: `${sliderPos}%` }}
                >
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-violet-600 border border-violet-400 shadow-xl flex items-center justify-center text-xs text-white font-extrabold select-none">
                    ↔
                  </div>
                </div>

                {/* Range Input Overlay for Drag Action */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPos}
                  onChange={(e) => setSliderPos(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-col-resize z-30"
                />
              </div>
            )}
          </div>

          {/* Premium Unified Custom Video Controller */}
          <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
            {/* Scrubber timeline */}
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 min-w-[45px] tabular-nums">
                {fmtDuration(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.01"
                value={currentTime}
                onChange={handleScrub}
                className="flex-1 h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500 hover:accent-violet-400"
              />
              <span className="text-[10px] font-bold text-slate-500 min-w-[45px] tabular-nums text-right">
                {fmtDuration(duration)}
              </span>
            </div>

            {/* Console Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Playback rate & Play/Pause */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-full flex items-center justify-center text-white transition-all shadow-md shadow-violet-600/10 cursor-pointer"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5 text-white fill-white" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white fill-white translate-x-0.5" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Speed multipliers */}
                <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 gap-0.5">
                  {[0.5, 1.0, 1.5, 2.0].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handleSpeedChange(rate)}
                      className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                        playbackRate === rate
                          ? 'bg-violet-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {rate.toFixed(1)}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume / Mute slider */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <button onClick={toggleMute} className="text-slate-400 hover:text-slate-200 cursor-pointer">
                  {isMuted ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M12 18.75V5.25L7.75 9.5H4.5v5h3.25L12 18.75z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>

              {/* Direct Downloads */}
              <div className="flex gap-2">
                <a
                  href={getDownloadUrl(videoId, 'compressed')}
                  download
                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  H.265 Feed
                </a>
                <a
                  href={getDownloadUrl(videoId, 'enhanced')}
                  download
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/20 text-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Enhanced Feed
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Executive AI Enhancement Report Panel (1/4 Column) */}
        {report && (
          <aside className="lg:col-span-1 bg-slate-950/70 border border-white/5 rounded-3xl p-5 flex flex-col gap-5 backdrop-blur-sm overflow-y-auto max-h-[85vh]">
            <div className="flex items-center gap-2.5 pb-3 border-b border-white/5">
              <span className="text-xl">📄</span>
              <div>
                <h2 className="font-extrabold text-sm text-white">Executive AI Report</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CUDA-Benchmarked Audit</p>
              </div>
            </div>

            {/* Video Resolution Stats */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Resolution Specifications</h3>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Source Resolution</span>
                <span className="text-slate-300 font-semibold">{report.video_metrics.original_resolution}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500 font-bold text-violet-300">Output Resolution</span>
                <span className="text-emerald-400 font-black">{report.video_metrics.output_resolution}</span>
              </div>
            </div>

            {/* File Footprint Metrics */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Storage footprint</h3>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Original Size</span>
                <span className="text-slate-300 font-semibold">{fmtSize(report.video_metrics.original_size_bytes)}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Compressed Size</span>
                <span className="text-orange-400 font-semibold">{fmtSize(report.video_metrics.compressed_size_bytes)}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Enhanced Size</span>
                <span className="text-emerald-400 font-semibold">{fmtSize(report.video_metrics.enhanced_size_bytes)}</span>
              </div>
            </div>

            {/* GPU Telemetry Stats */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">GPU Telemetry</h3>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Device</span>
                <span className="text-slate-300 font-semibold truncate max-w-[120px]" title={report.device}>
                  {report.device.replace('Laptop GPU', '').trim()}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Model Used</span>
                <span className="text-slate-300 font-semibold truncate max-w-[120px]" title={report.model_used}>
                  Real-ESRGAN
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Avg GPU Core usage</span>
                <span className="text-slate-300 font-semibold">{report.processing_summary.avg_gpu_utilization_percent}%</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Peak VRAM Memory</span>
                <span className="text-slate-300 font-semibold">{report.processing_summary.peak_vram_mb} MB</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Processing Rate</span>
                <span className="text-slate-300 font-semibold">{report.processing_summary.average_speed_fps} FPS</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Processing Time</span>
                <span className="text-slate-300 font-semibold">{report.processing_summary.processing_time_seconds.toFixed(1)}s</span>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
              <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Quality Metrics (Restored)</h3>
              <div className="flex justify-between items-center text-xs py-1 border-b border-white/5">
                <span className="text-slate-500">Restored SSIM</span>
                <span className="text-emerald-400 font-bold">{report.video_metrics.restored_ssim}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-1">
                <span className="text-slate-500">Restored PSNR</span>
                <span className="text-emerald-400 font-bold">{report.video_metrics.restored_psnr_db} dB</span>
              </div>
            </div>

            {/* Forensic Narrative */}
            <div className="bg-[#0b101c] border border-white/5 rounded-2xl p-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Forensic Audit Summary</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                {report.forensic_analysis}
              </p>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
