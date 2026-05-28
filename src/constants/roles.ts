import { RoleType, ExperienceTier, IndustryType, RoleSkill } from '../types';

export interface RoleWeight {
  technical: number;
  experience: number;
  domain: number;
  education: number;
  softSkills: number;
  topPriority: string;
  competencies: string[];
  roleSkills: RoleSkill[];
  custom?: Record<string, number>;
}

export const ROLE_WEIGHTS: Record<RoleType, RoleWeight> = {
  'Product Manager': {
    technical: 15, experience: 25, domain: 20, education: 10, softSkills: 30,
    topPriority: 'Product lifecycle, stakeholder management, and roadmap execution.',
    competencies: ['Product Strategy', 'Roadmapping', 'Agile/Scrum', 'Market Analysis', 'Cross-functional Leadership', 'Data-Driven Decisions', 'User Analytics'],
    roleSkills: [
      { name: 'Product Strategy', category: 'technical' },
      { name: 'Roadmapping', category: 'technical' },
      { name: 'Agile / Scrum', category: 'tools' },
      { name: 'Market Analysis', category: 'analytics' },
      { name: 'Cross-functional Leadership', category: 'softSkills' },
      { name: 'Data-Driven Decisions', category: 'analytics' },
      { name: 'User Analytics', category: 'analytics' },
      { name: 'Stakeholder Management', category: 'softSkills' },
      { name: 'A/B Testing', category: 'analytics' },
      { name: 'SQL', category: 'technical' },
      { name: 'JIRA / Linear', category: 'tools' },
      { name: 'Figma', category: 'tools', isPreferred: true },
      { name: 'Pricing Strategy', category: 'analytics', isPreferred: true },
      { name: 'Go-to-Market', category: 'softSkills', isPreferred: true },
    ],
  },
  'Consumer Product Manager': {
    technical: 5, experience: 25, domain: 20, education: 5, softSkills: 45,
    topPriority: 'User empathy, retention loops, and consumer psychology.',
    competencies: ['User Centricity', 'Empathy', 'Consumer Psychology', 'A/B Testing', 'Retention Loops', 'UI/UX Sensitivity', 'Customer Journey Mapping'],
    roleSkills: [
      { name: 'User Centricity', category: 'softSkills' },
      { name: 'Empathy', category: 'softSkills' },
      { name: 'Consumer Psychology', category: 'analytics' },
      { name: 'A/B Testing', category: 'analytics' },
      { name: 'Retention Loops', category: 'analytics' },
      { name: 'UI/UX Sensitivity', category: 'softSkills' },
      { name: 'Customer Journey Mapping', category: 'analytics' },
      { name: 'Growth Hacking', category: 'technical' },
      { name: 'Conversion Optimization', category: 'analytics' },
      { name: 'User Research', category: 'softSkills' },
      { name: 'Amplitude / Mixpanel', category: 'tools' },
      { name: 'Figma', category: 'tools', isPreferred: true },
      { name: 'SQL', category: 'technical', isPreferred: true },
      { name: 'Content Strategy', category: 'softSkills', isPreferred: true },
    ],
  },
  'Product Designer': {
    technical: 35, experience: 20, domain: 20, education: 5, softSkills: 20,
    topPriority: 'Portfolio quality, UX methodology, and visual precision.',
    competencies: ['Design Systems', 'Figma/Prototyping', 'User Research', 'Information Architecture', 'Visual Design', 'Interaction Design', 'Usability Testing'],
    roleSkills: [
      { name: 'Design Systems', category: 'technical' },
      { name: 'Figma', category: 'tools' },
      { name: 'Prototyping', category: 'tools' },
      { name: 'User Research', category: 'softSkills' },
      { name: 'Information Architecture', category: 'technical' },
      { name: 'Visual Design', category: 'technical' },
      { name: 'Interaction Design', category: 'technical' },
      { name: 'Usability Testing', category: 'analytics' },
      { name: 'Design Thinking', category: 'softSkills' },
      { name: 'Atomic Design', category: 'technical', isPreferred: true },
      { name: 'Framer / Webflow', category: 'tools', isPreferred: true },
      { name: 'Adobe Creative Suite', category: 'tools', isPreferred: true },
      { name: 'Accessibility (WCAG)', category: 'softSkills', isPreferred: true },
      { name: 'Storybook', category: 'tools', isPreferred: true },
    ],
  },
  'Designer': {
    technical: 30, experience: 20, domain: 15, education: 5, softSkills: 15,
    topPriority: 'Portfolio Quality & Design Thinking',
    competencies: ['Graphic Design', 'Branding', 'Typography', 'Creative Direction', 'Adobe Creative Suite', 'Layout Design', 'Design Thinking'],
    custom: { portfolioSignal: 15 },
    roleSkills: [
      { name: 'Graphic Design', category: 'technical' },
      { name: 'Branding', category: 'softSkills' },
      { name: 'Typography', category: 'technical' },
      { name: 'Creative Direction', category: 'softSkills' },
      { name: 'Adobe Creative Suite', category: 'tools' },
      { name: 'Layout Design', category: 'technical' },
      { name: 'Design Thinking', category: 'softSkills' },
      { name: 'Motion Design', category: 'technical', isPreferred: true },
      { name: 'Illustration', category: 'technical', isPreferred: true },
      { name: 'Figma', category: 'tools', isPreferred: true },
      { name: 'Print Production', category: 'tools', isPreferred: true },
      { name: '3D / Blender', category: 'tools', isPreferred: true },
    ],
  },
  'Frontend Developer': {
    technical: 50, experience: 20, domain: 5, education: 5, softSkills: 20,
    topPriority: 'UI architecture, Core Web Vitals, component design systems.',
    competencies: ['React', 'TypeScript', 'CSS', 'Performance', 'Testing', 'Accessibility', 'State Management'],
    roleSkills: [
      { name: 'React', category: 'technical' },
      { name: 'TypeScript', category: 'technical' },
      { name: 'CSS / Tailwind', category: 'technical' },
      { name: 'Performance Optimization', category: 'technical' },
      { name: 'Testing (Jest / Cypress)', category: 'technical' },
      { name: 'Accessibility (a11y)', category: 'softSkills' },
      { name: 'State Management', category: 'technical' },
      { name: 'Design Systems', category: 'technical' },
      { name: 'Responsive Design', category: 'technical' },
      { name: 'Next.js', category: 'technical', isPreferred: true },
      { name: 'GraphQL', category: 'technical', isPreferred: true },
      { name: 'Storybook', category: 'tools', isPreferred: true },
      { name: 'Web APIs', category: 'technical', isPreferred: true },
      { name: 'Bundlers (Vite/Webpack)', category: 'tools', isPreferred: true },
    ],
  },
  'Backend Developer': {
    technical: 55, experience: 20, domain: 5, education: 5, softSkills: 15,
    topPriority: 'API design, database optimization, system reliability.',
    competencies: ['Node.js', 'Python', 'PostgreSQL', 'API Design', 'Microservices', 'System Design', 'Docker'],
    roleSkills: [
      { name: 'Node.js / Python', category: 'technical' },
      { name: 'PostgreSQL', category: 'technical' },
      { name: 'API Design (REST/GraphQL)', category: 'technical' },
      { name: 'Microservices', category: 'technical' },
      { name: 'System Design', category: 'technical' },
      { name: 'Docker', category: 'tools' },
      { name: 'Auth (OAuth / JWT)', category: 'technical' },
      { name: 'Caching (Redis)', category: 'technical' },
      { name: 'Message Queues (Kafka/RabbitMQ)', category: 'technical' },
      { name: 'Kubernetes', category: 'tools', isPreferred: true },
      { name: 'Go', category: 'technical', isPreferred: true },
      { name: 'Java / Spring', category: 'technical', isPreferred: true },
      { name: 'CI/CD Pipelines', category: 'tools', isPreferred: true },
      { name: 'Observability (Datadog/Grafana)', category: 'tools', isPreferred: true },
    ],
  },
  'Full Stack Developer': {
    technical: 50, experience: 20, domain: 5, education: 5, softSkills: 20,
    topPriority: 'End-to-end delivery, architecture decisions, full ownership.',
    competencies: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'System Design', 'Docker', 'API Design'],
    roleSkills: [
      { name: 'React', category: 'technical' },
      { name: 'Node.js', category: 'technical' },
      { name: 'TypeScript', category: 'technical' },
      { name: 'PostgreSQL', category: 'technical' },
      { name: 'System Design', category: 'technical' },
      { name: 'Docker', category: 'tools' },
      { name: 'API Design', category: 'technical' },
      { name: 'CI/CD', category: 'tools' },
      { name: 'Testing', category: 'technical' },
      { name: 'Next.js', category: 'technical', isPreferred: true },
      { name: 'GraphQL', category: 'technical', isPreferred: true },
      { name: 'AWS / GCP', category: 'tools', isPreferred: true },
      { name: 'Kubernetes', category: 'tools', isPreferred: true },
      { name: 'UI/UX Fundamentals', category: 'softSkills', isPreferred: true },
    ],
  },
  'QA': {
    technical: 40, experience: 20, domain: 15, education: 5, softSkills: 20,
    topPriority: 'Automation coverage, edge-case detection, and quality gates.',
    competencies: ['Automation Testing', 'Test Strategy', 'Regression Testing', 'Bug Documentation', 'Performance Testing', 'API Testing', 'Security Vetting'],
    roleSkills: [
      { name: 'Automation Testing', category: 'technical' },
      { name: 'Test Strategy', category: 'analytics' },
      { name: 'Regression Testing', category: 'technical' },
      { name: 'Bug Documentation', category: 'softSkills' },
      { name: 'Performance Testing', category: 'technical' },
      { name: 'API Testing', category: 'technical' },
      { name: 'Security Vetting', category: 'technical' },
      { name: 'Cypress / Playwright', category: 'tools' },
      { name: 'Selenium', category: 'tools' },
      { name: 'CI/CD Integration', category: 'tools' },
      { name: 'Postman', category: 'tools', isPreferred: true },
      { name: 'JMeter / k6', category: 'tools', isPreferred: true },
      { name: 'Test Case Management', category: 'softSkills', isPreferred: true },
    ],
  },
  'Analytics': {
    technical: 35, experience: 15, domain: 25, education: 15, softSkills: 10,
    topPriority: 'Data storytelling, SQL/BI tools, and business impact.',
    competencies: ['SQL Mastery', 'Statistical Analysis', 'Data Visualization', 'Storytelling', 'Experimentation', 'Forecasting', 'Metric Frameworks'],
    roleSkills: [
      { name: 'SQL', category: 'technical' },
      { name: 'Statistical Analysis', category: 'analytics' },
      { name: 'Data Visualization', category: 'analytics' },
      { name: 'Storytelling', category: 'softSkills' },
      { name: 'A/B Testing', category: 'analytics' },
      { name: 'Forecasting', category: 'analytics' },
      { name: 'Metric Frameworks', category: 'analytics' },
      { name: 'Python / R', category: 'technical' },
      { name: 'Tableau / Looker', category: 'tools' },
      { name: 'ETL Pipelines', category: 'technical', isPreferred: true },
      { name: 'Amplitude / Mixpanel', category: 'tools', isPreferred: true },
      { name: 'dbt', category: 'tools', isPreferred: true },
      { name: 'Product Analytics', category: 'analytics', isPreferred: true },
    ],
  },
  'Data Scientist': {
    technical: 40, experience: 15, domain: 25, education: 10, softSkills: 10,
    topPriority: 'Model accuracy, experimentation rigor, business impact.',
    competencies: ['Python', 'SQL', 'Machine Learning', 'Statistical Modeling', 'A/B Testing', 'Data Visualization', 'Feature Engineering'],
    roleSkills: [
      { name: 'Python', category: 'technical' },
      { name: 'SQL', category: 'technical' },
      { name: 'Machine Learning', category: 'technical' },
      { name: 'Statistical Modeling', category: 'analytics' },
      { name: 'A/B Testing', category: 'analytics' },
      { name: 'Data Visualization', category: 'analytics' },
      { name: 'Feature Engineering', category: 'technical' },
      { name: 'Model Deployment', category: 'technical' },
      { name: 'NLP', category: 'technical' },
      { name: 'PyTorch / TensorFlow', category: 'tools', isPreferred: true },
      { name: 'Spark', category: 'tools', isPreferred: true },
      { name: 'MLOps', category: 'technical', isPreferred: true },
      { name: 'Deep Learning', category: 'technical', isPreferred: true },
      { name: 'Recommendation Systems', category: 'technical', isPreferred: true },
    ],
  },
  'AI / ML Engineer': {
    technical: 55, experience: 15, domain: 10, education: 10, softSkills: 10,
    topPriority: 'Production ML pipelines, inference optimization, model serving.',
    competencies: ['Python', 'PyTorch', 'MLOps', 'Model Serving', 'Kubernetes', 'Data Pipelines', 'LLMs / RAG'],
    roleSkills: [
      { name: 'Python', category: 'technical' },
      { name: 'PyTorch / TensorFlow', category: 'tools' },
      { name: 'MLOps', category: 'technical' },
      { name: 'Model Serving (Triton/TFServing)', category: 'technical' },
      { name: 'Kubernetes', category: 'tools' },
      { name: 'Data Pipelines', category: 'technical' },
      { name: 'LLMs / RAG', category: 'technical' },
      { name: 'GPU Optimization', category: 'technical' },
      { name: 'Vector Databases', category: 'technical' },
      { name: 'LangChain / LlamaIndex', category: 'tools', isPreferred: true },
      { name: 'HuggingFace', category: 'tools', isPreferred: true },
      { name: 'Distributed Training', category: 'technical', isPreferred: true },
      { name: 'ONNX / TensorRT', category: 'tools', isPreferred: true },
      { name: 'Prompt Engineering', category: 'technical', isPreferred: true },
    ],
  },
  'Data Engineer': {
    technical: 55, experience: 20, domain: 10, education: 5, softSkills: 10,
    topPriority: 'Pipeline scalability, ETL efficiency, and data modeling.',
    competencies: ['Data Modeling', 'ETL/ELT Pipelines', 'Cloud Infrastructure', 'Big Data Tools', 'System Reliability', 'Data Governance', 'Schema Design'],
    roleSkills: [
      { name: 'Data Modeling', category: 'technical' },
      { name: 'ETL / ELT Pipelines', category: 'technical' },
      { name: 'Cloud Infrastructure', category: 'tools' },
      { name: 'Big Data Tools (Spark/Hadoop)', category: 'tools' },
      { name: 'System Reliability', category: 'technical' },
      { name: 'Data Governance', category: 'softSkills' },
      { name: 'Schema Design', category: 'technical' },
      { name: 'SQL', category: 'technical' },
      { name: 'Python', category: 'technical' },
      { name: 'dbt', category: 'tools', isPreferred: true },
      { name: 'Airflow / Prefect', category: 'tools', isPreferred: true },
      { name: 'Kafka', category: 'tools', isPreferred: true },
      { name: 'Snowflake / BigQuery', category: 'tools', isPreferred: true },
    ],
  },
  'Marketing': {
    technical: 10, experience: 25, domain: 30, education: 10, softSkills: 25,
    topPriority: 'CAC/LTV optimization, brand narrative, and growth loops.',
    competencies: ['Campaign Management', 'Content Strategy', 'Market Research', 'Vendor Management', 'Channel Strategy', 'Budget Allocation', 'Public Relations'],
    roleSkills: [
      { name: 'Campaign Management', category: 'analytics' },
      { name: 'Content Strategy', category: 'softSkills' },
      { name: 'Market Research', category: 'analytics' },
      { name: 'Vendor Management', category: 'softSkills' },
      { name: 'Channel Strategy', category: 'analytics' },
      { name: 'Budget Allocation', category: 'analytics' },
      { name: 'Public Relations', category: 'softSkills' },
      { name: 'SEO / SEM', category: 'technical' },
      { name: 'HubSpot / Marketo', category: 'tools' },
      { name: 'Google Analytics', category: 'tools', isPreferred: true },
      { name: 'Social Media Management', category: 'tools', isPreferred: true },
      { name: 'Copywriting', category: 'softSkills', isPreferred: true },
      { name: 'Brand Narrative', category: 'softSkills', isPreferred: true },
    ],
  },
  'Growth Marketing': {
    technical: 20, experience: 25, domain: 25, education: 5, softSkills: 25,
    topPriority: 'Funnel Metrics & CAC/ROAS',
    competencies: ['Performance Marketing', 'Funnel Optimization', 'Conversion Rate (CRO)', 'Marketing Analytics', 'Growth Loops', 'Viral Mechanics', 'Customer Acquisition'],
    roleSkills: [
      { name: 'Performance Marketing', category: 'analytics' },
      { name: 'Funnel Optimization', category: 'analytics' },
      { name: 'CRO', category: 'analytics' },
      { name: 'Marketing Analytics', category: 'analytics' },
      { name: 'Growth Loops', category: 'technical' },
      { name: 'Viral Mechanics', category: 'technical' },
      { name: 'Customer Acquisition', category: 'analytics' },
      { name: 'A/B Testing', category: 'analytics' },
      { name: 'Paid Ads (Meta / Google)', category: 'tools' },
      { name: 'Attribution Modeling', category: 'analytics', isPreferred: true },
      { name: 'SQL', category: 'technical', isPreferred: true },
      { name: 'Lifecycle Marketing', category: 'softSkills', isPreferred: true },
    ],
  },
  'Brand Marketing': {
    technical: 5, experience: 20, domain: 20, education: 10, softSkills: 45,
    topPriority: 'Campaign Impact & Storytelling',
    competencies: ['Brand Narrative', 'Copywriting', 'Creative Strategy', 'Community Management', 'Influencer Marketing', 'Brand Positioning', 'Event Marketing'],
    roleSkills: [
      { name: 'Brand Narrative', category: 'softSkills' },
      { name: 'Copywriting', category: 'softSkills' },
      { name: 'Creative Strategy', category: 'softSkills' },
      { name: 'Community Management', category: 'softSkills' },
      { name: 'Influencer Marketing', category: 'technical' },
      { name: 'Brand Positioning', category: 'analytics' },
      { name: 'Event Marketing', category: 'softSkills' },
      { name: 'Social Media', category: 'tools' },
      { name: 'Adobe Suite', category: 'tools', isPreferred: true },
      { name: 'PR / Media Relations', category: 'softSkills', isPreferred: true },
      { name: 'Video Production', category: 'tools', isPreferred: true },
    ],
  },
  'Sales': {
    technical: 5, experience: 30, domain: 25, education: 5, softSkills: 35,
    topPriority: 'Quota history, relationship building, and closing velocity.',
    competencies: ['Lead Generation', 'Negotiation', 'CRM Proficiency', 'Closing Strategy', 'Pipeline Management', 'Customer Relationship', 'Sales Forecasting'],
    roleSkills: [
      { name: 'Lead Generation', category: 'analytics' },
      { name: 'Negotiation', category: 'softSkills' },
      { name: 'CRM (Salesforce/HubSpot)', category: 'tools' },
      { name: 'Closing Strategy', category: 'softSkills' },
      { name: 'Pipeline Management', category: 'analytics' },
      { name: 'Customer Relationship', category: 'softSkills' },
      { name: 'Sales Forecasting', category: 'analytics' },
      { name: 'Cold Outreach', category: 'softSkills' },
      { name: 'Demo / Presentation', category: 'softSkills', isPreferred: true },
      { name: 'Sales Operations', category: 'analytics', isPreferred: true },
      { name: 'LinkedIn Sales Navigator', category: 'tools', isPreferred: true },
      { name: 'Contract Negotiation', category: 'softSkills', isPreferred: true },
    ],
  },
  "Founder's Office": {
    technical: 15, experience: 15, domain: 20, education: 20, softSkills: 30,
    topPriority: 'Problem solving, high-agency execution, and strategic leverage.',
    competencies: ['High Agency', 'Strategic Planning', 'Investor Relations', 'Business Operations', 'Market Expansion', 'Fundraising Support', 'Cross-functional Ops'],
    roleSkills: [
      { name: 'High Agency', category: 'softSkills' },
      { name: 'Strategic Planning', category: 'analytics' },
      { name: 'Investor Relations', category: 'softSkills' },
      { name: 'Business Operations', category: 'analytics' },
      { name: 'Market Expansion', category: 'analytics' },
      { name: 'Fundraising Support', category: 'softSkills' },
      { name: 'Cross-functional Ops', category: 'softSkills' },
      { name: 'Financial Modeling', category: 'analytics' },
      { name: 'Project Management', category: 'tools', isPreferred: true },
      { name: 'SQL / Data Analysis', category: 'technical', isPreferred: true },
      { name: 'Legal / Compliance', category: 'softSkills', isPreferred: true },
    ],
  },
  'Chief of Staff': {
    technical: 5, experience: 25, domain: 10, education: 5, softSkills: 40,
    topPriority: 'Context Breadth & Founder Proximity',
    competencies: ['Executive Presence', 'Internal Communications', 'Strategic Alignment', 'Project Management', 'Decision Support', 'Confidentiality', 'Diplomacy'],
    custom: { contextBreadth: 15 },
    roleSkills: [
      { name: 'Executive Presence', category: 'softSkills' },
      { name: 'Internal Communications', category: 'softSkills' },
      { name: 'Strategic Alignment', category: 'analytics' },
      { name: 'Project Management', category: 'tools' },
      { name: 'Decision Support', category: 'analytics' },
      { name: 'Confidentiality', category: 'softSkills' },
      { name: 'Diplomacy', category: 'softSkills' },
      { name: 'Meeting Facilitation', category: 'softSkills', isPreferred: true },
      { name: 'OKR / Goal Setting', category: 'tools', isPreferred: true },
      { name: 'Board Deck Preparation', category: 'technical', isPreferred: true },
      { name: 'M&A / Due Diligence', category: 'analytics', isPreferred: true },
    ],
  },
  'Finance': {
    technical: 10, experience: 30, domain: 30, education: 20, softSkills: 10,
    topPriority: 'Accuracy, Compliance & P&L Ownership',
    competencies: ['Financial Modeling', 'Budgeting/Forecasting', 'P&L Management', 'Audit & Compliance', 'VBA/Excel Mastery', 'Risk Assessment', 'Tax Strategy'],
    roleSkills: [
      { name: 'Financial Modeling', category: 'analytics' },
      { name: 'Budgeting / Forecasting', category: 'analytics' },
      { name: 'P&L Management', category: 'analytics' },
      { name: 'Audit & Compliance', category: 'softSkills' },
      { name: 'Excel / VBA', category: 'tools' },
      { name: 'Risk Assessment', category: 'analytics' },
      { name: 'Tax Strategy', category: 'analytics' },
      { name: 'SAP / Oracle', category: 'tools' },
      { name: 'Power BI', category: 'tools', isPreferred: true },
      { name: 'SQL', category: 'technical', isPreferred: true },
      { name: 'IFRS / GAAP', category: 'analytics', isPreferred: true },
    ],
  },
  'Other': {
    technical: 20, experience: 20, domain: 20, education: 20, softSkills: 20,
    topPriority: 'General professional excellence and role-agnostic impact.',
    competencies: ['Professionalism', 'Communication', 'Problem Solving', 'Reliability', 'Technical Literacy', 'Collaboration', 'Adaptability'],
    roleSkills: [
      { name: 'Professionalism', category: 'softSkills' },
      { name: 'Communication', category: 'softSkills' },
      { name: 'Problem Solving', category: 'analytics' },
      { name: 'Reliability', category: 'softSkills' },
      { name: 'Technical Literacy', category: 'technical' },
      { name: 'Collaboration', category: 'softSkills' },
      { name: 'Adaptability', category: 'softSkills' },
      { name: 'Project Management', category: 'tools', isPreferred: true },
      { name: 'Data Analysis', category: 'analytics', isPreferred: true },
      { name: 'Presentation Skills', category: 'softSkills', isPreferred: true },
    ],
  },
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
  'Junior': { minExp: 0, maxExp: 2, focus: 'Execution & Learning', questionType: 'Technical Fundamentals', weightShift: { technical: 1.2, education: 1.5, experience: 0.5 } },
  'Mid-Level': { minExp: 2, maxExp: 5, focus: 'Ownership & Delivery', questionType: 'Problem Solving', weightShift: { technical: 1.1, experience: 1.1 } },
  'Senior': { minExp: 5, maxExp: 8, focus: 'Architecture & Mentorship', questionType: 'Systemic Thinking', weightShift: { experience: 1.3, domain: 1.2, education: 0.7 } },
  'Lead': { minExp: 8, maxExp: 12, focus: 'Strategy & Impact', questionType: 'Leadership & Conflict', weightShift: { softSkills: 1.3, domain: 1.2, education: 0.5 } },
  'Director': { minExp: 12, maxExp: 15, focus: 'Organization & Scale', questionType: 'High-Level Strategy', weightShift: { softSkills: 1.4, experience: 1.4, technical: 0.5 } },
  'Executive': { minExp: 15, maxExp: 40, focus: 'Vision & P&L', questionType: 'Business Transformation', weightShift: { softSkills: 1.5, domain: 1.5, technical: 0.3 } }
};

