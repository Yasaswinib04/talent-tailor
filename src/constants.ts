import { AnalysisResult } from './types';

export const MOCK_ANALYSIS: AnalysisResult = {
  id: 'mock-1',
  role: 'Product Manager',
  jdContent: 'Looking for a PM with 5 years experience in SaaS and AI products.',
  createdAt: new Date().toISOString(),
  candidates: [
    {
      id: 'c1',
      name: 'Sarah Chen (PM)',
      score: 8.5,
      overallFeedback: 'Sarah is a strong product leader with a deep understanding of user empathy and analytics.',
      competencies: [
        { name: 'User Centricity', score: 9.5, evidence: 'Conducted 100+ user interviews to drive product vision.', accepted: true },
        { name: 'User Analytics', score: 9, evidence: 'Increased retention by 15% using Mixpanel and Amplitude.', accepted: true },
        { name: 'Product Strategy', score: 8, evidence: 'Led roadmap for a $50M ARR SaaS product.', accepted: true }
      ],
      strengths: [
        { text: 'Deep empathy for user pain points.', accepted: true },
        { text: 'Mastery of growth loops and retention metrics.', accepted: true }
      ],
      weaknesses: [
        { text: 'Limited experience with enterprise sales cycles.', accepted: true }
      ],
      gaps: ['Enterprise Procurement'],
      discoveryQuestions: [
        { question: 'How do you prioritize features when users and stakeholders disagree?', answer: 'I rely on quantitative data (analytics) and qualitative user feedback...' }
      ],
      resumeContent: 'Product Manager at TechCo...',
      experienceYears: '6',
      atsScore: 8.2,
      keywords: {
        present: ['Product Strategy', 'User Analytics', 'A/B Testing', 'Agile'],
        missing: ['Salesforce', 'Enterprise Sales']
      },
      roleType: 'Product Manager',
      experienceTier: 'Senior'
    }
  ],
};

export const DEVELOPER_MOCK: AnalysisResult = {
  id: 'mock-2',
  role: 'Developer',
  jdContent: 'Seeking a Senior Full-stack Developer with expertise in React, Node.js, and System Design.',
  createdAt: new Date().toISOString(),
  candidates: [
    {
      id: 'd1',
      name: 'Alex Rivier (Dev)',
      score: 9.2,
      overallFeedback: 'Alex is a world-class engineer with exceptional system design skills and code quality.',
      competencies: [
        { name: 'System Design', score: 10, evidence: 'Architected a distributed system handling 1M+ requests/sec.', accepted: true },
        { name: 'Code Quality', score: 9, evidence: 'Reduced technical debt by 40% through rigorous refactoring.', accepted: true },
        { name: 'Framework Proficiency', score: 9.5, evidence: 'Core contributor to several major React libraries.', accepted: true }
      ],
      strengths: [
        { text: 'Deep knowledge of distributed systems.', accepted: true },
        { text: 'Exceptional problem-solving skills under pressure.', accepted: true }
      ],
      weaknesses: [
        { text: 'Could improve on cross-functional product communication.', accepted: true }
      ],
      gaps: ['Product Management Context'],
      discoveryQuestions: [
        { question: 'Describe a complex bug you solved recently.', answer: 'Debugged a race condition in a distributed lock service...' }
      ],
      resumeContent: 'Senior Engineer at ScaleUp...',
      experienceYears: '10',
      atsScore: 9.5,
      keywords: {
        present: ['React', 'Node.js', 'System Design', 'Kubernetes'],
        missing: ['Python', 'Django']
      },
      roleType: 'Developer',
      experienceTier: 'Lead'
    }
  ]
};

export const DESIGNER_MOCK: AnalysisResult = {
  id: 'mock-3',
  role: 'Product Designer',
  jdContent: 'Looking for a Designer who can lead our Design System and conduct user research.',
  createdAt: new Date().toISOString(),
  candidates: [
    {
      id: 'ds1',
      name: 'Mia Wong (Designer)',
      score: 8.8,
      overallFeedback: 'Mia has a stellar portfolio and a deep commitment to accessibility and design systems.',
      competencies: [
        { name: 'Design Systems', score: 10, evidence: 'Built and scaled a design system used by 50+ engineers.', accepted: true },
        { name: 'User Research', score: 8.5, evidence: 'Conducted longitudinal studies on accessibility.', accepted: true },
        { name: 'Visual Design', score: 9, evidence: 'Award-winning UI for a top fintech app.', accepted: true }
      ],
      strengths: [
        { text: 'Exceptional visual precision.', accepted: true },
        { text: 'Strong advocacy for user accessibility.', accepted: true }
      ],
      weaknesses: [
        { text: 'Limited experience with heavy data visualization.', accepted: true }
      ],
      gaps: ['Data Visualization'],
      discoveryQuestions: [
        { question: 'How do you handle feedback from non-designers?', answer: 'I translate design decisions into business outcomes...' }
      ],
      resumeContent: 'Lead Designer at CreativeStudio...',
      experienceYears: '7',
      atsScore: 8.5,
      keywords: {
        present: ['Figma', 'Design Systems', 'Accessibility', 'UX Research'],
        missing: ['D3.js', 'After Effects']
      },
      roleType: 'Product Designer',
      experienceTier: 'Senior'
    }
  ]
};
