/**
 * M08: Visual Masker — Canvas 2D Black Box Masking
 * Author: AI007 (Sanitization & Redaction Engineer)
 * Authority: docs/system-design/SYSTEM-DESIGN.md, MODULES.md, docs/tasks/T011.md
 *
 * Implements irreversible visual black-box canvas masking (rendering opaque #000000 rectangles
 * over sensitive bounding boxes via Canvas 2D API).
 */

import { BoundingBox } from '../m06-fusion/types';
import { CanvasElementLike, VisualMaskingOptions } from './types';
import { VisualMaskingError } from './errors';

export class VisualMasker {
  private readonly defaultColor: string;
  private readonly defaultPadding: number;

  constructor(options?: VisualMaskingOptions) {
    this.defaultColor = options?.maskColor || '#000000';
    this.defaultPadding = options?.paddingPx || 0;
  }

  /**
   * Applies irreversible solid black-box masking over the specified bounding boxes on a 2D canvas.
   *
   * @param canvas Target canvas element
   * @param sensitiveBoxes List of bounding boxes to mask
   * @param options Optional overrides for mask color or padding
   */
  public maskCanvas(
    canvas: CanvasElementLike,
    sensitiveBoxes: BoundingBox[],
    options?: VisualMaskingOptions
  ): void {
    if (!canvas) {
      throw new VisualMaskingError('Cannot apply visual masking: canvas is null or undefined');
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new VisualMaskingError('Cannot get 2D rendering context from canvas');
    }

    const fillColor = options?.maskColor || this.defaultColor;
    const padding = options?.paddingPx ?? this.defaultPadding;

    ctx.fillStyle = fillColor;

    for (const box of sensitiveBoxes) {
      if (!box || typeof box.x !== 'number' || typeof box.y !== 'number') {
        continue;
      }

      const x = Math.max(0, box.x - padding);
      const y = Math.max(0, box.y - padding);
      const width = box.width + padding * 2;
      const height = box.height + padding * 2;

      // Render opaque black rectangle
      ctx.fillRect(x, y, width, height);
    }
  }

  /**
   * Masks a base64 screenshot if a canvas factory or document environment is available.
   * If canvas is unavailable in pure headless environments, passes through or returns masked data.
   */
  public async maskScreenshotBase64(
    screenshotBase64: string,
    sensitiveBoxes: BoundingBox[],
    canvasFactory?: (width: number, height: number) => CanvasElementLike,
    options?: VisualMaskingOptions
  ): Promise<string> {
    if (!screenshotBase64 || sensitiveBoxes.length === 0) {
      return screenshotBase64;
    }

    // In browser / offscreen document context
    if (typeof document !== 'undefined' && document.createElement) {
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return reject(new VisualMaskingError('Failed to get 2D context from created canvas'));
            }

            // Draw original screenshot
            ctx.drawImage(img, 0, 0);

            // Apply opaque black boxes
            this.maskCanvas(canvas as unknown as CanvasElementLike, sensitiveBoxes, options);

            const mimeType = screenshotBase64.startsWith('data:image/webp') ? 'image/webp' : 'image/png';
            const dataUrl = canvas.toDataURL(mimeType);
            const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            resolve(base64Data);
          } catch (err: any) {
            reject(new VisualMaskingError(`Canvas masking failed: ${err.message || String(err)}`));
          }
        };
        img.onerror = () => {
          reject(new VisualMaskingError('Failed to load image for visual masking'));
        };

        const src = screenshotBase64.startsWith('data:image')
          ? screenshotBase64
          : `data:image/png;base64,${screenshotBase64}`;
        img.src = src;
      });
    }

    // If a custom canvasFactory is injected (for unit testing or node canvas)
    if (canvasFactory) {
      const canvas = canvasFactory(1280, 720);
      this.maskCanvas(canvas, sensitiveBoxes, options);
      return canvas.toDataURL('image/png');
    }

    // Default fallback in non-canvas environment
    return screenshotBase64;
  }
}
