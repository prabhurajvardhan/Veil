import { classifyPrivacy, PrivacyClassifier } from '../privacyClassifier';
import { PerceptionResult, PerceptionNode } from '../../m06-fusion/types';

let passed = 0;
let failed = 0;

function assertEqual(actual: any, expected: any, message: string) {
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message} (Expected ${expected}, got ${actual})`);
    failed++;
  }
}

function createNode(overrides: Partial<PerceptionNode>): PerceptionNode {
  return {
    target_id: 'test_node',
    bbox: { x: 0, y: 0, width: 100, height: 100 },
    role: 'element',
    text: null,
    interactable: false,
    confidence: 0.9,
    ...overrides
  };
}

export function runPrivacyTests() {
  console.log('--- Running Privacy Classifier Tests ---');
  const classifier = new PrivacyClassifier();

  // Test 1: Safe Node
  let node = createNode({ text: 'Welcome to our website', role: 'heading' });
  let result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, false, 'Ordinary text should be SAFE');
  assertEqual(result.category, 'SAFE', 'Category should be SAFE');

  // Test 2: Email
  node = createNode({ text: 'Contact us at user@example.com for help' });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Email should be sensitive');
  assertEqual(result.category, 'EMAIL', 'Category should be EMAIL');

  // Test 3: Phone
  node = createNode({ text: 'Call me at +1 800 555 1234' });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Phone number should be sensitive');
  assertEqual(result.category, 'PHONE', 'Category should be PHONE');

  // Test 4: Credit Card
  node = createNode({ text: 'Card: 4111-1111-1111-1111' });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Credit card should be sensitive');
  assertEqual(result.category, 'CREDIT_CARD', 'Category should be CREDIT_CARD');

  // Test 5: API Key
  node = createNode({ text: 'sk-abcdefghijklmnopqrstuvwxyz1234567890' });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'API Key should be sensitive');
  assertEqual(result.category, 'API_KEY', 'Category should be API_KEY');

  // Test 6: Password Role
  node = createNode({ role: 'password' });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Password role should be sensitive');
  assertEqual(result.category, 'PASSWORD', 'Category should be PASSWORD');

  // Test 7: Low Confidence (Fail Closed)
  node = createNode({ text: 'Random text', confidence: 0.4 });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Low confidence should fail closed');
  assertEqual(result.category, 'UNKNOWN', 'Low confidence category should be UNKNOWN');

  // Test 8: Missing Text on Input (Fail Closed)
  node = createNode({ role: 'input', text: null });
  result = classifier.classifyNode(node);
  assertEqual(result.isSensitive, true, 'Input with missing text should fail closed');
  assertEqual(result.category, 'UNKNOWN', 'Category should be UNKNOWN');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}
