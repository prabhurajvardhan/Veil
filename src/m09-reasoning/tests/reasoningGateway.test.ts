/**
 * M09: Remote Reasoner Gateway — T012 Test Suite
 * Author: AI008 (Reasoning Gateway Engineer)
 *
 * Validates:
 * 1. Valid sanitized observation accepted
 * 2. Valid structured action proposal returned
 * 3. SAFE structural information reaches reasoning provider
 * 4. Sensitive/redacted values remain redacted
 * 5. Raw DOM is never sent across boundary
 * 6. Raw screenshot is never sent across boundary
 * 7. Raw OCR is never sent across boundary
 * 8. Privacy classification data is never sent across boundary
 * 9. Malformed observation rejected (fail-closed)
 * 10. Missing observation ID rejected (fail-closed)
 * 11. Provider network failure handled gracefully
 * 12. Provider timeout handled gracefully
 * 13. Malformed JSON response rejected
 * 14. Invalid action type rejected
 * 15. Malformed action arguments rejected
 * 16. Mismatched observation ID rejected
 * 17. Stale / corrupted proposal rejected
 * 18. T012 never executes browser actions (authority boundary check)
 * 19. Multiple supported action types handled (CLICK, TYPE, KEY_PRESS, SCROLL, NAVIGATE, WAIT, DONE)
 * 20. Provider abstraction works independently of a specific vendor
 * 21. Privacy invariant: recursively inspects payload and verifies sensitive values never leak
 */

import { SanitizedObservation } from '../../m08-sanitization/types';
import {
  ActionProposal,
  ActionType,
  HttpReasoningProvider,
  InvalidActionProposalError,
  InvalidObservationError,
  MalformedModelResponseError,
  MockReasoningProvider,
  ObservationIdMismatchError,
  ReasoningGateway,
  ReasoningProviderError,
  ReasoningRequest,
  ReasoningTimeoutError,
  SecurityBoundaryViolationError,
  VEIL_SYSTEM_PROMPT,
} from '../index';

