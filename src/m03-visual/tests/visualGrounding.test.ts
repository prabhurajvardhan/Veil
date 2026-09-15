/**
 * Unit Test Suite for M03: Visual Grounding Adapter (ShowUI-2B)
 * Author: AI003 (Visual Perception Engineer)
 * Validates: T005 Acceptance Criteria, INTERFACES.md, docs/system-design/SYSTEM-DESIGN.md, ADR 005
 */

import { CoordinateParser } from '../coordinateParser';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MODEL_PATH,
  DefaultONNXSessionProvider,
  ShowUIAdapter,
} from '../modelAdapter';
import {
  handleOffscreenGroundingRequest,
  isOffscreenVisualGroundingRequest,
  registerOffscreenVisualGroundingListener,
} from '../offscreenHandler';
import {
  BackendAllocationError,
  BoundingBox,
  CoordinateParsingError,
  ExecutionBackend,
  InvalidScreenshotError,
  ModelInferenceError,
  ONNXInferenceSession,
  ONNXSessionProvider,
  RawVisualPrediction,
  ScreenshotInput,
  VisualEvidence,
  VisualPerceptionError,
} from '../types';
import { VisualPerceptionManager } from '../visualPerceptionManager';

// --- Test Utilities & Assertion Helpers ---

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(
      `Assertion Failed: ${message} (Expected: ${String(expected)}, Got: ${String(actual)})`
    );
  }
}

/**
 * Mock ONNX Session Provider for deterministic unit testing
 */
export function createMockONNXSessionProvider(options?: {
  webGPUSupported?: boolean;
  wasmSupported?: boolean;
  cpuSupported?: boolean;
  mockRunOutput?: RawVisualPrediction[];
  mockTextOutput?: string;
  failOnCreate?: boolean;
}) {
  const supportedBackends: Record<ExecutionBackend, boolean> = {
    webgpu: options?.webGPUSupported ?? true,
    wasm: options?.wasmSupported ?? true,
    cpu: options?.cpuSupported ?? true,
  };

  const sessionsCreated: Array<{ modelPath: string; backend: ExecutionBackend }> = [];
  let releasedCount = 0;

  const provider: ONNXSessionProvider = {
    isBackendSupported: async (backend: ExecutionBackend) => {
      return supportedBackends[backend] ?? false;
    },
    createSession: async (modelPath: string, backend: ExecutionBackend): Promise<ONNXInferenceSession> => {
      if (options?.failOnCreate) {
        throw new Error('Simulated session creation failure');
      }
      sessionsCreated.push({ modelPath, backend });

      return {
        run: async (_inputs: Record<string, unknown>) => {
          if (options?.mockTextOutput !== undefined) {
            return {
              output_text: options.mockTextOutput,
            };
          }
          return {
            predictions: options?.mockRunOutput ?? [
              {
                coordinates: [100, 200, 150, 400], // [ymin, xmin, ymax, xmax] in 1000 scale
                label: 'submit_button',
                confidence: 0.92,
              },
              {
                coordinates: [300, 500], // [x, y] in 1000 scale
                label: 'search_icon',
                confidence: 0.88,
              },
            ],
          };
        },
        release: async () => {
          releasedCount++;
        },
      };
    },
  };

  return {
    provider,
    getSessionsCreated: () => [...sessionsCreated],
    getReleasedCount: () => releasedCount,
    setBackendSupported: (backend: ExecutionBackend, isSupported: boolean) => {
      supportedBackends[backend] = isSupported;
    },
  };
}

/**
 * Valid sample screenshot input
 */
function createSampleScreenshot(overrides?: Partial<ScreenshotInput>): ScreenshotInput {
  return {
    format: 'png',
    data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    viewport: {
      width: 1280,
      height: 800,
      dpr: 2.0,
    },
    ...overrides,
  };
}

