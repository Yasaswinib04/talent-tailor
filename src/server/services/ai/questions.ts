import { Type } from "@google/genai";
import { RoleType, ExperienceTier } from "../../../types.js";
import { getAI, safeJsonParse } from "./config.js";

export async function generateQuestions(gaps: string[], role: RoleType, tier: ExperienceTier): Promise<{ question: string }[]> {
  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: {
      parts: [
        { text: `Generate 6-8 discovery questions based on these identified gaps and weaknesses: ${gaps.join(', ')}` },
        { text: `Role: ${role}, Tier: ${tier}. Respect junior/senior/manager focus when generating questions.` }
      ]
    },
    config: {
      temperature: 0.7,
      systemInstruction: "You are an expert technical recruiter. Create discovery questions to clarify a candidate's experience regarding their gaps.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING }
          },
          required: ["question"]
        }
      }
    }
  });

  const data = await safeJsonParse(response.text || '[]');
  return data;
}
