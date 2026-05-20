import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { FileUploadZone } from './FileUploadZone';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DashboardShellProps } from '../App';
import { Label } from '@/components/ui/label';
import { 
  FileText, 
  Sparkles, 
  Zap, 
  RefreshCw, 
  Plus, 
  BrainCircuit, 
  ShieldCheck, 
  ShieldAlert, 
  ThumbsUp, 
  Download, 
  Globe,
  Trash2,
  ExternalLink,
  Target,
  FileCheck,
  Search,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { WorkflowCarousel } from './WorkflowCarousel';
import { cn } from '../lib/utils';
import { 
  AnalysisResult, 
  RoleType, 
  ExperienceTier, 
  CandidateAnalysis, 
  ProposedChange 
} from '../types';
import { ROLE_WEIGHTS } from '../constants/roles';
import { 
  KeywordCoverage, 
  FeedbackItem, 
  ImprovementStep, 
  Editor 
} from './AnalysisComponents';

// Replaced CandidateDashboardProps with DashboardShellProps
export const CandidateDashboard: React.FC<DashboardShellProps> = (props) => {
  const {
    analysis, isAnalyzing, activeStep, setActiveStep, handleAnalyze, handleTailor, isTailoring,
    handleToggleFeature, handleFeatureFeedback, handleToggleSkill, resume, setResume, jd, setJd,
    role, setRole, resumeInputMode, setResumeInputMode, resumeFiles, setResumeFiles,
    resumeUrl, setResumeUrl, jdInputMode, setJdInputMode, jdFile, setJdFile,
    jdUrl, setJdUrl
  } = props;
  
  const activeCandidate = analysis?.candidates?.[0] || null;
  const targetMarket = sessionStorage.getItem('targetMarket') || 'India';
  const setTargetMarket = (m: string) => {
    sessionStorage.setItem('targetMarket', m);
    // Since App.tsx manages targetMarket but doesn't pass it in DashboardShellProps, 
    // we use a quick hack to trigger a re-render or just let it be read on analyze.
    window.dispatchEvent(new Event('storage'));
  };

  const [activeTab, setActiveTab] = useState<'toolkit' | 'autopilot'>('toolkit');

  // Handle URL query for tabs
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 'toolkit' || tab === 'autopilot') {
      setActiveTab(tab as any);
    }
  }, []);

  const updateTab = (tab: 'toolkit' | 'autopilot') => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
  };

  const markets = ['India', 'United States', 'Europe', 'Singapore', 'Middle East', 'Australia'];

  return (
    <div className="flex-1 overflow-auto">
      <AnimatePresence mode="wait">
        {activeTab === 'toolkit' && (
          <motion.div
            key="toolkit"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="max-w-7xl mx-auto p-6 lg:p-12 space-y-12"
          >
              <WorkflowCarousel />

              {/* Welcome Hero - Only shown when no analysis and no inputs */}
              {!analysis && !resume && !jd && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-indigo-600 rounded-[3rem] p-10 lg:p-16 text-white relative overflow-hidden shadow-2xl shadow-indigo-100 mb-12"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                  <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                        <Sparkles className="h-3 w-3 text-indigo-200" />
                        Next-Gen Career Intelligence
                      </div>
                      <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-[0.95]">
                        Stop filling forms. <span className="text-indigo-200 italic">Get hired.</span>
                      </h1>
                      <p className="text-lg text-indigo-50 font-medium leading-relaxed max-w-md">
                        Drop your resume and a job description. We'll audit your profile, fix the gaps, and prep you for 1-click apply.
                      </p>
                      <div className="flex flex-wrap gap-4 pt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                          <ShieldCheck className="h-4 w-4" /> Zero Hallucination
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
                          <Globe className="h-4 w-4" /> Global ATS Standards
                        </div>
                      </div>
                    </div>
                    <div className="hidden lg:block bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 font-mono text-[11px] text-indigo-100 space-y-3">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="h-2 w-2 rounded-full bg-rose-400" />
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                      </div>
                      <div>{">"} Initializing Neural Audit...</div>
                      <div className="text-emerald-400">{">"} Status: Ready for Input</div>
                      <div className="text-slate-400 italic">Waiting for resume source...</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Analysis Input Section */}
              <div className="grid lg:grid-cols-2 gap-8">
                <motion.div 
                    whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 transition-colors hover:border-indigo-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase group-hover:text-indigo-900 transition-colors">
                        <FileText className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" /> Resume Profile
                      </h2>
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {['file', 'text', 'url'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setResumeInputMode(m as any)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              resumeInputMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      {resumeInputMode === 'file' && (
                        <FileUploadZone
                          label=""
                          onFilesSelect={(files) => setResumeFiles(files)}
                          currentFiles={resumeFiles}
                          onClear={() => setResumeFiles([])}
                        />
                      )}
                      {resumeInputMode === 'text' && (
                        <Textarea
                          value={resume}
                          onChange={(e) => setResume(e.target.value)}
                          placeholder="Paste your resume text here..."
                          className="h-32 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium focus:ring-indigo-500/20 resize-none"
                        />
                      )}
                      {resumeInputMode === 'url' && (
                        <Input
                          value={resumeUrl}
                          onChange={(e) => setResumeUrl(e.target.value)}
                          placeholder="Paste LinkedIn URL..."
                          className="h-12 bg-slate-50 border-slate-100 rounded-xl px-4 text-sm font-medium"
                        />
                      )}
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -2, boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 transition-colors hover:border-indigo-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic uppercase group-hover:text-indigo-900 transition-colors">
                        <Target className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" /> Target Job
                      </h2>
                      <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                        {['file', 'text', 'url'].map((m) => (
                          <button
                            key={m}
                            onClick={() => setJdInputMode(m as any)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                              jdInputMode === m ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4">
                      {jdInputMode === 'file' && (
                        <FileUploadZone
                          label=""
                          onFilesSelect={(files) => setJdFile(files[0])}
                          currentFiles={jdFile ? [jdFile] : []}
                          onClear={() => setJdFile(null)}
                        />
                      )}
                      {jdInputMode === 'text' && (
                        <Textarea
                          value={jd}
                          onChange={(e) => setJd(e.target.value)}
                          placeholder="Paste the Job Description text here..."
                          className="h-32 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium focus:ring-indigo-500/20 resize-none"
                        />
                      )}
                      {jdInputMode === 'url' && (
                        <Input
                          value={jdUrl}
                          onChange={(e) => setJdUrl(e.target.value)}
                          placeholder="Paste Job URL..."
                          className="h-12 bg-slate-50 border-slate-100 rounded-xl px-4 text-sm font-medium"
                        />
                      )}
                    </div>
                  </motion.div>
              </div>

              <div className="flex justify-center mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing}
                  className="w-full max-w-md py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Zap className="h-5 w-5 text-indigo-400" />
                  )}
                  {isAnalyzing ? 'Analyzing Alignment...' : 'Analyze My Profile'}
                </motion.button>
              </div>

              {/* Analysis Results Display */}
              {activeCandidate && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-16 pt-16 border-t border-slate-200"
                >
                  <div className="flex flex-wrap lg:flex-nowrap gap-4">
                    <ImprovementStep active={activeStep === 1} number={1} title="ATS Match & Keywords" onClick={() => setActiveStep(1)} />
                    <ImprovementStep active={activeStep === 2} number={2} title="Strategic Fit" onClick={() => setActiveStep(2)} />
                    <ImprovementStep active={activeStep === 3} number={3} title="Deep Analysis" onClick={() => setActiveStep(3)} />
                    <ImprovementStep active={activeStep === 4} number={4} title="Tailored Resume" onClick={() => setActiveStep(4)} />
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeStep}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {activeStep === 1 && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          <div className="lg:col-span-4">
                            <div className="bg-slate-900 p-12 rounded-[3rem] text-center space-y-6 relative overflow-hidden h-full flex flex-col justify-center shadow-2xl">
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(99,102,241,0.15),transparent)] pointer-events-none" />
                              <div className="space-y-2">
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">Total Alignment Score</div>
                                <div className="flex items-baseline justify-center">
                                  <span className="text-8xl font-black text-white tracking-tighter">{((activeCandidate.atsScore || activeCandidate.score) * 10).toFixed(0)}</span>
                                  <span className="text-2xl font-black text-indigo-500 ml-1">%</span>
                                </div>
                              </div>
                              <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(activeCandidate.atsScore || activeCandidate.score) * 10}%` }}
                                  className="h-full bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"
                                />
                              </div>
                              <p className="text-[10px] text-white/40 font-medium leading-relaxed uppercase tracking-widest">
                                Optimized for {targetMarket} Market
                              </p>
                            </div>
                          </div>
                          <div className="lg:col-span-8 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                            <KeywordCoverage
                              keywords={activeCandidate.keywords || { present: [], missing: activeCandidate.gaps || [] }}
                              atsScore={activeCandidate.atsScore || activeCandidate.score}
                              roleType={activeCandidate.roleType || 'Other'}
                              experienceTier={activeCandidate.experienceTier || 'Senior'}
                              confirmedSkills={activeCandidate.confirmedSkills}
                              onToggleSkill={(skill) => handleToggleSkill(activeCandidate.id, skill)}
                            />
                          </div>
                        </div>
                      )}

                      {activeStep === 2 && (
                        <div className="space-y-12">
                          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-10 items-center">
                            <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600">
                              <BrainCircuit className="h-8 w-8" />
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-2xl font-black text-slate-900 tracking-tight">Strategic Fit Analysis</h3>
                              <p className="text-slate-500 font-medium italic opacity-80 leading-relaxed">"{activeCandidate.overallFeedback}"</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                                <ThumbsUp className="h-4 w-4" /> Your Strengths
                              </div>
                              <div className="space-y-3">
                                {activeCandidate.strengths.map((s, idx) => (
                                  <FeedbackItem
                                    key={idx}
                                    item={s}
                                    type="strength"
                                    onToggle={() => handleToggleFeature(activeCandidate.id, 'strength', idx)}
                                    onFeedback={(f) => handleFeatureFeedback(activeCandidate.id, 'strength', idx, f)}
                                  />
                                ))}
                              </div>
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                <Zap className="h-4 w-4" /> Strategic Gaps
                              </div>
                              <div className="space-y-3">
                                {activeCandidate.gaps?.map((g, idx) => (
                                  <div key={idx} className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                                    <p className="text-xs font-bold text-indigo-900 leading-relaxed">{g}</p>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm space-y-6">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-rose-600">
                                <ShieldAlert className="h-4 w-4" /> Improvement Areas
                              </div>
                              <div className="space-y-3">
                                {activeCandidate.weaknesses.map((w, idx) => (
                                  <FeedbackItem
                                    key={idx}
                                    item={w}
                                    type="weakness"
                                    onToggle={() => handleToggleFeature(activeCandidate.id, 'weakness', idx)}
                                    onFeedback={(f) => handleFeatureFeedback(activeCandidate.id, 'weakness', idx, f)}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeStep === 3 && (
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm min-h-[600px]">
                           <div className="flex items-center justify-between mb-8">
                             <div>
                               <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Interactive Improvement</h3>
                               <p className="text-slate-500 text-xs font-medium">Refine your resume bullets in real-time. Changes are grounded in your experience.</p>
                             </div>
                             <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                               <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Grounded Vetting
                             </div>
                           </div>
                           <Editor
                             original={resume}
                             tailored={activeCandidate.tailoredResume ? { fullText: activeCandidate.tailoredResume, changes: activeCandidate.proposedChanges || [] } : null}
                             onTailor={() => activeCandidate && handleTailor(activeCandidate)}
                             isTailoring={isTailoring}
                             onUpdate={() => {}} // Internal state in App will handle this if needed
                           />
                        </div>
                      )}

                      {activeStep === 4 && (
                        <div className="space-y-8">
                          <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-200">
                            <div className="space-y-2">
                              <h3 className="text-3xl font-black tracking-tight uppercase italic">Your Tailored Resume is Ready</h3>
                              <p className="text-indigo-100 font-medium max-w-xl">Optimized for the {role} role in the {targetMarket} market. Highlighting your impact while maintaining zero hallucination.</p>
                            </div>
                            <button
                              onClick={() => activeCandidate && handleTailor(activeCandidate)}
                              disabled={isTailoring}
                              className="px-8 py-4 bg-white text-indigo-600 rounded-[2rem] text-sm font-black uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center gap-2 whitespace-nowrap shadow-xl"
                            >
                              {isTailoring ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                              Generate Final PDF
                            </button>
                          </div>

                          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
                            <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-700">
                              {activeCandidate.tailoredResume || "Click 'Generate' to see your rewritten resume highlights."}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === 'autopilot' && (
            <motion.div
              key="autopilot"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="max-w-4xl mx-auto py-32 px-6 text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-12">
                <Zap className="h-3 w-3" />
                Coming Late 2026
              </div>
              <h2 className="text-5xl lg:text-7xl font-black text-slate-900 tracking-tighter mb-8 leading-[0.9]">
                Apply <span className="text-indigo-600 italic">Autopilot.</span>
              </h2>
              <p className="text-lg text-slate-500 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                Tired of copying and pasting the same info into LinkedIn, Indeed, and company portals? Soon, your T.E.P profile will automatically fill job applications for you.
              </p>

              <div className="grid sm:grid-cols-2 gap-6 text-left mb-16">
                {[
                  { title: "One-Click Form Fill", desc: "No more manual typing. We map your data to any application structure." },
                  { title: "Personalized Outreach", desc: "Auto-generate cover letters and intro messages for each role." },
                  { title: "Tracking Dashboard", desc: "See where you've applied and track your status in one place." },
                  { title: "Agentic Vetting", desc: "Our AI double-checks the JD before applying to ensure a good fit." }
                ].map((feature, i) => (
                  <div key={i} className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 mb-3" />
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-2">{feature.title}</h4>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>

              <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-6 shadow-2xl">
                <h3 className="text-xl font-black uppercase tracking-widest italic">Join the Beta Waitlist</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input 
                    type="email" 
                    placeholder="Enter your email"
                    className="flex-1 px-6 py-4 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 backdrop-blur-md"
                  />
                  <button className="px-8 py-4 bg-indigo-600 text-white rounded-full text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                    Get Early Access
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
  );
};
