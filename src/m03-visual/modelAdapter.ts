/**
 * M03: Local Visual Perception — ShowUI-2B Model Adapter
 * Author: AI003 (Visual Perception Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, DECISIONS.md (ADR 005)
 */

import { CoordinateParser } from './coordinateParser';
import {
  BackendAllocationError,
  BackendStatus,
  ExecutionBackend,
  InvalidScreenshotError,
  ModelInferenceError,
  ONNXInferenceSession,
  ONNXSessionProvider,
  RawVisualPrediction,
  ScreenshotInput,
  ShowUIConfig,
  VisualElement,
  VisualEvidence,
} from './types';

export const DEFAULT_MODEL_PATH = 'models/showui-2b.onnx';
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.25;
export const DEFAULT_POINT_TARGET_SIZE = 32;

/**
 * Default session provider using WebGPU with WASM/CPU fallbacks
 */
export class DefaultONNXSessionProvider implements ONNXSessionProvider {
  private webGPUSupported: boolean | null = null;

  async isBackendSupported(backend: ExecutionBackend): Promise<boolean> {
    if (backend === 'webgpu') {
      if (this.webGPUSupported !== null) {
        return this.webGPUSupported;
      }
      try {
        // Check navigator.gpu availability in Offscreen Document context
        const nav = typeof navigator !== 'undefined' ? (navigator as { gpu?: { requestAdapter: () => Promise<unknown> } }) : undefined;
        if (nav && nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
          const adapter = await nav.gpu.requestAdapter();
          this.webGPUSupported = adapter !== null && adapter !== undefined;
        } else {
          this.webGPUSupported = false;
        }
      } catch {
        this.webGPUSupported = false;
      }
      return this.webGPUSupported;
    }
    // wasm and cpu are supported in browser offscreen/worker environments
    return true;
  }

  async createSession(modelPath: string, backend: ExecutionBackend): Promise<ONNXInferenceSession> {
    const isSupported = await this.isBackendSupported(backend);
    if (!isSupported && backend === 'webgpu') {
      throw new BackendAllocationError(
        `WebGPU is not supported on this platform. Allocation failed for ${modelPath}`
      );
    }

    // In accordance with Zero-Guessing Rule (AI003.md §19, §20) and T005 specifications,
    // do not fabricate a fake session or mock predictions. If real ONNX model weights or
    // ONNX Runtime Web library are missing, fail closed with a descriptive error.
    throw new BackendAllocationError(
      `ShowUI-2B model artifact or ONNX Runtime Web engine is not available at '${modelPath}'. ` +
        `Real local inference cannot be initialized until ShowUI-2B ONNX model weights and onnxruntime-web runtime are provisioned.`,
      { modelPath, backend }
    );
  }
}

/**
 * ShowUI-2B Adapter for Local Visual Grounding
 */
export class ShowUIAdapter {
  private readonly config: Required<Omit<ShowUIConfig, 'backendStatus'>>;
  private readonly sessionProvider: ONNXSessionProvider;
  private backendStatus: BackendStatus;
  private session: ONNXInferenceSession | null = null;
  private isInitialized = false;

  constructor(
    config?: ShowUIConfig,
    sessionProvider?: ONNXSessionProvider
  ) {
    this.sessionProvider = sessionProvider ?? new DefaultONNXSessionProvider();
    this.config = {
      modelPath: config?.modelPath ?? DEFAULT_MODEL_PATH,
      preferredBackend: config?.preferredBackend ?? 'webgpu',
      fallbackBackends: config?.fallbackBackends ?? ['wasm', 'cpu'],
      confidenceThreshold: config?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      defaultPointTargetSize: config?.defaultPointTargetSize ?? DEFAULT_POINT_TARGET_SIZE,
    };

    this.backendStatus = config?.backendStatus ?? {
      activeBackend: this.config.preferredBackend,
      isWebGPUSupported: true,
      isFallbackActive: false,
    };
  }

