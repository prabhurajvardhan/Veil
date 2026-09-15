/**
 * M03: Local Visual Perception — Type Definitions
 * Author: AI003 (Visual Perception Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, DECISIONS.md (ADR 005)
 */

/**
 * Viewport dimensions and Device Pixel Ratio from RawObservation.screenshot
 */
export interface ViewportMetadata {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Screenshot data conforming strictly to INTERFACES.md RawObservation.screenshot
 */
export interface ScreenshotInput {
  format: 'png' | 'webp';
  data: string; // Base64 encoded image string
  viewport: ViewportMetadata;
}

/**
 * Strict BoundingBox conforming to INTERFACES.md
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Visual element detected by visual grounding model
 */
export interface VisualElement {
  bbox: BoundingBox;
  label: string;
  confidence: number; // 0.0 to 1.0
}

/**
 * VisualEvidence record conforming strictly to INTERFACES.md
 */
export interface VisualEvidence {
  source: 'ShowUI-2B';
  elements: VisualElement[];
}

/**
 * Supported execution backends for local ONNX Runtime Web / WebGPU inference
 */
export type ExecutionBackend = 'webgpu' | 'wasm' | 'cpu' | 'hosted-huggingface';

/**
 * Status of the visual grounding engine backend
 */
export interface BackendStatus {
  activeBackend: ExecutionBackend;
  isWebGPUSupported: boolean;
  isFallbackActive: boolean;
  providerId?: string;
  endpointUrl?: string;
}

/**
 * Generic Visual Inference Provider abstraction for T005.
 * Enables clean separation between:
 * - CURRENT PROTOTYPE: HuggingFaceProvider (hosted inference)
 * - FUTURE POST-HACKATHON: LocalONNXProvider (ShowUI-2B ONNX Runtime Web / WebGPU)
 */
export interface VisualInferenceProvider {
  readonly providerId: string;
  isAvailable(): Promise<boolean>;
  infer(screenshot: ScreenshotInput, query?: string): Promise<RawVisualPrediction[]>;
  release?(): Promise<void>;
}

/**
 * Configuration for Hugging Face Hosted Inference Provider
 */
export interface HuggingFaceProviderConfig {
  /**
   * API Key for Hugging Face (optional if public or space proxy, required for router API)
   */
  apiKey?: string;
  /**
   * Hosted model inference endpoint URL
   * Defaults to https://router.huggingface.co/hf-inference/models/showlab/ShowUI-2B
   */
  endpointUrl?: string;
  /**
   * Model repository name
   * Defaults to showlab/ShowUI-2B
   */
  modelName?: string;
  /**
   * Request timeout in milliseconds (default: 30000)
   */
  timeoutMs?: number;
  /**
   * System prompt / prompt template to use for grounding
   */
  systemPrompt?: string;
}

/**
 * Configuration for Local ONNX Provider (Future Architecture)
 */
export interface LocalONNXProviderConfig {
  modelPath?: string;
  preferredBackend?: ExecutionBackend;
  fallbackBackends?: ExecutionBackend[];
}

/**
 * Raw predicted element format from ShowUI-2B model
 */
export interface RawVisualPrediction {
  /**
   * Normalized coordinates. Can be in [0, 1] range or [0, 1000] scale (ShowUI standard)
   */
  coordinates: [number, number, number, number] | [number, number]; // [ymin, xmin, ymax, xmax] or [x, y]
  coordinateScale?: 'unit' | 'thousand'; // unit = [0, 1], thousand = [0, 1000]
  label: string;
  confidence: number;
}

/**
 * GGUF Model source artifacts for local Wllama/WASM/WebGPU inference
 */
export interface GGUFModelSource {
  modelUrl: string; // e.g., localattention/ShowUI-2B-Q4_K_M-GGUF/resolve/main/showui-2b-q4_k_m.gguf
  mmprojUrl: string; // e.g., ggml-org/Qwen2-VL-2B-Instruct-GGUF/resolve/main/mmproj-Qwen2-VL-2B-Instruct-Q8_0.gguf
}

/**
 * Standard ShowUI-2B system prompts conforming to showlab/ShowUI-2B
 */
export const SHOWUI_GROUNDING_SYSTEM_PROMPT =
  'Based on the screenshot of the page, I give a text description and you give its corresponding location. ' +
  'The coordinate represents a clickable location [x, y] for an element, which is a relative coordinate on the screenshot, scaled from 0 to 1.';

export const SHOWUI_NAVIGATION_SYSTEM_PROMPT =
  'You are an assistant trained to navigate the web screen. Given a task instruction, a screen observation, and an action history sequence, ' +
  "output the next action and wait for the next observation. Format the action as a dictionary with keys: {'action': 'ACTION_TYPE', 'value': 'element', 'position': [x,y]}. " +
  'Position represents relative coordinates scaled from 0 to 1.';

/**
 * Options for configuring ShowUI-2B visual grounding adapter
 */
export interface ShowUIConfig {
  provider?: VisualInferenceProvider;
  huggingFaceConfig?: HuggingFaceProviderConfig;
  modelFormat?: 'onnx' | 'gguf' | 'hosted-hf';
  modelPath?: string;
  ggufSource?: GGUFModelSource;
  preferredBackend?: ExecutionBackend;
  fallbackBackends?: ExecutionBackend[];
  confidenceThreshold?: number; // Minimum confidence to accept (default: 0.25)
  defaultPointTargetSize?: number; // Pixel width/height if model returns a single point (default: 32)
  systemPrompt?: string;
  backendStatus?: BackendStatus;
}

/**
 * Interface abstraction for ONNX Runtime Web InferenceSession
 */
export interface ONNXInferenceSession {
  run(inputs: Record<string, unknown>): Promise<Record<string, unknown>>;
  release(): Promise<void>;
}

/**
 * Provider interface for initializing ONNX Runtime sessions across backends
 */
export interface ONNXSessionProvider {
  createSession(modelPath: string, backend: ExecutionBackend): Promise<ONNXInferenceSession>;
  isBackendSupported(backend: ExecutionBackend): Promise<boolean>;
}

/**
 * Chrome Offscreen Document message protocol for M03
 */
export interface OffscreenVisualGroundingRequest {
  type: 'EXECUTE_VISUAL_GROUNDING';
  payload: {
    screenshot: ScreenshotInput;
    query?: string;
    config?: Partial<ShowUIConfig>;
  };
}

export interface OffscreenVisualGroundingResponse {
  type: 'VISUAL_GROUNDING_RESULT';
  success: boolean;
  evidence?: VisualEvidence;
  backendStatus?: BackendStatus;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Error hierarchy for M03: Local Visual Perception
 */
export class VisualPerceptionError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(`[M03:VisualPerception] ${code}: ${message}`);
    this.name = 'VisualPerceptionError';
  }
}

export class InvalidScreenshotError extends VisualPerceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'INVALID_SCREENSHOT_ERROR', details);
    this.name = 'InvalidScreenshotError';
  }
}

export class BackendAllocationError extends VisualPerceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'BACKEND_ALLOCATION_ERROR', details);
    this.name = 'BackendAllocationError';
  }
}

export class ModelInferenceError extends VisualPerceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'MODEL_INFERENCE_ERROR', details);
    this.name = 'ModelInferenceError';
  }
}

export class CoordinateParsingError extends VisualPerceptionError {
  constructor(message: string, details?: unknown) {
    super(message, 'COORDINATE_PARSING_ERROR', details);
    this.name = 'CoordinateParsingError';
  }
}
