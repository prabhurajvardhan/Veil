/**
 * M06: Perception Fusion — Core Engine (T008 & T009)
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md,
 *            docs/perception/LOCAL-PERCEPTION.md, docs/perception/PERCEPTION-FUSION.md
 */

import {
  BoundingBox,
  VisualEvidence,
  VisualElement,
  DomEvidence,
  DomElement,
  OcrEvidence,
  OcrElement,
  PerceptionNode,
  PerceptionResult,
  PerceptionState,
  EvidenceProvenance,
  FusedNodeCandidate,
  FusionConfig,
  DEFAULT_FUSION_CONFIG,
  FusionInput,
  DetailedFusionResult,
} from './types';
import { calculateIoU, centerDistance, isContained, validateBoundingBox } from './iou';
import {
  ensureCanonicalTargetId,
  generateDeterministicTargetId,
  generateSyntheticTargetId,
} from './targetId';
import { ConflictResolver } from './conflictResolver';
import { ConfidenceCalculator } from './confidenceCalculator';
import { InvalidObservationError } from './errors';

export class PerceptionFusionEngine {
  private readonly config: FusionConfig;
  private readonly conflictResolver: ConflictResolver;
  private readonly confidenceCalculator: ConfidenceCalculator;

  constructor(customConfig?: Partial<FusionConfig>) {
    this.config = { ...DEFAULT_FUSION_CONFIG, ...customConfig };
    this.conflictResolver = new ConflictResolver(this.config);
    this.confidenceCalculator = new ConfidenceCalculator(this.config);
  }

  /**
   * Main fusion execution conforming strictly to INTERFACES.md PerceptionResult contract.
   */
  public fuse(input: FusionInput): PerceptionResult {
    const detailed = this.fuseDetailed(input);
    return detailed.perceptionResult;
  }

