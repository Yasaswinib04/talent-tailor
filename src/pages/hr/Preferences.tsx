import React from 'react';
import { Link, useParams } from 'react-router-dom';

export function HRPreferences() {
  const { id } = useParams();
  
  return (
    <div className="p-6 md:p-10 lg:p-12 h-full overflow-y-auto custom-scrollbar flex justify-center pb-32">
      <div className="w-full max-w-4xl flex flex-col gap-8">
        {/* Page Header */}
        <div>
          <h2 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">JD & Criteria Setup</h2>
          <p className="text-on-surface-variant font-body">Configure the evaluation parameters for the Senior Frontend Engineer position.</p>
        </div>

        {/* Collapsible Job Description */}
        <section className="bg-surface-container rounded-md border border-outline-variant overflow-hidden group">
          <details className="w-full" open>
            <summary className="flex items-center justify-between p-5 cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                <h3 className="font-headline font-semibold text-on-surface text-lg">Parsed Job Description</h3>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant group-open:rotate-180 transition-transform duration-200">expand_more</span>
            </summary>
            <div className="px-5 pb-6 pt-1 border-t border-outline-variant text-sm font-body text-on-surface-variant leading-relaxed">
              <p className="mb-3">We are seeking a highly skilled Senior Frontend Engineer with deep expertise in modern React ecosystems, performance optimization, and architectural design. The ideal candidate will have a proven track record of leading complex technical initiatives and mentoring junior engineers.</p>
              <p><strong>Key Responsibilities:</strong> Architect scalable frontend solutions, optimize core web vitals, collaborate with cross-functional teams, and establish best practices for code quality and testing.</p>
            </div>
          </details>
        </section>

        {/* Mandatory Hard Filters */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-on-surface-variant text-sm">filter_alt</span>
            <h3 className="font-headline font-semibold text-on-surface">Mandatory Hard Filters</h3>
          </div>
          <p className="text-sm text-on-surface-variant mb-4">Candidates failing these criteria will be automatically rejected.</p>
          
          <div className="bg-surface-container border border-outline-variant rounded-md p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-surface-container-highest transition-colors">
              <div>
                <p className="text-on-surface font-medium text-sm">Minimum Experience (Years)</p>
                <p className="text-on-surface-variant text-xs">Must have at least 5 years of professional experience.</p>
              </div>
              <input type="number" defaultValue={5} className="w-20 bg-surface-container-low border border-outline-variant rounded p-2 text-on-surface text-center focus:ring-1 focus:ring-primary outline-none" />
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-md hover:bg-surface-container-highest transition-colors border-t border-outline-variant">
              <div>
                <p className="text-on-surface font-medium text-sm">Tier 1 University Degree</p>
                <p className="text-on-surface-variant text-xs">Strictly enforce Tier 1 university filtering.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-surface after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </section>
        
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
          <button className="px-5 py-2.5 rounded-md text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors">Cancel</button>
          <button className="bg-primary text-background px-5 py-2.5 rounded-md text-sm font-medium hover:bg-primary-fixed transition-colors shadow-sm">Save Criteria</button>
        </div>
      </div>
    </div>
  );
}
