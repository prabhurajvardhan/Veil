/**
 * M10: Local Action Guard / Action Validation — Implementation
 * Author: AI009 (Action Validation Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Implements the local action validation authority.
 * Decides deterministically whether an untrusted ActionProposal from T012
 * is permitted to be dispatched to the browser executor (M11).
 *
 * ABSOLUTE CONSTRAINTS:
 * - Fail-closed on any discrepancy or missing data.
 * - Zero browser execution authority (no CDP action commands, no DOM manipulation, no JS execution).
 * - Binds strictly to the authoritative observation ID.
 * - Resolves physical target coordinates locally from current observation (never trusts remote coordinates).
 */

import { BoundingBox } from '../m06-fusion/types';
import { SanitizedObservation, SanitizedPerceptionNode } from '../m08-sanitization/types';
import { ActionProposal } from '../m09-reasoning/types';
import {
  GuardActionType,
  SUPPORTED_GUARD_ACTION_TYPES,
  ValidatedAction,
  ValidationOptions,
  ValidationOutcome,
} from './types';
import {
  ActionValidationError,
  IncompatibleTargetRoleError,
  InvalidActionArgumentsError,
  InvalidProposalStructureError,
  InvalidTargetBoundingBoxError,
  MissingProposalError,
  MissingTargetError,
  ObservationBindingMismatchError,
  ScriptInjectionAttemptError,
  StaleObservationError,
  TargetDriftExceededError,
  TargetNotFoundError,
  TargetNotInteractableError,
  UnknownActionTypeError,
  UnsafeNavigationUrlError,
} from './errors';

// Roles that are strictly non-editable display elements and cannot accept text input
const STRICTLY_NON_INPUT_ROLES = new Set([
  'img',
  'image',
  'heading',
  'banner',
  'hr',
  'separator',
  'status',
  'tooltip',
  'progressbar',
]);

// Prohibited script injection signatures across action parameters
const SCRIPT_INJECTION_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /eval\s*\(/i,
  /document\.cookie/i,
  /window\.location/i,
  /onload\s*=/i,
  /onerror\s*=/i,
  /onclick\s*=/i,
];

/**
 * Validates an ActionProposal against the current authoritative SanitizedObservation.
 * Returns a ValidatedAction record ready for downstream browser execution.
 *
 * @param proposal Untrusted ActionProposal from T012
 * @param currentObservation Authoritative local SanitizedObservation from T011
 * @param options Validation configuration and environmental options
 * @returns ValidatedAction record strictly bound to local coordinates and observation
 * @throws {ActionValidationError} Subclass on any validation failure (fail-closed)
 */
