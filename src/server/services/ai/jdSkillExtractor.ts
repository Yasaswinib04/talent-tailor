import { Type } from "@google/genai";
import { getAI, safeJsonParse } from "./config.js";

export async function extractSkillsFromJD(
  jdText: string,
  roleType: string,
  experienceTier: string
): Promise<{ mandatory: string[]; preferred: string[] }> {
  if (!jdText || jdText.trim().length < 50) {
    return { mandatory: [], preferred: [] };
  }

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        {
          text: `Analyze this Job Description and extract key skills mentioned. Categorize them as:
- "mandatory": skills explicitly listed as required, must-have, or essential
- "preferred": skills listed as nice-to-have, bonus, preferred, or good-to-have

The role is ${roleType} at ${experienceTier} level.
Return ONLY a JSON object with two arrays: "mandatory" and "preferred".
Extract 5-12 skills total. Focus on concrete, testable skills (not vague traits like "passionate" or "self-starter").`
        },
        { text: `Job Description:\n${jdText}` }
      ]
    },
    config: {
      temperature: 0,
      systemInstruction: "You are an expert technical recruiter. Extract skills from job descriptions with high precision. Only return concrete skills, not soft traits.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mandatory: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Must-have skills required in the JD"
          },
          preferred: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Nice-to-have or bonus skills mentioned in the JD"
          }
        },
        required: ["mandatory", "preferred"]
      }
    }
  });

  const data = await safeJsonParse(response.text || '{"mandatory":[],"preferred":[]}');
  return {
    mandatory: (data.mandatory || []).map((s: string) => s.trim()).filter(Boolean),
    preferred: (data.preferred || []).map((s: string) => s.trim()).filter(Boolean),
  };
}
