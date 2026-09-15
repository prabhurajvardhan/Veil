/**
 * M03: Local Visual Perception — Hugging Face Hosted Inference Provider
 * Author: AI003 (Visual Perception Engineer)
 *
 * Current Hackathon Prototype Backend for T005:
 * Connects to Hugging Face hosted inference for ShowUI-2B visual grounding.
 *
 * ARCHITECTURAL BOUNDARY:
 * This hosted inference provider is strictly a PROTOTYPE component to unblock
 * development until the frozen on-device runtime (ShowUI-2B -> ONNX -> ONNX Runtime Web -> WebGPU)
 * is fully provisioned. It does NOT alter the frozen architecture.
 */

import { CoordinateParser } from './coordinateParser';
import {
  CoordinateParsingError,
  HuggingFaceProviderConfig,
  InvalidScreenshotError,
  ModelInferenceError,
  RawVisualPrediction,
  ScreenshotInput,
  SHOWUI_GROUNDING_SYSTEM_PROMPT,
  VisualInferenceProvider,
} from './types';

export const DEFAULT_HF_ROUTER_ENDPOINT =
  'https://router.huggingface.co/hf-inference/models/showlab/ShowUI-2B';
export const DEFAULT_HF_MODEL_NAME = 'showlab/ShowUI-2B';
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;

function getEnvVar(key: string): string | undefined {
  const g = globalThis as unknown as { process?: { env?: Record<string, string> } };
  if (typeof g.process !== 'undefined' && g.process?.env) {
    return g.process.env[key];
  }
  return undefined;
}

/**
 * HuggingFaceProvider implements VisualInferenceProvider using Hugging Face hosted inference.
 */
export class HuggingFaceProvider implements VisualInferenceProvider {
  public readonly providerId = 'HuggingFaceHosted';
  private readonly config: Required<HuggingFaceProviderConfig>;

