/**
 * M09: Remote Reasoner Gateway — Validator
 * Author: AI008 (Reasoning Gateway Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Enforces strict bidirectional validation:
 * 1. Sanitized Observation Input (Fail-closed if un-sanitized raw artifacts or malformed inputs detected)
 * 2. Untrusted Model Output (Fail-closed on malformed JSON, invalid action types, script injections, or ID mismatch)
 */

import { SanitizedObservation, SanitizedPerceptionNode } from '../m08-sanitization/types';
import {
  ActionProposal,
  ActionType,
  ReasoningRequest,
  SanitizedNodePayload,
  VALID_ACTION_TYPES,
} from './types';
import {
  InvalidActionProposalError,
  InvalidObservationError,
  MalformedModelResponseError,
  ObservationIdMismatchError,
  SecurityBoundaryViolationError,
} from './errors';

// Known prohibited raw data property keys that must NEVER cross into the reasoning layer
const PROHIBITED_RAW_FIELDS = [
  'dom_tree',
  'a11y_tree',
  'raw_dom',
  'raw_a11y',
  'raw_screenshot',
  'ocr_evidence',
  'visual_evidence',
  'assessments',
  'sensitive_target_ids',
  'classification_results',
];

/**
 * Validates that an observation strictly satisfies the SanitizedObservation contract
 * and contains no prohibited raw perception or privacy assessment artifacts.
 */
export function validateSanitizedObservation(observation: unknown): SanitizedObservation {
  if (!observation || typeof observation !== 'object') {
    throw new InvalidObservationError('Sanitized observation must be a valid non-null object');
  }

  const obs = observation as Record<string, unknown>;

  // Security Egress Boundary Check: Detect any prohibited raw structures
  for (const field of PROHIBITED_RAW_FIELDS) {
    if (field in obs && obs[field] !== undefined) {
      throw new SecurityBoundaryViolationError(field, {
        detectedField: field,
        observationId: obs.observation_id,
      });
    }
  }

  // Validate observation_id
  if (
    typeof obs.observation_id !== 'string' ||
    obs.observation_id.trim() === ''
  ) {
    throw new InvalidObservationError('Observation missing valid, non-empty observation_id');
  }

  // Validate timestamp
  if (typeof obs.timestamp !== 'number' || isNaN(obs.timestamp) || obs.timestamp <= 0) {
    throw new InvalidObservationError('Observation missing valid positive timestamp');
  }

  // Validate nodes array
  if (!Array.isArray(obs.nodes)) {
    throw new InvalidObservationError('Observation nodes must be an array');
  }

  // Validate individual nodes
  for (let i = 0; i < obs.nodes.length; i++) {
    const node = obs.nodes[i];
    if (!node || typeof node !== 'object') {
      throw new InvalidObservationError(`Node at index ${i} is invalid or null`);
    }

    if (typeof node.target_id !== 'string' || node.target_id.trim() === '') {
      throw new InvalidObservationError(`Node at index ${i} missing valid target_id`);
    }

    if (!node.bbox || typeof node.bbox !== 'object') {
      throw new InvalidObservationError(`Node at index ${i} (${node.target_id}) missing bbox`);
    }

    const { x, y, width, height } = node.bbox;
    if (
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      typeof width !== 'number' ||
      typeof height !== 'number' ||
      isNaN(x) ||
      isNaN(y) ||
      isNaN(width) ||
      isNaN(height)
    ) {
      throw new InvalidObservationError(`Node ${node.target_id} has invalid bbox coordinates`);
    }

    if (typeof node.role !== 'string') {
      throw new InvalidObservationError(`Node ${node.target_id} missing role string`);
    }

    if (typeof node.interactable !== 'boolean') {
      throw new InvalidObservationError(`Node ${node.target_id} missing boolean interactable flag`);
    }

    if (typeof node.confidence !== 'number' || isNaN(node.confidence)) {
      throw new InvalidObservationError(`Node ${node.target_id} missing valid numeric confidence`);
    }

    if (typeof node.is_redacted !== 'boolean') {
      throw new InvalidObservationError(`Node ${node.target_id} missing boolean is_redacted flag`);
    }
  }

  return obs as unknown as SanitizedObservation;
}

