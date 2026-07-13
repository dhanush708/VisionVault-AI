import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = () => {
    setLoading(true);
    // Simulate brief auth check for UX realism
    setTimeout(() => navigate('/upload'), 800);
  };

  return (
    <div className="min-h-screen bg-[#060912] flex items-center justify-center relative overflow-hidden">
      {/* Gradient blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl mb-5 shadow-2xl shadow-violet-600/30 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white mb-1">VisionVault AI</h1>
          <p className="text-slate-400 text-sm">Enterprise CCTV Storage Optimization</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">Sign In</h2>
          <p className="text-slate-400 text-sm mb-8">Access your organization's VisionVault instance</p>

          {/* Demo login */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/25 disabled:opacity-70 mb-4"
          >
            {loading ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            {loading ? 'Authenticating...' : 'Demo Login — Enter Platform'}
          </button>

          <div className="relative flex items-center my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="px-3 text-slate-500 text-xs">or sign in with SSO</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Cognito SSO button */}
          <button
            disabled
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 border border-white/10 text-slate-400 font-semibold rounded-xl cursor-not-allowed opacity-60"
          >
            <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
            Sign in with AWS Cognito
            <span className="ml-auto px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">Coming Soon</span>
          </button>

          {/* AWS services badges */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <p className="text-slate-500 text-xs text-center mb-3">Secured by AWS</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {['Cognito', 'IAM', 'KMS', 'CloudTrail'].map(svc => (
                <span key={svc} className="px-3 py-1 rounded-lg bg-cyan-500/5 border border-cyan-500/15 text-cyan-400/70 text-xs font-medium">
                  {svc}
                </span>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          Created by Dhanush Anbu · AI-DLC Hackathon 2026 · VisionVault AI Platform
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