  /**
   * Initializes the ONNX inference session with automatic failover
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized && this.session) {
      return;
    }

    const backendsToTry: ExecutionBackend[] = [
      this.config.preferredBackend,
      ...this.config.fallbackBackends.filter((b) => b !== this.config.preferredBackend),
    ];

    let lastError: Error | null = null;

    for (const backend of backendsToTry) {
      try {
        const supported = await this.sessionProvider.isBackendSupported(backend);
        if (!supported) {
          continue;
        }

        this.session = await this.sessionProvider.createSession(this.config.modelPath, backend);
        const isFallback = backend !== this.config.preferredBackend;

        this.backendStatus = {
          activeBackend: backend,
          isWebGPUSupported: backend === 'webgpu' || (await this.sessionProvider.isBackendSupported('webgpu')),
          isFallbackActive: isFallback,
        };

        this.isInitialized = true;
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
      }
    }

    throw new BackendAllocationError(
      `All execution backends failed to allocate for ShowUI-2B: ${lastError?.message ?? 'Unknown error'}`,
      { backendsTried: backendsToTry, lastError }
    );
  }

  /**
   * Returns current backend runtime state
   */
  public getBackendStatus(): BackendStatus {
    return { ...this.backendStatus };
  }

  /**
   * Validate screenshot payload strictly against INTERFACES.md specifications
   */
  public validateScreenshot(screenshot: ScreenshotInput): void {
    if (!screenshot) {
      throw new InvalidScreenshotError('Screenshot payload is missing or undefined');
    }

    if (screenshot.format !== 'png' && screenshot.format !== 'webp') {
      throw new InvalidScreenshotError(
        `Unsupported screenshot format: expected 'png' or 'webp', got '${String(screenshot.format)}'`
      );
    }

    if (typeof screenshot.data !== 'string' || screenshot.data.trim().length === 0) {
      throw new InvalidScreenshotError('Screenshot data must be a non-empty Base64 encoded string');
    }

    if (
      !screenshot.viewport ||
      typeof screenshot.viewport.width !== 'number' ||
      typeof screenshot.viewport.height !== 'number' ||
      typeof screenshot.viewport.dpr !== 'number' ||
      screenshot.viewport.width <= 0 ||
      screenshot.viewport.height <= 0 ||
      screenshot.viewport.dpr <= 0
    ) {
      throw new InvalidScreenshotError('Invalid viewport metadata: dimensions and dpr must be positive numbers', {
        viewport: screenshot.viewport,
      });
    }
  }

  /**
   * Execute visual grounding on the screenshot to detect UI interactables and bounding boxes
   */
  public async executeGrounding(screenshot: ScreenshotInput): Promise<VisualEvidence> {
    // 1. Strict Input Validation (Fail-closed)
    this.validateScreenshot(screenshot);

    // 2. Ensure Session is Initialized
    if (!this.isInitialized || !this.session) {
      await this.initialize();
    }

    // 3. Prepare Coordinate Parser with target Viewport
    const parser = new CoordinateParser({
      viewport: screenshot.viewport,
      defaultPointSize: this.config.defaultPointTargetSize,
    });

    // 4. Run Model Inference
    const rawPredictions = await this.runInference(screenshot);

    // 5. Postprocess predictions into strict VisualEvidence format
    const elements: VisualElement[] = [];

    for (const pred of rawPredictions) {
      try {
        const bbox = parser.parsePredictionToBoundingBox(pred);

        // Discard invalid/zero-area bounding boxes
        if (bbox.width <= 0 || bbox.height <= 0) {
          continue;
        }

        // Preserve authentic model confidence score without ungrounded scaling
        const confidence = Math.min(1.0, Math.max(0.0, pred.confidence));

        if (confidence >= this.config.confidenceThreshold) {
          elements.push({
            bbox,
            label: pred.label || 'visual_element',
            confidence: Number(confidence.toFixed(3)),
          });
        }
      } catch {
        // Skip individual malformed predictions while preserving valid ones
        continue;
      }
    }

    // 6. Return strictly typed VisualEvidence conforming to INTERFACES.md
    return {
      source: 'ShowUI-2B',
      elements,
    };
  }

  /**
   * Low-level inference execution on screenshot buffer
   */
  private async runInference(screenshot: ScreenshotInput): Promise<RawVisualPrediction[]> {
    if (!this.session) {
      throw new ModelInferenceError('Inference session is not active');
    }

    try {
      // Execute inference via session
      const feeds = {
        screenshot_data: screenshot.data,
        viewport_width: screenshot.viewport.width,
        viewport_height: screenshot.viewport.height,
      };

      const results = await this.session.run(feeds);
      if (Array.isArray(results.predictions)) {
        return results.predictions as RawVisualPrediction[];
      }
      return [];
    } catch (err) {
      throw new ModelInferenceError(
        `ShowUI-2B model inference execution failed: ${err instanceof Error ? err.message : String(err)}`,
        { details: err }
      );
    }
  }

  /**
   * Release session and GPU/memory resources
   */
  public async release(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.isInitialized = false;
  }
}
