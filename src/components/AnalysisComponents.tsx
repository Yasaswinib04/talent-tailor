import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Briefcase, 
  Trophy, 
  Zap, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  TriangleAlert, 
  Check, 
  MessageSquare, 
  Sparkles,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CandidateAnalysis, Competency, ProposedChange } from '../types';

export const KeywordCoverage = ({ keywords, atsScore, roleType, experienceTier, confirmedSkills = [], onToggleSkill }: { keywords: { present: string[]; missing: string[] }; atsScore: number; roleType: string; experienceTier: string; confirmedSkills?: string[]; onToggleSkill?: (skill: string) => void }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Keyword Coverage</h4>
        <div className="flex items-center gap-2">
          <Badge className="bg-slate-100 text-slate-600 border-none text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg">{roleType}</Badge>
          <Badge className="bg-indigo-50 text-indigo-600 border-none text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg">{experienceTier}</Badge>
        </div>
      </div>
      <div className="flex flex-col items-end">
        <div className="text-2xl font-black text-indigo-600 tracking-tighter">{(atsScore * 10).toFixed(0)}%</div>
        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Match Index</div>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
        <div className="flex items-center gap-2 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span className="text-[10px] font-black uppercase tracking-widest">Present ({keywords.present.length})</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keywords.present.map((kw, i) => (
            <Badge key={i} variant="outline" className="bg-white border-emerald-200 text-emerald-700 text-[9px] font-bold py-0.5">
              {kw}
            </Badge>
          ))}
        </div>
      </div>

      <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-3">
        <div className="flex items-center justify-between text-rose-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Missing ({keywords.missing.length})</span>
          </div>
          <span className="text-[8px] font-bold text-slate-400 uppercase">Click to confirm if you have these</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {keywords.missing.map((kw, i) => {
            const isConfirmed = confirmedSkills.includes(kw);
            return (
              <Badge
                key={i}
                variant="outline"
                onClick={() => onToggleSkill && onToggleSkill(kw)}
                className={cn(
                  "text-[9px] font-bold py-0.5 cursor-pointer transition-all",
                  isConfirmed
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-white border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                )}
              >
                {kw} {isConfirmed && <CheckCircle2 className="h-2.5 w-2.5 ml-1 inline-block" />}
              </Badge>
            )
          })}
        </div>
      </div>
    </div>
  </div>
);

export const ImprovementStep = ({ active, number, title, onClick }: { active: boolean; number: number; title: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-1 flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border",
      active ? "bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100" : "bg-white border-slate-100 text-slate-400 hover:border-indigo-100 hover:text-slate-600"
    )}
  >
    <div className={cn(
      "h-8 w-8 rounded-xl flex items-center justify-center font-mono text-xs font-black",
      active ? "bg-white/20" : "bg-slate-100"
    )}>
      {number}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest leading-none text-center">{title}</span>
  </button>
);