export async function runT012Tests(): Promise<{ name: string; passed: boolean; error?: string }[]> {
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

  function createValidSanitizedObservation(overrides?: Partial<SanitizedObservation>): SanitizedObservation {
    return {
      observation_id: 'obs-uuid-1001',
      timestamp: 1757946000000,
      overall_confidence: 0.96,
      nodes: [
        {
          target_id: 'btn-search',
          bbox: { x: 50, y: 100, width: 80, height: 32 },
          role: 'button',
          text: 'Search Flight',
          interactable: true,
          confidence: 0.98,
          is_redacted: false,
        },
        {
          target_id: 'input-dest',
          bbox: { x: 50, y: 150, width: 200, height: 40 },
          role: 'textbox',
          text: 'Tokyo Haneda',
          interactable: true,
          confidence: 0.95,
          is_redacted: false,
        },
        {
          target_id: 'input-email',
          bbox: { x: 50, y: 210, width: 200, height: 40 },
          role: 'textbox',
          text: '[REDACTED:EMAIL]',
          interactable: true,
          confidence: 0.90,
          is_redacted: true,
          redaction_category: 'EMAIL',
        },
      ],
      metadata: {
        total_nodes: 3,
        redacted_nodes_count: 1,
        sanitization_applied: true,
      },
      ...overrides,
    };
  }

  // 1. Valid sanitized observation accepted
  await test('valid sanitized observation accepted by gateway', async () => {
    const mockProvider = new MockReasoningProvider({
      action_id: 'act-001',
      observation_id: 'obs-uuid-1001',
      action_type: 'CLICK',
      target_id: 'btn-search',
      intended_effect: 'Click search flight button',
    });
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    const proposal = await gateway.proposeAction(obs, 'Search for flights');
    assertEqual(proposal.action_type, 'CLICK', 'Action type must be CLICK');
    assertEqual(proposal.target_id, 'btn-search', 'Target ID must match');
    assertEqual(proposal.observation_id, 'obs-uuid-1001', 'Observation ID must be bound');
  });

  // 2. Valid structured action proposal returned
  await test('valid structured action proposal returned with expected schema', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.enqueueResponse({
      action_id: 'act-type-test',
      observation_id: 'obs-uuid-1001',
      action_type: 'TYPE',
      target_id: 'input-dest',
      parameters: { text: 'Osaka Kansai' },
      intended_effect: 'Enter destination city',
      confidence: 0.92,
    });
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    const proposal = await gateway.proposeAction(obs, 'Fill destination');
    assertEqual(proposal.action_id, 'act-type-test', 'Action ID preserved');
    assertEqual(proposal.action_type, 'TYPE', 'Action type is TYPE');
    assertEqual(proposal.target_id, 'input-dest', 'Target is input-dest');
    assertEqual(proposal.parameters?.text, 'Osaka Kansai', 'Parameters text matches');
    assertEqual(proposal.intended_effect, 'Enter destination city', 'Intended effect matches');
    assertEqual(proposal.confidence, 0.92, 'Confidence matches');
  });

  // 3. SAFE structural information reaches reasoning provider
  await test('SAFE structural information reaches reasoning provider accurately', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    await gateway.proposeAction(obs, 'Find flights');
    const recorded = mockProvider.getLastRecordedRequest();
    assert(!!recorded, 'Request must be recorded');
    assertEqual(recorded?.user_goal, 'Find flights', 'User goal matches');
    assertEqual(recorded?.observation_id, 'obs-uuid-1001', 'Observation ID matches');
    assertEqual(recorded?.nodes.length, 3, 'All 3 sanitized nodes present');

    const node0 = recorded?.nodes[0];
    assertEqual(node0?.target_id, 'btn-search', 'Target ID intact');
    assertEqual(node0?.role, 'button', 'Role intact');
    assertEqual(node0?.text, 'Search Flight', 'Safe text intact');
    assertEqual(node0?.bbox.x, 50, 'BBox x intact');
    assertEqual(node0?.interactable, true, 'Interactable flag intact');
  });

  // 4. Sensitive/redacted values remain redacted
  await test('sensitive/redacted values remain redacted in outbound request', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    await gateway.proposeAction(obs, 'Analyze form');
    const recorded = mockProvider.getLastRecordedRequest();
    const emailNode = recorded?.nodes.find((n) => n.target_id === 'input-email');
    assert(!!emailNode, 'Email node must exist');
    assertEqual(emailNode?.text, '[REDACTED:EMAIL]', 'Sensitive email must be redacted');
    assertEqual(emailNode?.is_redacted, true, 'is_redacted must be true');
  });

  // 5. Raw DOM is never sent across boundary
  await test('raw DOM is never sent across boundary and fails closed if present', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    // Intentionally inject raw DOM leak into observation
    const dirtyObs = {
      ...createValidSanitizedObservation(),
      dom_tree: { nodeId: 1, nodeType: 1, nodeName: 'BODY' },
    };

    let caughtSecurityError = false;
    try {
      await gateway.proposeAction(dirtyObs as any, 'Click submit');
    } catch (err) {
      caughtSecurityError = err instanceof SecurityBoundaryViolationError;
    }
    assert(caughtSecurityError, 'Must throw SecurityBoundaryViolationError when raw DOM is present');
    assertEqual(mockProvider.getRecordedRequests().length, 0, 'No request must be sent to provider');
  });

  // 6. Raw screenshot is never sent across boundary
  await test('raw screenshot is never transmitted in reasoning request', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    const obsWithScreenshot = createValidSanitizedObservation({
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    });

    await gateway.proposeAction(obsWithScreenshot, 'Inspect screen');
    const recorded = mockProvider.getLastRecordedRequest();
    assert(!!recorded, 'Request recorded');
    assert(!('screenshot' in recorded!), 'Screenshot must NOT be present in egress payload');
    assert(!JSON.stringify(recorded).includes('iVBORw0KGgoAAA'), 'Screenshot data must NOT be serialized');
  });

  // 7. Raw OCR is never sent across boundary
  await test('raw OCR evidence is never sent across boundary and fails closed if present', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    const dirtyObs = {
      ...createValidSanitizedObservation(),
      ocr_evidence: [{ text: 'Raw OCR extracted text', confidence: 99 }],
    };

    let caughtSecurityError = false;
    try {
      await gateway.proposeAction(dirtyObs as any, 'Read text');
    } catch (err) {
      caughtSecurityError = err instanceof SecurityBoundaryViolationError;
    }
    assert(caughtSecurityError, 'Must throw SecurityBoundaryViolationError for raw OCR evidence');
    assertEqual(mockProvider.getRecordedRequests().length, 0, 'No egress allowed');
  });

  // 8. Privacy classification data is never sent across boundary
  await test('privacy classification data is never sent and fails closed if present', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    const dirtyObs = {
      ...createValidSanitizedObservation(),
      assessments: [{ target_id: 'btn-search', category: 'SAFE' }],
    };

    let caughtSecurityError = false;
    try {
      await gateway.proposeAction(dirtyObs as any, 'Analyze privacy');
    } catch (err) {
      caughtSecurityError = err instanceof SecurityBoundaryViolationError;
    }
    assert(caughtSecurityError, 'Must throw SecurityBoundaryViolationError for privacy assessments leak');
  });

  // 9. Malformed observation rejected
  await test('malformed observation rejected (null, bad bbox, bad nodes)', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    let nullObsCaught = false;
    try {
      await gateway.proposeAction(null as any, 'Goal');
    } catch (err) {
      nullObsCaught = err instanceof InvalidObservationError;
    }
    assert(nullObsCaught, 'Null observation must throw InvalidObservationError');

    let badBboxCaught = false;
    try {
      const badObs = createValidSanitizedObservation({
        nodes: [{ target_id: 'bad-bbox', bbox: null as any, role: 'div', text: 'hi', interactable: false, confidence: 1, is_redacted: false }],
      });
      await gateway.proposeAction(badObs, 'Goal');
    } catch (err) {
      badBboxCaught = err instanceof InvalidObservationError;
    }
    assert(badBboxCaught, 'Malformed bbox must throw InvalidObservationError');
  });

  // 10. Missing observation ID rejected
  await test('missing observation ID rejected', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    let caught = false;
    try {
      const obs = createValidSanitizedObservation({ observation_id: '' });
      await gateway.proposeAction(obs, 'Goal');
    } catch (err) {
      caught = err instanceof InvalidObservationError;
    }
    assert(caught, 'Empty observation_id must throw InvalidObservationError');
  });

  // 11. Provider network failure handled gracefully
  await test('provider network failure handled gracefully', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.setSimulateNetworkError('Connection refused to reasoning endpoint');
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    let caughtNetwork = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caughtNetwork = err instanceof ReasoningProviderError;
    }
    assert(caughtNetwork, 'Must throw ReasoningProviderError on network failure');
  });

  // 12. Provider timeout handled gracefully
  await test('provider timeout handled gracefully', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.setSimulateTimeout(true);
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    let caughtTimeout = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caughtTimeout = err instanceof ReasoningTimeoutError;
    }
    assert(caughtTimeout, 'Must throw ReasoningTimeoutError on timeout');
  });

  // 13. Malformed JSON response rejected
  await test('malformed JSON response rejected', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.enqueueResponse('NOT_JSON_AT_ALL {');
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    let caughtMalformed = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caughtMalformed = err instanceof MalformedModelResponseError;
    }
    assert(caughtMalformed, 'Must throw MalformedModelResponseError on unparseable JSON');
  });

  // 14. Invalid action type rejected
  await test('invalid action type rejected', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.enqueueResponse({
      action_id: 'act-99',
      observation_id: 'obs-uuid-1001',
      action_type: 'EXECUTE_ARBITRARY_JS', // Illegal type
      intended_effect: 'Bypass security',
    });
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    let caughtInvalidType = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caughtInvalidType = err instanceof InvalidActionProposalError;
    }
    assert(caughtInvalidType, 'Must throw InvalidActionProposalError for unknown action type');
  });

  // 15. Malformed action arguments rejected (missing target_id for CLICK, missing text for TYPE)
  await test('malformed action arguments rejected fail-closed', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    // CLICK without target_id
    mockProvider.enqueueResponse({
      action_id: 'act-1',
      observation_id: 'obs-uuid-1001',
      action_type: 'CLICK',
      intended_effect: 'Click nothing',
    });
    let caughtMissingTarget = false;
    try {
      await gateway.proposeAction(obs, 'Click');
    } catch (err) {
      caughtMissingTarget = err instanceof InvalidActionProposalError;
    }
    assert(caughtMissingTarget, 'CLICK without target_id must be rejected');

    // TYPE without text parameter
    mockProvider.enqueueResponse({
      action_id: 'act-2',
      observation_id: 'obs-uuid-1001',
      action_type: 'TYPE',
      target_id: 'input-dest',
      parameters: {}, // missing 'text'
      intended_effect: 'Type text',
    });
    let caughtMissingText = false;
    try {
      await gateway.proposeAction(obs, 'Type');
    } catch (err) {
      caughtMissingText = err instanceof InvalidActionProposalError;
    }
    assert(caughtMissingText, 'TYPE without text parameter must be rejected');

    // Target ID not existing in observation nodes
    mockProvider.enqueueResponse({
      action_id: 'act-3',
      observation_id: 'obs-uuid-1001',
      action_type: 'CLICK',
      target_id: 'phantom-element-not-in-dom',
      intended_effect: 'Click phantom',
    });
    let caughtPhantomTarget = false;
    try {
      await gateway.proposeAction(obs, 'Click phantom');
    } catch (err) {
      caughtPhantomTarget = err instanceof InvalidActionProposalError;
    }
    assert(caughtPhantomTarget, 'Target not existing in observation must be rejected');
  });

  // 16. Mismatched observation ID rejected
  await test('mismatched observation ID rejected (prevents stale reasoning execution)', async () => {
    const mockProvider = new MockReasoningProvider();
    mockProvider.enqueueResponse({
      action_id: 'act-stale',
      observation_id: 'obs-uuid-OLD-DIFFERENT', // Stale observation ID
      action_type: 'CLICK',
      target_id: 'btn-search',
      intended_effect: 'Old action',
    });
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation({ observation_id: 'obs-uuid-NEW-CURRENT' });

    let caughtMismatch = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caughtMismatch = err instanceof ObservationIdMismatchError;
    }
    assert(caughtMismatch, 'Must throw ObservationIdMismatchError on mismatched observation_id');
  });

  // 17. Stale / dangerous proposal rejected (script injection in parameters or navigate url)
  await test('script injection in parameters or dangerous navigate URL rejected', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    // Script tag injection in parameters
    mockProvider.enqueueResponse({
      action_id: 'act-xss',
      observation_id: 'obs-uuid-1001',
      action_type: 'TYPE',
      target_id: 'input-dest',
      parameters: { text: '<script>alert(1)</script>' },
      intended_effect: 'XSS attempt',
    });
    let caughtXss = false;
    try {
      await gateway.proposeAction(obs, 'Attack');
    } catch (err) {
      caughtXss = err instanceof InvalidActionProposalError;
    }
    assert(caughtXss, 'Script tag parameter must be rejected');

    // Dangerous javascript: URL in NAVIGATE
    mockProvider.enqueueResponse({
      action_id: 'act-nav',
      observation_id: 'obs-uuid-1001',
      action_type: 'NAVIGATE',
      parameters: { url: 'javascript:stealData()' },
      intended_effect: 'Navigate malicious',
    });
    let caughtNav = false;
    try {
      await gateway.proposeAction(obs, 'Nav attack');
    } catch (err) {
      caughtNav = err instanceof InvalidActionProposalError;
    }
    assert(caughtNav, 'javascript: URI in NAVIGATE must be rejected');
  });

  // 18. T012 never executes browser actions (authority boundary check)
  await test('T012 has no browser execution methods and produces only declarative proposals', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    // Verify gateway interface exposes only proposal logic
    const gatewayObj = gateway as any;
    assert(typeof gatewayObj.proposeAction === 'function', 'proposeAction must exist');
    assert(gatewayObj.executeAction === undefined, 'executeAction must NOT exist');
    assert(gatewayObj.click === undefined, 'click execution must NOT exist');
    assert(gatewayObj.type === undefined, 'type execution must NOT exist');
    assert(gatewayObj.evaluateJs === undefined, 'evaluateJs must NOT exist');
    assert(gatewayObj.sendCdpCommand === undefined, 'sendCdpCommand must NOT exist');
  });

  // 19. Multiple supported action types handled (CLICK, TYPE, KEY_PRESS, SCROLL, NAVIGATE, WAIT, DONE)
  await test('multiple supported action types handled correctly (CLICK, TYPE, KEY_PRESS, SCROLL, NAVIGATE, WAIT, DONE)', async () => {
    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });
    const obs = createValidSanitizedObservation();

    const actionsToTest: { response: any; expectedType: ActionType }[] = [
      {
        response: {
          action_id: 'a-click',
          observation_id: 'obs-uuid-1001',
          action_type: 'CLICK',
          target_id: 'btn-search',
          intended_effect: 'Click search',
        },
        expectedType: 'CLICK',
      },
      {
        response: {
          action_id: 'a-type',
          observation_id: 'obs-uuid-1001',
          action_type: 'TYPE',
          target_id: 'input-dest',
          parameters: { text: 'Kyoto' },
          intended_effect: 'Type Kyoto',
        },
        expectedType: 'TYPE',
      },
      {
        response: {
          action_id: 'a-key',
          observation_id: 'obs-uuid-1001',
          action_type: 'KEY_PRESS',
          parameters: { key: 'Enter' },
          intended_effect: 'Press enter',
        },
        expectedType: 'KEY_PRESS',
      },
      {
        response: {
          action_id: 'a-scroll',
          observation_id: 'obs-uuid-1001',
          action_type: 'SCROLL',
          parameters: { direction: 'DOWN', amount: '300' },
          intended_effect: 'Scroll page down',
        },
        expectedType: 'SCROLL',
      },
      {
        response: {
          action_id: 'a-nav',
          observation_id: 'obs-uuid-1001',
          action_type: 'NAVIGATE',
          parameters: { url: 'https://airline.example.com/flights' },
          intended_effect: 'Navigate to airline page',
        },
        expectedType: 'NAVIGATE',
      },
      {
        response: {
          action_id: 'a-wait',
          observation_id: 'obs-uuid-1001',
          action_type: 'WAIT',
          intended_effect: 'Wait for page load',
        },
        expectedType: 'WAIT',
      },
      {
        response: {
          action_id: 'a-done',
          observation_id: 'obs-uuid-1001',
          action_type: 'DONE',
          intended_effect: 'Task completed',
        },
        expectedType: 'DONE',
      },
    ];

    for (const item of actionsToTest) {
      mockProvider.enqueueResponse(item.response);
      const proposal = await gateway.proposeAction(obs, 'Execute step');
      assertEqual(proposal.action_type, item.expectedType, `Action type matches ${item.expectedType}`);
    }
  });

  // 20. Provider abstraction works independently of a specific vendor (Mock vs Http vs Custom)
  await test('provider abstraction works independently of a specific vendor', async () => {
    // Custom inline vendor provider
    let vendorCalled = false;
    const customVendorProvider = {
      providerId: 'CustomVendorModelXYZ',
      async proposeAction(request: ReasoningRequest) {
        vendorCalled = true;
        return {
          action_id: 'vendor-action-123',
          observation_id: request.observation_id,
          action_type: 'DONE',
          intended_effect: 'Vendor XYZ solved user request',
        };
      },
    };

    const gateway = new ReasoningGateway({ provider: customVendorProvider });
    const obs = createValidSanitizedObservation();
    const proposal = await gateway.proposeAction(obs, 'Custom vendor request');

    assert(vendorCalled, 'Custom vendor provider must be called');
    assertEqual(proposal.action_type, 'DONE', 'Action type matches custom vendor proposal');
    assertEqual(proposal.intended_effect, 'Vendor XYZ solved user request', 'Intended effect preserved');

    // Mock HttpReasoningProvider with mock fetch
    let httpFetchCalled = false;
    const mockFetch = async (input: any, init: any) => {
      httpFetchCalled = true;
      const body = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          action_id: 'http-act-001',
          observation_id: body.request.observation_id,
          action_type: 'WAIT',
          intended_effect: 'Wait via HTTP provider',
        }),
      } as any;
    };

    const httpProvider = new HttpReasoningProvider({
      endpoint: 'https://api.reasoning-service.org/v1/propose',
      fetchFn: mockFetch,
    });
    const httpGateway = new ReasoningGateway({ provider: httpProvider });
    const httpProposal = await httpGateway.proposeAction(obs, 'HTTP request');
    assert(httpFetchCalled, 'HTTP Provider fetch must be invoked');
    assertEqual(httpProposal.action_type, 'WAIT', 'HTTP action proposal matches');
  });

  // 21. Privacy invariant: recursively inspects reasoning request and verifies sensitive values NEVER appear
  await test('privacy invariant: recursively inspects payload and verifies sensitive test values NEVER leak', async () => {
    const SENSITIVE_STRINGS = [
      'user@example.com',
      '+91XXXXXXXXXX',
      '4111111111111111',
      'test-secret-api-key',
      'super-secret-password',
    ];

    const mockProvider = new MockReasoningProvider();
    const gateway = new ReasoningGateway({ provider: mockProvider });

    // Observation containing nodes where sensitive data was already redacted by T011
    const obs: SanitizedObservation = {
      observation_id: 'obs-privacy-strict-check',
      timestamp: Date.now(),
      overall_confidence: 0.95,
      nodes: [
        {
          target_id: 'node-safe',
          bbox: { x: 0, y: 0, width: 100, height: 30 },
          role: 'button',
          text: 'Login',
          interactable: true,
          confidence: 0.99,
          is_redacted: false,
        },
        {
          target_id: 'node-email',
          bbox: { x: 0, y: 40, width: 200, height: 30 },
          role: 'textbox',
          text: '[REDACTED:EMAIL]',
          interactable: true,
          confidence: 0.95,
          is_redacted: true,
          redaction_category: 'EMAIL',
        },
        {
          target_id: 'node-phone',
          bbox: { x: 0, y: 80, width: 200, height: 30 },
          role: 'textbox',
          text: '[REDACTED:PHONE]',
          interactable: true,
          confidence: 0.95,
          is_redacted: true,
          redaction_category: 'PHONE',
        },
        {
          target_id: 'node-card',
          bbox: { x: 0, y: 120, width: 200, height: 30 },
          role: 'textbox',
          text: '[REDACTED:CREDIT_CARD]',
          interactable: true,
          confidence: 0.95,
          is_redacted: true,
          redaction_category: 'CREDIT_CARD',
        },
        {
          target_id: 'node-key',
          bbox: { x: 0, y: 160, width: 200, height: 30 },
          role: 'textbox',
          text: '[REDACTED:API_KEY]',
          interactable: true,
          confidence: 0.95,
          is_redacted: true,
          redaction_category: 'API_KEY',
        },
        {
          target_id: 'node-pwd',
          bbox: { x: 0, y: 200, width: 200, height: 30 },
          role: 'password',
          text: '[REDACTED:PASSWORD]',
          interactable: true,
          confidence: 0.95,
          is_redacted: true,
          redaction_category: 'PASSWORD',
        },
      ],
      metadata: {
        total_nodes: 6,
        redacted_nodes_count: 5,
        sanitization_applied: true,
      },
    };

    await gateway.proposeAction(obs, 'Submit payment and credentials');

    const recorded = mockProvider.getLastRecordedRequest();
    assert(!!recorded, 'Egress payload must be recorded');

    // Recursive search across all keys and values in the recorded payload
    function assertNoSensitiveValues(obj: unknown, path = 'root') {
      if (obj === null || obj === undefined) return;

      if (typeof obj === 'string') {
        for (const secret of SENSITIVE_STRINGS) {
          if (obj.includes(secret)) {
            throw new Error(`CRITICAL LEAK: Found sensitive string '${secret}' at ${path}`);
          }
        }
      } else if (Array.isArray(obj)) {
        obj.forEach((item, idx) => assertNoSensitiveValues(item, `${path}[${idx}]`));
      } else if (typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) {
          for (const secret of SENSITIVE_STRINGS) {
            if (k.includes(secret)) {
              throw new Error(`CRITICAL LEAK: Sensitive string '${secret}' in property name ${path}.${k}`);
            }
          }
          assertNoSensitiveValues(v, `${path}.${k}`);
        }
      }
    }

    assertNoSensitiveValues(recorded);

    // Also verify full JSON string representation
    const fullJson = JSON.stringify(recorded);
    for (const secret of SENSITIVE_STRINGS) {
      assert(!fullJson.includes(secret), `Sensitive string '${secret}' must not appear anywhere in JSON payload`);
    }
  });

  // =========================================================================
  // REAL LLM REASONING TESTS (Tasks A through J)
  // =========================================================================

  // A. System prompt is present in outbound LLM request
  await test('A. System prompt is present in outbound LLM request', async () => {
    let capturedBody: any = null;
    const mockFetch = async (input: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  action_id: 'act-sys-1',
                  observation_id: 'obs-uuid-1001',
                  action_type: 'DONE',
                  intended_effect: 'Verified system prompt',
                }),
              },
            },
          ],
        }),
      } as any;
    };

    const provider = new HttpReasoningProvider({
      endpoint: 'https://api.llm-provider.com/v1/chat/completions',
      fetchFn: mockFetch,
    });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation();

    const proposal = await gateway.proposeAction(obs, 'Verify prompt');

    assert(capturedBody !== null, 'Outbound HTTP payload must be captured');
    assert(Array.isArray(capturedBody.messages), 'Payload must contain messages array');

    const systemMsg = capturedBody.messages.find((m: any) => m.role === 'system');
    assert(!!systemMsg, 'Payload must contain system message');
    assert(systemMsg.content.includes("VEIL's browser reasoning engine"), 'System message contains VEIL role');
    assert(systemMsg.content.includes('zero browser execution authority'), 'System message enforces zero browser execution authority');
    assert(systemMsg.content.includes('never invent target_id values'), 'System message forbids inventing target_id values');
    assert(systemMsg.content.includes('propose exactly ONE next declarative action'), 'System message restricts to one action');
    assert(systemMsg.content.includes('CLICK requires target_id'), 'System message enforces CLICK target_id constraint');
    assert(systemMsg.content.includes('TYPE requires target_id and parameters.text'), 'System message enforces TYPE text constraint');
    assert(systemMsg.content.includes('KEY_PRESS requires parameters.key'), 'System message enforces KEY_PRESS constraint');
    assert(systemMsg.content.includes('NAVIGATE requires parameters.url'), 'System message enforces NAVIGATE constraint');
    assert(systemMsg.content.includes('Never reconstruct, infer, or request redacted/private information'), 'System message enforces privacy');

    assertEqual(proposal.action_type, 'DONE', 'ActionProposal successfully created');
  });

  // B. Sanitized ReasoningRequest is included in outbound request
  await test('B. Sanitized ReasoningRequest is included in outbound request', async () => {
    let capturedBody: any = null;
    const mockFetch = async (input: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: JSON.stringify({
                  action_id: 'act-req-1',
                  observation_id: 'obs-uuid-1001',
                  action_type: 'CLICK',
                  target_id: 'btn-search',
                  intended_effect: 'Click search flight',
                }),
              },
            },
          ],
        }),
      } as any;
    };

    const provider = new HttpReasoningProvider({
      endpoint: 'https://api.llm-provider.com/v1/chat/completions',
      fetchFn: mockFetch,
    });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation();

    await gateway.proposeAction(obs, 'Book flight to Tokyo');

    assert(capturedBody !== null, 'Outbound payload must exist');

    // Check user message contains goal and nodes
    const userMsg = capturedBody.messages.find((m: any) => m.role === 'user');
    assert(!!userMsg, 'Payload must contain user message');
    assert(userMsg.content.includes('Book flight to Tokyo'), 'User message contains user goal');
    assert(userMsg.content.includes('obs-uuid-1001'), 'User message contains observation_id');
    assert(userMsg.content.includes('btn-search'), 'User message contains node target_id');

    // Check structured request is also present
    assert(!!capturedBody.request, 'Payload contains structured request object');
    assertEqual(capturedBody.request.observation_id, 'obs-uuid-1001', 'Observation ID preserved');
    assertEqual(capturedBody.request.user_goal, 'Book flight to Tokyo', 'User goal preserved');
    assertEqual(capturedBody.request.nodes.length, 3, 'All 3 sanitized nodes present in request');
  });

  // C. Raw DOM/A11y/screenshot/OCR/privacy-classification data cannot be introduced into the reasoning request
  await test('C. Raw DOM/A11y/screenshot/OCR/privacy-classification data cannot be introduced into reasoning request', async () => {
    let fetchCalled = false;
    const mockFetch = async () => {
      fetchCalled = true;
      return { ok: true, status: 200, json: async () => ({}) } as any;
    };

    const provider = new HttpReasoningProvider({
      endpoint: 'https://api.llm-provider.com/v1/chat/completions',
      fetchFn: mockFetch,
    });
    const gateway = new ReasoningGateway({ provider });

    const rawLeaks: Partial<SanitizedObservation>[] = [
      { dom_tree: { tag: 'body' } } as any,
      { a11y_tree: { role: 'button' } } as any,
      { raw_screenshot: 'image_bytes' } as any,
      { ocr_evidence: [{ text: 'ocr' }] } as any,
      { sensitive_target_ids: ['id-1'] } as any,
      { classification_results: {} } as any,
    ];

    for (const leak of rawLeaks) {
      const dirty = { ...createValidSanitizedObservation(), ...leak };
      let caught = false;
      try {
        await gateway.proposeAction(dirty as any, 'Goal');
      } catch (err) {
        caught = err instanceof SecurityBoundaryViolationError;
      }
      assert(caught, `Raw leak ${Object.keys(leak).join(',')} must throw SecurityBoundaryViolationError`);
    }

    assertEqual(fetchCalled, false, 'No HTTP request must be dispatched when raw leak is detected');
  });

  // D. Real-provider response extraction works across different formats (OpenAI, Anthropic, HuggingFace, markdown-fenced)
  await test('D. Real-provider response extraction works across OpenAI, Anthropic, HuggingFace, and markdown code blocks', async () => {
    // 1. OpenAI Chat format with markdown code fences
    const mockFetchOpenAIMarkdown = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'chatcmpl-test',
        choices: [
          {
            message: {
              role: 'assistant',
              content: '```json\n{\n  "action_id": "act-md-1",\n  "observation_id": "obs-uuid-1001",\n  "action_type": "CLICK",\n  "target_id": "btn-search",\n  "intended_effect": "Click search button"\n}\n```',
            },
          },
        ],
      }),
    });

    const p1 = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetchOpenAIMarkdown as any });
    const g1 = new ReasoningGateway({ provider: p1 });
    const obs = createValidSanitizedObservation();
    const res1 = await g1.proposeAction(obs, 'Search');
    assertEqual(res1.action_type, 'CLICK', 'Extracted from markdown fenced OpenAI response');
    assertEqual(res1.target_id, 'btn-search', 'Target ID extracted correctly');

    // 2. Anthropic Messages format
    const mockFetchAnthropic = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              action_id: 'act-claude-1',
              observation_id: 'obs-uuid-1001',
              action_type: 'NAVIGATE',
              parameters: { url: 'https://airline.example.com' },
              intended_effect: 'Navigate to airline',
            }),
          },
        ],
      }),
    });

    const p2 = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetchAnthropic as any });
    const g2 = new ReasoningGateway({ provider: p2 });
    const res2 = await g2.proposeAction(obs, 'Navigate');
    assertEqual(res2.action_type, 'NAVIGATE', 'Extracted from Anthropic format');
    assertEqual(res2.parameters?.url, 'https://airline.example.com', 'URL parameter extracted');

    // 3. Hugging Face text generation array format
    const mockFetchHuggingFace = async () => ({
      ok: true,
      status: 200,
      json: async () => [
        {
          generated_text: JSON.stringify({
            action_id: 'act-hf-1',
            observation_id: 'obs-uuid-1001',
            action_type: 'DONE',
            intended_effect: 'Task complete on HF model',
          }),
        },
      ],
    });

    const p3 = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetchHuggingFace as any });
    const g3 = new ReasoningGateway({ provider: p3 });
    const res3 = await g3.proposeAction(obs, 'Done');
    assertEqual(res3.action_type, 'DONE', 'Extracted from HuggingFace array format');
  });

  // E. Valid model JSON becomes a valid ActionProposal
  await test('E. Valid model JSON becomes a valid ActionProposal with all fields preserved', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                action_id: 'act-valid-type-01',
                observation_id: 'obs-uuid-1001',
                action_type: 'TYPE',
                target_id: 'input-dest',
                parameters: { text: 'Tokyo Narita' },
                intended_effect: 'Fill destination airport',
                confidence: 0.97,
              }),
            },
          },
        ],
      }),
    });

    const provider = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch as any });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation();

    const proposal = await gateway.proposeAction(obs, 'Fill destination');
    assertEqual(proposal.action_id, 'act-valid-type-01', 'action_id preserved');
    assertEqual(proposal.observation_id, 'obs-uuid-1001', 'observation_id preserved');
    assertEqual(proposal.action_type, 'TYPE', 'action_type matches TYPE');
    assertEqual(proposal.target_id, 'input-dest', 'target_id matches input-dest');
    assertEqual(proposal.parameters?.text, 'Tokyo Narita', 'parameters.text preserved');
    assertEqual(proposal.intended_effect, 'Fill destination airport', 'intended_effect preserved');
    assertEqual(proposal.confidence, 0.97, 'confidence preserved');
  });

  // F. Malformed model output fails closed
  await test('F. Malformed model output fails closed (unparseable non-JSON text)', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: 'I am a chatbot and I cannot browse the web for you: [broken json}',
            },
          },
        ],
      }),
    });

    const provider = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch as any });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation();

    let caught = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caught = err instanceof MalformedModelResponseError;
    }
    assert(caught, 'Malformed model text must throw MalformedModelResponseError');
  });

  // G. Invalid action_type fails closed
  await test('G. Invalid action_type fails closed (unsupported action outside VEIL schema)', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                action_id: 'act-bad-type',
                observation_id: 'obs-uuid-1001',
                action_type: 'RUN_TERMINAL_COMMAND',
                intended_effect: 'Execute shell',
              }),
            },
          },
        ],
      }),
    });

    const provider = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch as any });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation();

    let caught = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caught = err instanceof InvalidActionProposalError;
    }
    assert(caught, 'Unsupported action_type must throw InvalidActionProposalError');
  });

  // H. Invalid target_id fails closed
  await test('H. Invalid target_id fails closed (phantom target_id not in observation nodes)', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                action_id: 'act-phantom',
                observation_id: 'obs-uuid-1001',
                action_type: 'CLICK',
                target_id: 'invented-target-not-in-dom',
                intended_effect: 'Click invented element',
              }),
            },
          },
        ],
      }),
    });

    const provider = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch as any });
    const gateway = new ReasoningGateway({ provider, validateTargetExistsInObservation: true });
    const obs = createValidSanitizedObservation();

    let caught = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caught = err instanceof InvalidActionProposalError;
    }
    assert(caught, 'Invented target_id must throw InvalidActionProposalError');
  });

  // I. observation_id mismatch fails closed
  await test('I. observation_id mismatch fails closed (stale or mismatched observation ID)', async () => {
    const mockFetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              role: 'assistant',
              content: JSON.stringify({
                action_id: 'act-mismatch',
                observation_id: 'obs-uuid-STALE-OLD',
                action_type: 'CLICK',
                target_id: 'btn-search',
                intended_effect: 'Stale action execution',
              }),
            },
          },
        ],
      }),
    });

    const provider = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch as any });
    const gateway = new ReasoningGateway({ provider });
    const obs = createValidSanitizedObservation({ observation_id: 'obs-uuid-CURRENT-FRESH' });

    let caught = false;
    try {
      await gateway.proposeAction(obs, 'Search');
    } catch (err) {
      caught = err instanceof ObservationIdMismatchError;
    }
    assert(caught, 'Mismatched observation_id must throw ObservationIdMismatchError');
  });

  // J. Provider HTTP/network/timeout failures fail closed
  await test('J. Provider HTTP/network/timeout failures fail closed', async () => {
    const obs = createValidSanitizedObservation();

    // J1: HTTP 500 server error
    const mockFetch500 = async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: async () => 'Model service overloaded',
    });
    const p500 = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetch500 as any });
    const g500 = new ReasoningGateway({ provider: p500 });
    let caught500 = false;
    try {
      await g500.proposeAction(obs, 'Search');
    } catch (err) {
      caught500 = err instanceof ReasoningProviderError;
    }
    assert(caught500, 'HTTP 500 must throw ReasoningProviderError');

    // J2: Network connection refused / fetch exception
    const mockFetchNetworkFail = async () => {
      throw new TypeError('Failed to fetch: Connection refused');
    };
    const pNet = new HttpReasoningProvider({ endpoint: 'https://mock.api/v1', fetchFn: mockFetchNetworkFail as any });
    const gNet = new ReasoningGateway({ provider: pNet });
    let caughtNet = false;
    try {
      await gNet.proposeAction(obs, 'Search');
    } catch (err) {
      caughtNet = err instanceof ReasoningProviderError;
    }
    assert(caughtNet, 'Network exception must throw ReasoningProviderError');

    // J3: Timeout handling
    const mockFetchTimeout = async (_input: any, init: any) => {
      return new Promise((_, reject) => {
        if (init.signal) {
          init.signal.addEventListener('abort', () => {
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };
    const pTimeout = new HttpReasoningProvider({
      endpoint: 'https://mock.api/v1',
      fetchFn: mockFetchTimeout as any,
      timeoutMs: 25,
    });
    const gTimeout = new ReasoningGateway({ provider: pTimeout });
    let caughtTimeout = false;
    try {
      await gTimeout.proposeAction(obs, 'Search');
    } catch (err) {
      caughtTimeout = err instanceof ReasoningTimeoutError;
    }
    assert(caughtTimeout, 'Timeout must throw ReasoningTimeoutError');
  });

  return results;
}
