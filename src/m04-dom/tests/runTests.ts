import { runExtractorTests } from './extractor.test';

async function main() {
  console.log('--- Starting M04 Validation ---');
  let exitCode = 0;

  const results = await runExtractorTests();
  
  const totalPassed = results.passed;
  const totalFailed = results.failed;
  const total = results.total;

  console.log('\n--- M04 Validation Summary ---');
  console.log(`Total Tests: ${total}`);
  console.log(`Passed:      ${totalPassed}`);
  console.log(`Failed:      ${totalFailed}`);

  if (totalFailed > 0) {
    console.error('\n✗ M04 Validation FAILED.');
    exitCode = 1;
  } else {
    console.log('\n✓ M04 Validation PASSED.');
  }

  process.exit(exitCode);
}

main().catch(console.error);