export const CandidateCard = ({
  candidate: c,
  rank,
  onDeepDive
}: {
  candidate: CandidateAnalysis,
  rank: number,
  onDeepDive: (c: CandidateAnalysis) => void,
  key?: React.Key
}) => {
  const topGap = c.gaps && c.gaps.length > 0 ? c.gaps[0] : null;

  return (
    <motion.div
      whileHover={{ y: -4, shadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)" }}
      onClick={() => onDeepDive(c)}
      className="bg-white rounded-3xl border border-slate-200 p-6 cursor-pointer transition-all flex flex-col gap-5 group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono text-[10px] font-black">
            #{rank.toString().padStart(2, '0')}
          </div>
          {c.meetsMandatoryCriteria === false ? (
            <Badge className="bg-rose-50 text-rose-600 border-rose-100 rounded-lg text-[8px] font-black uppercase px-2 shadow-none gap-1.5">
              <ShieldAlert className="h-2.5 w-2.5" /> High Risk
            </Badge>
          ) : (
            <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 rounded-lg text-[8px] font-black uppercase px-2 shadow-none gap-1.5">
              <ShieldCheck className="h-2.5 w-2.5" /> Validated Fit
            </Badge>
          )}
          <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] font-black uppercase px-2 rounded-lg">{c.experienceTier}</Badge>
        </div>
        <div className="p-2 rounded-xl border border-slate-100 text-slate-300 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-all">
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="text-lg font-black text-slate-900 leading-none group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{c.name}</h3>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {c.experienceYears || 'N/A'}Y Experience
            </span>
            <div className="h-1 w-1 rounded-full bg-slate-200" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {c.id.substring(0, 8)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
            {Number(c.score).toFixed(1)}
          </div>
          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Precision</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
          <span>Core Competency Matrix</span>
          <span className="text-indigo-600">Top Skills</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {c.competencies.slice(0, 4).map((comp, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex justify-between items-center px-0.5">
                <span className="text-[10px] font-bold text-slate-700 truncate max-w-[80px] uppercase tracking-tight">{comp.name}</span>
                <span className="text-[9px] font-mono font-black text-slate-400">{comp.score}</span>
              </div>
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${comp.score * 10}%` }}
                  className={cn(
                    "h-full rounded-full",
                    comp.score >= 8 ? "bg-emerald-500" : comp.score >= 6 ? "bg-amber-500" : "bg-rose-500"
                  )}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {topGap && (
        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
            <TriangleAlert className="h-3.5 w-3.5" />
          </div>
          <div className="flex-1">
            <div className="text-[8px] font-black text-amber-600/60 uppercase tracking-widest">Primary Evidence Gap</div>
            <p className="text-[10px] font-bold text-slate-600 leading-tight truncate">{topGap}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const CandidateLeaderboard = ({ candidates, onDeepDive }: {
  candidates: CandidateAnalysis[],
  onDeepDive: (c: CandidateAnalysis) => void
}) => (
  <div className="space-y-8">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">Intelligence Rankings</h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Ranked by Match Precision Vector</p>
        </div>
      </div>
      <Badge variant="outline" className="font-mono text-[9px] border-slate-200 text-slate-500 rounded-xl px-3 py-1 bg-white shadow-sm">
        {candidates.length} NODES IDENTIFIED
      </Badge>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {candidates.map((c, i) => (
        <CandidateCard
          key={c.id}
          candidate={c}
          rank={i + 1}
          onDeepDive={onDeepDive}
        />
      ))}
    </div>
  </div>
);

export const CompetencyCard: React.FC<{
  comp: Competency,
  onToggle: (name: string) => void,
  onFeedback: (name: string, feedback: string) => void
}> = ({ comp, onToggle, onFeedback }) => {
  const [feedback, setFeedback] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-xl border transition-all flex flex-col gap-3",
        comp.accepted === false ? "bg-slate-100 opacity-60 border-slate-200" : "bg-white border-slate-200 shadow-sm"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm",
            comp.score >= 8 ? "bg-emerald-100 text-emerald-700" : comp.score >= 6 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
          )}>
            {comp.score}
          </div>
          <span className="font-bold text-sm text-slate-800">{comp.name}</span>
        </div>
        <Switch
          checked={comp.accepted !== false}
          onCheckedChange={() => onToggle(comp.name)}
          className="data-[state=checked]:bg-indigo-600"
        />
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{comp.evidence}</p>

      <div className="mt-2 space-y-2">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <MessageSquare className="h-3 w-3" /> Tweak this
        </div>
        <div className="flex gap-2">
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Focus more on leadership..."
            className="h-8 text-[11px] bg-slate-50 border-slate-200 focus:ring-indigo-500/20"
          />
          <button
            onClick={() => {
              onFeedback(comp.name, feedback);
              setFeedback('');
            }}
            className="h-8 px-3 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700"
          >
            REFINE
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export const Scorecard = ({ competencies, onToggle, onFeedback }: {
  competencies: Competency[],
  onToggle: (name: string) => void,
  onFeedback: (name: string, feedback: string) => void
}) => (
  <div className="grid grid-cols-3 gap-4">
    {competencies.map((comp) => (
      <CompetencyCard key={comp.name} comp={comp} onToggle={onToggle} onFeedback={onFeedback} />
    ))}
  </div>
);

interface FeedbackItemProps {
  item: { text: string; accepted?: boolean; feedback?: string };
  onToggle: () => void;
  onFeedback: (feedback: string) => void;
  type: 'strength' | 'weakness';
}

export const FeedbackItem: React.FC<FeedbackItemProps> = ({
  item,
  onToggle,
  onFeedback,
  type
}) => {
  const [feedback, setFeedback] = useState('');
  const isStrength = type === 'strength';

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all space-y-3",
      item.accepted === false ? "bg-slate-100 opacity-60 border-slate-200" : isStrength ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
    )}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          "text-xs font-medium leading-relaxed",
          isStrength ? "text-emerald-900" : "text-amber-900"
        )}>
          {item.text}
        </span>
        <Switch
          checked={item.accepted !== false}
          onCheckedChange={onToggle}
          className="scale-75 data-[state=checked]:bg-indigo-600 shrink-0"
        />
      </div>

      <div className="space-y-2 pt-1 border-t border-black/5">
        <div className="flex gap-2">
          <Input
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Tweak or provide feedback..."
            className="h-7 text-[10px] bg-white/50 border-slate-200 focus:ring-indigo-500/10"
          />
          <button
            onClick={() => {
              onFeedback(feedback);
              setFeedback('');
            }}
            className="h-7 px-2 bg-indigo-600 text-white rounded-lg text-[9px] font-bold hover:bg-indigo-700"
          >
            REFINE
          </button>
        </div>
      </div>
    </div>
  );
};

export const Editor = ({ original, tailored, onTailor, isTailoring, onUpdate }: {
  original: string,
  tailored: { fullText: string, changes: ProposedChange[] } | null,
  onTailor: () => void,
  isTailoring: boolean,
  onUpdate: (tailored: { fullText: string, changes: ProposedChange[] }) => void
}) => {
  const [activeView, setActiveView] = useState<'review' | 'preview'>('review');

  const toggleChange = (id: string) => {
    if (!tailored) return;
    const newChanges = tailored.changes.map(c =>
      c.id === id ? { ...c, accepted: !c.accepted } : c
    );
    onUpdate({ ...tailored, changes: newChanges });
  };

  const generateFinalResume = () => {
    if (!tailored) return original;
    return tailored.fullText;
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([generateFinalResume()], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "Tailored_Resume.txt";
    document.body.appendChild(element);
    element.click();
  };

  if (!tailored && !isTailoring) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center space-y-6">
        <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center">
          <Zap className="h-8 w-8 text-indigo-600" />
        </div>
        <div className="max-w-xs space-y-2">
          <h3 className="text-lg font-black text-slate-900">Optimization Required</h3>
          <p className="text-slate-500 text-xs leading-relaxed">
            Run the AI Tailoring engine to see a professional version of your resume with high-impact STAR bullets.
          </p>
        </div>
        <button
          onClick={onTailor}
          className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" /> Tailor My Resume
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveView('review')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'review' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
            )}
          >
            Review Changes
          </button>
          <button
            onClick={() => setActiveView('preview')}
            className={cn(
              "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeView === 'preview' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400"
            )}
          >
            Final Preview
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onTailor}
            disabled={isTailoring}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
            title="Re-run AI Optimization"
          >
            <RefreshCw className={cn("h-4 w-4", isTailoring && "animate-spin")} />
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isTailoring ? (
          <div className="flex h-full items-center justify-center bg-white border border-slate-200 rounded-3xl shadow-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 bg-indigo-50 rounded-full animate-pulse" />
                <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin absolute inset-0 m-auto" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Building STAR Experience...</span>
            </div>
          </div>
        ) : activeView === 'review' ? (
          <div className="grid grid-cols-2 gap-8 h-full">
            <div className="space-y-4 h-full flex flex-col">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Original Context</div>
              <ScrollArea className="flex-1 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <pre className="whitespace-pre-wrap font-sans text-slate-500 text-xs leading-relaxed">{original}</pre>
              </ScrollArea>
            </div>
            <div className="space-y-4 h-full flex flex-col">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Proposed Refinements</div>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {tailored?.changes.map((change) => (
                    <div
                      key={change.id}
                      className={cn(
                        "p-5 rounded-2xl border transition-all duration-300",
                        change.accepted
                          ? "bg-white border-indigo-200 shadow-md shadow-indigo-50"
                          : "bg-slate-50 border-slate-100 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <Badge className={cn(
                          "text-[9px] font-black px-2 py-0",
                          change.accepted ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-400"
                        )}>
                          {change.accepted ? "ACCEPTED" : "DISCARDED"}
                        </Badge>
                        <Switch
                          checked={change.accepted}
                          onCheckedChange={() => toggleChange(change.id)}
                        />
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-slate-400 uppercase">Original</div>
                          <p className="text-[11px] text-slate-500 line-through decoration-slate-300 decoration-1">{change.original}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[9px] font-bold text-emerald-600 uppercase">Suggested STAR Improvement</div>
                          <p className="text-xs font-semibold text-slate-900 leading-relaxed italic border-l-2 border-emerald-500 pl-3">"{change.suggested}"</p>
                        </div>
                        <div className="pt-2 bg-slate-50 p-3 rounded-lg flex items-start gap-2">
                          <Sparkles className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-600 italic">"{change.reason}"</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="h-full bg-white border border-slate-200 rounded-3xl shadow-sm p-12 overflow-hidden flex flex-col">
            <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-8 shrink-0">
              <div className="h-12 w-12 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black">AI</div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Optimized Narrative</h4>
                <p className="text-[11px] text-slate-400">STAR-ready resume based on current insights</p>
              </div>
            </div>
            <ScrollArea className="flex-1">
              <div className="max-w-2xl mx-auto py-4">
                <pre className="whitespace-pre-wrap font-sans text-slate-700 text-sm leading-relaxed tracking-tight">{generateFinalResume()}</pre>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
};

export const ExtensionPlaceholder = () => (
  <div className="bg-linear-to-br from-indigo-600 to-violet-500 text-white p-5 rounded-xl relative overflow-hidden">
    <div className="text-[10px] uppercase font-bold opacity-80 mb-1">Coming Soon</div>
    <h3 className="text-base font-bold mb-2">Chrome Extension</h3>
    <p className="text-[12px] opacity-90 leading-relaxed">
      Sync your tailored STAR bullets directly into Workday and Greenhouse portals with one click.
    </p>
    <div className="mt-4 bg-white/20 h-2 rounded-full w-3/5 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "60%" }}
        className="h-full bg-white"
      />
    </div>
  </div>
);
