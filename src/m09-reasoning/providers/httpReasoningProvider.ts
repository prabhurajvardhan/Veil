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
import { VEIL_SYSTEM_PROMPT } from '../systemPrompt';

export const DEFAULT_GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';
export const DEFAULT_HTTP_TIMEOUT_MS = 30000;

/**
 * Safely resolves environment variables across Vite (import.meta.env) and Node (process.env).
 */
export function getEnvVar(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      const env = (import.meta as any).env;
      if (env[key]) return env[key];
      if (env[`VITE_${key}`]) return env[`VITE_${key}`];
    }
  } catch {
    // ignore environment lookup errors
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      if (process.env[key]) return process.env[key];
      if (process.env[`VITE_${key}`]) return process.env[`VITE_${key}`];
    }
  } catch {
    // ignore environment lookup errors
  }

  return undefined;
}

/**
 * Resolves complete HTTP reasoning provider configuration with intelligent defaults for Groq, OpenAI, and Hugging Face.
 */
export function resolveReasoningConfig(
  config?: Partial<HttpReasoningProviderConfig>
): Required<Pick<HttpReasoningProviderConfig, 'endpoint' | 'modelName' | 'timeoutMs' | 'systemPrompt' | 'format'>> & {
  apiKey?: string;
  fetchFn?: typeof fetch;
  customHeaders?: Record<string, string>;
  temperature?: number;
} {
  const apiKey =
    config?.apiKey ||
    getEnvVar('GROQ_API_KEY') ||
    getEnvVar('VITE_GROQ_API_KEY') ||
    getEnvVar('HF_TOKEN') ||
    getEnvVar('VITE_HF_TOKEN') ||
    getEnvVar('HUGGINGFACE_API_KEY') ||
    getEnvVar('OPENAI_API_KEY') ||
    getEnvVar('VITE_OPENAI_API_KEY');

  const isGroq =
    (apiKey && apiKey.startsWith('gsk_')) ||
    (config?.endpoint && config.endpoint.includes('groq.com')) ||
    (!config?.endpoint && !!(getEnvVar('GROQ_API_KEY') || getEnvVar('VITE_GROQ_API_KEY')));

  const isOpenAI =
    (apiKey && apiKey.startsWith('sk-') && !isGroq) ||
    (config?.endpoint && config.endpoint.includes('openai.com'));

  let endpoint =
    config?.endpoint ||
    getEnvVar('LLM_ENDPOINT') ||
    getEnvVar('VITE_LLM_ENDPOINT') ||
    getEnvVar('HF_INFERENCE_ENDPOINT') ||
    getEnvVar('VITE_HF_INFERENCE_ENDPOINT');

  if (!endpoint || endpoint.trim() === '') {
    if (isOpenAI) {
      endpoint = 'https://api.openai.com/v1/chat/completions';
    } else {
      // Default to Groq high-speed Llama-3.3 inference endpoint
      endpoint = DEFAULT_GROQ_ENDPOINT;
    }
  }

  let modelName =
    config?.modelName ||
    getEnvVar('GROQ_MODEL') ||
    getEnvVar('HF_MODEL_NAME') ||
    getEnvVar('MODEL_NAME');

  if (!modelName || modelName.trim() === '') {
    if (endpoint.includes('groq.com') || isGroq) {
      modelName = DEFAULT_GROQ_MODEL;
    } else if (endpoint.includes('openai.com') || isOpenAI) {
      modelName = 'gpt-4o';
    } else {
      modelName = DEFAULT_GROQ_MODEL;
    }
  }

  return {
    endpoint: endpoint.trim(),
    apiKey: apiKey ? apiKey.trim() : undefined,
    modelName: modelName.trim(),
    timeoutMs: config?.timeoutMs && config.timeoutMs > 0 ? config.timeoutMs : DEFAULT_HTTP_TIMEOUT_MS,
    fetchFn: config?.fetchFn,
    customHeaders: config?.customHeaders,
    systemPrompt: config?.systemPrompt || VEIL_SYSTEM_PROMPT,
    temperature: config?.temperature ?? 0.1,
    format: config?.format || (isGroq || isOpenAI || endpoint.includes('openai.com') || endpoint.includes('groq.com') ? 'openai' : 'default'),
  };
}

/**
 * Extracts the model's generated payload from various provider response envelopes
 * (OpenAI/vLLM/Ollama choices, HuggingFace generated_text, Anthropic content, or direct JSON),
 * unwrapping markdown code blocks when present.
 */
