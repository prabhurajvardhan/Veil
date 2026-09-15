/**
 * M03: Local Visual Perception — Visual Perception Manager
 * Author: AI003 (Visual Perception Engineer)
 * Authority: MODULES.md (§M03), INTERFACES.md (§2), docs/system-design/SYSTEM-DESIGN.md (§2 M03)
 */

import { ShowUIAdapter } from './modelAdapter';
import {
  BackendStatus,
  ONNXSessionProvider,
  ScreenshotInput,
  ShowUIConfig,
  VisualEvidence,
} from './types';

/**
 * VisualPerceptionManager acts as the primary coordinator for M03 capabilities.
 * It encapsulates the ShowUI-2B model adapter, backend provider management,
 * and fail-closed validation.
 */
export class VisualPerceptionManager {
  private readonly adapter: ShowUIAdapter;

  constructor(config?: ShowUIConfig, sessionProvider?: ONNXSessionProvider) {
    this.adapter = new ShowUIAdapter(config, sessionProvider);
  }

  /**
   * Initializes the visual perception engine and prewarms execution provider
   */
  public async initialize(): Promise<void> {
    await this.adapter.initialize();
  }

  /**
   * Primary entrypoint: Process a raw screenshot to generate VisualEvidence
   * conforming strictly to INTERFACES.md.
   */
  public async processScreenshot(screenshot: ScreenshotInput): Promise<VisualEvidence> {
    return this.adapter.executeGrounding(screenshot);
  }

  /**
   * Retrieve current backend status (WebGPU active vs fallback active)
   */
  public getBackendStatus(): BackendStatus {
    return this.adapter.getBackendStatus();
  }

  /**
   * Release resources
   */
  public async dispose(): Promise<void> {
    await this.adapter.release();
  }
}
