import React from 'react';
import { motion } from 'motion/react';
import {
  User,
  MapPin,
  Mail,
  Phone,
  Briefcase,
  GraduationCap,
  Clock,
  Wallet,
  Target,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { CandidateProfile } from '../types';
import { cn } from '../lib/utils';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface PortfolioViewProps {
  profile: CandidateProfile | null;
  onRefresh?: () => void;
  onExtract?: (file: File) => void;
  isExtracting?: boolean;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({ profile, onExtract, isExtracting }) => {
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-8">
        <div className="relative">
          <div className="h-32 w-32 bg-primary/10 rounded-md rotate-6 flex items-center justify-center text-indigo-200">
            <User className="h-16 w-16" />
          </div>
          <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-white rounded-md shadow-xl flex items-center justify-center text-primary border border-primary/10">
            <Briefcase className="h-6 w-6" />
          </div>
        </div>
        
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic">Build Your Professional DNA</h2>
          <p className="text-slate-500 font-medium leading-relaxed">
            Upload your resume to extract a deep-dive professional profile, verify your trajectory, and generate your Talent DNA.
          </p>
        </div>

        <div className="w-full max-w-xl bg-white p-8 rounded-md border border-slate-200 shadow-sm">
          {isExtracting ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 bg-primary/10 rounded-full animate-ping opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest animate-pulse">Extracting Intelligence...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-md p-12 hover:border-indigo-300 hover:bg-primary/10/30 transition-all group cursor-pointer" 
                   onClick={() => document.getElementById('portfolio-upload')?.click()}>
                <input 
                  type="file" 
                  id="portfolio-upload" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && onExtract) onExtract(file);
                  }}
                />
                <div className="h-16 w-16 bg-slate-50 rounded-md flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ExternalLink className="h-8 w-8 text-slate-300 group-hover:text-primary/100" />
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Click or drag to upload resume</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-100"></div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Protocol V2.0</span>
                <div className="h-px flex-1 bg-slate-100"></div>
              </div>
              <p className="text-[10px] text-slate-400 font-medium italic">Supports PDF, DOCX up to 10MB</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="max-w-6xl mx-auto py-12 px-6 lg:px-12 space-y-16"
  >
    {/* Profile Hero */}
    <div className="flex flex-col lg:flex-row gap-12 items-start">
      <div className="h-48 w-48 bg-slate-900 rounded-md rotate-6 flex items-center justify-center text-white text-6xl font-black shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] shrink-0">
        {profile.name.charAt(0)}
      </div>
      <div className="flex-1 space-y-6 pt-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none uppercase italic">{profile.name}</h1>
            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-3 py-1 rounded-full uppercase tracking-widest">Profile Verified</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {profile.currentLocation}</div>
            <div className="flex items-center gap-2"><Mail className="h-3 w-3" /> {profile.email || 'Private'}</div>
            <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {profile.phone || 'Private'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Experience', value: profile.totalWorkExperience, icon: Clock },
            { label: 'Notice Period', value: profile.noticePeriod, icon: Briefcase },
            { label: 'Current CTC', value: profile.currentCTC, icon: Wallet },
            { label: 'Expectation', value: profile.expectedCTC, icon: Target }
          ].map((item, i) => (
            <div key={i} className="p-4 bg-white rounded-md border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="h-10 w-10 bg-slate-50 rounded-md flex items-center justify-center text-primary">
                <item.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.label}</p>
                <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Details Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div className="lg:col-span-2 space-y-12">
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200"></div>
            <div className="mono-label">Professional Trajectory</div>
          </div>
          <div className="space-y-6 relative pl-8 border-l border-slate-100">
            {profile.workHistory.map((work, i) => (
              <div key={i} className="relative space-y-2 pb-6 last:pb-0">
                <div className="absolute -left-[41px] h-4 w-4 rounded-full bg-white border-4 border-primary ring-4 ring-white" />
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{work.designation}</h4>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[9px] border-none">{work.period}</Badge>
                </div>
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3">{work.company}</p>
                <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{work.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200"></div>
            <div className="mono-label">Education & Pedigree</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.education.map((edu, i) => (
              <div key={i} className="p-6 bg-slate-50 rounded-md border border-slate-100 space-y-3 relative group overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <GraduationCap className="h-16 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight">{edu.degree}</h4>
                  <Badge className="bg-white text-primary border-slate-100 font-bold text-[9px]">{edu.graduationYear}</Badge>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{edu.college}</p>
                {edu.specialization && <p className="text-[9px] font-black text-primary/100 uppercase tracking-tighter">{edu.specialization}</p>}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">GPA:</span>
                  <span className="text-[9px] font-black text-slate-900">{edu.gpa}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="space-y-12">
        <section className="space-y-6">
          <div className="mono-label text-center">Talent DNA</div>
          <div className="bg-slate-900 rounded-md p-8 text-white space-y-8 shadow-2xl shadow-primary/20 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-50" />
            <div className="relative z-10 space-y-8">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Core Strengths</p>
                <div className="space-y-3">
                  {profile.strengths.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center justify-between group/item">
                      <span className="text-[11px] font-bold opacity-80 group-hover/item:opacity-100 transition-opacity">{s}</span>
                      <ShieldCheck className="h-3 w-3 text-indigo-400" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t border-white/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Target Locations</p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white border-none text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{profile.currentLocation}</Badge>
                  {profile.preferredLocation !== 'Not mentioned' && (
                    <Badge className="bg-primary/100/30 text-primary/20 border-none text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">{profile.preferredLocation}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="mono-label text-center">Quick Export</div>
          <div className="grid grid-cols-1 gap-2">
            <button className="flex items-center justify-between p-4 bg-white rounded-md border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              Download PDF Resume <ExternalLink className="h-3 w-3" />
            </button>
            <button className="flex items-center justify-between p-4 bg-white rounded-md border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
              Copy Profile Link <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        </section>
      </aside>
    </div>
  </motion.div>
  );
};
