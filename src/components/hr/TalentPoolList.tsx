import React, { useState, useEffect, useMemo } from 'react';
import type { EvaluationEntry } from '../../pages/hr/TalentPools.js';

interface Candidate {
  id: string;
  name: string;
  skills: { name: string; color: string }[];
  evaluationHistory: EvaluationEntry[];
  globalStatus: string;
  globalStatusColor: string;
  isLegacy: boolean;
  date: string;
}

interface Props {
  candidates?: Candidate[];
  sessions?: any[];
  onRefresh?: () => void;
  onNavigateToRole?: (roleId: string) => void;
}

export function TalentPoolList({ candidates: externalCandidates, sessions = [], onRefresh, onNavigateToRole }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetRoleId, setTargetRoleId] = useState('');
  const [skillSearch, setSkillSearch] = useState('');
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [viewProfileId, setViewProfileId] = useState<string | null>(null);

  const filteredCandidates = useMemo(() => {
    const raw = externalCandidates || [];
    if (!skillSearch.trim()) return raw;
    const q = skillSearch.toLowerCase();
    return raw.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.skills.some(s => s.name.toLowerCase().includes(q)) ||
      c.evaluationHistory.some(e => e.roleName.toLowerCase().includes(q))
    );
  }, [externalCandidates, skillSearch]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddToRole = (candidateId: string, roleId: string) => {
    if (!roleId) return;
    toggleSelect(candidateId);
    setActivePickerId(null);
    onNavigateToRole?.(roleId);
  };

  const addSelectedToRole = (roleId: string) => {
    if (!roleId || selectedIds.size === 0) return;
    setSelectedIds(new Set());
    setTargetRoleId('');
    onNavigateToRole?.(roleId);
  };

  const isAllSelected = filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        {/* Header */}
        <header className="p-6 pb-4 flex justify-between items-center gap-4 shrink-0">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              type="text"
              placeholder="Search candidates, skills, or past roles..."
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onRefresh && (
              <button onClick={onRefresh} className="border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-2 rounded-md transition-colors cursor-pointer" title="Refresh">
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            )}
            <button className="border border-outline-variant text-on-surface hover:bg-surface-container-highest px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6">
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg shadow-black/20 flex flex-col min-h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="p-4 pl-5 w-12">
                    <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-outline-variant bg-transparent focus:ring-primary cursor-pointer" />
                  </th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide min-w-[180px]">Candidate</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide min-w-[250px]">Past Evaluations</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide w-40">Status</th>
                  <th className="p-4 pr-5 font-semibold text-on-surface-variant text-sm tracking-wide text-right w-44">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-sm">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">person_off</span>
                      <p className="text-sm font-medium">No candidates match your search</p>
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className={`hover:bg-surface-container-highest/40 transition-colors group ${c.isLegacy ? 'opacity-50' : ''}`}>
                      <td className="p-4 pl-5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className={`rounded border-outline-variant bg-transparent focus:ring-primary cursor-pointer ${selectedIds.has(c.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border ${c.isLegacy ? 'bg-surface-container-low text-on-surface-variant border-outline-variant' : 'bg-secondary-container text-on-surface border-outline-variant'}`}>
                            {(c.name || '?').substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${c.isLegacy ? 'text-on-surface-variant' : 'text-on-surface'}`}>{c.name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {c.skills.length === 0 ? (
                                <span className="text-[10px] text-on-surface-variant italic">No parsed data</span>
                              ) : (
                                c.skills.slice(0, 5).map(s => (
                                  <span key={s.name} className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${s.color}`}>
                                    {s.name}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {c.evaluationHistory.slice(0, 3).map((e, i) => (
                            <span key={i} className={`inline-flex flex-col px-2 py-1 rounded text-[10px] font-semibold border ${e.statusColor}`} title={`${e.roleName} — ${e.status}${e.score > 0 ? ` (${Math.round(e.score * 10)}%)` : ''}`}>
                              <span className="max-w-[100px] truncate leading-tight">{e.roleName}</span>
                              <span className="text-[8px] opacity-80 leading-tight mt-0.5">
                                {e.status === 'Pending Analysis' ? 'Pending Analysis' : `${e.status} · ${Math.round(e.score * 10)}%`}
                              </span>
                            </span>
                          ))}
                          {c.evaluationHistory.length > 3 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-low text-on-surface-variant border border-outline-variant self-center">
                              +{c.evaluationHistory.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.globalStatusColor}`}>
                          {c.globalStatus}
                        </span>
                      </td>
                      <td className="p-4 pr-5 text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewProfileId(c.id)}
                            className="p-1.5 rounded hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title={c.isLegacy ? 'Click to extract profile (legacy data)' : 'View profile'}
                          >
                            <span className="material-symbols-outlined text-[16px]">visibility</span>
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActivePickerId(activePickerId === c.id ? null : c.id)}
                              className="px-3 py-1.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              Add to Active Role
                            </button>
                            {activePickerId === c.id && (
                              <div className="absolute right-0 top-9 z-30 bg-surface-container-high border border-outline-variant rounded-md shadow-xl py-1 w-56 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                                <p className="px-3 py-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/30">Select a role</p>
                                {sessions.length === 0 ? (
                                  <p className="px-3 py-2 text-xs text-on-surface-variant italic">No roles available</p>
                                ) : (
                                  sessions.map(s => {
                                    const jp = s.job_profile || {};
                                    return (
                                      <button
                                        key={s.id}
                                        onClick={() => handleAddToRole(c.id, s.id)}
                                        className="w-full px-4 py-2.5 text-xs font-medium text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer text-left"
                                      >
                                        <span className="material-symbols-outlined text-sm text-primary">work</span>
                                        {jp.name || 'Untitled Role'}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-auto p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center text-sm text-on-surface-variant">
              <div>{filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} in pool</div>
            </div>
          </div>
        </div>

        {/* Bottom Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-surface-container-high border-t-2 border-primary/40 shadow-[0_-8px_32px_rgba(0,0,0,0.3)] p-4 flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-full bg-primary/15 text-primary font-bold text-sm border border-primary/30">
                {selectedIds.size} selected
              </span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-on-surface-variant hover:text-on-surface underline cursor-pointer">Clear selection</button>
            </div>
            <div className="h-8 w-px bg-outline-variant"></div>
            <select
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value)}
              className="flex-1 max-w-sm bg-surface-container-low border border-outline-variant rounded-md px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%23666'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '2rem' }}
            >
              <option value="">Select a role to add candidates to...</option>
              {sessions.map((s: any) => {
                const jp = s.job_profile || {};
                return <option key={s.id} value={s.id}>{jp.name || 'Untitled Role'}</option>;
              })}
            </select>
            <button
              onClick={() => { if (targetRoleId) addSelectedToRole(targetRoleId); }}
              disabled={!targetRoleId}
              className="bg-primary text-on-primary hover:opacity-95 px-6 py-2.5 rounded-md font-semibold text-sm transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_20px_rgba(167,139,250,0.3)]"
            >
              <span className="material-symbols-outlined text-[18px]">group_add</span>
              {targetRoleId ? `Add to ${(sessions.find((s: any) => s.id === targetRoleId)?.job_profile?.name || 'Role')}` : 'Add to Role'}
            </button>
          </div>
        )}
      </main>

      {/* Profile Modal */}
      {viewProfileId && (
        (() => {
          const c = externalCandidates?.find(c => c.id === viewProfileId);
          if (!c) return null;
          return (
            <div className="fixed inset-0 z-[200] bg-background/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={(e) => { if (e.target === e.currentTarget) setViewProfileId(null); }}>
              <div className="bg-surface-container rounded-xl border border-outline-variant w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between p-5 border-b border-outline-variant/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border ${c.isLegacy ? 'bg-surface-container-low text-on-surface-variant border-outline-variant' : 'bg-secondary-container text-on-surface border-outline-variant'}`}>
                      {(c.name || '?').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-headline font-bold text-on-surface">{c.name}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.globalStatusColor}`}>{c.globalStatus}</span>
                    </div>
                  </div>
                  <button onClick={() => setViewProfileId(null)} className="text-on-surface-variant hover:text-on-surface p-1 rounded-full hover:bg-surface-container-highest transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
                  {c.skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {c.skills.map(s => (
                          <span key={s.name} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${s.color}`}>{s.name}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {c.isLegacy && (
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-500">
                      This candidate was uploaded as a file but hasn't been parsed yet. Run analysis on their source role to extract skills and structured data.
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-2">Evaluation History ({c.evaluationHistory.length})</h4>
                    <div className="space-y-2">
                      {c.evaluationHistory.map((e, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-md bg-surface-container-low border border-outline-variant/50">
                          <div>
                            <p className="text-sm font-medium text-on-surface">{e.roleName}</p>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold border ${e.statusColor} mt-1 inline-block`}>{e.status}</span>
                          </div>
                          {e.score > 0 && (
                            <div className="text-right">
                              <p className="text-lg font-bold text-on-surface">{Math.round(e.score * 10)}<span className="text-xs text-on-surface-variant">%</span></p>
                              <p className="text-[9px] text-on-surface-variant">Match Score</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-outline-variant/50 flex justify-end">
                  <button onClick={() => setViewProfileId(null)} className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">Close</button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
