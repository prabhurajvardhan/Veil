/**
 * Test Runner Entrypoint for M02 Unit Tests
 * Author: AI002 (Browser Observation Engineer)
 */

declare const process: { exit: (code?: number) => never };

import { runAllTests } from './screenshotCapture.test';

async function main() {
  try {
    const results = await runAllTests();
    console.log(`[M02 Validation] SUCCESS: All ${results.passed} tests passed successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('[M02 Validation] FAILURE: Tests failed:', err);
    process.exit(1);
  }
}

main();
