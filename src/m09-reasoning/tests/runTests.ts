/**
 * M09: Remote Reasoner Gateway — Automated Test Runner
 * Author: AI008 (Reasoning Gateway Engineer)
 * Runs all validation tests for T012.
 */

declare const process: { exit: (code?: number) => never };

import { runT012Tests } from './reasoningGateway.test';

async function main() {
  console.log('================================================================');
  console.log('VEIL — M09 Remote Reasoner Gateway Test Suite (T012)');
  console.log('Author: AI008 (Reasoning Gateway Engineer)');
  console.log('================================================================\n');

  try {
    const results = await runT012Tests();
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
    console.log(`[M09 Validation] TOTAL: ${results.length - failedCount} Passed, ${failedCount} Failed of ${results.length} Total Tests`);
    console.log(`======================================================`);

    if (failedCount > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M09 Validation] FATAL: Uncaught error in test runner:', err);
    process.exit(1);
  }
}

main();
