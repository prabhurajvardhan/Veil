/**
 * M02: Observation Manager — Screenshot Capture Implementation
 * Author: AI002 (Browser Observation Engineer)
 * Authority: docs/tasks/T003.md, INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md, ADR 002
 */

import { CDPSession } from './cdpSession';
import {
  CDPLayoutMetrics,
  ScreenshotCaptureError,
  ScreenshotCaptureOptions,
  ScreenshotData,
  ScreenshotFormat,
  ViewportMetadata,
} from './types';

export const DEFAULT_SCREENSHOT_FORMAT: ScreenshotFormat = 'png';

/**
 * Retrieves high-fidelity viewport dimensions and Device Pixel Ratio (DPR)
 * from the browser page context via CDP commands.
 */
export async function getViewportMetadata(cdpSession: CDPSession): Promise<ViewportMetadata> {
  let width = 0;
  let height = 0;
  let dpr = 1;

  // 1. Query Page.getLayoutMetrics for layout and visual viewport dimensions
  try {
    const layoutMetrics = await cdpSession.sendCommand<CDPLayoutMetrics>('Page.getLayoutMetrics');
    if (layoutMetrics.visualViewport && layoutMetrics.visualViewport.clientWidth > 0) {
      width = Math.round(layoutMetrics.visualViewport.clientWidth);
      height = Math.round(layoutMetrics.visualViewport.clientHeight);
    } else if (layoutMetrics.layoutViewport && layoutMetrics.layoutViewport.clientWidth > 0) {
      width = Math.round(layoutMetrics.layoutViewport.clientWidth);
      height = Math.round(layoutMetrics.layoutViewport.clientHeight);
    } else if (layoutMetrics.cssLayoutViewport && layoutMetrics.cssLayoutViewport.clientWidth > 0) {
      width = Math.round(layoutMetrics.cssLayoutViewport.clientWidth);
      height = Math.round(layoutMetrics.cssLayoutViewport.clientHeight);
    }
  } catch (err: unknown) {
    // If Page.getLayoutMetrics fails, proceed to runtime evaluation fallback
  }

  // 2. Query Runtime.evaluate to get window.innerWidth, window.innerHeight, and window.devicePixelRatio
  try {
    const evaluateResult = await cdpSession.sendCommand<{
      result?: { value?: { width?: number; height?: number; dpr?: number } };
    }>('Runtime.evaluate', {
      expression: '({ width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 })',
      returnByValue: true,
    });

    const val = evaluateResult?.result?.value;
    if (val) {
      if (width <= 0 && typeof val.width === 'number' && val.width > 0) {
        width = Math.round(val.width);
      }
      if (height <= 0 && typeof val.height === 'number' && val.height > 0) {
        height = Math.round(val.height);
      }
      if (typeof val.dpr === 'number' && val.dpr > 0) {
        dpr = Number(val.dpr.toFixed(2));
      }
    }
  } catch (err: unknown) {
    // Evaluation might fail if page is privileged or loading; retain extracted dimensions or fallback
  }

  // Fail closed if viewport could not be determined
  if (width <= 0 || height <= 0) {
    throw new ScreenshotCaptureError(
      `Failed to determine valid viewport dimensions (width: ${width}, height: ${height}).`
    );
  }

  return {
    width,
    height,
    dpr: dpr > 0 ? dpr : 1,
  };
}

/**
 * Captures raw visual screenshot of the target tab via CDP Page.captureScreenshot
 * strictly adhering to the contract defined in INTERFACES.md.
 */
export async function captureScreenshot(
  cdpSession: CDPSession,
  options?: ScreenshotCaptureOptions
): Promise<ScreenshotData> {
  if (!cdpSession || !cdpSession.isAttached()) {
    throw new ScreenshotCaptureError('Cannot capture screenshot: CDP session is not attached.');
  }

  const format: ScreenshotFormat = options?.format === 'webp' ? 'webp' : 'png';

  try {
    // 1. Enable Page domain to ensure Page events and capture commands operate
    try {
      await cdpSession.sendCommand('Page.enable');
    } catch {
      // Domain might already be enabled; continue
    }

    // 2. Concurrently or sequentially extract exact viewport metadata
    const viewport = await getViewportMetadata(cdpSession);

    // 3. Prepare parameters for Page.captureScreenshot
    const captureParams: Record<string, unknown> = {
      format,
    };

    if (format === 'webp' && typeof options?.quality === 'number') {
      captureParams.quality = Math.max(0, Math.min(100, Math.round(options.quality)));
    }

    if (typeof options?.fromSurface === 'boolean') {
      captureParams.fromSurface = options.fromSurface;
    }

    if (typeof options?.captureBeyondViewport === 'boolean') {
      captureParams.captureBeyondViewport = options.captureBeyondViewport;
    }

    if (options?.clip) {
      captureParams.clip = options.clip;
    }

    // 4. Invoke CDP Page.captureScreenshot
    const result = await cdpSession.sendCommand<{ data?: string }>('Page.captureScreenshot', captureParams);

    if (!result || typeof result.data !== 'string' || result.data.length === 0) {
      throw new ScreenshotCaptureError('CDP Page.captureScreenshot returned empty or invalid data payload.');
    }

    // Return immutable screenshot payload matching RawObservation.screenshot
    return {
      format,
      data: result.data,
      viewport,
    };
  } catch (err: unknown) {
    if (err instanceof ScreenshotCaptureError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    throw new ScreenshotCaptureError(`Failed to capture screenshot via CDP: ${message}`, err);
  }
}
