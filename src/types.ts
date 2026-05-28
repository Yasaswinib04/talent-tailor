export type Persona = 'candidate' | 'hr';

export type RoleType = 
  | 'Product Manager' 
  | 'Consumer Product Manager'
  | 'Product Designer' 
  | 'Designer'
  | 'Marketing' 
  | 'Growth Marketing'
  | 'Brand Marketing'
  | 'Sales' 
  | "Founder's Office" 
  | 'Chief of Staff' 
  | 'Frontend Developer'
  | 'Backend Developer'
  | 'Full Stack Developer'
  | 'QA' 
  | 'Analytics' 
  | 'Data Scientist'
  | 'AI / ML Engineer'
  | 'Data Engineer' 
  | 'Finance' 
  | 'Other';

export type ExperienceTier = 'Junior' | 'Mid-Level' | 'Senior' | 'Lead' | 'Director' | 'Executive';

export type IndustryType =
  | 'Technology / SaaS'
  | 'FinTech'
  | 'Healthcare'
  | 'E-Commerce'
  | 'EdTech'
  | 'Enterprise'
  | 'Consulting'
  | 'Other';

export type SkillCategory = 'technical' | 'analytics' | 'softSkills' | 'tools';

export interface RoleSkill {
  name: string;
  category: SkillCategory;
  isPreferred?: boolean;
}

export type InputMode = 'file' | 'text' | 'url';

export interface Competency {
  name: string;
  score: number;
  evidence: string;
  accepted?: boolean;
  feedback?: string;
}

export interface WorkExperience {
  company: string;
  designation: string;
  location: string;
  description?: string;
  period?: string;
}

export interface Education {
  degree: string;
  gpa: string;
  college: string;
  specialization?: string;
  graduationYear: string;
}

export interface CandidateProfile {
  name: string;
  email?: string;
  phone?: string;
  noticePeriod: string;
  currentCTC: string;
  expectedCTC: string;
  currentLocation: string;
  preferredLocation: string;
  totalWorkExperience: string;
  strengths: string[];
  weaknesses: string[];
  education: Education[];
  workHistory: WorkExperience[];
  resumeContent?: string;
  targetMarket?: string;
}

export interface ProposedChange {
  id: string;
  original: string;
  suggested: string;
  reason: string;
  accepted?: boolean;
}

export interface HiringPreferences {
  isTierIMandatory: boolean;
  isMBAMandatory: boolean;
  minExperienceYears: number;
  preferredCompanies: string[];
  mandatorySkills: string[];
  preferredSkills?: string[];
  maxFailedCriteria?: number;
  topN: number;
  scoringWeights?: { technical: number; experience: number; domain: number; education: number; softSkills: number; custom?: Record<string, number> };
}

export interface CandidateAnalysis {
  id: string;
  name: string;
  score: number;
  strengths: { text: string; accepted?: boolean; feedback?: string }[];
  weaknesses: { text: string; accepted?: boolean; feedback?: string }[];
  overallFeedback: string;
  gaps: string[];
  discoveryQuestions: { question: string; answer?: string }[];
  resumeContent: string;
  tailoredResume?: string;
  proposedChanges?: ProposedChange[];
  competencies: Competency[];
  meetsMandatoryCriteria?: boolean;
  failedCriteria?: string[];
  experienceYears?: string;
  atsScore?: number;
  keywords?: {
    present: string[];
    missing: string[];
  };
  confirmedSkills?: string[];
  roleType: RoleType;
  experienceTier: ExperienceTier;
}

export interface JobProfile {
  id: string;
  name: string;
  role: RoleType;
  industry?: IndustryType;
  jdContent: string;
  preferences: HiringPreferences;
}

export interface AnalysisResult {
  id?: string;
  profileId?: string;
  role: RoleType;
  jdContent: string;
  candidates: CandidateAnalysis[];
  preferences?: HiringPreferences;
  targetMarket?: string;
  createdAt: string;
}

export interface TailoredResume {
  id?: string;
  analysisId?: string;
  original: string;
  tailored: string;
  wordCount: number;
  experienceYears: number;
  createdAt: string;
}
