/**
 * M06: Perception Fusion — Automated Test Runner
 * Author: AI005 (Perception Fusion Engineer)
 * Runs all validation tests for T008 and T009.
 */

import { createHash } from 'node:crypto';
import { sha256 } from '../targetId';
import { runT008Tests } from './perceptionFusion.test';
import { runT009Tests } from './conflictResolution.test';

console.log('================================================================');
console.log('VEIL — M06 Perception Fusion & Conflict Resolution Test Suite');
console.log('Author: AI005 (Perception Fusion Engineer)');
console.log('================================================================\n');

// 1. Cross-verify SHA-256 with Node.js crypto module
console.log('[Test Stage 1] Verifying SHA-256 implementation against Node.js crypto standard vectors...');
const testStrings = [
  '',
  'a',
  'abc',
  'message digest',
  'abcdefghijklmnopqrstuvwxyz',
  '/html/body/main/div[2]/button[1]+1024',
  'Special Characters: !@#$%^&*()_+-=[]{}|;:",.<>?/`~ 🚀 🔒',
  'A very long DOM XPath: /html/body/div[1]/section[2]/div[3]/article[4]/div[5]/div[6]/ul/li[7]/a[1]+999999999',
];

let cryptoParityPassed = true;
for (const str of testStrings) {
  const tsHash = sha256(str);
  const nodeHash = createHash('sha256').update(str, 'utf8').digest('hex');
  if (tsHash !== nodeHash) {
    console.error(`❌ SHA-256 Mismatch for input: "${str}"\nTS:   ${tsHash}\nNode: ${nodeHash}`);
    cryptoParityPassed = false;
  }
}

if (cryptoParityPassed) {
  console.log(`✅ All ${testStrings.length} SHA-256 vectors matched Node.js crypto with 100% bit parity.\n`);
} else {
  console.error('❌ SHA-256 parity verification failed!\n');
  process.exit(1);
}

// 2. Run T008 Tests
console.log('[Test Stage 2] Running T008 — Perception Fusion Tests...');
const t008Results = runT008Tests();
let t008Failed = 0;
for (const res of t008Results) {
  if (res.passed) {
    console.log(`  ✅ ${res.name}`);
  } else {
    console.error(`  ❌ ${res.name}: ${res.error}`);
    t008Failed++;
  }
}
console.log(`T008 Results: ${t008Results.length - t008Failed}/${t008Results.length} passed.\n`);

// 3. Run T009 Tests
console.log('[Test Stage 3] Running T009 — Conflict Resolution & Calibrated Confidence Tests...');
const t009Results = runT009Tests();
let t009Failed = 0;
for (const res of t009Results) {
  if (res.passed) {
    console.log(`  ✅ ${res.name}`);
  } else {
    console.error(`  ❌ ${res.name}: ${res.error}`);
    t009Failed++;
  }
}
console.log(`T009 Results: ${t009Results.length - t009Failed}/${t009Results.length} passed.\n`);

// Summary
const totalTests = t008Results.length + t009Results.length + 1;
const totalFailed = t008Failed + t009Failed + (cryptoParityPassed ? 0 : 1);

console.log('================================================================');
if (totalFailed === 0) {
  console.log(`🎉 ALL ${totalTests} VALIDATION TESTS PASSED SUCCESSFULLY!`);
  console.log('T008 (Perception Fusion) & T009 (Conflict Resolution) ARE FULLY VALIDATED.');
  console.log('================================================================');
  process.exit(0);
} else {
  console.error(`💥 ${totalFailed} TESTS FAILED.`);
  console.log('================================================================');
  process.exit(1);
}