  constructor(config?: HuggingFaceProviderConfig) {
    const apiKey =
      config?.apiKey ||
      getEnvVar('HF_TOKEN') ||
      getEnvVar('HUGGINGFACE_API_KEY') ||
      (typeof import.meta !== 'undefined' &&
        (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_HF_TOKEN) ||
      '';

    const endpointUrl =
      config?.endpointUrl ||
      getEnvVar('HF_INFERENCE_ENDPOINT') ||
      (typeof import.meta !== 'undefined' &&
        (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_HF_INFERENCE_ENDPOINT) ||
      DEFAULT_HF_ROUTER_ENDPOINT;

    const modelName =
      config?.modelName ||
      getEnvVar('HF_MODEL_NAME') ||
      DEFAULT_HF_MODEL_NAME;

    this.config = {
      apiKey,
      endpointUrl,
      modelName,
      timeoutMs: config?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
      systemPrompt: config?.systemPrompt ?? SHOWUI_GROUNDING_SYSTEM_PROMPT,
    };
  }

  /**
   * Check whether this provider is configured and available
   */
  public async isAvailable(): Promise<boolean> {
    return Boolean(this.config.endpointUrl);
  }

  /**
   * Retrieve active configuration (excluding sensitive API key)
   */
  public getConfigSummary(): {
    endpointUrl: string;
    modelName: string;
    hasApiKey: boolean;
    maskedApiKey: string;
    timeoutMs: number;
  } {
    const masked = this.config.apiKey
      ? `Bearer ***${this.config.apiKey.slice(-3)}`
      : 'None';

    return {
      endpointUrl: this.config.endpointUrl,
      modelName: this.config.modelName,
      hasApiKey: Boolean(this.config.apiKey),
      maskedApiKey: masked,
      timeoutMs: this.config.timeoutMs,
    };
  }

  /**
   * Execute visual grounding inference on screenshot via Hugging Face
   */
  public async infer(
    screenshot: ScreenshotInput,
    query?: string
  ): Promise<RawVisualPrediction[]> {
    this.validateScreenshot(screenshot);

    const userQuery = query?.trim() || 'Locate interactable UI elements on this screen.';
    const requestPayload = this.buildRequestPayload(screenshot, userQuery);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    let response: Response;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      response = await fetch(this.config.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ModelInferenceError(
          `Hugging Face inference request timed out after ${this.config.timeoutMs}ms`,
          { reason: 'INFERENCE_TIMEOUT', timeoutMs: this.config.timeoutMs }
        );
      }
      throw new ModelInferenceError(
        `Failed to reach Hugging Face inference endpoint at ${this.config.endpointUrl}: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { reason: 'NETWORK_FAILURE', endpoint: this.config.endpointUrl }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP errors fail-closed
    if (!response.ok) {
      await this.handleHttpError(response);
    }

    // Parse JSON response body
    let responseData: unknown;
    try {
      responseData = await response.json();
    } catch (err: unknown) {
      throw new ModelInferenceError(
        `Received malformed JSON from Hugging Face endpoint: ${
          err instanceof Error ? err.message : String(err)
        }`,
        { reason: 'MALFORMED_RESPONSE', statusCode: response.status }
      );
    }

    // Transform verified model response into RawVisualPrediction[]
    return this.parseModelResponse(responseData, screenshot);
  }

  /**
   * Release resources
   */
  public async release(): Promise<void> {
    // Stateless HTTP provider has no retained GPU/WASM buffers
  }

  /**
   * Builds the prompt and payload for Hugging Face inference.
   */
  private buildRequestPayload(
    screenshot: ScreenshotInput,
    query: string
  ): Record<string, unknown> {
    const dataUrl = `data:image/${screenshot.format};base64,${screenshot.data}`;

    // If endpoint is a chat completions endpoint (e.g. /v1/chat/completions)
    if (this.config.endpointUrl.includes('/v1/chat/completions')) {
      return {
        model: this.config.modelName,
        messages: [
          {
            role: 'system',
            content: this.config.systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: query },
              {
                type: 'image_url',
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        max_tokens: 128,
        temperature: 0.0,
      };
    }

    // Standard Hugging Face vision/inference API format
    return {
      inputs: {
        image: dataUrl,
        prompt: `${this.config.systemPrompt}\nInstruction: ${query}`,
      },
      parameters: {
        max_new_tokens: 128,
        temperature: 0.0,
      },
    };
  }

  /**
   * Handles non-2xx HTTP responses with typed fail-closed errors
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      // ignore
    }

    if (response.status === 401 || response.status === 403) {
      throw new ModelInferenceError(
        `Hugging Face authentication failure (${response.status}): Invalid or missing API key. ` +
          `Set HF_TOKEN or HUGGINGFACE_API_KEY environment variable. Body: ${errorBody.slice(0, 200)}`,
        { reason: 'AUTHENTICATION_FAILURE', statusCode: response.status, endpoint: this.config.endpointUrl }
      );
    }

    if (response.status === 404 || response.status === 503) {
      throw new ModelInferenceError(
        `Hugging Face model endpoint unavailable (${response.status}): Model may be loading or does not exist at ${this.config.endpointUrl}. Body: ${errorBody.slice(0, 200)}`,
        { reason: 'ENDPOINT_UNAVAILABLE', statusCode: response.status, endpoint: this.config.endpointUrl }
      );
    }

    throw new ModelInferenceError(
      `Hugging Face inference request failed with HTTP ${response.status}: ${errorBody.slice(0, 200)}`,
      { reason: 'HTTP_ERROR', statusCode: response.status, endpoint: this.config.endpointUrl }
    );
  }

  /**
   * Parses the real model response into RawVisualPrediction[]
   */
  public parseModelResponse(
    response: unknown,
    screenshot: ScreenshotInput
  ): RawVisualPrediction[] {
    if (response === null || response === undefined) {
      throw new ModelInferenceError('Model response is null or undefined', {
        reason: 'MALFORMED_RESPONSE',
      });
    }

    // Case 1: Array of visual prediction objects (direct grounding format)
    if (Array.isArray(response)) {
      // If array of predictions: [{ coordinates: [...], label: '...', score?: number }]
      if (response.length > 0 && typeof response[0] === 'object' && response[0] !== null) {
        const first = response[0] as Record<string, unknown>;
        if (first.coordinates !== undefined || first.box !== undefined || first.position !== undefined) {
          return response.map((item, idx) => this.validateAndNormalizePrediction(item, idx));
        }
        // If array of text generation items: [{ generated_text: "..." }]
        if (typeof first.generated_text === 'string') {
          return this.parseTextResponse(first.generated_text, screenshot);
        }
      }
      return [];
    }

    // Case 2: Chat completion response: { choices: [{ message: { content: "..." } }] }
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;

      if (Array.isArray(obj.choices) && obj.choices.length > 0) {
        const choice = obj.choices[0] as Record<string, unknown>;
        if (choice.message && typeof choice.message === 'object') {
          const msg = choice.message as Record<string, unknown>;
          if (typeof msg.content === 'string') {
            return this.parseTextResponse(msg.content, screenshot);
          }
        }
      }

      // Case 3: Object with generated_text property: { generated_text: "..." }
      if (typeof obj.generated_text === 'string') {
        return this.parseTextResponse(obj.generated_text, screenshot);
      }

      // Case 4: Object with predictions property: { predictions: [...] }
      if (Array.isArray(obj.predictions)) {
        return obj.predictions.map((item, idx) => this.validateAndNormalizePrediction(item, idx));
      }

      // Case 5: Object with output string or coordinates: { output: "..." } or { coordinates: [...] }
      if (typeof obj.output === 'string') {
        return this.parseTextResponse(obj.output, screenshot);
      }

      if (obj.coordinates !== undefined || obj.position !== undefined) {
        return [this.validateAndNormalizePrediction(obj, 0)];
      }
    }

    throw new ModelInferenceError('Unrecognized response format from visual grounding model', {
      reason: 'UNSUPPORTED_RESPONSE',
      responseType: typeof response,
    });
  }

  /**
   * Parses text response from ShowUI-2B / VLM models via CoordinateParser
   */
  private parseTextResponse(
    text: string,
    screenshot: ScreenshotInput
  ): RawVisualPrediction[] {
    const parser = new CoordinateParser({
      viewport: screenshot.viewport,
    });
    return parser.parseTextResponse(text);
  }

  /**
   * Validates and normalizes an individual raw prediction item
   */
  private validateAndNormalizePrediction(
    item: unknown,
    index: number
  ): RawVisualPrediction {
    if (typeof item !== 'object' || item === null) {
      throw new CoordinateParsingError(`Prediction at index ${index} is not a valid object`);
    }

    const obj = item as Record<string, unknown>;
    const rawCoords = obj.coordinates ?? obj.box ?? obj.position;

    if (!Array.isArray(rawCoords)) {
      throw new CoordinateParsingError(
        `Prediction at index ${index} missing coordinates array: ${JSON.stringify(item)}`
      );
    }

    if (rawCoords.length !== 2 && rawCoords.length !== 4) {
      throw new CoordinateParsingError(
        `Prediction at index ${index} invalid coordinates length (${rawCoords.length}). Expected 2 or 4 numbers.`
      );
    }

    // Validate that all coordinate values are finite numbers
    for (let i = 0; i < rawCoords.length; i++) {
      const val = rawCoords[i];
      if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
        throw new CoordinateParsingError(
          `Prediction at index ${index} has non-finite coordinate at index ${i}: ${val}`
        );
      }
    }

    const label = typeof obj.label === 'string' && obj.label ? obj.label : 'visual_element';
    const confidence =
      typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)
        ? obj.confidence
        : typeof obj.score === 'number' && Number.isFinite(obj.score)
        ? obj.score
        : 1.0;

    if (rawCoords.length === 4) {
      return {
        coordinates: [rawCoords[0], rawCoords[1], rawCoords[2], rawCoords[3]],
        label,
        confidence,
      };
    }

    return {
      coordinates: [rawCoords[0], rawCoords[1]],
      label,
      confidence,
    };
  }

  /**
   * Validates screenshot input (fail-closed)
   */
  public validateScreenshot(screenshot: ScreenshotInput): void {
    if (!screenshot) {
      throw new InvalidScreenshotError('Screenshot input is null or undefined');
    }
    if (screenshot.format !== 'png' && screenshot.format !== 'webp') {
      throw new InvalidScreenshotError(
        `Unsupported screenshot format: '${screenshot.format}'. Must be 'png' or 'webp'`
      );
    }
    if (typeof screenshot.data !== 'string' || screenshot.data.trim().length === 0) {
      throw new InvalidScreenshotError('Screenshot Base64 data string is empty or malformed');
    }
    const vp = screenshot.viewport;
    if (
      !vp ||
      typeof vp.width !== 'number' ||
      typeof vp.height !== 'number' ||
      typeof vp.dpr !== 'number' ||
      vp.width <= 0 ||
      vp.height <= 0 ||
      vp.dpr <= 0 ||
      !Number.isFinite(vp.width) ||
      !Number.isFinite(vp.height) ||
      !Number.isFinite(vp.dpr)
    ) {
      throw new InvalidScreenshotError('Screenshot viewport metadata is invalid or non-positive', vp);
    }
  }
}
