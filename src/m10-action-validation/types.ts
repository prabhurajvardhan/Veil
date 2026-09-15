/**
 * M10: Local Action Guard / Action Validation — Type Definitions
 * Author: AI009 (Action Validation Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Enforces independent local authorization of incoming ActionProposals
 * before any action can be dispatched to the browser executor.
 */

import { BoundingBox } from '../m06-fusion/types';
import type { ActionProposal, ActionType } from '../m09-reasoning/types';

export type { ActionProposal, ActionType };

/**
 * Extended action types supported locally (including SELECT if present).
 */
export type GuardActionType = ActionType | 'SELECT';

export const SUPPORTED_GUARD_ACTION_TYPES: readonly GuardActionType[] = [
  'CLICK',
  'TYPE',
  'KEY_PRESS',
  'SCROLL',
  'NAVIGATE',
  'WAIT',
  'DONE',
  'SELECT',
] as const;

/**
 * Validated and authorized action record conforming to INTERFACES.md (Section 6).
 * Ready for safe dispatch by the downstream Browser Executor (M11).
 */
export interface ValidatedAction {
  action_id: string;
  observation_id: string;
  action_type: GuardActionType;
  target_id?: string;
  resolved_bbox?: BoundingBox; // Authoritative coordinates resolved locally from current observation
  parameters?: Record<string, string>; // Sanitized / substituted parameters (e.g. injected credentials)
  intended_effect?: string;
  validation_timestamp: number;
}

/**
 * Options for configuring local action validation.
 */
export interface ValidationOptions {
  /**
   * Maximum allowed age of the observation in milliseconds.
   * Default: 2000ms (as defined in MODULES.md M10 specification).
   */
  maxObservationAgeMs?: number;

  /**
   * Override for current time in ms (useful for deterministic unit testing of staleness).
   */
  currentTimeMs?: number;

  /**
   * Local secure credential store for resolving $CREDENTIAL tokens (e.g. $CREDENTIAL[USER_PASSWORD]).
   */
  credentialStore?: Record<string, string>;

  /**
   * Allowed action types override (if restricted for a specific security mode).
   */
  allowedActionTypes?: readonly GuardActionType[];

  /**
   * Maximum permitted physical drift in pixels between observation bbox and live CDP box model.
   * Default: 5px.
   */
  maxDriftPx?: number;

  /**
   * Optional local CDP box model provider for live verification of element bounds.
   */
  boxModelProvider?: (targetId: string) => Promise<BoundingBox | null> | BoundingBox | null;
}

/**
 * Structured validation outcome.
 */
export interface ValidationSuccess {
  valid: true;
  action: ValidatedAction;
}

export interface ValidationFailure {
  valid: false;
  errorCode: string;
  reason: string;
}

export type ValidationOutcome = ValidationSuccess | ValidationFailure;
