import { HiringPreferences } from '../../types.js';

export interface PreFilterResult {
  pass: boolean;
  failedCriteria: string[];
  failedCount: number;
  reason: string;
}

const TIER1_DOMAINS = [
  'iit', 'nit', 'bits', 'iim', 'isb', 'xlri', 'sp jain',
  'iiit', 'dtu', 'nsut', 'jamia', 'jnu', 'du', 'srm', 'vit',
  'mit', 'stanford', 'harvard', 'carnegie mellon', 'uc berkeley',
  'oxford', 'cambridge', 'imperial college', 'lse',
  'eth zurich', 'nus', 'tsinghua', 'columbia', 'princeton', 'yale',
  'wharton', 'duke', 'nyu', 'brown', 'caltech', 'ua', 'georgia tech',
  'university of michigan', 'purdue', 'ucla', 'university of texas'
];

function extractExperienceYears(text: string): number {
  const lower = text.toLowerCase();

  const totalPatterns = [
    /(\d+\.?\d*)\s*(?:\+\s*)?years?\s*(?:of\s*)?(?:total\s*)?(?:work\s*)?experience/i,
    /(?:total\s*)?(?:work\s*)?experience\s*(?:of\s*)?[:]?\s*(\d+\.?\d*)\s*(?:\+\s*)?years?/i,
    /experience\s*[:]?\s*(\d+\.?\d*)\s*(?:\+\s*)?y(?:ea)?rs?/i,
  ];

  for (const pattern of totalPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  const dateRanges = lower.match(/(\d{4})\s*[-–—to]+\s*(present|current|\d{4})/g);
  if (dateRanges && dateRanges.length > 0) {
    const years: { start: number; end: number }[] = [];
    for (const range of dateRanges) {
      const parts = range.match(/(\d{4})\s*[-–—to]+\s*(present|current|(\d{4}))/i);
      if (parts) {
        const start = parseInt(parts[1]);
        const end = parts[2] && ['present', 'current'].includes(parts[2].toLowerCase())
          ? new Date().getFullYear()
          : parseInt(parts[3] || String(new Date().getFullYear()));
        years.push({ start, end });
      }
    }

    if (years.length > 0) {
      years.sort((a, b) => a.start - b.start);
      const earliestStart = years[0].start;
      const latestEnd = Math.max(...years.map(y => y.end));
      const totalExp = Math.round(((latestEnd - earliestStart) / 12) * 10) / 10;
      return Math.max(0, totalExp);
    }
  }

  return 0;
}

function extractEducationInfo(text: string): { degrees: string[]; institutions: string[] } {
  const lower = text.toLowerCase();
  const degrees: string[] = [];
  const institutions: string[] = [];

  const degreePatterns = [
    /(?:b\.?\s*(?:tech|e|sc|a|com)|bachelor\s*(?:of|in)\s*\w+|b\.s\.|b\.a\.|b\.com)/gi,
    /(?:m\.?\s*(?:tech|e|sc|a|com|ba)|master\s*(?:of|in)\s*\w+|m\.s\.|m\.a\.|m\.com|mba)/gi,
    /(?:ph\.?\s*d\.?|doctorate|philosophy)/gi,
    /(?:diploma|associate|certificate)/gi,
  ];

  for (const pattern of degreePatterns) {
    const matches = lower.match(pattern);
    if (matches) {
      for (const m of matches) {
        if (!degrees.includes(m.trim())) {
          degrees.push(m.trim());
        }
      }
    }
  }

  for (const domain of TIER1_DOMAINS) {
    if (lower.includes(domain)) {
      institutions.push(domain);
    }
  }

  return { degrees, institutions };
}

export function preFilterResume(
  extractedText: string,
  preferences?: HiringPreferences | null
): PreFilterResult {
  if (!preferences) {
    return { pass: true, failedCriteria: [], failedCount: 0, reason: 'No preferences configured' };
  }

  const failed: string[] = [];
  const textLower = extractedText.toLowerCase();
  const { degrees, institutions } = extractEducationInfo(extractedText);

  const maxFailed = preferences.maxFailedCriteria ?? 0;

  if (preferences.minExperienceYears > 0) {
    const experienceYears = extractExperienceYears(extractedText);
    if (experienceYears < preferences.minExperienceYears) {
      failed.push(`Experience: ${experienceYears} yrs < required ${preferences.minExperienceYears} yrs`);
    }
  }

  if (preferences.mandatorySkills && preferences.mandatorySkills.length > 0) {
    for (const skill of preferences.mandatorySkills) {
      if (!textLower.includes(skill.toLowerCase())) {
        failed.push(`Missing mandatory skill: ${skill}`);
      }
    }
  }

  if (preferences.preferredSkills && preferences.preferredSkills.length > 0) {
    // preferredSkills are bonus-only — never trigger rejection, just tracked for scoring
  }

  if (preferences.isMBAMandatory) {
    const hasMBA = degrees.some(d =>
      d.includes('mba') || d.includes('master of business')
    );
    if (!hasMBA) {
      failed.push('MBA degree required but not found');
    }
  }

  if (preferences.isTierIMandatory) {
    if (institutions.length === 0) {
      failed.push('Tier-1 university education required but not found');
    }
  }

  if (preferences.preferredCompanies && preferences.preferredCompanies.length > 0) {
    let hasPreferred = false;
    for (const company of preferences.preferredCompanies) {
      if (textLower.includes(company.toLowerCase())) {
        hasPreferred = true;
        break;
      }
    }
    if (!hasPreferred) {
      failed.push('No experience at preferred companies');
    }
  }

  const reason = failed.length > 0
    ? `Pre-filter failed: ${failed.join('; ')}`
    : 'All mandatory criteria met';

  return {
    pass: failed.length <= maxFailed,
    failedCriteria: failed,
    failedCount: failed.length,
    reason,
  };
}
