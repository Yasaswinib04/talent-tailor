import { AnalysisResult, RoleType, HiringPreferences, ExperienceTier } from "../../../types.js";
import { getSessionById, updateSession, supabase, logPipelineEvent } from "../../db.js";
import PQueue from 'p-queue';
import { classifyTrack } from "./classifier.js";
import { scoreCandidate } from "./scorer.js";
import { generateQuestions } from "./questions.js";

export async function analyzeResumes(
  sessionId: string,
  resumes: (string | { data: string, mimeType: string })[],
  jd: string | { data: string, mimeType: string },
  role: RoleType,
  tier: ExperienceTier = 'Senior',
  features: string[] = ['score', 'competencies', 'questions'],
  discoveryAnswers?: { question: string, answer: string }[],
  preferences?: HiringPreferences,
  targetMarket: string = 'India'
): Promise<AnalysisResult> {
  const includeQuestions = features.includes('questions');

  const startTrack = Date.now();
  const { track } = await classifyTrack(jd);
  await logPipelineEvent(sessionId, 'batch-level', 'TrackClassifier', Date.now() - startTrack, 'success');

  const queue = new PQueue({ concurrency: 5 });
  const processedCandidates: any[] = [];

  const analysisPromises = resumes.map(async (resume, index) => {
    return queue.add(async () => {
      const candidateId = `candidate-${index}-${Math.random().toString(36).substr(2, 5)}`;
      try {
        const startScore = Date.now();
        const data = await scoreCandidate(resume, jd, track, role, tier, preferences, targetMarket, discoveryAnswers);
        await logPipelineEvent(sessionId, candidateId, 'CoreScorer', Date.now() - startScore, 'success');
        
        let questions: { question: string }[] = [];
        // Optimize trigger: Only generate interview questions if they are a viable candidate
        if (includeQuestions && data.gaps && data.gaps.length > 0 && data.meetsMandatoryCriteria !== false && data.score >= 5.0) {
          const startQ = Date.now();
          questions = await generateQuestions(data.gaps, role, tier);
          await logPipelineEvent(sessionId, candidateId, 'GapInterrogator', Date.now() - startQ, 'success');
        }

        processedCandidates.push({
          ...data,
          track,
          discoveryQuestions: questions,
          strengths: (data.strengths || []).map((s: string) => ({ text: s })),
          weaknesses: (data.weaknesses || []).map((w: string) => ({ text: w })),
          id: candidateId,
          resumeContent: typeof resume === 'string' ? resume : "[File Content]"
        });
      } catch (err: any) {
        await logPipelineEvent(sessionId, candidateId, 'CoreScorer', 0, 'failed', err.message);
        throw err;
      }
    });
  });

  await Promise.all(analysisPromises);
  const candidates = processedCandidates;

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

export async function runScreeningAnalysis(sessionId: string, hrUserId: string) {
  try {
    const session = await getSessionById(sessionId, hrUserId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    const jobProfile = session.jobProfile || {};
    const uploadedFiles = session.uploadedFiles || [];
    
    const resumes = [];
    for (const file of uploadedFiles) {
      try {
        const { data, error } = await supabase.storage.from('resumes').download(file.path);
        if (error) throw error;
        
        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Data = buffer.toString('base64');
        
        resumes.push({ data: base64Data, mimeType: file.mimeType || 'application/pdf' });
      } catch (e) {
        console.error(`Error downloading file ${file.path} from Supabase:`, e);
      }
    }

    if (resumes.length === 0) {
      throw new Error("No readable resumes found for analysis.");
    }

    const role = jobProfile.role || "Developer";
    const tier = jobProfile.experienceTier || "Senior";
    const jd = jobProfile.jd || "General Job Description";
    const preferences = jobProfile.preferences || null;
    const targetMarket = jobProfile.targetMarket || "India";

    const results = await analyzeResumes(
      sessionId,
      resumes,
      jd,
      role,
      tier,
      ['score', 'competencies', 'questions'],
      undefined,
      preferences,
      targetMarket
    );

    await updateSession(sessionId, hrUserId, {
      status: 'completed',
      analysisResults: results
    });

  } catch (error: any) {
    console.error(`Error in runScreeningAnalysis for session ${sessionId}:`, error);
    try {
      await updateSession(sessionId, hrUserId, {
        status: 'error',
        analysisResults: { error: error.message }
      });
    } catch (e) {
      console.error("Failed to update session error status:", e);
    }
  }
}
