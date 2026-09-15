/**
 * M08: Sanitization & Redaction — T011 Test Suite
 * Author: AI007 (Sanitization & Redaction Engineer)
 *
 * Validates:
 * 1. SAFE text remains unchanged
 * 2. EMAIL is redacted to [REDACTED:EMAIL]
 * 3. PHONE is redacted to [REDACTED:PHONE]
 * 4. PASSWORD is redacted to [REDACTED:PASSWORD]
 * 5. CREDIT_CARD is redacted to [REDACTED:CREDIT_CARD]
 * 6. API_KEY is redacted to [REDACTED:API_KEY]
 * 7. UNKNOWN is redacted to [REDACTED:UNKNOWN]
 * 8. requiresSanitization=true causes redaction
 * 9. Structural fields are preserved (target_id, bbox, role, interactable, confidence)
 * 10. Original PerceptionResult is not mutated
 * 11. Original sensitive values do not appear anywhere in sanitized output
 * 12. Multiple perception nodes are sanitized correctly
 * 13. Empty/missing/mismatched input fails safely
 * 14. Classification/observation IDs are preserved correctly
 * 15. Visual canvas black-box masking applies #000000 over sensitive bounding boxes
 */

import { PerceptionResult, PerceptionNode } from '../../m06-fusion/types';
import { PrivacyClassificationResult, PrivacyAssessment } from '../../m07-privacy/types';
import {
  ObservationSanitizer,
  sanitizeObservation,
  REDACTION_MARKERS,
  SanitizationError,
  InvalidSanitizationInputError,
  ObservationIdMismatchError,
  CanvasElementLike,
  Canvas2DContextLike,
} from '../index';

