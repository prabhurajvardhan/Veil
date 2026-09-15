/**
 * Unit Test Suite for M02: Screenshot Capture & CDP Session Management
 * Author: AI002 (Browser Observation Engineer)
 * Validates: T003 Acceptance Criteria, Interface Contracts, Failure Handling
 */

import {
  CDPSession,
  CDP_PROTOCOL_VERSION,
} from '../cdpSession';
import {
  captureScreenshot,
  getViewportMetadata,
  DEFAULT_SCREENSHOT_FORMAT,
} from '../screenshotCapture';
import {
  ObservationManager,
  generateObservationId,
} from '../observationManager';
import {
  CDPAttachmentError,
  CDPCommandError,
  ChromeDebuggerAPI,
  ObservationError,
  ScreenshotCaptureError,
  ScreenshotData,
} from '../types';

/**
 * Mock Chrome Debugger API for deterministic isolated testing
 */
export function createMockDebuggerAPI() {
  const detachListeners = new Set<(source: chrome.debugger.Debuggee, reason: string) => void>();
  const commandLog: Array<{ method: string; params?: object }> = [];
  let attachedTabId: number | null = null;
  let attachedVersion: string | null = null;
  let mockCommands: Record<string, unknown | ((params?: unknown) => unknown)> = {};

  const api: ChromeDebuggerAPI = {
    attach: async (target: chrome.debugger.Debuggee, version: string) => {
      if (attachedTabId === target.tabId) {
        throw new Error('Another debugger is already attached to this target.');
      }
      attachedTabId = target.tabId!;
      attachedVersion = version;
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

// Simple assertion helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message} (Expected: ${String(expected)}, Got: ${String(actual)})`);
  }
}

export async function runAllTests(): Promise<{ passed: number; failed: number; total: number }> {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    }
  }

  console.log('\n--- M02 Observation Manager: Unit & Interface Validation Suite ---');

  // --- Suite 1: Types and Error Hierarchy ---
  console.log('\n[Suite 1: Error Hierarchy & Types]');

  await test('ObservationError base class formatting', () => {
    const err = new ObservationError('test error', 'TEST_CODE', { foo: 'bar' });
    assertEqual(err.name, 'ObservationError', 'Error name should be ObservationError');
    assertEqual(err.code, 'TEST_CODE', 'Error code matches');
    assert(err.message.includes('TEST_CODE: test error'), 'Message includes code and text');
  });

  await test('Specialized Observation error types', () => {
    const attachErr = new CDPAttachmentError('attach failed');
    assertEqual(attachErr.code, 'CDP_ATTACHMENT_ERROR', 'Attach error code');

    const cmdErr = new CDPCommandError('Page.enable', 'permission denied');
    assertEqual(cmdErr.code, 'CDP_COMMAND_ERROR', 'Command error code');
    assert(cmdErr.message.includes("Command 'Page.enable' failed"), 'Command error message contains method');

    const shotErr = new ScreenshotCaptureError('corrupt data');
    assertEqual(shotErr.code, 'SCREENSHOT_CAPTURE_ERROR', 'Screenshot error code');
  });

  // --- Suite 2: CDPSession Lifecycle & Session Management ---
  console.log('\n[Suite 2: CDPSession Lifecycle]');

  await test('CDPSession rejects invalid tabId', () => {
    let threw = false;
    try {
      new CDPSession({ tabId: 0 });
    } catch (err) {
      threw = true;
      assert(err instanceof CDPAttachmentError, 'Should throw CDPAttachmentError on tabId 0');
    }
    assert(threw, 'Should throw on invalid tabId');
  });

  await test('CDPSession attach succeeds with CDP 1.3 protocol version', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });

    assertEqual(session.isAttached(), false, 'Initially not attached');
    await session.attach();
    assertEqual(session.isAttached(), true, 'Attached after attach()');
    assertEqual(mock.getAttachedTabId(), 42, 'Attached to tab 42');
    assertEqual(mock.getAttachedVersion(), CDP_PROTOCOL_VERSION, 'Attached using version 1.3');

    // Idempotent attach
    await session.attach();
    assertEqual(session.isAttached(), true, 'Still attached after secondary call');
  });

  await test('CDPSession detach cleans up successfully', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });

    await session.attach();
    assertEqual(session.isAttached(), true, 'Attached');

    await session.detach();
    assertEqual(session.isAttached(), false, 'Detached');
    assertEqual(mock.getAttachedTabId(), null, 'Mock debugger detached');
  });

  await test('CDPSession sendCommand succeeds on attached session', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const res = await session.sendCommand<{ data: string }>('Page.captureScreenshot');
    assert(typeof res.data === 'string' && res.data.length > 0, 'Screenshot data returned');

    const log = mock.getCommandLog();
    assertEqual(log.length, 1, 'Command was recorded in mock');
    assertEqual(log[0].method, 'Page.captureScreenshot', 'Recorded correct method');
  });

  await test('CDPSession sendCommand fails when not attached and reattachment exceeds limit', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    // Intentionally do not attach

    let threw = false;
    try {
      await session.sendCommand('Page.captureScreenshot');
    } catch (err) {
      threw = true;
      assert(err instanceof CDPCommandError || err instanceof CDPAttachmentError, 'Throws command/attach error');
    }
    assert(threw, 'Should throw when sending command while not attached');
  });

  await test('CDPSession automatic single re-attachment on unexpected detach (SYSTEM-DESIGN.md)', async () => {
    const mock = createMockDebuggerAPI();
    const detachReasons: string[] = [];
    let unrecoverableError = false;

    const session = new CDPSession({
      tabId: 101,
      debuggerApi: mock.api,
      onUnexpectedDetach: (tabId, reason) => {
        assertEqual(tabId, 101, 'Detached tab matches');
        detachReasons.push(reason);
      },
      onUnrecoverableDetach: () => {
        unrecoverableError = true;
      },
    });

    await session.attach();
    assertEqual(session.isAttached(), true, 'Attached');

    // Simulate unexpected detachment event from browser
    mock.triggerUnexpectedDetach(101, 'target_closed');
    await session.waitForPendingReattach();

    // After unexpected detach, the automatic single re-attachment executes
    assertEqual(detachReasons.length, 1, 'Unexpected detach callback was called once');
    assertEqual(detachReasons[0], 'target_closed', 'First detach reason matches');
    assertEqual(session.isAttached(), true, 'Reattached automatically after 1 unexpected detach');
    assertEqual(unrecoverableError, false, 'Did not signal unrecoverable error on 1st reattachment');

    // If it detaches unexpectedly a SECOND time, it must fail unrecoverably (max 1 retry)
    mock.triggerUnexpectedDetach(101, 'user_canceled');
    await session.waitForPendingReattach();
    assertEqual(detachReasons.length, 2, 'Unexpected detach callback was called twice');
    assertEqual(detachReasons[1], 'user_canceled', 'Second detach reason matches');
    assertEqual(unrecoverableError, true, 'Signaled unrecoverable error after exceeding max reattach attempts');
  });

  // --- Suite 3: Viewport & Device Pixel Ratio (DPR) Metadata ---
  console.log('\n[Suite 3: Viewport & DPR Metadata Acquisition]');

  await test('getViewportMetadata extracts dimensions and DPR correctly', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const viewport = await getViewportMetadata(session);
    assertEqual(viewport.width, 1280, 'Viewport width is 1280');
    assertEqual(viewport.height, 800, 'Viewport height is 800');
    assertEqual(viewport.dpr, 2.0, 'DPR is 2.0');
  });

  await test('getViewportMetadata falls back to Runtime.evaluate if getLayoutMetrics is partial', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('Page.getLayoutMetrics', {
      layoutViewport: { clientWidth: 0, clientHeight: 0 },
    });
    mock.setMockCommand('Runtime.evaluate', {
      result: {
        value: { width: 1920, height: 1080, dpr: 1.5 },
      },
    });

    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const viewport = await getViewportMetadata(session);
    assertEqual(viewport.width, 1920, 'Fell back to width 1920');
    assertEqual(viewport.height, 1080, 'Fell back to height 1080');
    assertEqual(viewport.dpr, 1.5, 'DPR extracted as 1.5');
  });

  await test('getViewportMetadata fails closed when dimensions cannot be determined', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('Page.getLayoutMetrics', {});
    mock.setMockCommand('Runtime.evaluate', {});

    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    let threw = false;
    try {
      await getViewportMetadata(session);
    } catch (err) {
      threw = true;
      assert(err instanceof ScreenshotCaptureError, 'Throws ScreenshotCaptureError');
    }
    assert(threw, 'Fails closed when viewport is invalid');
  });

  // --- Suite 4: Screenshot Capture & Interface Contract ---
  console.log('\n[Suite 4: Screenshot Capture & Interface Contract]');

  await test('captureScreenshot captures PNG by default and strictly satisfies INTERFACES.md schema', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const result: ScreenshotData = await captureScreenshot(session);

    assertEqual(result.format, DEFAULT_SCREENSHOT_FORMAT, 'Default format is png');
    assert(typeof result.data === 'string' && result.data.length > 0, 'Contains Base64 data');
    assertEqual(result.viewport.width, 1280, 'Viewport width is 1280');
    assertEqual(result.viewport.height, 800, 'Viewport height is 800');
    assertEqual(result.viewport.dpr, 2.0, 'DPR is 2.0');
  });

  await test('captureScreenshot supports WEBP format and quality parameters', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const result = await captureScreenshot(session, {
      format: 'webp',
      quality: 85,
    });

    assertEqual(result.format, 'webp', 'Captured as webp');

    const log = mock.getCommandLog();
    const captureCommand = log.find((c) => c.method === 'Page.captureScreenshot');
    assert(Boolean(captureCommand), 'Page.captureScreenshot command found');
    const params = captureCommand?.params as { format: string; quality: number };
    assertEqual(params.format, 'webp', 'Command sent format: webp');
    assertEqual(params.quality, 85, 'Command sent quality: 85');
  });

  await test('captureScreenshot fails closed if CDP returns empty data', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('Page.captureScreenshot', { data: '' });

    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    let threw = false;
    try {
      await captureScreenshot(session);
    } catch (err) {
      threw = true;
      assert(err instanceof ScreenshotCaptureError, 'Throws ScreenshotCaptureError');
    }
    assert(threw, 'Fails closed on empty data');
  });

  await test('captureScreenshot fails closed if session is not attached', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    // Intentionally detached

    let threw = false;
    try {
      await captureScreenshot(session);
    } catch (err) {
      threw = true;
      assert(err instanceof ScreenshotCaptureError, 'Throws ScreenshotCaptureError');
    }
    assert(threw, 'Fails closed when session is detached');
  });

  // --- Suite 5: ObservationManager High-Level Coordination ---
  console.log('\n[Suite 5: ObservationManager Orchestration]');

  await test('generateObservationId generates valid UUID v4', () => {
    const id = generateObservationId();
    assert(typeof id === 'string', 'ID is string');
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert(uuidRegex.test(id), `Observation ID "${id}" is a valid UUID v4`);
  });

  await test('ObservationManager coordinates attach, screenshot capture, and clean detach', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    assertEqual(manager.isAttached(55), false, 'Tab 55 not attached');

    const screenshot = await manager.captureScreenshot(55, { format: 'png' });
    assertEqual(manager.isAttached(55), true, 'Tab 55 automatically attached');
    assertEqual(screenshot.format, 'png', 'Screenshot format is png');
    assert(screenshot.data.length > 0, 'Screenshot data present');

    await manager.detach(55);
    assertEqual(manager.isAttached(55), false, 'Tab 55 detached');
  });

  await test('ObservationManager rejects invalid tabId', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    let threw = false;
    try {
      await manager.captureScreenshot(-1);
    } catch (err) {
      threw = true;
      assert(err instanceof ObservationError, 'Throws ObservationError on invalid tabId');
    }
    assert(threw, 'Rejects invalid tabId');
  });

  await test('ObservationManager detachAll cleans up all attached tabs', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    await manager.attach(1);
    // Tab 2 uses a separate mock to avoid collision in single-instance mock
    assertEqual(manager.isAttached(1), true, 'Tab 1 attached');

    await manager.detachAll();
    assertEqual(manager.isAttached(1), false, 'Tab 1 detached after detachAll()');
  });

  console.log(`\nTest Execution Summary: ${passed} Passed, ${failed} Failed of ${passed + failed} Total Tests\n`);

  if (failed > 0) {
    throw new Error(`Test Suite Failed with ${failed} failure(s).`);
  }

  return { passed, failed, total: passed + failed };
}
