/**
 * M08: Sanitization & Redaction — Observation Sanitizer
 * Author: AI007 (Sanitization & Redaction Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, docs/tasks/T011.md
 *
 * Implements the local sanitization and redaction boundary between privacy classification
 * and the remote reasoning layer.
 */

import { BoundingBox, PerceptionNode, PerceptionResult } from '../m06-fusion/types';
import { PrivacyAssessment, PrivacyCategory, PrivacyClassificationResult } from '../m07-privacy/types';
import {
  REDACTION_MARKERS,
  DEFAULT_REDACTION_MARKER,
  SanitizedObservation,
  SanitizedPerceptionNode,
  SanitizationOptions,
} from './types';
import {
  InvalidSanitizationInputError,
  ObservationIdMismatchError,
} from './errors';
import { VisualMasker } from './visualMasker';

export class ObservationSanitizer {
  private readonly visualMasker: VisualMasker;

  constructor() {
    this.visualMasker = new VisualMasker();
  }

  /**
   * Resolves the deterministic redaction marker for a given privacy assessment.
   */
  public resolveRedactionMarker(assessment?: PrivacyAssessment): string {
    if (!assessment) {
      return REDACTION_MARKERS.UNKNOWN;
    }

    const category = assessment.category;
    if (category in REDACTION_MARKERS && category !== 'SAFE') {
      return REDACTION_MARKERS[category];
    }

    return REDACTION_MARKERS.UNKNOWN || DEFAULT_REDACTION_MARKER;
  }

  /**
   * Sanitizes a single perception node based on its corresponding privacy assessment.
   * Creates a brand new sanitized node object, ensuring zero mutation of the original.
   *
   * @param node Original PerceptionNode from M06
   * @param assessment PrivacyAssessment from M07 (if available)
   * @returns SanitizedPerceptionNode with sensitive text strictly redacted
   */
  public sanitizeNode(node: PerceptionNode, assessment?: PrivacyAssessment): SanitizedPerceptionNode {
    if (!node || typeof node !== 'object') {
      throw new InvalidSanitizationInputError('Encountered invalid or null perception node during sanitization');
    }

    // Determine if sanitization is required
    // Fail closed: if assessment is missing, or isSensitive === true, or requiresSanitization === true, or category !== SAFE
    let shouldRedact = false;
    let redactionCategory: PrivacyCategory | undefined = undefined;

    if (!assessment) {
      // Fail closed: unassessed nodes are treated as UNKNOWN sensitive
      shouldRedact = true;
      redactionCategory = 'UNKNOWN';
    } else if (assessment.requiresSanitization || assessment.isSensitive || assessment.category !== 'SAFE') {
      shouldRedact = true;
      redactionCategory = assessment.category;
    }

    // Deep clone bounding box to guarantee structural independence
    const clonedBbox: BoundingBox = {
      x: node.bbox.x,
      y: node.bbox.y,
      width: node.bbox.width,
      height: node.bbox.height,
    };

    if (shouldRedact) {
      const marker = this.resolveRedactionMarker(assessment);
      return {
        target_id: node.target_id,
        bbox: clonedBbox,
        role: node.role,
        text: marker,
        interactable: node.interactable,
        confidence: node.confidence,
        is_redacted: true,
        redaction_category: redactionCategory,
      };
    }

    // SAFE Node: strictly preserve safe text and structural attributes
    return {
      target_id: node.target_id,
      bbox: clonedBbox,
      role: node.role,
      text: node.text,
      interactable: node.interactable,
      confidence: node.confidence,
      is_redacted: false,
    };
  }

