/**
 * M11: Browser Executor — Type Definitions (T014)
 * Author: AI010 (Browser Execution & Integration Engineer)
 * Authority: INTERFACES.md (Section 7), MODULES.md (M11), DECISIONS.md (ADR 003)
 */

import { ValidatedAction } from '../m10-action-validation/types';

export type ExecutionStatus = 'SUCCESS' | 'FAILURE' | 'STALE' | 'REJECTED';

/**
 * ExecutionResult conforming strictly to INTERFACES.md Section 7.
 */
export interface ExecutionResult {
  action_id: string;
  status: ExecutionStatus;
  error_message?: string;
  execution_timestamp: number;
  details?: Record<string, unknown>;
}

/**
 * Interface for dispatching CDP protocol commands into the active browser target.
 */
export interface CdpEventDispatcher {
  sendCommand<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>;
}

/**
 * Configuration options for the Browser Executor.
 */
export interface BrowserExecutorOptions {
  cdpDispatcher?: CdpEventDispatcher;
  defaultWaitMs?: number;
  clickDelayMs?: number;
  typeCharDelayMs?: number;
}
