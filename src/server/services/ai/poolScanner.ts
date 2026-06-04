import { HiringPreferences, ExperienceTier, IndustryType } from "../../../types.js";
import { preFilterResume } from "../preFilter.js";
import { scoreCandidate } from "./scorer.js";
import { classifyTrack } from "./classifier.js";
import { getPoolProfilesExcludingSession } from "../../db.js";

export async function scanPool(
  sessionId: string,
  jdText: string,
  role: string,
  tier: string,
  preferences: HiringPreferences | null,
  targetMarket: string,
  topN: number = 20
): Promise<{
  total: number;
  sievedOut: number;
  passing: number;
  scored: number;
  matches: any[];
}> {
  const profiles = await getPoolProfilesExcludingSession(sessionId, 200);
  const total = profiles.length;

  if (total === 0) {
    return { total: 0, sievedOut: 0, passing: 0, scored: 0, matches: [] };
  }

  // Layer 1: The Sieve — deterministic, zero tokens
  const passingProfiles: any[] = [];
  let sievedOut = 0;

  for (const profile of profiles) {
    const text = profile.resume_text || '';
    if (!text) { sievedOut++; continue; }
    const result = preFilterResume(text, preferences);
    if (result.pass) {
      passingProfiles.push(profile);
    } else {
      sievedOut++;
    }
  }

  const passing = passingProfiles.length;
  if (passing === 0) {
    return { total, sievedOut, passing: 0, scored: 0, matches: [] };
  }

  // Layer 2: The Ranker — Gemini AI scoring
  const track = await classifyTrack(jdText);
  const matches: any[] = [];

  for (let i = 0; i < passingProfiles.length; i++) {
    const profile = passingProfiles[i];
    try {
      const data = await scoreCandidate(
        profile.resume_text,
        jdText,
        track.track,
        role as any,
        (tier || 'Senior') as ExperienceTier,
        preferences || undefined,
        targetMarket,
        undefined,
        undefined
      );
      matches.push({
        ...data,
        poolProfileId: profile.id,
        poolProfileName: profile.name,
        sessionId: profile.source_session_id,
      });
    } catch (err: any) {
      console.warn(`Pool scanner scoring failed for profile ${profile.id}:`, err.message);
    }
  }

  matches.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
  const topMatches = matches.slice(0, topN);

  return {
    total,
    sievedOut,
    passing,
    scored: topMatches.length,
    matches: topMatches,
  };
}
