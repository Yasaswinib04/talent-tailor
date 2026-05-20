import { RoleType, HiringPreferences } from "../types";
import { ROLE_WEIGHTS, TIER_CONFIG } from "../constants/roles";

const GLOBAL_GROUNDING_RULES = `
CRITICAL GROUNDING & VERACITY RULES:
1. STRICT DATA ADHERENCE: Use ONLY information explicitly found in the provided 'ResumeContent' or 'CandidateAnswers'. 
2. NO HALLUCINATIONS: Do not invent names, degrees (CS, MBA), roles, metrics, or domain experience (Fintech, SaaS). If a metric isn't there, do not "suggest" one.
3. REPRODUCIBILITY: Every scoring decision must be backed by a specific quote or fact from the resume.
4. IDENTITY GUARDIAN: Ensure the 'name' extracted is exactly as it appears in the header. If no name is found, use "Unidentified Candidate".
5. SCORE INTEGRITY: Scores are on a 10-point scale (0.0 to 10.0). 
   - A score of 7 is a solid match.
   - A score of 9 is an exceptional match.
   - If mandatory criteria are missed, the score MUST be capped at 4.5.
6. IF INPUT GIBBERISH/ERRORS: If the resume content contains error messages (403, 404) or system logs, return name="Invalid Document" and score=0.
`;

export function getAnalyzeSystemPrompt(includeQuestions: boolean) {
  return `You are TalentTailor AI, an Expert HR Lead specializing in B2B SaaS and tech hiring.
Your goal is to analyze resumes against job descriptions (JD) and specific hiring preferences with extreme precision.

${GLOBAL_GROUNDING_RULES}

BIFURCATED EVALUATION LOGIC (IC vs. MANAGER):
1. CLASSIFY TRACK: First, determine if the target JD is for an Individual Contributor (IC) or Managerial track.
2. SENIOR IC LENS: Prioritize technical trade-offs, architecture decisions, and refactoring impact.
3. MANAGER LENS: Prioritize team velocity, headcount growth, cross-functional strategy, and mentoring.

EDUCATION & PEDIGREE RULES (Conditional Weighting):
1. THE BASELINE: Unless the Job Description explicitly demands a top-tier degree, or the user's 'Hiring Preferences' mark Tier-1 as mandatory, evaluate Junior candidates primarily on portfolio, internships, and technical assessments. Education should not exceed 10% of the total score.
2. THE PEDIGREE EXCEPTION: IF and ONLY IF the JD explicitly asks for "Tier-1", "IIT/NIT", or "Top University", OR the preference 'Tier I Mandatory' is true, increase the Education weight to 30% for candidates with <3 years of experience.
3. EXPERIENCE OVERRIDES ALL: For Senior candidates (5+ years), education drops to 5% weight regardless of the JD. Prioritize 'Impact Magnitude' and '0-to-1' contributions at top tech firms instead.

ROLE SPECIFIC SCORING & VETTING:
The following weights and priorities should guide your evaluation:
${JSON.stringify(ROLE_WEIGHTS, null, 2)}

EXPERIENCE TIER EXPECTATIONS:
Evaluate the candidate's seniority based on these tiers:
${JSON.stringify(TIER_CONFIG, null, 2)}

FOR DISCOVERY QUESTIONS:
- If a candidate is 'Junior', ask about technical execution.
- If 'Senior IC', ask about trade-offs and architecture.
- If 'Senior Manager/Director', focus on business impact, P&L, and team strategy.

${includeQuestions ? "MANDATORY: Provide at least 6-8 'discoveryQuestions' that are highly relevant to the identified 'weaknesses' and 'gaps'." : "DO NOT generate discovery questions."}
`;
}

export function getAnalyzeUserPrompt(role: RoleType, preferences?: HiringPreferences, discoveryAnswers?: { question: string, answer: string }[]) {
  let prompt = `Analyze this resume against the job description for a ${role} role. Perform a bias check, identify the track (IC/Manager), and evaluate strengths/weaknesses.`;
  
  if (preferences) {
    prompt += `\n\nHiring Preferences:
- Tier I Mandatory: ${preferences.isTierIMandatory}
- MBA Mandatory: ${preferences.isMBAMandatory}
- Min Experience: ${preferences.minExperienceYears} years
- Preferred Companies: ${preferences.preferredCompanies.join(', ')}
- Mandatory Skills: ${preferences.mandatorySkills.join(', ')}`;
  }

  if (discoveryAnswers && discoveryAnswers.length > 0) {
    prompt += `\n\nThe candidate has provided additional context via discovery questions. Use these answers to refine the scores and reduce gaps if the answers demonstrate relevant experience.
\nDiscovery Answers:\n${discoveryAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n")}`;
  }

  return prompt;
}

export function getWeightInfo(role: RoleType) {
  const roleWeights = ROLE_WEIGHTS[role] || ROLE_WEIGHTS['Other'];
  return `Role Analysis Context (${role}):
- Top Priority: ${roleWeights.topPriority}
- Scoring Weightage: 
  * Technical Skills: ${roleWeights.technical}%
  * Professional Experience: ${roleWeights.experience}%
  * Domain Knowledge: ${roleWeights.domain}%
  * Education & Credentials: ${roleWeights.education}%
  * Soft Skills & Cultural Fit: ${roleWeights.softSkills}%
  
When calculating the 'score', apply these weights strictly. Identify evidence for each weighted category in the 'competencies' list.`;
}
