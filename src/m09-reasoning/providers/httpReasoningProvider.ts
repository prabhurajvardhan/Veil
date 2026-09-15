/**
 * M09: Remote Reasoner Gateway — HTTP Reasoning Provider
 * Author: AI008 (Reasoning Gateway Engineer)
 *
 * Prototype HTTP reasoning provider that communicates with a remote LLM service
 * over HTTPS via native fetch().
 *
 * Enforces:
 * - Decoupled vendor abstraction
 * - AbortController timeout handling
 * - Fail-closed network and HTTP error translation
 */

import { HttpReasoningProviderConfig, ReasoningProvider, ReasoningRequest } from '../types';
import {
  ReasoningProviderError,
  ReasoningTimeoutError,
} from '../errors';

export const DEFAULT_HTTP_TIMEOUT_MS = 30000;

export class HttpReasoningProvider implements ReasoningProvider {
  public readonly providerId = 'HttpReasoningProvider';

  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly modelName?: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;
  private readonly customHeaders: Record<string, string>;

  constructor(config: HttpReasoningProviderConfig) {
    if (!config || !config.endpoint || typeof config.endpoint !== 'string' || config.endpoint.trim() === '') {
      throw new ReasoningProviderError('HttpReasoningProvider requires a valid endpoint URL');
    }

    this.endpoint = config.endpoint.trim();
    this.apiKey = config.apiKey;
    this.modelName = config.modelName;
    this.timeoutMs = config.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_HTTP_TIMEOUT_MS;
    this.fetchFn = config.fetchFn || (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : (fetch as any));
    this.customHeaders = config.customHeaders || {};
  }

  public async proposeAction(request: ReasoningRequest): Promise<unknown> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.customHeaders,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const payload = {
      model: this.modelName,
      request,
    };

    try {
      const response = await this.fetchFn(this.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorDetails = '';
        try {
          errorDetails = await response.text();
        } catch {
          // ignore error text extraction failure
        }
        throw new ReasoningProviderError(
          `Remote reasoner endpoint returned HTTP ${response.status} ${response.statusText}`,
          { status: response.status, body: errorDetails }
        );
      }

      const rawJson = await response.json();
      return rawJson;
    } catch (err: any) {
      if (err.name === 'AbortError' || controller.signal.aborted) {
        throw new ReasoningTimeoutError(this.timeoutMs);
      }
      if (err instanceof ReasoningProviderError || err instanceof ReasoningTimeoutError) {
        throw err;
      }
      throw new ReasoningProviderError(
        `Failed to reach remote reasoner endpoint: ${err.message || String(err)}`,
        { originalError: err }
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
