import { Type } from "@google/genai";
import { RoleType, HiringPreferences, ExperienceTier, IndustryType } from "../../../types.js";
import { getEffectiveWeights } from "../../../constants/roles.js";
import { getAI, safeJsonParse, normalizeScore, SYSTEM_PROMPT } from "./config.js";
import { getModelForStep } from "./modelConfig.js";

export async function scoreCandidate(
  resume: string | { data: string, mimeType: string },
  jd: string | { data: string, mimeType: string },
  track: 'IC' | 'Manager',
  role: RoleType,
  tier: ExperienceTier = 'Senior',
  preferences?: HiringPreferences,
  targetMarket: string = 'India',
  discoveryAnswers?: { question: string, answer: string }[],
  industry?: IndustryType
): Promise<any> {
  const jdPart = typeof jd === 'string' ? { text: jd } : { inlineData: jd };
  const resumePart = typeof resume === 'string' ? { text: resume } : { inlineData: resume };

  const promptParts: any[] = [
    { text: `Analyze this resume against the job description for a ${role} role (Track: ${track}). Perform a bias check, and evaluate strengths/weaknesses.` }
  ];

  if (preferences) {
    promptParts.push({
      text: `Hiring Preferences:
- Tier I Mandatory: ${preferences.isTierIMandatory}
- MBA Mandatory: ${preferences.isMBAMandatory}
- Min Experience: ${preferences.minExperienceYears} years
- Preferred Companies: ${preferences.preferredCompanies.join(', ')}
- Mandatory Skills: ${preferences.mandatorySkills.join(', ')}
` });
  }

  promptParts.push({ text: "Resume Content:" });
  promptParts.push(resumePart);
  promptParts.push({ text: "Job Description Content:" });
  promptParts.push(jdPart);

  const properties: any = {
    name: { type: Type.STRING, description: "Full name of the candidate. If not found, use 'Candidate'." },
    score: { type: Type.NUMBER, description: "Match score from 0.0 to 10.0 based on how well the candidate matches the JD. NEVER exceed 10.0." },
    overallFeedback: { type: Type.STRING, description: "A detailed summary of the candidate's fit. Be blunt. If they lack domain experience mentioned in JD, say so." },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
    weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
    meetsMandatoryCriteria: { type: Type.BOOLEAN },
    failedCriteria: { type: Type.ARRAY, items: { type: Type.STRING } },
    competencies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          score: { type: Type.NUMBER, description: "Competency score from 0.0 to 10.0" },
          evidence: { type: Type.STRING, description: "Specific quote or mention from the resume that justifies this score." }
        },
        required: ["name", "score", "evidence"]
      }
    },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
    experienceYears: { type: Type.STRING, description: "Total years of professional experience as a number or string e.g. '8.5' or '12'."     },
    keywords: {
      type: Type.OBJECT,
      properties: {
        present: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must-have keywords found in the resume." },
        missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must-have keywords missing from the resume." }
      },
      required: ["present", "missing"]
    }
  };

  const requiredFields = ["name", "score", "overallFeedback", "strengths", "weaknesses", "competencies", "gaps", "meetsMandatoryCriteria", "experienceYears", "keywords"];

  const effectiveWeights = getEffectiveWeights(role as RoleType, tier as ExperienceTier, industry);
  const weightInfo = `Role Analysis Context (${role} - ${tier} - Track: ${track}):
- Seniority Focus: ${effectiveWeights.focus}
- Top Priority: ${effectiveWeights.topPriority}
- DYNAMIC SCORING RUBRIC (Tier-Shifted): 
  * Technical Skills: ${effectiveWeights.technical}%
  * Professional Experience: ${effectiveWeights.experience}%
  * Domain Knowledge: ${effectiveWeights.domain}%
  * Education & Credentials: ${effectiveWeights.education}%
  * Soft Skills & Cultural Fit: ${effectiveWeights.softSkills}%
  
- TAILORED COMPETENCIES TO VET: 
  ${effectiveWeights.competencies.join(', ')}

- TARGET MARKET CONTEXT:
  The candidate is targeting the ${targetMarket} job market. Adjust resume formatting and keyword emphasis accordingly (e.g., US no photo, metric heavy; India photo accepted, etc.).

When calculating the 'score', apply these dynamic weights strictly. Identify evidence for each category above, focusing especially on the tailored competencies.`;

  const scorerRules = SYSTEM_PROMPT + "\n\nINFERRED SKILLS ALLOWED: If a candidate describes performing an action that clearly demonstrates a competency (e.g., ‘reduced latency by 40%’), you may infer the skill ‘Performance Optimization’ even if the exact phrase is not used. You must still cite the original action as evidence.";

  const response = await getAI().models.generateContent({
    model: getModelForStep("scorer"),
    contents: {
      parts: promptParts
    },
    config: {
      temperature: 0,
      systemInstruction: scorerRules + "\n\n" + weightInfo,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: properties,
        required: requiredFields
      }
    }
  });

  const data = await safeJsonParse(response.text || '{}');
  data.score = normalizeScore(data.score);
  if (data.competencies) {
    data.competencies = data.competencies.map((c: any) => ({
      ...c,
      score: normalizeScore(c.score)
    }));
  }
  
  return data;
}
