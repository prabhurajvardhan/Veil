import { TesseractAdapter } from '../tesseractAdapter';
import { ScreenshotData } from '../../m02-observation/types';
import { assert, assertEqual, test } from './testUtils';

// Mock Tesseract.js Worker
class MockWorker {
  public recognizeResult: any = { data: { words: [] } };
  public recognizeError: Error | null = null;
  public terminateCalled = false;

  async recognize(image: any) {
    if (this.recognizeError) throw this.recognizeError;
    return this.recognizeResult;
  }

  async terminate() {
    this.terminateCalled = true;
  }
}

export async function runTesseractAdapterTests() {
  const results = { passed: 0, failed: 0, total: 0 };

  const runTest = async (name: string, fn: () => Promise<void>) => {
    results.total++;
    const passed = await test(name, fn);
    if (passed) results.passed++;
    else results.failed++;
  };

  const validScreenshot: ScreenshotData = {
    format: 'png',
    data: 'iVBORw0KGgo...', // dummy base64
    viewport: { width: 800, height: 600, dpr: 1 }
  };

  await runTest('TesseractAdapter: Successful OCR extraction', async () => {
    const mockWorker = new MockWorker();
    mockWorker.recognizeResult = {
      data: {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    words: [
                      {
                        text: 'Hello',
                        confidence: 95.5,
                        bbox: { x0: 10, y0: 20, x1: 50, y1: 30 }
                      },
                      {
                        text: '  ', // Should be ignored
                        confidence: 90,
                        bbox: { x0: 0, y0: 0, x1: 0, y1: 0 }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    };

    const mockCreateWorker: any = async () => mockWorker;
    const adapter = new TesseractAdapter(mockCreateWorker);
    
    const evidence = await adapter.process(validScreenshot);
    
    assert(evidence !== null, 'Evidence should not be null on success');
    assertEqual(evidence!.source, 'Tesseract.js', 'Source should be Tesseract.js');
    assertEqual(evidence!.elements.length, 1, 'Should filter empty words');
    
    const word = evidence!.elements[0];
    assertEqual(word.text, 'Hello', 'Extracted text matches');
    assertEqual(word.confidence, 0.955, 'Confidence normalized to 0-1');
    assertEqual(word.bbox.x, 10, 'x matches');
    assertEqual(word.bbox.y, 20, 'y matches');
    assertEqual(word.bbox.width, 40, 'width matches');
    assertEqual(word.bbox.height, 10, 'height matches');
  });

  await runTest('TesseractAdapter: Fail closed on invalid screenshot', async () => {
    const mockCreateWorker: any = async () => new MockWorker();
    const adapter = new TesseractAdapter(mockCreateWorker);
    
    // Missing data
    const invalidScreenshot: any = { format: 'png', data: '', viewport: { width: 800, height: 600, dpr: 1 } };
    const evidence = await adapter.process(invalidScreenshot);
    
    assertEqual(evidence, null, 'Should return null for invalid screenshot data');
  });

  await runTest('TesseractAdapter: Fail closed on OCR runtime failure', async () => {
    const mockWorker = new MockWorker();
    mockWorker.recognizeError = new Error('Tesseract crashed');
    
    const mockCreateWorker: any = async () => mockWorker;
    const adapter = new TesseractAdapter(mockCreateWorker);
    
    const evidence = await adapter.process(validScreenshot);
    
    assertEqual(evidence, null, 'Should return null (fail closed) on recognition error');
  });

  await runTest('TesseractAdapter: Fail closed on initialization failure', async () => {
    const mockCreateWorker: any = async () => { throw new Error('Init failed'); };
    const adapter = new TesseractAdapter(mockCreateWorker);
    
    const evidence = await adapter.process(validScreenshot);
    
    assertEqual(evidence, null, 'Should return null (fail closed) on initialization error');
  });

  await runTest('TesseractAdapter: Terminate cleans up worker', async () => {
    const mockWorker = new MockWorker();
    const mockCreateWorker: any = async () => mockWorker;
    const adapter = new TesseractAdapter(mockCreateWorker);
    
    await adapter.initialize();
    await adapter.terminate();
    
    assert(mockWorker.terminateCalled, 'Terminate should be called on the worker');
  });

  return results;
}
