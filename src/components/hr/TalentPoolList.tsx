import React, { useState, useEffect, useMemo } from 'react';

interface Candidate {
  id: string;
  name: string;
  role: string;
  skills: { name: string; color: string }[];
  source: string;
  date: string;
  status: string;
  statusColor: string;
  sessionId?: string;
}

interface Filters {
  location: string[];
  experienceMin: number;
  experienceMax: number;
  salaryMin: string;
  salaryMax: string;
  skillSearch: string;
}

interface Props {
  onAddTalent: () => void;
  candidates?: Candidate[];
  sessions?: any[];
  onRefresh?: () => void;
  onNavigateToRole?: (roleId: string) => void;
}

const DEMO_CANDIDATES: Candidate[] = [
  { id: 'demo-1', name: 'Alex Johnson', role: 'Senior Software Engineer', skills: [{name: 'Java', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'React', color: 'bg-secondary/20 text-secondary border-secondary/30'}, {name: 'Node.js', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'LinkedIn', date: 'Oct 26, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
  { id: 'demo-2', name: 'Maria Garcia', role: 'UX Designer', skills: [{name: 'Figma', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Sketch', color: 'bg-secondary-container text-on-surface-variant border-outline-variant'}, {name: 'Adobe XD', color: 'bg-error/10 text-error border-error/20'}], source: 'Referral', date: 'Oct 25, 2023', status: 'Reviewing', statusColor: 'bg-error/10 text-error border-error/20' },
  { id: 'demo-3', name: 'David Chen', role: 'Data Scientist', skills: [{name: 'Python', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}, {name: 'R', color: 'bg-secondary/20 text-secondary border-secondary/30'}, {name: 'SQL', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Machine Learning', color: 'bg-primary/20 text-primary border-primary/30'}], source: 'Website', date: 'Oct 24, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
  { id: 'demo-4', name: 'Johan Garey', role: 'Senior Software', skills: [{name: 'Java', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'UX Design', color: 'bg-error/10 text-error border-error/20'}, {name: 'Data Analysis', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'LinkedIn', date: 'Oct 26, 2023', status: 'New', statusColor: 'bg-primary/10 text-primary border-primary/20' },
  { id: 'demo-5', name: 'Bena Caneiit', role: 'Data Scientist', skills: [{name: 'Figma', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Sketch', color: 'bg-secondary-container text-on-surface-variant border-outline-variant'}, {name: 'R', color: 'bg-secondary/20 text-secondary border-secondary/30'}], source: 'Website', date: 'Oct 24, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
];

function useIsDevMode(): boolean {
  return localStorage.getItem('developer_mode') === 'true';
}

export function TalentPoolList({ onAddTalent, candidates: externalCandidates, sessions = [], onRefresh, onNavigateToRole }: Props) {
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetRoleId, setTargetRoleId] = useState<string>('');
  const isDevMode = useIsDevMode();

  const [filters, setFilters] = useState<Filters>({
    location: [],
    experienceMin: 0,
    experienceMax: 10,
    salaryMin: '',
    salaryMax: '',
    skillSearch: '',
  });

  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const toggleLocationFilter = (loc: string) => {
    setFilters(prev => ({
      ...prev,
      location: prev.location.includes(loc)
        ? prev.location.filter(l => l !== loc)
        : [...prev.location, loc],
    }));
  };

  const clearAllFilters = () => {
    setFilters({ location: [], experienceMin: 0, experienceMax: 10, salaryMin: '', salaryMax: '', skillSearch: '' });
  };

  const toggleSelectCandidate = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredCandidates = useMemo(() => {
    const raw = externalCandidates && externalCandidates.length > 0
      ? externalCandidates
      : isDevMode
        ? DEMO_CANDIDATES
        : [];

    return raw.filter(c => {
      if (filters.skillSearch.trim()) {
        const search = filters.skillSearch.toLowerCase();
        const hasSkill = c.skills.some(s => s.name.toLowerCase().includes(search))
          || c.name.toLowerCase().includes(search)
          || c.role.toLowerCase().includes(search);
        if (!hasSkill) return false;
      }
      return true;
    });
  }, [externalCandidates, isDevMode, filters]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
    }
  };

  const addSelectedToRole = (roleId: string) => {
    if (!roleId || selectedIds.size === 0) return;
    setSelectedIds(new Set());
    setTargetRoleId('');
    onNavigateToRole?.(roleId);
  };

  const isAllSelected = filteredCandidates.length > 0 && selectedIds.size === filteredCandidates.length;

  const hasActiveFilters = filters.location.length > 0 || filters.skillSearch.trim().length > 0;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <aside className="w-64 border-r border-outline-variant bg-surface-container-low shrink-0 h-full overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Filters</h2>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Location</h3>
          {['Remote', 'New York', 'London', 'San Francisco'].map(loc => (
            <label key={loc} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.location.includes(loc)}
                onChange={() => toggleLocationFilter(loc)}
                className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-0 transition-colors cursor-pointer"
              />
              <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">{loc}</span>
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Experience</h3>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
            <span>0-5</span>
            <span>5-10</span>
            <span>10+ years</span>
          </div>
          <div className="relative w-full h-1 bg-surface-container-highest rounded-full">
            <div className="absolute h-full bg-primary rounded-full"
              style={{
                left: `${(filters.experienceMin / 12) * 100}%`,
                right: `${100 - (filters.experienceMax / 12) * 100}%`,
              }}
            ></div>
            <input
              type="range"
              min={0}
              max={12}
              value={filters.experienceMin}
              onChange={(e) => setFilters(prev => ({ ...prev, experienceMin: Math.min(Number(e.target.value), prev.experienceMax - 1) }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <input
              type="range"
              min={0}
              max={12}
              value={filters.experienceMax}
              onChange={(e) => setFilters(prev => ({ ...prev, experienceMax: Math.max(Number(e.target.value), prev.experienceMin + 1) }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
            <span>{filters.experienceMin}y</span>
            <span>{filters.experienceMax}y</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Salary Range</h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Min"
              value={filters.salaryMin}
              onChange={(e) => setFilters(prev => ({ ...prev, salaryMin: e.target.value }))}
              className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
            />
            <input
              type="text"
              placeholder="Max"
              value={filters.salaryMax}
              onChange={(e) => setFilters(prev => ({ ...prev, salaryMax: e.target.value }))}
              className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Skills / Search</h3>
          <input
            type="text"
            placeholder="Python, React, SQL..."
            value={filters.skillSearch}
            onChange={(e) => setFilters(prev => ({ ...prev, skillSearch: e.target.value }))}
            className="w-full bg-surface-container-highest border border-outline-variant rounded p-2.5 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
          />
        </div>

        <div className="mt-auto pt-6 border-t border-outline-variant/50">
          <button
            onClick={clearAllFilters}
            className="w-full py-2 border border-outline-variant text-on-surface hover:bg-surface-container-highest rounded-md text-sm font-medium transition-colors cursor-pointer"
          >
            Clear All
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        <header className="p-6 pb-4 flex justify-between items-center gap-4 shrink-0">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              type="text"
              placeholder="Search candidates, roles, or skills..."
              value={filters.skillSearch}
              onChange={(e) => setFilters(prev => ({ ...prev, skillSearch: e.target.value }))}
              className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high p-2 rounded-md transition-colors cursor-pointer"
                title="Refresh"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            )}
            <button
              onClick={onAddTalent}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Talent
            </button>
            <button className="border border-outline-variant text-on-surface hover:bg-surface-container-highest px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2 cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6">

          {/* Floating Bulk Action Bar */}
          {selectedIds.size > 0 && (
            <div className="sticky top-0 z-20 mb-2 bg-primary/10 border border-primary/30 rounded-lg p-3 flex items-center gap-3 backdrop-blur-sm animate-in slide-in-from-top-2 duration-200">
              <span className="text-sm font-semibold text-primary">{selectedIds.size} selected</span>
              <div className="h-5 w-px bg-primary/30"></div>
              <select
                value={targetRoleId}
                onChange={(e) => setTargetRoleId(e.target.value)}
                className="flex-1 bg-surface-container-low border border-primary/30 rounded-md px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M6 8L1 3h10z' fill='%23666'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center', paddingRight: '2rem' }}
              >
                <option value="">Select target role...</option>
                {sessions.map((s: any) => {
                  const jp = s.job_profile || {};
                  return <option key={s.id} value={s.id}>{jp.name || 'Untitled Role'}</option>;
                })}
              </select>
              <button
                onClick={() => { if (targetRoleId) addSelectedToRole(targetRoleId); }}
                disabled={!targetRoleId}
                className="bg-primary text-on-primary hover:opacity-90 px-4 py-1.5 rounded-md text-sm font-semibold transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                Go to Role
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          )}

          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg shadow-black/20 flex flex-col min-h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="p-4 pl-5 w-12">
                    <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-outline-variant bg-transparent focus:ring-primary cursor-pointer" />
                  </th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Name</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Role</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Skills</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Source</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Date Added</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Status</th>
                  <th className="p-4 pr-5 font-semibold text-on-surface-variant text-sm tracking-wide text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-sm">
                {filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl mb-2 block opacity-30">person_off</span>
                      <p className="text-sm font-medium">
                        {hasActiveFilters ? 'No candidates match your filters' : 'No candidates yet'}
                      </p>
                      {!hasActiveFilters && (
                        <button onClick={onAddTalent} className="mt-2 text-xs text-primary hover:underline cursor-pointer">
                          Add your first talent
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-highest/50 transition-colors group">
                        <td className="p-4 pl-5">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelectCandidate(c.id)}
                            className={`rounded border-outline-variant bg-transparent focus:ring-primary cursor-pointer ${selectedIds.has(c.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}
                          />
                        </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-surface font-bold text-xs shrink-0 overflow-hidden border border-outline-variant">
                            <img src={`https://i.pravatar.cc/150?u=${c.id}`} alt={c.name} className="w-full h-full object-cover" />
                          </div>
                          <span className="font-medium text-on-surface">{c.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-on-surface-variant">{c.role}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {c.skills.length === 0 ? (
                            <span className="text-xs text-on-surface-variant italic">—</span>
                          ) : (
                            c.skills.map(s => (
                              <span key={s.name} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${s.color}`}>
                                {s.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-on-surface-variant">{c.source}</td>
                      <td className="p-4 text-on-surface-variant">{c.date}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.statusColor}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 pr-5 text-right relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2 text-on-surface-variant">
                          <button className="hover:text-primary transition-colors p-1 cursor-pointer" title="View Profile">
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button
                            onClick={() => setActiveMenuId(activeMenuId === c.id ? null : c.id)}
                            className="hover:text-on-surface transition-colors p-1 cursor-pointer"
                            title="More Actions"
                          >
                            <span className="material-symbols-outlined text-lg">more_horiz</span>
                          </button>
                        </div>

                        {activeMenuId === c.id && (
                          <div className="absolute right-5 top-11 z-30 bg-surface-container-high border border-outline-variant rounded-md shadow-xl py-1 w-44 text-left animate-in fade-in slide-in-from-top-1 duration-150">
                            <button
                              onClick={() => { alert(`Viewing full profile: ${c.name}`); setActiveMenuId(null); }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">account_box</span>
                              View Profile
                            </button>
                            <button
                              onClick={() => { toggleSelectCandidate(c.id); setActiveMenuId(null); }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer border-t border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-sm">checklist</span>
                              Select for Pipeline
                            </button>
                            <button
                              onClick={() => { alert(`Exporting profile of ${c.name} as PDF summary`); setActiveMenuId(null); }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-on-surface hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                              Export PDF Summary
                            </button>
                            <button
                              onClick={() => { alert(`Removing ${c.name} from talent pool`); setActiveMenuId(null); }}
                              className="w-full px-4 py-2.5 text-xs font-semibold text-error hover:bg-error-container/20 transition-colors flex items-center gap-2 cursor-pointer border-t border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-sm text-error">delete</span>
                              Delete Candidate
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="mt-auto p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center text-sm text-on-surface-variant">
              <div>
                Showing {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''}
                {hasActiveFilters && ` (filtered from ${(externalCandidates || []).length})`}
              </div>
              <div className="flex items-center gap-1">
                {filteredCandidates.length > 0 && (
                  <>
                    <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-medium">1</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
