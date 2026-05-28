import { Type } from "@google/genai";
import { getAI, safeJsonParse } from "./config.js";
import { getModelForStep } from "./modelConfig.js";

export async function classifyTrack(jd: string | { data: string, mimeType: string }): Promise<{ track: 'IC' | 'Manager' }> {
  const jdPart = typeof jd === 'string' ? { text: jd } : { inlineData: jd };
  const response = await getAI().models.generateContent({
    model: getModelForStep("classifier"),
    contents: {
      parts: [
        { text: "Analyze this Job Description and classify the track as either 'IC' (Individual Contributor) or 'Manager'." },
        { text: "Job Description Content:" },
        jdPart
      ]
    },
    config: {
      temperature: 0,
      systemInstruction: "You are an Expert HR Lead. Read the JD and return ONLY a JSON object classifying the track.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          track: { type: Type.STRING, description: "Classify as either 'IC' or 'Manager'." }
        },
        required: ["track"]
      }
    }
  });

  const data = await safeJsonParse(response.text || '{"track": "IC"}');
  return { track: data.track === 'Manager' ? 'Manager' : 'IC' };
}
