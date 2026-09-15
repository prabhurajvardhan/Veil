/**
 * M06: Perception Fusion — T008 Test Suite
 * Author: AI005 (Perception Fusion Engineer)
 * Validates: Spatial IoU fusion, multimodal reconciliation, canonical target IDs, provenance
 */

import {
  PerceptionFusionEngine,
  fusePerception,
  calculateIoU,
  calculateIntersectionArea,
  calculateUnionArea,
  centerDistance,
  isContained,
  sha256,
  generateDeterministicTargetId,
  generateSyntheticTargetId,
  ensureCanonicalTargetId,
  InvalidObservationError,
  PerceptionFusionError,
  VisualEvidence,
  DomEvidence,
  OcrEvidence,
} from '../index';

export function runT008Tests(): { name: string; passed: boolean; error?: string }[] {
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

  // 1. SHA-256 and Target ID Generation
  test('SHA-256 produces valid 64-char hex hash matching FIPS standard vectors', () => {
    // Empty string SHA-256
    const emptyHash = sha256('');
    assert(
      emptyHash === 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      `Expected standard empty sha256, got: ${emptyHash}`
    );

    // "abc" SHA-256
    const abcHash = sha256('abc');
    assert(
      abcHash === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      `Expected standard 'abc' sha256, got: ${abcHash}`
    );
  });

  test('generateDeterministicTargetId produces canonical SHA-256(DOM_XPath + BackendNodeId)', () => {
    const xpath = '/html/body/div[1]/button[2]';
    const backendNodeId = 42;
    const targetId = generateDeterministicTargetId(xpath, backendNodeId);

    assert(typeof targetId === 'string', 'targetId must be a string');
    assert(targetId.length === 64, `targetId length must be 64, got ${targetId.length}`);

    // Verify determinism
    const targetId2 = generateDeterministicTargetId(xpath, backendNodeId);
    assert(targetId === targetId2, 'Target IDs must be deterministic for identical xpath + backendNodeId');

    // Verify distinction
    const differentId = generateDeterministicTargetId(xpath, 43);
    assert(targetId !== differentId, 'Different backendNodeIds must yield different target IDs');
  });

  test('generateSyntheticTargetId produces unique deterministic IDs for non-DOM elements', () => {
    const id1 = generateSyntheticTargetId('visual', 'button@100,200,80,30');
    const id2 = generateSyntheticTargetId('visual', 'button@100,200,80,30');
    assert(id1 === id2, 'Synthetic IDs must be deterministic');
    assert(id1.length === 64, 'Synthetic ID must be 64-char sha256');
  });

  // 2. Spatial IoU Math
  test('calculateIoU handles identical, disjoint, and partial overlapping boxes correctly', () => {
    const boxA = { x: 0, y: 0, width: 100, height: 100 };
    const boxB = { x: 0, y: 0, width: 100, height: 100 };
    assert(calculateIoU(boxA, boxB) === 1.0, 'Identical boxes must have IoU of 1.0');

    const disjoint = { x: 200, y: 200, width: 50, height: 50 };
    assert(calculateIoU(boxA, disjoint) === 0.0, 'Disjoint boxes must have IoU of 0.0');

    // Overlapping: 50x100 overlap
    const halfOverlap = { x: 50, y: 0, width: 100, height: 100 };
    const intersection = calculateIntersectionArea(boxA, halfOverlap);
    const union = calculateUnionArea(boxA, halfOverlap);
    const iou = calculateIoU(boxA, halfOverlap);

    assert(intersection === 50 * 100, `Intersection should be 5000, got ${intersection}`);
    assert(union === 15000, `Union should be 15000, got ${union}`);
    assert(Math.abs(iou - 5000 / 15000) < 0.0001, `IoU should be ~0.3333, got ${iou}`);
  });

  test('isContained accurately detects containment', () => {
    const outer = { x: 10, y: 10, width: 200, height: 100 };
    const inner = { x: 20, y: 20, width: 50, height: 30 };
    assert(isContained(inner, outer), 'Inner box should be contained in outer box');
  });

  // 3. Core Multimodal Fusion (T008)
  test('fusePerception reconciles Visual + DOM + OCR evidence, favoring DOM coordinates', () => {
    const visualEvidence: VisualEvidence = {
      source: 'ShowUI-2B',
      elements: [
        {
          bbox: { x: 102, y: 51, width: 98, height: 38 }, // Jittered visual VLM box
          label: 'Submit Order button',
          confidence: 0.92,
        },
      ],
    };

    const domEvidence: DomEvidence = {
      source: 'CDP',
      elements: [
        {
          xpath: '/html/body/main/form/button[1]',
          backendNodeId: 101,
          bbox: { x: 100, y: 50, width: 100, height: 40 }, // Authoritative exact CDP DOM box
          role: 'button',
          text: 'Submit Order',
          interactable: true,
        },
      ],
    };

    const ocrEvidence: OcrEvidence = {
      source: 'Tesseract.js',
      elements: [
        {
          bbox: { x: 105, y: 55, width: 90, height: 30 },
          text: 'Submit Order',
          confidence: 0.95,
        },
      ],
    };

    const engine = new PerceptionFusionEngine();
    const result = engine.fuse({
      observation_id: 'obs-001',
      visual: visualEvidence,
      dom: domEvidence,
      ocr: ocrEvidence,
    });

    assert(result.observation_id === 'obs-001', 'observation_id must be preserved');
    assert(result.nodes.length === 1, `Expected 1 fused node, got ${result.nodes.length}`);

    const node = result.nodes[0];
    // Coordinate Rule: Must favor DOM coordinates for physical alignment
    assert(
      node.bbox.x === 100 && node.bbox.y === 50 && node.bbox.width === 100 && node.bbox.height === 40,
      'Fused node must use exact DOM coordinates for physical alignment'
    );
    assert(node.role === 'button', `Expected role button, got ${node.role}`);
    assert(node.text === 'Submit Order', `Expected text 'Submit Order', got ${node.text}`);
    assert(node.interactable === true, 'Node must be interactable');

    // Canonical Target ID
    const expectedTargetId = generateDeterministicTargetId('/html/body/main/form/button[1]', 101);
    assert(node.target_id === expectedTargetId, 'Node must have canonical target_id');

    // Calibrated Confidence
    assert(node.confidence >= 0.90, `Node confidence with tri-modal agreement should be >= 0.90, got ${node.confidence}`);
    assert(result.overall_confidence >= 0.90, `Overall confidence should be >= 0.90, got ${result.overall_confidence}`);
  });

  test('fuseDetailed tracks full evidence provenance across modalities', () => {
    const engine = new PerceptionFusionEngine();
    const detailed = engine.fuseDetailed({
      observation_id: 'obs-prov-001',
      visual: {
        source: 'ShowUI-2B',
        elements: [{ bbox: { x: 10, y: 10, width: 50, height: 20 }, label: 'Help', confidence: 0.85 }],
      },
      dom: {
        source: 'CDP',
        elements: [{ xpath: '/div/button', backendNodeId: 12, bbox: { x: 10, y: 10, width: 50, height: 20 }, role: 'button', text: 'Help', interactable: true }],
      },
    });

    assert(detailed.detailedNodes.length === 1, 'Should have 1 candidate');
    const cand = detailed.detailedNodes[0];
    assert(cand.provenance.sources.includes('dom'), 'Provenance must include dom');
    assert(cand.provenance.sources.includes('visual'), 'Provenance must include visual');
    assert(cand.state === 'OBSERVED', 'State must be OBSERVED');
  });

  test('handles visual-only elements (e.g. Canvas buttons) gracefully', () => {
    const engine = new PerceptionFusionEngine();
    const result = engine.fuse({
      observation_id: 'obs-canvas-01',
      visual: {
        source: 'ShowUI-2B',
        elements: [{ bbox: { x: 300, y: 400, width: 80, height: 30 }, label: 'Play Game button', confidence: 0.88 }],
      },
      dom: { source: 'CDP', elements: [] },
      ocr: {
        source: 'Tesseract.js',
        elements: [{ bbox: { x: 305, y: 405, width: 70, height: 20 }, text: 'Play Game', confidence: 0.90 }],
      },
    });

    assert(result.nodes.length === 1, 'Should fuse visual + ocr into 1 node');
    const node = result.nodes[0];
    assert(node.interactable === true, 'Inferred interactable from label');
    assert(node.role === 'button', 'Inferred role button from label');
    assert(node.text === 'Play Game', 'OCR text used');
    assert(node.target_id.length === 64, 'Synthetic deterministic ID assigned');
  });

  test('handles empty / null evidence safely without crash', () => {
    const engine = new PerceptionFusionEngine();
    const result = engine.fuse({
      observation_id: 'obs-empty',
      visual: null,
      dom: null,
      ocr: null,
    });

    assert(result.observation_id === 'obs-empty', 'observation_id preserved');
    assert(result.nodes.length === 0, 'No nodes produced');
    assert(result.overall_confidence === 0.0, 'Empty evidence yields 0.0 overall confidence');
  });

  test('fails closed on missing or empty observation_id', () => {
    const engine = new PerceptionFusionEngine();
    let threw = false;
    try {
      engine.fuse({ observation_id: '' });
    } catch (e) {
      threw = e instanceof InvalidObservationError;
    }
    assert(threw, 'Must throw InvalidObservationError on empty observation_id');
  });

  test('fails closed on malformed bounding box coordinates', () => {
    const engine = new PerceptionFusionEngine();
    let threw = false;
    try {
      engine.fuse({
        observation_id: 'obs-invalid-bbox',
        dom: {
          source: 'CDP',
          elements: [
            {
              xpath: '/div',
              backendNodeId: 1,
              bbox: { x: 0, y: 0, width: -50, height: 20 }, // Negative width
              role: 'button',
              interactable: true,
            },
          ],
        },
      });
    } catch (e) {
      threw = e instanceof PerceptionFusionError;
    }
    assert(threw, 'Must throw PerceptionFusionError on invalid negative bbox dimension');
  });

  return results;
}
