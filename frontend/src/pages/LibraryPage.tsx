import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
  };
  s3?: {
    original_s3_key: string;
    compressed_s3_key: string;
    success: boolean;
  };
}

function LibraryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'savings'>('date');
  const [loading, setLoading] = useState(true);

  const fetchVideos = async () => {
    try {
      const res = await fetch('/api/v1/videos');
      if (res.ok) {
        const data = await res.json();
        setVideos(data);
      }
    } catch (e) {
      console.error('Failed to load video library', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleDelete = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this video and purge it from AWS?')) return;
    try {
      const res = await fetch(`/api/v1/videos/${videoId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchVideos();
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const fmtSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const sortedVideos = [...videos]
    .filter(v => {
      const name = v.file_name || v.metadata?.file_name || v.video_id;
      return name.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
      if (sortBy === 'name') {
        const nameA = a.file_name || a.metadata?.file_name || a.video_id;
        const nameB = b.file_name || b.metadata?.file_name || b.video_id;
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'savings') {
        const savingsA = a.compression?.space_saved_percent || 0;
        const savingsB = b.compression?.space_saved_percent || 0;
        return savingsB - savingsA;
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-[#060912] relative overflow-hidden text-slate-100">
      {/* Background gradients */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl pointer-events-none" />

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
          <button onClick={() => navigate('/library')} className="text-violet-400 font-semibold">Video Library</button>
          <button onClick={() => navigate('/upload')} className="text-slate-300 hover:text-white transition-colors">Optimize</button>
          <button onClick={() => navigate('/dashboard')} className="text-slate-300 hover:text-white transition-colors">Analytics</button>
        </div>
      </nav>

      {/* Main Container */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Enterprise Video Library</h1>
            <p className="text-slate-400 text-sm mt-1">Managed CCTV streams loaded dynamically from Amazon DynamoDB.</p>
          </div>
          <button
            onClick={() => navigate('/upload')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-violet-600/25"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Optimize New Feed
          </button>
        </div>

        {/* Filter / Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <div className="relative flex-1">
            <svg className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by video title or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950/40 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:border-violet-500/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-500 font-medium mr-2">Sort By:</span>
            {[
              { key: 'date', label: 'Recent' },
              { key: 'name', label: 'Name' },
              { key: 'savings', label: 'Savings' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSortBy(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 ${
                  sortBy === tab.key
                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                    : 'bg-transparent border-white/5 text-slate-400 hover:border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Library Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin mb-4" />
            <p className="text-slate-400 text-sm">Loading enterprise registry...</p>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.01] border border-dashed border-white/5 rounded-3xl">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">No CCTV Feeds Found</h3>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">No feeds match the search filters or have been registered inside the catalog yet.</p>
            <button onClick={() => navigate('/upload')} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl border border-white/10 transition-colors text-sm">
              Optimize First Feed
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sortedVideos.map(v => {
              const name = v.file_name || v.metadata?.file_name || 'surveillance_feed.mp4';
              const origSize = v.compression?.original_size_bytes || v.file_size_bytes || v.metadata?.file_size_bytes || 0;
              const compSize = v.compression?.compressed_size_bytes || 0;
              const savedPct = v.compression?.space_saved_percent || 0;
              const profile = v.compression?.profile_name || 'Balanced';
              const dateStr = new Date(v.timestamp).toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              const s3Success = v.s3?.success ?? true;

              return (
                <div
                  key={v.video_id}
                  onClick={() => navigate(`/open/${v.video_id}`)}
                  className="group bg-white/[0.02] border border-white/5 hover:border-violet-500/30 rounded-2xl overflow-hidden cursor-pointer hover:-translate-y-1 transition-all duration-300 flex flex-col"
                >
                  {/* Thumbnail / Card Cover */}
                  <div className="aspect-video bg-black/40 relative overflow-hidden flex items-center justify-center border-b border-white/5">
                    <img
                      src={`/api/v1/pipeline/${v.video_id}/thumbnail`}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                    <div className="hidden absolute inset-0 flex items-center justify-center text-slate-500 bg-slate-900/60">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    {/* Savings Badge Overlay */}
                    {savedPct > 0 && (
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-emerald-500/90 text-white font-bold text-xs rounded-lg backdrop-blur-sm shadow-md">
                        -{savedPct.toFixed(0)}% Space
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] text-slate-500 font-mono tracking-wider truncate max-w-[150px]">{v.video_id}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{dateStr}</span>
                      </div>
                      <h3 className="text-white font-bold text-sm tracking-tight truncate group-hover:text-violet-400 transition-colors mb-4">{name}</h3>

                      {/* Storage specs grid */}
                      <div className="grid grid-cols-2 gap-3.5 mb-5 bg-white/[0.01] border border-white/5 rounded-xl p-3 text-xs">
                        <div>
                          <p className="text-slate-500 text-[10px] font-semibold mb-0.5">Original Size</p>
                          <p className="text-slate-300 font-bold">{fmtSize(origSize)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 text-[10px] font-semibold mb-0.5">Compressed Size</p>
                          <p className="text-slate-300 font-bold">{fmtSize(compSize)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-auto">
                      <div className="flex items-center gap-2">
                        {/* AWS Sync Status */}
                        {s3Success ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/15">
                            ☁ S3 Synced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/15">
                            ▲ Local Mode
                          </span>
                        )}
                        <span className="text-[10px] font-medium text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                          {profile}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDelete(v.video_id, e)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 border border-red-500/15 hover:bg-red-500 hover:text-white transition-all"
                          title="Purge Video Assets"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <button className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-lg transition-colors">
                          Open
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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

export default LibraryPage;
