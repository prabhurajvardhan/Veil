/**
 * M06: Perception Fusion — Error Hierarchy
 * Author: AI005 (Perception Fusion Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, INTERFACES.md
 */

export class PerceptionFusionError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(`[M06:PerceptionFusion] ${code}: ${message}`);
    this.name = 'PerceptionFusionError';
  }
}

export class InvalidObservationError extends PerceptionFusionError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_OBSERVATION_ERROR', details);
    this.name = 'InvalidObservationError';
  }
}

export class EvidenceConflictError extends PerceptionFusionError {
  constructor(message: string, details?: unknown) {
    super(message, 'EVIDENCE_CONFLICT_ERROR', details);
    this.name = 'EvidenceConflictError';
  }
}

export class TargetIdGenerationError extends PerceptionFusionError {
  constructor(message: string, details?: unknown) {
    super(message, 'TARGET_ID_GENERATION_ERROR', details);
    this.name = 'TargetIdGenerationError';
  }
}
