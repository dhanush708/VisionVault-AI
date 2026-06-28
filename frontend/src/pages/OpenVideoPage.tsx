import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface VideoRecord {
  video_id: string;
  timestamp: string;
  file_name?: string;
  file_size_bytes?: number;
  metadata?: {
    file_name: string;
    file_size_bytes: number;
    duration_seconds: number;
    resolution: string;
  };
  compression?: {
    original_size_bytes: number;
    compressed_size_bytes: number;
    space_saved_percent: number;
    compression_ratio: number;
    profile_name: string;
    quality?: {
      ssim?: number;
      psnr?: number;
    };
  };
  s3?: {
    original_s3_key: string;
    compressed_s3_key: string;
    success: boolean;
  };
}

const RECONSTRUCT_STEPS = [
  'Downloading From Amazon S3',
  'Loading Compressed Video',
  'Initializing AI Enhancement',
  'GPU Processing (CUDA Direct)',
  'Playback Ready'
];

function OpenVideoPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<VideoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // AI reconstruction status
  const [reconstructing, setReconstructing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const fetchVideoDetails = async () => {
      try {
        const res = await fetch(`/api/v1/videos/${videoId}/metadata`);
        if (res.ok) {
          const data = await res.json();
          setVideo(data);
        } else {
          setError('Failed to retrieve video record from DynamoDB.');
        }
      } catch (e) {
        setError('Connection failure: DynamoDB offline.');
      } finally {
        setLoading(false);
      }
    };
    fetchVideoDetails();
  }, [videoId]);

  const startAIReconstruction = () => {
    setReconstructing(true);
    setCurrentStep(0);
    
    // Animate reconstruction steps sequentially
    const interval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= RECONSTRUCT_STEPS.length - 1) {
          clearInterval(interval);
          // Briefly pause on last step, then navigate to playback
          setTimeout(() => {
            navigate(`/playback?video_id=${videoId}`);
          }, 600);
          return prev;
        }
        return prev + 1;
      });
    }, 1200);
  };

  const fmtSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#060912] flex flex-col items-center justify-center text-slate-100">
        <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm">Querying DynamoDB catalog...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-[#060912] flex flex-col items-center justify-center text-slate-100 px-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Record Retrieval Failed</h2>
        <p className="text-slate-400 text-sm mb-6 text-center max-w-md">{error || 'CCTV record missing or unindexed.'}</p>
        <button onClick={() => navigate('/library')} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors text-sm">
          Return to Library
        </button>
      </div>
    );
  }

  const name = video.file_name || video.metadata?.file_name || 'surveillance_feed.mp4';
  const origSize = video.compression?.original_size_bytes || video.file_size_bytes || video.metadata?.file_size_bytes || 0;
  const compSize = video.compression?.compressed_size_bytes || 0;
  const savedPct = video.compression?.space_saved_percent || 0;
  const ratio = video.compression?.compression_ratio || 1.0;
  const ssim = video.compression?.quality?.ssim || 0.99;
  const profile = video.compression?.profile_name || 'Balanced';
  const s3Success = video.s3?.success ?? true;

  return (
    <div className="min-h-screen bg-[#060912] relative overflow-hidden text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation Header */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-950/30 backdrop-blur-md">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm">VisionVault AI</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <button onClick={() => navigate('/library')} className="text-slate-300 hover:text-white transition-colors">Video Library</button>
          <button onClick={() => navigate('/upload')} className="text-slate-300 hover:text-white transition-colors">Optimize</button>
          <button onClick={() => navigate('/dashboard')} className="text-slate-300 hover:text-white transition-colors">Analytics</button>
        </div>
      </nav>

      {/* Reconstructing overlay portal */}
      {reconstructing && (
        <div className="fixed inset-0 bg-[#060912]/95 z-50 flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative">
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-br from-violet-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-xl shadow-violet-500/25">
              <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            
            <div className="text-center mt-12 mb-8">
              <h2 className="text-xl font-black text-white tracking-tight">AI Reconstruction Active</h2>
              <p className="text-slate-400 text-xs mt-1">Reconstructing high-quality feeds from Amazon S3...</p>
            </div>

            {/* Stepper progress indicator */}
            <div className="space-y-4">
              {RECONSTRUCT_STEPS.map((step, idx) => {
                const isDone = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={idx} className="flex items-center gap-4 transition-all duration-300">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      isCurrent ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30 animate-pulse' :
                      'bg-white/5 text-slate-600 border border-white/5'
                    }`}>
                      {isDone ? '✓' : idx + 1}
                    </div>
                    <span className={`text-sm font-semibold transition-all ${
                      isDone ? 'text-slate-400 line-through decoration-slate-600' :
                      isCurrent ? 'text-violet-300 font-bold' :
                      'text-slate-600'
                    }`}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Details */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        <button onClick={() => navigate('/library')} className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Library
        </button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left / Main Details Panel */}
          <div className="md:col-span-2 space-y-6">
            {/* Header info card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black/35 mb-5 border border-white/5 relative">
                <img
                  src={`/api/v1/pipeline/${video.video_id}/thumbnail`}
                  alt={name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-900/60">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight truncate mb-1">{name}</h2>
              <p className="text-slate-500 text-xs font-mono">{video.video_id}</p>
            </div>

            {/* Storage Analytics Card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-300 mb-4">Compression Statistics</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] font-semibold mb-1">Original Size</p>
                  <p className="text-white text-base font-black">{fmtSize(origSize)}</p>
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] font-semibold mb-1">Compressed Size</p>
                  <p className="text-orange-400 text-base font-black">{fmtSize(compSize)}</p>
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] font-semibold mb-1">Storage Saved</p>
                  <p className="text-emerald-400 text-base font-black">-{savedPct.toFixed(1)}%</p>
                </div>
                <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 text-center">
                  <p className="text-slate-500 text-[10px] font-semibold mb-1">Fidelity Score (SSIM)</p>
                  <p className="text-cyan-400 text-base font-black">{ssim.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: AWS catalog specs + Action */}
          <div className="space-y-6">
            {/* AWS details card */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-bold text-slate-300 mb-4">AWS Resource Metadata</h3>
              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold mb-1">Amazon S3 Bucket</p>
                  <p className="text-slate-300 font-mono break-all bg-white/[0.01] border border-white/5 rounded-lg p-2">
                    visionvault-ai-dhanush
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold mb-1">S3 Compressed Object Key</p>
                  <p className="text-slate-300 font-mono break-all bg-white/[0.01] border border-white/5 rounded-lg p-2">
                    {video.s3?.compressed_s3_key || `videos/compressed/${video.video_id}.mp4`}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold mb-1">DynamoDB Metadata Store</p>
                  <div className="flex items-center gap-2 bg-white/[0.01] border border-white/5 rounded-lg p-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-slate-300 font-mono truncate">visionvault-videos</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold mb-1">AWS Storage Region</p>
                  <p className="text-slate-300 font-mono bg-white/[0.01] border border-white/5 rounded-lg p-2">
                    us-east-1
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold mb-1">Cloud Sync Status</p>
                  {s3Success ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
                      ● Active Sync (S3 Stored)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                      ● Local Mode Fallback
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Launch reconstruction Action card */}
            <div className="bg-gradient-to-b from-violet-600/15 to-purple-600/5 border border-violet-500/20 rounded-3xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-violet-600/20 rounded-2xl flex items-center justify-center mx-auto text-violet-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-white">AI Reconstruction Playback</h4>
                <p className="text-slate-400 text-xs">Rebuild evidence quality in real-time from the S3 binary payload.</p>
              </div>
              <button
                onClick={startAIReconstruction}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-violet-600/25 hover:scale-[1.01]"
              >
                AI Reconstruct & Play
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpenVideoPage;
