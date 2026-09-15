/**
 * M06: Perception Fusion — Calibrated Confidence Calculator (T009)
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, docs/perception/LOCAL-PERCEPTION.md,
 *            docs/perception/PERCEPTION-FUSION.md, INTERFACES.md
 */

import {
  EvidenceProvenance,
  ConflictRecord,
  PerceptionState,
  FusionConfig,
  DEFAULT_FUSION_CONFIG,
  PerceptionNode,
} from './types';

export class ConfidenceCalculator {
  constructor(private readonly config: FusionConfig = DEFAULT_FUSION_CONFIG) {}

  /**
   * Computes calibrated confidence for a single perception node based on multi-modal evidence and conflicts.
   */
  public calculateNodeConfidence(
    provenance: EvidenceProvenance,
    conflicts: ConflictRecord[],
    state?: PerceptionState
  ): number {
    const { domElement, visualElement, ocrElement, matchedIoU } = provenance;

    let baseConfidence = 0.5;

    // 1. Base confidence determination based on evidence combinations
    if (domElement && visualElement && ocrElement) {
      // Tri-modal corroboration: DOM + Visual + OCR
      const vConf = visualElement.confidence;
      const oConf = ocrElement.confidence;
      const iouBonus = matchedIoU ? Math.min(0.05, matchedIoU * 0.05) : 0;
      baseConfidence = 0.88 + 0.07 * vConf + 0.03 * oConf + iouBonus;
    } else if (domElement && visualElement) {
      // Dual-modal: DOM + Visual
      const vConf = visualElement.confidence;
      const iouBonus = matchedIoU ? Math.min(0.05, matchedIoU * 0.05) : 0;
      baseConfidence = 0.82 + 0.12 * vConf + iouBonus;
    } else if (domElement && ocrElement) {
      // Dual-modal: DOM + OCR
      const oConf = ocrElement.confidence;
      baseConfidence = 0.80 + 0.10 * oConf;
    } else if (domElement) {
      // Single-modal: DOM only
      // CDP DOM is authoritative for layout, but visual grounding is absent
      if (domElement.interactable && domElement.text) {
        baseConfidence = 0.80;
      } else if (domElement.interactable) {
        baseConfidence = 0.75;
      } else {
        baseConfidence = 0.70;
      }
    } else if (visualElement && ocrElement) {
      // Dual-modal non-DOM (e.g. Canvas element, image button)
      const vConf = visualElement.confidence;
      const oConf = ocrElement.confidence;
      baseConfidence = 0.45 + 0.25 * vConf + 0.15 * oConf;
    } else if (visualElement) {
      // Single-modal: Visual only (lacks DOM backing)
      baseConfidence = visualElement.confidence * this.config.visualConfidenceWeight;
    } else if (ocrElement) {
      // Single-modal: OCR only
      baseConfidence = ocrElement.confidence * this.config.ocrConfidenceWeight;
    }

    // 2. Apply Conflict Penalties
    let confidence = baseConfidence;

    const criticalConflicts = conflicts.filter((c) => c.severity === 'CRITICAL');
    const highConflicts = conflicts.filter((c) => c.severity === 'HIGH');
    const mediumConflicts = conflicts.filter((c) => c.severity === 'MEDIUM');
    const lowConflicts = conflicts.filter((c) => c.severity === 'LOW');

    if (criticalConflicts.length > 0) {
      // Severe semantic contradiction (e.g. "Cancel" vs "Submit")
      // Heavily penalize and clamp strictly below failClosedConfidenceThreshold (0.5)
      confidence = Math.min(0.15, confidence * (1 - this.config.criticalConflictPenalty));
    } else if (highConflicts.length > 0) {
      // Severe spatial or semantic mismatch
      confidence = Math.min(0.35, confidence * (1 - this.config.conflictPenalty));
    } else if (mediumConflicts.length > 0) {
      // Moderate discrepancy
      confidence = confidence * (1 - this.config.conflictPenalty * 0.5);
    } else if (lowConflicts.length > 0) {
      confidence = confidence * 0.95;
    }

    // 3. Uncertainty Clamp
    if (state === 'UNKNOWN') {
      confidence = Math.min(confidence, this.config.uncertaintyThreshold - 0.05);
    }

    // Ensure range [0.0, 1.0] and reasonable precision
    return Math.max(0.0, Math.min(1.0, Number(confidence.toFixed(4))));
  }

  /**
   * Computes overall observation confidence across all perceived nodes.
   */
  public calculateOverallConfidence(
    nodes: PerceptionNode[],
    conflicts: ConflictRecord[],
    evidenceSupplied: { visual: boolean; dom: boolean; ocr: boolean }
  ): number {
    if (nodes.length === 0) {
      // If no evidence was supplied at all
      if (!evidenceSupplied.visual && !evidenceSupplied.dom && !evidenceSupplied.ocr) {
        return 0.0;
      }
      // If evidence was supplied but page was genuinely empty / blank
      return 0.85;
    }

    // Calculate mean of node confidences
    const sum = nodes.reduce((acc, node) => acc + node.confidence, 0);
    const meanConfidence = sum / nodes.length;

    // Check for systemic critical conflicts
    const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL').length;
    const highCount = conflicts.filter((c) => c.severity === 'HIGH').length;

    let penalty = 1.0;
    if (criticalCount > 0) {
      penalty = Math.max(0.2, 1.0 - criticalCount * 0.25);
    } else if (highCount > 0) {
      penalty = Math.max(0.4, 1.0 - highCount * 0.15);
    }

    const overall = meanConfidence * penalty;
    return Math.max(0.0, Math.min(1.0, Number(overall.toFixed(4))));
  }
}