export interface IndustryShift {
  technical?: number;
  experience?: number;
  domain?: number;
  education?: number;
  softSkills?: number;
  bonusSkills: RoleSkill[];
}

export const INDUSTRY_SHIFTS: Record<IndustryType, IndustryShift> = {
  'Technology / SaaS': {
    domain: 1.0, softSkills: 1.0, technical: 1.1,
    bonusSkills: [
      { name: 'SaaS Metrics (ARR/MRR/Churn)', category: 'analytics' },
      { name: 'CI/CD', category: 'tools' },
      { name: 'Agile Methodologies', category: 'tools', isPreferred: true },
      { name: 'Cloud Platforms (AWS/GCP)', category: 'tools', isPreferred: true },
      { name: 'API Integrations', category: 'technical', isPreferred: true },
    ],
  },
  'FinTech': {
    domain: 1.3, education: 1.1,
    bonusSkills: [
      { name: 'Regulatory Compliance', category: 'softSkills' },
      { name: 'Financial Modeling', category: 'analytics' },
      { name: 'Risk Management', category: 'analytics', isPreferred: true },
      { name: 'Payment Systems (Stripe/Razorpay)', category: 'tools', isPreferred: true },
      { name: 'KYC / AML', category: 'softSkills', isPreferred: true },
    ],
  },
  'Healthcare': {
    domain: 1.2, education: 1.2,
    bonusSkills: [
      { name: 'HIPAA Compliance', category: 'softSkills' },
      { name: 'Clinical Workflows', category: 'analytics' },
      { name: 'Data Privacy', category: 'softSkills', isPreferred: true },
      { name: 'FHIR / HL7', category: 'technical', isPreferred: true },
      { name: 'Patient Experience', category: 'softSkills', isPreferred: true },
    ],
  },
  'E-Commerce': {
    domain: 1.2, softSkills: 1.1,
    bonusSkills: [
      { name: 'Conversion Optimization', category: 'analytics' },
      { name: 'Retention Metrics', category: 'analytics' },
      { name: 'Marketplace Dynamics', category: 'analytics', isPreferred: true },
      { name: 'Supply Chain', category: 'analytics', isPreferred: true },
      { name: 'Payment Gateways', category: 'tools', isPreferred: true },
    ],
  },
  'EdTech': {
    domain: 1.1, softSkills: 1.2, education: 1.2,
    bonusSkills: [
      { name: 'Pedagogy / Learning Design', category: 'softSkills' },
      { name: 'Content Management', category: 'tools' },
      { name: 'Engagement Metrics', category: 'analytics', isPreferred: true },
      { name: 'LMS Platforms', category: 'tools', isPreferred: true },
      { name: 'Gamification', category: 'softSkills', isPreferred: true },
    ],
  },
  'Enterprise': {
    domain: 1.2, experience: 1.1, education: 0.9,
    bonusSkills: [
      { name: 'Stakeholder Management', category: 'softSkills' },
      { name: 'Vendor Evaluation', category: 'analytics' },
      { name: 'Change Management', category: 'softSkills', isPreferred: true },
      { name: 'Enterprise Architecture', category: 'technical', isPreferred: true },
      { name: 'Procurement / RFP', category: 'softSkills', isPreferred: true },
    ],
  },
  'Consulting': {
    softSkills: 1.3, domain: 1.1, education: 1.1,
    bonusSkills: [
      { name: 'Client Management', category: 'softSkills' },
      { name: 'Slide Decks / Storytelling', category: 'tools' },
      { name: 'Strategic Frameworks', category: 'analytics', isPreferred: true },
      { name: 'Due Diligence', category: 'analytics', isPreferred: true },
      { name: 'Workshop Facilitation', category: 'softSkills', isPreferred: true },
    ],
  },
  'Other': {
    bonusSkills: [],
  },
};