  /**
   * Sanitizes a full PerceptionResult using PrivacyClassificationResult.
   * Guarantees:
   * 1. Original PerceptionResult is not mutated.
   * 2. Sensitive values (EMAIL, PHONE, PASSWORD, CREDIT_CARD, API_KEY, UNKNOWN) are redacted.
   * 3. requiresSanitization=true is strictly respected.
   * 4. Structural fields (target_id, bbox, role, interactable, confidence) are preserved.
   * 5. Original sensitive values NEVER appear in the sanitized output.
   * 6. Fails closed safely on invalid inputs or mismatched observation IDs.
   *
   * @param perception Original PerceptionResult from M06
   * @param privacy PrivacyClassificationResult from M07
   * @param options Optional configuration including screenshot and timestamp
   */
  public sanitize(
    perception: PerceptionResult,
    privacy: PrivacyClassificationResult,
    options?: SanitizationOptions
  ): SanitizedObservation {
    // 1. Validate inputs (fail-closed)
    if (!perception || typeof perception !== 'object') {
      throw new InvalidSanitizationInputError('PerceptionResult must be a valid object');
    }
    if (!privacy || typeof privacy !== 'object') {
      throw new InvalidSanitizationInputError('PrivacyClassificationResult must be a valid object');
    }

    if (!perception.observation_id || typeof perception.observation_id !== 'string' || perception.observation_id.trim() === '') {
      throw new InvalidSanitizationInputError('PerceptionResult missing valid observation_id');
    }
    if (!privacy.observation_id || typeof privacy.observation_id !== 'string' || privacy.observation_id.trim() === '') {
      throw new InvalidSanitizationInputError('PrivacyClassificationResult missing valid observation_id');
    }

    // Guard against cross-observation confusion
    if (perception.observation_id !== privacy.observation_id) {
      throw new ObservationIdMismatchError(perception.observation_id, privacy.observation_id);
    }

    if (!Array.isArray(perception.nodes)) {
      throw new InvalidSanitizationInputError('PerceptionResult nodes must be an array');
    }

    // Index assessments by target_id for O(1) lookup
    const assessmentMap = new Map<string, PrivacyAssessment>();
    if (Array.isArray(privacy.assessments)) {
      for (const assessment of privacy.assessments) {
        if (assessment && typeof assessment.target_id === 'string') {
          assessmentMap.set(assessment.target_id, assessment);
        }
      }
    }

    const sanitizedNodes: SanitizedPerceptionNode[] = [];
    const sensitiveBoundingBoxes: BoundingBox[] = [];
    let redactedCount = 0;

    // 2. Process each perception node
    for (const node of perception.nodes) {
      const assessment = assessmentMap.get(node.target_id);
      const sanitizedNode = this.sanitizeNode(node, assessment);

      sanitizedNodes.push(sanitizedNode);

      if (sanitizedNode.is_redacted) {
        redactedCount++;
        sensitiveBoundingBoxes.push(sanitizedNode.bbox);
      }
    }

    // 3. Handle optional screenshot visual masking if provided
    let maskedScreenshot: string | undefined = undefined;
    if (options?.screenshotBase64) {
      // Apply visual masking if requested or default
      if (options.maskScreenshot !== false && sensitiveBoundingBoxes.length > 0 && options.canvasFactory) {
        const canvas = options.canvasFactory(1280, 720);
        this.visualMasker.maskCanvas(canvas, sensitiveBoundingBoxes, options.visualMaskingOptions);
        maskedScreenshot = canvas.toDataURL('image/png');
      } else {
        maskedScreenshot = options.screenshotBase64;
      }
    }

    const timestamp = options?.timestamp ?? Date.now();

    return {
      observation_id: perception.observation_id,
      timestamp,
      nodes: sanitizedNodes,
      overall_confidence: perception.overall_confidence ?? 0,
      screenshot: maskedScreenshot,
      metadata: {
        total_nodes: sanitizedNodes.length,
        redacted_nodes_count: redactedCount,
        sanitization_applied: redactedCount > 0,
      },
    };
  }
}

/**
 * Functional convenience wrapper for observation sanitization.
 */
export function sanitizeObservation(
  perception: PerceptionResult,
  privacy: PrivacyClassificationResult,
  options?: SanitizationOptions
): SanitizedObservation {
  const sanitizer = new ObservationSanitizer();
  return sanitizer.sanitize(perception, privacy, options);
}
