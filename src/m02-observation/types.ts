/**
 * M02: Observation Manager — Type Definitions
 * Author: AI002 (Browser Observation Engineer)
 * Authority: INTERFACES.md, MODULES.md, docs/system-design/SYSTEM-DESIGN.md
 */

/**
 * Chrome DevTools Protocol (CDP) raw node types defined by INTERFACES.md
 */
export namespace CDP {
  export namespace DOM {
    /**
     * Raw CDP DOM Tree Node per INTERFACES.md / Chrome DevTools Protocol
     */
    export interface Node {
      nodeId: number;
      backendNodeId?: number;
      nodeType: number;
      nodeName: string;
      localName?: string;
      nodeValue?: string;
      childNodeCount?: number;
      children?: Node[];
      attributes?: string[];
      documentURL?: string;
      baseURL?: string;
      publicId?: string;
      systemId?: string;
      internalSubset?: string;
      xmlVersion?: string;
      name?: string;
      value?: string;
      pseudoType?: string;
      shadowRootType?: string;
      frameId?: string;
      contentDocument?: Node;
      shadowRoots?: Node[];
      templateContent?: Node;
      pseudoElements?: Node[];
      importedDocument?: Node;
      distributedNodes?: unknown[];
      isSVG?: boolean;
      compatibilityMode?: string;
      assignedSlot?: unknown;
      [key: string]: unknown;
    }
  }

  export namespace Accessibility {
    /**
     * Raw CDP Accessibility AXNode per INTERFACES.md / Chrome DevTools Protocol
     */
    export interface AXNode {
      nodeId: string;
      ignored: boolean;
      ignoredReasons?: Array<{ reason: string; children?: unknown[] }>;
      role?: { type: string; value?: string };
      name?: { type: string; value?: string; sources?: unknown[] };
      description?: { type: string; value?: string; sources?: unknown[] };
      value?: { type: string; value?: string };
      properties?: Array<{ name: string; value: { type: string; value?: unknown } }>;
      childIds?: string[];
      parentId?: string;
      backendDOMNodeId?: number;
      [key: string]: unknown;
    }
  }
}

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
  screenshot: {
    format: 'png' | 'webp';
    data: string; // Base64
    viewport: {
      width: number;
      height: number;
      dpr: number;
    };
  };
  dom_tree: CDP.DOM.Node; // Raw CDP DOM Tree
  a11y_tree: CDP.Accessibility.AXNode[]; // Raw CDP A11y Tree
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
 * Options for CDP DOM.getDocument
 */
export interface DOMCaptureOptions {
  depth?: number; // Must default to -1 for complete tree
  pierce?: boolean; // Must default to true for Shadow DOM
}

/**
 * Result structure from CDP DOM.getDocument
 */
export interface CDPGetDocumentResult {
  root: CDP.DOM.Node;
}

/**
 * Result structure from CDP Accessibility.getFullAXTree
 */
export interface CDPGetFullAXTreeResult {
  nodes: CDP.Accessibility.AXNode[];
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

/**
 * Error capturing DOM tree via CDP DOM.getDocument
 */
export class DOMCaptureError extends ObservationError {
  constructor(message: string, details?: unknown) {
    super(message, 'DOM_CAPTURE_ERROR', details);
    this.name = 'DOMCaptureError';
  }
}

/**
 * Error capturing Accessibility tree via CDP Accessibility.getFullAXTree
 */
export class A11yCaptureError extends ObservationError {
  constructor(message: string, details?: unknown) {
    super(message, 'A11Y_CAPTURE_ERROR', details);
    this.name = 'A11yCaptureError';
  }
}

/**
 * Error capturing composite RawObservation
 */
export class RawObservationCaptureError extends ObservationError {
  constructor(message: string, details?: unknown) {
    super(message, 'RAW_OBSERVATION_CAPTURE_ERROR', details);
    this.name = 'RawObservationCaptureError';
  }
}

