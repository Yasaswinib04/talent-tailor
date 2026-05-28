import { Type } from "@google/genai";
import { CandidateProfile } from "../../../types.js";
import { getAI, safeJsonParse, GLOBAL_GROUNDING_RULES } from "./config.js";
import { getModelForStep } from "./modelConfig.js";

export async function extractProfile(resume: string | { data: string, mimeType: string }): Promise<CandidateProfile> {
  const resumePart = typeof resume === 'string' ? { text: resume } : { inlineData: resume };
  const response = await getAI().models.generateContent({
    model: getModelForStep("extractor"),
    contents: {
      parts: [
        { text: "Extract detailed profile information from this resume." },
        resumePart
      ]
    },
    config: {
      systemInstruction: `You are a professional data extractor and career coach. 
      ${GLOBAL_GROUNDING_RULES}
      Extract candidate information and perform a deep analysis of their professional profile. 
      Provide EXHAUSTIVE lists of generic professional strengths and potential weaknesses/growth areas based solely on their resume content. 
      If information like Notice Period, CTC, or Preferred Location is missing, enter 'Not mentioned'.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          email: { type: Type.STRING },
          phone: { type: Type.STRING },
          noticePeriod: { type: Type.STRING },
          currentCTC: { type: Type.STRING },
          expectedCTC: { type: Type.STRING },
          currentLocation: { type: Type.STRING },
          preferredLocation: { type: Type.STRING },
          totalWorkExperience: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exhaustive list of 8-12 professional strengths" },
          weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exhaustive list of 5-8 potential maturity or skill gaps" },
          education: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                degree: { type: Type.STRING },
                gpa: { type: Type.STRING },
                college: { type: Type.STRING },
                specialization: { type: Type.STRING },
                graduationYear: { type: Type.STRING }
              },
              required: ["degree", "gpa", "college", "graduationYear"]
            }
          },
          workHistory: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                company: { type: Type.STRING },
                designation: { type: Type.STRING },
                location: { type: Type.STRING },
                description: { type: Type.STRING, description: "Detailed description of responsibilities and achievements" },
                period: { type: Type.STRING, description: "Tenure e.g. Jan 2020 - Present" }
              },
              required: ["company", "designation", "location", "description"]
            }
          }
        },
        required: ["name", "noticePeriod", "currentCTC", "expectedCTC", "currentLocation", "preferredLocation", "totalWorkExperience", "strengths", "weaknesses", "education", "workHistory"]
      }
    }
  });

  const data = await safeJsonParse(response.text || '{}');
  return {
    ...data,
    resumeContent: typeof resume === 'string' ? resume : "[File Content]"
  };
}
