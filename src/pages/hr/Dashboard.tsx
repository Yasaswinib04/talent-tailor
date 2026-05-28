import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSessions, createSession, deleteSession } from '../../lib/api.js';

export function HRDashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await getSessions();
        setSessions(data || []);
      } catch (err) {
        console.error("Failed to load sessions", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const handleNewRole = async () => {
    try {
      setCreating(true);
      const res = await createSession({ name: "New Role", roleType: "General", experienceTier: "Mid-Level" });
      navigate(`/hr/role/${res.sessionId}/setup`);
    } catch (err: any) {
      console.error("Failed to create role", err);
      alert(`Failed to create role: ${err.message || 'Database connection error'}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRole = async (sessionId: string, roleName: string) => {
    if (!confirm(`Delete "${roleName}"? This cannot be undone.`)) return;
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err: any) {
      console.error('Failed to delete role:', err);
      alert(`Failed to delete: ${err.message}`);
    }
  };

  return (
    <div className="p-8 min-h-[calc(100vh-4rem)] flex flex-col">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-on-surface-variant">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center relative py-12">
          {/* Purple Glow Background */}
          <div className="absolute w-[450px] h-[450px] bg-primary/10 rounded-full blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>

          {/* Interactive Illustration Container */}
          <div className="w-full max-w-2xl h-80 relative z-10 flex items-center justify-center">
            {/* SVG Connecting Curves */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 600 300" fill="none">
              <defs>
                <linearGradient id="glow-grad-1" x1="1" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#27272a" stopOpacity="0.1" />
                </linearGradient>
                <linearGradient id="glow-grad-2" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#27272a" stopOpacity="0.1" />
                </linearGradient>
              </defs>

              {/* Curve to Top Left */}
              <path d="M 300,150 C 240,150 200,80 140,80" stroke="url(#glow-grad-1)" strokeWidth="1.5" strokeDasharray="4 4">
                <animate attributeName="stroke-dashoffset" values="20;0" dur="3s" repeatCount="indefinite" />
              </path>

              {/* Curve to Bottom Left */}
              <path d="M 300,150 C 240,150 200,220 140,220" stroke="url(#glow-grad-1)" strokeWidth="1.5" strokeDasharray="4 4">
                <animate attributeName="stroke-dashoffset" values="20;0" dur="2.5s" repeatCount="indefinite" />
              </path>

              {/* Curve to Top Right */}
              <path d="M 300,150 C 360,150 400,80 460,80" stroke="url(#glow-grad-2)" strokeWidth="1.5" strokeDasharray="4 4">
                <animate attributeName="stroke-dashoffset" values="0;20" dur="3s" repeatCount="indefinite" />
              </path>

              {/* Curve to Bottom Right */}
              <path d="M 300,150 C 360,150 400,220 460,220" stroke="url(#glow-grad-2)" strokeWidth="1.5" strokeDasharray="4 4">
                <animate attributeName="stroke-dashoffset" values="0;20" dur="2.5s" repeatCount="indefinite" />
              </path>
            </svg>

            {/* Floating Top Left Card (Profile) */}
            <div className="absolute top-4 left-6 md:left-16 bg-surface-container-low/75 backdrop-blur border border-outline-variant rounded-xl p-3 w-40 flex flex-col gap-2 shadow-lg animate-float-1 z-10">
              <div className="flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-outline-variant flex items-center justify-center text-[10px] text-on-surface-variant font-medium">
                  <span className="material-symbols-outlined text-xs">person</span>
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="w-16 h-2 bg-on-surface-variant/30 rounded"></div>
                  <div className="w-10 h-1.5 bg-on-surface-variant/20 rounded"></div>
                </div>
              </div>
              <div className="space-y-1.5 mt-1 border-t border-outline-variant/35 pt-2">
                <div className="w-full h-1 bg-outline-variant/40 rounded"></div>
                <div className="w-4/5 h-1 bg-outline-variant/30 rounded"></div>
              </div>
            </div>

            {/* Floating Bottom Left Card (List) */}
            <div className="absolute bottom-4 left-4 md:left-12 bg-surface-container-low/75 backdrop-blur border border-outline-variant rounded-xl p-3.5 w-40 flex flex-col gap-2.5 shadow-lg animate-float-2 z-10">
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                <div className="w-16 h-2 bg-on-surface-variant/30 rounded"></div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-outline-variant/60"></div>
                <div className="w-12 h-1.5 bg-outline-variant/40 rounded"></div>
              </div>
              <div className="flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-outline-variant/60"></div>
                <div className="w-20 h-1.5 bg-outline-variant/40 rounded"></div>
              </div>
            </div>

            {/* Central Roles Node */}
            <div className="relative bg-surface-container border border-primary/30 px-5 py-3 rounded-2xl flex flex-col items-center gap-1.5 z-20 shadow-[0_0_30px_rgba(167,139,250,0.2)]">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                <span className="material-symbols-outlined text-[18px]">person_search</span>
              </div>
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">Roles</span>
            </div>

            {/* Floating Top Right Card (Board/Columns) */}
            <div className="absolute top-2 right-6 md:right-16 bg-surface-container-low/75 backdrop-blur border border-outline-variant rounded-xl p-3 w-44 flex flex-col gap-2 shadow-lg animate-float-3 z-10">
              <div className="flex justify-between items-center border-b border-outline-variant/35 pb-2">
                <div className="w-12 h-2 bg-on-surface-variant/30 rounded"></div>
                <div className="flex gap-0.5">
                  <div className="w-1 h-1 rounded-full bg-outline-variant"></div>
                  <div className="w-1 h-1 rounded-full bg-outline-variant"></div>
                </div>
              </div>
              <div className="flex justify-between gap-1.5 mt-1">
                <div className="flex-1 h-10 bg-outline-variant/15 rounded border border-outline-variant/30 flex flex-col gap-1 p-1">
                  <div className="w-full h-1 bg-primary/45 rounded"></div>
                  <div className="w-3/4 h-1 bg-outline-variant/50 rounded"></div>
                </div>
                <div className="flex-1 h-10 bg-outline-variant/15 rounded border border-outline-variant/30 flex flex-col gap-1 p-1">
                  <div className="w-full h-1 bg-outline-variant/50 rounded"></div>
                  <div className="w-1/2 h-1 bg-outline-variant/45 rounded"></div>
                </div>
                <div className="flex-1 h-10 bg-outline-variant/15 rounded border border-outline-variant/30 flex flex-col gap-1 p-1">
                  <div className="w-full h-1 bg-outline-variant/50 rounded"></div>
                  <div className="w-2/3 h-1 bg-outline-variant/45 rounded"></div>
                </div>
              </div>
            </div>

            {/* Floating Bottom Right Card (Funnel) */}
            <div className="absolute bottom-2 right-4 md:right-12 bg-surface-container-low/75 backdrop-blur border border-outline-variant rounded-xl p-3 w-40 flex flex-col items-center gap-2 shadow-lg animate-float-4 z-10">
              <div className="w-full flex items-center justify-center py-2">
                <div className="w-14 h-12 flex flex-col items-center justify-between">
                  <div className="w-12 h-2 bg-outline-variant/60 border border-outline-variant/80 rounded-sm"></div>
                  <div className="w-8 h-2 bg-primary/30 border border-primary/40 rounded-sm"></div>
                  <div className="w-4 h-2 bg-outline-variant/40 border border-outline-variant/50 rounded-sm"></div>
                </div>
              </div>
              <div className="w-full border-t border-outline-variant/35 pt-1.5 flex justify-center">
                <span className="material-symbols-outlined text-[14px] text-on-surface-variant/40 animate-pulse">download</span>
              </div>
            </div>
          </div>

          {/* Heading & Subheading */}
          <h2 className="text-2xl font-headline font-bold text-on-surface text-center mb-3 mt-8 z-10 tracking-tight">
            No Active Roles Open
          </h2>
          <p className="text-on-surface-variant text-center max-w-md mx-auto text-sm mb-8 leading-relaxed z-10">
            You haven't created any recruitment workflows yet. Start by defining a new role or importing a job description from your ATS.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4 relative z-10">
            <button
              onClick={handleNewRole}
              disabled={creating}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-md font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(167,139,250,0.15)] disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">{creating ? "sync" : "add"}</span>
              {creating ? "Creating..." : "Create New Role"}
            </button>
            <button
              onClick={() => alert("Archived roles functionality coming soon!")}
              className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-6 py-2.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">archive</span>
              View Archived Roles
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex justify-between items-end mb-8 shrink-0">
            <div>
              <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface mb-2">Active Hiring Pipelines</h2>
              <p className="text-on-surface-variant">Monitoring {sessions.length} active roles across departments.</p>
            </div>
            <button 
              onClick={handleNewRole} 
              disabled={creating} 
              className="bg-primary text-on-primary px-5 py-2.5 rounded-md font-medium hover:opacity-90 transition-all flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(167,139,250,0.1)] disabled:opacity-50 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]" data-icon={creating ? "sync" : "add"}>{creating ? "sync" : "add"}</span>
              {creating ? "Creating..." : "New Role"}
            </button>
          </div>
          
          {/* Pipeline Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {sessions.map((session: any) => {
              const jp = session.job_profile || {};
              const candidates = Array.isArray(session.analysis_results?.candidates)
                ? session.analysis_results.candidates
                : Array.isArray(session.analysis_results)
                  ? session.analysis_results
                  : [];
              const highMatchCount = candidates.filter((c: any) => c.score >= 8.0).length;
              const isAnalyzing = session.status === 'analyzing';
              const isError = session.status === 'error';
              
              return (
                <div key={session.id} className="bg-surface-container border border-outline-variant rounded-md p-6 flex flex-col gap-6 hover:border-primary/40 transition-all duration-300 relative overflow-hidden group h-fit">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">{jp.department || "General"}</div>
                      <h3 className="text-xl font-headline font-semibold text-on-surface leading-tight">{jp.name || "Untitled Role"}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${isAnalyzing ? 'bg-primary/10 text-primary border-primary/20' : isError ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-tertiary/10 text-tertiary border-tertiary/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-primary animate-pulse' : isError ? 'bg-red-400' : 'bg-tertiary'}`}></span>
                      {isAnalyzing ? 'Analyzing...' : isError ? 'Error' : 'Active'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-highest/40 p-3 rounded-md border border-outline-variant/50">
                      <div className="text-xs text-on-surface-variant mb-1">Total Screened</div>
                      <div className="text-2xl font-display font-medium text-on-surface">{(session.uploaded_files || []).length}</div>
                    </div>
                    <div className="bg-surface-container-highest/40 p-3 rounded-md border border-outline-variant/50">
                      <div className="text-xs text-on-surface-variant mb-1">High Match</div>
                      <div className="text-2xl font-display font-medium text-primary">{highMatchCount}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Pipeline Progress</span>
                      <span className="text-on-surface font-medium">Screened ({candidates.length})</span>
                    </div>
                    <div className="w-full h-1.5 bg-secondary-container rounded-full overflow-hidden flex">
                      <div className="h-full bg-primary" style={{ width: candidates.length > 0 ? '100%' : '0%' }}></div>
                    </div>
                  </div>
                  
                   <div className="mt-auto pt-4 border-t border-outline-variant flex items-center gap-2">
                     <button onClick={() => navigate(`/hr/role/${session.id}`)} className="flex-1 text-left text-sm font-medium text-primary hover:opacity-80 transition-all flex items-center justify-between cursor-pointer">
                       View Details
                       <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                     </button>
                     <button
                       onClick={(e) => { e.stopPropagation(); handleDeleteRole(session.id, jp.name || 'Untitled Role'); }}
                       className="text-on-surface-variant hover:text-red-400 p-1.5 rounded hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                       title="Delete role"
                     >
                       <span className="material-symbols-outlined text-[16px]">delete</span>
                     </button>
                   </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
