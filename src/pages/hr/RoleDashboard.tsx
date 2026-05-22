import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSession, uploadFiles, startAnalysis } from '../../lib/api.js';
import { FileUploadZone } from '../../components/FileUploadZone.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog.js';
import { RefreshCw, Zap } from 'lucide-react';

export function HRRoleDashboard() {
  const { id } = useParams();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);

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
      await uploadFiles(id, resumeFiles);
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

  if (loading) return <div className="p-8 text-on-surface-variant">Loading role details...</div>;
  if (!session) return <div className="p-8 text-on-surface-variant">Role not found.</div>;

  const jp = session.job_profile || {};
  const candidates = session.analysis_results || [];
  const filesCount = (session.uploaded_files || []).length;
  
  // Stats
  const avgScore = candidates.length ? Math.round(candidates.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / candidates.length * 10) : 0;
  const technicalCleared = candidates.filter((c: any) => c.score >= 7.0).length;
  const criticalGaps = candidates.filter((c: any) => !c.meetsMandatoryCriteria).length;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Page Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8 shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/hr" className="text-on-surface-variant hover:text-primary text-sm flex items-center transition-colors">
              <span className="material-symbols-outlined text-xs mr-1">arrow_back</span>
              Active Roles
            </Link>
            <span className="text-on-surface-variant text-sm">/</span>
            <span className="text-sm text-primary font-medium px-2 py-0.5 rounded bg-primary/10 border border-primary/20">{id?.substring(0, 8)}</span>
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight">{jp.name || 'Untitled Role'}</h2>
          <p className="text-sm text-on-surface-variant mt-1">{candidates.length} Candidates Processed • {filesCount} Uploaded</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-surface-container-highest text-on-surface font-medium text-sm rounded hover:bg-outline-variant transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">upload</span>
            Upload Resumes
          </button>
          
          <button 
            onClick={handleAnalyze}
            disabled={analyzing || filesCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-medium text-sm rounded hover:bg-primary-fixed transition-colors shadow-sm disabled:opacity-50"
          >
            {analyzing ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              <><Zap className="w-4 h-4" /> Run AI Analysis</>
            )}
          </button>
        </div>
      </div>

      {/* Bento Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Avg. Match Score</p>
            <span className="material-symbols-outlined text-primary text-sm">show_chart</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">{avgScore}<span className="text-sm text-on-surface-variant font-normal">%</span></p>
        </div>
        
        <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Technical Cleared</p>
            <span className="material-symbols-outlined text-tertiary text-sm">verified</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">{technicalCleared}<span className="text-sm text-on-surface-variant font-normal"> / {candidates.length}</span></p>
        </div>
        
        <div className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Critical Skill Gaps</p>
            <span className="material-symbols-outlined text-error text-sm">warning</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">{criticalGaps}<span className="text-sm text-on-surface-variant font-normal"> candidates</span></p>
        </div>
        
        <Link to={`/hr/role/${id}/setup`} className="bg-surface-container border border-outline-variant rounded-md p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-primary transition-colors block">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
          <div className="relative z-10 flex justify-between items-start mb-2">
            <p className="text-sm text-primary font-medium">JD & Criteria</p>
            <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
          <p className="text-sm text-on-surface-variant relative z-10">Configure hiring preferences.</p>
        </Link>
      </div>

      {/* High Density Ranking Table */}
      <div className="bg-surface-container border border-outline-variant rounded-md flex flex-col flex-1 min-h-[400px]">
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
          {candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-on-surface-variant p-8">
              <span className="material-symbols-outlined text-4xl mb-4 opacity-50">group</span>
              <p>No candidates processed yet.</p>
              <p className="text-xs mt-2 opacity-70">Upload resumes and run the AI analysis to see rankings.</p>
            </div>
          ) : (
            candidates.sort((a: any, b: any) => b.score - a.score).map((c: any, idx: number) => {
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
            })
          )}
        </div>
      </div>

      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[600px] bg-surface text-on-surface border-outline">
          <DialogHeader>
            <DialogTitle className="text-on-surface">Upload Candidate Resumes</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <FileUploadZone 
              label="Drop PDF resumes here to add to this pipeline" 
              onFilesSelect={setResumeFiles} 
              currentFiles={resumeFiles}
              onClear={() => setResumeFiles([])} 
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => setIsUploadOpen(false)} className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface">Cancel</button>
            <button 
              onClick={handleUpload}
              disabled={uploading || resumeFiles.length === 0}
              className="px-4 py-2 bg-primary text-background rounded text-sm font-medium hover:bg-primary-fixed disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : `Upload ${resumeFiles.length} files`}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
