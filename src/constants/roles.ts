import { RoleType, ExperienceTier } from '../types';

export interface RoleWeight {
  technical: number;
  experience: number;
  domain: number;
  education: number;
  softSkills: number;
  topPriority: string;
  competencies: string[]; // Tailored competencies for this role
  custom?: Record<string, number>;
}

export const ROLE_WEIGHTS: Record<RoleType, RoleWeight> = {
  'Product Manager': {
    technical: 15,
    experience: 25,
    domain: 20,
    education: 10,
    softSkills: 30,
    topPriority: 'Product lifecycle, stakeholder management, and roadmap execution.',
    competencies: ['Product Strategy', 'Roadmapping', 'Agile/Scrum', 'Market Analysis', 'Cross-functional Leadership', 'Data-Driven Decisions', 'User Analytics']
  },
  'Consumer Product Manager': {
    technical: 5,
    experience: 25,
    domain: 20,
    education: 5,
    softSkills: 45,
    topPriority: 'User empathy, retention loops, and consumer psychology.',
    competencies: ['User Centricity', 'Empathy', 'Consumer Psychology', 'A/B Testing', 'Retention Loops', 'UI/UX Sensitivity', 'Customer Journey Mapping']
  },
  'Product Designer': {
    technical: 35,
    experience: 20,
    domain: 20,
    education: 5,
    softSkills: 20,
    topPriority: 'Portfolio quality, UX methodology, and visual precision.',
    competencies: ['Design Systems', 'Figma/Prototyping', 'User Research', 'Information Architecture', 'Visual Design', 'Interaction Design', 'Usability Testing']
  },
  'Designer': {
    technical: 30,
    experience: 20,
    domain: 15,
    education: 5,
    softSkills: 15,
    topPriority: 'Portfolio Quality & Design Thinking',
    competencies: ['Graphic Design', 'Branding', 'Typography', 'Creative Direction', 'Adobe Creative Suite', 'Layout Design', 'Design Thinking'],
    custom: { portfolioSignal: 15 }
  },
  'Developer': {
    technical: 50,
    experience: 20,
    domain: 10,
    education: 5,
    softSkills: 15,
    topPriority: 'Architecture, clean code, and stack depth.',
    competencies: ['System Design', 'Code Quality', 'Framework Proficiency', 'Problem Solving', 'Unit Testing', 'CI/CD Pipelines', 'Performance Optimization']
  },
  'QA': {
    technical: 40,
    experience: 20,
    domain: 15,
    education: 5,
    softSkills: 20,
    topPriority: 'Automation coverage, edge-case detection, and quality gates.',
    competencies: ['Automation Testing', 'Test Strategy', 'Regression Testing', 'Bug Documentation', 'Performance Testing', 'API Testing', 'Security Vetting']
  },
  'Analytics': {
    technical: 35,
    experience: 15,
    domain: 25,
    education: 15,
    softSkills: 10,
    topPriority: 'Data storytelling, SQL/BI tools, and business impact.',
    competencies: ['SQL Mastery', 'Statistical Analysis', 'Data Visualization', 'Storytelling', 'Experimentation (A/B)', 'Forecasting', 'Metric Frameworks']
  },
  'Data Engineer': {
    technical: 55,
    experience: 20,
    domain: 10,
    education: 5,
    softSkills: 10,
    topPriority: 'Pipeline scalability, ETL efficiency, and data modeling.',
    competencies: ['Data Modeling', 'ETL/ELT Pipelines', 'Cloud Infrastructure', 'Big Data Tools', 'System Reliability', 'Data Governance', 'Schema Design']
  },
  'Marketing': {
    technical: 10,
    experience: 25,
    domain: 30,
    education: 10,
    softSkills: 25,
    topPriority: 'CAC/LTV optimization, brand narrative, and growth loops.',
    competencies: ['Campaign Management', 'Content Strategy', 'Market Research', 'Vendor Management', 'Channel Strategy', 'Budget Allocation', 'Public Relations']
  },
  'Growth Marketing': {
    technical: 20,
    experience: 25,
    domain: 25,
    education: 5,
    softSkills: 25,
    topPriority: 'Funnel Metrics & CAC/ROAS',
    competencies: ['Performance Marketing', 'Funnel Optimization', 'Conversion Rate (CRO)', 'Marketing Analytics', 'Growth Loops', 'Viral Mechanics', 'Customer Acquisition']
  },
  'Brand Marketing': {
    technical: 5,
    experience: 20,
    domain: 20,
    education: 10,
    softSkills: 45,
    topPriority: 'Campaign Impact & Storytelling',
    competencies: ['Brand Narrative', 'Copywriting', 'Creative Strategy', 'Community Management', 'Influencer Marketing', 'Brand Positioning', 'Event Marketing']
  },
  'Sales': {
    technical: 5,
    experience: 30,
    domain: 25,
    education: 5,
    softSkills: 35,
    topPriority: 'Quota history, relationship building, and closing velocity.',
    competencies: ['Lead Generation', 'Negotiation', 'CRM Proficiency', 'Closing Strategy', 'Pipeline Management', 'Customer Relationship', 'Sales Forecasting']
  },
  "Founder's Office": {
    technical: 15,
    experience: 15,
    domain: 20,
    education: 20,
    softSkills: 30,
    topPriority: 'Problem solving, high-agency execution, and strategic leverage.',
    competencies: ['High Agency', 'Strategic Planning', 'Investor Relations', 'Business Operations', 'Market Expansion', 'Fundraising Support', 'Cross-functional Ops']
  },
  'Chief of Staff': {
    technical: 5,
    experience: 25,
    domain: 10,
    education: 5,
    softSkills: 40,
    topPriority: 'Context Breadth & Founder Proximity',
    competencies: ['Executive Presence', 'Internal Communications', 'Strategic Alignment', 'Project Management', 'Decision Support', 'Confidentiality', 'Diplomacy'],
    custom: { contextBreadth: 15 }
  },
  'Finance': {
    technical: 10,
    experience: 30,
    domain: 30,
    education: 20,
    softSkills: 10,
    topPriority: 'Accuracy, Compliance & P&L Ownership',
    competencies: ['Financial Modeling', 'Budgeting/Forecasting', 'P&L Management', 'Audit & Compliance', 'VBA/Excel Mastery', 'Risk Assessment', 'Tax Strategy']
  },
  'Other': {
    technical: 20,
    experience: 20,
    domain: 20,
    education: 20,
    softSkills: 20,
    topPriority: 'General professional excellence and role-agnostic impact.',
    competencies: ['Professionalism', 'Communication', 'Problem Solving', 'Reliability', 'Technical Literacy', 'Collaboration', 'Adaptability']
  }
};

