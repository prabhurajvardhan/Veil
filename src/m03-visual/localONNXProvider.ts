/**
 * M03: Local Visual Perception — Local ONNX Provider (Future Architecture)
 * Author: AI003 (Visual Perception Engineer)
 *
 * FUTURE / POST-HACKATHON BACKEND:
 * ShowUI-2B → ONNX → ONNX Runtime Web → WebGPU.
 *
 * Per architectural mandate (DECISION / ADR 005 and T005):
 * This provider represents the frozen destination architecture.
 * It does NOT fabricate local inference. When ONNX weights or WebGPU runtime
 * are not provisioned in the current environment, it fails closed.
 */

import {
  BackendAllocationError,
  LocalONNXProviderConfig,
  RawVisualPrediction,
  ScreenshotInput,
  VisualInferenceProvider,
} from './types';

export class LocalONNXProvider implements VisualInferenceProvider {
  public readonly providerId = 'LocalONNXWebGPU';
  private readonly config: LocalONNXProviderConfig;
  private sessionInitialized = false;

  constructor(config?: LocalONNXProviderConfig) {
    this.config = config ?? {};
  }

  /**
   * Check if local ONNX session / WebGPU is available
   */
  public async isAvailable(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as unknown as { gpu: unknown }).gpu) {
      return this.sessionInitialized;
    }
    return false;
  }

  /**
   * Execute inference via local ONNX runtime
   */
  public async infer(
    _screenshot: ScreenshotInput,
    _query?: string
  ): Promise<RawVisualPrediction[]> {
    if (!this.sessionInitialized) {
      throw new BackendAllocationError(
        'Local ONNX Runtime Web session is not initialized. ' +
          'Model weights (ShowUI-2B ONNX) are not provisioned for local execution in this environment. ' +
          'Use HuggingFaceProvider for prototype inference.'
      );
    }
    throw new BackendAllocationError('Local ONNX execution not provisioned');
  }

  /**
   * Release session resources
   */
  public async release(): Promise<void> {
    this.sessionInitialized = false;
  }
}
