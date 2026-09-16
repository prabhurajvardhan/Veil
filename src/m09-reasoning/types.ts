/**
 * M09: Remote Reasoner Gateway — Type Definitions
 * Author: AI008 (Reasoning Gateway Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Implements the gateway contract between the LOCAL privacy-sanitized observation
 * pipeline (M08) and the untrusted remote reasoning layer.
 */

import { BoundingBox } from '../m06-fusion/types';
import { SanitizedObservation, SanitizedPerceptionNode } from '../m08-sanitization/types';

/**
 * Supported browser action types defined in INTERFACES.md (Section 5: ActionProposal).
 * T012 can only propose these declarative actions.
 */
export type ActionType =
  | 'CLICK'
  | 'TYPE'
  | 'KEY_PRESS'
  | 'SCROLL'
  | 'NAVIGATE'
  | 'WAIT'
  | 'DONE';

export const VALID_ACTION_TYPES: readonly ActionType[] = [
  'CLICK',
  'TYPE',
  'KEY_PRESS',
  'SCROLL',
  'NAVIGATE',
  'WAIT',
  'DONE',
] as const;

/**
 * Declarative ActionProposal conforming to INTERFACES.md (Section 5).
 * Constraint: Must NEVER contain executable JavaScript or direct browser instructions.
 */
export interface ActionProposal {
  action_id: string; // UUID v4 or deterministic action ID
  observation_id: string; // Strictly bound: must match the observation reasoned upon
  target_id?: string; // Required for CLICK and TYPE actions
  action_type: ActionType;
  parameters?: Record<string, string>; // e.g., { "text": "search query" } or { "key": "Enter" }
  intended_effect: string; // The model's natural language goal for this action
  confidence?: number; // Optional model confidence (0.0 to 1.0)
}

/**
 * Sanitized node payload transmitted across the network boundary to the reasoner.
 * Only sanitized, non-sensitive structural properties and redaction markers are sent.
 */
export interface SanitizedNodePayload {
  target_id: string;
  bbox: BoundingBox;
  role: string;
  text: string | null;
  interactable: boolean;
  confidence: number;
  is_redacted: boolean;
}

/**
 * Strict egress payload transmitted to the reasoning provider.
 * CRITICAL PRIVACY BOUNDARY:
 * This payload must NEVER contain:
 * - raw DOM tree
 * - raw A11y tree
 * - raw screenshot
 * - raw OCR output
 * - PrivacyClassificationResult
 * - original sensitive values
 */
export interface ReasoningRequest {
  user_goal: string;
  observation_id: string;
  timestamp: number;
  overall_confidence: number;
  nodes: SanitizedNodePayload[];
  metadata?: {
    total_nodes: number;
    redacted_nodes_count: number;
  };
}

/**
 * Raw model response structure prior to validation.
 * The model output is treated as UNTRUSTED and must be strictly validated.
 */
export interface RawModelResponse {
  action_id?: string;
  observation_id?: string;
  target_id?: string | null;
  action_type?: string;
  parameters?: Record<string, unknown> | null;
  intended_effect?: string;
  confidence?: number;
  [key: string]: unknown;
}

/**
 * Interface for pluggable reasoning backends (HTTP, mock, vendor-specific).
 * Decouples the gateway from any single model vendor.
 */
export interface ReasoningProvider {
  readonly providerId: string;
  proposeAction(request: ReasoningRequest): Promise<unknown>;
}

/**
 * HTTP Reasoning Provider configuration options.
 */
export interface HttpReasoningProviderConfig {
  endpoint: string;
  apiKey?: string;
  modelName?: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
  customHeaders?: Record<string, string>;
  systemPrompt?: string;
  temperature?: number;
  format?: 'openai' | 'messages' | 'default';
}

/**
 * Configuration options for the ReasoningGateway.
 */
export interface ReasoningGatewayOptions {
  provider: ReasoningProvider;
  defaultTimeoutMs?: number;
  validateTargetExistsInObservation?: boolean;
}
