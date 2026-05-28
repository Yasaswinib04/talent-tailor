const moduleNameMapper = {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^(\\.{1,2}/.*)\\.js$': '$1',
  '^p-retry$': '<rootDir>/tests/helpers/mockPRetry.ts',
};

if (process.env.MOCK_AI === 'true') {
  moduleNameMapper['^@google/genai$'] = '<rootDir>/tests/helpers/mockAI.ts';
}

/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper,
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
