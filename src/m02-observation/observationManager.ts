/**
 * M02: Observation Manager — Main Module Controller
 * Author: AI002 (Browser Observation Engineer)
 * Authority: MODULES.md (M02), docs/system-design/SYSTEM-DESIGN.md, INTERFACES.md
 */

import { CDPSession, CDPSessionOptions } from './cdpSession';
import { captureScreenshot } from './screenshotCapture';
import { captureDOMTree } from './domCapture';
import { captureA11yTree } from './a11yCapture';
import {
  CDP,
  ChromeDebuggerAPI,
  DOMCaptureOptions,
  ObservationError,
  RawObservation,
  RawObservationCaptureError,
  ScreenshotCaptureOptions,
  ScreenshotData,
} from './types';

/**
 * UUID v4 generator for deterministic observation IDs conforming to INTERFACES.md
 */
export function generateObservationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 compliant UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface ObservationManagerOptions {
  debuggerApi?: ChromeDebuggerAPI;
  onSessionDetached?: (tabId: number, reason: string) => void;
  onUnrecoverableError?: (tabId: number, error: Error) => void;
}

/**
 * Primary Observation Manager component for Module M02.
 * Coordinates CDP attachment and deterministic raw browser state acquisition.
 */
export class ObservationManager {
  private activeSessions = new Map<number, CDPSession>();
  private readonly debuggerApi?: ChromeDebuggerAPI;
  private readonly onSessionDetached?: (tabId: number, reason: string) => void;
  private readonly onUnrecoverableError?: (tabId: number, error: Error) => void;

  constructor(options?: ObservationManagerOptions) {
    this.debuggerApi = options?.debuggerApi;
    this.onSessionDetached = options?.onSessionDetached;
    this.onUnrecoverableError = options?.onUnrecoverableError;
  }

  /**
   * Retrieves or creates a CDPSession for the target tab.
   */
  public getOrCreateSession(tabId: number): CDPSession {
    let session = this.activeSessions.get(tabId);
    if (!session) {
      const sessionOptions: CDPSessionOptions = {
        tabId,
        debuggerApi: this.debuggerApi,
        onUnexpectedDetach: (id, reason) => {
          if (this.onSessionDetached) {
            this.onSessionDetached(id, reason);
          }
        },
        onUnrecoverableDetach: (id, error) => {
          this.activeSessions.delete(id);
          if (this.onUnrecoverableError) {
            this.onUnrecoverableError(id, error);
          }
        },
      };
      session = new CDPSession(sessionOptions);
      this.activeSessions.set(tabId, session);
    }
    return session;
  }

  /**
   * Attaches debugger session to the target tab.
   */
  public async attach(tabId: number): Promise<CDPSession> {
    const session = this.getOrCreateSession(tabId);
    if (!session.isAttached()) {
      await session.attach();
    }
    return session;
  }

  /**
   * Detaches debugger session from the target tab.
   */
  public async detach(tabId: number): Promise<void> {
    const session = this.activeSessions.get(tabId);
    if (session) {
      try {
        await session.detach();
      } finally {
        this.activeSessions.delete(tabId);
      }
    }
  }

  /**
   * Detaches all active sessions (e.g., during extension shutdown).
   */
  public async detachAll(): Promise<void> {
    const sessions = Array.from(this.activeSessions.entries());
    for (const [tabId, session] of sessions) {
      try {
        await session.detach();
      } catch {
        // Continue detaching remaining tabs
      } finally {
        this.activeSessions.delete(tabId);
      }
    }
  }

  /**
   * Returns whether a tab currently has an active CDP attachment.
   */
  public isAttached(tabId: number): boolean {
    const session = this.activeSessions.get(tabId);
    return session ? session.isAttached() : false;
  }

  /**
   * Captures raw visual screenshot of the target tab via CDP Page.captureScreenshot.
   * Ensures debugger is attached, executes capture, and returns ScreenshotData.
   */
  public async captureScreenshot(
    tabId: number,
    options?: ScreenshotCaptureOptions
  ): Promise<ScreenshotData> {
    if (!tabId || tabId <= 0) {
      throw new ObservationError(`Invalid tabId provided: ${tabId}`, 'INVALID_TAB_ID');
    }

    // Ensure session is attached
    const session = await this.attach(tabId);

    // Capture screenshot adhering to INTERFACES.md
    return captureScreenshot(session, options);
  }

  /**
   * Captures raw DOM tree of the target tab via CDP DOM.getDocument.
   * Ensures debugger is attached and returns root CDP.DOM.Node.
   */
  public async captureDOM(
    tabId: number,
    options?: DOMCaptureOptions
  ): Promise<CDP.DOM.Node> {
    if (!tabId || tabId <= 0) {
      throw new ObservationError(`Invalid tabId provided: ${tabId}`, 'INVALID_TAB_ID');
    }

    const session = await this.attach(tabId);
    return captureDOMTree(session, options);
  }

  /**
   * Captures raw Accessibility tree of the target tab via CDP Accessibility.getFullAXTree.
   * Ensures debugger is attached and returns CDP.Accessibility.AXNode[].
   */
  public async captureA11y(tabId: number): Promise<CDP.Accessibility.AXNode[]> {
    if (!tabId || tabId <= 0) {
      throw new ObservationError(`Invalid tabId provided: ${tabId}`, 'INVALID_TAB_ID');
    }

    const session = await this.attach(tabId);
    return captureA11yTree(session);
  }

  /**
   * Captures composite RawObservation adhering strictly to INTERFACES.md.
   * Simultaneously executes Page.captureScreenshot, DOM.getDocument, and
   * Accessibility.getFullAXTree over the attached CDPSession.
   * 
   * Fails closed if any observation facet fails.
   */
  public async captureRawObservation(
    tabId: number,
    options?: ScreenshotCaptureOptions
  ): Promise<RawObservation> {
    if (!tabId || tabId <= 0) {
      throw new ObservationError(`Invalid tabId provided: ${tabId}`, 'INVALID_TAB_ID');
    }

    const session = await this.attach(tabId);

    try {
      const [screenshot, dom_tree, a11y_tree] = await Promise.all([
        captureScreenshot(session, options),
        captureDOMTree(session),
        captureA11yTree(session),
      ]);

      const observation: RawObservation = {
        observation_id: generateObservationId(),
        timestamp: Date.now(),
        screenshot,
        dom_tree,
        a11y_tree,
      };

      return observation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new RawObservationCaptureError(
        `Failed to capture complete RawObservation for tab ${tabId}: ${message}`,
        error
      );
    }
  }
}
