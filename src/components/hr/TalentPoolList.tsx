import React, { useState } from 'react';

interface Props {
  onAddTalent: () => void;
}

export function TalentPoolList({ onAddTalent }: Props) {
  // Mock Data mimicking the screenshot
  const [candidates] = useState([
    { id: 1, name: 'Alex Johnson', role: 'Senior Software Engineer', skills: [{name: 'Java', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'React', color: 'bg-secondary/20 text-secondary border-secondary/30'}, {name: 'Node.js', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'LinkedIn', date: 'Oct 26, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    { id: 2, name: 'Maria Garcia', role: 'UX Designer', skills: [{name: 'Figma', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Sketch', color: 'bg-secondary-container text-on-surface-variant border-outline-variant'}, {name: 'Adobe XD', color: 'bg-error/10 text-error border-error/20'}], source: 'Referral', date: 'Oct 25, 2023', status: 'Reviewing', statusColor: 'bg-error/10 text-error border-error/20' },
    { id: 3, name: 'David Chen', role: 'Data Scientist', skills: [{name: 'Python', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}, {name: 'R', color: 'bg-secondary/20 text-secondary border-secondary/30'}, {name: 'SQL', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Machine Learning', color: 'bg-primary/20 text-primary border-primary/30'}], source: 'Website', date: 'Oct 24, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    { id: 4, name: 'Johan Garey', role: 'Senior Software', skills: [{name: 'Java', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'UX Design', color: 'bg-error/10 text-error border-error/20'}, {name: 'Data Analysis', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'LinkedIn', date: 'Oct 26, 2023', status: 'New', statusColor: 'bg-primary/10 text-primary border-primary/20' },
    { id: 5, name: 'David Chen', role: 'Senior Scientist', skills: [{name: 'Python', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}, {name: 'UX Cnet', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Node.js', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'Website', date: 'Oct 25, 2023', status: 'Reviewing', statusColor: 'bg-error/10 text-error border-error/20' },
    { id: 6, name: 'Bena Caneiit', role: 'Data Scientist', skills: [{name: 'Figma', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Sketch', color: 'bg-secondary-container text-on-surface-variant border-outline-variant'}, {name: 'R', color: 'bg-secondary/20 text-secondary border-secondary/30'}], source: 'Website', date: 'Oct 24, 2023', status: 'Interviewed', statusColor: 'bg-tertiary/10 text-tertiary border-tertiary/20' },
    { id: 7, name: 'Maria Garcia', role: 'UX Designer', skills: [{name: 'Figma', color: 'bg-primary/20 text-primary border-primary/30'}, {name: 'Sketch', color: 'bg-secondary-container text-on-surface-variant border-outline-variant'}, {name: 'Node.js', color: 'bg-tertiary/20 text-tertiary border-tertiary/30'}], source: 'Website', date: 'Oct 25, 2023', status: 'Reviewing', statusColor: 'bg-error/10 text-error border-error/20' },
  ]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left Sidebar - Filters */}
      <aside className="w-64 border-r border-outline-variant bg-surface-container-low shrink-0 h-full overflow-y-auto custom-scrollbar p-5 flex flex-col gap-6">
        <div>
          <h2 className="text-lg font-headline font-bold text-on-surface mb-4">Filters</h2>
        </div>

        {/* Location Filter */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Location</h3>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-0 transition-colors" />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Remote</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-0 transition-colors" />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">New York</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-0 transition-colors" />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">London</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input type="checkbox" className="w-4 h-4 rounded border-outline-variant bg-surface-container-highest text-primary focus:ring-primary focus:ring-offset-0 transition-colors" />
            <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">San Francisco</span>
          </label>
        </div>

        {/* Experience Filter */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Experience</h3>
          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-1">
            <span>0-5</span>
            <span>5-10</span>
            <span>10+ years</span>
          </div>
          {/* Simple mock range slider */}
          <div className="relative w-full h-1 bg-surface-container-highest rounded-full">
            <div className="absolute left-1/4 right-1/4 h-full bg-primary rounded-full"></div>
            <div className="absolute left-1/4 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-2 ring-background cursor-pointer"></div>
            <div className="absolute right-1/4 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-primary ring-2 ring-background cursor-pointer"></div>
          </div>
        </div>

        {/* Salary Range */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Salary Range</h3>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Min" className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all" />
            <input type="text" placeholder="Max" className="w-full bg-surface-container-highest border border-outline-variant rounded p-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all" />
          </div>
        </div>

        {/* Skills Filter */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-on-surface">Skills</h3>
          <div className="relative">
            <select className="w-full bg-surface-container-highest border border-outline-variant rounded p-2.5 text-sm text-on-surface-variant appearance-none focus:ring-1 focus:ring-primary outline-none transition-all">
              <option>Multi-select...</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">expand_more</span>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-outline-variant/50">
          <button className="w-full py-2 border border-outline-variant text-on-surface hover:bg-surface-container-highest rounded-md text-sm font-medium transition-colors">
            Clear All
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
        {/* Top Header Actions */}
        <header className="p-6 pb-4 flex justify-between items-center gap-4 shrink-0">
          <div className="relative flex-1 max-w-2xl">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input 
              type="text" 
              placeholder="Search candidates, roles, or skills..." 
              className="w-full bg-surface-container-low border border-outline-variant rounded-md py-2 pl-9 pr-4 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={onAddTalent}
              className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Add Talent
            </button>
            <button className="border border-outline-variant text-on-surface hover:bg-surface-container-highest px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">download</span>
              Export
            </button>
          </div>
        </header>

        {/* Data Table Container */}
        <div className="flex-1 overflow-auto custom-scrollbar px-6 pb-6">
          <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden shadow-lg shadow-black/20 flex flex-col min-h-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low">
                  <th className="p-4 pl-5 w-12"><input type="checkbox" className="rounded border-outline-variant bg-transparent focus:ring-primary" /></th>
                  <th className="py-4 pr-4 font-semibold text-on-surface-variant text-sm tracking-wide">Name</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Role</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Skills</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Source</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Date Added</th>
                  <th className="p-4 font-semibold text-on-surface-variant text-sm tracking-wide">Status</th>
                  <th className="p-4 pr-5 font-semibold text-on-surface-variant text-sm tracking-wide text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-sm">
                {candidates.map((c, i) => (
                  <tr key={c.id} className="hover:bg-surface-container-highest/50 transition-colors group">
                    <td className="p-4 pl-5"><input type="checkbox" className="rounded border-outline-variant bg-transparent focus:ring-primary opacity-0 group-hover:opacity-100 transition-opacity" /></td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-surface font-bold text-xs shrink-0 overflow-hidden border border-outline-variant">
                          {/* Placeholder Avatar */}
                          <img src={`https://i.pravatar.cc/150?u=${c.id}`} alt={c.name} className="w-full h-full object-cover" />
                        </div>
                        <span className="font-medium text-on-surface">{c.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">{c.role}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5">
                        {c.skills.map(s => (
                          <span key={s.name} className={`px-2 py-0.5 rounded text-[11px] font-medium border ${s.color}`}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">{c.source}</td>
                    <td className="p-4 text-on-surface-variant">{c.date}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${c.statusColor}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="p-4 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2 text-on-surface-variant">
                        <button className="hover:text-primary transition-colors p-1"><span className="material-symbols-outlined text-lg">visibility</span></button>
                        <button className="hover:text-on-surface transition-colors p-1"><span className="material-symbols-outlined text-lg">more_horiz</span></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Footer */}
            <div className="mt-auto p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center text-sm text-on-surface-variant">
              <div>Showing 1-20 of 245 candidates</div>
              <div className="flex items-center gap-1">
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-on-primary font-medium">1</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors">2</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors">3</button>
                <span className="w-8 h-8 flex items-center justify-center">...</span>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors">10</button>
                <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-surface-container-highest transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
