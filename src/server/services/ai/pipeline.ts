import { AnalysisResult, RoleType, HiringPreferences, ExperienceTier, IndustryType } from "../../../types.js";
import { getSessionById, updateSession, supabase, logPipelineEvent, getResumeText, setResumeText } from "../../db.js";
import PQueue from 'p-queue';
import { classifyTrack } from "./classifier.js";
import { scoreCandidate } from "./scorer.js";
import { generateQuestions } from "./questions.js";
import { preFilterResume, PreFilterResult } from "../preFilter.js";
import { extractResumeText } from "../extract.js";

function checkOverqualified(experienceYears: string | undefined, minRequired: number | undefined): boolean {
  if (!experienceYears || !minRequired || minRequired <= 0) return false;
  const years = parseFloat(experienceYears);
  if (isNaN(years)) return false;
  return years >= minRequired + 5;
}

interface ResumeInput {
  text: string;
  inlineData?: { data: string; mimeType: string };
  filePath?: string;
  preFilter?: PreFilterResult;
}

export async function analyzeResumes(
  sessionId: string,
  resumes: ResumeInput[],
  jd: string | { data: string, mimeType: string },
  role: RoleType,
  tier: ExperienceTier = 'Senior',
  features: string[] = ['score', 'competencies'],
  discoveryAnswers?: { question: string, answer: string }[],
  preferences?: HiringPreferences,
  targetMarket: string = 'India',
  industry?: IndustryType
): Promise<AnalysisResult> {
  const includeQuestions = features.includes('questions');

  const startTrack = Date.now();
  const jdText = typeof jd === 'string' ? jd : (jd as any).text || '';
  const { track } = await classifyTrack(jdText);
  await logPipelineEvent(sessionId, 'batch-level', 'TrackClassifier', Date.now() - startTrack, 'success');

  const queue = new PQueue({ concurrency: 5 });
  const processedCandidates: any[] = [];

  const analysisPromises = resumes.map(async (resume, index) => {
    return queue.add(async () => {
      const candidateId = `candidate-${index}-${Math.random().toString(36).substr(2, 5)}`;

      if (resume.preFilter && !resume.preFilter.pass) {
        processedCandidates.push({
          name: 'Pre-Filtered Candidate',
          score: 0,
          meetsMandatoryCriteria: false,
          failedCriteria: resume.preFilter.failedCriteria,
          overallFeedback: resume.preFilter.reason,
          professionalSummary: '',
          bulletedAchievements: [],
          strengths: [],
          weaknesses: [],
          competencies: [],
          gaps: [],
          experienceYears: '0',
          atsScore: 0,
          keywords: { present: [], missing: [] },
          roleType: role,
          experienceTier: tier,
          track,
          discoveryQuestions: [],
          preFiltered: true,
          id: candidateId,
          resumeContent: resume.text.slice(0, 500),
        });
        return;
      }

      try {
        const startScore = Date.now();
        const resumeArg = resume.inlineData?.data
          ? { data: resume.inlineData.data, mimeType: resume.inlineData.mimeType }
          : resume.text;
        const data = await scoreCandidate(
          resumeArg,
          jdText,
          track,
          role,
          tier,
          preferences,
          targetMarket,
          discoveryAnswers,
          industry
        );
        await logPipelineEvent(sessionId, candidateId, 'CoreScorer', Date.now() - startScore, 'success');

        let questions: { question: string }[] = [];
        if (includeQuestions && data.gaps && data.gaps.length > 0 && data.meetsMandatoryCriteria !== false && data.score >= 5.0) {
          const startQ = Date.now();
          questions = await generateQuestions(data.gaps, role, tier);
          await logPipelineEvent(sessionId, candidateId, 'GapInterrogator', Date.now() - startQ, 'success');
        }

        processedCandidates.push({
          ...data,
          track,
          overqualified: checkOverqualified(data.experienceYears, preferences?.minExperienceYears),
          discoveryQuestions: questions,
          strengths: (data.strengths || []).map((s: string) => ({ text: s })),
          weaknesses: (data.weaknesses || []).map((w: string) => ({ text: w })),
          id: candidateId,
          resumeContent: resume.text,
        });
      } catch (err: any) {
        await logPipelineEvent(sessionId, candidateId, 'CoreScorer', 0, 'failed', err.message);
        throw err;
      }
    });
  });

  await Promise.all(analysisPromises);
  const candidates = processedCandidates;

  let rankedCandidates = candidates.sort((a, b) => {
    if (a.preFiltered && !b.preFiltered) return 1;
    if (!a.preFiltered && b.preFiltered) return -1;
    return (b.score || 0) - (a.score || 0);
  });

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
    const preferences: HiringPreferences | null = jobProfile.preferences || null;

    const resumeInputs: ResumeInput[] = [];
    let preFilteredCount = 0;
    let extractedCount = 0;

    for (const file of uploadedFiles) {
      try {
        const cached = await getResumeText(file.path);
        if (cached?.extracted_text) {
          extractedCount++;
          const preFilter = preferences ? preFilterResume(cached.extracted_text, preferences) : undefined;
          if (preFilter && preFilter.failedCount > (preferences?.maxFailedCriteria ?? 0)) {
            preFilteredCount++;
          }
          resumeInputs.push({
            text: cached.extracted_text,
            filePath: file.path,
            preFilter,
          });
          continue;
        }

        const { data, error } = await supabase.storage.from('resumes').download(file.path);
        if (error) throw error;

        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.mimeType || 'application/pdf';

        let text: string | null = null;
        try {
          const result = await extractResumeText(buffer, mimeType);
          if (!result.isScanned && result.text.length > 50) {
            text = result.text;
            setResumeText(file.path, result.text, result.tokenCount);
            extractedCount++;
          }
        } catch (extractErr) {
          console.warn(`On-the-fly extraction failed for ${file.path}: ${(extractErr as Error).message}`);
        }

        if (text) {
          const preFilter = preferences ? preFilterResume(text, preferences) : undefined;
          if (preFilter && preFilter.failedCount > (preferences?.maxFailedCriteria ?? 0)) {
            preFilteredCount++;
          }
          resumeInputs.push({ text, filePath: file.path, preFilter });
        } else if (mimeType.startsWith('image/')) {
          console.warn(`[Pipeline] Skipping image file ${file.path} — image resumes are not supported.`);
        } else {
          const base64Data = buffer.toString('base64');
          resumeInputs.push({
            text: base64Data,
            inlineData: { data: base64Data, mimeType },
            filePath: file.path,
          });
        }
      } catch (e) {
        console.error(`Error loading resume ${file.path} from Supabase:`, e);
      }
    }

    if (resumeInputs.length === 0) {
      throw new Error("No readable resumes found for analysis.");
    }

    console.log(`[Pipeline] ${resumeInputs.length} resumes: ${extractedCount} cached text, ${preFilteredCount} pre-filtered out`);

    const role = jobProfile.role || "Full Stack Developer";
    const tier = jobProfile.experienceTier || "Senior";
    const jd = jobProfile.jd || "General Job Description";
    const targetMarket = jobProfile.targetMarket || "India";
    const industry = jobProfile.industry as IndustryType | undefined;

    const results = await analyzeResumes(
      sessionId,
      resumeInputs,
      jd,
      role,
      tier,
      ['score', 'competencies'],
      undefined,
      preferences,
      targetMarket,
      industry
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