export async function runAllVisualGroundingTests(): Promise<{ passed: number; failed: number; total: number }> {
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

  console.log('\n--- M03 Local Visual Perception: Unit & Interface Validation Suite ---');

  // --- Suite 1: Types & Error Hierarchy ---
  console.log('\n[Suite 1: Error Hierarchy & Types]');

  await test('VisualPerceptionError base class formatting', () => {
    const err = new VisualPerceptionError('Base error occurred', 'TEST_PERCEPTION_CODE', { foo: 123 });
    assertEqual(err.name, 'VisualPerceptionError', 'Error name matches');
    assertEqual(err.code, 'TEST_PERCEPTION_CODE', 'Error code matches');
    assert(err.message.includes('TEST_PERCEPTION_CODE: Base error occurred'), 'Message contains code');
  });

  await test('Specialized visual perception error classes', () => {
    const shotErr = new InvalidScreenshotError('Bad image');
    assertEqual(shotErr.code, 'INVALID_SCREENSHOT_ERROR', 'Screenshot error code');

    const allocErr = new BackendAllocationError('WebGPU OOM');
    assertEqual(allocErr.code, 'BACKEND_ALLOCATION_ERROR', 'Allocation error code');

    const inferErr = new ModelInferenceError('Model execution failed');
    assertEqual(inferErr.code, 'MODEL_INFERENCE_ERROR', 'Inference error code');

    const coordErr = new CoordinateParsingError('Invalid coords');
    assertEqual(coordErr.code, 'COORDINATE_PARSING_ERROR', 'Coordinate error code');
  });

  // --- Suite 2: Coordinate Parser & Normalization ---
  console.log('\n[Suite 2: Coordinate Parser & Normalization]');

  await test('CoordinateParser rejects invalid or non-positive viewport', () => {
    let threw = false;
    try {
      new CoordinateParser({ viewport: { width: 0, height: 800, dpr: 1 } });
    } catch (err) {
      threw = true;
      assert(err instanceof CoordinateParsingError, 'Throws CoordinateParsingError');
    }
    assert(threw, 'Should throw on zero width');
  });

  await test('CoordinateParser scale detection (thousand vs unit)', () => {
    const parser = new CoordinateParser({ viewport: { width: 1000, height: 1000, dpr: 1 } });
    assertEqual(parser.detectScale([100, 200, 300, 400]), 'thousand', 'Detects thousand scale');
    assertEqual(parser.detectScale([0.1, 0.2, 0.3, 0.4]), 'unit', 'Detects unit scale');
  });

  await test('CoordinateParser maps 1000-scale box to viewport pixels', () => {
    const parser = new CoordinateParser({ viewport: { width: 1000, height: 500, dpr: 1 } });
    // [ymin, xmin, ymax, xmax] = [100, 200, 300, 600]
    const box: BoundingBox = parser.parsePredictionToBoundingBox({
      coordinates: [100, 200, 300, 600],
      label: 'button',
      confidence: 0.9,
    });

    // x = 200/1000 * 1000 = 200
    // y = 100/1000 * 500 = 50
    // width = (600 - 200)/1000 * 1000 = 400
    // height = (300 - 100)/1000 * 500 = 100
    assertEqual(box.x, 200, 'Calculated x coordinate');
    assertEqual(box.y, 50, 'Calculated y coordinate');
    assertEqual(box.width, 400, 'Calculated width');
    assertEqual(box.height, 100, 'Calculated height');
  });

  await test('CoordinateParser maps unit-scale box to viewport pixels', () => {
    const parser = new CoordinateParser({ viewport: { width: 1920, height: 1080, dpr: 1 } });
    // [ymin, xmin, ymax, xmax] = [0.1, 0.2, 0.5, 0.7]
    const box: BoundingBox = parser.parsePredictionToBoundingBox({
      coordinates: [0.1, 0.2, 0.5, 0.7],
      label: 'container',
      confidence: 0.85,
    });

    // x = 0.2 * 1920 = 384
    // y = 0.1 * 1080 = 108
    // width = (0.7 - 0.2) * 1920 = 960
    // height = (0.5 - 0.1) * 1080 = 432
    assertEqual(box.x, 384, 'Calculated unit-scale x');
    assertEqual(box.y, 108, 'Calculated unit-scale y');
    assertEqual(box.width, 960, 'Calculated unit-scale width');
    assertEqual(box.height, 432, 'Calculated unit-scale height');
  });

  await test('CoordinateParser converts point grounding into centered target box', () => {
    const parser = new CoordinateParser({
      viewport: { width: 1000, height: 1000, dpr: 1 },
      defaultPointSize: 40,
    });
    // [x, y] = [500, 500] in 1000 scale -> center at (500, 500)
    const box = parser.parsePredictionToBoundingBox({
      coordinates: [500, 500],
      label: 'clickable_icon',
      confidence: 0.95,
    });

    // Center is 500, 500. Box size 40x40. x = 500 - 20 = 480, y = 500 - 20 = 480.
    assertEqual(box.x, 480, 'Box center x');
    assertEqual(box.y, 480, 'Box center y');
    assertEqual(box.width, 40, 'Box width');
    assertEqual(box.height, 40, 'Box height');
  });

  await test('CoordinateParser clamps boxes exceeding viewport boundaries', () => {
    const parser = new CoordinateParser({ viewport: { width: 800, height: 600, dpr: 1 } });
    // Box extending beyond bottom-right: xmin 600, ymin 500, xmax 1000, ymax 800 (1000 scale)
    const box = parser.parsePredictionToBoundingBox({
      coordinates: [833, 750, 1333, 1250],
      label: 'overflow_box',
      confidence: 0.5,
    });

    assert(box.x + box.width <= 800, 'x + width within viewport width 800');
    assert(box.y + box.height <= 600, 'y + height within viewport height 600');
    assert(box.x >= 0 && box.y >= 0, 'Coordinates non-negative');
  });

  await test('CoordinateParser rejects malformed coordinates', () => {
    const parser = new CoordinateParser({ viewport: { width: 1000, height: 1000, dpr: 1 } });

    let threw = false;
    try {
      parser.parsePredictionToBoundingBox({
        coordinates: [100, 200, 300] as unknown as [number, number], // 3 elements instead of 2 or 4
        label: 'bad',
        confidence: 0.5,
      });
    } catch (err) {
      threw = true;
      assert(err instanceof CoordinateParsingError, 'Throws CoordinateParsingError on bad array length');
    }
    assert(threw, 'Should throw on bad coordinate array length');

    threw = false;
    try {
      parser.parsePredictionToBoundingBox({
        coordinates: [NaN, 200, 300, 400],
        label: 'bad',
        confidence: 0.5,
      });
    } catch (err) {
      threw = true;
      assert(err instanceof CoordinateParsingError, 'Throws CoordinateParsingError on NaN');
    }
    assert(threw, 'Should throw on NaN coordinate');
  });

  await test('CoordinateParser parseTextResponse extracts structured bounding boxes', () => {
    const parser = new CoordinateParser({ viewport: { width: 1000, height: 1000, dpr: 1 } });
    const text = 'Identified elements: <box>[100, 200, 150, 350]</box> and click at point (400, 600).';
    const predictions = parser.parseTextResponse(text);

    assertEqual(predictions.length, 2, 'Extracted 2 predictions from text');
    assertEqual(predictions[0].coordinates.length, 4, 'First is 4-coord bounding box');
    assertEqual(predictions[1].coordinates.length, 2, 'Second is 2-coord point');
  });

  await test('CoordinateParser parseTextResponse extracts ShowUI Python action dicts and standalone coordinates', () => {
    const parser = new CoordinateParser({ viewport: { width: 1000, height: 1000, dpr: 1 } });

    // Case A: ShowUI Navigation action dictionary with point position
    const navText = "{'action': 'CLICK', 'value': None, 'position': [0.73, 0.21]}";
    const navPredictions = parser.parseTextResponse(navText);
    assertEqual(navPredictions.length, 1, 'Extracted 1 prediction from navigation dict');
    assertEqual(navPredictions[0].label, 'CLICK', 'Action label is CLICK');
    assertEqual(navPredictions[0].coordinates[0], 0.73, 'x coord 0.73');
    assertEqual(navPredictions[0].coordinates[1], 0.21, 'y coord 0.21');

    // Case B: ShowUI Navigation two-point bounding box
    const selectText = "{'action': 'SELECT_TEXT', 'position': [[0.1, 0.2], [0.8, 0.9]]}";
    const selectPredictions = parser.parseTextResponse(selectText);
    assertEqual(selectPredictions.length, 1, 'Extracted 1 prediction from two-point box');
    assertEqual(selectPredictions[0].label, 'SELECT_TEXT', 'Action label is SELECT_TEXT');
    assertEqual(selectPredictions[0].coordinates.length, 4, '4-coord box');
    assertEqual(selectPredictions[0].coordinates[0], 0.2, 'ymin 0.2');
    assertEqual(selectPredictions[0].coordinates[1], 0.1, 'xmin 0.1');
    assertEqual(selectPredictions[0].coordinates[2], 0.9, 'ymax 0.9');
    assertEqual(selectPredictions[0].coordinates[3], 0.8, 'xmax 0.8');

    // Case C: Official ShowUI Grounding format (raw coordinate pair string)
    const rawPointText = "[0.73, 0.21]";
    const rawPointPredictions = parser.parseTextResponse(rawPointText);
    assertEqual(rawPointPredictions.length, 1, 'Extracted 1 prediction from raw point array');
    assertEqual(rawPointPredictions[0].coordinates[0], 0.73, 'x coord 0.73');
    assertEqual(rawPointPredictions[0].coordinates[1], 0.21, 'y coord 0.21');

    // Case D: Convert parsed navigation prediction to valid BoundingBox
    const bbox = parser.parsePredictionToBoundingBox(navPredictions[0]);
    assertEqual(bbox.width, 32, 'Default point box width 32');
    assertEqual(bbox.height, 32, 'Default point box height 32');
    assertEqual(bbox.x, Math.round(730 - 16), 'Box x centered at 730');
    assertEqual(bbox.y, Math.round(210 - 16), 'Box y centered at 210');
  });

  // --- Suite 3: Backend Negotiation & WebGPU Fallback ---
  console.log('\n[Suite 3: Backend Negotiation & WebGPU Fallback]');

  await test('ShowUIAdapter initializes with WebGPU when supported', async () => {
    const mock = createMockONNXSessionProvider({ webGPUSupported: true });
    const adapter = new ShowUIAdapter({ modelPath: DEFAULT_MODEL_PATH }, mock.provider);

    await adapter.initialize();

    const status = adapter.getBackendStatus();
    assertEqual(status.activeBackend, 'webgpu', 'Active backend is webgpu');
    assertEqual(status.isWebGPUSupported, true, 'WebGPU marked supported');
    assertEqual(status.isFallbackActive, false, 'Fallback not active');

    const sessions = mock.getSessionsCreated();
    assertEqual(sessions.length, 1, 'Created one session');
    assertEqual(sessions[0].backend, 'webgpu', 'Session backend is webgpu');
  });

  await test('ShowUIAdapter gracefully falls back to WASM/CPU when WebGPU is unavailable', async () => {
    const mock = createMockONNXSessionProvider({
      webGPUSupported: false,
      wasmSupported: true,
    });
    const adapter = new ShowUIAdapter(
      { preferredBackend: 'webgpu', fallbackBackends: ['wasm', 'cpu'] },
      mock.provider
    );

    await adapter.initialize();

    const status = adapter.getBackendStatus();
    assertEqual(status.activeBackend, 'wasm', 'Active backend fell back to wasm');
    assertEqual(status.isWebGPUSupported, false, 'WebGPU not supported');
    assertEqual(status.isFallbackActive, true, 'Fallback marked active');

    const sessions = mock.getSessionsCreated();
    assertEqual(sessions[0].backend, 'wasm', 'Session created with wasm');
  });

  await test('DefaultONNXSessionProvider fails closed when model weights or ONNX runtime are missing', async () => {
    const defaultProvider = new DefaultONNXSessionProvider();
    let threw = false;
    try {
      await defaultProvider.createSession(DEFAULT_MODEL_PATH, 'cpu');
    } catch (err) {
      threw = true;
      assert(err instanceof BackendAllocationError, 'Throws BackendAllocationError on missing runtime/weights');
      assert((err as Error).message.includes('not available'), 'Error explains missing assets');
    }
    assert(threw, 'Default provider must fail closed without inventing fake sessions');
  });

  await test('ShowUIAdapter throws BackendAllocationError when all backends fail', async () => {
    const mock = createMockONNXSessionProvider({
      webGPUSupported: false,
      wasmSupported: false,
      cpuSupported: false,
    });
    const adapter = new ShowUIAdapter(
      { preferredBackend: 'webgpu', fallbackBackends: ['wasm', 'cpu'] },
      mock.provider
    );

    let threw = false;
    try {
      await adapter.initialize();
    } catch (err) {
      threw = true;
      assert(err instanceof BackendAllocationError, 'Throws BackendAllocationError when all backends fail');
    }
    assert(threw, 'Should throw BackendAllocationError');
  });

  await test('ShowUIAdapter release cleans up session resources', async () => {
    const mock = createMockONNXSessionProvider();
    const adapter = new ShowUIAdapter(undefined, mock.provider);

    await adapter.initialize();
    await adapter.release();

    assertEqual(mock.getReleasedCount(), 1, 'Session release was called');
  });

  // --- Suite 4: Screenshot Input Validation (Fail-Closed) ---
  console.log('\n[Suite 4: Screenshot Input Validation]');

  await test('ShowUIAdapter rejects missing or null screenshot', async () => {
    const adapter = new ShowUIAdapter();
    let threw = false;
    try {
      adapter.validateScreenshot(null as unknown as ScreenshotInput);
    } catch (err) {
      threw = true;
      assert(err instanceof InvalidScreenshotError, 'Throws InvalidScreenshotError');
    }
    assert(threw, 'Rejects null screenshot');
  });

  await test('ShowUIAdapter rejects unsupported image format', async () => {
    const adapter = new ShowUIAdapter();
    let threw = false;
    try {
      adapter.validateScreenshot(
        createSampleScreenshot({ format: 'jpeg' as unknown as 'png' })
      );
    } catch (err) {
      threw = true;
      assert(err instanceof InvalidScreenshotError, 'Throws InvalidScreenshotError on jpeg format');
    }
    assert(threw, 'Rejects unsupported format');
  });

  await test('ShowUIAdapter rejects empty Base64 data', async () => {
    const adapter = new ShowUIAdapter();
    let threw = false;
    try {
      adapter.validateScreenshot(createSampleScreenshot({ data: '   ' }));
    } catch (err) {
      threw = true;
      assert(err instanceof InvalidScreenshotError, 'Throws InvalidScreenshotError on empty base64');
    }
    assert(threw, 'Rejects empty base64 data');
  });

  await test('ShowUIAdapter rejects invalid viewport metadata', async () => {
    const adapter = new ShowUIAdapter();
    let threw = false;
    try {
      adapter.validateScreenshot(
        createSampleScreenshot({ viewport: { width: -100, height: 800, dpr: 1 } })
      );
    } catch (err) {
      threw = true;
      assert(err instanceof InvalidScreenshotError, 'Throws InvalidScreenshotError on negative dimension');
    }
    assert(threw, 'Rejects negative viewport dimension');
  });

  // --- Suite 5: Visual Grounding Execution & Strict Contract Adherence ---
  console.log('\n[Suite 5: Visual Grounding Execution & Strict Contract]');

  await test('executeGrounding outputs strictly compliant VisualEvidence record', async () => {
    const mock = createMockONNXSessionProvider({
      mockRunOutput: [
        {
          coordinates: [100, 200, 150, 400], // 1000 scale: [ymin, xmin, ymax, xmax]
          label: 'login_button',
          confidence: 0.95,
        },
        {
          coordinates: [500, 600], // 1000 scale point
          label: 'avatar_icon',
          confidence: 0.82,
        },
      ],
    });

    const adapter = new ShowUIAdapter(undefined, mock.provider);
    const screenshot = createSampleScreenshot({
      viewport: { width: 1000, height: 1000, dpr: 1 },
    });

    const evidence: VisualEvidence = await adapter.executeGrounding(screenshot);

    // Verify INTERFACES.md compliance:
    assertEqual(evidence.source, 'ShowUI-2B', "evidence.source strictly equals 'ShowUI-2B'");
    assertEqual(evidence.elements.length, 2, 'Contains 2 detected visual elements');

    // First element: [100, 200, 150, 400] on 1000x1000 -> x=200, y=100, width=200, height=50
    const el0 = evidence.elements[0];
    assertEqual(el0.label, 'login_button', 'Element label matches');
    assertEqual(el0.bbox.x, 200, 'Element bbox x');
    assertEqual(el0.bbox.y, 100, 'Element bbox y');
    assertEqual(el0.bbox.width, 200, 'Element bbox width');
    assertEqual(el0.bbox.height, 50, 'Element bbox height');
    assertEqual(el0.confidence, 0.95, 'Element confidence matches');

    // Second element: point [500, 600] -> centered box of 32x32 -> x = 500-16 = 484 (x=500 is c0? coords: [x, y]=[500, 600], x=500, y=600)
    const el1 = evidence.elements[1];
    assertEqual(el1.label, 'avatar_icon', 'Second element label matches');
    assertEqual(el1.bbox.width, 32, 'Default point width is 32');
    assertEqual(el1.bbox.height, 32, 'Default point height is 32');
    assertEqual(el1.confidence, 0.82, 'Second element confidence matches');
  });

  await test('executeGrounding filters predictions below confidence threshold', async () => {
    const mock = createMockONNXSessionProvider({
      mockRunOutput: [
        {
          coordinates: [100, 200, 150, 400],
          label: 'high_confidence_button',
          confidence: 0.9,
        },
        {
          coordinates: [200, 300, 250, 450],
          label: 'low_confidence_noise',
          confidence: 0.15, // Below default 0.25 threshold
        },
      ],
    });

    const adapter = new ShowUIAdapter(
      { confidenceThreshold: DEFAULT_CONFIDENCE_THRESHOLD },
      mock.provider
    );
    const screenshot = createSampleScreenshot();
    const evidence = await adapter.executeGrounding(screenshot);

    assertEqual(evidence.elements.length, 1, 'Only high-confidence element retained');
    assertEqual(evidence.elements[0].label, 'high_confidence_button', 'Retained correct element');
  });

  await test('executeGrounding preserves authentic confidence and signals fallback in backendStatus', async () => {
    const mock = createMockONNXSessionProvider({
      webGPUSupported: false, // forces wasm fallback
      wasmSupported: true,
      mockRunOutput: [
        {
          coordinates: [100, 200, 150, 400],
          label: 'button',
          confidence: 0.8,
        },
      ],
    });

    const adapter = new ShowUIAdapter(undefined, mock.provider);
    const screenshot = createSampleScreenshot();
    const evidence = await adapter.executeGrounding(screenshot);

    // Authentic confidence 0.8 is preserved without ungrounded arbitrary multipliers
    assertEqual(evidence.elements[0].confidence, 0.8, 'Authentic confidence preserved');
    assertEqual(adapter.getBackendStatus().isFallbackActive, true, 'Signals isFallbackActive to M06');
  });

  await test('executeGrounding correctly parses text response from VLM session', async () => {
    const mock = createMockONNXSessionProvider({
      mockTextOutput: "{'action': 'CLICK', 'value': None, 'position': [0.45, 0.65]}",
    });

    const adapter = new ShowUIAdapter(undefined, mock.provider);
    const screenshot = createSampleScreenshot({
      viewport: { width: 1000, height: 1000, dpr: 1 },
    });
    const evidence = await adapter.executeGrounding(screenshot);

    assertEqual(evidence.source, 'ShowUI-2B', 'Source is ShowUI-2B');
    assertEqual(evidence.elements.length, 1, 'Extracted 1 element from VLM text response');
    assertEqual(evidence.elements[0].label, 'CLICK', 'Element label is CLICK');
    assertEqual(evidence.elements[0].bbox.width, 32, 'Box width is 32');
    assertEqual(evidence.elements[0].bbox.height, 32, 'Box height is 32');
    assertEqual(evidence.elements[0].bbox.x, Math.round(450 - 16), 'Box x centered at 450');
    assertEqual(evidence.elements[0].bbox.y, Math.round(650 - 16), 'Box y centered at 650');
  });

  // --- Suite 6: Offscreen Document Request & Response Protocol ---
  console.log('\n[Suite 6: Offscreen Document Message Protocol]');

  await test('handleOffscreenGroundingRequest handles valid request', async () => {
    const mock = createMockONNXSessionProvider();
    const adapter = new ShowUIAdapter(undefined, mock.provider);

    const request = {
      type: 'EXECUTE_VISUAL_GROUNDING',
      payload: {
        screenshot: createSampleScreenshot(),
      },
    };

    const response = await handleOffscreenGroundingRequest(request, adapter);
    assertEqual(response.success, true, 'Request handled successfully');
    assertEqual(response.type, 'VISUAL_GROUNDING_RESULT', 'Response type matches');
    assert(Boolean(response.evidence), 'Evidence payload returned');
    assertEqual(response.evidence?.source, 'ShowUI-2B', 'Evidence source is ShowUI-2B');
  });

  await test('handleOffscreenGroundingRequest handles invalid request format', async () => {
    const adapter = new ShowUIAdapter();
    const response = await handleOffscreenGroundingRequest({ type: 'UNKNOWN_TYPE' }, adapter);

    assertEqual(response.success, false, 'Fails on unknown message type');
    assertEqual(response.error?.code, 'INVALID_REQUEST_FORMAT', 'Reports INVALID_REQUEST_FORMAT');
  });

  await test('handleOffscreenGroundingRequest fails closed on malformed screenshot input', async () => {
    const adapter = new ShowUIAdapter();
    const request = {
      type: 'EXECUTE_VISUAL_GROUNDING',
      payload: {
        screenshot: { format: 'unsupported_format' },
      },
    };

    const response = await handleOffscreenGroundingRequest(request, adapter);
    assertEqual(response.success, false, 'Reports failure on invalid input');
    assertEqual(response.error?.code, 'INVALID_SCREENSHOT_ERROR', 'Reports INVALID_SCREENSHOT_ERROR');
  });

  await test('isOffscreenVisualGroundingRequest validates request shape correctly', () => {
    assertEqual(isOffscreenVisualGroundingRequest(null), false, 'Null is not request');
    assertEqual(isOffscreenVisualGroundingRequest({}), false, 'Empty object is not request');
    assertEqual(
      isOffscreenVisualGroundingRequest({
        type: 'EXECUTE_VISUAL_GROUNDING',
        payload: { screenshot: {} },
      }),
      true,
      'Valid message shape recognized'
    );
  });

  await test('registerOffscreenVisualGroundingListener returns cleanup function', () => {
    const cleanup = registerOffscreenVisualGroundingListener();
    assert(typeof cleanup === 'function', 'Returns cleanup function');
    cleanup(); // No error thrown
  });

  // --- Suite 7: VisualPerceptionManager High-Level Coordination ---
  console.log('\n[Suite 7: VisualPerceptionManager Orchestration]');

  await test('VisualPerceptionManager coordinates initialization, processing, and disposal', async () => {
    const mock = createMockONNXSessionProvider();
    const manager = new VisualPerceptionManager(undefined, mock.provider);

    await manager.initialize();
    const status = manager.getBackendStatus();
    assertEqual(status.activeBackend, 'webgpu', 'Backend is webgpu');

    const screenshot = createSampleScreenshot();
    const evidence = await manager.processScreenshot(screenshot);

    assertEqual(evidence.source, 'ShowUI-2B', 'Produced ShowUI-2B evidence');
    assert(evidence.elements.length > 0, 'Produced visual elements');

    await manager.dispose();
    assertEqual(mock.getReleasedCount(), 1, 'Released manager session');
  });

  console.log(`\nTest Execution Summary: ${passed} Passed, ${failed} Failed of ${passed + failed} Total Tests\n`);

  if (failed > 0) {
    throw new Error(`Visual Grounding Test Suite Failed with ${failed} failure(s).`);
  }

  return { passed, failed, total: passed + failed };
}
