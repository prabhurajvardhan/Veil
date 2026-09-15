/**
 * M05: Targeted OCR — Type Definitions
 * Author: AI004 (Structural Grounding Engineer)
 * Authority: INTERFACES.md, docs/tasks/T007.md
 */

import { ScreenshotData } from '../m02-observation/types';

/**
 * Strict BoundingBox conforming to INTERFACES.md
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * OCR text element containing normalized coordinates and confidence
 */
export interface OcrElement {
  bbox: BoundingBox;
  text: string;
  confidence: number; // 0.0 to 1.0 (normalized from tesseract's 0-100)
}

/**
 * Minimum OcrEvidence contract required by M06
 */
export interface OcrEvidence {
  source: 'Tesseract.js';
  elements: OcrElement[];
}

/**
 * Interface for the internal OCR engine adapter
 */
export interface OcrEngine {
  /**
   * Initializes the OCR engine
   */
  initialize(): Promise<void>;

  /**
   * Processes a screenshot crop and extracts text
   * @param screenshot Input image
   * @returns OCR evidence, or null on failure (fail closed)
   */
  process(screenshot: ScreenshotData): Promise<OcrEvidence | null>;

  /**
   * Cleans up resources
   */
  terminate(): Promise<void>;
}
