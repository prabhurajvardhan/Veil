/**
 * M06: Perception Fusion — Conflict Resolution (T009)
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: docs/perception/LOCAL-PERCEPTION.md, docs/perception/PERCEPTION-FUSION.md,
 *            docs/system-design/SYSTEM-DESIGN.md, INTERFACES.md
 */

import {
  BoundingBox,
  EvidenceProvenance,
  ConflictRecord,
  ConflictType,
  ConflictSeverity,
  PerceptionState,
  FusionConfig,
  DEFAULT_FUSION_CONFIG,
} from './types';
import { calculateIoU, centerDistance } from './iou';

/**
 * Known diametric semantic antonym / contradictory action pairs.
 * As highlighted in LOCAL-PERCEPTION.md ("Cancel" vs "Submit").
 */
const KNOWN_ANTONYM_PAIRS: Array<[string, string]> = [
  ['cancel', 'submit'],
  ['cancel', 'confirm'],
  ['cancel', 'ok'],
  ['cancel', 'save'],
  ['cancel', 'buy'],
  ['cancel', 'accept'],
  ['delete', 'save'],
  ['delete', 'keep'],
  ['delete', 'create'],
  ['delete', 'add'],
  ['remove', 'add'],
  ['close', 'open'],
  ['exit', 'enter'],
  ['deny', 'allow'],
  ['decline', 'accept'],
  ['reject', 'approve'],
  ['no', 'yes'],
  ['back', 'next'],
  ['previous', 'next'],
  ['login', 'logout'],
  ['signin', 'signout'],
  ['sign in', 'sign out'],
  ['log in', 'log out'],
  ['enable', 'disable'],
  ['on', 'off'],
  ['buy', 'sell'],
];

/**
 * Normalizes text for semantic comparison: lowercase, trim, collapses whitespace, removes common punctuation.
 */
export function normalizeText(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two text strings are mutually contradictory actions (e.g. Cancel vs Submit).
 */
export function areContradictoryTexts(textA: string, textB: string): boolean {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA || !normB) return false;
  if (normA === normB) return false;

  for (const [ant1, ant2] of KNOWN_ANTONYM_PAIRS) {
    const match1 = normA.includes(ant1) && normB.includes(ant2);
    const match2 = normA.includes(ant2) && normB.includes(ant1);
    if (match1 || match2) {
      return true;
    }
  }

  return false;
}

/**
 * Evaluates semantic compatibility between text strings.
 * Returns a score between 0.0 (total mismatch/conflict) and 1.0 (exact match).
 */
export function evaluateTextSimilarity(textA: string, textB: string): number {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);

  if (!normA && !normB) return 1.0;
  if (!normA || !normB) return 0.5; // One empty, one present: partial uncertainty, not direct conflict
  if (normA === normB) return 1.0;

  if (areContradictoryTexts(normA, normB)) {
    return 0.0; // Absolute conflict
  }

  // Check substring containment (e.g. "search" in "search google")
  if (normA.includes(normB) || normB.includes(normA)) {
    const minLen = Math.min(normA.length, normB.length);
    const maxLen = Math.max(normA.length, normB.length);
    return Math.max(0.7, minLen / maxLen);
  }

  // Token overlap (Jaccard similarity on words)
  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));
  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionCount++;
  }
  const unionCount = new Set([...tokensA, ...tokensB]).size;
  if (unionCount === 0) return 1.0;

  return intersectionCount / unionCount;
}

/**
 * Dedicated conflict detector across multimodal evidence sources.
 */
export class ConflictResolver {
  constructor(private readonly config: FusionConfig = DEFAULT_FUSION_CONFIG) {}

