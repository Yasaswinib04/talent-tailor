import fs from 'fs';
import path from 'path';

// Helper to load responses from the fixtures directory
function loadMockResponse(filename: string) {
  try {
    const filePath = path.resolve(process.cwd(), 'tests', 'fixtures', 'responses', filename);
    const content = fs.readFileSync(filePath, 'utf8');
    // Return formatted to mimic the generateContent response structure
    return { text: content };
  } catch (err) {
    console.error(`Mock error: Could not load mock response file ${filename}`);
    return { text: '{}' };
  }
}

export const Type = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT'
};

export class GoogleGenAI {
  models: any;

  constructor(config: any) {
    this.models = {
      generateContent: async (params: any) => {
        const promptParts = params.contents.parts;
        const textParts = promptParts.map((p: any) => p.text || '').join(' ');

        // Routing logic based on prompt content
        if (textParts.includes("Extract detailed profile information")) {
          if (textParts.includes("404 Not Found")) {
            return loadMockResponse("extract_gibberish.json");
          } else if (textParts.includes("Experienced developer with 10 years")) {
            return loadMockResponse("extract_no_name.json");
          }
          return loadMockResponse("extract_success.json");
        }

        if (textParts.includes("classify the track as either 'IC'")) {
          if (textParts.includes("manage headcount") || textParts.includes("Manager")) {
            return loadMockResponse("classify_manager.json");
          }
          return loadMockResponse("classify_ic.json");
        }

        if (textParts.includes("evaluate strengths/weaknesses")) {
          if (textParts.includes("404 Not Found") || textParts.includes("Gibberish")) {
            return loadMockResponse("score_gibberish.json");
          } else if (textParts.includes("Jane Doe") || textParts.includes("Senior B2B SaaS")) {
            return loadMockResponse("score_strong.json");
          } else if (textParts.includes("John Smith") || textParts.includes("Weak")) {
            return loadMockResponse("score_weak.json");
          } else if (textParts.includes("Alice Coder")) {
            return loadMockResponse("score_implicit.json");
          } else if (textParts.includes("Experienced developer")) {
            return loadMockResponse("score_no_name.json");
          }
          // Default for bulk testing
          return loadMockResponse("score_strong.json");
        }

        if (textParts.includes("Generate 6-8 discovery questions")) {
          return loadMockResponse("questions.json");
        }

        if (textParts.includes("You are an elite career strategist") || textParts.includes("tailored resume")) {
          return loadMockResponse("tailor.json");
        }

        return { text: '{}' };
      }
    };
  }
}
