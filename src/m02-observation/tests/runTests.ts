/**
 * Test Runner Entrypoint for M02 Unit Tests
 * Author: AI002 (Browser Observation Engineer)
 */

declare const process: { exit: (code?: number) => never };

import { runAllTests as runScreenshotTests } from './screenshotCapture.test';
import { runDomA11yTests } from './domA11yCapture.test';

async function main() {
  try {
    console.log('=== Running T003 Screenshot & Infrastructure Test Suite ===');
    const screenshotResults = await runScreenshotTests();

    console.log('\n=== Running T004 DOM & Accessibility Test Suite ===');
    const domA11yResults = await runDomA11yTests();

    const totalPassed = screenshotResults.passed + domA11yResults.passed;
    const totalFailed = screenshotResults.failed + domA11yResults.failed;
    const totalCount = screenshotResults.total + domA11yResults.total;

    console.log(`\n======================================================`);
    console.log(`[M02 Validation] TOTAL: ${totalPassed} Passed, ${totalFailed} Failed of ${totalCount} Total Tests`);
    console.log(`======================================================`);

    if (totalFailed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M02 Validation] FAILURE: Tests failed:', err);
    process.exit(1);
  }
}

main();
