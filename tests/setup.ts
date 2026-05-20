import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.MOCK_AI) {
  console.warn('\n======================================================');
  console.warn('WARNING: Running tests in REAL API mode.');
  console.warn('This will consume Gemini API quotas and incur costs.');
  console.warn('To use mock mode, run: npm run test:mock');
  console.warn('======================================================\n');
} else {
  console.log('\n[INFO] Running tests in MOCK_AI mode.\n');
}
