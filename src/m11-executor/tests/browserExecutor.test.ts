/**
 * M11: Browser Executor — T014 Test Suite
 * Author: AI010 (Browser Execution & Integration Engineer)
 */

import { ValidatedAction } from '../../m10-action-validation/types';
import { ActionProposal } from '../../m09-reasoning/types';
import { BrowserExecutor } from '../browserExecutor';
import { CdpEventDispatcher } from '../types';

export async function runT014Tests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
  const results: { name: string; passed: boolean; error?: string }[] = [];

  function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
  }

  function assertEqual<T>(actual: T, expected: T, msg: string) {
    if (actual !== expected) {
      throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      results.push({ name, passed: true });
    } catch (err: any) {
      results.push({ name, passed: false, error: err.message || String(err) });
    }
  }

  class MockCdpDispatcher implements CdpEventDispatcher {
    public commands: Array<{ method: string; params?: Record<string, unknown> }> = [];
    public failMethod?: string;

    async sendCommand<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
      this.commands.push({ method, params });
      if (this.failMethod === method) {
        throw new Error(`Simulated CDP error on ${method}`);
      }
      return {} as T;
    }
  }

  // 1. Valid CLICK ValidatedAction dispatches CDP mouse events at center of resolved_bbox
  await test('1. Valid CLICK ValidatedAction dispatches CDP mouse events at center of resolved_bbox', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp, clickDelayMs: 0 });

    const validatedAction: ValidatedAction = {
      action_id: 'act-click-100',
      observation_id: 'obs-1',
      action_type: 'CLICK',
      target_id: 'btn-submit',
      resolved_bbox: { x: 100, y: 200, width: 80, height: 40 }, // Center: (140, 220)
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    assertEqual(mockCdp.commands.length, 3, 'Must issue 3 CDP commands (moved, pressed, released)');
    assertEqual(mockCdp.commands[0].method, 'Input.dispatchMouseEvent', 'First command mouseMoved');
    assertEqual(mockCdp.commands[0].params?.x, 140, 'x center is 140');
    assertEqual(mockCdp.commands[0].params?.y, 220, 'y center is 220');
    assertEqual(mockCdp.commands[1].params?.type, 'mousePressed', 'Second command mousePressed');
    assertEqual(mockCdp.commands[2].params?.type, 'mouseReleased', 'Third command mouseReleased');
  });

  // 2. Valid TYPE ValidatedAction dispatches click to focus then text insertion
  await test('2. Valid TYPE ValidatedAction dispatches click to focus then text insertion', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp, clickDelayMs: 0 });

    const validatedAction: ValidatedAction = {
      action_id: 'act-type-100',
      observation_id: 'obs-1',
      action_type: 'TYPE',
      target_id: 'input-search',
      resolved_bbox: { x: 50, y: 50, width: 200, height: 30 },
      parameters: { text: 'flights to tokyo' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    const insertCmd = mockCdp.commands.find((c) => c.method === 'Input.insertText');
    assert(!!insertCmd, 'Input.insertText must be dispatched');
    assertEqual(insertCmd?.params?.text, 'flights to tokyo', 'Inserted text matches parameter');
  });

  // 3. Valid KEY_PRESS ValidatedAction dispatches rawKeyDown and keyUp
  await test('3. Valid KEY_PRESS ValidatedAction dispatches rawKeyDown and keyUp', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const validatedAction: ValidatedAction = {
      action_id: 'act-key-100',
      observation_id: 'obs-1',
      action_type: 'KEY_PRESS',
      parameters: { key: 'Enter' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    assertEqual(mockCdp.commands.length, 2, '2 key commands');
    assertEqual(mockCdp.commands[0].params?.type, 'rawKeyDown', 'First key event rawKeyDown');
    assertEqual(mockCdp.commands[0].params?.key, 'Enter', 'Key is Enter');
    assertEqual(mockCdp.commands[0].params?.windowsVirtualKeyCode, 13, 'Enter key code is 13');
  });

  // 4. Valid SCROLL ValidatedAction dispatches mouseWheel with correct delta
  await test('4. Valid SCROLL ValidatedAction dispatches mouseWheel with correct delta', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const validatedAction: ValidatedAction = {
      action_id: 'act-scroll-100',
      observation_id: 'obs-1',
      action_type: 'SCROLL',
      parameters: { direction: 'DOWN', amount: '500' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    const scrollCmd = mockCdp.commands.find((c) => c.method === 'Input.dispatchMouseEvent');
    assert(!!scrollCmd, 'Mouse event dispatched');
    assertEqual(scrollCmd?.params?.type, 'mouseWheel', 'Type is mouseWheel');
    assertEqual(scrollCmd?.params?.deltaY, 500, 'deltaY is 500');
  });

  // 5. Valid NAVIGATE ValidatedAction dispatches Page.navigate
  await test('5. Valid NAVIGATE ValidatedAction dispatches Page.navigate', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const validatedAction: ValidatedAction = {
      action_id: 'act-nav-100',
      observation_id: 'obs-1',
      action_type: 'NAVIGATE',
      parameters: { url: 'https://example.com' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    const navCmd = mockCdp.commands.find((c) => c.method === 'Page.navigate');
    assert(!!navCmd, 'Page.navigate dispatched');
    assertEqual(navCmd?.params?.url, 'https://example.com', 'URL is https://example.com');
  });

  // 6. Valid WAIT ValidatedAction executes delay
  await test('6. Valid WAIT ValidatedAction executes delay', async () => {
    const executor = new BrowserExecutor();
    const start = Date.now();
    const validatedAction: ValidatedAction = {
      action_id: 'act-wait-100',
      observation_id: 'obs-1',
      action_type: 'WAIT',
      parameters: { duration: '60' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    const elapsed = Date.now() - start;
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
    assert(elapsed >= 50, 'Waited at least 50ms');
  });

  // 7. Valid DONE ValidatedAction succeeds
  await test('7. Valid DONE ValidatedAction succeeds without side effects', async () => {
    const executor = new BrowserExecutor();
    const validatedAction: ValidatedAction = {
      action_id: 'act-done-100',
      observation_id: 'obs-1',
      action_type: 'DONE',
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'SUCCESS', 'Status must be SUCCESS');
  });

  // 8. Rejects unvalidated ActionProposal directly from T012 with status 'REJECTED'
  await test('8. Rejects raw unvalidated ActionProposal directly from T012 (CRITICAL SECURITY GATE)', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    // Raw proposal from T012 without T013 validation_timestamp or resolved_bbox
    const rawProposal: ActionProposal = {
      action_id: 'act-untrusted-proposal',
      observation_id: 'obs-1',
      action_type: 'CLICK',
      target_id: 'btn-submit',
      intended_effect: 'Bypass guard and execute',
    };

    const res = await executor.execute(rawProposal);
    assertEqual(res.status, 'REJECTED', 'Must reject raw proposal');
    assertEqual(mockCdp.commands.length, 0, 'Zero CDP commands dispatched on rejection');
    assert(res.error_message?.includes('unvalidated ActionProposal') || false, 'Explains unvalidated rejection');
  });

  // 9. Rejects missing resolved_bbox coordinates for CLICK
  await test('9. Rejects missing resolved_bbox coordinates for CLICK', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const badAction = {
      action_id: 'act-no-bbox',
      observation_id: 'obs-1',
      action_type: 'CLICK',
      target_id: 'btn-1',
      validation_timestamp: Date.now(),
      // missing resolved_bbox
    };

    const res = await executor.execute(badAction);
    assertEqual(res.status, 'REJECTED', 'Must reject action without resolved coordinates');
    assertEqual(mockCdp.commands.length, 0, 'Zero CDP commands dispatched');
  });

  // 10. CDP command failure returns status 'FAILURE' without crashing
  await test('10. CDP command failure returns status FAILURE without crashing', async () => {
    const mockCdp = new MockCdpDispatcher();
    mockCdp.failMethod = 'Page.navigate';
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const validatedAction: ValidatedAction = {
      action_id: 'act-nav-fail',
      observation_id: 'obs-1',
      action_type: 'NAVIGATE',
      parameters: { url: 'https://example.com' },
      validation_timestamp: Date.now(),
    };

    const res = await executor.execute(validatedAction);
    assertEqual(res.status, 'FAILURE', 'Returns FAILURE on CDP error');
    assert(res.error_message?.includes('Simulated CDP error') || false, 'Error message captured');
  });

  // 11. Coordinates strictly respect local resolved_bbox, ignoring any unvalidated LLM coordinates
  await test('11. Coordinates strictly respect local resolved_bbox from T013', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp, clickDelayMs: 0 });

    const validatedAction: ValidatedAction = {
      action_id: 'act-coord-test',
      observation_id: 'obs-1',
      action_type: 'CLICK',
      target_id: 'btn-test',
      resolved_bbox: { x: 500, y: 300, width: 100, height: 50 }, // Center: (550, 325)
      parameters: { x: '9999', y: '8888' }, // Malicious LLM coordinates that must be IGNORED
      validation_timestamp: Date.now(),
    };

    await executor.execute(validatedAction);
    assertEqual(mockCdp.commands[0].params?.x, 550, 'x center is derived from resolved_bbox');
    assertEqual(mockCdp.commands[0].params?.y, 325, 'y center is derived from resolved_bbox');
  });

  return results;
}
