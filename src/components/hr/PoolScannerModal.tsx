import React, { useState, useEffect } from 'react';
import { scanPool } from '../../lib/api.js';

interface Props {
  isOpen: boolean;
  sessionId: string;
  onClose: () => void;
  onAddToSession: (candidates: any[]) => void;
}

type ScanStage = 'idle' | 'sieving' | 'scoring' | 'complete';

export function PoolScannerModal({ isOpen, sessionId, onClose, onAddToSession }: Props) {
  const [stage, setStage] = useState<ScanStage>('idle');
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ total: 0, sievedOut: 0, passing: 0, scored: 0 });

  useEffect(() => {
    if (isOpen) {
      setStage('idle');
      setMatches([]);
      setSelectedIds(new Set());
      setStats({ total: 0, sievedOut: 0, passing: 0, scored: 0 });
    }
  }, [isOpen]);

  const handleScan = async () => {
    setStage('sieving');
    setTimeout(() => setStage('scoring'), 500);

    const result = await scanPool(sessionId, 20);
    setStats({
      total: result.total || 0,
      sievedOut: result.sievedOut || 0,
      passing: result.passing || 0,
      scored: result.scored || 0,
    });
    setMatches(result.matches || []);
    setStage('complete');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    const selected = matches.filter(m => selectedIds.has(m.id || m.poolProfileId));
    onAddToSession(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface-container rounded-xl border border-outline-variant w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/50 shrink-0">
          <div>
            <h2 className="text-xl font-headline font-bold text-on-surface">Source from Talent Pool</h2>
            <p className="text-xs text-on-surface-variant mt-1">Scan previously parsed candidates and score them against this role's JD.</p>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-1.5 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-surface-container space-y-4">
          {stage === 'idle' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto border border-primary/20">
                <span className="material-symbols-outlined text-2xl">search</span>
              </div>
              <p className="text-on-surface-variant text-sm max-w-md mx-auto">Click "Start Scan" to check the global talent pool. Layer 1 (pre-filter) is free — Layer 2 (AI scoring) uses Gemini on passing profiles.</p>
              <button onClick={handleScan} className="bg-primary text-on-primary hover:opacity-90 px-6 py-2.5 rounded-md font-semibold text-sm transition-all cursor-pointer shadow-[0_0_20px_rgba(167,139,250,0.15)]">
                Start Scan
              </button>
            </div>
          )}

          {(stage === 'sieving' || stage === 'scoring') && (
            <div className="space-y-6 py-8">
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></span>
                <span className="text-sm font-medium text-on-surface">
                  {stage === 'sieving' ? 'Layer 1: Pre-filtering profiles against mandatory criteria...' : 'Layer 2: AI scoring passing profiles against this JD...'}
                </span>
              </div>
              {stats.total > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                    <p className="text-2xl font-bold text-on-surface">{stats.total}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Total in pool</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                    <p className="text-2xl font-bold text-emerald-400">{stats.passing}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Passed pre-filter</p>
                  </div>
                  <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                    <p className="text-2xl font-bold text-amber-400">{stats.sievedOut}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase">Filtered out</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === 'complete' && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                  <p className="text-xl font-bold text-on-surface">{stats.total}</p>
                  <p className="text-[9px] text-on-surface-variant uppercase">Total pool</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                  <p className="text-xl font-bold text-red-400">{stats.sievedOut}</p>
                  <p className="text-[9px] text-on-surface-variant uppercase">Filtered out</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                  <p className="text-xl font-bold text-emerald-400">{stats.passing}</p>
                  <p className="text-[9px] text-on-surface-variant uppercase">Passed</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 text-center border border-outline-variant">
                  <p className="text-xl font-bold text-primary">{matches.length}</p>
                  <p className="text-[9px] text-on-surface-variant uppercase">Top matches</p>
                </div>
              </div>

              {matches.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant">
                  <p className="text-sm">No matching candidates found in the talent pool.</p>
                  <p className="text-xs mt-1">Upload new resumes directly to this role to add candidates.</p>
                </div>
              ) : (
                <div className="divide-y divide-outline-variant/40 bg-surface-container-low rounded-lg border border-outline-variant max-h-80 overflow-y-auto">
                  {matches.map((m) => {
                    const mid = m.id || m.poolProfileId;
                    const isSelected = selectedIds.has(mid);
                    const scorePct = Math.round((m.score || 0) * 10);
                    return (
                      <div key={mid} className={`flex items-center gap-3 p-3 hover:bg-surface-container-highest/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                        onClick={() => toggleSelect(mid)}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(mid)} className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-on-surface truncate">{m.name || m.poolProfileName || 'Unknown'}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(m.competencies || []).slice(0, 3).map((c: any) => (
                              <span key={c.name} className="px-1.5 py-0.5 rounded text-[9px] bg-primary/10 text-primary border border-primary/20 truncate max-w-[100px]">
                                {c.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-on-surface">{scorePct}<span className="text-xs text-on-surface-variant font-normal">%</span></p>
                          <p className="text-[9px] text-on-surface-variant">Score</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-outline-variant/50 shrink-0 bg-surface-container-low flex justify-between items-center">
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface px-4 py-2 text-xs font-semibold transition-colors rounded-md hover:bg-surface-container-highest cursor-pointer">
            Cancel
          </button>
          {stage === 'complete' && matches.length > 0 && (
            <button
              onClick={handleAddSelected}
              disabled={selectedIds.size === 0}
              className="bg-primary text-on-primary hover:opacity-90 px-5 py-2 rounded-md text-xs font-bold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">group_add</span>
              Add {selectedIds.size} Selected to This Role
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
