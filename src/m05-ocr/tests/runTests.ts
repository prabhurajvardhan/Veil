/**
 * Test Runner Entrypoint for M05 Unit Tests
 */

declare const process: { exit: (code?: number) => never };

import { runTesseractAdapterTests } from './tesseractAdapter.test';

async function main() {
  try {
    console.log('=== Running T007 OCR Extraction Test Suite ===');
    const results = await runTesseractAdapterTests();

    console.log(`\n======================================================`);
    console.log(`[M05 Validation] TOTAL: ${results.passed} Passed, ${results.failed} Failed of ${results.total} Total Tests`);
    console.log(`======================================================`);

    if (results.failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error('[M05 Validation] FAILURE: Tests failed:', err);
    process.exit(1);
  }
}

main();