  /**
   * Extended fusion execution producing PerceptionResult and detailed provenance/audit metadata.
   */
  public fuseDetailed(input: FusionInput): DetailedFusionResult {
    // 1. Fail-closed input validation
    if (!input || typeof input !== 'object') {
      throw new InvalidObservationError('FusionInput must be a valid object');
    }

    if (!input.observation_id || typeof input.observation_id !== 'string' || input.observation_id.trim() === '') {
      throw new InvalidObservationError(
        'Missing or empty observation_id in FusionInput',
        { observation_id: input.observation_id }
      );
    }

    const observationId = input.observation_id.trim();
    const auditTrail: string[] = [];
    auditTrail.push(`[Init] Initiating perception fusion for observation_id: ${observationId}`);

    const domElements: DomElement[] = input.dom?.elements || [];
    const visualElements: VisualElement[] = input.visual?.elements || [];
    const ocrElements: OcrElement[] = input.ocr?.elements || [];

    // Validate bounding boxes across all supplied evidence
    for (const [idx, elem] of domElements.entries()) {
      validateBoundingBox(elem.bbox, `DomEvidence.elements[${idx}].bbox`);
    }
    for (const [idx, elem] of visualElements.entries()) {
      validateBoundingBox(elem.bbox, `VisualEvidence.elements[${idx}].bbox`);
    }
    for (const [idx, elem] of ocrElements.entries()) {
      validateBoundingBox(elem.bbox, `OcrEvidence.elements[${idx}].bbox`);
    }

    const matchedVisualIndices = new Set<number>();
    const matchedOcrIndices = new Set<number>();
    const candidates: FusedNodeCandidate[] = [];

    // 2. Step 1: Match Visual & OCR evidence against authoritative DOM elements
    for (const domElem of domElements) {
      let bestVisualIndex = -1;
      let highestVisualIoU = -1;
      let bestVisualDist = Infinity;

      for (let vIdx = 0; vIdx < visualElements.length; vIdx++) {
        if (matchedVisualIndices.has(vIdx)) continue;
        const vElem = visualElements[vIdx];

        const iou = calculateIoU(domElem.bbox, vElem.bbox);
        const dist = centerDistance(domElem.bbox, vElem.bbox);

        // Spatial match conditions:
        // A. IoU meets or exceeds configured threshold
        // B. Bounding box is substantially contained with low center distance
        const isMatch =
          iou >= this.config.iouThreshold ||
          (dist <= this.config.maxCenterDistancePx && isContained(vElem.bbox, domElem.bbox)) ||
          (dist <= this.config.maxCenterDistancePx && isContained(domElem.bbox, vElem.bbox));

        if (isMatch && (iou > highestVisualIoU || (highestVisualIoU <= 0 && dist < bestVisualDist))) {
          highestVisualIoU = iou;
          bestVisualIndex = vIdx;
          bestVisualDist = dist;
        }
      }

      let matchedVisualElem: VisualElement | undefined;
      if (bestVisualIndex >= 0) {
        matchedVisualIndices.add(bestVisualIndex);
        matchedVisualElem = visualElements[bestVisualIndex];
      }

      // Match OCR evidence
      let bestOcrIndex = -1;
      let highestOcrIoU = -1;

      for (let oIdx = 0; oIdx < ocrElements.length; oIdx++) {
        if (matchedOcrIndices.has(oIdx)) continue;
        const oElem = ocrElements[oIdx];

        const iou = calculateIoU(domElem.bbox, oElem.bbox);
        const dist = centerDistance(domElem.bbox, oElem.bbox);

        const isMatch =
          iou >= this.config.iouThreshold ||
          (dist <= this.config.maxCenterDistancePx && isContained(oElem.bbox, domElem.bbox));

        if (isMatch && iou > highestOcrIoU) {
          highestOcrIoU = iou;
          bestOcrIndex = oIdx;
        }
      }

      let matchedOcrElem: OcrElement | undefined;
      if (bestOcrIndex >= 0) {
        matchedOcrIndices.add(bestOcrIndex);
        matchedOcrElem = ocrElements[bestOcrIndex];
      }

      // Build Provenance for DOM-rooted candidate
      const sources: Array<'visual' | 'dom' | 'ocr'> = ['dom'];
      if (matchedVisualElem) sources.push('visual');
      if (matchedOcrElem) sources.push('ocr');

      const provenance: EvidenceProvenance = {
        sources,
        domElement: domElem,
        visualElement: matchedVisualElem,
        ocrElement: matchedOcrElem,
        matchedIoU: highestVisualIoU > 0 ? highestVisualIoU : undefined,
        spatialDistance: bestVisualDist < Infinity ? bestVisualDist : undefined,
      };

      // Coordinate Resolution: Favor DOM coordinates for physical alignment (SYSTEM-DESIGN.md Rule 3)
      const resolvedBbox: BoundingBox = { ...domElem.bbox };

      // Text Reconciliation: Authoritative DOM text, supplemented by OCR or Visual
      const resolvedText = domElem.text || matchedOcrElem?.text || matchedVisualElem?.label || null;

      // Canonical Target ID
      let targetId: string;
      if (domElem.xpath && domElem.backendNodeId !== undefined) {
        targetId = generateDeterministicTargetId(domElem.xpath, domElem.backendNodeId);
      } else {
        targetId = ensureCanonicalTargetId(domElem);
      }

      // Conflict Resolution & Calibrated Confidence (T009)
      const conflicts = this.conflictResolver.detectConflicts(provenance);
      const confidence = this.confidenceCalculator.calculateNodeConfidence(provenance, conflicts);
      const state = this.conflictResolver.determinePerceptionState(conflicts, provenance, confidence);

      candidates.push({
        target_id: targetId,
        bbox: resolvedBbox,
        role: domElem.role || 'element',
        text: resolvedText,
        interactable: domElem.interactable,
        confidence,
        state,
        provenance,
        conflicts,
      });
    }

    // 3. Step 2: Process Unmatched Visual Elements (e.g. Canvas elements or custom WebGL buttons)
    for (let vIdx = 0; vIdx < visualElements.length; vIdx++) {
      if (matchedVisualIndices.has(vIdx)) continue;
      const vElem = visualElements[vIdx];

      // Check if any unmatched OCR element correlates with this visual element
      let bestOcrIndex = -1;
      let highestOcrIoU = -1;

      for (let oIdx = 0; oIdx < ocrElements.length; oIdx++) {
        if (matchedOcrIndices.has(oIdx)) continue;
        const oElem = ocrElements[oIdx];
        const iou = calculateIoU(vElem.bbox, oElem.bbox);
        if (iou >= this.config.iouThreshold && iou > highestOcrIoU) {
          highestOcrIoU = iou;
          bestOcrIndex = oIdx;
        }
      }

      let matchedOcrElem: OcrElement | undefined;
      if (bestOcrIndex >= 0) {
        matchedOcrIndices.add(bestOcrIndex);
        matchedOcrElem = ocrElements[bestOcrIndex];
      }

      const sources: Array<'visual' | 'dom' | 'ocr'> = ['visual'];
      if (matchedOcrElem) sources.push('ocr');

      const provenance: EvidenceProvenance = {
        sources,
        visualElement: vElem,
        ocrElement: matchedOcrElem,
        matchedIoU: highestOcrIoU > 0 ? highestOcrIoU : undefined,
      };

      // Deduces role and interactability from visual label
      const lowerLabel = vElem.label.toLowerCase();
      const isInteractable =
        lowerLabel.includes('button') ||
        lowerLabel.includes('link') ||
        lowerLabel.includes('input') ||
        lowerLabel.includes('click');
      const role = isInteractable ? 'button' : 'visual-element';
      const text = matchedOcrElem?.text || vElem.label || null;

      // Synthetic deterministic ID
      const targetId = generateSyntheticTargetId(
        'visual',
        `${vElem.label}@${vElem.bbox.x},${vElem.bbox.y},${vElem.bbox.width},${vElem.bbox.height}`
      );

      const conflicts = this.conflictResolver.detectConflicts(provenance);
      const confidence = this.confidenceCalculator.calculateNodeConfidence(provenance, conflicts);
      const state = this.conflictResolver.determinePerceptionState(conflicts, provenance, confidence);

      candidates.push({
        target_id: targetId,
        bbox: { ...vElem.bbox },
        role,
        text,
        interactable: isInteractable,
        confidence,
        state,
        provenance,
        conflicts,
      });
    }

    // 4. Step 3: Process Remaining Unmatched OCR Elements
    for (let oIdx = 0; oIdx < ocrElements.length; oIdx++) {
      if (matchedOcrIndices.has(oIdx)) continue;
      const oElem = ocrElements[oIdx];

      const provenance: EvidenceProvenance = {
        sources: ['ocr'],
        ocrElement: oElem,
      };

      const targetId = generateSyntheticTargetId(
        'ocr',
        `${oElem.text}@${oElem.bbox.x},${oElem.bbox.y},${oElem.bbox.width},${oElem.bbox.height}`
      );

      const conflicts = this.conflictResolver.detectConflicts(provenance);
      const confidence = this.confidenceCalculator.calculateNodeConfidence(provenance, conflicts);
      const state = this.conflictResolver.determinePerceptionState(conflicts, provenance, confidence);

      candidates.push({
        target_id: targetId,
        bbox: { ...oElem.bbox },
        role: 'text',
        text: oElem.text || null,
        interactable: false,
        confidence,
        state,
        provenance,
        conflicts,
      });
    }

    // 5. Build canonical PerceptionNode[]
    const nodes: PerceptionNode[] = candidates.map((c) => ({
      target_id: c.target_id,
      bbox: c.bbox,
      role: c.role,
      text: c.text,
      interactable: c.interactable,
      confidence: c.confidence,
    }));

    // Collect all conflicts across all nodes
    const allConflicts = candidates.flatMap((c) => c.conflicts);

    // Calculate overall calibrated confidence
    const overallConfidence = this.confidenceCalculator.calculateOverallConfidence(
      nodes,
      allConflicts,
      {
        visual: Boolean(input.visual),
        dom: Boolean(input.dom),
        ocr: Boolean(input.ocr),
      }
    );

    // Determine overall state
    let overallState: PerceptionState = 'OBSERVED';
    if (candidates.some((c) => c.state === 'UNKNOWN') || overallConfidence < this.config.failClosedConfidenceThreshold) {
      overallState = 'UNKNOWN';
    } else if (candidates.length === 0 && (input.dom || input.visual)) {
      overallState = 'OBSERVED';
    }

    auditTrail.push(`[Complete] Fused ${nodes.length} nodes. Overall confidence: ${overallConfidence.toFixed(4)}. State: ${overallState}`);

    const perceptionResult: PerceptionResult = {
      observation_id: observationId,
      nodes,
      overall_confidence: overallConfidence,
    };

    return {
      perceptionResult,
      detailedNodes: candidates,
      overallState,
      auditTrail,
    };
  }
}

/**
 * Convenience procedural wrapper for quick fusion.
 */
export function fusePerception(input: FusionInput, config?: Partial<FusionConfig>): PerceptionResult {
  const engine = new PerceptionFusionEngine(config);
  return engine.fuse(input);
}
