import React from 'react';
import { 
  LayoutDashboard, 
  User, 
  Sliders, 
  Puzzle, 
  Target, 
  ShieldCheck, 
  RefreshCw, 
  HelpCircle 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Persona } from '../types';
import { Switch } from "@/components/ui/switch";

interface NavigationSidebarProps {
  activeTab: string;
  setActiveTab: (t: any) => void;
  persona: Persona;
  selectedFeatures: string[];
  setSelectedFeatures: (updater: (prev: string[]) => string[]) => void;
}

export const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeTab,
  setActiveTab,
  persona,
  selectedFeatures,
  setSelectedFeatures
}) => (
  <aside className="hidden lg:flex w-64 border-r border-slate-200 bg-white flex-col shrink-0">
    <div className="flex-1 overflow-y-auto p-6 space-y-8">
      <div className="space-y-6">
        <div className="mono-label px-2 text-slate-400">Navigation</div>
        <nav className="space-y-1">
          {[
            { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
            { id: 'portfolio', icon: User, label: 'Portfolio', show: persona === 'candidate' },
            { id: 'preferences', icon: Sliders, label: 'Settings', show: persona === 'hr' },
            { id: 'extension', icon: Puzzle, label: 'Extension', isBeta: true }
          ].filter(tab => tab.show !== false).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              disabled={tab.isBeta && activeTab !== tab.id}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                activeTab === tab.id
                  ? "bg-slate-900 text-white shadow-xl shadow-slate-200"
                  : tab.isBeta 
                    ? "text-slate-300 cursor-not-allowed opacity-50"
                    : "text-slate-500 hover:bg-slate-50"
              )}
            >
              <div className="flex items-center gap-3">
                <tab.icon className={cn("h-4 w-4", activeTab === tab.id ? "text-indigo-400" : "text-slate-400")} />
                {tab.label}
              </div>
              {tab.isBeta && (
                <span className="text-[7px] font-black bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">Beta</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        <div className="mono-label px-2">Analysis Features</div>
        <div className="space-y-4 px-2">
          {[
            { id: 'score', label: 'Match Scoring', icon: Target },
            { id: 'competencies', label: 'Bias Guard', icon: ShieldCheck },
            { id: 'tailor', label: 'Resume Improvements', icon: RefreshCw },
            { id: 'questions', label: 'Discovery Questions', icon: HelpCircle }
          ].map((feature) => (
            <div key={feature.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 group-hover:text-slate-900 transition-colors">
                <feature.icon className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary/100" />
                {feature.label}
              </div>
              <Switch
                checked={selectedFeatures.includes(feature.id)}
                onCheckedChange={(checked) => {
                  setSelectedFeatures(prev => checked ? [...prev, feature.id] : prev.filter(f => f !== feature.id));
                }}
                className="scale-[0.6] data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="p-6 border-t border-slate-100">
      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
        Talent Engine Pro v2.6
      </div>
    </div>
  </aside>
);
