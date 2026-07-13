import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { uploadVideo, validateFile } from '../services/uploadService';
import { getPipelineState, PipelineState } from '../services/pipelineService';

type UploadPhase = 'idle' | 'uploading' | 'pipeline' | 'error';

const PIPELINE_STAGES = [
  { key: 'upload', label: 'Upload', icon: '⬆' },
  { key: 'metadata', label: 'Metadata Extraction', icon: '📋' },
  { key: 'analysis', label: 'Vision AI Analysis', icon: '🧠' },
  { key: 'compression', label: 'GPU Compression', icon: '⚡' },
  { key: 'quality', label: 'Quality Verification', icon: '✅' },
  { key: 's3_upload', label: 'Uploading to Amazon S3', icon: '☁' },
  { key: 'dynamodb', label: 'Saving Metadata', icon: '🗄' },
  { key: 'bedrock', label: 'Generating Summary', icon: '✨' },
];

function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateData = location.state as { file: File; profile: string } | null;

  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [profile, setProfile] = useState('balanced');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback(async (file: File, selectedProfile: string = profile) => {
    const err = validateFile(file);
    if (err) { setErrorMessage(err); setPhase('error'); return; }

    setSelectedFile(file);
    setPhase('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    try {
      const result = await uploadVideo(file, selectedProfile, (pct) => setUploadProgress(pct));
      setVideoId(result.video_id);
      setPhase('pipeline');

      // Start polling pipeline state
      const poll = async () => {
        try {
          const s = await getPipelineState(result.video_id);
          setPipelineState(s);
          if (s.status === 'completed' || s.status === 'failed') {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* not ready yet */ }
      };
      poll();
      pollRef.current = setInterval(poll, 1500);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail?.error?.message || 'Upload failed. Please try again.');
      setPhase('error');
    }
  }, [profile]);

  // Handle auto-trigger from LandingPage location state
  useEffect(() => {
    if (stateData?.file) {
      const activeProfile = stateData.profile || 'balanced';
      setProfile(activeProfile);
      handleFile(stateData.file, activeProfile);
    }
  }, [stateData]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const reset = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase('idle'); setUploadProgress(0); setSelectedFile(null);
    setVideoId(null); setPipelineState(null); setErrorMessage('');
  };

  const stages = pipelineState?.stages;
  const isComplete = pipelineState?.status === 'completed';
  const isFailed = pipelineState?.status === 'failed';
  const currentStage = pipelineState?.current_stage || '';

  const fmt = (bytes: number) => {
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div className="min-h-screen bg-[#060912] relative overflow-hidden text-slate-100">
      {/* Ambient background */}
      <div className="absolute top-0 left-1/3 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/3 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-4 border-b border-white/5 bg-slate-950/30 backdrop-blur-md">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-white font-bold text-sm">VisionVault AI</span>
        </button>
        <div className="flex items-center gap-6 text-sm">
          <button onClick={() => navigate('/library')} className="text-slate-300 hover:text-white transition-colors">Video Library</button>
          <button onClick={() => navigate('/upload')} className="text-violet-400 font-semibold">Optimize</button>
          <button onClick={() => navigate('/dashboard')} className="text-slate-300 hover:text-white transition-colors">Analytics</button>
        </div>
      </nav>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">Optimization Pipeline</h1>
          <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-md mx-auto">
            Experience real-time GPU-accelerated video compression and S3 synchronization.
          </p>
        </div>

        {/* ─── Idle: Drop zone ─── */}
        {phase === 'idle' && (
          <div className="space-y-6">
            {/* Profile Selector */}
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">Select Compression Policy</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'balanced', label: 'Balanced Mode', desc: 'Optimal size-to-quality ratio', activeBg: 'bg-violet-500/10 border-violet-500/30 text-violet-300' },
                  { key: 'archive', label: 'Archive Mode', desc: 'Maximum storage saving (80%+)', activeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' },
                  { key: 'evidence', label: 'Evidence Mode', desc: 'Preserve full forensic detail', activeBg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setProfile(p.key); }}
                    className={`text-left rounded-xl p-3 border transition-all duration-200 ${
                      profile === p.key ? p.activeBg : 'bg-transparent border-white/5 text-slate-400 hover:border-white/10'
                    }`}
                  >
                    <div className="font-bold text-xs mb-0.5">{p.label}</div>
                    <div className="text-[9px] text-slate-500 leading-tight">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div
              onDragEnter={handleDrag} onDragLeave={handleDrag}
              onDragOver={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-16 text-center cursor-pointer transition-all duration-200 group ${
                dragActive
                  ? 'border-violet-400 bg-violet-500/10 shadow-xl shadow-violet-500/10'
                  : 'border-white/10 hover:border-violet-500/30 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".mp4,.avi,.mov,.mkv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center transition-colors ${dragActive ? 'bg-violet-500/20' : 'bg-white/5 group-hover:bg-violet-500/10'}`}>
                <svg className={`w-8 h-8 transition-colors ${dragActive ? 'text-violet-400' : 'text-slate-500 group-hover:text-violet-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-lg font-bold text-white mb-1">Drag and Drop CCTV feed</p>
              <p className="text-slate-400 text-xs mb-5">or click to browse local files</p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {['.mp4', '.avi', '.mov', '.mkv'].map(ext => (
                  <span key={ext} className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-400 font-mono">{ext}</span>
                ))}
                <span className="text-slate-600 text-xs ml-2">max 2 GB</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── Uploading ─── */}
        {phase === 'uploading' && selectedFile && (
          <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center flex-shrink-0 border border-violet-500/20">
                <svg className="w-6 h-6 text-violet-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white font-bold truncate text-sm">{selectedFile.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">{fmt(selectedFile.size)}</p>
              </div>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 mb-3 overflow-hidden">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 h-2 rounded-full transition-all duration-300 shadow-lg shadow-violet-500/30" style={{ width: `${uploadProgress}%` }} />
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Uploading binary to platform...</span>
              <span className="text-violet-400">{uploadProgress}%</span>
            </div>
          </div>
        )}

        {/* ─── Pipeline Running ─── */}
        {phase === 'pipeline' && (
          <div className="space-y-6 animate-fade-in">
            {/* Status header card */}
            <div className={`border rounded-3xl p-6 shadow-2xl transition-all duration-500 ${
              isComplete ? 'bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' :
              isFailed ? 'bg-red-500/5 border-red-500/20' :
              'bg-violet-500/5 border-violet-500/20'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {isComplete ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : isFailed ? (
                    <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                      <svg className="w-5 h-5 text-violet-400 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-white font-bold text-sm tracking-tight">
                      {isComplete ? 'Pipeline Completed Successfully ✓' : isFailed ? 'Pipeline Failed' : 'Active Optimization Pipeline'}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Feed ID: {videoId}
                    </p>
                  </div>
                </div>
                {isComplete && (
                  <button
                    onClick={() => navigate(`/dashboard?video_id=${videoId}`)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-600/25"
                  >
                    View Results
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Live Pipeline Steps */}
            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Processing Flow</h3>
              <div className="space-y-3">
                {PIPELINE_STAGES.map((s, idx) => {
                  const status = stages?.[s.key as keyof typeof stages];
                  const isCurrent = currentStage === s.key;
                  
                  return (
                    <div
                      key={s.key}
                      className={`flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 ${
                        status === 'completed' ? 'bg-emerald-500/5 border-emerald-500/10 text-slate-300' :
                        isCurrent ? 'bg-violet-500/10 border-violet-500/30 text-violet-300 shadow-md shadow-violet-500/5' :
                        status === 'failed' ? 'bg-red-500/5 border-red-500/10 text-red-400' :
                        'bg-transparent border-transparent text-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <span className="text-base">{s.icon}</span>
                        <span className="text-xs font-semibold">{s.label}</span>
                      </div>
                      
                      <div className="text-xs font-bold font-mono">
                        {status === 'completed' && <span className="text-emerald-400">Complete</span>}
                        {status === 'failed' && <span className="text-red-400">Failed</span>}
                        {isCurrent && <span className="text-violet-400 animate-pulse">Processing...</span>}
                        {!status && !isCurrent && <span className="text-slate-700">Pending</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Logs Console */}
            {pipelineState?.activity_log && pipelineState.activity_log.length > 0 && (
              <div className="bg-black/45 border border-white/5 rounded-3xl p-5 shadow-inner">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-3 font-mono">Telemetry Console</h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[10px] scrollbar-thin">
                  {[...pipelineState.activity_log].reverse().map((entry, i) => (
                    <div key={i} className="flex gap-3 text-slate-400">
                      <span className="text-slate-600 whitespace-nowrap">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span className="text-slate-500">[{entry.stage.toUpperCase()}]</span>
                      <span className="text-slate-300">{entry.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-4">
              <button
                onClick={reset}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold rounded-xl border border-white/10 transition-all text-xs"
              >
                Upload Another
              </button>
              {videoId && (
                <button
                  onClick={() => navigate(`/dashboard?video_id=${videoId}`)}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all text-xs shadow-lg shadow-violet-600/25"
                >
                  Live Analytics Dashboard
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── Error ─── */}
        {phase === 'error' && (
          <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-red-400">Pipeline Execution Interrupted</h3>
            </div>
            <p className="text-slate-300 mb-6 text-xs leading-relaxed">{errorMessage}</p>
            <button onClick={reset} className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors text-xs">
              Reset Pipeline
            </button>
          </div>
        )}
        {/* Footer */}
        <footer className="relative z-10 py-6 text-center text-slate-600 text-[10px] mt-10 border-t border-white/5">
          VisionVault AI · Built by Dhanush
        </footer>
      </div>
    </div>
  );
}

export default UploadPage;
