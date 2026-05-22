import { GoogleGenAI } from "@google/genai";
import { ROLE_WEIGHTS } from "../../../constants/roles.js";

let genAI: GoogleGenAI | null = null;

export function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("CRITICAL: GEMINI_API_KEY is missing in environment variables. Please add it to your .env file to enable AI analysis.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

export const GLOBAL_GROUNDING_RULES = `
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

export const SYSTEM_PROMPT = `You are TalentTailor AI, an Expert HR Lead specializing in B2B SaaS and tech hiring.
Your goal is to analyze resumes against job descriptions (JD) and specific hiring preferences with extreme precision.

${GLOBAL_GROUNDING_RULES}

BIFURCATED EVALUATION LOGIC (IC vs. MANAGER):
1. CLASSIFY TRACK: First, determine if the target JD is for an Individual Contributor (IC) or Managerial track.
2. SENIOR IC LENS: Prioritize technical trade-offs, architecture decisions, and refactoring impact.
3. MANAGER LENS: Prioritize team velocity, headcount growth, cross-functional strategy, and mentoring.

EDUCATION & PEDIGREE RULES (Conditional Weighting):
1. THE BASELINE: Evaluate based on role-specific weights. For most roles, education is secondary to impact.
2. EXPERIENCE OVERRIDES ALL: For Senior candidates (5+ years), education drops to a negligible weight (<5%) regardless of the JD, unless it is a regulated field (e.g., Finance, Legal). Prioritize 'Impact Magnitude' and '0-to-1' contributions.
3. JUNIOR FOCUS: For candidates with <2 years of experience, evaluate education but focus on projects and internships.

ROLE SPECIFIC SCORING & VETTING:
The following weights and priorities should guide your evaluation. 
IMPORTANT: When generating the 'competencies' list, YOU MUST prioritize the 'competencies' listed for each role below. For PM roles, look specifically for "User Centricity", "Empathy", and "Analytics" if applicable.
${JSON.stringify(ROLE_WEIGHTS, null, 2)}

CONSUMER PM SPECIAL LENS:
For 'Consumer Product Manager' roles, deprioritize deep technical engineering skills. Prioritize user psychology, A/B testing, retention metrics, and product-led growth (PLG).

FOR DISCOVERY QUESTIONS:
- If a candidate is 'Junior', ask about technical execution.
- If 'Senior IC', ask about trade-offs and architecture.
- If 'Senior Manager/Director', focus on business impact, P&L, and team strategy.
`;

export async function safeJsonParse(text: string) {
  try {
    const cleaned = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini JSON Parse Error:", error, "Raw Text:", text);
    throw new Error("The Intelligence Engine encountered a syntax error in its response. Retrying may fix this.");
  }
}

export function normalizeScore(score: any): number {
  let s = Number(score);
  if (isNaN(s)) return 0;
  if (s > 10 && s <= 100) return Number((s / 10).toFixed(1));
  if (s > 0 && s < 1) return Number((s * 10).toFixed(1));
  return Number(Math.min(10, Math.max(0, s)).toFixed(1));
}