export interface WeightShift {
  technical?: number;
  experience?: number;
  domain?: number;
  education?: number;
  softSkills?: number;
}

export interface TierInfo {
  minExp: number;
  maxExp: number;
  focus: string;
  questionType: string;
  weightShift: WeightShift;
}

export const TIER_CONFIG: Record<ExperienceTier, TierInfo> = {
  'Junior': { 
    minExp: 0, 
    maxExp: 2, 
    focus: 'Execution & Learning', 
    questionType: 'Technical Fundamentals',
    weightShift: { technical: 1.2, education: 1.5, experience: 0.5 } 
  },
  'Mid-Level': { 
    minExp: 2, 
    maxExp: 5, 
    focus: 'Ownership & Delivery', 
    questionType: 'Problem Solving',
    weightShift: { technical: 1.1, experience: 1.1 } 
  },
  'Senior': { 
    minExp: 5, 
    maxExp: 8, 
    focus: 'Architecture & Mentorship', 
    questionType: 'Systemic Thinking',
    weightShift: { experience: 1.3, domain: 1.2, education: 0.7 } 
  },
  'Lead': { 
    minExp: 8, 
    maxExp: 12, 
    focus: 'Strategy & Impact', 
    questionType: 'Leadership & Conflict',
    weightShift: { softSkills: 1.3, domain: 1.2, education: 0.5 } 
  },
  'Director': { 
    minExp: 12, 
    maxExp: 15, 
    focus: 'Organization & Scale', 
    questionType: 'High-Level Strategy',
    weightShift: { softSkills: 1.4, experience: 1.4, technical: 0.5 } 
  },
  'Executive': { 
    minExp: 15, 
    maxExp: 40, 
    focus: 'Vision & P&L', 
    questionType: 'Business Transformation',
    weightShift: { softSkills: 1.5, domain: 1.5, technical: 0.3 } 
  }
};

export const getEffectiveWeights = (role: RoleType, tier: ExperienceTier) => {
  const base = ROLE_WEIGHTS[role] || ROLE_WEIGHTS['Other'];
  const shift: WeightShift = TIER_CONFIG[tier].weightShift;

  // Calculate raw shifted values
  let technical = base.technical * (shift.technical ?? 1);
  let experience = base.experience * (shift.experience ?? 1);
  let domain = base.domain * (shift.domain ?? 1);
  let education = base.education * (shift.education ?? 1);
  let softSkills = base.softSkills * (shift.softSkills ?? 1);

  // Normalize back to 100%
  const total = technical + experience + domain + education + softSkills;

  return {
    technical: Math.round((technical / total) * 100),
    experience: Math.round((experience / total) * 100),
    domain: Math.round((domain / total) * 100),
    education: Math.round((education / total) * 100),
    softSkills: Math.round((softSkills / total) * 100),
    focus: TIER_CONFIG[tier].focus,
    topPriority: base.topPriority,
    competencies: base.competencies
  };
};