export async function validateAction(
  proposal: unknown,
  currentObservation: SanitizedObservation,
  options?: ValidationOptions
): Promise<ValidatedAction> {
  // 1. Structural validation of the proposal
  if (!proposal || typeof proposal !== 'object') {
    throw new MissingProposalError();
  }

  const prop = proposal as Record<string, unknown>;

  if (typeof prop.action_id !== 'string' || prop.action_id.trim() === '') {
    throw new InvalidProposalStructureError('ActionProposal missing valid action_id string');
  }

  if (typeof prop.observation_id !== 'string' || prop.observation_id.trim() === '') {
    throw new InvalidProposalStructureError('ActionProposal missing valid observation_id string');
  }

  if (typeof prop.action_type !== 'string' || prop.action_type.trim() === '') {
    throw new InvalidProposalStructureError('ActionProposal missing valid action_type string');
  }

  const actionId = prop.action_id.trim();
  const proposalObsId = prop.observation_id.trim();
  const rawActionType = prop.action_type.toUpperCase().trim() as GuardActionType;
  const intendedEffect =
    typeof prop.intended_effect === 'string' ? prop.intended_effect.trim() : undefined;

  // 2. Validate current authoritative observation structure
  if (!currentObservation || typeof currentObservation !== 'object') {
    throw new InvalidProposalStructureError('Current authoritative observation is missing or invalid');
  }

  if (
    typeof currentObservation.observation_id !== 'string' ||
    currentObservation.observation_id.trim() === ''
  ) {
    throw new InvalidProposalStructureError('Current observation missing valid observation_id');
  }

  // 3. Observation binding verification: Strict equality
  if (proposalObsId !== currentObservation.observation_id.trim()) {
    throw new ObservationBindingMismatchError(
      currentObservation.observation_id.trim(),
      proposalObsId
    );
  }

  // 4. Observation freshness / staleness evaluation (age <= maxObservationAgeMs, default 2000ms)
  const maxAgeMs = options?.maxObservationAgeMs ?? 2000;
  const currentTime = options?.currentTimeMs ?? Date.now();
  if (maxAgeMs > 0 && typeof currentObservation.timestamp === 'number') {
    const observationAge = currentTime - currentObservation.timestamp;
    if (observationAge > maxAgeMs) {
      throw new StaleObservationError(observationAge, maxAgeMs);
    }
  }

  // 5. Action type validation
  const allowedActionTypes = options?.allowedActionTypes ?? SUPPORTED_GUARD_ACTION_TYPES;
  if (!allowedActionTypes.includes(rawActionType)) {
    throw new UnknownActionTypeError(prop.action_type as string);
  }

  // 6. Target validation
  let targetId: string | undefined = undefined;
  if (prop.target_id !== undefined && prop.target_id !== null) {
    if (typeof prop.target_id !== 'string' || prop.target_id.trim() === '') {
      throw new InvalidProposalStructureError('target_id must be a non-empty string when provided');
    }
    targetId = prop.target_id.trim();
  }

  // Target requirement by action type
  const targetRequiredActions: GuardActionType[] = ['CLICK', 'TYPE', 'SELECT'];
  if (targetRequiredActions.includes(rawActionType) && !targetId) {
    throw new MissingTargetError(rawActionType);
  }

  let resolvedTargetNode: SanitizedPerceptionNode | undefined = undefined;
  let resolvedBbox: BoundingBox | undefined = undefined;

  if (targetId) {
    const nodes = currentObservation.nodes;
    if (!Array.isArray(nodes)) {
      throw new InvalidProposalStructureError('Current observation nodes must be an array');
    }

    resolvedTargetNode = nodes.find((n) => n.target_id === targetId);
    if (!resolvedTargetNode) {
      throw new TargetNotFoundError(targetId, currentObservation.observation_id);
    }

    // Check interactability for interactive actions
    if (targetRequiredActions.includes(rawActionType)) {
      if (resolvedTargetNode.interactable !== true) {
        throw new TargetNotInteractableError(targetId, resolvedTargetNode.role);
      }
    }

    // Validate bounding box
    const bbox = resolvedTargetNode.bbox;
    if (
      !bbox ||
      typeof bbox.x !== 'number' ||
      typeof bbox.y !== 'number' ||
      typeof bbox.width !== 'number' ||
      typeof bbox.height !== 'number' ||
      isNaN(bbox.x) ||
      isNaN(bbox.y) ||
      isNaN(bbox.width) ||
      isNaN(bbox.height) ||
      bbox.width <= 0 ||
      bbox.height <= 0 ||
      bbox.x < 0 ||
      bbox.y < 0
    ) {
      throw new InvalidTargetBoundingBoxError(targetId, { bbox });
    }

    // Role compatibility checks
    if (rawActionType === 'TYPE') {
      const lowerRole = resolvedTargetNode.role.toLowerCase().trim();
      if (STRICTLY_NON_INPUT_ROLES.has(lowerRole)) {
        throw new IncompatibleTargetRoleError(targetId, resolvedTargetNode.role, 'TYPE');
      }
    }

    // Resolve authoritative coordinates directly from local observation
    resolvedBbox = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    };

    // Live box model drift check if provider configured (ADR / M10 spec: drift <= maxDriftPx, default 5px)
    if (options?.boxModelProvider) {
      const liveBox = await options.boxModelProvider(targetId);
      if (liveBox) {
        const drift = Math.hypot(liveBox.x - bbox.x, liveBox.y - bbox.y);
        const maxDrift = options.maxDriftPx ?? 5;
        if (drift > maxDrift) {
          throw new TargetDriftExceededError(targetId, Math.round(drift * 100) / 100, maxDrift);
        }
      }
    }
  }

  // 7. Action parameters validation & security sanitization
  let cleanParameters: Record<string, string> | undefined = undefined;
  if (prop.parameters !== undefined && prop.parameters !== null) {
    if (typeof prop.parameters !== 'object' || Array.isArray(prop.parameters)) {
      throw new InvalidActionArgumentsError('Action parameters must be an object with string values');
    }

    cleanParameters = {};
    for (const [key, val] of Object.entries(prop.parameters as Record<string, unknown>)) {
      if (typeof val !== 'string' && typeof val !== 'number' && typeof val !== 'boolean') {
        throw new InvalidActionArgumentsError(
          `Parameter '${key}' must be a scalar string, number, or boolean`
        );
      }

      const strVal = String(val);

      // Security check: Script injection defense across all parameter values
      for (const pattern of SCRIPT_INJECTION_PATTERNS) {
        if (pattern.test(strVal)) {
          throw new ScriptInjectionAttemptError(key, strVal);
        }
      }

      cleanParameters[key] = strVal;
    }
  }

  // Action-specific argument requirements
  if (rawActionType === 'TYPE') {
    if (!cleanParameters || typeof cleanParameters.text !== 'string') {
      throw new InvalidActionArgumentsError("Action 'TYPE' requires a 'text' parameter");
    }

    let inputText = cleanParameters.text;

    // Secure local credential token substitution ($CREDENTIAL[KEY_NAME])
    const credMatch = inputText.match(/^\$CREDENTIAL\[([a-zA-Z0-9_-]+)\]$/);
    if (credMatch) {
      const credKey = credMatch[1];
      const store = options?.credentialStore;
      if (!store || !(credKey in store)) {
        throw new InvalidActionArgumentsError(
          `Credential token '$CREDENTIAL[${credKey}]' cannot be resolved: key not found in local credential store`
        );
      }
      inputText = store[credKey];
      cleanParameters.text = inputText;
    }
  } else if (rawActionType === 'KEY_PRESS') {
    if (!cleanParameters || typeof cleanParameters.key !== 'string' || cleanParameters.key.trim() === '') {
      throw new InvalidActionArgumentsError("Action 'KEY_PRESS' requires a non-empty 'key' parameter");
    }
  } else if (rawActionType === 'NAVIGATE') {
    if (!cleanParameters || typeof cleanParameters.url !== 'string' || cleanParameters.url.trim() === '') {
      throw new InvalidActionArgumentsError("Action 'NAVIGATE' requires a non-empty 'url' parameter");
    }

    const urlStr = cleanParameters.url.trim();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      throw new UnsafeNavigationUrlError(urlStr, 'Malformed or unparseable URL string');
    }

    // Strictly enforce web safe protocols: http: or https:
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new UnsafeNavigationUrlError(
        urlStr,
        `Prohibited protocol '${parsedUrl.protocol}'. Only 'http:' and 'https:' are permitted.`
      );
    }
  } else if (rawActionType === 'SCROLL') {
    if (cleanParameters && cleanParameters.direction) {
      const dir = cleanParameters.direction.toUpperCase();
      const validDirections = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'PAGE_UP', 'PAGE_DOWN'];
      if (!validDirections.includes(dir)) {
        throw new InvalidActionArgumentsError(
          `Invalid scroll direction '${cleanParameters.direction}'. Allowed: ${validDirections.join(', ')}`
        );
      }
      cleanParameters.direction = dir;
    }
  } else if (rawActionType === 'SELECT') {
    if (!cleanParameters || (!cleanParameters.value && !cleanParameters.option)) {
      throw new InvalidActionArgumentsError("Action 'SELECT' requires a 'value' or 'option' parameter");
    }
  }

  // 8. Construct authoritative ValidatedAction
  return {
    action_id: actionId,
    observation_id: currentObservation.observation_id.trim(),
    action_type: rawActionType,
    target_id: targetId,
    resolved_bbox: resolvedBbox,
    parameters: cleanParameters,
    intended_effect: intendedEffect,
    validation_timestamp: currentTime,
  };
}

/**
 * Safe, non-throwing validation helper returning a structured ValidationOutcome.
 */
export async function tryValidateAction(
  proposal: unknown,
  currentObservation: SanitizedObservation,
  options?: ValidationOptions
): Promise<ValidationOutcome> {
  try {
    const validated = await validateAction(proposal, currentObservation, options);
    return {
      valid: true,
      action: validated,
    };
  } catch (err: any) {
    if (err instanceof ActionValidationError) {
      return {
        valid: false,
        errorCode: err.code,
        reason: err.message,
      };
    }
    return {
      valid: false,
      errorCode: 'UNEXPECTED_VALIDATION_ERROR',
      reason: err?.message || String(err),
    };
  }
}