  /**
   * Detects discrepancies between Visual, DOM, and OCR evidence for an entity.
   */
  public detectConflicts(provenance: EvidenceProvenance): ConflictRecord[] {
    const conflicts: ConflictRecord[] = [];
    const { domElement, visualElement, ocrElement } = provenance;

    // 1. Semantic Text Discrepancies
    if (domElement && visualElement) {
      const domText = domElement.text;
      const visualLabel = visualElement.label;

      if (domText && visualLabel) {
        if (areContradictoryTexts(domText, visualLabel)) {
          conflicts.push({
            type: 'SEMANTIC_TEXT_MISMATCH',
            severity: 'CRITICAL',
            message: `Critical semantic conflict: DOM text '${domText}' contradicts visual label '${visualLabel}'`,
            sources: ['dom', 'visual'],
            details: { domText, visualLabel },
          });
        } else {
          const sim = evaluateTextSimilarity(domText, visualLabel);
          if (sim < 0.2) {
            conflicts.push({
              type: 'SEMANTIC_TEXT_MISMATCH',
              severity: 'HIGH',
              message: `Severe semantic discrepancy: DOM text '${domText}' vs visual label '${visualLabel}' (similarity: ${sim.toFixed(2)})`,
              sources: ['dom', 'visual'],
              details: { domText, visualLabel, similarity: sim },
            });
          } else if (sim < 0.5) {
            conflicts.push({
              type: 'SEMANTIC_TEXT_MISMATCH',
              severity: 'MEDIUM',
              message: `Moderate semantic mismatch: DOM text '${domText}' vs visual label '${visualLabel}' (similarity: ${sim.toFixed(2)})`,
              sources: ['dom', 'visual'],
              details: { domText, visualLabel, similarity: sim },
            });
          }
        }
      }
    }

    // Check OCR vs DOM text
    if (domElement && ocrElement) {
      const domText = domElement.text;
      const ocrText = ocrElement.text;

      if (domText && ocrText) {
        if (areContradictoryTexts(domText, ocrText)) {
          conflicts.push({
            type: 'SEMANTIC_TEXT_MISMATCH',
            severity: 'CRITICAL',
            message: `Critical semantic conflict: DOM text '${domText}' contradicts OCR text '${ocrText}'`,
            sources: ['dom', 'ocr'],
            details: { domText, ocrText },
          });
        } else {
          const sim = evaluateTextSimilarity(domText, ocrText);
          if (sim < 0.2) {
            conflicts.push({
              type: 'SEMANTIC_TEXT_MISMATCH',
              severity: 'MEDIUM',
              message: `Discrepancy between DOM text '${domText}' and OCR text '${ocrText}' (similarity: ${sim.toFixed(2)})`,
              sources: ['dom', 'ocr'],
              details: { domText, ocrText, similarity: sim },
            });
          }
        }
      }
    }

    // Check OCR vs Visual text
    if (visualElement && ocrElement && !domElement) {
      const visualLabel = visualElement.label;
      const ocrText = ocrElement.text;

      if (visualLabel && ocrText && areContradictoryTexts(visualLabel, ocrText)) {
        conflicts.push({
          type: 'SEMANTIC_TEXT_MISMATCH',
          severity: 'HIGH',
          message: `Semantic conflict between visual label '${visualLabel}' and OCR text '${ocrText}'`,
          sources: ['visual', 'ocr'],
          details: { visualLabel, ocrText },
        });
      }
    }

    // 2. Spatial Discrepancies
    if (domElement && visualElement) {
      const iou = calculateIoU(domElement.bbox, visualElement.bbox);
      const dist = centerDistance(domElement.bbox, visualElement.bbox);

      if (dist > this.config.maxCenterDistancePx * 2) {
        conflicts.push({
          type: 'SPATIAL_DISCREPANCY',
          severity: 'HIGH',
          message: `Severe spatial offset: DOM vs Visual center distance is ${dist.toFixed(1)}px (IoU: ${iou.toFixed(3)})`,
          sources: ['dom', 'visual'],
          details: { distancePx: dist, iou },
        });
      } else if (dist > this.config.maxCenterDistancePx && iou < this.config.iouThreshold) {
        conflicts.push({
          type: 'SPATIAL_DISCREPANCY',
          severity: 'MEDIUM',
          message: `Spatial discrepancy: center distance is ${dist.toFixed(1)}px, IoU is ${iou.toFixed(3)}`,
          sources: ['dom', 'visual'],
          details: { distancePx: dist, iou },
        });
      }
    }

    // 3. Interactability / Role Discrepancies
    if (domElement && visualElement) {
      const isVisualInteractive =
        visualElement.label.toLowerCase().includes('button') ||
        visualElement.label.toLowerCase().includes('link') ||
        visualElement.label.toLowerCase().includes('input') ||
        visualElement.label.toLowerCase().includes('click');

      if (isVisualInteractive && !domElement.interactable && domElement.role === 'generic') {
        conflicts.push({
          type: 'INTERACTABILITY_MISMATCH',
          severity: 'MEDIUM',
          message: `Visual model indicates interactive control ('${visualElement.label}'), but DOM marks non-interactable generic node`,
          sources: ['dom', 'visual'],
          details: { domInteractable: domElement.interactable, domRole: domElement.role, visualLabel: visualElement.label },
        });
      }
    }

    return conflicts;
  }

  /**
   * Evaluates the explicit uncertainty state: OBSERVED | NOT_OBSERVED | UNKNOWN.
   * Enforces semantic rule: NOT OBSERVED ≠ DOES NOT EXIST.
   */
  public determinePerceptionState(
    conflicts: ConflictRecord[],
    provenance: EvidenceProvenance,
    calibratedConfidence: number
  ): PerceptionState {
    const hasCriticalConflict = conflicts.some((c) => c.severity === 'CRITICAL');
    const hasHighConflict = conflicts.some((c) => c.severity === 'HIGH');

    // Conflicting evidence or severe uncertainty -> UNKNOWN
    if (hasCriticalConflict || hasHighConflict) {
      return 'UNKNOWN';
    }

    // Model confidence is too low -> UNKNOWN (fail closed per SYSTEM-DESIGN.md)
    if (calibratedConfidence < this.config.uncertaintyThreshold) {
      return 'UNKNOWN';
    }

    // If we have high confidence evidence confirming presence -> OBSERVED
    if (calibratedConfidence >= this.config.failClosedConfidenceThreshold && provenance.sources.length > 0) {
      return 'OBSERVED';
    }

    // If confidence is in the borderline zone [uncertaintyThreshold, failClosedConfidenceThreshold)
    return 'UNKNOWN';
  }
}
