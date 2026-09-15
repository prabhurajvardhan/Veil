import { createWorker, Worker } from 'tesseract.js';
import { ScreenshotData } from '../m02-observation/types';
import { OcrEngine, OcrEvidence, OcrElement } from './types';

/**
 * Adapter for executing local OCR using Tesseract.js WebAssembly.
 * Fails closed on error and maintains strict M05 boundary.
 */
export class TesseractAdapter implements OcrEngine {
  private worker: Worker | null = null;
  private isInitialized = false;
  private createWorkerFn: typeof createWorker;

  constructor(createWorkerOverride?: typeof createWorker) {
    this.createWorkerFn = createWorkerOverride || createWorker;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      this.worker = await this.createWorkerFn('eng');
      this.isInitialized = true;
    } catch (error) {
      console.error('M05 Tesseract Initialization Error:', error);
      this.worker = null;
      this.isInitialized = false;
      throw error;
    }
  }

  public async process(screenshot: ScreenshotData): Promise<OcrEvidence | null> {
    if (!screenshot || !screenshot.data || !screenshot.format) {
      console.warn('M05: Invalid screenshot data provided. Failing closed.');
      return null;
    }

    if (!this.isInitialized || !this.worker) {
      console.warn('M05: TesseractAdapter not initialized. Attempting lazy initialization.');
      try {
        await this.initialize();
      } catch (e) {
        return null; // Fail closed if init fails
      }
    }

    try {
      // Build data URL for Tesseract
      const dataUrl = `data:image/${screenshot.format};base64,${screenshot.data}`;
      
      const { data } = await this.worker!.recognize(dataUrl);

      // Map Tesseract words to strict OcrElement format
      const elements: OcrElement[] = [];
      
      if (data && data.blocks && Array.isArray(data.blocks)) {
        for (const block of data.blocks) {
          if (!block.paragraphs) continue;
          for (const paragraph of block.paragraphs) {
            if (!paragraph.lines) continue;
            for (const line of paragraph.lines) {
              if (!line.words) continue;
              for (const word of line.words) {
                // Skip empty or purely whitespace text
                const text = word.text?.trim();
                if (!text) continue;

                // Normalize confidence from 0-100 to 0.0-1.0
                const confidence = Math.max(0, Math.min(100, word.confidence || 0)) / 100.0;

                // Convert Tesseract bbox {x0, y0, x1, y1} to {x, y, width, height}
                const bbox = word.bbox;
                if (!bbox) continue;

                elements.push({
                  text,
                  confidence,
                  bbox: {
                    x: bbox.x0,
                    y: bbox.y0,
                    width: bbox.x1 - bbox.x0,
                    height: bbox.y1 - bbox.y0,
                  }
                });
              }
            }
          }
        }
      }

      return {
        source: 'Tesseract.js',
        elements
      };
    } catch (error) {
      console.error('M05 Tesseract Processing Error:', error);
      // Fail closed
      return null;
    }
  }

  public async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }
}
