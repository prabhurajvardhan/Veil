/**
 * M11: Browser Executor — Error Hierarchy
 * Author: AI010 (Browser Execution & Integration Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md
 */

export class BrowserExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(`[M11:BrowserExecutor] ${code}: ${message}`);
    this.name = 'BrowserExecutionError';
  }
}

export class UnvalidatedActionError extends BrowserExecutionError {
  constructor(message = 'Executor strictly requires a ValidatedAction from M10 (ActionProposal or unvalidated action rejected)') {
    super(message, 'UNVALIDATED_ACTION_REJECTED');
    this.name = 'UnvalidatedActionError';
  }
}

export class UnsupportedExecutionActionError extends BrowserExecutionError {
  constructor(actionType: string) {
    super(`Unsupported browser execution action type: '${actionType}'`, 'UNSUPPORTED_ACTION_TYPE', { actionType });
    this.name = 'UnsupportedExecutionActionError';
  }
}

export class MissingTargetCoordinatesError extends BrowserExecutionError {
  constructor(actionType: string) {
    super(`Action '${actionType}' requires local resolved_bbox coordinates`, 'MISSING_TARGET_COORDINATES', { actionType });
    this.name = 'MissingTargetCoordinatesError';
  }
}

export class CdpExecutionError extends BrowserExecutionError {
  constructor(method: string, originalError: unknown) {
    super(
      `CDP execution failed for command '${method}': ${originalError instanceof Error ? originalError.message : String(originalError)}`,
      'CDP_COMMAND_FAILED',
      { method, originalError }
    );
    this.name = 'CdpExecutionError';
  }
}
