import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getSession, uploadFiles, startAnalysis, associateFilesWithSession, deleteSession } from '../../lib/api.js';
import { FileUploadZone } from '../../components/FileUploadZone.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog.js';
import { RefreshCw, Zap } from 'lucide-react';

export function HRRoleDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [copied, setCopied] = useState(false);

  const fetchSession = async () => {
    if (!id) return;
    try {
      const data = await getSession(id);
      setSession(data);
      if (data?.status === 'analyzing') {
        setAnalyzing(true);
      } else {
        setAnalyzing(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (analyzing) {
      interval = setInterval(() => {
        fetchSession();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [analyzing]);

  const handleUpload = async () => {
    if (!id || resumeFiles.length === 0) return;
    try {
      setUploading(true);
      const res = await uploadFiles(id, resumeFiles);
      if (res && res.files) {
        await associateFilesWithSession(id, res.files);
      }
      setResumeFiles([]);
      setIsUploadOpen(false);
      await fetchSession();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!id) return;
    try {
      setAnalyzing(true);
      await startAnalysis(id);
      await fetchSession();
    } catch (err) {
      console.error(err);
      setAnalyzing(false);
    }
  };

  const handleShareLink = () => {
    const link = `${window.location.origin}/hr/role/${id}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy link', err);
    });
  };

  if (loading) return <div className="p-8 text-on-surface-variant">Loading role details...</div>;
  if (!session) return <div className="p-8 text-on-surface-variant">Role not found.</div>;

  const jp = session.job_profile || {};
  const analysisError = session.analysis_results?.error || null;
  const candidates = Array.isArray(session.analysis_results?.candidates)
    ? session.analysis_results.candidates
    : Array.isArray(session.analysis_results)
      ? session.analysis_results
      : [];
  const filesCount = (session.uploaded_files || []).length;
  
  // Stats
  const avgScore = candidates.length ? Math.round(candidates.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / candidates.length * 10) : 0;
  const technicalCleared = candidates.filter((c: any) => c.score >= 7.0).length;
  const criticalGaps = candidates.filter((c: any) => !c.meetsMandatoryCriteria).length;

  const handleDeleteRole = async () => {
    if (!confirm(`Delete "${jp.name || 'Untitled Role'}"? All candidates and analysis for this role will be permanently removed.`)) return;
    try {
      await deleteSession(id!);
      navigate('/hr');
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4 shrink-0 text-xs">
        <Link to="/hr" className="text-on-surface-variant hover:text-primary transition-colors flex items-center">
          <span className="material-symbols-outlined text-[14px] mr-1">arrow_back</span>
          Active Roles
        </Link>
        <span className="text-on-surface-variant">/</span>
        <span className="text-on-surface-variant font-medium">{jp.name || 'Untitled Role'}</span>
        <button
          onClick={handleDeleteRole}
          className="ml-auto text-on-surface-variant hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[10px] font-medium"
          title="Delete this role"
        >
          <span className="material-symbols-outlined text-[14px]">delete</span>
          Delete Role
        </button>
      </div>

      {session.status === 'error' && analysisError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
          <div>
            <p className="text-sm font-semibold text-red-400">Analysis Failed</p>
            <p className="text-xs text-red-300/80 mt-1">{analysisError}</p>
            <button
              onClick={() => startAnalysis(id!)}
              className="mt-2 text-xs font-semibold text-red-400 hover:text-red-300 underline cursor-pointer"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      )}

      {/* Glassmorphic Header Card */}
      <div className="bg-surface-container/40 backdrop-blur-sm border border-outline-variant rounded-xl p-5 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative overflow-hidden">
        {/* Subtle glow segment */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight leading-tight">{jp.name || 'Untitled Role'}</h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Active
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-xs text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">apartment</span>
              {jp.department || "General Dept"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">location_on</span>
              {jp.location || "Remote (US)"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">calendar_today</span>
              Created Today
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => navigate(`/hr/role/${id}/setup`)}
            className="border border-outline-variant hover:bg-surface-container-high text-on-surface px-4 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Edit Details
          </button>
          
          {(candidates.length > 0 || filesCount > 0) && (
            <>
              <button 
                onClick={() => setIsUploadOpen(true)} 
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-highest/60 hover:bg-outline-variant text-on-surface font-semibold text-xs rounded border border-outline-variant transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">upload</span>
                Upload Resumes
              </button>
              <button 
                onClick={handleAnalyze}
                disabled={analyzing || filesCount === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary font-semibold text-xs rounded hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(167,139,250,0.15)]"
              >
                {analyzing ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Analyzing...</>
                ) : (
                  <><Zap className="w-3.5 h-3.5" /> Run AI Analysis</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {candidates.length === 0 ? (
        /* Stunning Empty State: "Awaiting Your First Candidates" */
        <div className="border-2 border-dashed border-outline-variant rounded-2xl flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[400px] bg-surface-container/20 relative overflow-hidden">
          {/* Subtle central glow */}
          <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>

          {/* Glowing Animated Circular Progress with Center Brain/Psychology Icon */}
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center z-10">
            <div className="absolute inset-0 rounded-full border-[3px] border-primary/10"></div>
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary animate-spin-slow"></div>
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-primary shadow-[0_0_20px_rgba(167,139,250,0.15)]">
              <span className="material-symbols-outlined text-2xl animate-pulse-slow">psychology</span>
            </div>
          </div>

          {/* Heading & Subtext */}
          <h3 className="text-xl font-headline font-bold text-on-surface mb-3 tracking-tight z-10">
            Awaiting Your First Candidates
          </h3>
          <p className="text-on-surface-variant text-sm max-w-lg mb-8 leading-relaxed z-10">
            The AI engine is currently scanning your talent pool for the best matches based on the role requirements. You can also manually accelerate the process.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center z-10">
            <button
              onClick={handleShareLink}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-md font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 text-xs shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer min-w-[150px] justify-center"
            >
              <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "share"}</span>
              {copied ? "Link Copied!" : "Share Job Link"}
            </button>
            <button
              onClick={() => navigate('/hr/pools')}
              className="border border-outline-variant bg-surface-container-low/60 hover:bg-surface-container-high text-on-surface px-6 py-2.5 rounded-md font-semibold text-xs transition-all flex items-center gap-2 cursor-pointer min-w-[150px] justify-center"
            >
              <span className="material-symbols-outlined text-[16px]">group_add</span>
              Invite from Talent Pool
            </button>
          </div>

          {/* Bottom Settings Link */}
          <button
            onClick={() => navigate(`/hr/role/${id}/setup`)}
            className="mt-8 text-xs font-semibold text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 cursor-pointer hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
            Review Scoring Criteria
          </button>
        </div>
      ) : (
        /* Candidates Table View */
        <>
          {/* Bento Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
            <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-on-surface-variant font-medium">Avg. Match Score</p>
                <span className="material-symbols-outlined text-primary text-sm">show_chart</span>
              </div>
              <p className="text-2xl font-headline font-bold text-on-surface">{avgScore}<span className="text-sm text-on-surface-variant font-normal">%</span></p>
            </div>
            
            <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-on-surface-variant font-medium">Technical Cleared</p>
                <span className="material-symbols-outlined text-tertiary text-sm">verified</span>
              </div>
              <p className="text-2xl font-headline font-bold text-on-surface">{technicalCleared}<span className="text-sm text-on-surface-variant font-normal"> / {candidates.length}</span></p>
            </div>
            
            <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs text-on-surface-variant font-medium">Critical Skill Gaps</p>
                <span className="material-symbols-outlined text-error text-sm">warning</span>
              </div>
              <p className="text-2xl font-headline font-bold text-on-surface">{criticalGaps}<span className="text-sm text-on-surface-variant font-normal"> candidates</span></p>
            </div>
            
            <Link to={`/hr/role/${id}/setup`} className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-primary transition-colors block">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
              <div className="relative z-10 flex justify-between items-start mb-2">
                <p className="text-xs text-primary font-medium">JD & Criteria</p>
                <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </div>
              <p className="text-xs text-on-surface-variant relative z-10">Configure hiring preferences.</p>
            </Link>
          </div>

          {/* High Density Ranking Table */}
          <div className="bg-surface-container border border-outline-variant rounded-md flex flex-col flex-1 min-h-[300px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-outline-variant bg-surface-container-highest/50 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0 z-10 rounded-t-lg shrink-0">
              <div className="col-span-3 flex items-center gap-2">
                <input className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent" type="checkbox"/>
                Rank / Candidate
              </div>
              <div className="col-span-2 text-center">Match Score</div>
              <div className="col-span-4">Feedback Summary</div>
              <div className="col-span-3">Mandatory Checks</div>
            </div>

            {/* Table Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto high-density-scrollbar">
              {candidates.sort((a: any, b: any) => b.score - a.score).map((c: any, idx: number) => {
                const scorePercent = Math.round((c.score || 0) * 10);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-outline-variant hover:bg-surface-container-highest transition-colors group">
                    <div className="col-span-3 flex items-center gap-3">
                      <input className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent" type="checkbox"/>
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs border border-primary/30">{idx + 1}</div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-secondary-container flex items-center justify-center text-on-surface text-xs font-bold border border-outline-variant uppercase">
                          {c.profile?.name ? c.profile.name.substring(0,2) : '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{c.profile?.name || 'Unknown'}</p>
                          <p className="text-xs text-on-surface-variant truncate w-32" title={c.profile?.currentLocation}>{c.profile?.currentLocation || 'No location'}</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Circular Gauge Match Score */}
                    <div className="col-span-2 flex justify-center items-center">
                      <div className="relative w-12 h-12">
                        <svg className="circular-chart w-full h-full" viewBox="0 0 36 36">
                          <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                          <path className={`circle ${scorePercent >= 80 ? 'stroke-primary' : scorePercent >= 60 ? 'stroke-tertiary' : 'stroke-error'}`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray={`${scorePercent}, 100`}></path>
                          <text className="percentage" x="18" y="20.35">{scorePercent}</text>
                        </svg>
                      </div>
                    </div>

                    {/* Feedback Summary */}
                    <div className="col-span-4 flex flex-col justify-center">
                      <p className="text-xs text-on-surface-variant line-clamp-2" title={c.overallFeedback}>{c.overallFeedback}</p>
                    </div>

                    {/* Mandatory Checks & Skills */}
                    <div className="col-span-3 flex flex-col justify-center items-start gap-2">
                      {c.meetsMandatoryCriteria ? (
                         <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-primary/30 bg-primary/10 text-primary flex items-center gap-1">
                           <span className="material-symbols-outlined text-[12px]">check_circle</span> Meets Criteria
                         </span>
                      ) : (
                         <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-error/30 bg-error/10 text-error flex items-center gap-1">
                           <span className="material-symbols-outlined text-[12px]">cancel</span> Fails Criteria
                         </span>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {(c.strengths || []).slice(0, 2).map((s: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 text-[9px] rounded border border-outline-variant bg-surface-container-low text-on-surface-variant truncate max-w-[80px]" title={s}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Upload Resumes Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[600px] bg-surface text-on-surface border border-outline-variant shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-on-surface font-headline font-bold text-lg">Upload Candidate Resumes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FileUploadZone 
              label="Drop PDF resumes here to add to this pipeline" 
              onFilesSelect={setResumeFiles} 
              currentFiles={resumeFiles}
              onClear={() => setResumeFiles([])} 
            />
          </div>
          <div className="flex justify-end gap-3 mt-4 border-t border-outline-variant pt-4">
            <button onClick={() => setIsUploadOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">Cancel</button>
            <button 
              onClick={handleUpload}
              disabled={uploading || resumeFiles.length === 0}
              className="px-5 py-2 bg-primary text-on-primary rounded text-sm font-semibold hover:opacity-95 disabled:opacity-50 cursor-pointer shadow-[0_0_15px_rgba(167,139,250,0.15)]"
            >
              {uploading ? 'Uploading...' : `Upload ${resumeFiles.length} files`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
