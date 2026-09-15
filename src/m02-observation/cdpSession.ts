/**
 * M02: Observation Manager — CDP Session Manager
 * Author: AI002 (Browser Observation Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md (M02), ADR 002, MODULES.md
 */

import {
  CDPAttachmentError,
  CDPCommandError,
  ChromeDebuggerAPI,
} from './types';

export const CDP_PROTOCOL_VERSION = '1.3';

export interface CDPSessionOptions {
  tabId: number;
  debuggerApi?: ChromeDebuggerAPI;
  onUnexpectedDetach?: (tabId: number, reason: string) => void;
  onUnrecoverableDetach?: (tabId: number, error: Error) => void;
}

/**
 * Manages the Chrome DevTools Protocol debugger session for a specific tab.
 * Implements deterministic attach/detach and single-attempt automatic re-attachment
 * on unexpected detachment according to SYSTEM-DESIGN.md.
 */
export class CDPSession {
  public readonly tabId: number;
  private readonly debuggerApi: ChromeDebuggerAPI;
  private attached = false;
  private wasAttachedOnce = false;
  private isUnexpectedlyDetached = false;
  private isManuallyDetaching = false;
  private reattachAttempts = 0;
  private readonly maxReattachAttempts = 1;
  private reattachPromise?: Promise<void>;

  private onUnexpectedDetachCallback?: (tabId: number, reason: string) => void;
  private onUnrecoverableDetachCallback?: (tabId: number, error: Error) => void;
  private detachListener: (source: chrome.debugger.Debuggee, reason: string) => void;

  constructor(options: CDPSessionOptions) {
    if (!options.tabId || options.tabId <= 0) {
      throw new CDPAttachmentError(`Invalid tabId provided: ${options.tabId}`);
    }
    this.tabId = options.tabId;
    this.debuggerApi = options.debuggerApi || (typeof chrome !== 'undefined' ? (chrome.debugger as unknown as ChromeDebuggerAPI) : (null as unknown as ChromeDebuggerAPI));
    this.onUnexpectedDetachCallback = options.onUnexpectedDetach;
    this.onUnrecoverableDetachCallback = options.onUnrecoverableDetach;

    this.detachListener = (source: chrome.debugger.Debuggee, reason: string) => {
      this.handleDetachEvent(source, reason);
    };
  }

  public get target(): chrome.debugger.Debuggee {
    return { tabId: this.tabId };
  }

  public isAttached(): boolean {
    return this.attached;
  }

  /**
   * Attaches chrome.debugger to the target tab using CDP protocol version 1.3
   */
  public async attach(): Promise<void> {
    if (!this.debuggerApi) {
      throw new CDPAttachmentError('chrome.debugger API is not available in the current runtime context.');
    }

    if (this.attached) {
      return;
    }

    try {
      this.isManuallyDetaching = false;
      await this.invokeAttach();
      this.attached = true;
      this.wasAttachedOnce = true;
      this.isUnexpectedlyDetached = false;
      this.reattachAttempts = 0;

      // Register unexpected detachment listener
      if (this.debuggerApi.onDetach && typeof this.debuggerApi.onDetach.addListener === 'function') {
        try {
          this.debuggerApi.onDetach.addListener(this.detachListener);
        } catch {
          // Ignore duplicate listener registration if any
        }
      }
    } catch (err: unknown) {
      this.attached = false;
      const message = err instanceof Error ? err.message : String(err);
      throw new CDPAttachmentError(`Failed to attach debugger to tab ${this.tabId}: ${message}`, err);
    }
  }

  /**
   * Detaches chrome.debugger from the target tab cleanly.
   */
  public async detach(): Promise<void> {
    if (!this.debuggerApi || !this.attached) {
      this.attached = false;
      this.isUnexpectedlyDetached = false;
      return;
    }

    this.isManuallyDetaching = true;

    try {
      if (this.debuggerApi.onDetach && typeof this.debuggerApi.onDetach.removeListener === 'function') {
        this.debuggerApi.onDetach.removeListener(this.detachListener);
      }
      await this.invokeDetach();
    } catch (err: unknown) {
      // If already detached by Chrome, ignore cleanup error
      const message = err instanceof Error ? err.message : String(err);
      if (!message.includes('not attached') && !message.includes('No target')) {
        throw new CDPAttachmentError(`Failed to detach debugger from tab ${this.tabId}: ${message}`, err);
      }
    } finally {
      this.attached = false;
      this.isUnexpectedlyDetached = false;
      this.isManuallyDetaching = false;
    }
  }

