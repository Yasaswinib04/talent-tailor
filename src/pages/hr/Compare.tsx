import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HRCompare() {
  const navigate = useNavigate();

  return (
    <div className="p-8 min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
      {/* Purple Glow Background */}
      <div className="absolute w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0"></div>

      {/* Main Compare Container Card */}
      <div className="relative z-10 w-full max-w-2xl bg-surface-container/60 backdrop-blur-sm border border-outline-variant rounded-2xl p-10 flex flex-col items-center shadow-2xl">
        
        {/* Glow Behind Graphic */}
        <div className="absolute top-12 w-64 h-64 bg-primary/5 rounded-full blur-[70px] pointer-events-none"></div>

        {/* Dynamic Graphic Area */}
        <div className="w-full max-w-md h-56 relative flex items-center justify-center z-10 mb-6">
          {/* Connector SVGs */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" fill="none">
            <defs>
              <linearGradient id="glow-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="green-grad" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#27272a" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Left to Center path */}
            <path d="M 90,80 C 130,80 160,80 200,80" stroke="url(#glow-grad)" strokeWidth="1.5" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" values="20;0" dur="3s" repeatCount="indefinite" />
            </path>

            {/* Right to Center path */}
            <path d="M 310,80 C 270,80 240,80 200,80" stroke="url(#glow-grad)" strokeWidth="1.5" strokeDasharray="4 4">
              <animate attributeName="stroke-dashoffset" values="0;20" dur="3s" repeatCount="indefinite" />
            </path>

            {/* Center to Bottom Node path */}
            <path d="M 200,120 L 200,150" stroke="url(#green-grad)" strokeWidth="1.5" strokeDasharray="3 3">
              <animate attributeName="stroke-dashoffset" values="15;0" dur="2s" repeatCount="indefinite" />
            </path>

            {/* Cross-connection paths */}
            <path d="M 90,80 C 150,110 180,120 200,150" stroke="url(#glow-grad)" strokeWidth="1" opacity="0.3" />
            <path d="M 310,80 C 250,110 220,120 200,150" stroke="url(#glow-grad)" strokeWidth="1" opacity="0.3" />
          </svg>

          {/* Left Candidate Card */}
          <div className="absolute left-6 top-6 bg-surface-container-low/85 backdrop-blur border border-outline-variant rounded-xl p-3 w-28 flex flex-col items-center gap-1.5 shadow-lg animate-float-1">
            <div className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center bg-surface-container-highest">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
            </div>
            <div className="w-14 h-1.5 bg-on-surface-variant/40 rounded mt-1"></div>
            <div className="w-10 h-1 bg-outline-variant rounded"></div>
            <div className="flex gap-0.5 mt-1">
              <div className="w-3 h-1 bg-outline-variant/60 rounded-full"></div>
              <div className="w-3 h-1 bg-outline-variant/60 rounded-full"></div>
              <div className="w-3 h-1 bg-outline-variant/30 rounded-full"></div>
            </div>
          </div>

          {/* Center Main Candidate Card */}
          <div className="absolute bg-surface-container-low/95 border border-primary/40 rounded-xl p-4 w-36 flex flex-col items-center gap-2 shadow-[0_0_25px_rgba(167,139,250,0.2)] z-10 animate-float-2">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border border-primary/50 flex items-center justify-center bg-primary/10">
                <span className="material-symbols-outlined text-[20px] text-primary">person</span>
              </div>
              <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-tertiary flex items-center justify-center border border-surface-container-low">
                <span className="material-symbols-outlined text-[10px] text-background font-bold">check</span>
              </span>
            </div>
            <div className="w-20 h-2 bg-on-surface rounded mt-1"></div>
            <div className="w-14 h-1 bg-primary/60 rounded"></div>
            <div className="flex gap-0.5 mt-1">
              <div className="w-4 h-1 bg-primary/70 rounded-full"></div>
              <div className="w-4 h-1 bg-primary/70 rounded-full"></div>
              <div className="w-4 h-1 bg-primary/70 rounded-full"></div>
            </div>
          </div>

          {/* Right Candidate Card */}
          <div className="absolute right-6 top-6 bg-surface-container-low/85 backdrop-blur border border-outline-variant rounded-xl p-3 w-28 flex flex-col items-center gap-1.5 shadow-lg animate-float-3">
            <div className="w-8 h-8 rounded-full border border-outline-variant flex items-center justify-center bg-surface-container-highest">
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">person</span>
            </div>
            <div className="w-14 h-1.5 bg-on-surface-variant/40 rounded mt-1"></div>
            <div className="w-10 h-1 bg-outline-variant rounded"></div>
            <div className="flex gap-0.5 mt-1">
              <div className="w-3 h-1 bg-outline-variant/60 rounded-full"></div>
              <div className="w-3 h-1 bg-outline-variant/30 rounded-full"></div>
              <div className="w-3 h-1 bg-outline-variant/30 rounded-full"></div>
            </div>
          </div>

          {/* Bottom Security verification badge node */}
          <div className="absolute bottom-1 bg-surface-container border border-tertiary/40 px-3 py-1.5 rounded-full flex items-center gap-1.5 z-20 shadow-[0_0_15px_rgba(52,211,153,0.15)]">
            <span className="material-symbols-outlined text-[14px] text-tertiary">verified_user</span>
            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Metrics</span>
          </div>
        </div>

        {/* Text Content */}
        <h2 className="text-2xl font-headline font-bold text-on-surface mb-3 tracking-tight">
          Compare Top Talent
        </h2>
        <p className="text-on-surface-variant text-sm max-w-md mb-8 leading-relaxed">
          Select 2-3 candidates from your ranking list to compare their skills, experience, and intelligence verification data side-by-side.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/hr')}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-md font-semibold hover:opacity-95 active:scale-[0.98] transition-all flex items-center gap-2 text-sm shadow-[0_0_20px_rgba(167,139,250,0.15)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">checklist</span>
            Go to Candidate Ranking
          </button>
          <button
            onClick={() => alert("Comparison metric documentation coming soon!")}
            className="border border-outline-variant text-on-surface hover:bg-surface-container-high px-6 py-2.5 rounded-md font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">info</span>
            Learn about Comparison Metrics
          </button>
        </div>

      </div>
    </div>
  );
}