/**
 * Prepares the minimal, sanitized egress payload for the reasoning provider.
 * Explicitly strips any screenshot or visual buffers, transmitting only safe
 * structural nodes, metadata, and user goal.
 */
export function prepareReasoningRequest(
  observation: SanitizedObservation,
  userGoal: string
): ReasoningRequest {
  if (!userGoal || typeof userGoal !== 'string' || userGoal.trim() === '') {
    throw new InvalidObservationError('User goal must be a valid, non-empty string');
  }

  const safeNodes: SanitizedNodePayload[] = observation.nodes.map((n) => ({
    target_id: n.target_id,
    bbox: {
      x: n.bbox.x,
      y: n.bbox.y,
      width: n.bbox.width,
      height: n.bbox.height,
    },
    role: n.role,
    text: n.text,
    interactable: n.interactable,
    confidence: n.confidence,
    is_redacted: n.is_redacted,
  }));

  const redactedCount = safeNodes.filter((n) => n.is_redacted).length;

  return {
    user_goal: userGoal.trim(),
    observation_id: observation.observation_id,
    timestamp: observation.timestamp,
    overall_confidence: observation.overall_confidence ?? 1.0,
    nodes: safeNodes,
    metadata: {
      total_nodes: safeNodes.length,
      redacted_nodes_count: redactedCount,
    },
  };
}

/**
 * Generates a standard UUID v4 or random identifier for action proposals.
 */
function generateActionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'act-' + Math.random().toString(36).substring(2, 11) + '-' + Date.now().toString(36);
}

/**
 * Validates and converts untrusted reasoning provider output into a strict ActionProposal.
 * Fails closed on any schema violations or observation ID mismatch.
 *
 * @param raw Untrusted model output (string or object)
 * @param expectedObservationId Observation ID used for reasoning
 * @param validTargetIds Optional set of target_ids present in the observation
 */
