export type AIStep =
  | 'classifier'
  | 'scorer'
  | 'questions'
  | 'tailor'
  | 'extractor'
  | 'jdSkillExtractor';

export const DEFAULT_MODEL_MAP: Record<AIStep, string> = {
  classifier:       'gemini-2.5-flash',
  scorer:           'gemini-2.5-pro',
  questions:        'gemini-2.5-flash',
  tailor:           'gemini-2.5-pro',
  extractor:        'gemini-2.5-flash',
  jdSkillExtractor: 'gemini-2.5-flash',
};

export function getModelForStep(step: AIStep): string {
  const envKey = `GEMINI_MODEL_${step.toUpperCase()}`;
  return process.env[envKey] || DEFAULT_MODEL_MAP[step];
}
