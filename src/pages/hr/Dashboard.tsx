import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSessions, createSession } from '../../lib/api.js';

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
      const res = await createSession({ name: "New Role", roleType: "General", experienceTier: "Mid" });
      navigate(`/hr/role/${res.sessionId}/setup`);
    } catch (err) {
      console.error("Failed to create role", err);
      setCreating(false);
    }
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface mb-2">Active Hiring Pipelines</h2>
          <p className="text-on-surface-variant">Monitoring {sessions.length} active roles across departments.</p>
        </div>
        <button onClick={handleNewRole} disabled={creating} className="bg-primary text-on-primary px-5 py-2.5 rounded-md font-medium hover:bg-primary-fixed transition-colors flex items-center gap-2 text-sm shadow-[0_0_0_1px_rgba(167,139,250,0.1)] disabled:opacity-50">
          <span className="material-symbols-outlined text-[20px]" data-icon={creating ? "sync" : "add"}>{creating ? "sync" : "add"}</span>
          {creating ? "Creating..." : "New Role"}
        </button>
      </div>
      
      {/* Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-on-surface-variant">Loading pipelines...</div>
        ) : sessions.length === 0 ? (
          <div className="col-span-full text-center py-12 text-on-surface-variant border border-dashed border-outline-variant rounded-md">
            No active roles found. Click "New Role" to create one.
          </div>
        ) : (
          sessions.map((session: any) => {
            const jp = session.job_profile || {};
            const candidates = session.analysis_results || [];
            const highMatchCount = candidates.filter((c: any) => c.score >= 8.0).length;
            const isAnalyzing = session.status === 'analyzing';
            
            return (
              <div key={session.id} className="bg-surface-container border border-outline-variant rounded-md p-6 flex flex-col gap-6 hover:border-outline transition-colors relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">{jp.department || "General"}</div>
                    <h3 className="text-xl font-headline font-semibold text-on-surface leading-tight">{jp.name || "Untitled Role"}</h3>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${isAnalyzing ? 'bg-primary/10 text-primary border-primary/20' : 'bg-tertiary/10 text-tertiary border-tertiary/20'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isAnalyzing ? 'bg-primary animate-pulse' : 'bg-tertiary'}`}></span>
                    {isAnalyzing ? 'Analyzing...' : 'Active'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-container-highest p-3 rounded-md border border-outline-variant/50">
                    <div className="text-xs text-on-surface-variant mb-1">Total Screened</div>
                    <div className="text-2xl font-display font-medium text-on-surface">{(session.uploaded_files || []).length}</div>
                  </div>
                  <div className="bg-surface-container-highest p-3 rounded-md border border-outline-variant/50">
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
                    <div className="h-full bg-primary/40" style={{ width: candidates.length > 0 ? '100%' : '0%' }}></div>
                  </div>
                </div>
                
                <button onClick={() => navigate(`/hr/role/${session.id}`)} className="mt-auto pt-4 border-t border-outline-variant w-full text-left text-sm font-medium text-primary hover:text-primary-fixed transition-colors flex items-center justify-between">
                  View Details
                  <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
