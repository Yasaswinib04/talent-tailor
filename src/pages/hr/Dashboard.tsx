import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, RefreshCw, Target, AlertCircle } from 'lucide-react';
import { FileUploadZone } from '../../components/FileUploadZone';
import { CandidateLeaderboard } from '../../components/AnalysisComponents';
import { HRInsightsReport } from '../../components/HRInsightsReport';
import { CandidateDeepDive } from '../../components/CandidateDeepDive';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { createSession, uploadFiles, associateFilesWithSession, startAnalysis, getSession } from '../../lib/api';
import { JobProfile, AnalysisResult, CandidateAnalysis } from '../../types';
import { Link } from 'react-router-dom';

export function HRDashboard() {
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  // Hardcoded for now. Next phase we fetch from user settings
  const [activeProfile, setActiveProfile] = useState<JobProfile>({
    id: 'default',
    name: 'B2B Product Manager',
    role: 'Product Manager',
    jdContent: 'Seeking a Product Manager to lead SaaS initiatives...',
    preferences: { isTierIMandatory: false, isMBAMandatory: false, minExperienceYears: 3, preferredCompanies: [], mandatorySkills: ['Roadmap'], topN: 20 }
  });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateAnalysis | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setAnalysis(null);

    try {
      const { session } = await createSession(activeProfile);
      const { files: uploadedMetadata } = await uploadFiles(session.id, resumeFiles);
      await associateFilesWithSession(session.id, uploadedMetadata);
      await startAnalysis(session.id);
      
      const interval = setInterval(async () => {
        try {
          const updatedSession = await getSession(session.id);
          if (updatedSession.status === 'completed') {
            clearInterval(interval);
            setAnalysis(JSON.parse(updatedSession.analysis_results));
            setIsAnalyzing(false);
          } else if (updatedSession.status === 'failed') {
            clearInterval(interval);
            setErrorMsg("Analysis failed on the server.");
            setIsAnalyzing(false);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
      setPollingInterval(interval);

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message);
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto space-y-12 pb-12"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-primary text-primary-foreground border-none text-[8px] font-black tracking-[0.25em] px-3 py-1">PROTOCOL ALPHA</Badge>
          <div className="h-px flex-1 bg-border"></div>
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-foreground leading-none">
          Bulk Screening <span className="font-serif italic font-normal text-muted-foreground">Intelligence</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xl leading-relaxed">
          Upload multiple resumes to rank them against your active Job Description using autonomous agentic vetting.
        </p>
      </div>

      <div className="space-y-6">
         <div className="bg-card border border-border p-10 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-3xl font-black tracking-tight uppercase italic text-primary">HR Command Center</h3>
              <p className="text-muted-foreground font-medium max-w-xl">Deep-vet candidates against the {activeProfile.name} rubric.</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-sidebar-accent text-foreground border-none text-[10px] font-black px-4 py-2 uppercase tracking-widest">Active Role: {activeProfile.name}</Badge>
            </div>
         </div>
         
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Candidate Pool (PDF)</Label>
              <div className="bg-card p-10 rounded-[3rem] border border-border shadow-sm">
                <FileUploadZone
                  label="Drop multiple resumes here"
                  onFilesSelect={(files) => setResumeFiles(files)}
                  currentFiles={resumeFiles}
                  onClear={() => setResumeFiles([])}
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Job Description Profile</Label>
                <Link to="/hr/preferences" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">Change Role Settings</Link>
              </div>
              <div className="bg-card p-10 rounded-[3rem] border border-border shadow-sm space-y-6">
                <div className="flex items-center gap-4 p-4 bg-sidebar rounded-2xl border border-sidebar-border">
                  <div className="h-12 w-12 bg-background rounded-xl flex items-center justify-center shadow-sm">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Evaluating for</div>
                    <div className="text-sm font-black text-foreground">{activeProfile.name}</div>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic line-clamp-3">
                  "{activeProfile.jdContent}"
                </p>
              </div>
            </div>
         </div>
      </div>

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || resumeFiles.length === 0}
        className="w-full h-20 bg-primary text-primary-foreground rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl flex items-center justify-center gap-4 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <>
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Intelligence Engine Running...</span>
          </>
        ) : (
          <>
            <Zap className="h-6 w-6" />
            <span>Run Bulk Screening Intelligence</span>
          </>
        )}
      </button>

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex items-start gap-3 mt-6"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-black text-destructive uppercase tracking-widest leading-none">System Error</p>
            <p className="text-xs text-destructive/80 leading-relaxed">{errorMsg}</p>
          </div>
        </motion.div>
      )}

      {analysis && (
        <motion.div
          key="results"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-16 pt-16 border-t border-border"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-card border border-border rounded-[2.5rem] p-8 shadow-sm">
                <CandidateLeaderboard
                  candidates={analysis.candidates}
                  onDeepDive={(c) => {
                    setSelectedCandidate(c);
                    setIsDeepDiveOpen(true);
                  }}
                />
              </div>
            </div>
            <div className="lg:col-span-4 space-y-8">
              <HRInsightsReport analysis={analysis} />
            </div>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {isDeepDiveOpen && selectedCandidate && (
          <CandidateDeepDive
            candidate={selectedCandidate}
            onClose={() => setIsDeepDiveOpen(false)}
            onTailor={() => {}}
            isTailoring={false}
            onAcceptChange={() => {}}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
}
