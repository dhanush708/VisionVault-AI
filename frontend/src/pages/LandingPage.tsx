import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<'archive' | 'balanced' | 'evidence'>('balanced');
  const [aiReconstruct, setAiReconstruct] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStartOptimization = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      navigate('/upload', { state: { file, profile } });
    }
  };

  return (
    <div className="relative min-h-screen bg-[#060912] flex flex-col justify-between overflow-hidden text-slate-100 font-sans">
      {/* Ambient gradient blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-white/5">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">VisionVault AI</span>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <button onClick={() => navigate('/library')} className="text-slate-300 hover:text-white transition-colors">Video Library</button>
          <button onClick={() => navigate('/dashboard')} className="text-slate-300 hover:text-white transition-colors">Analytics</button>
          <button onClick={() => navigate('/login')} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors">Sign In</button>
        </div>
      </nav>

      {/* Main Hero & Config Panel */}
      <div className="relative z-10 max-w-xl mx-auto px-6 py-20 text-center flex-1 flex flex-col justify-center">
        {/* Title */}
        <div className="space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            AWS Enterprise Storage Hub
          </div>
          <h1 className="text-5xl font-black text-white leading-none tracking-tight">
            VisionVault AI
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
            Forensically compress security feeds, store them dynamically on Amazon S3, and reconstruct them on-demand via GPU super-resolution.
          </p>
        </div>

        {/* Profile Selector & Optimization Options Card */}
        <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-6 text-left mb-8">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
              Compression Profile
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { key: 'archive', label: 'Maximum Storage', desc: '80%+ savings' },
                { key: 'balanced', label: 'Balanced', desc: '60% savings' },
                { key: 'evidence', label: 'Maximum Quality', desc: '40% savings' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setProfile(p.key as any)}
                  className={`text-left rounded-xl p-3 border transition-all duration-200 ${
                    profile === p.key
                      ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                      : 'bg-transparent border-white/5 text-slate-400 hover:border-white/10'
                  }`}
                >
                  <div className="font-bold text-xs mb-0.5">{p.label}</div>
                  <div className="text-[9px] text-slate-500 leading-tight">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Reconstruction Toggle */}
          <div className="flex items-center justify-between border-t border-white/5 pt-5">
            <div>
              <span className="text-xs font-bold text-slate-300 block">AI Reconstruction Enabled</span>
              <span className="text-[10px] text-slate-500">Enable Real-ESRGAN GPU upscaling for playback</span>
            </div>
            <button
              type="button"
              onClick={() => setAiReconstruct(!aiReconstruct)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                aiReconstruct ? 'bg-violet-600' : 'bg-white/10'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  aiReconstruct ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Start Optimization Action */}
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.avi,.mov,.mkv"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={handleStartOptimization}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-xl shadow-violet-600/25 hover:scale-[1.01]"
          >
            Start Optimization
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-white/5 text-center text-slate-600 text-xs">
        VisionVault AI · Powered by Amazon S3, DynamoDB & Bedrock · AI-DLC 2026
      </footer>
    </div>
  );
}

export default LandingPage;
