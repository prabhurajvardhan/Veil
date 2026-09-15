/**
 * M02: Observation Manager — DOM & Accessibility Tree Capture Test Suite (T004)
 * Author: AI002 (Browser Observation Engineer)
 * Authority: MODULES.md (M02), INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md
 */

import { CDPSession } from '../cdpSession';
import { captureDOMTree } from '../domCapture';
import { captureA11yTree } from '../a11yCapture';
import { ObservationManager, generateObservationId } from '../observationManager';
import {
  A11yCaptureError,
  CDP,
  DOMCaptureError,
  RawObservation,
  RawObservationCaptureError,
} from '../types';
import { assert, assertEqual, createMockDebuggerAPI } from './testUtils';

export async function runDomA11yTests(): Promise<{ passed: number; failed: number; total: number }> {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    } catch (error) {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(error);
      failed++;
    }
  }

  // --- Suite A: DOM.getDocument Tree Capture (T004) ---
  console.log('\n[Suite A: DOM.getDocument Tree Capture]');

  await test('captureDOMTree sends DOM.getDocument with depth: -1 and pierce: true', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const domTree = await captureDOMTree(session);
    assertEqual(domTree.nodeId, 1, 'Root node nodeId matches');
    assertEqual(domTree.nodeName, '#document', 'Root nodeName matches');

    const log = mock.getCommandLog();
    const docCmd = log.find((c) => c.method === 'DOM.getDocument');
    assert(Boolean(docCmd), 'DOM.getDocument command was logged');
    const params = docCmd?.params as { depth: number; pierce: boolean };
    assertEqual(params.depth, -1, 'Enforces depth: -1');
    assertEqual(params.pierce, true, 'Enforces pierce: true');
  });

  await test('captureDOMTree supports custom depth and pierce overrides', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    await captureDOMTree(session, { depth: 3, pierce: false });
    const log = mock.getCommandLog();
    const docCmd = log[log.length - 1];
    const params = docCmd?.params as { depth: number; pierce: boolean };
    assertEqual(params.depth, 3, 'depth override applied');
    assertEqual(params.pierce, false, 'pierce override applied');
  });

  await test('captureDOMTree fails closed when CDPSession is not attached', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });

    let threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws DOMCaptureError when unattached');
      assert((err as DOMCaptureError).message.includes('not attached'), 'Error message clarifies attachment state');
    }
    assert(threw, 'captureDOMTree must fail closed on unattached session');
  });

  await test('captureDOMTree fails closed when DOM.getDocument throws', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('DOM.getDocument', () => {
      throw new Error('CDP internal crash');
    });
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    let threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Wraps CDP failure in DOMCaptureError');
      assert((err as DOMCaptureError).message.includes('DOM.getDocument execution failed'), 'Error reflects command');
    }
    assert(threw, 'Must throw DOMCaptureError on CDP command failure');
  });

  await test('captureDOMTree fails closed when DOM.getDocument returns null or non-object', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('DOM.getDocument', null);
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    let threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws DOMCaptureError on null response');
    }
    assert(threw, 'Must throw on null response');
  });

  await test('captureDOMTree fails closed when root node is missing or malformed', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    // Missing root
    mock.setMockCommand('DOM.getDocument', {});
    let threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws DOMCaptureError on missing root');
    }
    assert(threw, 'Must throw on missing root');

    // Malformed root (missing nodeId)
    mock.setMockCommand('DOM.getDocument', { root: { nodeName: '#document', nodeType: 9 } });
    threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws on missing nodeId');
    }
    assert(threw, 'Must throw on missing nodeId');

    // Malformed root (missing nodeName)
    mock.setMockCommand('DOM.getDocument', { root: { nodeId: 1, nodeType: 9 } });
    threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws on missing nodeName');
    }
    assert(threw, 'Must throw on missing nodeName');

    // Non-object root
    mock.setMockCommand('DOM.getDocument', { root: 'not an object' });
    threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Throws on non-object root');
    }
    assert(threw, 'Must throw on non-object root');

    // String / non-Error throw from CDP command
    mock.setMockCommand('DOM.getDocument', () => {
      throw 'string error message';
    });
    threw = false;
    try {
      await captureDOMTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Handles non-Error throw');
      assert((err as DOMCaptureError).message.includes('string error message'), 'Captures string throw');
    }
    assert(threw, 'Must handle non-Error throw');

    // Direct DOMCaptureError rethrow from mock session
    const directDomErrorSession = {
      isAttached: () => true,
      sendCommand: async () => {
        throw new DOMCaptureError('Pre-existing DOMCaptureError');
      },
    } as unknown as CDPSession;
    threw = false;
    try {
      await captureDOMTree(directDomErrorSession);
    } catch (err) {
      threw = true;
      assert(err instanceof DOMCaptureError, 'Rethrows DOMCaptureError directly');
      assert((err as DOMCaptureError).message.includes('Pre-existing DOMCaptureError'), 'Preserves original message');
    }
    assert(threw, 'Must rethrow DOMCaptureError directly');
  });

  // --- Suite B: Accessibility.getFullAXTree Capture (T004) ---
  console.log('\n[Suite B: Accessibility.getFullAXTree Capture]');

  await test('captureA11yTree sends Accessibility.getFullAXTree and returns raw AXNode[]', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    const a11yNodes = await captureA11yTree(session);
    assertEqual(a11yNodes.length, 2, 'Returns 2 AXNodes');
    assertEqual(a11yNodes[0].nodeId, 'ax-1', 'First node nodeId matches');
    assertEqual(a11yNodes[0].role?.value, 'RootWebArea', 'First node role matches');
    assertEqual(a11yNodes[1].nodeId, 'ax-2', 'Second node nodeId matches');

    const log = mock.getCommandLog();
    const a11yCmd = log.find((c) => c.method === 'Accessibility.getFullAXTree');
    assert(Boolean(a11yCmd), 'Accessibility.getFullAXTree command was sent');
  });

  await test('captureA11yTree fails closed when CDPSession is not attached', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });

    let threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws A11yCaptureError when unattached');
      assert((err as A11yCaptureError).message.includes('not attached'), 'Error specifies unattached');
    }
    assert(threw, 'captureA11yTree must fail closed on unattached session');
  });

  await test('captureA11yTree fails closed when Accessibility.getFullAXTree throws', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('Accessibility.getFullAXTree', () => {
      throw new Error('Accessibility agent not enabled');
    });
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    let threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Wraps failure in A11yCaptureError');
      assert((err as A11yCaptureError).message.includes('Accessibility.getFullAXTree execution failed'), 'Error reflects command');
    }
    assert(threw, 'Must throw A11yCaptureError on CDP command failure');
  });

  await test('captureA11yTree fails closed when response is null or missing nodes array', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    // Null response
    mock.setMockCommand('Accessibility.getFullAXTree', null);
    let threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws on null response');
    }
    assert(threw, 'Must throw on null response');

    // Missing nodes property
    mock.setMockCommand('Accessibility.getFullAXTree', {});
    threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws on missing nodes array');
    }
    assert(threw, 'Must throw on missing nodes property');
  });

  await test('captureA11yTree fails closed when nodes array contains malformed items', async () => {
    const mock = createMockDebuggerAPI();
    const session = new CDPSession({ tabId: 42, debuggerApi: mock.api });
    await session.attach();

    // Malformed node item: missing ignored boolean
    mock.setMockCommand('Accessibility.getFullAXTree', {
      nodes: [{ nodeId: 'ax-1' }],
    });
    let threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws on malformed AXNode (missing ignored)');
      assert((err as A11yCaptureError).message.includes('malformed AXNode at index 0'), 'Pinpoints malformed item index');
    }
    assert(threw, 'Must throw on malformed node item');

    // Malformed node item: non-object item
    mock.setMockCommand('Accessibility.getFullAXTree', {
      nodes: ['invalid string node'],
    });
    threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws on non-object AXNode');
    }
    assert(threw, 'Must throw on non-object AXNode');

    // Malformed node item: null item in nodes array
    mock.setMockCommand('Accessibility.getFullAXTree', {
      nodes: [null],
    });
    threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Throws on null item in nodes array');
    }
    assert(threw, 'Must throw on null item in nodes array');

    // String / non-Error throw from Accessibility.getFullAXTree
    mock.setMockCommand('Accessibility.getFullAXTree', () => {
      throw 'a11y crash string';
    });
    threw = false;
    try {
      await captureA11yTree(session);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Handles non-Error throw');
      assert((err as A11yCaptureError).message.includes('a11y crash string'), 'Captures string throw');
    }
    assert(threw, 'Must handle non-Error throw');

    // Direct A11yCaptureError rethrow from mock session
    const directA11yErrorSession = {
      isAttached: () => true,
      sendCommand: async () => {
        throw new A11yCaptureError('Pre-existing A11yCaptureError');
      },
    } as unknown as CDPSession;
    threw = false;
    try {
      await captureA11yTree(directA11yErrorSession);
    } catch (err) {
      threw = true;
      assert(err instanceof A11yCaptureError, 'Rethrows A11yCaptureError directly');
      assert((err as A11yCaptureError).message.includes('Pre-existing A11yCaptureError'), 'Preserves original message');
    }
    assert(threw, 'Must rethrow A11yCaptureError directly');
  });

  // --- Suite C: ObservationManager T004 Integration ---
  console.log('\n[Suite C: ObservationManager T004 Integration]');

  await test('ObservationManager reuses existing CDPSession for DOM and A11y capture', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    // Single attach for tab 10
    const domTree = await manager.captureDOM(10);
    assertEqual(domTree.nodeId, 1, 'DOM root node returned');
    assertEqual(manager.isAttached(10), true, 'Tab 10 is attached');

    // A11y capture on same tab reuses session without re-attaching
    const a11yNodes = await manager.captureA11y(10);
    assertEqual(a11yNodes.length, 2, 'A11y nodes returned');
    assertEqual(manager.isAttached(10), true, 'Tab 10 remains attached');
  });

  await test('ObservationManager rejects invalid tabId for DOM and A11y calls', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    let threw = false;
    try {
      await manager.captureDOM(0);
    } catch (err) {
      threw = true;
    }
    assert(threw, 'captureDOM rejects tabId 0');

    threw = false;
    try {
      await manager.captureA11y(-5);
    } catch (err) {
      threw = true;
    }
    assert(threw, 'captureA11y rejects negative tabId');

    threw = false;
    try {
      await manager.captureRawObservation(0);
    } catch (err) {
      threw = true;
    }
    assert(threw, 'captureRawObservation rejects tabId 0');
  });

  await test('ObservationManager.captureRawObservation constructs complete RawObservation', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    const rawObs: RawObservation = await manager.captureRawObservation(77);

    // Verify adherence to INTERFACES.md
    assert(Boolean(rawObs.observation_id), 'observation_id is present and populated');
    assert(rawObs.observation_id.length === 36, 'observation_id is UUID length (36 chars)');
    assert(rawObs.timestamp > 0, 'timestamp is positive unix ms');

    // Screenshot facet (T003)
    assertEqual(rawObs.screenshot.format, 'png', 'screenshot format defaults to png');
    assert(typeof rawObs.screenshot.data === 'string', 'screenshot data is base64 string');
    assertEqual(rawObs.screenshot.viewport.width, 1280, 'viewport width is 1280');
    assertEqual(rawObs.screenshot.viewport.height, 800, 'viewport height is 800');
    assertEqual(rawObs.screenshot.viewport.dpr, 2.0, 'viewport DPR is 2.0');

    // DOM facet (T004)
    assertEqual(rawObs.dom_tree.nodeId, 1, 'dom_tree root is populated');
    assertEqual(rawObs.dom_tree.nodeName, '#document', 'dom_tree root nodeName is #document');

    // Accessibility facet (T004)
    assertEqual(rawObs.a11y_tree.length, 2, 'a11y_tree has 2 AXNodes');
    assertEqual(rawObs.a11y_tree[0].nodeId, 'ax-1', 'a11y_tree first node id matches');
  });

  await test('captureRawObservation fails closed if DOM capture fails (never silently omitted)', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('DOM.getDocument', () => {
      throw new Error('DOM agent failed');
    });
    const manager = new ObservationManager({ debuggerApi: mock.api });

    let threw = false;
    try {
      await manager.captureRawObservation(77);
    } catch (err) {
      threw = true;
      assert(err instanceof RawObservationCaptureError, 'Throws RawObservationCaptureError');
      assert((err as RawObservationCaptureError).message.includes('complete RawObservation'), 'Identifies composite failure');
    }
    assert(threw, 'Must fail closed when DOM capture fails');
  });

  await test('captureRawObservation fails closed if A11y capture fails (never silently omitted)', async () => {
    const mock = createMockDebuggerAPI();
    mock.setMockCommand('Accessibility.getFullAXTree', () => {
      throw new Error('A11y agent failed');
    });
    const manager = new ObservationManager({ debuggerApi: mock.api });

    let threw = false;
    try {
      await manager.captureRawObservation(77);
    } catch (err) {
      threw = true;
      assert(err instanceof RawObservationCaptureError, 'Throws RawObservationCaptureError');
    }
    assert(threw, 'Must fail closed when A11y capture fails');

    // Non-Error throw in captureRawObservation
    mock.setMockCommand('Accessibility.getFullAXTree', () => {
      throw 'string failure in a11y';
    });
    threw = false;
    try {
      await manager.captureRawObservation(77);
    } catch (err) {
      threw = true;
      assert(err instanceof RawObservationCaptureError, 'Wraps non-Error failure in RawObservationCaptureError');
      assert((err as RawObservationCaptureError).message.includes('string failure in a11y'), 'Preserves string message');
    }
    assert(threw, 'Must handle non-Error throw in captureRawObservation');

    // Detach failure during detachAll resilience test
    const detachErrMock = createMockDebuggerAPI();
    const detachErrManager = new ObservationManager({ debuggerApi: detachErrMock.api });
    const s55 = await detachErrManager.attach(55);
    s55.detach = async () => {
      throw new Error('Detach failure');
    };
    await detachErrManager.detachAll();
    assertEqual(detachErrManager.isAttached(55), false, 'Session removed despite detach error');

    // generateObservationId fallback test
    const origCrypto = globalThis.crypto;
    try {
      // @ts-expect-error fallback test
      delete globalThis.crypto;
      const id2 = generateObservationId();
      assert(typeof id2 === 'string' && id2.length === 36, 'Fallback UUID v4 works');
    } finally {
      globalThis.crypto = origCrypto;
    }
  });

  await test('Existing T003 screenshot capture remains unbroken alongside T004', async () => {
    const mock = createMockDebuggerAPI();
    const manager = new ObservationManager({ debuggerApi: mock.api });

    // Capture screenshot
    const screenshot = await manager.captureScreenshot(88, { format: 'webp', quality: 90 });
    assertEqual(screenshot.format, 'webp', 'Screenshot captured as webp');
    assertEqual(screenshot.viewport.width, 1280, 'Screenshot viewport width');

    // Capture DOM on same tab
    const dom = await manager.captureDOM(88);
    assertEqual(dom.nodeId, 1, 'DOM captured on same tab');

    // Capture A11y on same tab
    const a11y = await manager.captureA11y(88);
    assertEqual(a11y.length, 2, 'A11y captured on same tab');
  });

  console.log(`\nDOM/A11y Test Execution Summary: ${passed} Passed, ${failed} Failed of ${passed + failed} Total Tests\n`);

  if (failed > 0) {
    throw new Error(`DOM/A11y tests failed: ${failed} failed out of ${passed + failed}`);
  }

  return { passed, failed, total: passed + failed };
}
