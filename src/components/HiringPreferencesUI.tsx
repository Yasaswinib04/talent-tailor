import React from 'react';
import { motion } from 'motion/react';
import { 
  Sliders, 
  X, 
  Plus, 
  Trash2, 
  ShieldCheck, 
  Target,
  Trophy,
  GraduationCap
} from 'lucide-react';
import { RoleType, ExperienceTier, HiringPreferences, JobProfile } from '../types';
import { ROLE_WEIGHTS, TIER_CONFIG, getEffectiveWeights } from '../constants/roles';
import { cn } from '../lib/utils';
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface HiringPreferencesUIProps {
  profiles: JobProfile[];
  onUpdate: (profiles: JobProfile[]) => void;
}

export const HiringPreferencesUI: React.FC<HiringPreferencesUIProps> = ({
  profiles,
  onUpdate
}) => {
  const [activeId, setActiveId] = React.useState<string>(profiles[0]?.id);
  const activeProfile = profiles.find(p => p.id === activeId) || profiles[0];

  const handleUpdateActive = (updates: Partial<JobProfile>) => {
    const newProfiles = profiles.map(p => p.id === activeProfile.id ? { ...p, ...updates } : p);
    onUpdate(newProfiles);
  };

  const handleUpdatePrefs = (updates: Partial<HiringPreferences>) => {
    handleUpdateActive({
      preferences: { ...activeProfile.preferences, ...updates }
    });
  };

  const currentWeights = ROLE_WEIGHTS[activeProfile.role];
  const effectiveWeights = getEffectiveWeights(activeProfile.role, 'Senior'); // Defaulting to Senior for rubric view
  const currentTier = TIER_CONFIG['Senior'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-6xl mx-auto py-12 px-6 lg:px-12 space-y-16"
    >
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        <div className="flex-1 space-y-12">
          <header className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-primary rounded-md flex items-center justify-center shadow-lg shadow-primary/20">
                  <Sliders className="h-5 w-5 text-white" />
                </div>
                <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">HR Protocols</h2>
              </div>
              <div className="flex gap-2">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className={cn(
                      "px-4 py-2 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                      activeId === p.id ? "bg-slate-900 text-white shadow-xl" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    )}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
              Configure the weighing engine, mandatory filters, and the target Job Description for screening.
            </p>
          </header>

          {/* Job Description Input - The Missing UX */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Description Context</Label>
              <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">Grounded AI Vetting</Badge>
            </div>
            <div className="bg-white p-2 rounded-md border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <textarea
                value={activeProfile.jdContent}
                onChange={(e) => handleUpdateActive({ jdContent: e.target.value })}
                placeholder="Paste the full job description here..."
                className="w-full h-64 p-8 bg-transparent border-none focus:outline-none font-mono text-[11px] leading-relaxed text-slate-700 placeholder:text-slate-300 scrollbar-hide resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8 bg-white p-10 rounded-md border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="space-y-8 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="mono-label">Scoring Rubric: {activeProfile.role}</div>
                  <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">
                    {currentTier.focus}
                  </Badge>
                </div>

                <div className="space-y-6">
                  {[
                    { label: 'Technical depth', value: effectiveWeights.technical, base: currentWeights.technical, icon: ShieldCheck },
                    { label: 'Experience Magnitude', value: effectiveWeights.experience, base: currentWeights.experience, icon: Target },
                    { label: 'Domain Context', value: effectiveWeights.domain, base: currentWeights.domain, icon: Trophy },
                    { label: 'Soft Skills & Fit', value: effectiveWeights.softSkills, base: currentWeights.softSkills, icon: ShieldCheck },
                    { label: 'Pedigree & Education', value: effectiveWeights.education, base: currentWeights.education, icon: GraduationCap }
                  ].map((w, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                        <span className="text-slate-400">{w.label}</span>
                        <span className="text-slate-900">{w.value}%</span>
                      </div>
                      <Progress value={w.value} className="h-1 bg-slate-50" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-8 bg-slate-900 rounded-md text-white space-y-6 shadow-2xl relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  <div className="mono-label !text-indigo-400">Hard Filters</div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold uppercase tracking-widest opacity-80 cursor-pointer" htmlFor="tier1">Tier-I Degree</Label>
                      <Switch 
                        id="tier1"
                        checked={activeProfile.preferences.isTierIMandatory}
                        onCheckedChange={(v) => handleUpdatePrefs({ isTierIMandatory: v })}
                        className="data-[state=checked]:bg-primary/100 scale-90"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold uppercase tracking-widest opacity-80 cursor-pointer" htmlFor="mba">MBA Mandatory</Label>
                      <Switch 
                        id="mba"
                        checked={activeProfile.preferences.isMBAMandatory}
                        onCheckedChange={(v) => handleUpdatePrefs({ isMBAMandatory: v })}
                        className="data-[state=checked]:bg-primary/100 scale-90"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                  <Label className="mono-label">Min Experience</Label>
                  <span className="text-xs font-black text-primary uppercase tracking-tighter">{activeProfile.preferences.minExperienceYears} Years+</span>
                </div>
                <div className="px-2 pt-2">
                  <Slider
                    value={[activeProfile.preferences.minExperienceYears]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => handleUpdatePrefs({ minExperienceYears: v })}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="w-full lg:w-80 space-y-12 shrink-0">
          <div className="space-y-6">
            <div className="mono-label px-2">Mandatory Skills</div>
            <div className="space-y-3">
              <Input 
                placeholder="Add skill..." 
                className="rounded-md h-10 text-xs font-bold border-slate-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      handleUpdatePrefs({ mandatorySkills: [...activeProfile.preferences.mandatorySkills, val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                {activeProfile.preferences.mandatorySkills.map((skill, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary border-primary/20 flex items-center gap-2 px-3 py-1.5 rounded-md group transition-all">
                    <span className="text-[10px] font-black uppercase tracking-tight">{skill}</span>
                    <button onClick={() => handleUpdatePrefs({ mandatorySkills: activeProfile.preferences.mandatorySkills.filter((_, idx) => idx !== i) })}>
                      <X className="h-3 w-3 text-slate-300 group-hover:text-rose-500" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="mono-label px-2">Preferred Companies</div>
            <div className="space-y-3">
              <Input 
                placeholder="Add company..." 
                className="rounded-md h-10 text-xs font-bold border-slate-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      handleUpdatePrefs({ preferredCompanies: [...activeProfile.preferences.preferredCompanies, val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2">
                {activeProfile.preferences.preferredCompanies.map((comp, i) => (
                  <Badge key={i} className="bg-slate-50 text-slate-500 border-slate-100 flex items-center gap-2 px-3 py-1.5 rounded-md group transition-all">
                    <span className="text-[10px] font-black uppercase tracking-tight">{comp}</span>
                    <button onClick={() => handleUpdatePrefs({ preferredCompanies: activeProfile.preferences.preferredCompanies.filter((_, idx) => idx !== i) })}>
                      <X className="h-3 w-3 text-slate-300 group-hover:text-rose-500" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};