export const getEffectiveWeights = (role: RoleType, tier: ExperienceTier, industry?: IndustryType) => {
  const base = ROLE_WEIGHTS[role] || ROLE_WEIGHTS['Other'];
  const tierShift: WeightShift = TIER_CONFIG[tier].weightShift;
  const industryShift: IndustryShift = industry ? (INDUSTRY_SHIFTS[industry] || INDUSTRY_SHIFTS['Other']) : INDUSTRY_SHIFTS['Other'];

  let technical = base.technical * (tierShift.technical ?? 1) * (industryShift.technical ?? 1);
  let experience = base.experience * (tierShift.experience ?? 1) * (industryShift.experience ?? 1);
  let domain = base.domain * (tierShift.domain ?? 1) * (industryShift.domain ?? 1);
  let education = base.education * (tierShift.education ?? 1) * (industryShift.education ?? 1);
  let softSkills = base.softSkills * (tierShift.softSkills ?? 1) * (industryShift.softSkills ?? 1);

  const total = technical + experience + domain + education + softSkills;

  return {
    technical: Math.round((technical / total) * 100),
    experience: Math.round((experience / total) * 100),
    domain: Math.round((domain / total) * 100),
    education: Math.round((education / total) * 100),
    softSkills: Math.round((softSkills / total) * 100),
    focus: TIER_CONFIG[tier].focus,
    topPriority: base.topPriority,
    competencies: base.competencies,
    roleSkills: base.roleSkills,
    industrySkills: industryShift.bonusSkills,
  };
};
