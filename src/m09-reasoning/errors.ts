/**
 * M09: Remote Reasoner Gateway — Error Hierarchy
 * Author: AI008 (Reasoning Gateway Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md
 *
 * Implements fail-closed error handling across the reasoning gateway.
 */

export class ReasoningGatewayError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(`[M09:ReasoningGateway] ${code}: ${message}`);
    this.name = 'ReasoningGatewayError';
  }
}

/**
 * Thrown when the observation input is invalid, malformed, or missing required fields.
 */
export class InvalidObservationError extends ReasoningGatewayError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_OBSERVATION_ERROR', details);
    this.name = 'InvalidObservationError';
  }
}

/**
 * Thrown when an illegal raw data artifact (raw DOM, raw A11y, raw screenshot, OCR evidence,
 * or privacy assessment details) is detected attempting to cross the network egress boundary.
 */
export class SecurityBoundaryViolationError extends ReasoningGatewayError {
  constructor(field: string, details?: unknown) {
    super(
      `Security Boundary Violation: Detected prohibited raw data artifact '${field}' in reasoning payload`,
      'SECURITY_BOUNDARY_VIOLATION',
      details
    );
    this.name = 'SecurityBoundaryViolationError';
  }
}

/**
 * Thrown when the reasoning provider fails due to a network or transport failure.
 */
export class ReasoningProviderError extends ReasoningGatewayError {
  constructor(message: string, details?: unknown) {
    super(message, 'REASONING_PROVIDER_ERROR', details);
    this.name = 'ReasoningProviderError';
  }
}

/**
 * Thrown when the reasoning provider fails to respond within the configured timeout window.
 */
export class ReasoningTimeoutError extends ReasoningGatewayError {
  constructor(timeoutMs: number) {
    super(
      `Reasoning provider timed out after ${timeoutMs}ms`,
      'REASONING_TIMEOUT',
      { timeoutMs }
    );
    this.name = 'ReasoningTimeoutError';
  }
}

/**
 * Thrown when the model's response cannot be parsed as valid JSON or is completely malformed.
 */
export class MalformedModelResponseError extends ReasoningGatewayError {
  constructor(message: string, details?: unknown) {
    super(message, 'MALFORMED_MODEL_RESPONSE', details);
    this.name = 'MalformedModelResponseError';
  }
}

/**
 * Thrown when an action proposal fails structural schema validation (e.g. invalid action type,
 * missing target_id for CLICK, missing parameters for TYPE, or executable script injection).
 */
export class InvalidActionProposalError extends ReasoningGatewayError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_ACTION_PROPOSAL', details);
    this.name = 'InvalidActionProposalError';
  }
}

/**
 * Thrown when the action proposal returned by the model does not match the observation_id
 * that was provided for reasoning. Prevents stale reasoning from executing against a newer state.
 */
export class ObservationIdMismatchError extends ReasoningGatewayError {
  constructor(expectedId: string, receivedId: string) {
    super(
      `Observation ID mismatch: Model returned observation_id '${receivedId}', expected '${expectedId}'`,
      'OBSERVATION_ID_MISMATCH',
      { expectedId, receivedId }
    );
    this.name = 'ObservationIdMismatchError';
  }
}

/**
 * Thrown when an action proposal is detected as stale or aged beyond the acceptable horizon.
 */
export class StaleProposalError extends ReasoningGatewayError {
  constructor(message: string, details?: unknown) {
    super(message, 'STALE_PROPOSAL_ERROR', details);
    this.name = 'StaleProposalError';
  }
}
