/**
 * M09: Remote Reasoner Gateway — Mock Reasoning Provider
 * Author: AI008 (Reasoning Gateway Engineer)
 *
 * Deterministic test provider allowing unit/integration testing without external LLM dependencies.
 * Records all egress requests to enable cryptographic and privacy invariant assertions.
 */

import { ReasoningProvider, ReasoningRequest } from '../types';
import { ReasoningProviderError, ReasoningTimeoutError } from '../errors';

export type MockResponseResolver =
  | unknown
  | ((request: ReasoningRequest) => unknown | Promise<unknown>);

export class MockReasoningProvider implements ReasoningProvider {
  public readonly providerId = 'MockReasoningProvider';

  private recordedRequests: ReasoningRequest[] = [];
  private responseQueue: MockResponseResolver[] = [];
  private defaultResponse: MockResponseResolver | null = null;
  private delayMs = 0;
  private shouldTimeout = false;
  private networkErrorMessage: string | null = null;

  constructor(initialDefaultResponse?: MockResponseResolver) {
    if (initialDefaultResponse !== undefined) {
      this.defaultResponse = initialDefaultResponse;
    }
  }

  /**
   * Queues a deterministic response for the next request.
   */
  public enqueueResponse(response: MockResponseResolver): this {
    this.responseQueue.push(response);
    return this;
  }

  /**
   * Sets the fallback response when queue is empty.
   */
  public setDefaultResponse(response: MockResponseResolver): this {
    this.defaultResponse = response;
    return this;
  }

  /**
   * Simulates artificial latency in milliseconds.
   */
  public setDelay(ms: number): this {
    this.delayMs = ms;
    return this;
  }

  /**
   * Configures the provider to simulate a request timeout.
   */
  public setSimulateTimeout(timeout: boolean): this {
    this.shouldTimeout = timeout;
    return this;
  }

  /**
   * Configures the provider to simulate a network transport failure.
   */
  public setSimulateNetworkError(errorMsg: string | null): this {
    this.networkErrorMessage = errorMsg;
    return this;
  }

  /**
   * Returns all recorded requests sent across the reasoning boundary.
   */
  public getRecordedRequests(): readonly ReasoningRequest[] {
    return this.recordedRequests;
  }

  /**
   * Returns the most recent recorded request.
   */
  public getLastRecordedRequest(): ReasoningRequest | undefined {
    return this.recordedRequests[this.recordedRequests.length - 1];
  }

  /**
   * Resets recorded requests and queued responses.
   */
  public reset(): void {
    this.recordedRequests = [];
    this.responseQueue = [];
    this.delayMs = 0;
    this.shouldTimeout = false;
    this.networkErrorMessage = null;
  }

  public async proposeAction(request: ReasoningRequest): Promise<unknown> {
    // Record deep clone of request to ensure strict immutability
    this.recordedRequests.push(JSON.parse(JSON.stringify(request)));

    if (this.delayMs > 0) {
      await new Promise((res) => setTimeout(res, this.delayMs));
    }

    if (this.shouldTimeout) {
      throw new ReasoningTimeoutError(this.delayMs || 5000);
    }

    if (this.networkErrorMessage) {
      throw new ReasoningProviderError(`Network error: ${this.networkErrorMessage}`);
    }

    let nextResolver = this.responseQueue.shift() ?? this.defaultResponse;

    if (!nextResolver) {
      // Default sensible response matching the requested observation
      return {
        action_id: `act-${Date.now()}`,
        observation_id: request.observation_id,
        action_type: 'DONE',
        intended_effect: 'Task completed successfully',
      };
    }

    if (typeof nextResolver === 'function') {
      return await nextResolver(request);
    }

    return nextResolver;
  }
}
