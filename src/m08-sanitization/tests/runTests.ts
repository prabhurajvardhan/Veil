/**
 * M08: Sanitization & Redaction — Automated Test Runner
 * Author: AI007 (Sanitization & Redaction Engineer)
 * Runs all validation tests for T011.
 */

declare const process: { exit: (code?: number) => never };

import { runT011Tests } from './observationSanitizer.test';

console.log('================================================================');
console.log('VEIL — M08 Sanitization & Redaction Test Suite (T011)');
console.log('Author: AI007 (Sanitization & Redaction Engineer)');
console.log('================================================================\n');

try {
  const results = runT011Tests();
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
  console.log(`[M08 Validation] TOTAL: ${results.length - failedCount} Passed, ${failedCount} Failed of ${results.length} Total Tests`);
  console.log(`======================================================`);

  if (failedCount > 0) {
    process.exit(1);
  }
  process.exit(0);
} catch (err) {
  console.error('[M08 Validation] FATAL: Uncaught error in test runner:', err);
  process.exit(1);
}
