import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useDropzone } from 'react-dropzone';
import {
  Briefcase,
  User,
  Search,
  FileText,
  Zap,
  ChevronRight,
  LayoutDashboard,
  Puzzle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Download,
  Copy,
  RefreshCw,
  Trophy,
  Target,
  BarChart3,
  Upload,
  Globe,
  ThumbsUp,
  ThumbsDown,
  XCircle,
  CheckCircle,
  Users,
  Eye,
  MessageSquare,
  ShieldCheck,
  Filter,
  Sparkles,
  Plus,
  Trash2,
  History,
  Sliders,
  Building2,
  School,
  X,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Check,
  Menu,
  BrainCircuit,
  TriangleAlert,
  LayoutGrid,
  MessageSquareQuote,
  Quote,
  ExternalLink
} from 'lucide-react';
import { cn } from './lib/utils';
import { Persona, RoleType, ExperienceTier, AnalysisResult, CandidateAnalysis, Competency, InputMode, CandidateProfile, ProposedChange, HiringPreferences, WorkExperience, JobProfile } from './types';
import { analyzeResumes, tailorResume, extractProfile } from './services/gemini';
import { MOCK_ANALYSIS } from './constants';
import { auth, signInWithGoogle, db, handleFirestoreError } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  setDoc,
  doc,
  serverTimestamp,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

import { Header } from './components/Header';
import { NavigationSidebar } from './components/NavigationSidebar';
import { HistorySidebar } from './components/HistorySidebar';
import { AuthOverlay } from './components/AuthOverlay';
import { MobileNav } from './components/MobileNav';
import { CandidateDeepDive } from './components/CandidateDeepDive';
import { PortfolioView } from './components/PortfolioView';
import { HiringPreferencesUI } from './components/HiringPreferencesUI';
import { FileUploadZone } from './components/FileUploadZone';
import { 
  KeywordCoverage, 
  FeedbackItem, 
  ImprovementStep, 
  CandidateLeaderboard, 
  Editor, 
  ExtensionPlaceholder 
} from './components/AnalysisComponents';
import { HRInsightsReport } from './components/HRInsightsReport';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { CandidateDashboard } from './components/CandidateDashboard';
import { BuilderControls } from './components/BuilderControls';

import {
  Tabs,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ROLE_WEIGHTS } from './constants/roles';
