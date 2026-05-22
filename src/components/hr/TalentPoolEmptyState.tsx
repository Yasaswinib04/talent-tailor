import React from 'react';

interface Props {
  onAddTalent: () => void;
}

export function TalentPoolEmptyState({ onAddTalent }: Props) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
      <div className="w-full max-w-4xl">
        <h2 className="text-3xl font-headline font-bold text-on-surface mb-8">Talent Pool Get Started</h2>
        
        <div className="bg-surface-container-low border border-outline-variant/50 rounded-2xl p-10 flex flex-col md:flex-row items-center gap-12 relative overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          {/* Subtle background glow effect */}
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex-1 relative z-10 space-y-6">
            <div>
              <h3 className="text-2xl font-headline font-bold text-on-surface mb-3">Welcome to Your Talent Pool</h3>
              <p className="text-on-surface-variant font-body leading-relaxed max-w-md">
                Start building a robust pipeline to integrate profiles, and goal metrics to custom professionals.
              </p>
            </div>
            
            <button 
              onClick={onAddTalent}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-lg font-medium hover:bg-primary-fixed hover:shadow-[0_0_20px_rgba(167,139,250,0.4)] transition-all flex items-center gap-2"
            >
              Add Talent
            </button>
            
            <div className="flex items-center gap-4 text-sm font-medium">
              <button className="text-primary hover:text-primary-fixed transition-colors">Import from CRM</button>
              <span className="text-outline-variant">•</span>
              <button className="text-primary hover:text-primary-fixed transition-colors">Connect Integrations</button>
            </div>
          </div>
          
          <div className="flex-1 flex justify-center relative z-10">
            {/* SVG Illustration Placeholder matching the dark aesthetic */}
            <svg width="280" height="280" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-90">
              <circle cx="100" cy="100" r="50" fill="#1C1C24" stroke="#4a4a5a" strokeWidth="2" />
              <circle cx="100" cy="100" r="40" fill="#A78BFA" fillOpacity="0.2" />
              <path d="M100 80C105.523 80 110 84.4772 110 90C110 95.5228 105.523 100 100 100C94.4772 100 90 95.5228 90 90C90 84.4772 94.4772 80 100 80Z" fill="#A78BFA"/>
              <path d="M85 115C85 106.716 91.7157 100 100 100C108.284 100 115 106.716 115 115V120H85V115Z" fill="#A78BFA"/>
              
              {/* Outer connected nodes */}
              <circle cx="40" cy="60" r="15" fill="#2d2d3a" stroke="#A78BFA" strokeWidth="1.5" />
              <path d="M40 54C43 54 45 56 45 59C45 62 43 64 40 64C37 64 35 62 35 59C35 56 37 54 40 54Z" fill="#8B949E"/>
              <path d="M30 68C30 63 35 60 40 60C45 60 50 63 50 68V70H30V68Z" fill="#8B949E"/>

              <circle cx="160" cy="60" r="15" fill="#2d2d3a" stroke="#A78BFA" strokeWidth="1.5" />
              <path d="M160 54C163 54 165 56 165 59C165 62 163 64 160 64C157 64 155 62 155 59C155 56 157 54 160 54Z" fill="#8B949E"/>
              <path d="M150 68C150 63 155 60 160 60C165 60 170 63 170 68V70H150V68Z" fill="#8B949E"/>

              <circle cx="100" cy="160" r="15" fill="#2d2d3a" stroke="#A78BFA" strokeWidth="1.5" />
              <path d="M100 154C103 154 105 156 105 159C105 162 103 164 100 164C97 164 95 162 95 159C95 156 97 154 100 154Z" fill="#8B949E"/>
              <path d="M90 168C90 163 95 160 100 160C105 160 110 163 110 168V170H90V168Z" fill="#8B949E"/>

              {/* Connecting Lines */}
              <path d="M52 70 L85 90" stroke="#4a4a5a" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M148 70 L115 90" stroke="#4a4a5a" strokeWidth="2" strokeDasharray="4 4" />
              <path d="M100 145 L100 120" stroke="#4a4a5a" strokeWidth="2" strokeDasharray="4 4" />
              
              {/* Decorative arrows */}
              <path d="M60 40 L45 25 L30 40" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M45 25 V50" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" />
              
              <path d="M170 120 L185 135 L170 150" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M155 135 H185" stroke="#A78BFA" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