export function validateActionProposal(
  raw: unknown,
  expectedObservationId: string,
  validTargetIds?: Set<string>
): ActionProposal {
  if (!raw) {
    throw new MalformedModelResponseError('Model response is empty or null');
  }

  let data: Record<string, unknown>;

  // 1. Parse JSON if raw is a string
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch (err: any) {
      throw new MalformedModelResponseError(`Failed to parse model response as JSON: ${err.message}`);
    }
  } else if (typeof raw === 'object') {
    data = raw as Record<string, unknown>;
  } else {
    throw new MalformedModelResponseError('Model response must be a JSON string or object');
  }

  // Handle common wrapper keys (e.g. { "proposal": { ... } } or { "action": { ... } })
  if (data.proposal && typeof data.proposal === 'object') {
    data = data.proposal as Record<string, unknown>;
  } else if (data.action && typeof data.action === 'object') {
    data = data.action as Record<string, unknown>;
  }

  // 2. Validate observation_id and strict binding
  const observationId = data.observation_id;
  if (!observationId || typeof observationId !== 'string' || observationId.trim() === '') {
    throw new InvalidActionProposalError('Action proposal missing required observation_id');
  }

  if (observationId.trim() !== expectedObservationId.trim()) {
    throw new ObservationIdMismatchError(expectedObservationId, observationId);
  }

  // 3. Validate action_type
  const rawActionType = typeof data.action_type === 'string' ? data.action_type.toUpperCase().trim() : '';
  if (!VALID_ACTION_TYPES.includes(rawActionType as ActionType)) {
    throw new InvalidActionProposalError(
      `Invalid action_type '${data.action_type}'. Allowed types: ${VALID_ACTION_TYPES.join(', ')}`
    );
  }
  const actionType = rawActionType as ActionType;

  // 4. Validate intended_effect
  const intendedEffect = data.intended_effect;
  if (!intendedEffect || typeof intendedEffect !== 'string' || intendedEffect.trim() === '') {
    throw new InvalidActionProposalError('Action proposal missing required intended_effect description');
  }

  // 5. Validate target_id
  let targetId: string | undefined = undefined;
  if (data.target_id !== undefined && data.target_id !== null) {
    if (typeof data.target_id !== 'string' || data.target_id.trim() === '') {
      throw new InvalidActionProposalError('Action proposal target_id must be a non-empty string when present');
    }
    targetId = data.target_id.trim();
  }

  // Target ID requirement for specific action types
  if ((actionType === 'CLICK' || actionType === 'TYPE') && !targetId) {
    throw new InvalidActionProposalError(`Action '${actionType}' strictly requires a target_id`);
  }

  // Verify target_id exists in observation nodes
  if (targetId && validTargetIds && validTargetIds.size > 0) {
    if (!validTargetIds.has(targetId)) {
      throw new InvalidActionProposalError(
        `Action target_id '${targetId}' was not found among observation perception nodes`
      );
    }
  }

  // 6. Validate parameters
  let cleanParameters: Record<string, string> | undefined = undefined;
  if (data.parameters !== undefined && data.parameters !== null) {
    if (typeof data.parameters !== 'object' || Array.isArray(data.parameters)) {
      throw new InvalidActionProposalError('Action proposal parameters must be an object with string values');
    }

    cleanParameters = {};
    for (const [k, v] of Object.entries(data.parameters)) {
      if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') {
        throw new InvalidActionProposalError(`Parameter '${k}' must be a scalar string/number/boolean value`);
      }

      const strVal = String(v);

      // Script Injection Defense: Reject executable JavaScript constructs
      if (
        strVal.toLowerCase().includes('<script') ||
        strVal.toLowerCase().startsWith('javascript:') ||
        strVal.toLowerCase().includes('eval(')
      ) {
        throw new InvalidActionProposalError(
          `Security violation: Parameter '${k}' contains prohibited executable script payload`
        );
      }

      cleanParameters[k] = strVal;
    }
  }

  // Action-specific parameter requirements
  if (actionType === 'TYPE') {
    if (!cleanParameters || typeof cleanParameters.text !== 'string') {
      throw new InvalidActionProposalError("Action 'TYPE' requires a 'text' parameter");
    }
  } else if (actionType === 'KEY_PRESS') {
    if (!cleanParameters || typeof cleanParameters.key !== 'string' || cleanParameters.key.trim() === '') {
      throw new InvalidActionProposalError("Action 'KEY_PRESS' requires a non-empty 'key' parameter");
    }
  } else if (actionType === 'NAVIGATE') {
    if (!cleanParameters || typeof cleanParameters.url !== 'string' || cleanParameters.url.trim() === '') {
      throw new InvalidActionProposalError("Action 'NAVIGATE' requires a non-empty 'url' parameter");
    }
    const lowerUrl = cleanParameters.url.toLowerCase().trim();
    if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:text/html')) {
      throw new InvalidActionProposalError("Action 'NAVIGATE' rejects dangerous URI scheme");
    }
  }

  // 7. Validate confidence if present
  let confidence: number | undefined = undefined;
  if (data.confidence !== undefined && data.confidence !== null) {
    if (typeof data.confidence !== 'number' || isNaN(data.confidence) || data.confidence < 0 || data.confidence > 1) {
      throw new InvalidActionProposalError('Action proposal confidence must be a number between 0.0 and 1.0');
    }
    confidence = data.confidence;
  }

  const actionId =
    typeof data.action_id === 'string' && data.action_id.trim() !== ''
      ? data.action_id.trim()
      : generateActionId();

  return {
    action_id: actionId,
    observation_id: expectedObservationId,
    target_id: targetId,
    action_type: actionType,
    parameters: cleanParameters,
    intended_effect: intendedEffect.trim(),
    confidence,
  };
}
