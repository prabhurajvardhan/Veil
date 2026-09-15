/**
 * Test Runner Entrypoint for M03 Visual Perception Unit Tests
 * Author: AI003 (Visual Perception Engineer)
 */

declare const process: { exit: (code?: number) => never };

import { runAllVisualGroundingTests } from './visualGrounding.test';

async function main() {
  try {
    const results = await runAllVisualGroundingTests();
    console.log(`[M03 Validation] SUCCESS: All ${results.passed} tests passed successfully.`);
    process.exit(0);
  } catch (err) {
    console.error('[M03 Validation] FAILURE: Tests failed:', err);
    process.exit(1);
  }
}

main();
