import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getSession, uploadFiles, startAnalysis, associateFilesWithSession, deleteSession } from '../../lib/api.js';
import { FileUploadZone } from '../../components/FileUploadZone.js';
import { PoolScannerModal } from '../../components/hr/PoolScannerModal.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog.js';
import { RefreshCw, Zap } from 'lucide-react';
import { getEffectiveWeights } from '../../constants/roles.js';
import { analyzeResumes as clientAnalyze } from '../../services/gemini.js';
import type { RoleType, ExperienceTier, IndustryType } from '../../types.js';

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [showRejected, setShowRejected] = useState(false);
  const [isSourcePoolOpen, setIsSourcePoolOpen] = useState(false);

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
    setAnalyzing(true);
    try {
      await startAnalysis(id);
      await fetchSession();
    } catch (serverErr) {
      console.warn('Server analysis failed, attempting client-side fallback:', serverErr);
      try {
        const jdText = jp.jd || jp.jdContent || session.jdContent || session.jd_content || '';
        let inputs: (string | { data: string; mimeType: string })[] = [];

        if (resumeFiles.length > 0) {
          const pdfFiles = resumeFiles.filter(f => {
            const name = f.name.toLowerCase();
            const isImageType = f.type?.startsWith('image/');
            const isImageExt = name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.bmp');
            return !isImageType && !isImageExt;
          });
          if (pdfFiles.length === 0) {
            const skipped = resumeFiles.length - pdfFiles.length;
            setAnalyzing(false);
            alert(`Cannot analyze image files (${resumeFiles.map(f => f.name).join(', ')}). Please upload PDF or DOCX resumes only.`);
            return;
          }
          if (pdfFiles.length < resumeFiles.length) {
            const skipped = resumeFiles.filter(f => !pdfFiles.includes(f)).map(f => f.name);
            console.warn(`Skipping ${skipped.length} image/unreadable file(s): ${skipped.join(', ')}`);
          }
          inputs = await Promise.all(pdfFiles.map(async (f) => {
            const base64 = await fileToBase64(f);
            return { data: base64, mimeType: f.type || 'application/pdf' };
          }));
          setResumeFiles([]);
        } else {
          const uploaded = session.uploadedFiles || session.uploaded_files || [];
          if (uploaded.length === 0) {
            alert('No resume files found. Please upload resumes first before running analysis.');
            setAnalyzing(false);
            return;
          }
          alert('The database server is not available. Please add DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY as service-specific variables in Railway and redeploy. Your uploaded files are safe on the server and will be processed once the backend is connected.');
          setAnalyzing(false);
          return;
        }

        const role = jp.roleType || jp.role || 'Full Stack Developer';
        const tier = jp.experienceTier || 'Senior';
        const prefs = jp.preferences || {};

        const result = await clientAnalyze(
          inputs, jdText, role, tier,
          ['score', 'competencies', 'questions'],
          undefined, prefs, jp.targetMarket || 'India'
        );

        const sessions = (() => {
          try { return JSON.parse(localStorage.getItem('local_sessions') || '[]'); } catch { return []; }
        })();
        const idx = sessions.findIndex((s: any) => s.id === id);
        if (idx !== -1) {
          sessions[idx].status = 'completed';
          sessions[idx].analysisResults = result;
          sessions[idx].analysis_results = result;
          sessions[idx].updatedAt = new Date().toISOString();
          sessions[idx].updated_at = new Date().toISOString();
          localStorage.setItem('local_sessions', JSON.stringify(sessions));
        }
        await fetchSession();
      } catch (clientErr: any) {
        console.error('Client-side analysis also failed:', clientErr);
        alert(`Analysis failed: ${clientErr.message || 'Unknown error'}`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAddFromPool = async (poolCandidates: any[]) => {
    if (!id || poolCandidates.length === 0) return;
    try {
      const sessions = JSON.parse(localStorage.getItem('local_sessions') || '[]');
      const idx = sessions.findIndex((s: any) => s.id === id);
      if (idx !== -1) {
        const existing = Array.isArray(sessions[idx].analysis_results?.candidates)
          ? sessions[idx].analysis_results.candidates
          : [];
        sessions[idx].analysis_results = {
          ...(sessions[idx].analysis_results || {}),
          candidates: [...existing, ...poolCandidates],
        };
        sessions[idx].analysis_results = sessions[idx].analysisResults;
        sessions[idx].updatedAt = new Date().toISOString();
        sessions[idx].updated_at = new Date().toISOString();
        localStorage.setItem('local_sessions', JSON.stringify(sessions));
      }
      await fetchSession();
    } catch (err) {
      console.error('Failed to add candidates from pool:', err);
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
  const rawError = session.analysis_results?.error || null;
  const analysisError = rawError && (
    rawError.includes('image.png') || rawError.includes('model does not support image input')
  ) ? 'Some uploaded files could not be processed. Image files (PNG/JPEG) are not supported as resumes. Please upload PDF or DOCX files only.' : rawError;
  const candidates = Array.isArray(session.analysis_results?.candidates)
    ? session.analysis_results.candidates
    : Array.isArray(session.analysis_results)
      ? session.analysis_results
      : [];
  const filesCount = (session.uploaded_files || []).length;
  const roleType = (jp.roleType || jp.role || 'Full Stack Developer') as RoleType;
  const experienceTier = (jp.experienceTier || 'Senior') as ExperienceTier;
  const industry = (jp.industry || 'Technology / SaaS') as IndustryType;

  const rubricDimensions = (() => {
    const prefs = jp.preferences || {};
    const sw = prefs.scoringWeights;
    if (sw) {
      const dims: { key: string; label: string }[] = [
        { key: 'technical', label: 'Technical Skills' },
        { key: 'experience', label: 'Experience' },
        { key: 'domain', label: 'Domain Knowledge' },
        { key: 'education', label: 'Education' },
        { key: 'softSkills', label: 'Soft Skills' },
      ];
      if (sw.custom) {
        for (const k of Object.keys(sw.custom)) {
          dims.push({ key: k, label: k });
        }
      }
      return dims;
    }
    const effective = getEffectiveWeights(roleType, experienceTier, industry);
    const dims: { key: string; label: string }[] = [
      { key: 'technical', label: 'Technical Skills' },
      { key: 'experience', label: 'Experience' },
      { key: 'domain', label: 'Domain Knowledge' },
      { key: 'education', label: 'Education' },
      { key: 'softSkills', label: 'Soft Skills' },
    ];
    return dims;
  })();
  
  // Stats
  const avgScore = candidates.length ? Math.round(candidates.reduce((acc: number, c: any) => acc + (c.score || 0), 0) / candidates.length * 10) : 0;
  const technicalCleared = candidates.filter((c: any) => c.score >= 7.0).length;
  const criticalGaps = candidates.filter((c: any) => !c.meetsMandatoryCriteria).length;

  const sorted = [...candidates].sort((a: any, b: any) => b.score - a.score);
  const shortlisted = sorted.filter((c: any) => c.score >= 5.0 && c.meetsMandatoryCriteria !== false && !c.preFiltered);
  const rejected = sorted.filter((c: any) => c.score < 5.0 || c.meetsMandatoryCriteria === false || c.preFiltered);

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
        <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-400">Analysis Could Not Start</p>
              <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{analysisError}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 border-t border-red-500/15">
            <button
              onClick={() => startAnalysis(id!)}
              className="px-4 py-1.5 rounded-md text-xs font-semibold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-colors cursor-pointer"
            >
              Retry Analysis
            </button>
            <span className="text-[10px] text-red-400/60">This usually means the database (PostgreSQL) is not configured. Check Railway environment variables: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.</span>
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
                onClick={() => setIsSourcePoolOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-highest/60 hover:bg-outline-variant text-on-surface font-semibold text-xs rounded border border-outline-variant transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">search</span>
                Source from Pool
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
        /* Empty State with Two Primary Actions */
        <div className="border-2 border-dashed border-outline-variant rounded-2xl flex-1 flex flex-col items-center justify-center p-8 md:p-12 text-center min-h-[400px] bg-surface-container/20 relative overflow-hidden">
          <div className="absolute w-72 h-72 bg-primary/5 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="relative w-20 h-20 mb-6 flex items-center justify-center z-10">
            <div className="absolute inset-0 rounded-full border-[3px] border-primary/10"></div>
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-primary border-r-primary animate-spin-slow"></div>
            <div className="w-14 h-14 rounded-full bg-primary-container flex items-center justify-center text-primary shadow-[0_0_20px_rgba(167,139,250,0.15)]">
              <span className="material-symbols-outlined text-2xl animate-pulse-slow">psychology</span>
            </div>
          </div>
          <h3 className="text-xl font-headline font-bold text-on-surface mb-2 tracking-tight z-10">
            Awaiting Your First Candidates
          </h3>
          <p className="text-on-surface-variant text-sm max-w-lg mb-6 leading-relaxed z-10">
            Upload resumes directly to this role, or scan the global talent pool for previously parsed candidates.
          </p>
          <div className="flex flex-wrap gap-4 justify-center z-10">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-primary text-on-primary px-6 py-3 rounded-md font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2.5 text-sm shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer min-w-[200px] justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Upload New Resumes
            </button>
            <button
              onClick={() => setIsSourcePoolOpen(true)}
              className="border-2 border-outline-variant bg-surface-container-low/60 hover:bg-surface-container-high text-on-surface px-6 py-3 rounded-md font-semibold text-sm transition-all flex items-center gap-2.5 cursor-pointer min-w-[200px] justify-center"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
              Source from Talent Pool
            </button>
          </div>
          <div className="flex items-center gap-4 mt-6 z-10">
            <button onClick={() => navigate(`/hr/role/${id}/setup`)} className="text-xs text-on-surface-variant hover:text-primary transition-all flex items-center gap-1 cursor-pointer hover:underline">
              <span className="material-symbols-outlined text-[16px]">tune</span>
              Review Scoring Criteria
            </button>
          </div>
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

          {/* Detailed Ranking Table */}
          <div className="bg-surface-container border border-outline-variant rounded-md flex flex-col flex-1 min-h-[300px] overflow-hidden">
            <div className="overflow-auto high-density-scrollbar flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-surface-container-highest/80 backdrop-blur-sm border-b border-outline-variant">
                    <th className="p-3 pl-4 w-10 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px]">#</th>
                    <th className="p-3 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] min-w-[140px]">Candidate</th>
                    <th className="p-3 text-center text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] w-16">Score</th>
                    <th className="p-3 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] w-24">Mandatory</th>
                    <th className="p-3 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] min-w-[200px]">Skills Matched</th>
                    <th className="p-3 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] min-w-[160px]">Gaps / Missing</th>
                    <th className="p-3 text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] w-28">Scores by Rubric</th>
                    <th className="p-3 pr-4 text-right text-on-surface-variant font-semibold uppercase tracking-wider text-[10px] w-28">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {shortlisted.map((c: any, idx: number) => <CandidateRow key={c.id || idx} c={c} idx={idx} rubricDimensions={rubricDimensions} />)}
                  {rejected.length > 0 && (
                    <>
                      <tr className="bg-surface-container-highest/30 hover:bg-surface-container-highest/50 transition-colors cursor-pointer">
                        <td colSpan={8} className="p-0">
                          <button
                            onClick={() => setShowRejected(!showRejected)}
                            className="w-full text-left px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-on-surface-variant transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm">{showRejected ? 'expand_less' : 'expand_more'}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20">{rejected.length}</span>
                            Rejected / Low Match — click to {showRejected ? 'collapse' : 'expand'}
                          </button>
                        </td>
                      </tr>
                      {showRejected && rejected.map((c: any, idx: number) => (
                        <CandidateRow key={c.id || `r${idx}`} c={c} idx={shortlisted.length + idx + 1} rubricDimensions={rubricDimensions} />
                      ))}
                    </>
                  )}
                </tbody>
              </table>
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

      <PoolScannerModal
        isOpen={isSourcePoolOpen}
        sessionId={id || ''}
        onClose={() => setIsSourcePoolOpen(false)}
        onAddToSession={handleAddFromPool}
      />
    </div>
  );
}

function CandidateRow({ c, idx, rubricDimensions }: { c: any; idx: number; key?: React.Key; rubricDimensions: { key: string; label: string }[] }) {
  const scorePercent = Math.round((c.score || 0) * 10);
  const competencies = c.competencies || [];
  const matchedSkills = competencies.filter((comp: any) => comp.score >= 6);
  const weakSkills = competencies.filter((comp: any) => comp.score < 6);
  const keywords = c.keywords || { present: [], missing: [] };

  function getCategoryScore(dimKey: string): number {
    const dimKeywords: Record<string, string[]> = {
      technical: ['technical', 'code', 'programming', 'architecture', 'system', 'design', 'framework', 'api', 'database', 'algorithm', 'infrastructure', 'deployment', 'testing', 'react', 'node', 'python', 'java', 'typescript', 'javascript', 'sql', 'docker', 'kubernetes', 'ci/cd', 'aws', 'cloud', 'frontend', 'backend', 'devops', 'security', 'performance', 'optimization', 'ml', 'ai', 'machine learning', 'pipeline', 'etl'],
      experience: ['experience', 'delivery', 'ownership', 'execution', 'track record', 'led', 'managed', 'built', 'launched', 'scaled', 'shipped', 'delivered', 'production', 'mentor'],
      domain: ['domain', 'industry', 'market', 'business', 'strategy', 'product', 'customer', 'revenue', 'growth', 'fintech', 'healthcare', 'ecommerce', 'saas', 'enterprise', 'compliance', 'regulatory', 'finance', 'sales', 'marketing'],
      education: ['education', 'degree', 'university', 'college', 'gpa', 'bachelor', 'master', 'phd', 'mba', 'certification', 'certified', 'course'],
      softSkills: ['soft', 'communication', 'leadership', 'collaboration', 'team', 'stakeholder', 'presentation', 'coaching', 'empathy', 'negotiation', 'facilitation', 'influence', 'adaptability', 'ownership', 'agency'],
    };
    const related = competencies.filter(comp => {
      const name = (comp.name || '').toLowerCase();
      const evidence = (comp.evidence || '').toLowerCase();
      const kws = dimKeywords[dimKey] || [];
      if (kws.length === 0) return name.includes(dimKey.toLowerCase());
      return kws.some(kw => name.includes(kw) || evidence.includes(kw));
    });
    if (related.length === 0) return 0;
    const avg = related.reduce((sum: number, comp: any) => sum + (comp.score || 0), 0) / related.length;
    return Math.round(avg * 10);
  }
  return (
    <tr className="hover:bg-surface-container-highest/40 transition-colors group">
      <td className="p-3 pl-4">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[11px] border border-primary/20">{idx + 1}</div>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-on-surface font-bold text-[10px] border border-outline-variant uppercase shrink-0">
            {(c.name || '?').substring(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{c.name || 'Unknown'}</p>
            <p className="text-[10px] text-on-surface-variant">{c.experienceYears ? `${c.experienceYears}yrs` : ''} {c.overqualified ? '· Overqualified' : ''}</p>
          </div>
        </div>
      </td>
      <td className="p-3 text-center">
        <div className="relative w-10 h-10 mx-auto">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="#27272a" strokeWidth="3" />
            <circle cx="18" cy="18" r="15" fill="none" stroke={scorePercent >= 80 ? '#a78bfa' : scorePercent >= 60 ? '#f59e0b' : '#ef4444'} strokeWidth="3" strokeDasharray={`${scorePercent} 100`} strokeLinecap="round" />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-on-surface">{scorePercent}</span>
        </div>
      </td>
      <td className="p-3">
        {c.meetsMandatoryCriteria === false ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[12px]">close</span> Fails
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit">
            <span className="material-symbols-outlined text-[12px]">check</span> Pass
          </span>
        )}
        {c.failedCriteria && c.failedCriteria.length > 0 && (
          <div className="mt-1 text-[9px] text-red-400/70 max-w-[120px] truncate" title={c.failedCriteria.join(', ')}>
            {c.failedCriteria.slice(0, 2).join(', ')}
          </div>
        )}
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {matchedSkills.slice(0, 4).map((comp: any) => (
            <span key={comp.name} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-primary/10 text-primary border border-primary/20" title={`Score: ${comp.score?.toFixed(1)}`}>
              {comp.name} <span className="text-[8px] opacity-60">{comp.score?.toFixed(1)}</span>
            </span>
          ))}
          {matchedSkills.length > 4 && <span className="text-[9px] text-on-surface-variant">+{matchedSkills.length - 4}</span>}
          {keywords.present && keywords.present.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1 w-full">
              {keywords.present.slice(0, 3).map((kw: string) => (
                <span key={kw} className="px-1 py-0 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{kw}</span>
              ))}
              {keywords.present.length > 3 && <span className="text-[8px] text-on-surface-variant">+{keywords.present.length - 3}</span>}
            </div>
          )}
        </div>
      </td>
      <td className="p-3">
        <div className="flex flex-wrap gap-1">
          {weakSkills.slice(0, 3).map((comp: any) => (
            <span key={comp.name} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/10 text-red-400 border border-red-500/20" title={`Score: ${comp.score?.toFixed(1)}`}>
              {comp.name} <span className="text-[8px] opacity-60">{comp.score?.toFixed(1)}</span>
            </span>
          ))}
          {weakSkills.length === 0 && keywords.missing && keywords.missing.length > 0 && (
            keywords.missing.slice(0, 3).map((kw: string) => (
              <span key={kw} className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-500/10 text-red-400 border border-red-500/20">{kw}</span>
            ))
          )}
          {((weakSkills.length === 0) && (!keywords.missing || keywords.missing.length === 0)) && (
            <span className="text-[9px] text-on-surface-variant italic">None</span>
          )}
        </div>
      </td>
      <td className="p-3">
        <div className="space-y-1">
          {rubricDimensions.map(dim => {
            const catScore = getCategoryScore(dim.key);
            return (
              <div key={dim.key} className="flex items-center gap-1.5">
                <span className="text-[9px] text-on-surface-variant w-16 truncate" title={dim.label}>{dim.label}</span>
                <div className="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${catScore >= 80 ? 'bg-primary' : catScore >= 60 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(catScore, 100)}%` }}></div>
                </div>
                <span className="text-[9px] font-mono font-bold text-on-surface w-7 text-right">{catScore}</span>
              </div>
            );
          })}
        </div>
      </td>
      <td className="p-3 pr-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => alert(`Accepted: ${c.name}`)}
            className="p-1.5 rounded hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
            title="Accept candidate"
          >
            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
          </button>
          <button
            onClick={() => alert(`Rejected: ${c.name}`)}
            className="p-1.5 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
            title="Reject candidate"
          >
            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
          </button>
          <button
            onClick={() => alert(`Viewing profile: ${c.name}`)}
            className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            title="View details"
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
          </button>
        </div>
      </td>
    </tr>
  );
}
