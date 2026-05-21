import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function HRDashboard() {
  const navigate = useNavigate();
  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight text-on-surface mb-2">Active Hiring Pipelines</h2>
          <p className="text-on-surface-variant">Monitoring 3 active roles across departments.</p>
        </div>
        <button className="bg-primary text-on-primary px-5 py-2.5 rounded-lg font-medium hover:bg-primary-fixed transition-colors flex items-center gap-2 text-sm shadow-[0_0_0_1px_rgba(167,139,250,0.1)]">
          <span className="material-symbols-outlined text-[20px]" data-icon="add">add</span>
          New Role
        </button>
      </div>
      
      {/* Pipeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Senior Frontend Engineer */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-6 hover:border-outline transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">Engineering</div>
              <h3 className="text-xl font-headline font-semibold text-on-surface leading-tight">Senior Frontend Engineer</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-tertiary/10 text-tertiary border border-tertiary/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              Healthy
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">Total Screened</div>
              <div className="text-2xl font-display font-medium text-on-surface">142</div>
            </div>
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">High Match</div>
              <div className="text-2xl font-display font-medium text-primary">28</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Pipeline Progress</span>
              <span className="text-on-surface font-medium">Interviewing (6)</span>
            </div>
            <div className="w-full h-1.5 bg-secondary-container rounded-full overflow-hidden flex">
              <div className="h-full bg-primary/40 w-[40%]"></div>
              <div className="h-full bg-primary w-[25%]"></div>
            </div>
          </div>
          
          <button onClick={() => navigate('/hr/role/frontend-eng')} className="mt-auto pt-4 border-t border-outline-variant w-full text-left text-sm font-medium text-primary hover:text-primary-fixed transition-colors flex items-center justify-between">
            View Details
            <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
          </button>
        </div>
        
        {/* Card 2: Director of Product Marketing */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-6 hover:border-outline transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">Marketing</div>
              <h3 className="text-xl font-headline font-semibold text-on-surface leading-tight">Director of Product Marketing</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Sourcing
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">Total Screened</div>
              <div className="text-2xl font-display font-medium text-on-surface">89</div>
            </div>
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">High Match</div>
              <div className="text-2xl font-display font-medium text-primary">12</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Pipeline Progress</span>
              <span className="text-on-surface font-medium">Screening (12)</span>
            </div>
            <div className="w-full h-1.5 bg-secondary-container rounded-full overflow-hidden flex">
              <div className="h-full bg-primary/40 w-[70%]"></div>
              <div className="h-full bg-primary w-[0%]"></div>
            </div>
          </div>
          
          <button className="mt-auto pt-4 border-t border-outline-variant w-full text-left text-sm font-medium text-primary hover:text-primary-fixed transition-colors flex items-center justify-between">
            View Details
            <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
          </button>
        </div>
        
        {/* Card 3: Lead UX Designer */}
        <div className="bg-surface-container border border-outline-variant rounded-xl p-6 flex flex-col gap-6 hover:border-outline transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 group-hover:bg-primary/10 transition-colors"></div>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs font-mono text-primary mb-1 uppercase tracking-wider">Design</div>
              <h3 className="text-xl font-headline font-semibold text-on-surface leading-tight">Lead UX Designer</h3>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-error/10 text-error border border-error/20 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
              At Risk
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">Total Screened</div>
              <div className="text-2xl font-display font-medium text-on-surface">215</div>
            </div>
            <div className="bg-surface-container-highest p-3 rounded-lg border border-outline-variant/50">
              <div className="text-xs text-on-surface-variant mb-1">High Match</div>
              <div className="text-2xl font-display font-medium text-error">4</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Pipeline Progress</span>
              <span className="text-on-surface font-medium">Final Stage (1)</span>
            </div>
            <div className="w-full h-1.5 bg-secondary-container rounded-full overflow-hidden flex">
              <div className="h-full bg-primary/40 w-[20%]"></div>
              <div className="h-full bg-primary/60 w-[10%]"></div>
              <div className="h-full bg-primary w-[5%]"></div>
            </div>
          </div>
          
          <button className="mt-auto pt-4 border-t border-outline-variant w-full text-left text-sm font-medium text-primary hover:text-primary-fixed transition-colors flex items-center justify-between">
            View Details
            <span className="material-symbols-outlined text-[18px]" data-icon="arrow_forward">arrow_forward</span>
          </button>
        </div>
        
      </div>
    </div>
  );
}
