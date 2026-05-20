# Talent Engine Test Suite

This repository contains a comprehensive Jest test suite to validate the AI integration and data pipelines of Talent Engine Pro.

## Setup

1. Make sure your dependencies are installed:
   ```bash
   npm install
   ```

2. **API Key Setup**:
   The tests use the real Gemini API by default to test prompt structures and actual generation quality. 
   Ensure you have a `.env.local` file at the root of your project with your Gemini API key:
   ```
   GEMINI_API_KEY=your_real_api_key_here
   ```

## Running Tests

There are two modes for running the test suite:

### 1. Mock Mode (Recommended for rapid testing)
This mode does NOT make network calls and does NOT consume your API quotas. It uses pre-defined JSON responses from `tests/fixtures/responses/`.

```bash
npm run test:mock
```

### 2. Live API Mode (Costs Quota)
This mode calls the real Gemini API. A 30-second timeout is configured, so expect this to take 1-3 minutes.

```bash
npm run test
```

## Adding New Fixtures

To test new edge cases, add your text files to `tests/fixtures/`. 

If you want to support them in Mock mode, you must:
1. Run the test once in Live mode and `console.log` the response JSON.
2. Save that JSON to `tests/fixtures/responses/`.
3. Update the routing logic in `tests/helpers/mockAI.ts` to detect your specific prompt/fixture and return your new JSON response.
