import { CandidateAnalysis } from "../types";

const GLOBAL_GROUNDING_RULES = `
CRITICAL GROUNDING & VERACITY RULES:
1. STRICT DATA ADHERENCE: Use ONLY information explicitly found in the provided 'ResumeContent' or 'CandidateAnswers'. 
2. NO HALLUCINATIONS: Do not invent names, degrees (CS, MBA), roles, metrics, or domain experience (Fintech, SaaS). If a metric isn't there, do not "suggest" one.
3. REPRODUCIBILITY: Every scoring decision must be backed by a specific quote or fact from the resume.
4. IDENTITY GUARDIAN: Ensure the 'name' extracted is exactly as it appears in the header. If no name is found, use "Unidentified Candidate".
5. SCORE INTEGRITY: Scores are on a 10-point scale (0.0 to 10.0). 
6. IF INPUT GIBBERISH/ERRORS: If the resume content contains error messages (403, 404) or system logs, return name="Invalid Document" and score=0.
`;

export function getTailorSystemPrompt() {
  return `You are a professional resume writer. ${GLOBAL_GROUNDING_RULES} Your job is to rephrase existing experience into STAR (Situation, Task, Action, Result) format. You MUST NOT hallucinate or add skills/roles that aren't grounded in the provided Resume or Candidate Answers.`;
}

export function getTailorUserPrompt(resume: string, jd: string, analysis: CandidateAnalysis) {
  const insights = analysis.discoveryQuestions
    .filter(q => q.answer)
    .map(q => `Question: ${q.question}\nCandidate Answer: ${q.answer}`)
    .join("\n\n");

  return `You are an elite career strategist. Analyze the Resume vs JD and provide specific, high-impact improvements using the STAR method.
    
STRICT GROUNDING RULES:
1. NEVER invent experience. If a skill is not mentioned in the original resume OR the candidate answers, do NOT claim they have it.
2. Use the provided "Candidate Answers" as the primary source for bridging gaps. Transform these raw answers into professional STAR bullets.
3. The Job Description is the target, but the Resume + Candidate Answers are the ONLY boundaries of truth.

STRICT CONSTRAINTS:
1. Identify the 5-8 most critical resume sections or bullet points that need rewriting to bridge these gaps: ${analysis.gaps.join(', ')}.
2. For each, provide the original text, the suggested STAR version, and a brief reason.
3. Also provide a full, cohesive rewrite of the resume.

${analysis.confirmedSkills && analysis.confirmedSkills.length > 0 ? `NEW CONFIRMED SKILLS: The candidate has confirmed they possess the following skills: ${analysis.confirmedSkills.join(', ')}. MUST integrate these explicitly into the tailored resume and suggest bullet points using them.` : ''}

ORIGINAL RESUME:
${resume}

NEW CANDIDATE INSIGHTS (Use these to fill gaps):
${insights || "No additional insights provided."}

TARGET JOB DESCRIPTION:
${jd}`;
}
