/**
 * M03: Local Visual Perception — Offscreen Document Message Protocol Handler
 * Author: AI003 (Visual Perception Engineer)
 * Authority: MODULES.md (§M03), docs/system-design/SYSTEM-DESIGN.md (§1, §2)
 */

import { ShowUIAdapter } from './modelAdapter';
import {
  OffscreenVisualGroundingRequest,
  OffscreenVisualGroundingResponse,
  VisualPerceptionError,
} from './types';

/**
 * Handle incoming visual grounding requests dispatched to the Offscreen Document
 */
export async function handleOffscreenGroundingRequest(
  request: unknown,
  adapter: ShowUIAdapter
): Promise<OffscreenVisualGroundingResponse> {
  if (!isOffscreenVisualGroundingRequest(request)) {
    return {
      type: 'VISUAL_GROUNDING_RESULT',
      success: false,
      error: {
        code: 'INVALID_REQUEST_FORMAT',
        message: 'Message does not conform to OffscreenVisualGroundingRequest schema',
      },
    };
  }

  try {
    const evidence = await adapter.executeGrounding(
      request.payload.screenshot,
      request.payload.query
    );
    const backendStatus = adapter.getBackendStatus();

    return {
      type: 'VISUAL_GROUNDING_RESULT',
      success: true,
      evidence,
      backendStatus,
    };
  } catch (err) {
    const isPerceptionError = err instanceof VisualPerceptionError;
    return {
      type: 'VISUAL_GROUNDING_RESULT',
      success: false,
      backendStatus: adapter.getBackendStatus(),
      error: {
        code: isPerceptionError ? err.code : 'UNEXPECTED_VISUAL_ERROR',
        message: err instanceof Error ? err.message : String(err),
        details: isPerceptionError ? err.details : undefined,
      },
    };
  }
}

/**
 * Type guard for offscreen grounding request
 */
export function isOffscreenVisualGroundingRequest(
  msg: unknown
): msg is OffscreenVisualGroundingRequest {
  if (typeof msg !== 'object' || msg === null) {
    return false;
  }
  const candidate = msg as Record<string, unknown>;
  if (candidate.type !== 'EXECUTE_VISUAL_GROUNDING') {
    return false;
  }
  if (typeof candidate.payload !== 'object' || candidate.payload === null) {
    return false;
  }
  const payload = candidate.payload as Record<string, unknown>;
  return typeof payload.screenshot === 'object' && payload.screenshot !== null;
}

/**
 * Registers message listener in Chrome Extension Offscreen Document context
 */
export function registerOffscreenVisualGroundingListener(
  adapter: ShowUIAdapter = new ShowUIAdapter()
): () => void {
  const chromeRuntime = typeof chrome !== 'undefined' ? chrome.runtime : undefined;
  if (!chromeRuntime || !chromeRuntime.onMessage) {
    // In test or non-extension environment, return no-op cleanup
    return () => {};
  }

  const listener = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: OffscreenVisualGroundingResponse) => void
  ): boolean => {
    if (isOffscreenVisualGroundingRequest(message)) {
      handleOffscreenGroundingRequest(message, adapter).then((res) => {
        sendResponse(res);
      });
      return true; // Keep message channel open for async response
    }
    return false;
  };

  chromeRuntime.onMessage.addListener(listener);

  return () => {
    chromeRuntime.onMessage.removeListener(listener);
  };
}