  /**
   * Waits for any in-flight automatic re-attachment to finish.
   */
  public async waitForPendingReattach(): Promise<void> {
    if (this.reattachPromise) {
      try {
        await this.reattachPromise;
      } catch {
        // Handled in callback
      }
    }
  }

  /**
   * Dispatches a Chrome DevTools Protocol command to the attached tab.
   */
  public async sendCommand<T = unknown>(method: string, commandParams?: object): Promise<T> {
    if (!this.attached) {
      if (this.isUnexpectedlyDetached && this.reattachAttempts < this.maxReattachAttempts) {
        await this.handleReattach();
      } else {
        throw new CDPCommandError(
          method,
          `Debugger is not attached to tab ${this.tabId}. Session is not attached.`
        );
      }
    }

    try {
      const result = await this.invokeSendCommand(method, commandParams);
      return result as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // Check if the command failed because the target was detached unexpectedly
      if (message.includes('not attached') || message.includes('Target closed') || message.includes('Session closed')) {
        this.attached = false;
        this.isUnexpectedlyDetached = true;
        if (this.reattachAttempts < this.maxReattachAttempts) {
          await this.handleReattach();
          // Retry the command once after successful reattachment
          const retryResult = await this.invokeSendCommand(method, commandParams);
          return retryResult as T;
        }
      }

      throw new CDPCommandError(method, message, err);
    }
  }

  /**
   * Handles unexpected detachment event from chrome.debugger.onDetach
   */
  private handleDetachEvent(source: chrome.debugger.Debuggee, reason: string): void {
    if (source.tabId !== this.tabId) {
      return;
    }

    if (this.isManuallyDetaching) {
      return;
    }

    this.attached = false;
    this.isUnexpectedlyDetached = true;
    if (this.onUnexpectedDetachCallback) {
      this.onUnexpectedDetachCallback(this.tabId, reason);
    }

    // Attempt automatic re-attachment once according to SYSTEM-DESIGN.md
    if (this.reattachAttempts < this.maxReattachAttempts) {
      this.reattachPromise = this.handleReattach().catch((err: Error) => {
        if (this.onUnrecoverableDetachCallback) {
          this.onUnrecoverableDetachCallback(this.tabId, err);
        }
      });
    } else if (this.onUnrecoverableDetachCallback) {
      this.onUnrecoverableDetachCallback(
        this.tabId,
        new CDPAttachmentError(`Tab ${this.tabId} detached unexpectedly (reason: ${reason}) and exceeded max reattach attempts.`)
      );
    }
  }

  /**
   * Executes a single re-attachment attempt
   */
  public async handleReattach(): Promise<void> {
    this.reattachAttempts++;
    try {
      await this.invokeAttach();
      this.attached = true;
      this.isUnexpectedlyDetached = false;
    } catch (err: unknown) {
      this.attached = false;
      const error = new CDPAttachmentError(
        `Unexpected detachment recovery failed for tab ${this.tabId}: ${err instanceof Error ? err.message : String(err)}`,
        err
      );
      if (this.onUnrecoverableDetachCallback) {
        this.onUnrecoverableDetachCallback(this.tabId, error);
      }
      throw error;
    }
  }

  private invokeAttach(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const result = this.debuggerApi.attach(this.target, CDP_PROTOCOL_VERSION);
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).then(() => resolve()).catch(reject);
        } else {
          const lastError = (chrome?.runtime as unknown as { lastError?: { message: string } })?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
          } else {
            resolve();
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private invokeDetach(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        const result = this.debuggerApi.detach(this.target);
        if (result && typeof (result as Promise<void>).then === 'function') {
          (result as Promise<void>).then(() => resolve()).catch(reject);
        } else {
          const lastError = (chrome?.runtime as unknown as { lastError?: { message: string } })?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
          } else {
            resolve();
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  private invokeSendCommand(method: string, commandParams?: object): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      try {
        const result = this.debuggerApi.sendCommand(this.target, method, commandParams);
        if (result && typeof (result as Promise<unknown>).then === 'function') {
          (result as Promise<unknown>).then(resolve).catch(reject);
        } else {
          const lastError = (chrome?.runtime as unknown as { lastError?: { message: string } })?.lastError;
          if (lastError) {
            reject(new Error(lastError.message));
          } else {
            resolve(result);
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }
}
