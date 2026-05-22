import { Type } from "@google/genai";
import { CandidateAnalysis } from "../../../types.js";
import { getAI, safeJsonParse, GLOBAL_GROUNDING_RULES } from "./config.js";

export async function tailorResume(resume: string, jd: string, analysis: CandidateAnalysis, targetMarket: string = 'India'): Promise<{ fullText: string, changes: any[] }> {
  const insights = analysis.discoveryQuestions
    .filter(q => q.answer)
    .map(q => `Question: ${q.question}\nCandidate Answer: ${q.answer}`)
    .join("\n\n");

  const response = await getAI().models.generateContent({
    model: "gemini-2.0-flash",
    contents: {
      parts: [{
        text: `You are an elite career strategist. Analyze the Resume vs JD and provide specific, high-impact improvements using the STAR method.
    
    STRICT GROUNDING RULES:
    1. NEVER invent experience. If a skill is not mentioned in the original resume OR the candidate answers, do NOT claim they have it.
    2. Use the provided "Candidate Answers" as the primary source for bridging gaps. Transform these raw answers into professional STAR bullets.
    3. The Job Description is the target, but the Resume + Candidate Answers are the ONLY boundaries of truth.
    
    STRICT CONSTRAINTS:
    1. Identify the 5-8 most critical resume sections or bullet points that need rewriting to bridge these gaps: ${analysis.gaps.join(', ')}.
    2. For each, provide the original text, the suggested STAR version, and a brief reason.
    3. Also provide a full, cohesive rewrite of the resume.
    
    ${analysis.confirmedSkills && analysis.confirmedSkills.length > 0 ? `NEW CONFIRMED SKILLS: The candidate has confirmed they possess the following skills: ${analysis.confirmedSkills.join(', ')}. MUST integrate these explicitly into the tailored resume and suggest bullet points using them.` : ''}

    TARGET MARKET:
    The candidate is targeting the ${targetMarket} job market. Adjust resume formatting and keyword emphasis accordingly (e.g., US no photo, metric heavy; India photo accepted, etc.).

    Format your response as JSON.
    
    ORIGINAL RESUME:
    ${resume}
    
    NEW CANDIDATE INSIGHTS (Use these to fill gaps):
    ${insights || "No additional insights provided."}
    
    TARGET JOB DESCRIPTION:
    ${jd}`
      }]
    },
    config: {
      systemInstruction: `You are a professional resume writer. ${GLOBAL_GROUNDING_RULES} Your job is to rephrase existing experience into STAR (Situation, Task, Action, Result) format. You MUST NOT hallucinate or add skills/roles that aren't grounded in the provided Resume or Candidate Answers.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          fullText: { type: Type.STRING },
          changes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                original: { type: Type.STRING },
                suggested: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ["id", "original", "suggested", "reason"]
            }
          }
        },
        required: ["fullText", "changes"]
      }
    }
  });

  const data = await safeJsonParse(response.text || '{"fullText": "", "changes": []}');
  return data;
}
