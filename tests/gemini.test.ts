import fs from 'fs';
import path from 'path';

// Conditionally mock the Google GenAI client based on environment variable
jest.mock('@google/genai', () => {
  if (process.env.MOCK_AI === 'true') {
    return require('./helpers/mockAI');
  }
  return jest.requireActual('@google/genai');
});

import { extractProfile, classifyTrack, scoreCandidate, analyzeResumes, tailorResume } from '../src/services/gemini';
import { HiringPreferences } from '../src/types';

// Helper to read fixture content
function getFixture(filename: string) {
  return fs.readFileSync(path.resolve(__dirname, 'fixtures', filename), 'utf8');
}

describe('Gemini AI Services', () => {

  describe('extractProfile', () => {
    it('should extract a valid candidate profile', async () => {
      const resume = getFixture('strong_match_resume.txt');
      const profile = await extractProfile(resume);
      
      expect(profile.name).toBe('Jane Doe');
      expect(profile.strengths.length).toBeGreaterThan(0);
      expect(Array.isArray(profile.education)).toBe(true);
      expect(profile.education.length).toBeGreaterThan(0);
    });

    it('should handle a resume with no clear name', async () => {
      const resume = getFixture('no_name_resume.txt');
      const profile = await extractProfile(resume);
      
      // Depending on the AI, it should either default to "Candidate" or "Unidentified Candidate"
      expect(profile.name).toMatch(/candidate|unidentified/i);
    });

    it('should handle gibberish by returning Invalid Document', async () => {
      const resume = getFixture('gibberish_resume.txt');
      const profile = await extractProfile(resume);
      
      expect(profile.name).toBe('Invalid Document');
      expect(profile.strengths.length).toBe(0);
    });
  });

  describe('classifyTrack', () => {
    it('should classify Manager JD as Manager', async () => {
      const jd = getFixture('manager_jd.txt');
      const result = await classifyTrack(jd);
      expect(result.track).toBe('Manager');
    });

    it('should classify IC JD as IC', async () => {
      const jd = getFixture('ic_jd.txt');
      const result = await classifyTrack(jd);
      expect(result.track).toBe('IC');
    });
  });

  describe('scoreCandidate', () => {
    const jd = getFixture('ic_jd.txt');
    const role = 'Product Manager';

    it('should score a perfect match > 8', async () => {
      const resume = getFixture('strong_match_resume.txt');
      const result = await scoreCandidate(resume, jd, 'IC', role, 'Senior');
      
      expect(result.score).toBeGreaterThan(8);
      expect(result.competencies.length).toBeGreaterThan(0);
      result.competencies.forEach((comp: any) => {
        expect(comp).toHaveProperty('evidence');
        expect(comp.evidence).toBeTruthy();
      });
    });

    it('should cap score at <= 4.5 for missing mandatory criteria', async () => {
      const resume = getFixture('weak_match_resume.txt');
      const result = await scoreCandidate(resume, jd, 'IC', role, 'Junior');
      
      expect(result.score).toBeLessThanOrEqual(4.5);
      expect(result.meetsMandatoryCriteria).toBe(false);
    });

    it('should infer implicit skills based on new grounding rules', async () => {
      const resume = getFixture('implicit_skills_resume.txt');
      const result = await scoreCandidate(resume, jd, 'IC', 'Developer', 'Senior');
      
      // Should find "Performance Optimization" or similar skill inferred from "reduced latency"
      const skills = [
        ...(result.strengths || []),
        ...(result.competencies || []).map((c: any) => c.name)
      ].join(' ').toLowerCase();
      
      expect(skills).toMatch(/performance|optimization/i);
    });
  });

  describe('tailorResume', () => {
    it('should rewrite experience into STAR bullets without hallucinating', async () => {
      const resume = getFixture('strong_match_resume.txt');
      const jd = getFixture('ic_jd.txt');
      
      // Minimal CandidateAnalysis mock
      const analysisMock: any = {
        gaps: ['Requires technical focus'],
        discoveryQuestions: []
      };

      const result = await tailorResume(resume, jd, analysisMock, 'United States');
      
      expect(result).toHaveProperty('fullText');
      expect(result).toHaveProperty('changes');
      expect(Array.isArray(result.changes)).toBe(true);
      
      // Assert that it doesn't invent things like "PhD"
      expect(result.fullText).not.toMatch(/PhD/);
      
      if (result.changes.length > 0) {
        expect(result.changes[0]).toHaveProperty('original');
        expect(result.changes[0]).toHaveProperty('suggested');
      }
    });
  });

  describe('analyzeResumes (Bulk Upload Flow)', () => {
    it('should handle bulk upload, respect topN, and sort by score', async () => {
      const strongResume = getFixture('strong_match_resume.txt');
      const weakResume = getFixture('weak_match_resume.txt');
      const jd = getFixture('ic_jd.txt');

      // 3 strong, 2 weak
      const resumes = [
        weakResume,
        strongResume,
        strongResume,
        weakResume,
        strongResume
      ];

      const preferences: HiringPreferences = {
        isTierIMandatory: false,
        isMBAMandatory: false,
        minExperienceYears: 3,
        preferredCompanies: [],
        mandatorySkills: ['Roadmap'],
        topN: 3
      };

      const result = await analyzeResumes(
        resumes,
        jd,
        'Product Manager',
        'Senior',
        ['score'], // minimal features to speed up
        [],
        preferences,
        'India'
      );

      // Verify exactly 3 candidates are returned due to topN = 3
      expect(result.candidates.length).toBe(3);

      // Verify sorting (descending)
      expect(result.candidates[0].score).toBeGreaterThanOrEqual(result.candidates[1].score);
      expect(result.candidates[1].score).toBeGreaterThanOrEqual(result.candidates[2].score);

      // Verify weak candidates are not in the top 3 (their scores would be <= 4.5)
      result.candidates.forEach(c => {
        expect(c.score).toBeGreaterThan(4.5);
      });
    });
  });

  describe('Integration Pipeline', () => {
    it('should run the full pipeline without error', async () => {
      const resume = getFixture('strong_match_resume.txt');
      const jd = getFixture('ic_jd.txt');

      // 1. Extract Profile
      const profile = await extractProfile(resume);
      expect(profile).toBeDefined();

      // 2. Classify Track
      const { track } = await classifyTrack(jd);
      
      // 3. Score
      const scoreData = await scoreCandidate(resume, jd, track, 'Product Manager', 'Senior');
      expect(scoreData.score).toBeDefined();

      // 4. Tailor
      const tailord = await tailorResume(resume, jd, { ...scoreData, discoveryQuestions: [] }, 'India');
      expect(tailord.fullText).toBeDefined();
    });
  });

});
