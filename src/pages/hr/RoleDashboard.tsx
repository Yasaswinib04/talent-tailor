import React from 'react';
import { Link, useParams } from 'react-router-dom';

export function HRRoleDashboard() {
  const { id } = useParams();

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
            <span className="text-sm text-primary font-medium px-2 py-0.5 rounded bg-primary/10 border border-primary/20">REQ-892</span>
          </div>
          <h2 className="text-2xl font-headline font-bold text-on-surface tracking-tight">Senior Full-Stack Engineer</h2>
          <p className="text-sm text-on-surface-variant mt-1">Refined Candidate Ranking Dashboard • 42 Candidates Processed</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center bg-surface-container-low border border-outline-variant rounded p-1">
            <button className="px-3 py-1 text-sm font-medium rounded bg-secondary-container text-on-surface shadow-sm">All</button>
            <button className="px-3 py-1 text-sm font-medium rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors">Top 10%</button>
            <button className="px-3 py-1 text-sm font-medium rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors">Needs Review</button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-background font-medium text-sm rounded hover:bg-primary-fixed transition-colors shadow-sm">
            <span className="material-symbols-outlined text-sm">compare_arrows</span>
            Compare Selected
          </button>
        </div>
      </div>

      {/* Bento Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Avg. Match Score</p>
            <span className="material-symbols-outlined text-primary text-sm">show_chart</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">84<span className="text-sm text-on-surface-variant font-normal">%</span></p>
        </div>
        
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Technical Cleared</p>
            <span className="material-symbols-outlined text-tertiary text-sm">verified</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">18<span className="text-sm text-on-surface-variant font-normal"> / 42</span></p>
        </div>
        
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm text-on-surface-variant font-medium">Critical Skill Gaps</p>
            <span className="material-symbols-outlined text-error text-sm">warning</span>
          </div>
          <p className="text-2xl font-headline font-bold text-on-surface">7<span className="text-sm text-on-surface-variant font-normal"> candidates</span></p>
        </div>
        
        <div className="bg-surface-container border border-outline-variant rounded-lg p-4 flex flex-col justify-between relative overflow-hidden group cursor-pointer hover:border-primary transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent z-0"></div>
          <div className="relative z-10 flex justify-between items-start mb-2">
            <p className="text-sm text-primary font-medium">Generate Report</p>
            <span className="material-symbols-outlined text-primary text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </div>
          <p className="text-sm text-on-surface-variant relative z-10">Export detailed analysis for hiring managers.</p>
        </div>
      </div>

      {/* High Density Ranking Table */}
      <div className="bg-surface-container border border-outline-variant rounded-lg flex flex-col flex-1 min-h-[400px]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-outline-variant bg-surface-container-highest/50 text-xs font-medium text-on-surface-variant uppercase tracking-wider sticky top-0 z-10 rounded-t-lg shrink-0">
          <div className="col-span-3 flex items-center gap-2">
            <input className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent" type="checkbox"/>
            Rank / Candidate
          </div>
          <div className="col-span-2 text-center">Match Score</div>
          <div className="col-span-3">Competency Breakdown</div>
          <div className="col-span-2 text-center">Mandatory Checks</div>
          <div className="col-span-2">Key Skills</div>
        </div>

        {/* Table Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto high-density-scrollbar">
          {/* Row 1: Top Candidate */}
          <div className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-outline-variant hover:bg-surface-container-highest transition-colors group">
            <div className="col-span-3 flex items-center gap-3">
              <input className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent" type="checkbox"/>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary font-bold text-xs border border-primary/30">1</div>
              <div className="flex items-center gap-3">
                <img alt="Candidate" className="w-8 h-8 rounded object-cover border border-outline-variant grayscale group-hover:grayscale-0 transition-all" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2Lt9bKv3wtfpI4b9uFtcpSsU_I_Qqpx89KXf84q_Bi7uGnU4bLX0r83oi2bW70JsrrJvxEaV-X2Q1Mp8hndLR49sTit_CUXD4zeRauW8IgM8HN8VO48BICss6mvOnj52G-hXO9Rm4_1ZZmSfWKZuCQ1C-Qo5JfR3iYj0leNJUDGozhEFNt_eKBftxw0JEIGg_N89ULBerq1QhXpNXcJ5lwIY7Uubwcu4r-QkcPKsxZd3fl4O8UrPR3w4LmDfqbHRVVEJDO94WGpWf"/>
                <div>
                  <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">Marcus Chen</p>
                  <p className="text-xs text-on-surface-variant">Staff Eng @ TechCorp</p>
                </div>
              </div>
            </div>
            
            {/* Circular Gauge Match Score */}
            <div className="col-span-2 flex justify-center items-center">
              <div className="relative w-12 h-12">
                <svg className="circular-chart w-full h-full" viewBox="0 0 36 36">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                  <path className="circle stroke-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray="96, 100"></path>
                  <text className="percentage" x="18" y="20.35">96</text>
                </svg>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="col-span-3 flex flex-col justify-center gap-2">
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                  <span>Architecture</span><span>98%</span>
                </div>
                <div className="w-full h-1 bg-surface-dim rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{width: '98%'}}></div>
                </div>
              </div>
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                  <span>React/Node</span><span>92%</span>
                </div>
                <div className="w-full h-1 bg-surface-dim rounded-full overflow-hidden">
                  <div className="h-full bg-primary/70 rounded-full" style={{width: '92%'}}></div>
                </div>
              </div>
            </div>

            {/* Mandatory Checks */}
            <div className="col-span-2 flex justify-center items-center gap-3">
              <div className="group/tooltip relative flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-sm bg-tertiary/10 p-1 rounded">school</span>
              </div>
              <div className="group/tooltip relative flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-sm bg-tertiary/10 p-1 rounded">gavel</span>
              </div>
              <div className="group/tooltip relative flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-sm bg-tertiary/10 p-1 rounded">public</span>
              </div>
            </div>

            {/* Key Skills Status */}
            <div className="col-span-2 flex flex-wrap gap-1 items-center">
              <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-primary/30 bg-primary/10 text-primary">System Design</span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-primary/30 bg-primary/10 text-primary">GraphQL</span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-outline-variant bg-surface-container-low text-on-surface-variant">+3</span>
            </div>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-4 px-4 py-4 border-b border-outline-variant hover:bg-surface-container-highest transition-colors group">
            <div className="col-span-3 flex items-center gap-3">
              <input className="rounded border-outline-variant bg-surface-container text-primary focus:ring-primary focus:ring-offset-0 focus:ring-offset-transparent" type="checkbox"/>
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-highest text-on-surface-variant font-bold text-xs border border-outline-variant">2</div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-secondary-container flex items-center justify-center text-on-surface text-xs font-bold border border-outline-variant">SJ</div>
                <div>
                  <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">Sarah Jenkins</p>
                  <p className="text-xs text-on-surface-variant">Senior SWE @ StartupX</p>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex justify-center items-center">
              <div className="relative w-12 h-12">
                <svg className="circular-chart w-full h-full" viewBox="0 0 36 36">
                  <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"></path>
                  <path className="circle stroke-primary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" strokeDasharray="89, 100"></path>
                  <text className="percentage" x="18" y="20.35">89</text>
                </svg>
              </div>
            </div>

            <div className="col-span-3 flex flex-col justify-center gap-2">
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                  <span>Architecture</span><span>85%</span>
                </div>
                <div className="w-full h-1 bg-surface-dim rounded-full overflow-hidden">
                  <div className="h-full bg-primary/70 rounded-full" style={{width: '85%'}}></div>
                </div>
              </div>
              <div className="w-full">
                <div className="flex justify-between text-[10px] text-on-surface-variant mb-1">
                  <span>React/Node</span><span>95%</span>
                </div>
                <div className="w-full h-1 bg-primary/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{width: '95%'}}></div>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex justify-center items-center gap-3">
              <span className="material-symbols-outlined text-tertiary text-sm bg-tertiary/10 p-1 rounded">school</span>
              <span className="material-symbols-outlined text-tertiary text-sm bg-tertiary/10 p-1 rounded">gavel</span>
              <span className="material-symbols-outlined text-error text-sm bg-error/10 p-1 rounded" title="Visa sponsorship required">public_off</span>
            </div>

            <div className="col-span-2 flex flex-wrap gap-1 items-center">
              <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-primary/30 bg-primary/10 text-primary">React</span>
              <span className="px-2 py-0.5 text-[10px] font-medium rounded border border-error/30 bg-error/10 text-error">AWS</span>
            </div>
          </div>
        </div>

        {/* Table Footer / Pagination */}
        <div className="border-t border-outline-variant p-3 flex justify-between items-center text-xs text-on-surface-variant bg-surface-container-low rounded-b-lg shrink-0">
          <span>Showing 1-10 of 42 candidates</span>
          <div className="flex items-center gap-2">
            <button className="p-1 hover:text-on-surface disabled:opacity-50" disabled><span className="material-symbols-outlined text-sm">chevron_left</span></button>
            <button className="w-6 h-6 rounded bg-secondary-container text-on-surface flex items-center justify-center">1</button>
            <button className="w-6 h-6 rounded hover:bg-surface-container-highest flex items-center justify-center">2</button>
            <button className="w-6 h-6 rounded hover:bg-surface-container-highest flex items-center justify-center">3</button>
            <span className="px-1">...</span>
            <button className="p-1 hover:text-on-surface"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
          </div>
        </div>
      </div>
    </div>
  );
}
