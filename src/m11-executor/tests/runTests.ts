/**
 * M11: Browser Executor — Test Runner (T014)
 * Author: AI010 (Browser Execution & Integration Engineer)
 */

declare const process: { exit: (code?: number) => never };

import { runT014Tests } from './browserExecutor.test';

async function main() {
  console.log('================================================================');
  console.log('VEIL — M11 Browser Executor Test Suite (T014)');
  console.log('Author: AI010 (Browser Execution & Integration Engineer)');
  console.log('================================================================\n');

  try {
    const results = await runT014Tests();
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
    console.log(`[M11 Executor] TOTAL: ${results.length - failedCount} Passed, ${failedCount} Failed of ${results.length} Total Tests`);
    console.log(`======================================================`);

    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M11 Executor] FATAL error in test runner:', err);
    process.exit(1);
  }
}

main();
