import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, RoleType, CandidateAnalysis, CandidateProfile, HiringPreferences, ExperienceTier } from "../types";
import { ROLE_WEIGHTS, RoleWeight, TIER_CONFIG, getEffectiveWeights } from "../constants/roles";

type AIStep = 'classifier' | 'scorer' | 'questions' | 'tailor' | 'extractor';

const MODEL_MAP: Record<AIStep, string> = {
  classifier: (process.env as any).GEMINI_MODEL_CLASSIFIER || 'gemini-2.5-flash',
  scorer:     (process.env as any).GEMINI_MODEL_SCORER || 'gemini-2.5-pro',
  questions:  (process.env as any).GEMINI_MODEL_QUESTIONS || 'gemini-2.5-flash',
  tailor:     (process.env as any).GEMINI_MODEL_TAILOR || 'gemini-2.5-pro',
  extractor:  (process.env as any).GEMINI_MODEL_EXTRACTOR || 'gemini-2.5-flash',
};

function getModelForStep(step: AIStep): string {
  return MODEL_MAP[step];
}

let genAI: GoogleGenAI | null = null;

function getAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("CRITICAL: GEMINI_API_KEY is missing in environment variables. Please add it to your .env file to enable AI analysis.");
    }
    genAI = new GoogleGenAI({ apiKey });
  }
  return genAI;
}

// UPDATED: Added Strict Anti-Hallucination rules for metrics
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

// UPDATED: Added Bifurcated Tracks and Experience Decay
const SYSTEM_PROMPT = `You are TalentTailor AI, an Expert HR Lead specializing in B2B SaaS and tech hiring.
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

function normalizeScore(score: any): number {
  let s = Number(score);
  if (isNaN(s)) return 0;
  if (s > 10 && s <= 100) return Number((s / 10).toFixed(1));
  if (s > 0 && s < 1) return Number((s * 10).toFixed(1));
  return Number(Math.min(10, Math.max(0, s)).toFixed(1));
}

// UPDATED: Refactored into three agent functions
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

export async function scoreCandidate(
  resume: string | { data: string, mimeType: string },
  jd: string | { data: string, mimeType: string },
  track: 'IC' | 'Manager',
  role: RoleType,
  tier: ExperienceTier = 'Senior',
  preferences?: HiringPreferences,
  targetMarket: string = 'India',
  discoveryAnswers?: { question: string, answer: string }[]
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

  if (discoveryAnswers && discoveryAnswers.length > 0) {
    promptParts.push({ text: "The candidate has provided additional context via discovery questions. Use these answers to refine the scores and reduce gaps if the answers demonstrate relevant experience." });
    promptParts.push({ text: "Discovery Answers:\n" + discoveryAnswers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join("\n\n") });
  }

  promptParts.push({ text: "Resume Content:" });
  promptParts.push(resumePart);
  promptParts.push({ text: "Job Description Content:" });
  promptParts.push(jdPart);

  const properties: any = {
    name: { type: Type.STRING, description: "Full name of the candidate. If not found, use 'Candidate'." },
    score: { type: Type.NUMBER, description: "Match score from 0.0 to 10.0 based on how well the candidate matches the JD. NEVER exceed 10.0." },
    overallFeedback: { type: Type.STRING, description: "A detailed summary of the candidate's fit. Be blunt. If they lack domain experience mentioned in JD, say so." },
    professionalSummary: { type: Type.STRING, description: "A non-hallucinated professional summary based solely on the ATS profile facts. To be used in final resume tailoring." },
    bulletedAchievements: { type: Type.ARRAY, items: { type: Type.STRING }, description: "High-impact STAR bullets grounded ONLY in facts extracted from the resume." },
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
    experienceYears: { type: Type.STRING, description: "Total years of professional experience as a number or string e.g. '8.5' or '12'." },
    atsScore: { type: Type.NUMBER, description: "ATS-style keyword match score from 0 to 10." },
    keywords: {
      type: Type.OBJECT,
      properties: {
        present: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must-have keywords found in the resume." },
        missing: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Must-have keywords missing from the resume." }
      },
      required: ["present", "missing"]
    },
    roleType: { type: Type.STRING, description: "One of the predefined roles e.g. 'Product Manager', 'Frontend Developer', etc." },
    experienceTier: { type: Type.STRING, description: "Seniority level e.g. 'Junior', 'Senior', 'Executive'." }
  };

  const requiredFields = ["name", "score", "professionalSummary", "bulletedAchievements", "overallFeedback", "strengths", "weaknesses", "competencies", "gaps", "meetsMandatoryCriteria", "experienceYears", "atsScore", "keywords", "roleType", "experienceTier"];

  const effectiveWeights = getEffectiveWeights(role as RoleType, tier as ExperienceTier);
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

export async function generateQuestions(gaps: string[], role: RoleType, tier: ExperienceTier): Promise<{ question: string }[]> {
  const response = await getAI().models.generateContent({
    model: getModelForStep("questions"),
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

export async function analyzeResumes(
  resumes: (string | { data: string, mimeType: string })[],
  jd: string | { data: string, mimeType: string },
  role: RoleType,
  tier: ExperienceTier = 'Senior',
  features: string[] = ['score', 'competencies', 'tailor'],
  discoveryAnswers?: { question: string, answer: string }[],
  preferences?: HiringPreferences,
  targetMarket: string = 'India'
): Promise<AnalysisResult> {
  const includeQuestions = features.includes('questions');

  // Step 1: Classify track once using JD
  const { track } = await classifyTrack(jd);

  const analysisPromises = resumes.map(async (resume) => {
    // Step 2: Score candidate
    const data = await scoreCandidate(resume, jd, track, role, tier, preferences, targetMarket, discoveryAnswers);
    
    // Step 3: Generate questions (optionally in parallel, but here it depends on gaps)
    let questions: { question: string }[] = [];
    if (includeQuestions && data.gaps && data.gaps.length > 0) {
      questions = await generateQuestions(data.gaps, role, tier);
    }

    return {
      ...data,
      track,
      discoveryQuestions: questions,
      strengths: (data.strengths || []).map((s: string) => ({ text: s })),
      weaknesses: (data.weaknesses || []).map((w: string) => ({ text: w })),
      id: Math.random().toString(36).substr(2, 9),
      resumeContent: typeof resume === 'string' ? resume : "[File Content]"
    };
  });

  const candidates = await Promise.all(analysisPromises);

  let rankedCandidates = candidates.sort((a, b) => (b.score || 0) - (a.score || 0));

  if (preferences && preferences.topN > 0) {
    rankedCandidates = rankedCandidates.slice(0, preferences.topN);
  }

  return {
    role,
    jdContent: typeof jd === 'string' ? jd : "[File Content]",
    candidates: rankedCandidates,
    preferences,
    createdAt: new Date().toISOString()
  };
}

// INTACT: tailorResume function remains untouched
export async function tailorResume(resume: string, jd: string, analysis: CandidateAnalysis, targetMarket: string = 'India'): Promise<{ fullText: string, changes: any[] }> {
  const insights = analysis.discoveryQuestions
    .filter(q => q.answer)
    .map(q => `Question: ${q.question}\nCandidate Answer: ${q.answer}`)
    .join("\n\n");

  const response = await getAI().models.generateContent({
    model: getModelForStep("tailor"),
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

// INTACT: extractProfile function remains untouched
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