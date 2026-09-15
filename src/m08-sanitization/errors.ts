/**
 * M08: Sanitization & Redaction — Error Hierarchy
 * Author: AI007 (Sanitization & Redaction Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md
 */

export class SanitizationError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(`[M08:Sanitization] ${code}: ${message}`);
    this.name = 'SanitizationError';
  }
}

export class InvalidSanitizationInputError extends SanitizationError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_INPUT_ERROR', details);
    this.name = 'InvalidSanitizationInputError';
  }
}

export class ObservationIdMismatchError extends SanitizationError {
  constructor(perceptionId: string, privacyId: string) {
    super(
      `Observation ID mismatch: PerceptionResult ID '${perceptionId}' does not match PrivacyClassificationResult ID '${privacyId}'`,
      'OBSERVATION_ID_MISMATCH',
      { perceptionId, privacyId }
    );
    this.name = 'ObservationIdMismatchError';
  }
}

export class VisualMaskingError extends SanitizationError {
  constructor(message: string, details?: unknown) {
    super(message, 'VISUAL_MASKING_ERROR', details);
    this.name = 'VisualMaskingError';
  }
}
