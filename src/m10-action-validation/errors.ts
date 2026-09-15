/**
 * M10: Local Action Guard / Action Validation — Error Hierarchy
 * Author: AI009 (Action Validation Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md
 *
 * Implements strict, deterministic fail-closed errors for all validation gates.
 */

export class ActionValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(`[M10:ActionValidation] ${code}: ${message}`);
    this.name = 'ActionValidationError';
  }
}

export class MissingProposalError extends ActionValidationError {
  constructor(message = 'Action proposal is null or undefined') {
    super(message, 'MISSING_PROPOSAL');
    this.name = 'MissingProposalError';
  }
}

export class InvalidProposalStructureError extends ActionValidationError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_PROPOSAL_STRUCTURE', details);
    this.name = 'InvalidProposalStructureError';
  }
}

export class ObservationBindingMismatchError extends ActionValidationError {
  constructor(expectedId: string, receivedId: string) {
    super(
      `Observation binding mismatch: proposal observation_id '${receivedId}' does not match current authoritative observation_id '${expectedId}'`,
      'OBSERVATION_BINDING_MISMATCH',
      { expectedId, receivedId }
    );
    this.name = 'ObservationBindingMismatchError';
  }
}

export class StaleObservationError extends ActionValidationError {
  constructor(ageMs: number, maxAgeMs: number) {
    super(
      `Observation is stale: age ${ageMs}ms exceeds maximum allowed threshold of ${maxAgeMs}ms`,
      'STALE_OBSERVATION',
      { ageMs, maxAgeMs }
    );
    this.name = 'StaleObservationError';
  }
}

export class UnknownActionTypeError extends ActionValidationError {
  constructor(actionType: string) {
    super(
      `Unsupported or unknown action type: '${actionType}'`,
      'UNKNOWN_ACTION_TYPE',
      { actionType }
    );
    this.name = 'UnknownActionTypeError';
  }
}

export class MissingTargetError extends ActionValidationError {
  constructor(actionType: string) {
    super(
      `Action type '${actionType}' strictly requires a valid target_id`,
      'MISSING_TARGET_ID',
      { actionType }
    );
    this.name = 'MissingTargetError';
  }
}

export class TargetNotFoundError extends ActionValidationError {
  constructor(targetId: string, observationId: string) {
    super(
      `Target element '${targetId}' was not found in current authoritative observation '${observationId}'`,
      'TARGET_NOT_FOUND',
      { targetId, observationId }
    );
    this.name = 'TargetNotFoundError';
  }
}

export class TargetNotInteractableError extends ActionValidationError {
  constructor(targetId: string, role: string) {
    super(
      `Target element '${targetId}' (role: '${role}') is marked as non-interactable in the current observation`,
      'TARGET_NOT_INTERACTABLE',
      { targetId, role }
    );
    this.name = 'TargetNotInteractableError';
  }
}

export class InvalidTargetBoundingBoxError extends ActionValidationError {
  constructor(targetId: string, details?: unknown) {
    super(
      `Target element '${targetId}' has invalid or collapsed bounding box coordinates`,
      'INVALID_TARGET_BOUNDING_BOX',
      details
    );
    this.name = 'InvalidTargetBoundingBoxError';
  }
}

export class IncompatibleTargetRoleError extends ActionValidationError {
  constructor(targetId: string, role: string, actionType: string) {
    super(
      `Target element '${targetId}' with role '${role}' cannot accept action '${actionType}'`,
      'INCOMPATIBLE_TARGET_ROLE',
      { targetId, role, actionType }
    );
    this.name = 'IncompatibleTargetRoleError';
  }
}

export class InvalidActionArgumentsError extends ActionValidationError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_ACTION_ARGUMENTS', details);
    this.name = 'InvalidActionArgumentsError';
  }
}

export class ScriptInjectionAttemptError extends ActionValidationError {
  constructor(paramKey: string, payload: string) {
    super(
      `Security violation: Detected potential script injection payload in parameter '${paramKey}'`,
      'SCRIPT_INJECTION_ATTEMPT',
      { paramKey, payload }
    );
    this.name = 'ScriptInjectionAttemptError';
  }
}

export class UnsafeNavigationUrlError extends ActionValidationError {
  constructor(url: string, reason: string) {
    super(
      `Security violation: Navigation URL '${url}' rejected: ${reason}`,
      'UNSAFE_NAVIGATION_URL',
      { url, reason }
    );
    this.name = 'UnsafeNavigationUrlError';
  }
}

export class TargetDriftExceededError extends ActionValidationError {
  constructor(targetId: string, driftPx: number, maxDriftPx: number) {
    super(
      `Target element '${targetId}' physical position drifted by ${driftPx}px, exceeding maximum tolerance of ${maxDriftPx}px`,
      'TARGET_DRIFT_EXCEEDED',
      { targetId, driftPx, maxDriftPx }
    );
    this.name = 'TargetDriftExceededError';
  }
}
