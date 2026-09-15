/**
 * M02: Test Utilities & Mock CDP Infrastructure
 * Author: AI002 (Browser Observation Engineer)
 */

import { ChromeDebuggerAPI } from '../types';

export function createMockDebuggerAPI() {
  let attachedTabId: number | null = null;
  let attachedVersion: string | null = null;
  const commandLog: Array<{ method: string; params?: object }> = [];
  const detachListeners = new Set<(source: chrome.debugger.Debuggee, reason: string) => void>();
  const mockCommands: Record<string, unknown | ((params?: unknown) => unknown)> = {};

  const api: ChromeDebuggerAPI = {
    attach: async (target: chrome.debugger.Debuggee, requiredVersion: string) => {
      if (attachedTabId !== null) {
        throw new Error(`Debugger already attached to tab ${attachedTabId}`);
      }
      attachedTabId = target.tabId ?? null;
      attachedVersion = requiredVersion;
    },
    detach: async (target: chrome.debugger.Debuggee) => {
      if (attachedTabId !== target.tabId) {
        throw new Error('Debugger is not attached to this target.');
      }
      attachedTabId = null;
      attachedVersion = null;
    },
    sendCommand: async (target: chrome.debugger.Debuggee, method: string, params?: object) => {
      if (attachedTabId !== target.tabId) {
        throw new Error(`Cannot send command '${method}': Debugger is not attached.`);
      }
      commandLog.push({ method, params });

      if (method in mockCommands) {
        const handler = mockCommands[method];
        if (typeof handler === 'function') {
          return handler(params);
        }
        return handler;
      }

      // Default mock responses
      if (method === 'Page.enable') {
        return {};
      }
      if (method === 'Page.getLayoutMetrics') {
        return {
          layoutViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 800 },
          visualViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 800, scale: 1, zoom: 1 },
        };
      }
      if (method === 'Runtime.evaluate') {
        return {
          result: {
            value: { width: 1280, height: 800, dpr: 2.0 },
          },
        };
      }
      if (method === 'Page.captureScreenshot') {
        return {
          data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        };
      }
      if (method === 'DOM.getDocument') {
        return {
          root: {
            nodeId: 1,
            backendNodeId: 100,
            nodeType: 9,
            nodeName: '#document',
            childNodeCount: 1,
            children: [
              {
                nodeId: 2,
                backendNodeId: 101,
                nodeType: 1,
                nodeName: 'HTML',
                children: [],
              },
            ],
          },
        };
      }
      if (method === 'Accessibility.getFullAXTree') {
        return {
          nodes: [
            {
              nodeId: 'ax-1',
              ignored: false,
              role: { type: 'role', value: 'RootWebArea' },
              name: { type: 'computedString', value: 'Test Document' },
            },
            {
              nodeId: 'ax-2',
              ignored: false,
              role: { type: 'role', value: 'button' },
              name: { type: 'computedString', value: 'Click Me' },
            },
          ],
        };
      }
      return {};
    },
    onDetach: {
      addListener: (cb) => {
        detachListeners.add(cb);
      },
      removeListener: (cb) => {
        detachListeners.delete(cb);
      },
    },
  };

  return {
    api,
    getAttachedTabId: () => attachedTabId,
    getAttachedVersion: () => attachedVersion,
    getCommandLog: () => [...commandLog],
    setMockCommand: (method: string, response: unknown | ((params?: unknown) => unknown)) => {
      mockCommands[method] = response;
    },
    triggerUnexpectedDetach: (tabId: number, reason: string) => {
      attachedTabId = null;
      for (const listener of Array.from(detachListeners)) {
        listener({ tabId }, reason);
      }
    },
  };
}

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

export function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${String(expected)}, Got: ${String(actual)})`);
  }
}
