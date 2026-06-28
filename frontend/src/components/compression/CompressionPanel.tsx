import { useState, useEffect, useRef } from 'react';
import { startCompression, pollProgress, fetchCompressionReport, CompressionProgress, CompressionReport } from '../../services/compressionService';

interface Props {
  videoId: string;
}

type CompressionState = 'idle' | 'compressing' | 'completed' | 'error';

function CompressionPanel({ videoId }: Props) {
  const [state, setState] = useState<CompressionState>('idle');
  const [profile, setProfile] = useState('balanced');
  const [progress, setProgress] = useState<CompressionProgress | null>(null);
  const [report, setReport] = useState<CompressionReport | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleStart = async () => {
    setState('compressing');
    setError('');
    try {
      await startCompression(videoId, profile);
      pollRef.current = setInterval(async () => {
        try {
          const prog = await pollProgress(videoId);
          setProgress(prog);
          if (prog.status === 'completed') {
            if (pollRef.current) clearInterval(pollRef.current);
            const rep = await fetchCompressionReport(videoId);
            setReport(rep);
            setState('completed');
          } else if (prog.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
            setState('error');
            setError('Compression failed. Check server logs.');
          }
        } catch {
          // Progress not ready yet
        }
      }, 1000);
    } catch (err: any) {
      setState('error');
      setError(err.response?.data?.detail?.error?.message || 'Failed to start compression');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const formatTime = (ms: number) => {
    if (ms >= 60000) return `${(ms / 60000).toFixed(1)} min`;
    return `${(ms / 1000).toFixed(1)} sec`;
  };

  return (
    <div className="mt-6 bg-slate-800 rounded-xl p-6 border border-orange-500/30">
      <h3 className="text-lg font-semibold text-orange-300 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        H.265 Compression Engine
      </h3>

      {state === 'idle' && (
        <div>
          <p className="text-slate-400 text-sm mb-4">Select a compression profile and start optimization.</p>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['archive', 'balanced', 'evidence'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProfile(p)}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  profile === p
                    ? 'border-orange-500 bg-orange-500/10 text-orange-300'
                    : 'border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {p === 'archive' && '📦 Archive'}
                {p === 'balanced' && '⚖️ Balanced'}
                {p === 'evidence' && '🔍 Evidence'}
              </button>
            ))}
          </div>
          <button
            onClick={handleStart}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-colors"
          >
            Start Compression
          </button>
        </div>
      )}

      {state === 'compressing' && progress && (
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-400">Compressing with {progress.encoder}...</span>
            <span className="text-orange-300 font-medium">{progress.progress_percent}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
            <div
              className="bg-orange-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress.progress_percent}%` }}
            />
          </div>
          <p className="text-slate-500 text-xs">Profile: {profile.charAt(0).toUpperCase() + profile.slice(1)}</p>
        </div>
      )}

      {state === 'compressing' && !progress && (
        <div className="animate-pulse">
          <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
          <div className="h-2 bg-slate-700 rounded w-1/3"></div>
        </div>
      )}

      {state === 'completed' && report && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-green-400 font-semibold">Compression Complete</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-slate-400 block">Original Size</span>
              <span className="text-white font-medium">{formatSize(report.original_size_bytes)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Compressed Size</span>
              <span className="text-white font-medium">{formatSize(report.compressed_size_bytes)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Space Saved</span>
              <span className="text-green-400 font-bold">{report.space_saved_percent}%</span>
            </div>
            <div>
              <span className="text-slate-400 block">Compression Ratio</span>
              <span className="text-white font-medium">{report.compression_ratio}x</span>
            </div>
            <div>
              <span className="text-slate-400 block">Processing Time</span>
              <span className="text-white font-medium">{formatTime(report.processing_time_ms)}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Encoder</span>
              <span className="text-white font-medium">{report.encoder}</span>
            </div>
            {report.quality.ssim != null && (
              <div>
                <span className="text-slate-400 block">SSIM Quality</span>
                <span className="text-white font-medium">{report.quality.ssim}</span>
              </div>
            )}
            {report.quality.psnr != null && (
              <div>
                <span className="text-slate-400 block">PSNR (dB)</span>
                <span className="text-white font-medium">{report.quality.psnr}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {state === 'error' && (
        <div>
          <p className="text-red-400 mb-3">{error}</p>
          <button
            onClick={() => { setState('idle'); setError(''); }}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

export default CompressionPanel;
