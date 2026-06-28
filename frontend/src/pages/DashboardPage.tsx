import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPipelineState, getPipelineResult, PipelineState, PipelineResult } from '../services/pipelineService';
import { startEnhancement, getEnhancementStatus, getDownloadUrl, EnhancementState } from '../services/enhancementService';

// ─── Animated Number Counter ────────────────────────────────────────────────────
function AnimatedNumber({ target, decimals = 0, suffix = '', prefix = '' }: {
  target: number; decimals?: number; suffix?: string; prefix?: string;
}) {
  const [displayed, setDisplayed] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setDisplayed(target * ease);
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return <span>{prefix}{displayed.toFixed(decimals)}{suffix}</span>;
}

// ─── Simple Markdown Renderer ────────────────────────────────────────────────────
function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[][] = [];
  let inTable = false;

  const parseInline = (text: string, key: number): React.ReactNode => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((p, i) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
            : p
        )}
      </span>
    );
  };

  const flushTable = (idx: number) => {
    if (tableBuffer.length < 2) return;
    const headers = tableBuffer[0];
    const rows = tableBuffer.slice(2); // skip separator row
    elements.push(
      <div key={`tbl-${idx}`} className="overflow-x-auto my-4">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/10">
              {headers.map((h, i) => (
                <th key={i} className="text-left py-2 px-3 text-slate-300 font-semibold">{h.trim()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-white/5 hover:bg-white/[0.02]">
                {row.map((cell, ci) => (
                  <td key={ci} className="py-2 px-3 text-slate-300">{parseInline(cell.trim(), ci)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    if (line.startsWith('|')) {
      inTable = true;
      const cells = line.split('|').filter(c => c !== '').map(c => c.trim());
      if (!cells.every(c => /^[-: ]+$/.test(c))) {
        tableBuffer.push(cells);
      } else {
        tableBuffer.push(cells); // separator row
      }
      return;
    }

    if (inTable) flushTable(idx);

    if (line.startsWith('## ')) {
      elements.push(<h2 key={idx} className="text-lg font-bold text-white mt-6 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={idx} className="text-xl font-black text-white mt-4 mb-3">{line.slice(2)}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={idx} className="flex gap-2 my-1">
          <span className="text-violet-400 mt-1">•</span>
          <span className="text-slate-300 text-sm">{parseInline(line.slice(2), idx)}</span>
        </div>
      );
    } else if (line.trim()) {
      elements.push(<p key={idx} className="text-slate-300 text-sm leading-relaxed my-2">{parseInline(line, idx)}</p>);
    }
  });

  if (inTable) flushTable(lines.length);
  return <div>{elements}</div>;
}

// ─── MiniBar (score bar with correct color semantics) ──────────────────────────
function MiniBar({ label, value, invertColor = false }: { label: string; value: number; invertColor?: boolean }) {
  const pct = Math.round(value * 100);
  const color = invertColor
    ? (value > 0.7 ? 'bg-emerald-500' : value > 0.4 ? 'bg-yellow-500' : 'bg-red-500')  // high = good
    : (value > 0.7 ? 'bg-red-500' : value > 0.4 ? 'bg-yellow-500' : 'bg-emerald-500'); // high = bad
  return (
    <div>
      <div className="flex justify-between mb-1 text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium">{pct}%</span>
      </div>
      <div className="w-full bg-white/5 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
function DashboardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoId = searchParams.get('video_id') || '';

  const [state, setState] = useState<PipelineState | null>(null);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [enhancement, setEnhancement] = useState<EnhancementState | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [awsStatus, setAwsStatus] = useState<any>(null);
  const [fleetSize, setFleetSize] = useState(50);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const enhancePollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // ─── Fetch AWS status ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/v1/pipeline/aws/status').then(r => r.json()).then(setAwsStatus).catch(() => {});
  }, []);

  // ─── Pipeline polling ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;
    const poll = async () => {
      try {
        const s = await getPipelineState(videoId);
        setState(s);
        if (s.status === 'completed' || s.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          if (s.status === 'completed') {
            try { setResult(await getPipelineResult(videoId)); } catch {}
          }
        }
      } catch {}
    };
    poll();
    pollRef.current = setInterval(poll, 1500);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [videoId]);

  // ─── Auto-scroll activity log ─────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state?.activity_log?.length]);

  // ─── Enhancement ─────────────────────────────────────────────────────────
  const handleEnhance = async () => {
    setEnhancing(true);
    try {
      const { state: s } = await startEnhancement(videoId);
      setEnhancement(s);
      enhancePollRef.current = setInterval(async () => {
        try {
          const s = await getEnhancementStatus(videoId);
          setEnhancement(s);
          if (s.status === 'completed' || s.status === 'failed') {
            if (enhancePollRef.current) clearInterval(enhancePollRef.current);
            setEnhancing(false);
          }
        } catch {}
      }, 1500);
    } catch (err: any) {
      setEnhancing(false);
    }
  };

  useEffect(() => () => {
    if (enhancePollRef.current) clearInterval(enhancePollRef.current);
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const fmt = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };
  const fmtTime = (ms: number) => ms >= 60000 ? `${(ms / 60000).toFixed(1)} min` : `${(ms / 1000).toFixed(1)} s`;

  const intRatioDays = (ratio: number) => {
    return ratio > 1 ? Math.floor(90 * (ratio - 1)) : 0;
  };

  const getStageTime = (stageKey: string) => {
    const log = state?.activity_log || [];
    const entry = log.find(e => e.stage === stageKey);
    return entry ? new Date(entry.timestamp).toLocaleTimeString() : '';
  };

  const renderTimelineItem = (step: {
    key: string; title: string; icon: string; getDetails: () => string; time: string;
  }) => {
    let status: 'completed' | 'processing' | 'pending' | 'failed' = 'pending';
    if (step.key === 'completed') {
      status = isComplete ? 'completed' : isProcessing ? 'processing' : 'pending';
    } else {
      status = (state?.stages?.[step.key as keyof typeof state.stages] || 'pending') as any;
      if (status === 'pending' && state?.current_stage === step.key) {
        status = 'processing';
      }
    }

    const isDone = status === 'completed';
    const isCurrent = status === 'processing';
    const isFail = status === 'failed';

    return (
      <div key={step.key} className="flex gap-4 items-start relative pl-10 py-1">
        {/* Bullet dot */}
        <div className={`absolute left-2 top-2.5 w-6 h-6 rounded-full flex items-center justify-center border transition-all duration-300 z-10 text-xs font-bold ${
          isDone ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' :
          isCurrent ? 'bg-violet-500/10 border-violet-500 text-violet-400 animate-pulse' :
          isFail ? 'bg-red-500/10 border-red-500 text-red-400' :
          'bg-[#060912] border-white/10 text-slate-500'
        }`}>
          <span>{isDone ? '✓' : isFail ? '✗' : step.icon}</span>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/[0.01] hover:bg-white/[0.02] border border-white/5 rounded-xl p-3 transition-all min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className={`text-xs font-bold ${isDone ? 'text-emerald-400' : isCurrent ? 'text-violet-300' : 'text-slate-300'}`}>
              {step.title}
            </h4>
            {step.time && <span className="text-[10px] text-slate-500 font-mono flex-shrink-0">{step.time}</span>}
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-normal truncate">
            {step.getDetails()}
          </p>
        </div>
      </div>
    );
  };

  const compression = result?.compression || {};
  const meta = result?.metadata || {};
  const analysis = result?.analysis || {};

  const savedBytes = (compression.original_size_bytes || 0) - (compression.compressed_size_bytes || 0);
  const savedGB = savedBytes / 1024 ** 3;
  const monthlySavingPerCam = savedGB * 0.023;
  const annualSavingFleet = monthlySavingPerCam * 12 * fleetSize;

  const isComplete = state?.status === 'completed';
  const isProcessing = state?.status === 'processing';

  if (!videoId) {
    return (
      <div className="min-h-screen bg-[#060912] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-xl mb-2">No Video Selected</h2>
          <p className="text-slate-400 mb-6">Upload a video to see its analytics dashboard</p>
          <button onClick={() => navigate('/upload')} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors">
            Upload Video
          </button>
        </div>
      </div>
    );
  }

  const STAGE_LIST = [
    { key: 'upload', label: 'Upload', icon: '⬆' },
    { key: 'metadata', label: 'Metadata', icon: '📋' },
    { key: 'analysis', label: 'Vision AI', icon: '🧠' },
    { key: 'compression', label: 'H.265', icon: '⚡' },
    { key: 'quality', label: 'Quality', icon: '✅' },
    { key: 's3_upload', label: 'S3', icon: '☁' },
    { key: 'dynamodb', label: 'DynamoDB', icon: '🗄' },
    { key: 'bedrock', label: 'Bedrock', icon: '✨' },
  ];

  return (
    <div className="min-h-screen bg-[#060912] text-white">
      {/* Ambient */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-96 h-96 bg-cyan-600/6 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-[#060912]/80 backdrop-blur-xl border-b border-white/5 px-6 py-3 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-sm">VisionVault AI</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Dashboard</span>
          <span>·</span>
          <span className="font-mono text-violet-400">{videoId.slice(0, 12)}...</span>
          {isProcessing && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
          {isComplete && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/upload')} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all">
            + New Upload
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* AWS Sync & Processing Hub */}
        {state && (
          <div className="mb-8 bg-white/[0.03] border border-white/[0.06] rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            {/* Glow backgrounds */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Column 1: Resource Inventory */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
                  <h3 className="font-extrabold text-base tracking-wide text-white">AWS Resource Inventory</h3>
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'AWS Region', value: awsStatus?.region || 'us-east-1', icon: '🌍' },
                    { label: 'S3 Target Bucket', value: awsStatus?.services?.s3?.bucket || 'visionvault-ai-dhanush', icon: '🪣' },
                    { label: 'DynamoDB Table', value: awsStatus?.services?.dynamodb?.table || 'visionvault-videos', icon: '🗄️' },
                    { label: 'Bedrock Engine', value: awsStatus?.services?.bedrock?.model?.split('/')[1] || 'Claude 3 Sonnet', icon: '🧠' },
                    { label: 'GPU Accelerator', value: awsStatus?.gpu || 'RTX 4060 (NVENC)', icon: '⚡' },
                  ].map(r => (
                    <div key={r.label} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{r.icon}</span>
                        <span className="text-slate-400 text-xs font-semibold">{r.label}</span>
                      </div>
                      <span className="text-slate-200 text-xs font-mono font-medium truncate max-w-[50%]">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column 2 & 3: Vertical Activity Timeline */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <h3 className="font-extrabold text-base tracking-wide text-white">AWS Pipeline Activity Timeline</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                    isComplete ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    state.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {isComplete ? 'ALL SYNCED' : state.status === 'failed' ? 'SYNC ERROR' : 'SYNCING TO CLOUD'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Timeline steps left */}
                  <div className="space-y-3 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                    {[
                      {
                        key: 'upload',
                        title: '1. Video Upload',
                        icon: '⬆️',
                        getDetails: () => `File: ${meta.file_name || 'surveillance_feed.mp4'} (${fmt(compression.original_size_bytes || 0)})`,
                        time: getStageTime('upload') || (state.started_at ? new Date(state.started_at).toLocaleTimeString() : '')
                      },
                      {
                        key: 'compression',
                        title: '2. H.265 Compression',
                        icon: '⚡',
                        getDetails: () => `Time: ${fmtTime(compression.processing_time_ms || 0)} · Saved: ${compression.space_saved_percent || 0}%`,
                        time: getStageTime('compression')
                      },
                      {
                        key: 's3_upload',
                        title: '3. Amazon S3 Upload',
                        icon: '☁️',
                        getDetails: () => {
                          const isLocal = awsStatus?.services?.s3?.status !== 'connected';
                          const loc = isLocal ? 'Local: storage/compressed/' : `S3 Bucket: ${awsStatus?.services?.s3?.bucket || 'visionvault-ai-dhanush'}`;
                          return `Keys: ...${result?.s3?.compressed_s3_key?.slice(-15) || videoId.slice(0, 8) + '.mp4'} (${loc})`;
                        },
                        time: getStageTime('s3_upload')
                      }
                    ].map(step => renderTimelineItem(step))}
                  </div>

                  {/* Timeline steps right */}
                  <div className="space-y-3 relative before:absolute before:left-5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                    {[
                      {
                        key: 'dynamodb',
                        title: '4. DynamoDB Write',
                        icon: '🗄️',
                        getDetails: () => {
                          const isLocal = awsStatus?.services?.dynamodb?.status !== 'connected';
                          const persist = isLocal ? 'Local fallback database' : 'Amazon DynamoDB';
                          return `Record: ${videoId.slice(0, 12)}... (${persist})`;
                        },
                        time: getStageTime('dynamodb')
                      },
                      {
                        key: 'bedrock',
                        title: '5. Bedrock Summary',
                        icon: '✨',
                        getDetails: () => `Source: ${result?.summary_source || 'Local fallback template'}`,
                        time: getStageTime('bedrock')
                      },
                      {
                        key: 'completed',
                        title: '6. Dashboard Sync',
                        icon: '📊',
                        getDetails: () => isComplete ? 'All data aggregated & rendered successfully' : 'Awaiting upstream processing stages',
                        time: state?.completed_at ? new Date(state.completed_at).toLocaleTimeString() : ''
                      }
                    ].map(step => renderTimelineItem(step))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Left column (2/3) ─────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* KPI cards */}
            {isComplete && compression.original_size_bytes && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: 'Space Saved',
                    value: compression.space_saved_percent || 0,
                    display: <AnimatedNumber target={compression.space_saved_percent || 0} decimals={1} suffix="%" />,
                    color: 'from-emerald-500/10 to-teal-500/5 border-emerald-500/25',
                    textColor: 'text-emerald-400',
                    icon: '💾',
                  },
                  {
                    label: 'Compression Ratio',
                    value: compression.compression_ratio || 1,
                    display: <AnimatedNumber target={compression.compression_ratio || 1} decimals={1} suffix="×" />,
                    color: 'from-violet-500/10 to-purple-500/5 border-violet-500/25',
                    textColor: 'text-violet-400',
                    icon: '⚡',
                  },
                  {
                    label: 'SSIM Quality',
                    value: compression.quality?.ssim || 0,
                    display: compression.quality?.ssim
                      ? <AnimatedNumber target={compression.quality.ssim} decimals={4} />
                      : <span>—</span>,
                    color: 'from-cyan-500/10 to-sky-500/5 border-cyan-500/25',
                    textColor: 'text-cyan-400',
                    icon: '🎯',
                  },
                  {
                    label: 'Original Size',
                    value: 0,
                    display: <span>{fmt(compression.original_size_bytes)}</span>,
                    color: 'from-slate-500/10 to-slate-600/5 border-slate-500/20',
                    textColor: 'text-slate-300',
                    icon: '📁',
                  },
                  {
                    label: 'Compressed Size',
                    value: 0,
                    display: <span>{fmt(compression.compressed_size_bytes)}</span>,
                    color: 'from-orange-500/10 to-amber-500/5 border-orange-500/20',
                    textColor: 'text-orange-300',
                    icon: '📦',
                  },
                  {
                    label: 'PSNR',
                    value: 0,
                    display: compression.quality?.psnr
                      ? <><AnimatedNumber target={compression.quality.psnr} decimals={1} /> <span className="text-base font-normal">dB</span></>
                      : <span>—</span>,
                    color: 'from-pink-500/10 to-rose-500/5 border-pink-500/20',
                    textColor: 'text-pink-300',
                    icon: '📊',
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} border rounded-2xl p-5`}>
                    <div className="text-xl mb-2">{kpi.icon}</div>
                    <div className={`text-2xl font-black ${kpi.textColor} mb-1`}>{kpi.display}</div>
                    <div className="text-xs text-slate-400">{kpi.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Compression detail */}
            {isComplete && compression.profile && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white">Compression Report</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {compression.profile_name}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                      {compression.encoder}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mb-5">
                  {[
                    ['Profile', compression.profile_name],
                    ['Encoder', compression.encoder],
                    ['Processing Time', fmtTime(compression.processing_time_ms || 0)],
                    ['Bytes Saved', fmt(savedBytes)],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white/[0.02] rounded-xl p-3">
                      <div className="text-slate-500 text-xs mb-1">{k}</div>
                      <div className="text-slate-200 font-medium">{v}</div>
                    </div>
                  ))}
                </div>

                {/* Download buttons */}
                <div className="flex gap-3">
                  <a
                    href={getDownloadUrl(videoId, 'compressed')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Compressed
                  </a>
                  <a
                    href={getDownloadUrl(videoId, 'original')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold rounded-xl border border-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Original
                  </a>
                  {enhancement?.status === 'completed' && (
                    <a
                      href={getDownloadUrl(videoId, 'enhanced')}
                      className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3l14 9-14 9V3z" />
                      </svg>
                      Enhanced
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* AI Enhancement Panel */}
            {isComplete && (
              <div className={`border rounded-2xl p-6 transition-all ${
                enhancement?.status === 'completed'
                  ? 'bg-emerald-500/5 border-emerald-500/25'
                  : enhancement?.status === 'processing'
                  ? 'bg-violet-500/5 border-violet-500/20'
                  : 'bg-white/[0.03] border-white/[0.06]'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-violet-500/20 to-purple-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">AI Enhancement — Forensic Reconstruction</h3>
                    <p className="text-xs text-slate-400">Real-ESRGAN RRDBNet · RTX 4060 CUDA</p>
                  </div>
                </div>

                {!enhancement && (
                  <div className="space-y-3">
                    <p className="text-slate-400 text-sm">
                      Recover forensic detail from compressed footage using GPU super-resolution.
                      Restores shadows, edges, and fine-grain detail for investigation-grade playback.
                    </p>
                    <div className="flex gap-2 text-xs">
                      {['Output Resolution', 'Shadow Restoration', 'CUDA Accelerated', 'H.265 Output'].map(tag => (
                        <span key={tag} className="px-2.5 py-1 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-lg">{tag}</span>
                      ))}
                    </div>
                    <button
                      onClick={handleEnhance}
                      disabled={enhancing}
                      className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      Enhance with AI
                    </button>
                  </div>
                )}

                {enhancement?.status === 'processing' && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-violet-300 font-medium">{enhancement.stage}</span>
                      <span className="text-violet-400 font-bold">{enhancement.progress_percent}%</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2.5 mb-4 overflow-hidden">
                      <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700 shadow-lg shadow-violet-500/30"
                        style={{ width: `${enhancement.progress_percent}%` }}
                      />
                    </div>

                    {/* Live AI Processing Timeline */}
                    <div className="mb-4">
                      <div className="text-[10px] font-bold text-violet-400 uppercase tracking-widest mb-3">Live AI Processing Timeline</div>
                      <div className="relative flex justify-between items-center w-full px-2">
                        {/* Line behind steps */}
                        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0" />
                        <div 
                          className="absolute top-1/2 left-0 h-0.5 bg-gradient-to-r from-violet-500 to-purple-500 -translate-y-1/2 z-0 transition-all duration-500" 
                          style={{ width: `${enhancement.progress_percent}%` }}
                        />
                        
                        {[
                          { id: 1, name: 'Init', minPct: 0, label: 'CUDA Initialization' },
                          { id: 2, name: 'Decode', minPct: 15, label: 'NVDEC Decoding' },
                          { id: 3, name: 'Upscale', minPct: 35, label: 'Super-Res Upscaling' },
                          { id: 4, name: 'Color', minPct: 70, label: 'Color Correction' },
                          { id: 5, name: 'Encode', minPct: 90, label: 'H.265 NVENC' },
                        ].map((step, idx, arr) => {
                          const isCompleted = enhancement.progress_percent > step.minPct;
                          const isActive = enhancement.progress_percent >= step.minPct && (idx === arr.length - 1 || enhancement.progress_percent < arr[idx + 1].minPct);
                          return (
                            <div key={step.id} className="flex flex-col items-center z-10 relative group">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[9px] font-bold transition-all duration-300 ${
                                isCompleted 
                                  ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-500/20' 
                                  : isActive 
                                  ? 'bg-[#0d0915] border-purple-500 text-purple-300 animate-pulse ring-2 ring-purple-500/20' 
                                  : 'bg-slate-900 border-white/10 text-slate-500'
                              }`}>
                                {isCompleted ? '✓' : step.id}
                              </div>
                              <span className={`text-[8px] font-black uppercase mt-1.5 tracking-wider transition-colors ${
                                isActive ? 'text-purple-400 font-extrabold' : isCompleted ? 'text-slate-300' : 'text-slate-600'
                              }`}>
                                {step.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detailed Processing Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">GPU Core Load</div>
                        <div className="font-bold text-slate-300 tabular-nums">
                          {enhancement.gpu_utilization_percent ?? 45}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">VRAM Usage</div>
                        <div className="font-bold text-slate-300 tabular-nums">
                          {enhancement.vram_used_mb ?? 1280} / {enhancement.vram_total_mb ?? 8192} MB
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Frames Processed</div>
                        <div className="font-bold text-slate-300 tabular-nums">
                          {enhancement.frames_enhanced ?? 0} / {enhancement.total_frames ?? '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Model Used</div>
                        <div className="font-bold text-slate-300 truncate max-w-[120px]" title={enhancement.model}>
                          Real-ESRGAN
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">ETA Remaining</div>
                        <div className="font-bold text-violet-400 tabular-nums">
                          {enhancement.eta_seconds ? `${enhancement.eta_seconds}s` : 'Analyzing...'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Output Resolution</div>
                        <div className="font-bold text-slate-300">
                          {enhancement.output_resolution || '3840x2160'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {enhancement?.status === 'completed' && (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-emerald-400 font-bold text-sm">Enhancement Complete</p>
                        <p className="text-xs text-slate-400">{enhancement.enhancement_label}</p>
                      </div>
                    </div>

                    {/* Detailed Completed Metrics Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-xs mb-4">
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">GPU Device</div>
                        <div className="font-bold text-slate-300 truncate max-w-[110px]" title={enhancement.gpu_name || enhancement.gpu}>
                          {(enhancement.gpu_name || enhancement.gpu || '').replace('Laptop GPU', '').trim()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">AI Model</div>
                        <div className="font-bold text-slate-300">Real-ESRGAN</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5 font-bold text-emerald-300">Output Resolution</div>
                        <div className="font-black text-emerald-400">{enhancement.output_resolution || '3840x2160'}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Time Elapsed</div>
                        <div className="font-bold text-slate-300">
                          {enhancement.processing_time_ms ? `${(enhancement.processing_time_ms / 1000).toFixed(1)}s` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Enhanced Size</div>
                        <div className="font-bold text-slate-300">
                          {enhancement.enhanced_size_bytes !== undefined ? fmt(enhancement.enhanced_size_bytes) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-500 mb-0.5">Avg Speed</div>
                        <div className="font-bold text-slate-300">
                          {enhancement.processing_time_ms && enhancement.total_frames
                            ? `${(enhancement.total_frames / (enhancement.processing_time_ms / 1000)).toFixed(1)} FPS`
                            : '—'}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/playback?video_id=${videoId}`)}
                        className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Launch Comparison Playback
                      </button>
                    </div>
                  </div>
                )}

                {enhancement?.status === 'failed' && (
                  <p className="text-red-400 text-sm">{enhancement.stage}</p>
                )}
              </div>
            )}

            {/* Business Impact & Fleet ROI */}
            {isComplete && savedBytes > 0 && (
              <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base tracking-wide text-white">Business Impact & S3 Economics</h3>
                    <p className="text-xs text-slate-400">AWS Cloud Savings & Retention Analysis · S3 Standard ($0.023/GB/mo)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Storage Saved', value: `${compression.space_saved_percent?.toFixed(1)}%`, desc: `Saved ${fmt(savedBytes)}`, color: 'text-emerald-400' },
                    { label: 'Monthly S3 Savings', value: `$${monthlySavingPerCam.toFixed(4)}`, desc: 'Per Camera', color: 'text-slate-300' },
                    { label: 'Annual S3 Savings', value: `$${(monthlySavingPerCam * 12).toFixed(2)}`, desc: 'Per Camera', color: 'text-slate-300' },
                    { label: 'Retention Increase', value: `+${intRatioDays(compression.compression_ratio || 1)} Days`, desc: 'At same footprint', color: 'text-cyan-400' },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 text-center">
                      <div className={`text-xl font-black ${kpi.color} mb-1`}>{kpi.value}</div>
                      <div className="text-[10px] text-slate-300 font-bold mb-0.5">{kpi.label}</div>
                      <div className="text-[10px] text-slate-500">{kpi.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Fleet Scaling comparison */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-slate-200 tracking-wider mb-4">Estimated Fleet-Wide Savings (Annual)</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {[100, 500, 1000].map(cams => {
                      const fleetAnnual = monthlySavingPerCam * 12 * cams;
                      return (
                        <div key={cams} className="bg-[#0b101c]/40 border border-white/5 rounded-xl p-4 text-center hover:scale-[1.02] transition-all duration-200">
                          <div className="text-emerald-400 text-lg font-black mb-1">
                            ${fleetAnnual.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="text-xs text-slate-300 font-bold mb-0.5">{cams} Cameras</div>
                          <div className="text-[10px] text-slate-500">Annual recurring savings</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Bedrock AI Summary */}
            {result?.bedrock_summary && (
              <div className="bg-gradient-to-br from-pink-500/5 to-violet-500/5 border border-pink-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-white">Amazon Bedrock AI — Executive Summary</h3>
                    <p className="text-xs text-slate-400">Generated by Claude 3 Sonnet · Powered by AWS Bedrock</p>
                  </div>
                </div>
                <div className="prose-sm">
                  <MarkdownRenderer content={result.bedrock_summary} />
                </div>
              </div>
            )}
          </div>

          {/* ─── Right column (1/3) ──────────────────────────────────────── */}
          <div className="space-y-5">
            {/* AWS Status */}
            {awsStatus && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <h3 className="font-bold text-sm text-white">AWS Services</h3>
                  {awsStatus.gpu && <span className="ml-auto text-xs text-slate-500 truncate">{awsStatus.gpu}</span>}
                </div>
                <div className="space-y-2.5">
                  {Object.entries(awsStatus.services || {}).map(([svc, info]: [string, any]) => {
                    const connected = info.status === 'connected';
                    const labels: Record<string, string> = {
                      s3: 'Amazon S3', dynamodb: 'DynamoDB', bedrock: 'Bedrock', cognito: 'Cognito',
                    };
                    return (
                      <div key={svc} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-200">{labels[svc] || svc}</div>
                          <div className="text-xs text-slate-500 truncate">{info.bucket || info.table || info.model || info.pool || ''}</div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                          connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>{info.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thumbnail + Video Info */}
            {state && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-bold text-sm text-white mb-3">Video</h3>
                <div className="mb-4 rounded-xl overflow-hidden bg-black/30 aspect-video flex items-center justify-center">
                  <img
                    src={`/api/v1/pipeline/${videoId}/thumbnail`}
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden text-slate-600 text-xs">Thumbnail processing...</div>
                </div>
                {meta.file_name && (
                  <div className="space-y-2 text-xs">
                    {[
                      ['File', meta.file_name],
                      ['Resolution', meta.resolution],
                      ['FPS', meta.fps],
                      ['Codec', (meta.codec || '').toUpperCase()],
                      ['Duration', meta.duration_seconds ? `${meta.duration_seconds?.toFixed(1)}s` : '—'],
                      ['Bitrate', meta.bitrate_kbps ? `${meta.bitrate_kbps} kbps` : '—'],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k as string} className="flex justify-between py-1 border-b border-white/5 last:border-0">
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-200 font-medium truncate max-w-[60%] text-right">{v as string}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Vision Intelligence */}
            {analysis?.scores && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-bold text-sm text-white">Vision Intelligence</h3>
                  {analysis.recommended_profile && (
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-md font-semibold ${
                      analysis.recommended_profile?.includes('archive') ? 'bg-emerald-500/10 text-emerald-400' :
                      analysis.recommended_profile?.includes('evidence') ? 'bg-red-500/10 text-red-400' :
                      'bg-yellow-500/10 text-yellow-400'
                    }`}>
                      {analysis.recommended_profile?.replace('_', ' ').toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-3 mb-4">
                  <MiniBar label="Motion" value={analysis.scores.motion || 0} />
                  <MiniBar label="Brightness" value={analysis.scores.brightness || 0} />
                  <MiniBar label="Noise" value={analysis.scores.noise || 0} />
                  <MiniBar label="Sharpness" value={analysis.scores.sharpness || 0} invertColor />
                  <MiniBar label="Edge Density" value={analysis.scores.edge_density || 0} />
                  <MiniBar label="Scene Complexity" value={analysis.scores.scene_complexity || 0} />
                  <MiniBar label="Compression Potential" value={analysis.compression_potential || 0} invertColor />
                </div>
                {analysis.reasoning && (
                  <p className="text-xs text-slate-400 leading-relaxed border-t border-white/5 pt-3">
                    {analysis.reasoning}
                  </p>
                )}
              </div>
            )}

            {/* Activity Log */}
            {state?.activity_log && state.activity_log.length > 0 && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                <h3 className="font-bold text-sm text-white mb-3">Live Activity Log</h3>
                <div className="space-y-1 max-h-64 overflow-y-auto text-xs font-mono">
                  {state.activity_log.map((entry, i) => (
                    <div key={i} className="flex gap-2 py-0.5">
                      <span className="text-slate-600 whitespace-nowrap">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      <span className={`${
                        entry.message.toLowerCase().includes('fail') || entry.message.toLowerCase().includes('error')
                          ? 'text-red-400' : 'text-slate-300'
                      }`}>{entry.message}</span>
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </div>
              </div>
            )}

            {/* Processing placeholder */}
            {isProcessing && !state?.activity_log?.length && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-8 text-center">
                <svg className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-slate-400 text-sm">Pipeline initializing...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
