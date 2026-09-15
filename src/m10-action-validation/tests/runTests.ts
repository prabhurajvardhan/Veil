/**
 * M10: Local Action Guard / Action Validation — Automated Test Runner
 * Author: AI009 (Action Validation Engineer)
 * Runs all validation tests for T013.
 */

declare const process: { exit: (code?: number) => never };

import { runT013Tests } from './actionValidator.test';

async function main() {
  console.log('================================================================');
  console.log('VEIL — M10 Local Action Guard Test Suite (T013)');
  console.log('Author: AI009 (Action Validation Engineer)');
  console.log('================================================================\n');

  try {
    const results = await runT013Tests();
    let failedCount = 0;

    for (const res of results) {
      if (res.passed) {
        console.log(`  ✅ ${res.name}`);
      } else {
        console.error(`  ❌ ${res.name}: ${res.error}`);
        failedCount++;
      }
    }

    console.log(`\n======================================================`);
    console.log(`[M10 Validation] TOTAL: ${results.length - failedCount} Passed, ${failedCount} Failed of ${results.length} Total Tests`);
    console.log(`======================================================`);

    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M10 Validation] FATAL: Uncaught error in test runner:', err);
    process.exit(1);
  }
}

main();
