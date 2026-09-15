/**
 * M03: Local Visual Perception — ShowUI-2B Model Adapter
 * Author: AI003 (Visual Perception Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md, DECISIONS.md (ADR 005)
 */

import { CoordinateParser } from './coordinateParser';
import { HuggingFaceProvider } from './huggingFaceProvider';
import { LocalONNXProvider } from './localONNXProvider';
import {
  BackendAllocationError,
  BackendStatus,
  ExecutionBackend,
  GGUFModelSource,
  InvalidScreenshotError,
  ModelInferenceError,
  ONNXInferenceSession,
  ONNXSessionProvider,
  RawVisualPrediction,
  ScreenshotInput,
  SHOWUI_GROUNDING_SYSTEM_PROMPT,
  ShowUIConfig,
  VisualElement,
  VisualEvidence,
  VisualInferenceProvider,
} from './types';

export const DEFAULT_MODEL_PATH = 'models/showui-2b.onnx';
export const DEFAULT_GGUF_MODEL_URL =
  'https://huggingface.co/localattention/ShowUI-2B-Q4_K_M-GGUF/resolve/main/showui-2b-q4_k_m.gguf';
export const DEFAULT_GGUF_MMPROJ_URL =
  'https://huggingface.co/ggml-org/Qwen2-VL-2B-Instruct-GGUF/resolve/main/mmproj-Qwen2-VL-2B-Instruct-Q8_0.gguf';
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.25;
export const DEFAULT_POINT_TARGET_SIZE = 32;

export interface ResolvedShowUIConfig {
  modelFormat: 'onnx' | 'gguf' | 'hosted-hf';
  modelPath: string;
  ggufSource: GGUFModelSource;
  preferredBackend: ExecutionBackend;
  fallbackBackends: ExecutionBackend[];
  confidenceThreshold: number;
  defaultPointTargetSize: number;
  systemPrompt: string;
}

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
 * ShowUI-2B Adapter for Visual Grounding
 * Supports:
 * - Current Prototype: HuggingFaceProvider (hosted inference)
 * - Future Architecture: LocalONNXProvider (ShowUI-2B ONNX WebGPU)
 */
export class ShowUIAdapter {
  private readonly config: ResolvedShowUIConfig;
  private readonly provider: VisualInferenceProvider;
  private readonly sessionProvider?: ONNXSessionProvider;
  private backendStatus: BackendStatus;
  private session: ONNXInferenceSession | null = null;
  private isInitialized = false;

  constructor(
    config?: ShowUIConfig,
    providerOrSessionProvider?: VisualInferenceProvider | ONNXSessionProvider
  ) {
    this.config = {
      modelFormat: config?.modelFormat ?? 'hosted-hf',
      modelPath: config?.modelPath ?? DEFAULT_MODEL_PATH,
      ggufSource: config?.ggufSource ?? {
        modelUrl: DEFAULT_GGUF_MODEL_URL,
        mmprojUrl: DEFAULT_GGUF_MMPROJ_URL,
      },
      preferredBackend: config?.preferredBackend ?? 'webgpu',
      fallbackBackends: config?.fallbackBackends ?? ['wasm', 'cpu'],
      confidenceThreshold: config?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      defaultPointTargetSize: config?.defaultPointTargetSize ?? DEFAULT_POINT_TARGET_SIZE,
      systemPrompt: config?.systemPrompt ?? SHOWUI_GROUNDING_SYSTEM_PROMPT,
    };

    // Determine whether an ONNXSessionProvider or VisualInferenceProvider was supplied
    if (providerOrSessionProvider && 'createSession' in providerOrSessionProvider) {
      this.sessionProvider = providerOrSessionProvider;
      this.provider = new LocalONNXProvider({
        modelPath: this.config.modelPath,
        preferredBackend: this.config.preferredBackend,
        fallbackBackends: this.config.fallbackBackends,
      });
    } else if (providerOrSessionProvider && 'infer' in providerOrSessionProvider) {
      this.provider = providerOrSessionProvider;
    } else if (config?.provider) {
      this.provider = config.provider;
    } else if (config?.modelFormat === 'onnx') {
      this.sessionProvider = new DefaultONNXSessionProvider();
      this.provider = new LocalONNXProvider({
        modelPath: this.config.modelPath,
        preferredBackend: this.config.preferredBackend,
        fallbackBackends: this.config.fallbackBackends,
      });
    } else {
      // Default prototype backend: HuggingFaceProvider
      this.provider = new HuggingFaceProvider(config?.huggingFaceConfig);
    }

    this.backendStatus = config?.backendStatus ?? {
      activeBackend:
        this.provider.providerId === 'HuggingFaceHosted'
          ? 'hosted-huggingface'
          : this.config.preferredBackend,
      isWebGPUSupported: true,
      isFallbackActive: false,
      providerId: this.provider.providerId,
    };
  }

