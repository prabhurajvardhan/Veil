/**
 * M02: Observation Manager — Type Definitions
 * Author: AI002 (Browser Observation Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 */

/**
 * Supported image formats for raw visual capture
 */
export type ScreenshotFormat = 'png' | 'webp';

/**
 * Viewport dimensions and Device Pixel Ratio
 */
export interface ViewportMetadata {
  width: number;
  height: number;
  dpr: number;
}

/**
 * Screenshot payload conforming strictly to INTERFACES.md RawObservation.screenshot
 */
export interface ScreenshotData {
  format: ScreenshotFormat;
  data: string; // Base64 encoded image
  viewport: ViewportMetadata;
}

/**
 * Full RawObservation record conforming strictly to INTERFACES.md
 */
export interface RawObservation {
  observation_id: string; // UUID v4
  timestamp: number; // Unix epoch ms
  screenshot: ScreenshotData;
  dom_tree?: unknown; // Raw CDP DOM Tree (Populated in T004)
  a11y_tree?: unknown[]; // Raw CDP A11y Tree (Populated in T004)
}

/**
 * Options for CDP Page.captureScreenshot
 */
export interface ScreenshotCaptureOptions {
  format?: ScreenshotFormat;
  quality?: number; // 0-100 (applicable to webp)
  fromSurface?: boolean;
  captureBeyondViewport?: boolean;
  clip?: {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: number;
  };
}

/**
 * CDP Layout metrics response from Page.getLayoutMetrics
 */
export interface CDPLayoutMetrics {
  layoutViewport?: {
    pageX: number;
    pageY: number;
    clientWidth: number;
    clientHeight: number;
  };
  visualViewport?: {
    pageX: number;
    pageY: number;
    clientWidth: number;
    clientHeight: number;
    scale: number;
    zoom: number;
  };
  contentSize?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cssLayoutViewport?: {
    pageX: number;
    pageY: number;
    clientWidth: number;
    clientHeight: number;
  };
}

/**
 * CDP Runtime.evaluate response for window metrics
 */
export interface CDPRelativeMetrics {
  width?: number;
  height?: number;
  dpr?: number;
}

/**
 * Minimal interface for chrome.debugger API dependency injection
 */
export interface ChromeDebuggerAPI {
  attach(target: chrome.debugger.Debuggee, requiredVersion: string): Promise<void>;
  detach(target: chrome.debugger.Debuggee): Promise<void>;
  sendCommand(target: chrome.debugger.Debuggee, method: string, commandParams?: object): Promise<unknown>;
  onDetach: {
    addListener(callback: (source: chrome.debugger.Debuggee, reason: string) => void): void;
    removeListener(callback: (source: chrome.debugger.Debuggee, reason: string) => void): void;
  };
}

/**
 * Base error class for M02 Observation Manager
 */
export class ObservationError extends Error {
  constructor(message: string, public readonly code: string, public readonly details?: unknown) {
    super(`[M02:ObservationManager] ${code}: ${message}`);
    this.name = 'ObservationError';
  }
}

/**
 * Error attaching or maintaining CDP session
 */
export class CDPAttachmentError extends ObservationError {
  constructor(message: string, details?: unknown) {
    super(message, 'CDP_ATTACHMENT_ERROR', details);
    this.name = 'CDPAttachmentError';
  }
}

/**
 * Error executing a CDP command
 */
export class CDPCommandError extends ObservationError {
  constructor(method: string, message: string, details?: unknown) {
    super(`Command '${method}' failed: ${message}`, 'CDP_COMMAND_ERROR', details);
    this.name = 'CDPCommandError';
  }
}

/**
 * Error capturing screenshot
 */
export class ScreenshotCaptureError extends ObservationError {
  constructor(message: string, details?: unknown) {
    super(message, 'SCREENSHOT_CAPTURE_ERROR', details);
    this.name = 'ScreenshotCaptureError';
  }
}
