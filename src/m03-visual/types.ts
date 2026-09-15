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
export type ExecutionBackend = 'webgpu' | 'wasm' | 'cpu';

/**
 * Status of the visual grounding engine backend
 */
export interface BackendStatus {
  activeBackend: ExecutionBackend;
  isWebGPUSupported: boolean;
  isFallbackActive: boolean;
  degradedConfidenceFactor: number; // 1.0 for WebGPU, 0.8 for WASM/CPU fallback
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
 * Options for configuring ShowUI-2B visual grounding adapter
 */
export interface ShowUIConfig {
  modelPath?: string;
  preferredBackend?: ExecutionBackend;
  fallbackBackends?: ExecutionBackend[];
  confidenceThreshold?: number; // Minimum confidence to accept (default: 0.25)
  defaultPointTargetSize?: number; // Pixel width/height if model returns a single point (default: 32)
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