const fileToBase64 = (file: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      reject(new Error("Invalid file object provided to fileToBase64"));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- Main App ---

// --- Dashboard Shell for existing HR/Candidate UI ---
export interface DashboardShellProps {
  user: FirebaseUser | null;
  hasSkippedSignIn: boolean;
  handleSignIn: () => void;
  handleSkipSignIn: () => void;
  persona: Persona;
  setPersona: (p: Persona) => void;
  role: RoleType;
  setRole: (r: RoleType) => void;
  history: AnalysisResult[];
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (o: boolean) => void;
  selectedTier: ExperienceTier;
  setSelectedTier: (t: ExperienceTier) => void;
  selectedFeatures: string[];
  setSelectedFeatures: (f: string[]) => void;
  analysis: AnalysisResult | null;
  setAnalysis: (val: AnalysisResult | null) => void;
  resumeInputMode: InputMode;
  setResumeInputMode: (m: InputMode) => void;
  resumeFiles: File[];
  setResumeFiles: (f: File[]) => void;
  resume: string;
  setResume: (s: string) => void;
  resumeUrl: string;
  setResumeUrl: (u: string) => void;
  jdInputMode: InputMode;
  setJdInputMode: (m: InputMode) => void;
  jdFile: File | null;
  setJdFile: (f: File | null) => void;
  jd: string;
  setJd: (s: string) => void;
  jdUrl: string;
  setJdUrl: (u: string) => void;
  activeProfile: JobProfile;
  handleAnalyze: () => void;
  isAnalyzing: boolean;
  errorMsg: string | null;
  setErrorMsg: (m: string | null) => void;
  analysisState: "idle" | "loading" | "done";
  selectedCandidate: CandidateAnalysis | null;
  setSelectedCandidate: (c: CandidateAnalysis | null) => void;
  isDeepDiveOpen: boolean;
  setIsDeepDiveOpen: (o: boolean) => void;
  activeStep: number;
  setActiveStep: (s: number) => void;
  handleToggleSkill: (cid: string, s: string) => void;
  handleToggleFeature: (cid: string, type: 'strength' | 'weakness', idx: number) => void;
  handleFeatureFeedback: (cid: string, type: 'strength' | 'weakness', idx: number, f: string) => void;
  jobProfiles: JobProfile[];
  setJobProfiles: (p: JobProfile[]) => void;
  profile: CandidateProfile | null;
  setProfile: (p: CandidateProfile | null) => void;
  handleExtractProfile: (f: File) => void;
  isExtracting: boolean;
  handleTailor: (c: CandidateAnalysis) => void;
  isTailoring: boolean;
  tailoredResume: { fullText: string, changes: ProposedChange[] } | null;
  setTailoredResume: (val: { fullText: string, changes: ProposedChange[] } | null) => void;
}

const DashboardShell: React.FC<DashboardShellProps> = (props) => {
  const {
    user, hasSkippedSignIn, handleSignIn, handleSkipSignIn, persona, setPersona,
    role, setRole, history, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen,
    selectedTier, setSelectedTier, selectedFeatures, setSelectedFeatures, analysis, setAnalysis,
    resumeInputMode, setResumeInputMode, resumeFiles, setResumeFiles, resume, setResume,
    resumeUrl, setResumeUrl, jdInputMode, setJdInputMode, jdFile, setJdFile, jd, setJd,
    jdUrl, setJdUrl, activeProfile, handleAnalyze, isAnalyzing, errorMsg, setErrorMsg,
    analysisState, selectedCandidate, setSelectedCandidate, isDeepDiveOpen, setIsDeepDiveOpen,
    activeStep, setActiveStep, handleToggleSkill, handleToggleFeature, handleFeatureFeedback,
    jobProfiles, setJobProfiles, profile, setProfile, handleExtractProfile, isExtracting,
    handleTailor, isTailoring, tailoredResume, setTailoredResume
  } = props;

  const activeCandidate = analysis?.candidates[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50">
      <AnimatePresence>
        {!user && !hasSkippedSignIn && (
          <AuthOverlay
            onLogin={handleSignIn}
            onSkip={handleSkipSignIn}
          />
        )}
      </AnimatePresence>

      <Header
        persona={persona}
        setPersona={setPersona}
        role={role}
        setRole={setRole}
        user={user}
        onLogin={handleSignIn}
        onLogout={() => signOut(auth)}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
          setIsMobileMenuOpen(false);
        }}
        activeTab={activeTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        historyCount={history.length}
        tier={selectedTier}
        setTier={setSelectedTier}
      />

      <MobileNav 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setIsMobileMenuOpen(false);
        }}
        persona={persona}
        setPersona={setPersona}
        tier={selectedTier}
        setTier={setSelectedTier}
        history={history}
        onSelectHistory={(item) => {
          setAnalysis(item);
          setActiveTab('dashboard');
          setIsMobileMenuOpen(false);
        }}
        user={user}
        onLogin={handleSignIn}
        onLogout={() => signOut(auth)}
        selectedFeatures={selectedFeatures}
        setSelectedFeatures={setSelectedFeatures}
      />

      <div className="flex-1 flex overflow-hidden">
        <NavigationSidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          persona={persona}
          selectedFeatures={selectedFeatures}
          setSelectedFeatures={setSelectedFeatures}
        />

        <HistorySidebar 
          history={history}
          onSelect={(item) => {
            setAnalysis(item);
            setActiveTab('dashboard');
          }}
          activeAnalysisId={analysis?.id}
        />

        <main className="flex-1 overflow-auto bg-slate-50/50">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && persona === 'candidate' && (
              <CandidateDashboard {...props} />
            )}

            {activeTab === 'dashboard' && persona === 'hr' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-5xl mx-auto space-y-12 py-12 px-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge className="bg-indigo-600 text-white border-none text-[8px] font-black tracking-[0.25em] px-3 py-1">PROTOCOL ALPHA</Badge>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  <h1 className="text-5xl font-black tracking-tighter text-slate-900 leading-none">
                    Bulk Screening <span className="display-serif font-normal">Intelligence</span>
                  </h1>
                  <p className="text-slate-500 text-sm max-w-xl leading-relaxed">
                    Upload multiple resumes to rank them against your active Job Description using agentic vetting.
                  </p>
                </div>

                <div className="space-y-6">
                   <div className="bg-indigo-600 p-10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-indigo-100">
                      <div className="space-y-2">
                        <h3 className="text-3xl font-black tracking-tight uppercase italic">HR Command Center</h3>
                        <p className="text-indigo-100 font-medium max-w-xl">Deep-vet candidates against the {activeProfile.name} rubric.</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className="bg-white/20 text-white border-none text-[10px] font-black px-4 py-2 uppercase tracking-widest">Active Role: {activeProfile.name}</Badge>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">Candidate Pool (PDF/Images)</Label>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
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
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Job Description Profile</Label>
                          <button onClick={() => setActiveTab('preferences')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Change Role Settings</button>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
                          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="h-12 w-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                              <Target className="h-6 w-6 text-indigo-600" />
                            </div>
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Evaluating for</div>
                              <div className="text-sm font-black text-slate-900">{activeProfile.name}</div>
                            </div>
                          </div>
                          <p className="text-[10px] text-indigo-700/70 font-medium leading-relaxed italic line-clamp-3">
                            "{activeProfile.jdContent || 'No Job Description content provided for this role profile.'}"
                          </p>
                        </div>
                      </div>
                   </div>
                </div>

                <button
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || (resumeFiles.length === 0 || !activeProfile.jdContent)}
                  className="w-full h-20 bg-indigo-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.99] transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 disabled:opacity-50"
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
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-3 mt-6"
              >
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-rose-900 uppercase tracking-widest leading-none">Intelligence Error</p>
                  <p className="text-xs text-rose-700 leading-relaxed">{errorMsg}</p>
                  <button
                    onClick={() => setErrorMsg(null)}
                    className="text-[10px] font-bold text-rose-500 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              </motion.div>
            )}

            {analysisState !== 'idle' && persona === 'hr' && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-16 pt-16 border-t border-slate-200 px-6 max-w-7xl mx-auto"
              >
                {isAnalyzing ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-6">
                    <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
                    <p className="text-xs font-black text-slate-900 uppercase tracking-widest animate-pulse">Running Neural Vetting Protocol...</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {analysis && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="lg:col-span-8 space-y-8">
                          <div className="bg-white border border-slate-200/60 rounded-[2.5rem] p-8 shadow-sm">
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
                    )}
                  </div>
                )}
              </motion.div>
            )}



            {activeTab === 'portfolio' && (
              <motion.div
                key="portfolio"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full overflow-auto"
              >
                <PortfolioView
                  profile={profile}
                  onUpdate={setProfile}
                  onExtract={(file) => handleExtractProfile(file)}
                  isExtracting={isExtracting}
                />
              </motion.div>
            )}

            {activeTab === 'preferences' && persona === 'hr' && (
              <motion.div
                key="preferences"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-4xl mx-auto py-12 px-8 h-full"
              >
                <HiringPreferencesUI
                  profiles={jobProfiles}
                  onUpdate={setJobProfiles}
                />
              </motion.div>
            )}

            {activeTab === 'extension' && (
              <motion.div
                key="extension"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center h-full px-6"
              >
                <div className="max-w-md text-center space-y-8">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-10 animate-pulse" />
                    <Puzzle className="h-20 w-20 text-slate-300 mx-auto relative z-10" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Apply Autopilot</h2>
                      <Badge className="bg-slate-100 text-slate-400 border-none text-[8px] font-black px-2 py-1 uppercase tracking-widest">Protocol Beta</Badge>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      Our intelligent crawler will automatically scrape job descriptions and auto-fill complex applications using your verified career data.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button className="px-10 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-not-allowed transition-all">
                      Coming Soon to Chrome Store
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      <AnimatePresence>
        {isDeepDiveOpen && selectedCandidate && (
          <CandidateDeepDive
            candidate={selectedCandidate}
            onClose={() => setIsDeepDiveOpen(false)}
            onTailor={() => handleTailor(selectedCandidate)}
            isTailoring={isTailoring}
            onAcceptChange={(id) => {
              const newChanges = selectedCandidate!.proposedChanges?.map(c => c.id === id ? { ...c, accepted: true } : c);
              setSelectedCandidate({ ...selectedCandidate!, proposedChanges: newChanges });
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [targetMarket, setTargetMarket] = useState<string>(() => {
    return sessionStorage.getItem('targetMarket') || 'India';
  });
  const [hasSkippedSignIn, setHasSkippedSignIn] = useState(() => {
    return sessionStorage.getItem('hasSkippedSignIn') === 'true';
  });
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [persona, setPersona] = useState<Persona>(() => {
    return (sessionStorage.getItem('persona') as Persona) || 'candidate';
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analysis' | 'extension' | 'portfolio' | 'preferences'>(() => {
    return (sessionStorage.getItem('activeTab') as any) || 'dashboard';
  });
  const [role, setRole] = useState<RoleType>(() => {
    return (sessionStorage.getItem('role') as RoleType) || 'Product Manager';
  });
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([
    {
      id: 'pm-role',
      name: 'B2B Product Manager',
      role: 'Product Manager',
      jdContent: 'Seeking a Product Manager to lead SaaS initiatives...',
      preferences: { isTierIMandatory: false, isMBAMandatory: false, minExperienceYears: 3, preferredCompanies: [], mandatorySkills: ['Roadmap', 'Stakeholder Management'], topN: 20 }
    },
    {
      id: 'cpm-role',
      name: 'Consumer Product Manager',
      role: 'Consumer Product Manager',
      jdContent: 'Seeking a Consumer PM to drive user retention and PLG growth...',
      preferences: { isTierIMandatory: false, isMBAMandatory: false, minExperienceYears: 3, preferredCompanies: [], mandatorySkills: ['A/B Testing', 'Retention', 'User Psychology'], topN: 20 }
    },
    {
      id: 'pd-role',
      name: 'Product Designer',
      role: 'Product Designer',
      jdContent: 'Looking for a Senior Product Designer for our design system...',
      preferences: { isTierIMandatory: false, isMBAMandatory: false, minExperienceYears: 5, preferredCompanies: [], mandatorySkills: ['Figma', 'Design Systems', 'User Research'], topN: 20 }
    },
    {
      id: 'dev-role',
      name: 'Developer',
      role: 'Developer',
      jdContent: 'Full-stack developer with React/Node expertise...',
      preferences: { isTierIMandatory: true, isMBAMandatory: false, minExperienceYears: 4, preferredCompanies: [], mandatorySkills: ['React', 'Node.js', 'PostgreSQL'], topN: 20 }
    },
    {
      id: 'fo-role',
      name: "Founder's Office",
      role: "Founder's Office",
      jdContent: 'High-agency individual to drive strategic projects...',
      preferences: { isTierIMandatory: true, isMBAMandatory: true, minExperienceYears: 2, preferredCompanies: ['McKinsey', 'BCG', 'Bain'], mandatorySkills: ['Strategic Planning', 'Execution'], topN: 10 }
    }
  ]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const activeProfile = jobProfiles.find(p => p.id === activeProfileId) || jobProfiles[0];

  const [resume, setResume] = useState('');
  const [jd, setJd] = useState('');
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState('');
  const [jdUrl, setJdUrl] = useState('');
  const [resumeInputMode, setResumeInputMode] = useState<InputMode>('file');
  const [jdInputMode, setJdInputMode] = useState<InputMode>('file');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['score', 'competencies', 'strengths', 'weaknesses', 'questions', 'tailor']);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisState, setAnalysisState] = useState<"idle" | "loading" | "done">("idle");
  const [activeStep, setActiveStep] = useState(1);
  const [isTailoring, setIsTailoring] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateAnalysis, setCandidateAnalysis] = useState<AnalysisResult | null>(() => {
    const saved = sessionStorage.getItem('candidateAnalysis');
    return saved ? JSON.parse(saved) : null;
  });
  const [hrAnalysis, setHrAnalysis] = useState<AnalysisResult | null>(() => {
    const saved = sessionStorage.getItem('hrAnalysis');
    return saved ? JSON.parse(saved) : null;
  });
  const analysis = persona === 'hr' ? hrAnalysis : candidateAnalysis;
  const setAnalysis = (val: AnalysisResult | null) => {
    if (persona === 'hr') setHrAnalysis(val);
    else setCandidateAnalysis(val);
  };
  const [tailoredResume, setTailoredResume] = useState<{ fullText: string, changes: ProposedChange[] } | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateAnalysis | null>(null);
  const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
  const [expandedCompetencies, setExpandedCompetencies] = useState<number[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [appliedInsights, setAppliedInsights] = useState<{ question: string, answer: string }[]>([]);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<ExperienceTier>('Senior');

  useEffect(() => {
    sessionStorage.setItem('persona', persona);
    // If current tab is invalid for new persona, move to dashboard
    if (persona === 'candidate' && activeTab === 'preferences') {
      setActiveTab('dashboard');
    } else if (persona === 'hr' && activeTab === 'portfolio') {
      setActiveTab('dashboard');
    }
  }, [persona, activeTab]);

  useEffect(() => {
    sessionStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('targetMarket', targetMarket);
  }, [targetMarket]);

  useEffect(() => {
    sessionStorage.setItem('role', role);
  }, [role]);

  useEffect(() => {
    if (candidateAnalysis) {
      sessionStorage.setItem('candidateAnalysis', JSON.stringify(candidateAnalysis));
    } else {
      sessionStorage.removeItem('candidateAnalysis');
    }
  }, [candidateAnalysis]);

  useEffect(() => {
    if (hrAnalysis) {
      sessionStorage.setItem('hrAnalysis', JSON.stringify(hrAnalysis));
    } else {
      sessionStorage.removeItem('hrAnalysis');
    }
  }, [hrAnalysis]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setIsAuthLoading(false);
      if (user) {
        // Load history immediately so the user sees their data even if profile sync is slow/fails
        loadHistory(user.uid);

        // Sync user profile in background
        try {
          await setDoc(doc(db, 'users', user.uid), {
            userId: user.uid,
            email: user.email,
            displayName: user.displayName,
            createdAt: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.warn("Profile sync skipped (likely existing user)", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'analyses'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AnalysisResult));
      setHistory(items);
    } catch (error) {
      console.error("Error loading history", error);
    }
  };

  const saveAnalysis = async (userId: string, data: Partial<AnalysisResult>) => {
    try {
      const docRef = await addDoc(collection(db, 'analyses'), {
        ...data,
        userId,
        createdAt: serverTimestamp()
      });
      loadHistory(userId);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'analyses');
    }
  };

  const updateAnalysisInDb = async (analysisId: string, updates: Partial<AnalysisResult>) => {
    try {
      await updateDoc(doc(db, 'analyses', analysisId), updates);
      loadHistory(user!.uid);
    } catch (error) {
      handleFirestoreError(error, 'update', `analyses/${analysisId}`);
    }
  };

  const deleteAnalysis = async (analysisId: string) => {
    try {
      await deleteDoc(doc(db, 'analyses', analysisId));
      loadHistory(user!.uid);
      if (analysis?.id === analysisId) setAnalysis(null);
    } catch (error) {
      handleFirestoreError(error, 'delete', `analyses/${analysisId}`);
    }
  };

  const handleAnalyze = async (refinedAnswers?: { question: string, answer: string }[]) => {
    setIsAnalyzing(true);
    setAnalysisState("loading");
    setErrorMsg(null);
    try {
      let resumesInput: any[] = [];
      let jdInput: any = activeProfile.jdContent;

      // In candidate mode, we might use the manual JD inputs
      if (persona === 'candidate') {
        if (jdInputMode === 'file' && jdFile && jdFile instanceof Blob) {
          jdInput = { data: await fileToBase64(jdFile), mimeType: jdFile.type };
        } else if (jdInputMode === 'text' && jd) {
          jdInput = jd;
        } else if (jdInputMode === 'url' && jdUrl) {
          try {
            const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(jdUrl)}`);
            if (!proxyRes.ok) {
              throw new Error("Failed to fetch JD from URL.");
            }
            const data = await proxyRes.text();
            if (!data || data.trim() === '') throw new Error("Could not extract content from the provided URL.");
            // We pass the raw HTML/text to Gemini; it is excellent at parsing it natively.
            jdInput = data;
          } catch (err: any) {
            throw new Error(`JD URL Access Error: ${err.message}`);
          }
        }
      }

      // Final guard for JD
      if (!jdInput) {
        throw new Error("Job description is missing. Please provide a JD to compare against.");
      }

      // Ensure refinedAnswers is truly an array (prevents event object leak)
      const sanitizedRefined = Array.isArray(refinedAnswers) ? refinedAnswers : undefined;

      // Collect answers if not passed but exist in current analysis
      const currentAnswers = analysis?.candidates[0]?.discoveryQuestions
        ?.filter(q => q.answer)
        .map(q => ({ question: q.question, answer: q.answer! })) || [];

      const newAnswers = sanitizedRefined || currentAnswers;

      // Update global applied insights history
      if (newAnswers.length > 0) {
        setAppliedInsights(prev => {
          const unique = [...prev];
          newAnswers.forEach(na => {
            if (!unique.find(u => u.question === na.question)) {
              unique.push(na);
            }
          });
          return unique;
        });
      }

      const answersToUse = [...appliedInsights];
      newAnswers.forEach(na => {
        if (!answersToUse.find(u => u.question === na.question)) {
          answersToUse.push(na);
        }
      });

      // Handle Resumes
      if (resumeInputMode === 'file') {
        const validFiles = resumeFiles.filter(f => f && f instanceof Blob);
        if (validFiles.length === 0) throw new Error("No valid resume files found. Please upload at least one resume.");
        resumesInput = await Promise.all(validFiles.map(async f => ({ data: await fileToBase64(f), mimeType: f.type })));
      } else if (resumeInputMode === 'text') {
        if (!resume.trim()) throw new Error("Resume content is empty.");
        resumesInput = [resume];
      } else if (resumeInputMode === 'url') {
        if (!resumeUrl.trim()) throw new Error("Resume URL is missing.");
        try {
          const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(resumeUrl)}`);
          if (!proxyRes.ok) {
            throw new Error("Failed to fetch resume from URL.");
          }
          const data = await proxyRes.text();
          if (!data || data.trim() === '') throw new Error("Could not extract content from the provided Resume URL.");
          resumesInput = [data];
        } catch (err: any) {
          throw new Error(`Resume URL Access Error: ${err.message}`);
        }
      }

      const result = await analyzeResumes(
        resumesInput,
        jdInput,
        persona === 'hr' ? activeProfile.role : role,
        selectedTier,
        selectedFeatures,
        answersToUse,
        persona === 'hr' ? activeProfile.preferences : undefined,
        targetMarket
      );

      if (!result.candidates || result.candidates.length === 0) {
        throw new Error("No analysis could be generated for the provided resumes. Please check the content and try again.");
      }

      let finalAnalysis = result;
      if (user) {
        try {
          const id = await saveAnalysis(user.uid, result);
          if (id) finalAnalysis = { ...result, id };
        } catch (saveError) {
          console.warn("Failed to save analysis to cloud, proceeding with local version", saveError);
          // Don't throw here, let the user see the result anyway
        }
      }

      setAnalysis(finalAnalysis);
      setAnalysisState("done");
      setActiveStep(1);

      // If we provided answers, automatically trigger a resume tailoring to reflect the new insights
      if (answersToUse.length > 0 && result.candidates.length > 0) {
        await handleTailor(result.candidates[0], result.jdContent);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error instanceof Error ? error.message : "An unexpected error occurred during intelligence analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTailor = async (candidate: CandidateAnalysis, customJd?: string) => {
    setIsTailoring(true);
    try {
      const jdToUse = customJd || analysis?.jdContent || "";
      const { fullText, changes } = await tailorResume(candidate.resumeContent, jdToUse, candidate, targetMarket);

      const formattedChanges: ProposedChange[] = changes.map(c => ({
        ...c,
        accepted: true // Default to accepted
      }));

      setTailoredResume({ fullText, changes: formattedChanges });

      // Persist tailoring result to the analysis object in DB
      if (user && analysis?.id) {
        const updatedCandidates = analysis.candidates.map(c =>
          c.id === candidate.id ? { ...c, tailoredResume: fullText, proposedChanges: formattedChanges } : c
        );
        await updateAnalysisInDb(analysis.id, { candidates: updatedCandidates });
        setAnalysis({ ...analysis, candidates: updatedCandidates });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsTailoring(false);
    }
  };

  const syncAnalysis = async (updated: AnalysisResult) => {
    setAnalysis(updated);
    if (user && updated.id) {
      await updateAnalysisInDb(updated.id, { candidates: updated.candidates });
    }
  };

  const handleToggleCompetency = (candidateId: string, compName: string) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      candidates: analysis.candidates.map(c =>
        c.id === candidateId
          ? { ...c, competencies: c.competencies.map(comp => comp.name === compName ? { ...comp, accepted: comp.accepted === false ? true : false } : comp) }
          : c
      )
    };
    syncAnalysis(updated);
  };

  const handleCompFeedback = (candidateId: string, compName: string, feedback: string) => {
    alert(`Feedback for ${compName}: ${feedback}. AI will refine the analysis.`);
  };

  const handleAnswerQuestion = (candidateId: string, questionIdx: number, answer: string) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      candidates: analysis.candidates.map(c =>
        c.id === candidateId
          ? {
            ...c,
            discoveryQuestions: c.discoveryQuestions.map((q, idx) =>
              idx === questionIdx ? { ...q, answer } : q
            )
          }
          : c
      )
    };
    syncAnalysis(updated);
  };

  const handleExtractProfile = async (file?: File) => {
    setIsExtracting(true);
    try {
      let input: any = resume;
      const fileFromState = resumeFiles.find(f => f && f instanceof Blob) || null;
      const fileToUse = (file && file instanceof Blob) ? file : fileFromState;

      if (fileToUse) {
        input = { data: await fileToBase64(fileToUse), mimeType: fileToUse.type };
      } else if (resumeInputMode === 'url' && resumeUrl) {
        try {
          const proxyRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(resumeUrl)}`);
          if (!proxyRes.ok) {
            throw new Error("Failed to fetch resume from URL.");
          }
          const data = await proxyRes.text();
          if (!data || data.trim() === '') throw new Error("Could not extract content from the provided Resume URL.");
          input = data;
        } catch (err: any) {
          throw new Error(`Resume URL Access Error: ${err.message}`);
        }
      } else if (resumeInputMode === 'text' && resume) {
        input = resume;
      } else {
        alert("Please provide a resume first.");
        setIsExtracting(false);
        return;
      }

      const result = await extractProfile(input);
      setProfile(result);
      setErrorMsg(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error("Extraction error:", error);
      setErrorMsg(`Profile Extraction Failed: ${error.message || "An unexpected error occurred."}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleToggleFeature = (candidateId: string, type: 'strength' | 'weakness', index: number) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      candidates: analysis.candidates.map(c =>
        c.id === candidateId
          ? {
            ...c,
            [type === 'strength' ? 'strengths' : 'weaknesses']: (c[type === 'strength' ? 'strengths' : 'weaknesses'] as any[]).map((item, i) =>
              i === index ? { ...item, accepted: item.accepted === false ? true : false } : item
            )
          }
          : c
      )
    };
    syncAnalysis(updated);
  };

  const handleToggleSkill = (candidateId: string, skill: string) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      candidates: analysis.candidates.map(c => {
        if (c.id === candidateId) {
          const confirmed = c.confirmedSkills || [];
          return {
            ...c,
            confirmedSkills: confirmed.includes(skill)
              ? confirmed.filter(s => s !== skill)
              : [...confirmed, skill]
          };
        }
        return c;
      })
    };
    syncAnalysis(updated);
  };

  const handleFeatureFeedback = (candidateId: string, type: 'strength' | 'weakness', index: number, feedback: string) => {
    if (!analysis) return;
    const updated = {
      ...analysis,
      candidates: analysis.candidates.map(c =>
        c.id === candidateId
          ? {
            ...c,
            [type === 'strength' ? 'strengths' : 'weaknesses']: (c[type === 'strength' ? 'strengths' : 'weaknesses'] as any[]).map((item, i) =>
              i === index ? { ...item, feedback } : item
            )
          }
          : c
      )
    };
    syncAnalysis(updated);
    alert(`Feedback for ${type}: ${feedback}. AI will refine the logic.`);
  };

  const activeCandidate = analysis?.candidates[0] || null;
  const isPreview = !analysis;

  const handleSkipSignIn = () => {
    setHasSkippedSignIn(true);
    sessionStorage.setItem('hasSkippedSignIn', 'true');
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      handleSkipSignIn(); // Also mark as skipped so overlay doesn't reappear
    } catch (error) {
      console.error("Sign in failed", error);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const dashboardProps: DashboardShellProps = {
    user, hasSkippedSignIn, handleSignIn, handleSkipSignIn, persona, setPersona,
    role, setRole, history, activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen,
    selectedTier, setSelectedTier, selectedFeatures, setSelectedFeatures, analysis, setAnalysis,
    resumeInputMode, setResumeInputMode, resumeFiles, setResumeFiles, resume, setResume,
    resumeUrl, setResumeUrl, jdInputMode, setJdInputMode, jdFile, setJdFile, jd, setJd,
    jdUrl, setJdUrl, activeProfile, handleAnalyze, isAnalyzing, errorMsg, setErrorMsg,
    analysisState, selectedCandidate, setSelectedCandidate, isDeepDiveOpen, setIsDeepDiveOpen,
    activeStep, setActiveStep, handleToggleSkill, handleToggleFeature, handleFeatureFeedback,
    jobProfiles, setJobProfiles, profile, setProfile, handleExtractProfile, isExtracting,
    handleTailor, isTailoring, tailoredResume, setTailoredResume
  };

  return (
    <>
    <Routes>
      <Route path="/" element={
        <DashboardShell {...dashboardProps} />
      } />
      <Route path="/candidate-dashboard" element={<Navigate to="/" replace />} />
      <Route path="/dashboard" element={<DashboardShell {...dashboardProps} />} />
      <Route path="/portfolio" element={<DashboardShell {...dashboardProps} />} />
      <Route path="/preferences" element={<DashboardShell {...dashboardProps} />} />
      <Route path="/extension" element={<DashboardShell {...dashboardProps} />} />
      <Route path="/hr/login" element={<DashboardShell {...dashboardProps} persona="hr" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <BuilderControls />
  </>
  );
}
