import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  Target, 
  ShieldCheck, 
  HelpCircle,
  ChevronRight,
  Plus
} from 'lucide-react';
import { CandidateAnalysis, ProposedChange } from '../types';
import { cn } from '../lib/utils';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface CandidateDeepDiveProps {
  candidate: CandidateAnalysis;
  onClose: () => void;
  onTailor: () => void;
  isTailoring: boolean;
  onAcceptChange: (changeId: string) => void;
  onRejectChange: (changeId: string) => void;
  onConfirmSkill: (skill: string) => void;
}

export const CandidateDeepDive: React.FC<CandidateDeepDiveProps> = ({
  candidate,
  onClose,
  onTailor,
  isTailoring,
  onAcceptChange,
  onRejectChange,
  onConfirmSkill
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm p-4 lg:p-8"
  >
    <motion.div
      initial={{ x: '100%', opacity: 0.5 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0.5 }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="bg-white h-full w-full max-w-4xl rounded-md shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white"
    >
      <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white font-black text-2xl shadow-xl rotate-3">
            {candidate.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-black tracking-tighter text-slate-900 uppercase italic leading-none">{candidate.name}</h2>
              <Badge className="bg-primary text-white border-none font-black text-[9px] px-2 py-0.5 rounded-md">
                {candidate.score.toFixed(1)} MATCH
              </Badge>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">System_REF: {candidate.id.toUpperCase().substring(0, 12)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onTailor}
            disabled={isTailoring}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            {isTailoring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            AI Tailor
          </button>
          <button onClick={onClose} className="p-3 bg-slate-100 text-slate-400 rounded-md hover:bg-slate-200 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-8 space-y-12 pb-32">
          {/* Top Level Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="space-y-4">
                <div className="mono-label">Professional Summary</div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium bg-slate-50 p-6 rounded-md border border-slate-100 italic">
                  "{candidate.overallFeedback}"
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-emerald-50/50 rounded-md border border-emerald-100 space-y-4">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Target className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Key Strengths</span>
                  </div>
                  <div className="space-y-2">
                    {candidate.strengths.map((s, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-snug">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        {s.text}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-6 bg-rose-50/50 rounded-md border border-rose-100 space-y-4">
                  <div className="flex items-center gap-2 text-rose-700">
                    <HelpCircle className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Growth Areas</span>
                  </div>
                  <div className="space-y-2">
                    {candidate.weaknesses.map((w, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-bold text-slate-700 leading-snug">
                        <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                        {w.text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="mono-label text-center">Competency Heatmap</div>
                <div className="space-y-4 bg-white p-6 rounded-md border border-slate-100 shadow-sm">
                  {candidate.competencies.map((comp, idx) => (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tight">
                        <span className="text-slate-600">{comp.name}</span>
                        <span className="text-primary">{comp.score.toFixed(1)}</span>
                      </div>
                      <Progress value={comp.score * 10} className="h-1.5 bg-slate-100" />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="mono-label text-center">Quick Actions</div>
                <div className="grid grid-cols-1 gap-2">
                  <button className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
                    Generate Interview Script <ChevronRight className="h-3 w-3" />
                  </button>
                  <button className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all">
                    Share with Stakeholders <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="experience" className="w-full">
            <TabsList className="bg-slate-100 p-1 rounded-md h-14 w-full max-w-md mx-auto grid grid-cols-3">
              <TabsTrigger value="experience" className="rounded-md text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">Experience</TabsTrigger>
              <TabsTrigger value="tailoring" className="rounded-md text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">AI Tailoring</TabsTrigger>
              <TabsTrigger value="questions" className="rounded-md text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">Discovery</TabsTrigger>
            </TabsList>
            
            <TabsContent value="experience" className="pt-8 space-y-8">
              <div className="bg-slate-900 rounded-md p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <ShieldCheck className="h-32 w-32" />
                </div>
                <div className="relative z-10 space-y-6">
                  <h3 className="display-serif text-3xl font-normal italic">Key Highlights</h3>
                  <div className="space-y-4 max-w-2xl">
                    {(candidate as any).bulletedAchievements?.map((achievement: string, i: number) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-indigo-400 font-black">0{i+1}</span>
                        <p className="text-sm leading-relaxed opacity-80">{achievement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="tailoring" className="pt-8 space-y-8">
              {candidate.proposedChanges && candidate.proposedChanges.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {candidate.proposedChanges.map((change) => (
                    <div key={change.id} className="bg-white border-2 border-slate-100 rounded-md overflow-hidden flex flex-col">
                      <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-slate-900 text-white border-none text-[8px] font-black px-2 py-0.5 uppercase tracking-widest">Suggested Change</Badge>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID: {change.id.substring(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => onRejectChange(change.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-md transition-all"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => onAcceptChange(change.id)}
                            className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                          >
                            Apply Change
                          </button>
                        </div>
                      </div>
                      <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div className="mono-label">Original Text</div>
                          <p className="text-xs text-slate-400 leading-relaxed italic line-through">{change.original}</p>
                        </div>
                        <div className="space-y-4">
                          <div className="mono-label text-primary">AI Suggested (STAR Format)</div>
                          <p className="text-xs text-slate-900 font-bold leading-relaxed">{change.suggested}</p>
                        </div>
                      </div>
                      <div className="px-8 pb-8">
                        <div className="p-4 bg-primary/10/50 rounded-md border border-primary/20 text-[10px] font-bold text-primary leading-relaxed">
                          <span className="font-black uppercase mr-2 tracking-widest">Reason:</span> {change.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center space-y-6">
                  <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <RefreshCw className="h-8 w-8 text-slate-200" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Tailoring Data</h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">Click 'AI Tailor' to generate optimized STAR bullet points for this candidate.</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="questions" className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidate.discoveryQuestions.map((dq, i) => (
                  <div key={i} className="p-8 bg-slate-50 rounded-md border border-slate-100 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-white rounded-md flex items-center justify-center font-black text-primary border border-slate-100 shadow-sm text-xs">
                        {i + 1}
                      </div>
                      <p className="text-[11px] font-black text-slate-900 leading-tight uppercase tracking-tight">{dq.question}</p>
                    </div>
                    {dq.answer ? (
                      <p className="text-xs text-slate-600 leading-relaxed pl-11 italic">"{dq.answer}"</p>
                    ) : (
                      <div className="pl-11 pt-2">
                        <button className="flex items-center gap-2 text-[9px] font-black text-primary uppercase tracking-widest hover:text-primary/80">
                          <Plus className="h-3 w-3" /> Add Candidate Answer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </motion.div>
  </motion.div>
);