  /**
   * Retrieves the active VisualInferenceProvider
   */
  public getProvider(): VisualInferenceProvider {
    return this.provider;
  }

  /**
   * Initializes the inference session or verifies provider availability
   */
  public async initialize(): Promise<void> {
    if (this.sessionProvider) {
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
            isWebGPUSupported:
              backend === 'webgpu' || (await this.sessionProvider.isBackendSupported('webgpu')),
            isFallbackActive: isFallback,
            providerId: 'ONNXSessionProvider',
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

    const available = await this.provider.isAvailable();
    if (!available) {
      throw new BackendAllocationError(
        `Visual inference provider '${this.provider.providerId}' is not available.`
      );
    }
    this.isInitialized = true;
  }

  /**
   * Returns current backend runtime state
   */
  public getBackendStatus(): BackendStatus {
    return { ...this.backendStatus, providerId: this.provider.providerId };
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
  public async executeGrounding(screenshot: ScreenshotInput, query?: string): Promise<VisualEvidence> {
    // 1. Strict Input Validation (Fail-closed)
    this.validateScreenshot(screenshot);

    let rawPredictions: RawVisualPrediction[];

    if (this.sessionProvider) {
      // 2. Ensure Session is Initialized for legacy session provider tests
      if (!this.isInitialized || !this.session) {
        await this.initialize();
      }
      rawPredictions = await this.runInference(screenshot);
    } else {
      // Use clean VisualInferenceProvider abstraction
      rawPredictions = await this.provider.infer(screenshot, query);
    }

    // 3. Prepare Coordinate Parser with target Viewport
    const parser = new CoordinateParser({
      viewport: screenshot.viewport,
      defaultPointSize: this.config.defaultPointTargetSize,
    });

    // 4. Postprocess predictions into strict VisualEvidence format
    const elements: VisualElement[] = [];

    for (const pred of rawPredictions) {
      try {
        const bbox = parser.parsePredictionToBoundingBox(pred);

        // Discard invalid/zero-area bounding boxes
        if (bbox.width <= 0 || bbox.height <= 0) {
          continue;
        }

        // Validate finite coordinates
        if (
          !Number.isFinite(bbox.x) ||
          !Number.isFinite(bbox.y) ||
          !Number.isFinite(bbox.width) ||
          !Number.isFinite(bbox.height)
        ) {
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

    // 5. Return strictly typed VisualEvidence conforming to INTERFACES.md
    return {
      source: 'ShowUI-2B',
      elements,
    };
  }

  /**
   * Low-level inference execution for session provider
   */
  private async runInference(screenshot: ScreenshotInput): Promise<RawVisualPrediction[]> {
    if (!this.session) {
      throw new ModelInferenceError('Inference session is not active');
    }

    try {
      const feeds = {
        screenshot_data: screenshot.data,
        viewport_width: screenshot.viewport.width,
        viewport_height: screenshot.viewport.height,
      };

      const results = await this.session.run(feeds);
      if (Array.isArray(results.predictions)) {
        return results.predictions as RawVisualPrediction[];
      }
      if (typeof results.output_text === 'string') {
        const parser = new CoordinateParser({
          viewport: screenshot.viewport,
          defaultPointSize: this.config.defaultPointTargetSize,
        });
        return parser.parseTextResponse(results.output_text);
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
   * Release session and provider resources
   */
  public async release(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    if (this.provider.release) {
      await this.provider.release();
    }
    this.isInitialized = false;
  }
}
