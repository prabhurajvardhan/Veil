/**
 * M01: End-to-End System Integration & Security Verification — Test Runner (T015)
 * Author: AI010 (Browser Execution & Integration Engineer)
 */

declare const process: { exit: (code?: number) => never };

import { runT015Tests } from './e2eIntegration.test';

async function main() {
  console.log('================================================================');
  console.log('VEIL — M01 System Integration & Security Test Suite (T015)');
  console.log('Author: AI010 (Browser Execution & Integration Engineer)');
  console.log('================================================================\n');

  try {
    const results = await runT015Tests();
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
    console.log(`[M01 E2E Integration] TOTAL: ${results.length - failedCount} Passed, ${failedCount} Failed of ${results.length} Total Tests`);
    console.log(`======================================================`);

    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M01 E2E Integration] FATAL error in test runner:', err);
    process.exit(1);
  }
}

main();
