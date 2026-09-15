/**
 * M09: Remote Reasoner Gateway — Implementation
 * Author: AI008 (Reasoning Gateway Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 *
 * Implements the gateway between the LOCAL privacy-sanitized observation pipeline
 * and the remote reasoning layer.
 *
 * BOUNDARIES ENFORCED:
 * 1. Privacy Boundary: Transmits ONLY SanitizedObservation (never raw DOM, raw A11y, raw screenshot, raw OCR).
 * 2. Authority Boundary: Produces ONLY a declarative ActionProposal. Zero browser execution authority.
 * 3. Integrity Boundary: Observation ID strictly bound; untrusted model output validated fail-closed.
 */

import { SanitizedObservation } from '../m08-sanitization/types';
import {
  ActionProposal,
  ReasoningGatewayOptions,
  ReasoningProvider,
} from './types';
import {
  ReasoningGatewayError,
  ReasoningProviderError,
} from './errors';
import {
  prepareReasoningRequest,
  validateActionProposal,
  validateSanitizedObservation,
} from './validator';

export class ReasoningGateway {
  public readonly provider: ReasoningProvider;
  private readonly validateTargetExistsInObservation: boolean;

  constructor(options: ReasoningGatewayOptions) {
    if (!options || !options.provider) {
      throw new ReasoningGatewayError(
        'ReasoningGateway requires a valid ReasoningProvider implementation',
        'MISSING_PROVIDER'
      );
    }

    this.provider = options.provider;
    this.validateTargetExistsInObservation =
      options.validateTargetExistsInObservation !== false; // Default true
  }

  /**
   * Proposes a structured, declarative browser action based solely on a sanitized observation
   * and user goal.
   *
   * @param observation The sanitized observation produced by M08 (T011)
   * @param userGoal Natural language objective of the user (e.g. "Click the submit button")
   * @returns ActionProposal strictly bound to observation.observation_id
   *
   * @throws {InvalidObservationError} If observation or goal is malformed
   * @throws {SecurityBoundaryViolationError} If forbidden raw data is detected in observation
   * @throws {ReasoningProviderError} If the underlying model provider fails
   * @throws {ReasoningTimeoutError} If provider times out
   * @throws {MalformedModelResponseError} If model produces invalid JSON or structure
   * @throws {InvalidActionProposalError} If proposed action violates the schema
   * @throws {ObservationIdMismatchError} If model returns a mismatched observation_id
   */
  public async proposeAction(
    observation: SanitizedObservation,
    userGoal: string
  ): Promise<ActionProposal> {
    // 1. Validate incoming sanitized observation
    const validObs = validateSanitizedObservation(observation);

    // 2. Prepare minimal, privacy-bounded egress payload (strips screenshots and buffer references)
    const egressRequest = prepareReasoningRequest(validObs, userGoal);

    // Build lookup set of valid targets in this observation
    const validTargetIds = this.validateTargetExistsInObservation
      ? new Set(validObs.nodes.map((n) => n.target_id))
      : undefined;

    // 3. Delegate to untrusted reasoning provider
    let rawResponse: unknown;
    try {
      rawResponse = await this.provider.proposeAction(egressRequest);
    } catch (err: any) {
      if (err instanceof ReasoningGatewayError) {
        throw err;
      }
      throw new ReasoningProviderError(
        `Reasoning provider '${this.provider.providerId}' execution failed: ${err.message || String(err)}`,
        { originalError: err }
      );
    }

    // 4. Validate untrusted model output fail-closed
    const proposal = validateActionProposal(
      rawResponse,
      validObs.observation_id,
      validTargetIds
    );

    return proposal;
  }
}
