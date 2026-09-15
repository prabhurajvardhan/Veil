/**
 * M06: Perception Fusion — Type Definitions
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, DECISIONS.md (ADR 004)
 */

/**
 * Strict BoundingBox conforming to INTERFACES.md
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Visual element detected by visual grounding model (M03 ShowUI-2B)
 */
export interface VisualElement {
  bbox: BoundingBox;
  label: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * VisualEvidence record conforming strictly to INTERFACES.md
 */
export interface VisualEvidence {
  source: 'ShowUI-2B';
  elements: VisualElement[];
}

/**
 * DOM element extracted from CDP DOM and A11y trees (M04 CDP Grounding)
 */
export interface DomElement {
  target_id?: string;
  xpath?: string;
  backendNodeId?: number;
  bbox: BoundingBox;
  role: string;
  text?: string;
  interactable: boolean;
}

/**
 * DomEvidence record conforming strictly to INTERFACES.md
 */
export interface DomEvidence {
  source: 'CDP';
  elements: DomElement[];
}

/**
 * OCR text element extracted by optical character recognition (M05 Tesseract)
 */
export interface OcrElement {
  bbox: BoundingBox;
  text: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * OcrEvidence record conforming strictly to INTERFACES.md
 */
export interface OcrEvidence {
  source: 'Tesseract.js';
  elements: OcrElement[];
}

/**
 * PerceptionNode conforming strictly to INTERFACES.md
 */
export interface PerceptionNode {
  target_id: string; // Hash of DOM path / canonical identifier
  bbox: BoundingBox;
  role: string;
  text: string | null;
  interactable: boolean;
  confidence: number; // 0.0 to 1.0
}

/**
 * PerceptionResult conforming strictly to INTERFACES.md
 */
export interface PerceptionResult {
  observation_id: string;
  nodes: PerceptionNode[];
  overall_confidence: number;
}

/**
 * Explicit uncertainty categorizations conforming to PERCEPTION-FUSION.md & LOCAL-PERCEPTION.md
 * Semantic Rule: NOT OBSERVED ≠ DOES NOT EXIST.
 */
export type PerceptionState = 
  | 'OBSERVED'      // High-confidence evidence confirms state
  | 'NOT_OBSERVED'  // High-confidence evidence confirms state is absent
  | 'UNKNOWN';      // Evidence is conflicting, missing, or model confidence is too low

/**
 * Source modalities contributing to an entity
 */
export type EvidenceSource = 'visual' | 'dom' | 'ocr';

/**
 * Full provenance record tracking all contributing modalities for an entity
 */
export interface EvidenceProvenance {
  sources: EvidenceSource[];
  domElement?: DomElement;
  visualElement?: VisualElement;
  ocrElement?: OcrElement;
  matchedIoU?: number;
  spatialDistance?: number;
}

/**
 * Categorization of detected discrepancies between modalities
 */
export type ConflictType =
  | 'SEMANTIC_TEXT_MISMATCH'
  | 'SPATIAL_DISCREPANCY'
  | 'INTERACTABILITY_MISMATCH'
  | 'ROLE_MISMATCH'
  | 'NONE';

/**
 * Conflict severity levels
 */
export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Detailed record of a detected conflict
 */
export interface ConflictRecord {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  sources: EvidenceSource[];
  details?: Record<string, unknown>;
}

/**
 * Extended candidate representation used during internal fusion
 */
export interface FusedNodeCandidate {
  target_id: string;
  bbox: BoundingBox;
  role: string;
  text: string | null;
  interactable: boolean;
  confidence: number;
  state: PerceptionState;
  provenance: EvidenceProvenance;
  conflicts: ConflictRecord[];
}

/**
 * Configuration options for the Perception Fusion engine
 */
export interface FusionConfig {
  /**
   * Minimum Intersection-over-Union to consider two bounding boxes a spatial match.
   * Default: 0.3 (allows for slight visual VLM coordinate jitter vs exact CDP boxes)
   */
  iouThreshold: number;

  /**
   * Maximum center distance in pixels to allow loose matching if IoU is lower.
   * Default: 50
   */
  maxCenterDistancePx: number;

  /**
   * Confidence threshold below which a node triggers M07 fail-closed handling.
   * Default: 0.5 (nodes with confidence < 0.5 are flagged as sensitive/uncertain)
   */
  failClosedConfidenceThreshold: number;

  /**
   * Confidence threshold below which a node state is classified as UNKNOWN.
   * Default: 0.4
   */
  uncertaintyThreshold: number;

  /**
   * Weight given to visual model confidence when computing fused score.
   * Default: 0.7
   */
  visualConfidenceWeight: number;

  /**
   * Weight given to OCR confidence when computing fused score.
   * Default: 0.6
   */
  ocrConfidenceWeight: number;

  /**
   * Penalty factor applied to node confidence when non-critical conflicts are detected.
   * Default: 0.4 (reduces confidence by 40%)
   */
  conflictPenalty: number;

  /**
   * Penalty factor applied to node confidence when critical conflicts (e.g. semantic contradiction) occur.
   * Default: 0.75 (reduces confidence by 75%, clamping to low fail-closed levels)
   */
  criticalConflictPenalty: number;
}

/**
 * Default fusion configuration
 */
export const DEFAULT_FUSION_CONFIG: FusionConfig = {
  iouThreshold: 0.3,
  maxCenterDistancePx: 50,
  failClosedConfidenceThreshold: 0.5,
  uncertaintyThreshold: 0.4,
  visualConfidenceWeight: 0.7,
  ocrConfidenceWeight: 0.6,
  conflictPenalty: 0.4,
  criticalConflictPenalty: 0.75,
};

/**
 * Input payload for perception fusion
 */
export interface FusionInput {
  observation_id: string;
  visual?: VisualEvidence | null;
  dom?: DomEvidence | null;
  ocr?: OcrEvidence | null;
}

/**
 * Detailed fusion result including audit records and uncertainty states
 */
export interface DetailedFusionResult {
  perceptionResult: PerceptionResult;
  detailedNodes: FusedNodeCandidate[];
  overallState: PerceptionState;
  auditTrail: string[];
}
