import { runPrivacyTests } from './privacyClassifier.test';

async function main() {
  try {
    runPrivacyTests();
    console.log('All T010 Privacy Classification tests passed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Test suite failed:', error);
    process.exit(1);
  }
}

main();
