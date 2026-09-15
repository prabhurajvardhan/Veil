/**
 * M06: Perception Fusion — T009 Test Suite (Conflict Resolution & Confidence)
 * Author: AI005 (Perception Fusion Engineer)
 * Validates: Multimodal discrepancy detection, antonym contradiction, calibrated confidence scoring,
 *            fail-closed propagation for M07, uncertainty vs absence semantics
 */

import {
  PerceptionFusionEngine,
  ConflictResolver,
  ConfidenceCalculator,
  areContradictoryTexts,
  evaluateTextSimilarity,
  VisualEvidence,
  DomEvidence,
  OcrEvidence,
} from '../index';

export function runT009Tests(): { name: string; passed: boolean; error?: string }[] {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function test(name: string, fn: () => void) {
    try {
      fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  // 1. Text Contradiction & Similarity Utilities
  test('areContradictoryTexts identifies known action antonyms', () => {
    assert(areContradictoryTexts('Cancel', 'Submit'), "'Cancel' vs 'Submit' must be recognized as contradictory");
    assert(areContradictoryTexts('Cancel button', 'Submit Form'), "'Cancel button' vs 'Submit Form' must be contradictory");
    assert(areContradictoryTexts('Delete Account', 'Save Changes'), "'Delete' vs 'Save' must be contradictory");
    assert(areContradictoryTexts('Sign In', 'Sign Out'), "'Sign In' vs 'Sign Out' must be contradictory");

    // Non-contradictory
    assert(!areContradictoryTexts('Search Google', 'Search'), "'Search Google' vs 'Search' should NOT be contradictory");
    assert(!areContradictoryTexts('Submit', 'Submit'), "Identical strings should NOT be contradictory");
  });

  test('evaluateTextSimilarity returns 0.0 for contradictory actions and >0.7 for partial matches', () => {
    assert(evaluateTextSimilarity('Cancel', 'Submit') === 0.0, "Contradictory actions should have 0.0 similarity");
    assert(evaluateTextSimilarity('Search', 'Search Google') >= 0.7, "Substring match should have >=0.7 similarity");
    assert(evaluateTextSimilarity('Submit Order', 'Submit Order') === 1.0, "Identical text should have 1.0 similarity");
  });

  // 2. Frozen Requirement from LOCAL-PERCEPTION.md: Visual 'Cancel' vs DOM 'Submit'
  test('reconciles Visual "Cancel" vs DOM "Submit" by flagging CRITICAL conflict, low confidence (<0.5), and UNKNOWN state', () => {
    const visualEvidence: VisualEvidence = {
      source: 'ShowUI-2B',
      elements: [
        {
          bbox: { x: 100, y: 50, width: 80, height: 35 },
          label: 'Cancel button',
          confidence: 0.90,
        },
      ],
    };

    const domEvidence: DomEvidence = {
      source: 'CDP',
      elements: [
        {
          xpath: '/html/body/dialog/button[2]',
          backendNodeId: 204,
          bbox: { x: 100, y: 50, width: 80, height: 35 },
          role: 'button',
          text: 'Submit',
          interactable: true,
        },
      ],
    };

    const engine = new PerceptionFusionEngine();
    const detailed = engine.fuseDetailed({
      observation_id: 'obs-conflict-cancel-submit',
      visual: visualEvidence,
      dom: domEvidence,
    });

    assert(detailed.detailedNodes.length === 1, 'Should produce 1 fused candidate');
    const cand = detailed.detailedNodes[0];

    // Conflict Check
    assert(cand.conflicts.length > 0, 'Must detect at least 1 conflict');
    const textConflict = cand.conflicts.find((c) => c.type === 'SEMANTIC_TEXT_MISMATCH');
    assert(Boolean(textConflict), 'Must flag SEMANTIC_TEXT_MISMATCH');
    assert(textConflict?.severity === 'CRITICAL', 'Severity must be CRITICAL');

    // Uncertainty State: Must be UNKNOWN (per PERCEPTION-FUSION.md & LOCAL-PERCEPTION.md)
    assert(cand.state === 'UNKNOWN', `State must be UNKNOWN, got: ${cand.state}`);

    // Fail-Closed Rule for M07: Confidence must be strictly < 0.50
    assert(
      cand.confidence < 0.50,
      `Confidence must be strictly < 0.50 to trigger M07 fail-closed redaction, got: ${cand.confidence}`
    );
    assert(
      cand.confidence <= 0.20,
      `Critical contradiction should heavily drop confidence (<= 0.20), got: ${cand.confidence}`
    );

    // PerceptionResult output
    const node = detailed.perceptionResult.nodes[0];
    assert(node.confidence === cand.confidence, 'PerceptionNode must carry the low confidence score');
    assert(detailed.overallState === 'UNKNOWN', 'Overall observation state must be UNKNOWN');
    assert(
      detailed.perceptionResult.overall_confidence < 0.50,
      'Overall observation confidence must be degraded'
    );
  });

  // 3. OCR vs DOM text discrepancy
  test('flags discrepancy between DOM text and OCR text', () => {
    const engine = new PerceptionFusionEngine();
    const detailed = engine.fuseDetailed({
      observation_id: 'obs-ocr-conflict',
      dom: {
        source: 'CDP',
        elements: [
          {
            xpath: '/div/button',
            backendNodeId: 301,
            bbox: { x: 50, y: 50, width: 100, height: 40 },
            role: 'button',
            text: 'Accept Terms',
            interactable: true,
          },
        ],
      },
      ocr: {
        source: 'Tesseract.js',
        elements: [
          {
            bbox: { x: 50, y: 50, width: 100, height: 40 },
            text: 'Decline Offer', // Antonym
            confidence: 0.95,
          },
        ],
      },
    });

    const cand = detailed.detailedNodes[0];
    const conflict = cand.conflicts.find((c) => c.type === 'SEMANTIC_TEXT_MISMATCH');
    assert(Boolean(conflict), 'Must detect semantic mismatch between DOM and OCR');
    assert(cand.state === 'UNKNOWN', 'Must be marked UNKNOWN');
    assert(cand.confidence < 0.50, 'Confidence must be < 0.50');
  });

  // 4. Spatial Discrepancy Detection
  test('flags SPATIAL_DISCREPANCY when boxes have large center distance offset', () => {
    const resolver = new ConflictResolver();
    const conflicts = resolver.detectConflicts({
      sources: ['dom', 'visual'],
      domElement: {
        xpath: '/div/a',
        backendNodeId: 99,
        bbox: { x: 0, y: 0, width: 50, height: 20 },
        role: 'link',
        text: 'Home',
        interactable: true,
      },
      visualElement: {
        bbox: { x: 150, y: 150, width: 50, height: 20 }, // 212px away!
        label: 'Home',
        confidence: 0.85,
      },
    });

    const spatialConflict = conflicts.find((c) => c.type === 'SPATIAL_DISCREPANCY');
    assert(Boolean(spatialConflict), 'Should flag SPATIAL_DISCREPANCY for distant boxes');
    assert(spatialConflict?.severity === 'HIGH', 'Severity should be HIGH for 150px+ offset');
  });

  // 5. Interactability & Role Discrepancy
  test('flags INTERACTABILITY_MISMATCH when Visual predicts button but DOM marks generic non-interactive', () => {
    const resolver = new ConflictResolver();
    const conflicts = resolver.detectConflicts({
      sources: ['dom', 'visual'],
      domElement: {
        xpath: '/div/span',
        backendNodeId: 55,
        bbox: { x: 10, y: 10, width: 60, height: 30 },
        role: 'generic',
        text: 'Click here',
        interactable: false,
      },
      visualElement: {
        bbox: { x: 10, y: 10, width: 60, height: 30 },
        label: 'Submit button',
        confidence: 0.88,
      },
    });

    const mismatch = conflicts.find((c) => c.type === 'INTERACTABILITY_MISMATCH');
    assert(Boolean(mismatch), 'Should flag INTERACTABILITY_MISMATCH');
  });

  // 6. Calibrated Confidence Scoring Dynamics
  test('demonstrates calibrated confidence hierarchy: Tri-modal > Dual-modal > Single-modal > Conflicted', () => {
    const calc = new ConfidenceCalculator();

    // Tri-modal (DOM + Visual + OCR)
    const triModalConf = calc.calculateNodeConfidence(
      {
        sources: ['dom', 'visual', 'ocr'],
        domElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, role: 'button', text: 'OK', interactable: true },
        visualElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, label: 'OK', confidence: 0.95 },
        ocrElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, text: 'OK', confidence: 0.95 },
        matchedIoU: 0.9,
      },
      []
    );

    // Dual-modal (DOM + Visual)
    const dualModalConf = calc.calculateNodeConfidence(
      {
        sources: ['dom', 'visual'],
        domElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, role: 'button', text: 'OK', interactable: true },
        visualElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, label: 'OK', confidence: 0.95 },
        matchedIoU: 0.9,
      },
      []
    );

    // Single-modal (DOM only)
    const domOnlyConf = calc.calculateNodeConfidence(
      {
        sources: ['dom'],
        domElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, role: 'button', text: 'OK', interactable: true },
      },
      []
    );

    // Single-modal (Visual only)
    const visualOnlyConf = calc.calculateNodeConfidence(
      {
        sources: ['visual'],
        visualElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, label: 'button', confidence: 0.85 },
      },
      []
    );

    // Conflicted (DOM + Visual with CRITICAL conflict)
    const conflictedConf = calc.calculateNodeConfidence(
      {
        sources: ['dom', 'visual'],
        domElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, role: 'button', text: 'Submit', interactable: true },
        visualElement: { bbox: { x: 0, y: 0, width: 50, height: 20 }, label: 'Cancel', confidence: 0.95 },
      },
      [{ type: 'SEMANTIC_TEXT_MISMATCH', severity: 'CRITICAL', message: 'Mismatch', sources: ['dom', 'visual'] }]
    );

    assert(triModalConf > dualModalConf, `Tri-modal (${triModalConf}) should exceed Dual-modal (${dualModalConf})`);
    assert(dualModalConf > domOnlyConf, `Dual-modal (${dualModalConf}) should exceed DOM-only (${domOnlyConf})`);
    assert(domOnlyConf > visualOnlyConf, `DOM-only (${domOnlyConf}) should exceed Visual-only (${visualOnlyConf})`);
    assert(conflictedConf < 0.30, `Conflicted (${conflictedConf}) must be < 0.30`);
  });

  // 7. Uncertainty State Semantics: NOT OBSERVED ≠ DOES NOT EXIST
  test('distinguishes explicit uncertainty from absence', () => {
    const resolver = new ConflictResolver();

    // High confidence, corroborated -> OBSERVED
    const stateObserved = resolver.determinePerceptionState(
      [],
      {
        sources: ['dom', 'visual'],
        domElement: { bbox: { x: 0, y: 0, width: 10, height: 10 }, role: 'button', interactable: true },
      },
      0.92
    );
    assert(stateObserved === 'OBSERVED', `Expected OBSERVED, got ${stateObserved}`);

    // Conflicted -> UNKNOWN (even if individual source confidence was 0.95)
    const stateConflict = resolver.determinePerceptionState(
      [{ type: 'SEMANTIC_TEXT_MISMATCH', severity: 'CRITICAL', message: 'Conflict', sources: ['dom', 'visual'] }],
      {
        sources: ['dom', 'visual'],
      },
      0.15
    );
    assert(stateConflict === 'UNKNOWN', `Expected UNKNOWN for conflicted, got ${stateConflict}`);

    // Low confidence below uncertaintyThreshold -> UNKNOWN
    const stateLowConf = resolver.determinePerceptionState(
      [],
      {
        sources: ['visual'],
      },
      0.25
    );
    assert(stateLowConf === 'UNKNOWN', `Expected UNKNOWN for low confidence, got ${stateLowConf}`);
  });

  return results;
}