export function runT011Tests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function assertEqual<T>(actual: T, expected: T, msg: string) {
    if (actual !== expected) {
      throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  function helperMakeNode(overrides: Partial<PerceptionNode>): PerceptionNode {
    return {
      target_id: 'target-001',
      bbox: { x: 10, y: 20, width: 100, height: 40 },
      role: 'button',
      text: 'Submit',
      interactable: true,
      confidence: 0.95,
      ...overrides,
    };
  }

  const sanitizer = new ObservationSanitizer();

  // Test 1: SAFE text remains unchanged
  test('SAFE text remains unchanged and non-redacted', () => {
    const node = helperMakeNode({ target_id: 'btn-safe', text: 'Read Documentation', role: 'link' });
    const perception: PerceptionResult = {
      observation_id: 'obs-safe-1',
      nodes: [node],
      overall_confidence: 0.95,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-safe-1',
      assessments: [
        {
          target_id: 'btn-safe',
          isSensitive: false,
          category: 'SAFE',
          confidence: 0.95,
          reason: 'Normal text',
          requiresSanitization: false,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes.length, 1, 'Should have 1 node');
    assertEqual(sanitized.nodes[0].text, 'Read Documentation', 'SAFE text must remain intact');
    assertEqual(sanitized.nodes[0].is_redacted, false, 'is_redacted must be false');
    assertEqual(sanitized.metadata?.redacted_nodes_count, 0, 'No nodes should be redacted');
  });

  // Test 2: EMAIL is redacted
  test('EMAIL is redacted to [REDACTED:EMAIL]', () => {
    const sensitiveEmail = 'alice.smith@enterprise.org';
    const node = helperMakeNode({ target_id: 'node-email', text: sensitiveEmail });
    const perception: PerceptionResult = {
      observation_id: 'obs-email',
      nodes: [node],
      overall_confidence: 0.90,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-email',
      assessments: [
        {
          target_id: 'node-email',
          isSensitive: true,
          category: 'EMAIL',
          confidence: 0.95,
          reason: 'Matches email pattern',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.EMAIL, 'Text must be [REDACTED:EMAIL]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'EMAIL', 'Category must be EMAIL');
    assert(!JSON.stringify(sanitized).includes(sensitiveEmail), 'Sensitive email must NOT appear in output');
  });

  // Test 3: PHONE is redacted
  test('PHONE is redacted to [REDACTED:PHONE]', () => {
    const sensitivePhone = '+1 (555) 234-5678';
    const node = helperMakeNode({ target_id: 'node-phone', text: sensitivePhone });
    const perception: PerceptionResult = {
      observation_id: 'obs-phone',
      nodes: [node],
      overall_confidence: 0.88,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-phone',
      assessments: [
        {
          target_id: 'node-phone',
          isSensitive: true,
          category: 'PHONE',
          confidence: 0.90,
          reason: 'Matches phone pattern',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.PHONE, 'Text must be [REDACTED:PHONE]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'PHONE', 'Category must be PHONE');
    assert(!JSON.stringify(sanitized).includes(sensitivePhone), 'Sensitive phone must NOT appear in output');
  });

  // Test 4: PASSWORD is redacted
  test('PASSWORD is redacted to [REDACTED:PASSWORD]', () => {
    const sensitivePassword = 'P@ssw0rd!SuperSecret123';
    const node = helperMakeNode({ target_id: 'node-pwd', role: 'password', text: sensitivePassword });
    const perception: PerceptionResult = {
      observation_id: 'obs-pwd',
      nodes: [node],
      overall_confidence: 0.92,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-pwd',
      assessments: [
        {
          target_id: 'node-pwd',
          isSensitive: true,
          category: 'PASSWORD',
          confidence: 0.99,
          reason: 'Password field',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.PASSWORD, 'Text must be [REDACTED:PASSWORD]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'PASSWORD', 'Category must be PASSWORD');
    assert(!JSON.stringify(sanitized).includes(sensitivePassword), 'Sensitive password must NOT appear in output');
  });

  // Test 5: CREDIT_CARD is redacted
  test('CREDIT_CARD is redacted to [REDACTED:CREDIT_CARD]', () => {
    const sensitiveCC = '4111-2222-3333-4444';
    const node = helperMakeNode({ target_id: 'node-cc', text: sensitiveCC });
    const perception: PerceptionResult = {
      observation_id: 'obs-cc',
      nodes: [node],
      overall_confidence: 0.94,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-cc',
      assessments: [
        {
          target_id: 'node-cc',
          isSensitive: true,
          category: 'CREDIT_CARD',
          confidence: 0.98,
          reason: 'Matches credit card pattern',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.CREDIT_CARD, 'Text must be [REDACTED:CREDIT_CARD]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'CREDIT_CARD', 'Category must be CREDIT_CARD');
    assert(!JSON.stringify(sanitized).includes(sensitiveCC), 'Sensitive credit card must NOT appear in output');
  });

  // Test 6: API_KEY is redacted
  test('API_KEY is redacted to [REDACTED:API_KEY]', () => {
    const sensitiveKey = 'sk-proj-984294829384928394829384928349';
    const node = helperMakeNode({ target_id: 'node-apikey', text: sensitiveKey });
    const perception: PerceptionResult = {
      observation_id: 'obs-key',
      nodes: [node],
      overall_confidence: 0.91,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-key',
      assessments: [
        {
          target_id: 'node-apikey',
          isSensitive: true,
          category: 'API_KEY',
          confidence: 0.99,
          reason: 'Matches API key pattern',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.API_KEY, 'Text must be [REDACTED:API_KEY]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'API_KEY', 'Category must be API_KEY');
    assert(!JSON.stringify(sanitized).includes(sensitiveKey), 'Sensitive API key must NOT appear in output');
  });

  // Test 7: UNKNOWN is redacted
  test('UNKNOWN is redacted to [REDACTED:UNKNOWN]', () => {
    const uncertainText = 'Ambiguous content from low perception confidence';
    const node = helperMakeNode({ target_id: 'node-unknown', text: uncertainText });
    const perception: PerceptionResult = {
      observation_id: 'obs-unknown',
      nodes: [node],
      overall_confidence: 0.35,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-unknown',
      assessments: [
        {
          target_id: 'node-unknown',
          isSensitive: true,
          category: 'UNKNOWN',
          confidence: 0.35,
          reason: 'Low confidence perception, fail closed',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.UNKNOWN, 'Text must be [REDACTED:UNKNOWN]');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be marked as redacted');
    assertEqual(sanitized.nodes[0].redaction_category, 'UNKNOWN', 'Category must be UNKNOWN');
    assert(!JSON.stringify(sanitized).includes(uncertainText), 'Uncertain text must NOT appear in output');
  });

  // Test 8: requiresSanitization=true causes redaction even if isSensitive was false
  test('requiresSanitization=true causes redaction regardless of other flags', () => {
    const sensitiveData = 'Special field requiring mandatory scrub';
    const node = helperMakeNode({ target_id: 'node-force-redact', text: sensitiveData });
    const perception: PerceptionResult = {
      observation_id: 'obs-force',
      nodes: [node],
      overall_confidence: 0.85,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-force',
      assessments: [
        {
          target_id: 'node-force-redact',
          isSensitive: false,
          category: 'UNKNOWN',
          confidence: 0.80,
          reason: 'Forced sanitization requirement',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Node must be redacted when requiresSanitization is true');
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.UNKNOWN, 'Redaction marker applied');
  });

  // Test 9: Structural fields are preserved
  test('structural fields are strictly preserved', () => {
    const originalBbox = { x: 142, y: 310, width: 220, height: 48 };
    const node: PerceptionNode = {
      target_id: 'btn-target-strict',
      bbox: originalBbox,
      role: 'combobox',
      text: 'user@example.com',
      interactable: true,
      confidence: 0.8765,
    };
    const perception: PerceptionResult = {
      observation_id: 'obs-struct',
      nodes: [node],
      overall_confidence: 0.8765,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-struct',
      assessments: [
        {
          target_id: 'btn-target-strict',
          isSensitive: true,
          category: 'EMAIL',
          confidence: 0.95,
          reason: 'Email',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    const sNode = sanitized.nodes[0];

    assertEqual(sNode.target_id, 'btn-target-strict', 'target_id must match exactly');
    assertEqual(sNode.bbox.x, 142, 'bbox.x must match');
    assertEqual(sNode.bbox.y, 310, 'bbox.y must match');
    assertEqual(sNode.bbox.width, 220, 'bbox.width must match');
    assertEqual(sNode.bbox.height, 48, 'bbox.height must match');
    assertEqual(sNode.role, 'combobox', 'role must match exactly');
    assertEqual(sNode.interactable, true, 'interactable must match exactly');
    assertEqual(sNode.confidence, 0.8765, 'confidence must match exactly');
  });

  // Test 10: Original PerceptionResult is not mutated
  test('original PerceptionResult is NOT mutated', () => {
    const originalText = 'secret-api-key-9999999999';
    const originalNode: PerceptionNode = {
      target_id: 'node-immutability',
      bbox: { x: 10, y: 10, width: 50, height: 20 },
      role: 'input',
      text: originalText,
      interactable: true,
      confidence: 0.90,
    };
    const perception: PerceptionResult = {
      observation_id: 'obs-mut',
      nodes: [originalNode],
      overall_confidence: 0.90,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-mut',
      assessments: [
        {
          target_id: 'node-immutability',
          isSensitive: true,
          category: 'API_KEY',
          confidence: 0.95,
          reason: 'API Key',
          requiresSanitization: true,
        },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);

    // Verify original object remains completely unaltered
    assertEqual(originalNode.text, originalText, 'originalNode.text must NOT be modified');
    assertEqual(originalNode.bbox.x, 10, 'originalNode.bbox must NOT be modified');
    assert(!('is_redacted' in originalNode), 'originalNode must not have is_redacted property attached');

    // Mutating sanitized bbox must not alter original bbox
    sanitized.nodes[0].bbox.x = 999;
    assertEqual(originalNode.bbox.x, 10, 'Modifying sanitized bbox must not alter original bbox');
  });

  // Test 11: Original sensitive values do not appear anywhere in sanitized output
  test('original sensitive values do not appear anywhere in sanitized output', () => {
    const sensitiveTokens = [
      'very-secret-password-xyz',
      'user-credit-card-1234-5678-9012-3456',
      'personal-phone-555-0199',
    ];

    const perception: PerceptionResult = {
      observation_id: 'obs-leak-check',
      nodes: [
        helperMakeNode({ target_id: 'n1', text: sensitiveTokens[0], role: 'password' }),
        helperMakeNode({ target_id: 'n2', text: sensitiveTokens[1], role: 'input' }),
        helperMakeNode({ target_id: 'n3', text: sensitiveTokens[2], role: 'text' }),
      ],
      overall_confidence: 0.90,
    };

    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-leak-check',
      assessments: [
        { target_id: 'n1', isSensitive: true, category: 'PASSWORD', confidence: 0.95, reason: '', requiresSanitization: true },
        { target_id: 'n2', isSensitive: true, category: 'CREDIT_CARD', confidence: 0.95, reason: '', requiresSanitization: true },
        { target_id: 'n3', isSensitive: true, category: 'PHONE', confidence: 0.95, reason: '', requiresSanitization: true },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    const jsonOutput = JSON.stringify(sanitized);

    for (const token of sensitiveTokens) {
      assert(!jsonOutput.includes(token), `Output MUST NOT contain sensitive token: ${token}`);
    }
  });

  // Test 12: Multiple perception nodes are sanitized correctly (mix of safe and sensitive)
  test('multiple perception nodes are sanitized correctly with mixed sensitivity', () => {
    const perception: PerceptionResult = {
      observation_id: 'obs-multi',
      nodes: [
        helperMakeNode({ target_id: 'node-h1', text: 'Account Settings', role: 'heading' }),
        helperMakeNode({ target_id: 'node-email', text: 'john@example.com', role: 'textbox' }),
        helperMakeNode({ target_id: 'node-save', text: 'Save Profile', role: 'button' }),
        helperMakeNode({ target_id: 'node-key', text: 'sk-94829348923849283948', role: 'code' }),
      ],
      overall_confidence: 0.92,
    };

    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-multi',
      assessments: [
        { target_id: 'node-h1', isSensitive: false, category: 'SAFE', confidence: 0.95, reason: '', requiresSanitization: false },
        { target_id: 'node-email', isSensitive: true, category: 'EMAIL', confidence: 0.95, reason: '', requiresSanitization: true },
        { target_id: 'node-save', isSensitive: false, category: 'SAFE', confidence: 0.95, reason: '', requiresSanitization: false },
        { target_id: 'node-key', isSensitive: true, category: 'API_KEY', confidence: 0.95, reason: '', requiresSanitization: true },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy);

    assertEqual(sanitized.nodes.length, 4, 'Must return 4 nodes');
    assertEqual(sanitized.nodes[0].text, 'Account Settings', 'Node 0 must be SAFE');
    assertEqual(sanitized.nodes[0].is_redacted, false, 'Node 0 not redacted');

    assertEqual(sanitized.nodes[1].text, REDACTION_MARKERS.EMAIL, 'Node 1 must be redacted email');
    assertEqual(sanitized.nodes[1].is_redacted, true, 'Node 1 redacted');

    assertEqual(sanitized.nodes[2].text, 'Save Profile', 'Node 2 must be SAFE');
    assertEqual(sanitized.nodes[2].is_redacted, false, 'Node 2 not redacted');

    assertEqual(sanitized.nodes[3].text, REDACTION_MARKERS.API_KEY, 'Node 3 must be redacted API key');
    assertEqual(sanitized.nodes[3].is_redacted, true, 'Node 3 redacted');

    assertEqual(sanitized.metadata?.total_nodes, 4, 'Total nodes = 4');
    assertEqual(sanitized.metadata?.redacted_nodes_count, 2, 'Redacted nodes = 2');
    assertEqual(sanitized.metadata?.sanitization_applied, true, 'Sanitization applied = true');
  });

  // Test 13: Unassessed node in privacy result fails closed ([REDACTED:UNKNOWN])
  test('unassessed node fails closed with [REDACTED:UNKNOWN]', () => {
    const node = helperMakeNode({ target_id: 'node-missing-assessment', text: 'Possibly sensitive unknown string' });
    const perception: PerceptionResult = {
      observation_id: 'obs-missing',
      nodes: [node],
      overall_confidence: 0.85,
    };
    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-missing',
      assessments: [], // Empty assessment array
    };

    const sanitized = sanitizer.sanitize(perception, privacy);
    assertEqual(sanitized.nodes[0].text, REDACTION_MARKERS.UNKNOWN, 'Unassessed node must be redacted to UNKNOWN');
    assertEqual(sanitized.nodes[0].is_redacted, true, 'Unassessed node must be marked is_redacted: true');
    assertEqual(sanitized.nodes[0].redaction_category, 'UNKNOWN', 'Category must be UNKNOWN');
  });

  // Test 14: Empty / missing input fails safely
  test('empty / missing input fails safely with clear errors', () => {
    let threwNullPerception = false;
    try {
      sanitizer.sanitize(null as any, { observation_id: '1', assessments: [] });
    } catch (err) {
      threwNullPerception = err instanceof InvalidSanitizationInputError;
    }
    assert(threwNullPerception, 'Must throw InvalidSanitizationInputError for null perception');

    let threwNullPrivacy = false;
    try {
      sanitizer.sanitize({ observation_id: '1', nodes: [], overall_confidence: 1 }, null as any);
    } catch (err) {
      threwNullPrivacy = err instanceof InvalidSanitizationInputError;
    }
    assert(threwNullPrivacy, 'Must throw InvalidSanitizationInputError for null privacy');

    let threwEmptyId = false;
    try {
      sanitizer.sanitize(
        { observation_id: '', nodes: [], overall_confidence: 1 },
        { observation_id: '', assessments: [] }
      );
    } catch (err) {
      threwEmptyId = err instanceof InvalidSanitizationInputError;
    }
    assert(threwEmptyId, 'Must throw InvalidSanitizationInputError for empty observation_id');
  });

  // Test 15: Mismatched observation IDs fail closed to prevent cross-observation leakage
  test('mismatched observation IDs fail closed with ObservationIdMismatchError', () => {
    let threwMismatch = false;
    try {
      sanitizer.sanitize(
        { observation_id: 'obs-A', nodes: [], overall_confidence: 1 },
        { observation_id: 'obs-B', assessments: [] }
      );
    } catch (err) {
      threwMismatch = err instanceof ObservationIdMismatchError;
    }
    assert(threwMismatch, 'Must throw ObservationIdMismatchError on mismatched observation_id');
  });

  // Test 16: Classification and observation IDs are preserved correctly
  test('observation ID and timestamp are preserved correctly', () => {
    const timestamp = 1757945000000;
    const sanitized = sanitizeObservation(
      { observation_id: 'obs-exact-id-12345', nodes: [], overall_confidence: 0.98 },
      { observation_id: 'obs-exact-id-12345', assessments: [] },
      { timestamp }
    );

    assertEqual(sanitized.observation_id, 'obs-exact-id-12345', 'observation_id must match exactly');
    assertEqual(sanitized.timestamp, timestamp, 'timestamp must match provided option');
    assertEqual(sanitized.overall_confidence, 0.98, 'overall_confidence must match');
  });

  // Test 17: Visual canvas masking renders opaque #000000 rectangles
  test('visual canvas masking renders opaque #000000 rectangles over sensitive bounding boxes', () => {
    const filledRects: { x: number; y: number; w: number; h: number; fillStyle: string }[] = [];

    const mockCtx: Canvas2DContextLike = {
      fillStyle: '',
      fillRect(x, y, w, h) {
        filledRects.push({ x, y, w, h, fillStyle: String(this.fillStyle) });
      },
      drawImage() {},
    };

    const mockCanvas: CanvasElementLike = {
      width: 1280,
      height: 720,
      getContext(id) {
        if (id === '2d') return mockCtx;
        return null;
      },
      toDataURL() {
        return 'data:image/png;base64,mockMaskedImageData';
      },
    };

    const canvasFactory = () => mockCanvas;

    const perception: PerceptionResult = {
      observation_id: 'obs-canvas-mask',
      nodes: [
        helperMakeNode({ target_id: 'node-safe', bbox: { x: 0, y: 0, width: 50, height: 20 }, text: 'Safe' }),
        helperMakeNode({ target_id: 'node-pwd', bbox: { x: 100, y: 200, width: 150, height: 35 }, text: 'secret', role: 'password' }),
      ],
      overall_confidence: 0.95,
    };

    const privacy: PrivacyClassificationResult = {
      observation_id: 'obs-canvas-mask',
      assessments: [
        { target_id: 'node-safe', isSensitive: false, category: 'SAFE', confidence: 0.9, reason: '', requiresSanitization: false },
        { target_id: 'node-pwd', isSensitive: true, category: 'PASSWORD', confidence: 0.95, reason: '', requiresSanitization: true },
      ],
    };

    const sanitized = sanitizer.sanitize(perception, privacy, {
      screenshotBase64: 'data:image/png;base64,mockOriginalImageData',
      canvasFactory,
    });

    assertEqual(sanitized.screenshot, 'data:image/png;base64,mockMaskedImageData', 'Masked screenshot returned');
    assertEqual(filledRects.length, 1, 'Exactly 1 black box drawn for 1 sensitive node');
    assertEqual(filledRects[0].fillStyle, '#000000', 'Fill style must be #000000');
    assertEqual(filledRects[0].x, 100, 'X coordinate matches sensitive node bbox');
    assertEqual(filledRects[0].y, 200, 'Y coordinate matches sensitive node bbox');
    assertEqual(filledRects[0].w, 150, 'Width matches sensitive node bbox');
    assertEqual(filledRects[0].h, 35, 'Height matches sensitive node bbox');
  });

  return results;
}