export function extractModelContent(rawResponse: unknown): unknown {
  if (!rawResponse) {
    return rawResponse;
  }

  // 1. Array responses (e.g. Hugging Face text generation pipeline: [{ generated_text: "..." }])
  if (Array.isArray(rawResponse)) {
    if (rawResponse.length > 0 && rawResponse[0] && typeof rawResponse[0] === 'object') {
      const first = rawResponse[0];
      if ('generated_text' in first && typeof first.generated_text === 'string') {
        return extractJsonString(first.generated_text);
      }
      return extractModelContent(first);
    }
    return rawResponse;
  }

  // 2. Object responses
  if (typeof rawResponse === 'object') {
    const obj = rawResponse as Record<string, any>;

    // 2a. OpenAI / vLLM / Groq / Ollama / HF Chat format: { choices: [{ message: { content: "..." } }] }
    if (Array.isArray(obj.choices) && obj.choices.length > 0) {
      const choice = obj.choices[0];
      if (choice && typeof choice === 'object') {
        if (choice.message && typeof choice.message === 'object' && typeof choice.message.content === 'string') {
          return extractJsonString(choice.message.content);
        }
        if (typeof choice.text === 'string') {
          return extractJsonString(choice.text);
        }
      }
    }

    // 2b. Anthropic Messages format: { content: [{ type: "text", text: "..." }] }
    if (Array.isArray(obj.content) && obj.content.length > 0) {
      const textBlock = obj.content.find(
        (b: any) => b && typeof b === 'object' && b.type === 'text' && typeof b.text === 'string'
      );
      if (textBlock) {
        return extractJsonString(textBlock.text);
      }
    }

    // 2c. Hugging Face single object: { generated_text: "..." }
    if (typeof obj.generated_text === 'string') {
      return extractJsonString(obj.generated_text);
    }

    // 2d. Generic output/response fields
    if (typeof obj.output === 'string') {
      return extractJsonString(obj.output);
    }
    if (typeof obj.response === 'string') {
      return extractJsonString(obj.response);
    }

    // 2e. Direct ActionProposal or already structured object
    return obj;
  }

  // 3. String response: strip markdown fences if present
  if (typeof rawResponse === 'string') {
    return extractJsonString(rawResponse);
  }

  return rawResponse;
}

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from model generated text.
 * If parsed JSON is valid, returns the parsed object; otherwise returns the trimmed string
 * so downstream validateActionProposal can fail closed with standard error diagnostics.
 */
export function extractJsonString(text: string): unknown {
  const trimmed = text.trim();

  // Match markdown code block ```json ... ``` or ``` ... ```
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const targetStr = codeBlockMatch && codeBlockMatch[1] ? codeBlockMatch[1].trim() : trimmed;

  try {
    return JSON.parse(targetStr);
  } catch {
    return targetStr;
  }
}

export class HttpReasoningProvider implements ReasoningProvider {
  public readonly providerId = 'HttpReasoningProvider';

  public readonly endpoint: string;
  public readonly apiKey?: string;
  public readonly modelName: string;
  public readonly timeoutMs: number;
  public readonly systemPrompt: string;
  public readonly temperature?: number;
  public readonly format: 'openai' | 'messages' | 'default';

  private readonly fetchFn: typeof fetch;
  private readonly customHeaders: Record<string, string>;

  constructor(config?: Partial<HttpReasoningProviderConfig>) {
    if (config && typeof config.endpoint === 'string' && config.endpoint.trim() === '') {
      throw new ReasoningProviderError('HttpReasoningProvider requires a valid endpoint URL');
    }

    const resolved = resolveReasoningConfig(config);

    this.endpoint = resolved.endpoint;
    this.apiKey = resolved.apiKey;
    this.modelName = resolved.modelName;
    this.timeoutMs = resolved.timeoutMs;
    this.fetchFn =
      resolved.fetchFn ||
      (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : (fetch as any));
    this.customHeaders = resolved.customHeaders || {};
    this.systemPrompt = resolved.systemPrompt;
    this.temperature = resolved.temperature;
    this.format = resolved.format;
  }

  public getEndpoint(): string {
    return this.endpoint;
  }

  public getModelName(): string {
    return this.modelName;
  }

  public getSystemPrompt(): string {
    return this.systemPrompt;
  }

  public hasApiKey(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
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

    // Build serialized user prompt containing goal and sanitized observation
    const userPromptContent = JSON.stringify(
      {
        user_goal: request.user_goal,
        observation_id: request.observation_id,
        timestamp: request.timestamp,
        overall_confidence: request.overall_confidence,
        nodes: request.nodes,
        metadata: request.metadata,
      },
      null,
      2
    );

    const messages = [
      {
        role: 'system',
        content: this.systemPrompt,
      },
      {
        role: 'user',
        content: `User Goal: ${request.user_goal}\n\nSanitized Observation:\n${userPromptContent}\n\nPropose the next declarative action as raw JSON adhering strictly to the VEIL ActionProposal schema. You MUST use observation_id: "${request.observation_id}".`,
      },
    ];

    const payload: Record<string, unknown> = {
      model: this.modelName || 'default',
      messages,
      request,
      ...(this.temperature !== undefined ? { temperature: this.temperature } : {}),
    };

    if (this.format !== 'openai') {
      payload.system_instruction = this.systemPrompt;
    }

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
      // Extract model generated content from vendor-specific response envelopes
      return extractModelContent(rawJson);
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
